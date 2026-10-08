const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

const categories = ['Videur', 'Femme de ménage', 'Agents d’accueil', 'Bar', 'Restaurant', 'Poker'];
const DEFAULT_SCHEDULE = '00:00 – 00:00';
const SCHEDULE_PATTERN = /^(?:|OFF|(?:[01]\d|2[0-3]):[0-5]\d – (?:[01]\d|2[0-3]):[0-5]\d)$/;
const INPUT_SCHEDULE_PATTERN = /^((?:[01]\d|2[0-3]):[0-5]\d)(?:\s*[–-]\s*((?:[01]\d|2[0-3]):[0-5]\d))?$/;

function normalizeSchedule(value) {
  if (value == null) return DEFAULT_SCHEDULE;
  const schedule = String(value).trim();
  if (!schedule) return '';
  if (schedule.toUpperCase() === 'OFF') return 'OFF';
  const match = INPUT_SCHEDULE_PATTERN.exec(schedule);
  return match ? `${match[1]} – ${match[2] || '00:00'}` : schedule;
}
let schemaReady;

async function ensurePlanningTable() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS daily_staff_planning (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        planning_date DATE NOT NULL,
        category VARCHAR(80) NOT NULL,
        assignments JSON NOT NULL,
        created_by BIGINT UNSIGNED DEFAULT NULL,
        updated_by BIGINT UNSIGNED DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_daily_staff_planning_date_category (planning_date, category),
        KEY idx_daily_staff_planning_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

function validateDate(value) {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw ApiError.badRequest('La date doit être au format YYYY-MM-DD.');
  }
  return date;
}

function validateCategory(value) {
  if (!categories.includes(value)) throw ApiError.badRequest('Catégorie de planning invalide.');
  return value;
}

function normalizeAssignments(value) {
  if (!Array.isArray(value) || value.length > 50) throw ApiError.badRequest('La liste du personnel est invalide.');
  const slots = new Set();
  return value.map((entry) => {
    const slot = Number(entry?.slot);
    const employeeName = String(entry?.employeeName || '').trim();
    const schedule = normalizeSchedule(entry?.schedule);
    const employeeId = entry?.employeeId == null || entry.employeeId === '' ? null : Number(entry.employeeId);
    if (!Number.isInteger(slot) || slot < 1 || slot > 50 || slots.has(slot)) throw ApiError.badRequest('Un numéro de ligne est invalide ou dupliqué.');
    if (!employeeName || employeeName.length > 160) throw ApiError.badRequest('Le nom du personnel est invalide.');
    if (schedule.length > 80 || !SCHEDULE_PATTERN.test(schedule)) throw ApiError.badRequest('L’horaire doit respecter le format HH:MM – HH:MM.');
    if (employeeId !== null && (!Number.isSafeInteger(employeeId) || employeeId < 1)) throw ApiError.badRequest('La fiche du personnel est invalide.');
    slots.add(slot);
    return { slot, employeeId, employeeName, schedule };
  });
}

function parseAssignments(value) {
  let assignments = value;
  if (!Array.isArray(assignments)) {
    try { assignments = JSON.parse(value || '[]'); } catch { assignments = []; }
  }
  return Array.isArray(assignments) ? assignments.map((entry) => ({ ...entry, schedule: normalizeSchedule(entry?.schedule) })) : [];
}

async function getDailyPlanning(dateValue, categoryValue) {
  await ensurePlanningTable();
  const date = validateDate(dateValue);
  const category = validateCategory(categoryValue);
  const [rows] = await pool.query('SELECT assignments FROM daily_staff_planning WHERE planning_date = ? AND category = ? LIMIT 1', [date, category]);
  return { date, category, assignments: rows[0] ? parseAssignments(rows[0].assignments) : [] };
}

async function saveDailyPlanning({ date: dateValue, category: categoryValue, assignments: values, userId }) {
  await ensurePlanningTable();
  const date = validateDate(dateValue);
  const category = validateCategory(categoryValue);
  const assignments = normalizeAssignments(values);
  await pool.query(`
    INSERT INTO daily_staff_planning (planning_date, category, assignments, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE assignments = VALUES(assignments), updated_by = VALUES(updated_by)
  `, [date, category, JSON.stringify(assignments), userId || null, userId || null]);
  return getDailyPlanning(date, category);
}

module.exports = { categories, getDailyPlanning, saveDailyPlanning };
