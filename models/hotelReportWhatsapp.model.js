// models/hotelReportWhatsapp.model.js
//
// Destinataires WhatsApp du rapport de nuitee et journal des envois.
// Le journal porte la regle de cadence : un rapport ne repart que s'il a
// change depuis le dernier envoi, et jamais plus d'une fois par intervalle.

const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { normalizeNumber } = require('../utils/whatsapp');

let schemaReady;

async function ensureTables() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`hotel_report_whatsapp_recipients\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          \`numero\` VARCHAR(64) NOT NULL,
          \`type\` VARCHAR(10) NOT NULL DEFAULT 'NUMERO',
          \`nom\` VARCHAR(190) NULL,
          \`actif\` TINYINT(1) NOT NULL DEFAULT 1,
          \`created_by\` BIGINT UNSIGNED NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY \`uq_hotel_report_whatsapp_numero\` (\`numero\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      // Bases creees avant l'ajout des groupes : cf. migration ..._groups.sql.
      const [typeColumn] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotel_report_whatsapp_recipients' AND COLUMN_NAME = 'type'`
      );
      if (typeColumn.length === 0) {
        await pool.query("ALTER TABLE `hotel_report_whatsapp_recipients` ADD COLUMN `type` VARCHAR(10) NOT NULL DEFAULT 'NUMERO'");
        await pool.query('ALTER TABLE `hotel_report_whatsapp_recipients` MODIFY COLUMN `numero` VARCHAR(64) NOT NULL');
      }
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`hotel_report_whatsapp_sends\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          \`report_date\` DATE NOT NULL,
          \`content_hash\` CHAR(64) NOT NULL,
          \`statut\` VARCHAR(20) NOT NULL DEFAULT 'ENVOYE',
          \`destinataires\` TEXT NULL,
          \`erreur\` TEXT NULL,
          \`declencheur\` VARCHAR(20) NOT NULL DEFAULT 'AUTO',
          \`sent_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          KEY \`idx_hotel_report_whatsapp_sends_date\` (\`report_date\`, \`sent_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

function mapRecipient(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    numero: row.numero,
    type: row.type || 'NUMERO',
    nom: row.nom || '',
    actif: Boolean(row.actif),
    createdAt: row.created_at,
  };
}

function mapSend(row) {
  if (!row) return null;
  let destinataires = [];
  try {
    destinataires = JSON.parse(row.destinataires || '[]');
  } catch {
    destinataires = [];
  }
  return {
    id: Number(row.id),
    reportDate: row.report_date instanceof Date
      ? row.report_date.toISOString().slice(0, 10)
      : String(row.report_date).slice(0, 10),
    contentHash: row.content_hash,
    statut: row.statut,
    destinataires,
    erreur: row.erreur || null,
    declencheur: row.declencheur,
    sentAt: row.sent_at,
  };
}

async function listRecipients({ actifsSeulement = false } = {}) {
  await ensureTables();
  const [rows] = await pool.query(
    `SELECT * FROM \`hotel_report_whatsapp_recipients\`
      ${actifsSeulement ? 'WHERE `actif` = 1' : ''}
      ORDER BY \`nom\` IS NULL, \`nom\`, \`numero\``
  );
  return rows.map(mapRecipient);
}

async function addRecipient({ numero, nom, type, createdBy }) {
  await ensureTables();
  const raw = String(numero || '').trim();
  // Un groupe est identifie par son jid complet, qu'il ne faut surtout pas
  // reduire a ses chiffres : c'est ce qui le distingue d'un numero.
  const estGroupe = String(type || '').toUpperCase() === 'GROUPE' || raw.endsWith('@g.us');

  let clean;
  if (estGroupe) {
    if (!raw.endsWith('@g.us')) {
      throw ApiError.badRequest('Un groupe doit être identifié par son jid complet (…@g.us). Choisissez-le dans la liste des groupes.');
    }
    clean = raw;
  } else {
    clean = normalizeNumber(raw);
    // Un numero international plausible : indicatif + abonne, jamais un numero local.
    if (clean.length < 8 || clean.length > 18) {
      throw ApiError.badRequest('Le numéro doit être au format international, indicatif compris (ex. 261348429933).');
    }
  }

  const [result] = await pool.query(
    `INSERT INTO \`hotel_report_whatsapp_recipients\` (\`numero\`, \`type\`, \`nom\`, \`created_by\`)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE \`nom\` = VALUES(\`nom\`), \`type\` = VALUES(\`type\`), \`actif\` = 1`,
    [clean, estGroupe ? 'GROUPE' : 'NUMERO', nom ? String(nom).slice(0, 190) : null, createdBy ?? null]
  );
  const id = result.insertId || null;
  const [rows] = await pool.query(
    'SELECT * FROM `hotel_report_whatsapp_recipients` WHERE ' + (id ? '`id` = ?' : '`numero` = ?'),
    [id || clean]
  );
  return mapRecipient(rows[0]);
}

async function setRecipientActive(id, actif) {
  await ensureTables();
  const [result] = await pool.query(
    'UPDATE `hotel_report_whatsapp_recipients` SET `actif` = ? WHERE `id` = ?',
    [actif ? 1 : 0, Number(id)]
  );
  if (!result.affectedRows) throw ApiError.notFound('Destinataire introuvable.');
  const [rows] = await pool.query('SELECT * FROM `hotel_report_whatsapp_recipients` WHERE `id` = ?', [Number(id)]);
  return mapRecipient(rows[0]);
}

async function removeRecipient(id) {
  await ensureTables();
  const [result] = await pool.query('DELETE FROM `hotel_report_whatsapp_recipients` WHERE `id` = ?', [Number(id)]);
  if (!result.affectedRows) throw ApiError.notFound('Destinataire introuvable.');
  return { id: Number(id), deleted: true };
}

/** Dernier envoi pour une nuitee, quel qu'en soit le resultat. */
async function getLastSend(reportDate) {
  await ensureTables();
  const [rows] = await pool.query(
    'SELECT * FROM `hotel_report_whatsapp_sends` WHERE `report_date` = ? ORDER BY `sent_at` DESC, `id` DESC LIMIT 1',
    [String(reportDate).slice(0, 10)]
  );
  return mapSend(rows[0]);
}

async function listSends(reportDate, limit = 20) {
  await ensureTables();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const [rows] = await pool.query(
    `SELECT * FROM \`hotel_report_whatsapp_sends\` WHERE \`report_date\` = ?
      ORDER BY \`sent_at\` DESC, \`id\` DESC LIMIT ${safeLimit}`,
    [String(reportDate).slice(0, 10)]
  );
  return rows.map(mapSend);
}

async function recordSend({ reportDate, contentHash, statut, destinataires, erreur, declencheur }) {
  await ensureTables();
  const [result] = await pool.query(
    `INSERT INTO \`hotel_report_whatsapp_sends\`
       (\`report_date\`, \`content_hash\`, \`statut\`, \`destinataires\`, \`erreur\`, \`declencheur\`)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      String(reportDate).slice(0, 10),
      contentHash,
      statut,
      JSON.stringify(destinataires || []),
      erreur ? String(erreur).slice(0, 2000) : null,
      declencheur || 'AUTO',
    ]
  );
  const [rows] = await pool.query('SELECT * FROM `hotel_report_whatsapp_sends` WHERE `id` = ?', [result.insertId]);
  return mapSend(rows[0]);
}

module.exports = {
  ensureTables,
  listRecipients,
  addRecipient,
  setRecipientActive,
  removeRecipient,
  getLastSend,
  listSends,
  recordSend,
};
