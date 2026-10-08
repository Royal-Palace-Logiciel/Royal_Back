// models/hotelReport.model.js
// Rapport journalier Hotel : « Situation du chambre durant la Nuité ».
// Meme principe que barReport.model.js / restaurantReport.model.js : un rapport
// par date, le detail des chambres etant conserve en JSON.

const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

let schemaReady;

// Colonne ajoutee apres la premiere version de la table : cf. migration
// 20260929_hotel_daily_reports.sql.
async function ensureAutoStateColumn() {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotel_daily_reports' AND COLUMN_NAME = 'auto_state'`
  );
  if (columns.length === 0) {
    await pool.query('ALTER TABLE `hotel_daily_reports` ADD COLUMN `auto_state` LONGTEXT NULL');
  }
}

async function ensureHotelReportsTable() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS \`hotel_daily_reports\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`report_date\` DATE NOT NULL,
        \`heure_debut\` VARCHAR(10) NULL,
        \`heure_fin\` VARCHAR(10) NULL,
        \`receptionniste\` VARCHAR(190) NULL,
        \`rooms\` LONGTEXT NULL,
        \`observations\` LONGTEXT NULL,
        \`metrics\` LONGTEXT NULL,
        \`auto_state\` LONGTEXT NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_hotel_daily_reports_date\` (\`report_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
      .then(ensureAutoStateColumn)
      .catch((error) => {
        schemaReady = undefined;
        throw error;
      });
  }
  return schemaReady;
}

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value || 'null');
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function toDateString(value) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function mapReport(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    reportDate: toDateString(row.report_date),
    heureDebut: row.heure_debut || '',
    heureFin: row.heure_fin || '',
    receptionniste: row.receptionniste || '',
    rooms: parseJson(row.rooms, []),
    observations: row.observations || '',
    metrics: parseJson(row.metrics, {}),
    autoState: parseJson(row.auto_state, null),
    createdBy: row.created_by === null ? null : Number(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateDate(reportDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(reportDate || ''))) {
    throw ApiError.badRequest('La date du rapport doit être au format YYYY-MM-DD.');
  }
  return String(reportDate);
}

async function getHotelReport(reportDate) {
  await ensureHotelReportsTable();
  const date = validateDate(reportDate);
  const [rows] = await pool.query(
    'SELECT * FROM `hotel_daily_reports` WHERE `report_date` = ? LIMIT 1',
    [date]
  );
  return mapReport(rows[0]);
}

async function listHotelReports({ startDate, endDate, limit } = {}) {
  await ensureHotelReportsTable();
  const conditions = [];
  const params = [];
  if (startDate) {
    conditions.push('`report_date` >= ?');
    params.push(validateDate(startDate));
  }
  if (endDate) {
    conditions.push('`report_date` <= ?');
    params.push(validateDate(endDate));
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 60, 1), 365);
  const [rows] = await pool.query(
    `SELECT * FROM \`hotel_daily_reports\`
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY \`report_date\` DESC
      LIMIT ${safeLimit}`,
    params
  );
  return rows.map(mapReport);
}

async function saveHotelReport({
  reportDate,
  heureDebut,
  heureFin,
  receptionniste,
  rooms,
  observations,
  metrics,
  autoState,
  createdBy,
}) {
  await ensureHotelReportsTable();
  const date = validateDate(reportDate);
  if (!Array.isArray(rooms) || rooms.length === 0) {
    throw ApiError.badRequest('Le rapport doit contenir au moins une chambre.');
  }

  await pool.query(
    `INSERT INTO \`hotel_daily_reports\`
       (\`report_date\`, \`heure_debut\`, \`heure_fin\`, \`receptionniste\`, \`rooms\`, \`observations\`, \`metrics\`, \`auto_state\`, \`created_by\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       \`heure_debut\` = VALUES(\`heure_debut\`),
       \`heure_fin\` = VALUES(\`heure_fin\`),
       \`receptionniste\` = VALUES(\`receptionniste\`),
       \`rooms\` = VALUES(\`rooms\`),
       \`observations\` = VALUES(\`observations\`),
       \`metrics\` = VALUES(\`metrics\`),
       \`auto_state\` = VALUES(\`auto_state\`),
       \`created_by\` = VALUES(\`created_by\`)`,
    [
      date,
      heureDebut ? String(heureDebut).slice(0, 10) : null,
      heureFin ? String(heureFin).slice(0, 10) : null,
      receptionniste ? String(receptionniste).slice(0, 190) : null,
      JSON.stringify(rooms),
      observations ? String(observations) : null,
      JSON.stringify(metrics && typeof metrics === 'object' ? metrics : {}),
      autoState && typeof autoState === 'object' ? JSON.stringify(autoState) : null,
      createdBy ?? null,
    ]
  );

  return getHotelReport(date);
}

async function deleteHotelReport(reportDate) {
  await ensureHotelReportsTable();
  const date = validateDate(reportDate);
  const [result] = await pool.query(
    'DELETE FROM `hotel_daily_reports` WHERE `report_date` = ?',
    [date]
  );
  if (!result.affectedRows) {
    throw ApiError.notFound('Aucun rapport journalier pour cette date.');
  }
  return { reportDate: date, deleted: true };
}

module.exports = {
  ensureHotelReportsTable,
  getHotelReport,
  listHotelReports,
  saveHotelReport,
  deleteHotelReport,
};
