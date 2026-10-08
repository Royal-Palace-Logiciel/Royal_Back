// utils/whatsapp.js
//
// Client minimal de l'API officielle WhatsApp Business (Meta Cloud API).
// Node 18+ fournit fetch : aucune dependance supplementaire.
//
// Limite a connaitre : un message texte libre n'est accepte que dans la fenetre
// de 24 h ouverte par le destinataire lui-meme. Passe ce delai Meta refuse avec
// le code 131047, et seul un modele pre-approuve passerait - or les variables
// d'un modele n'acceptent pas les retours a la ligne, donc pas un rapport
// chambre par chambre. Le destinataire doit ecrire au numero une fois par jour.

const GRAPH_HOST = 'https://graph.facebook.com';
/** Limite Meta pour le corps d'un message texte. */
const MAX_BODY_LENGTH = 4096;

function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  };
}

function isWhatsappConfigured() {
  const { phoneNumberId, accessToken } = getConfig();
  return Boolean(phoneNumberId && accessToken);
}

/** Un numero au format attendu par Meta : chiffres uniquement, sans + ni espaces. */
function normalizeNumber(raw) {
  return String(raw || '').replace(/[^\d]/g, '');
}

/**
 * Decoupe le rapport en messages de moins de 4096 caracteres, en respectant les
 * blocs : une chambre n'est jamais coupee en deux messages. Les blocs sont
 * separes par deux lignes vides dans le rapport.
 */
function splitIntoMessages(text, maxLength = MAX_BODY_LENGTH) {
  const body = String(text || '');
  if (body.length <= maxLength) return [body];

  const blocks = body.split('\n\n\n');
  const messages = [];
  let current = '';

  for (const block of blocks) {
    const candidate = current ? `${current}\n\n\n${block}` : block;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }
    if (current) messages.push(current);
    if (block.length <= maxLength) {
      current = block;
      continue;
    }
    // Un bloc seul depasse la limite : on coupe ligne a ligne, en dernier recours.
    let chunk = '';
    for (const line of block.split('\n')) {
      const next = chunk ? `${chunk}\n${line}` : line;
      if (next.length <= maxLength) {
        chunk = next;
      } else {
        if (chunk) messages.push(chunk);
        chunk = line.slice(0, maxLength);
      }
    }
    current = chunk;
  }

  if (current) messages.push(current);
  return messages;
}

/** Remonte le message d'erreur de Meta sous une forme lisible dans le journal. */
function describeGraphError(payload, status) {
  const error = payload?.error;
  if (!error) return `HTTP ${status}`;
  const parts = [error.message || `HTTP ${status}`];
  if (error.code === 131047 || error.code === 131051) {
    parts.push("la fenêtre de 24 h est fermée : le destinataire doit écrire au numéro WhatsApp de l'hôtel pour la rouvrir");
  }
  if (error.code) parts.push(`code ${error.code}`);
  if (error.error_data?.details) parts.push(error.error_data.details);
  return parts.join(' — ');
}

/**
 * Envoie un texte a un numero, decoupe si besoin.
 * @returns {Promise<{numero: string, ok: boolean, messages: number, erreur?: string}>}
 */
async function sendWhatsappText(numero, text) {
  const { phoneNumberId, accessToken, apiVersion } = getConfig();
  const to = normalizeNumber(numero);

  if (!phoneNumberId || !accessToken) {
    return { numero: to, ok: false, messages: 0, erreur: 'WhatsApp non configuré (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN absents)' };
  }
  if (!to) {
    return { numero: String(numero || ''), ok: false, messages: 0, erreur: 'Numéro invalide' };
  }

  const url = `${GRAPH_HOST}/${apiVersion}/${phoneNumberId}/messages`;
  const parts = splitIntoMessages(text);
  let sent = 0;

  for (const part of parts) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: part },
        }),
      });
    } catch (error) {
      return { numero: to, ok: false, messages: sent, erreur: `Réseau : ${error.message}` };
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return { numero: to, ok: false, messages: sent, erreur: describeGraphError(payload, response.status) };
    }
    sent += 1;
  }

  return { numero: to, ok: true, messages: sent };
}

module.exports = {
  MAX_BODY_LENGTH,
  isWhatsappConfigured,
  normalizeNumber,
  splitIntoMessages,
  sendWhatsappText,
};
