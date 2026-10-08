const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

let schemaReady;

async function ensureRestaurantReportsTable() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS restaurant_daily_reports (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        report_date DATE NOT NULL,
        manager_employee_id BIGINT UNSIGNED DEFAULT NULL,
        personnel_present JSON NOT NULL,
        financial_c1 DECIMAL(15, 2) NOT NULL DEFAULT 0,
        financial_mvola DECIMAL(15, 2) NOT NULL DEFAULT 0,
        financial_tpe DECIMAL(15, 2) NOT NULL DEFAULT 0,
        financial_np DECIMAL(15, 2) NOT NULL DEFAULT 0,
        financial_credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
        financial_depense DECIMAL(15, 2) NOT NULL DEFAULT 0,
        financial_bouteille DECIMAL(15, 2) NOT NULL DEFAULT 0,
        financial_pourboire DECIMAL(15, 2) NOT NULL DEFAULT 0,
        free_items JSON NOT NULL,
        free_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
        tables_occupied INT UNSIGNED NOT NULL DEFAULT 0,
        tables_available INT UNSIGNED NOT NULL DEFAULT 0,
        observations TEXT DEFAULT NULL,
        created_by BIGINT UNSIGNED DEFAULT NULL,
        updated_by BIGINT UNSIGNED DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_restaurant_daily_report_date (report_date),
        KEY idx_restaurant_daily_report_created_by (created_by)
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
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateDate(reportDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(reportDate || ''))) {
    throw ApiError.badRequest('La date du rapport doit être au format YYYY-MM-DD.');
  }
  return String(reportDate);
}

function mapReport(row) {
  if (!row) return null;
  const storedDetails = parseJson(row.observations);
  return {
    id: Number(row.id),
    reportDate: String(row.report_date).slice(0, 10),
    personnel: parseJson(row.personnel_present),
    manual: storedDetails.manual || {},
    metrics: {
      c1: numberValue(row.financial_c1),
      mvola: numberValue(row.financial_mvola),
      tpe: numberValue(row.financial_tpe),
      gratuit: numberValue(row.free_total),
      tableOccupee: numberValue(row.tables_occupied),
      np: numberValue(row.financial_np),
      credit: numberValue(row.financial_credit),
      bouteilles: numberValue(row.financial_bouteille),
    },
    createdBy: row.created_by === null ? null : Number(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getRestaurantReport(reportDate) {
  await ensureRestaurantReportsTable();
  const date = validateDate(reportDate);
  const [rows] = await pool.query('SELECT * FROM restaurant_daily_reports WHERE report_date = ? LIMIT 1', [date]);
  return mapReport(rows[0]);
}

async function saveRestaurantReport({ reportDate, personnel, manual, metrics, createdBy }) {
  await ensureRestaurantReportsTable();
  const date = validateDate(reportDate);
  if (!personnel || typeof personnel !== 'object' || !manual || typeof manual !== 'object' || !metrics || typeof metrics !== 'object') {
    throw ApiError.badRequest('Les données du rapport sont incomplètes.');
  }

  await pool.query(
    `INSERT INTO restaurant_daily_reports (
      report_date, personnel_present, financial_c1, financial_mvola, financial_tpe,
      financial_np, financial_credit, financial_depense, financial_bouteille,
      financial_pourboire, free_items, free_total, tables_occupied, observations, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      personnel_present = VALUES(personnel_present),
      financial_c1 = VALUES(financial_c1),
      financial_mvola = VALUES(financial_mvola),
      financial_tpe = VALUES(financial_tpe),
      financial_np = VALUES(financial_np),
      financial_credit = VALUES(financial_credit),
      financial_depense = VALUES(financial_depense),
      financial_bouteille = VALUES(financial_bouteille),
      financial_pourboire = VALUES(financial_pourboire),
      free_items = VALUES(free_items),
      free_total = VALUES(free_total),
      tables_occupied = VALUES(tables_occupied),
      observations = VALUES(observations),
      created_by = VALUES(created_by)`,
    [
      date,
      JSON.stringify(personnel),
      numberValue(metrics.c1),
      numberValue(metrics.mvola),
      numberValue(metrics.tpe),
      numberValue(metrics.np),
      numberValue(metrics.credit),
      numberValue(manual.depense),
      numberValue(metrics.bouteilles),
      numberValue(manual.pourboire),
      JSON.stringify({ details: manual.gratuit || '' }),
      numberValue(metrics.gratuit),
      numberValue(metrics.tableOccupee),
      JSON.stringify({ manual }),
      createdBy ?? null,
    ]
  );

  return getRestaurantReport(date);
}

module.exports = { ensureRestaurantReportsTable, getRestaurantReport, saveRestaurantReport };
