// utils/whatsappWeb.js
//
// Transport WhatsApp non officiel : le serveur se rattache au compte WhatsApp
// de l'hotel par QR code, exactement comme WhatsApp Web. Le numero reste
// utilisable normalement sur le telephone, et l'envoi vers un GROUPE devient
// possible - ce que l'API officielle ne permet pas.
//
// A savoir, et assume : ce procede est contraire aux CGU de WhatsApp. Des
// numeros sont bloques pour ce type d'usage. D'ou les garde-fous ci-dessous
// (delai aleatoire entre destinataires, cadence deja bornee par le
// dispatcher) : ils ne suppriment pas le risque, ils le reduisent.

const path = require('path');
const puppeteer = require('puppeteer');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const SESSION_PATH = process.env.WHATSAPP_WEB_SESSION_PATH
  || path.join(__dirname, '..', '.wwebjs_auth');

/** Pause entre deux destinataires : un envoi en rafale est le motif le plus repere. */
const MIN_GAP_MS = 2_000;
const MAX_GAP_MS = 5_000;

const state = {
  /** STOPPED | STARTING | QR | AUTHENTICATED | READY | ERROR */
  statut: 'STOPPED',
  /** Chaine brute du QR, rendue en image cote navigateur. */
  qr: null,
  qrGeneratedAt: null,
  /** Numero rattache, une fois pret. */
  numero: null,
  erreur: null,
  readyAt: null,
};

let client = null;
let startingPromise = null;

function getState() {
  return { ...state, sessionPath: SESSION_PATH };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chemin du navigateur. Sans indication explicite, whatsapp-web.js ne resout
 * pas le Chromium telecharge par Puppeteer et le lancement echoue sur
 * « Timed out while waiting for the WS endpoint URL ». On lui donne donc le
 * chemin, avec une porte de sortie pour les serveurs qui fournissent leur
 * propre Chrome (image Docker, paquet systeme).
 */
function resolveChromePath() {
  if (process.env.WHATSAPP_WEB_CHROME_PATH) return process.env.WHATSAPP_WEB_CHROME_PATH;
  try {
    return puppeteer.executablePath();
  } catch {
    return undefined;
  }
}

function buildClient() {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: {
      headless: true,
      executablePath: resolveChromePath(),
      // --no-sandbox est requis sur la plupart des serveurs Linux, ou le
      // processus ne tourne pas sous un utilisateur privilegie.
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });
}

function attachHandlers(instance) {
  instance.on('qr', (qr) => {
    state.statut = 'QR';
    state.qr = qr;
    state.qrGeneratedAt = new Date().toISOString();
    state.erreur = null;
    console.log('[whatsapp-web] QR à scanner depuis l’onglet Rapport de l’hôtel.');
  });

  instance.on('authenticated', () => {
    state.statut = 'AUTHENTICATED';
    state.qr = null;
  });

  instance.on('ready', () => {
    state.statut = 'READY';
    state.qr = null;
    state.erreur = null;
    state.readyAt = new Date().toISOString();
    state.numero = instance.info?.wid?.user || null;
    console.log(`[whatsapp-web] Connecté au compte ${state.numero || '(inconnu)'}.`);
  });

  instance.on('auth_failure', (message) => {
    state.statut = 'ERROR';
    state.erreur = `Authentification refusée : ${message}`;
    console.error('[whatsapp-web]', state.erreur);
  });

  instance.on('disconnected', (reason) => {
    state.statut = 'STOPPED';
    state.qr = null;
    state.numero = null;
    state.readyAt = null;
    state.erreur = `Déconnecté : ${reason}`;
    console.warn('[whatsapp-web]', state.erreur);
    client = null;
    startingPromise = null;
  });
}

/** Demarre le client (idempotent). Ne bloque pas jusqu'a « prêt ». */
async function ensureStarted() {
  if (client) return getState();
  if (startingPromise) return startingPromise;

  startingPromise = (async () => {
    state.statut = 'STARTING';
    state.erreur = null;
    const instance = buildClient();
    attachHandlers(instance);
    try {
      await instance.initialize();
      client = instance;
    } catch (error) {
      state.statut = 'ERROR';
      state.erreur = error.message;
      client = null;
      console.error('[whatsapp-web] Démarrage impossible :', error.message);
    } finally {
      startingPromise = null;
    }
    return getState();
  })();

  return startingPromise;
}

async function stop({ logout = false } = {}) {
  const instance = client;
  client = null;
  startingPromise = null;
  state.statut = 'STOPPED';
  state.qr = null;
  state.numero = null;
  state.readyAt = null;
  if (!instance) return getState();
  try {
    if (logout) await instance.logout();
    await instance.destroy();
  } catch (error) {
    console.warn('[whatsapp-web] Arrêt imparfait :', error.message);
  }
  return getState();
}

function isReady() {
  return state.statut === 'READY' && Boolean(client);
}

/** Le transport est « configuré » dès lors qu'une session est rattachée. */
function isConfigured() {
  return isReady();
}

/**
 * Identifiant de discussion WhatsApp.
 * Un groupe est deja un jid complet (…@g.us) ; un numero doit etre resolu,
 * car tous les numeros ne sont pas sur WhatsApp.
 */
async function resolveChatId(destinataire) {
  const raw = String(destinataire || '').trim();
  if (raw.endsWith('@g.us') || raw.endsWith('@c.us')) return raw;

  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) throw new Error('Identifiant vide');
  const resolved = await client.getNumberId(digits);
  if (!resolved) throw new Error(`${digits} n’est pas joignable sur WhatsApp`);
  return resolved._serialized;
}

/** Groupes dont le compte rattaché est membre, pour les choisir par leur nom. */
async function listGroups() {
  if (!isReady()) return [];
  const chats = await client.getChats();
  return chats
    .filter((chat) => chat.isGroup)
    .map((chat) => ({ id: chat.id._serialized, nom: chat.name || 'Groupe sans nom' }));
}

/**
 * Envoie un texte, decoupe en plusieurs messages si besoin.
 * Meme signature de retour que le transport officiel, pour rester
 * interchangeable dans le dispatcher.
 */
async function sendText(destinataire, text, { parts } = {}) {
  const cible = String(destinataire || '');
  if (!isReady()) {
    return { numero: cible, ok: false, messages: 0, erreur: 'WhatsApp Web non connecté (QR à scanner).' };
  }

  let chatId;
  try {
    chatId = await resolveChatId(cible);
  } catch (error) {
    return { numero: cible, ok: false, messages: 0, erreur: error.message };
  }

  const morceaux = Array.isArray(parts) && parts.length ? parts : [String(text || '')];
  let envoyes = 0;
  for (const morceau of morceaux) {
    try {
      await client.sendMessage(chatId, morceau);
      envoyes += 1;
    } catch (error) {
      return { numero: cible, ok: false, messages: envoyes, erreur: error.message };
    }
    if (morceaux.length > 1) await wait(1_000);
  }
  return { numero: cible, ok: true, messages: envoyes };
}

/**
 * Envoie une image (PNG ou JPEG, en base64 sans prefixe data:) avec une legende facultative.
 * @returns {Promise<{numero: string, ok: boolean, messages: number, erreur?: string}>}
 */
async function sendImage(destinataire, { base64, mimetype, filename, caption } = {}) {
  const cible = String(destinataire || '');
  if (!isReady()) {
    return { numero: cible, ok: false, messages: 0, erreur: 'WhatsApp Web non connecté (QR à scanner).' };
  }

  let chatId;
  try {
    chatId = await resolveChatId(cible);
  } catch (error) {
    console.error(`[whatsapp-web] Numéro ${cible} non résolu :`, error);
    return { numero: cible, ok: false, messages: 0, erreur: error.message };
  }

  const media = new MessageMedia(mimetype, base64, filename);
  // sendSeen: false — l'accusé « vu » automatique casse régulièrement après une mise à jour
  // de WhatsApp Web et fait échouer tout l'envoi ; il est inutile ici.
  const options = { sendSeen: false, ...(caption ? { caption } : {}) };
  try {
    await client.sendMessage(chatId, media, options);
  } catch (imageError) {
    console.error(`[whatsapp-web] Envoi image vers ${cible} échoué :`, imageError);
    // Second essai en document (fichier joint) : chemin d'envoi différent côté WhatsApp Web.
    try {
      await client.sendMessage(chatId, media, { ...options, sendMediaAsDocument: true });
    } catch (documentError) {
      console.error(`[whatsapp-web] Envoi document vers ${cible} échoué :`, documentError);
      return { numero: cible, ok: false, messages: 0, erreur: imageError.message || String(imageError) };
    }
  }
  return { numero: cible, ok: true, messages: 1 };
}

/** Pause aléatoire entre deux destinataires : évite le profil d'envoi en rafale. */
async function pauseBetweenRecipients() {
  await wait(MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS)));
}

module.exports = {
  SESSION_PATH,
  ensureStarted,
  stop,
  getState,
  isReady,
  isConfigured,
  listGroups,
  sendText,
  sendImage,
  pauseBetweenRecipients,
};
