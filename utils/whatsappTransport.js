// utils/whatsappTransport.js
//
// Aiguillage entre les deux facons d'envoyer un message WhatsApp, afin que le
// dispatcher n'ait pas a savoir laquelle est active :
//
//   cloud — API officielle Meta. Conforme, mais 1 a 1 seulement (pas de
//           groupe) et soumise a la fenetre de 24 h.
//   web   — whatsapp-web.js, rattache au compte par QR code. Permet les
//           groupes et n'a pas de fenetre de 24 h, au prix des CGU.
//
// WHATSAPP_TRANSPORT vaut « web » ou « cloud » (defaut : cloud).

const cloud = require('./whatsapp');
const web = require('./whatsappWeb');

function getTransportName() {
  return String(process.env.WHATSAPP_TRANSPORT || 'cloud').toLowerCase() === 'web' ? 'web' : 'cloud';
}

function isWeb() {
  return getTransportName() === 'web';
}

function isConfigured() {
  return isWeb() ? web.isConfigured() : cloud.isWhatsappConfigured();
}

/** Ce qui manque pour envoyer, en clair, ou null si tout est prêt. */
function describeBlocker() {
  if (isWeb()) {
    const state = web.getState();
    if (state.statut === 'READY') return null;
    if (state.statut === 'QR') return 'WhatsApp Web attend le scan du QR code.';
    if (state.statut === 'STARTING') return 'WhatsApp Web démarre…';
    if (state.statut === 'ERROR') return `WhatsApp Web en erreur : ${state.erreur}`;
    return 'WhatsApp Web n’est pas connecté.';
  }
  return cloud.isWhatsappConfigured()
    ? null
    : 'WhatsApp non configuré (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN absents).';
}

/**
 * Envoie un texte a un destinataire (numero, ou jid de groupe en transport web).
 * @returns {Promise<{numero: string, ok: boolean, messages: number, erreur?: string}>}
 */
async function sendText(destinataire, texte) {
  if (isWeb()) {
    // Le decoupage reste utile : un pave de plusieurs milliers de caracteres
    // est peu lisible sur telephone, meme si WhatsApp l'accepte.
    const parts = cloud.splitIntoMessages(texte);
    return web.sendText(destinataire, texte, { parts });
  }
  return cloud.sendWhatsappText(destinataire, texte);
}

/**
 * Envoie une image a un numero. Seul le transport web le permet ici : l'API
 * officielle exigerait un televersement prealable du media et la fenetre de 24 h.
 */
async function sendImage(destinataire, image) {
  if (isWeb()) return web.sendImage(destinataire, image);
  return { numero: String(destinataire || ''), ok: false, messages: 0, erreur: 'L’envoi d’image nécessite WHATSAPP_TRANSPORT=web.' };
}

/** Pause entre deux destinataires : utile seulement en transport web. */
async function pauseBetweenRecipients() {
  if (isWeb()) await web.pauseBetweenRecipients();
}

module.exports = { getTransportName, isWeb, isConfigured, describeBlocker, sendText, sendImage, pauseBetweenRecipients, web, cloud };
