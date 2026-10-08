// services/hotelReportDispatcher.js
//
// Envoi du rapport de nuitee aux destinataires WhatsApp.
//
// Regle de cadence, choisie pour rester utile sans saturer : le rapport ne part
// que s'il a CHANGE depuis le dernier envoi, et jamais plus d'une fois par
// intervalle (10 minutes par defaut). Une nuitee calme n'envoie donc rien,
// tandis qu'un encaissement a 23 h part au plus tard 10 minutes apres.
//
// La boucle tourne toutes les minutes ; c'est le journal en base, pas un
// compteur en memoire, qui tranche : un redemarrage du serveur ne renvoie pas
// un rapport deja parti.

const hotelReport = require('../models/hotelReport.model');
const whatsappModel = require('../models/hotelReportWhatsapp.model');
const { buildHotelReportText, hashReportText } = require('../utils/hotelReportText');
const transport = require('../utils/whatsappTransport');

const TICK_MS = 60_000;

function isEnabled() {
  return String(process.env.HOTEL_REPORT_WHATSAPP_ENABLED || '').toLowerCase() === 'true';
}

function getMinIntervalMs() {
  const minutes = Number(process.env.HOTEL_REPORT_WHATSAPP_MIN_INTERVAL_MIN || 10);
  return Math.max(1, Number.isFinite(minutes) ? minutes : 10) * 60_000;
}

/**
 * Nuitee en cours. Une nuitee court du soir au petit matin : avant midi, le
 * rapport vivant est encore celui de la veille. Meme regle que l'ecran, sinon
 * le serveur enverrait le rapport d'une autre nuit que celle affichee.
 */
function getCurrentNightDate(now = new Date()) {
  const date = new Date(now);
  if (date.getHours() < 12) date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Decide s'il faut envoyer, et pourquoi pas le cas echeant.
 * @returns {Promise<{envoyer: boolean, raison: string, report?: object, texte?: string, hash?: string, destinataires?: Array}>}
 */
async function evaluate(reportDate, { force = false } = {}) {
  const blocage = transport.describeBlocker();
  if (blocage) {
    return { envoyer: false, raison: blocage };
  }

  const report = await hotelReport.getHotelReport(reportDate);
  if (!report || !Array.isArray(report.rooms) || report.rooms.length === 0) {
    return { envoyer: false, raison: 'Aucun rapport enregistré pour cette nuitée.' };
  }

  const destinataires = await whatsappModel.listRecipients({ actifsSeulement: true });
  if (destinataires.length === 0) {
    return { envoyer: false, raison: 'Aucun destinataire actif.' };
  }

  const texte = buildHotelReportText(report);
  const hash = hashReportText(texte);
  const dernier = await whatsappModel.getLastSend(reportDate);

  if (force) {
    return { envoyer: true, raison: 'Envoi manuel.', report, texte, hash, destinataires };
  }

  // Un echec precedent ne bloque pas : on reessaie au tour suivant, une fois
  // l'intervalle ecoule, meme si le contenu n'a pas bouge.
  const dernierReussi = dernier && dernier.statut !== 'ECHEC';

  if (dernierReussi && dernier.contentHash === hash) {
    return { envoyer: false, raison: 'Rapport inchangé depuis le dernier envoi.' };
  }

  if (dernier) {
    const ecoule = Date.now() - new Date(dernier.sentAt).getTime();
    const minimum = getMinIntervalMs();
    if (ecoule < minimum) {
      const reste = Math.ceil((minimum - ecoule) / 60_000);
      return { envoyer: false, raison: `Dernier envoi il y a moins de ${Math.round(minimum / 60_000)} min (encore ${reste} min).` };
    }
  }

  return { envoyer: true, raison: 'Le rapport a changé.', report, texte, hash, destinataires };
}

/** Envoie effectivement, et journalise le resultat. */
async function dispatch(reportDate, { force = false, declencheur = 'AUTO' } = {}) {
  const decision = await evaluate(reportDate, { force });
  if (!decision.envoyer) {
    return { envoye: false, raison: decision.raison };
  }

  const resultats = [];
  for (const [index, destinataire] of decision.destinataires.entries()) {
    if (index > 0) await transport.pauseBetweenRecipients();
    const resultat = await transport.sendText(destinataire.numero, decision.texte);
    resultats.push({ ...resultat, nom: destinataire.nom || null, type: destinataire.type });
  }

  const reussis = resultats.filter((r) => r.ok).length;
  const statut = reussis === resultats.length ? 'ENVOYE' : reussis === 0 ? 'ECHEC' : 'PARTIEL';
  const erreur = resultats.filter((r) => !r.ok).map((r) => `${r.numero} : ${r.erreur}`).join(' | ') || null;

  const journal = await whatsappModel.recordSend({
    reportDate,
    contentHash: decision.hash,
    statut,
    destinataires: resultats,
    erreur,
    declencheur,
  });

  if (statut !== 'ENVOYE') {
    console.warn(`[rapport-whatsapp] ${reportDate} : ${statut} — ${erreur}`);
  } else {
    console.log(`[rapport-whatsapp] ${reportDate} : envoyé à ${reussis} destinataire(s).`);
  }

  return { envoye: true, statut, resultats, journal, raison: decision.raison };
}

let timer = null;
let running = false;

async function tick() {
  if (running || !isEnabled()) return;
  running = true;
  try {
    await dispatch(getCurrentNightDate());
  } catch (error) {
    console.error('[rapport-whatsapp] Échec du tour de boucle :', error.message);
  } finally {
    running = false;
  }
}

function startHotelReportDispatcher() {
  if (timer) return;
  if (!isEnabled()) {
    console.log('[rapport-whatsapp] Désactivé (HOTEL_REPORT_WHATSAPP_ENABLED absent ou différent de "true").');
    return;
  }

  // Transport web : on rattache la session au démarrage pour que le QR soit
  // déjà disponible quand la réception ouvre l'onglet. L'envoi reste bloqué
  // tant que le scan n'a pas eu lieu.
  if (transport.isWeb()) {
    void transport.web.ensureStarted();
  } else if (!transport.isConfigured()) {
    console.warn('[rapport-whatsapp] Activé mais non configuré : WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN sont requis.');
    return;
  }

  timer = setInterval(() => { void tick(); }, TICK_MS);
  timer.unref?.();
  console.log(`[rapport-whatsapp] Actif (transport ${transport.getTransportName()}) : envoi sur changement, au plus une fois toutes les ${Math.round(getMinIntervalMs() / 60_000)} min.`);
}

function stopHotelReportDispatcher() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  getCurrentNightDate,
  isEnabled,
  getMinIntervalMs,
  evaluate,
  dispatch,
  startHotelReportDispatcher,
  stopHotelReportDispatcher,
};
