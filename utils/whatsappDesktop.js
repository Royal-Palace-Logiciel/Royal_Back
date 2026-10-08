// utils/whatsappDesktop.js
//
// Secours quand l'envoi automatique (whatsapp-web.js) echoue : le serveur, s'il tourne
// sur le meme PC Windows que le poste qui demande, ouvre la discussion du joueur dans
// WhatsApp Desktop et y colle la capture. L'image attend dans l'apercu d'envoi ;
// l'operateur n'a plus qu'a appuyer sur Entree.

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { randomUUID } = require('crypto');

const SCRIPT_PATH = path.join(__dirname, 'whatsappDesktopPaste.ps1');
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Seul un poste local peut piloter le bureau du serveur : sinon on collerait chez quelqu'un d'autre. */
function isAvailableFor(req) {
  return process.platform === 'win32' && LOOPBACK.has(req.socket?.remoteAddress);
}

/**
 * @param {string} numero numero international, chiffres uniquement
 * @param {{ base64: string, mimetype: string }} image
 * @returns {Promise<{ ok: boolean, erreur?: string }>}
 */
async function pasteImageInChat(numero, { base64, mimetype }) {
  const imagePath = path.join(os.tmpdir(), `fiche-whatsapp-${randomUUID()}.${mimetype === 'image/png' ? 'png' : 'jpg'}`);
  await fs.writeFile(imagePath, Buffer.from(base64, 'base64'));
  try {
    await new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT_PATH, '-ImagePath', imagePath, '-Phone', numero],
        { timeout: 20_000, windowsHide: true },
        (error, _stdout, stderr) => (error ? reject(new Error(String(stderr || error.message).trim())) : resolve())
      );
    });
    return { ok: true };
  } catch (error) {
    console.error('[whatsapp-desktop] Collage de la fiche impossible :', error.message);
    return { ok: false, erreur: error.message };
  } finally {
    fs.unlink(imagePath).catch(() => {});
  }
}

module.exports = { isAvailableFor, pasteImageInChat };
