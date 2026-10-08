const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

let schemaReady;

async function ensureBarReportsTable() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS \`bar_daily_reports\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`report_date\` DATE NOT NULL,
        \`personnel\` LONGTEXT NULL,
        \`manual\` LONGTEXT NULL,
        \`metrics\` LONGTEXT NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_bar_daily_reports_date\` (\`report_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

function parseJson(value) {
  if (typeof value === 'object' && value !== null) return value;
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function mapReport(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    reportDate: row.report_date instanceof Date
      ? row.report_date.toISOString().slice(0, 10)
      : String(row.report_date).slice(0, 10),
    personnel: parseJson(row.personnel),
    manual: parseJson(row.manual),
    metrics: parseJson(row.metrics),
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

async function getBarReport(reportDate) {
  await ensureBarReportsTable();
  const date = validateDate(reportDate);
  const [rows] = await pool.query('SELECT * FROM \`bar_daily_reports\` WHERE \`report_date\` = ? LIMIT 1', [date]);
  return mapReport(rows[0]);
}

async function saveBarReport({ reportDate, personnel, manual, metrics, createdBy }) {
  await ensureBarReportsTable();
  const date = validateDate(reportDate);
  if (!personnel || typeof personnel !== 'object' || !manual || typeof manual !== 'object' || !metrics || typeof metrics !== 'object') {
    throw ApiError.badRequest('Les données du rapport sont incomplètes.');
  }

  await pool.query(
    `INSERT INTO \`bar_daily_reports\` (\`report_date\`, \`personnel\`, \`manual\`, \`metrics\`, \`created_by\`)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       \`personnel\` = VALUES(\`personnel\`),
       \`manual\` = VALUES(\`manual\`),
       \`metrics\` = VALUES(\`metrics\`),
       \`created_by\` = VALUES(\`created_by\`)`,
    [date, JSON.stringify(personnel), JSON.stringify(manual), JSON.stringify(metrics), createdBy ?? null]
  );

  return getBarReport(date);
}

module.exports = { ensureBarReportsTable, getBarReport, saveBarReport };