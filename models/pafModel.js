const { pool, withTransaction } = require('../config/db');
const { randomUUID } = require('crypto');

const PAF_PRICES = [20000, 10000, 5000, 0];
const PAYMENT_METHODS = ['ESPECES', 'CREDIT', 'TPE', 'ORANGE_MONEY', 'MVOLA', 'GRATUIT'];

function parseDetails(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDetails(details) {
  return details.map((detail) => ({
    price: Number(detail.price),
    gender: detail.gender === 'Femme' ? 'Femme' : 'Homme',
    qty: Number(detail.qty),
  }));
}

function summarizeOperations(operations) {
  const byPrice = PAF_PRICES.map((price) => {
    const count = operations.reduce((sum, operation) => (
      sum + operation.details
        .filter((detail) => Number(detail.price) === price)
        .reduce((lineSum, detail) => lineSum + Number(detail.qty || 0), 0)
    ), 0);
    return { price, count, amount: count * price };
  });

  const byPayment = PAYMENT_METHODS.reduce((result, method) => {
    result[method] = operations
      .filter((operation) => operation.paymentMethod === method)
      .reduce((sum, operation) => sum + Number(operation.price || 0), 0);
    return result;
  }, {});

  return {
    totalTickets: operations.length,
    totalAmount: operations.reduce((sum, operation) => sum + Number(operation.price || 0), 0),
    homme: operations.reduce((sum, operation) => sum + operation.details
      .filter((detail) => detail.gender === 'Homme')
      .reduce((lineSum, detail) => lineSum + Number(detail.qty || 0), 0), 0),
    femme: operations.reduce((sum, operation) => sum + operation.details
      .filter((detail) => detail.gender === 'Femme')
      .reduce((lineSum, detail) => lineSum + Number(detail.qty || 0), 0), 0),
    byPrice,
    byPayment,
  };
}

function mapOperation(row) {
  const details = normalizeDetails(parseDetails(row.details));
  return {
    id: Number(row.id),
    date: row.date_operation,
    gender: details.some((detail) => detail.gender === 'Homme') && details.some((detail) => detail.gender === 'Femme')
      ? 'Mixte'
      : details[0]?.gender || 'Homme',
    price: Number(row.montant || 0),
    paymentMethod: row.moyen_paiement || 'ESPECES',
    details,
    statut: row.statut,
    sessionId: Number(row.session_id),
    clotureId: row.cloture_id ? Number(row.cloture_id) : null,
    userId: row.user_id ? Number(row.user_id) : null,
  };
}

function mapClosure(row, operations = undefined) {
  const summary = {
    totalTickets: Number(row.nombre_operations || 0),
    totalAmount: Number(row.total_final ?? row.total_montant ?? 0),
    totalInitial: Number(row.total_initial || 0),
    totalFinal: Number(row.total_final ?? row.total_montant ?? 0),
    homme: Number(row.total_homme || 0),
    femme: Number(row.total_femme || 0),
    byPrice: [],
    byPayment: {},
  };
  let storedSummary = row.details;
  if (typeof storedSummary === 'string' && storedSummary) {
    try {
      storedSummary = JSON.parse(storedSummary);
    } catch {
      storedSummary = null;
    }
  }
  if (!storedSummary || Array.isArray(storedSummary) || typeof storedSummary !== 'object') storedSummary = null;
  const result = {
    id: Number(row.id),
    reference: row.reference,
    date: row.date_session,
    dateCloture: row.date_cloture,
    sessionId: Number(row.session_id),
    createdBy: row.created_by ? Number(row.created_by) : null,
    summary: storedSummary ? { ...summary, ...storedSummary } : summary,
  };
  if (operations) result.operations = operations.map(mapOperation);
  return result;
}

async function getCurrentSession(connection, userId, lock = false) {
  const [rows] = await connection.query(
    `SELECT * FROM paf_sessions WHERE statut = 'OUVERTE' ORDER BY id DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`
  );
  if (rows[0]) return rows[0];

  try {
    const [result] = await connection.query(
      `INSERT INTO paf_sessions (date_session, statut, ouvert_at, ouvert_par, created_at, updated_at)
       VALUES (CURDATE(), 'OUVERTE', NOW(), ?, NOW(), NOW())`,
      [userId || null]
    );
    const [[session]] = await connection.query('SELECT * FROM paf_sessions WHERE id = ?', [result.insertId]);
    return session;
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
    const [[session]] = await connection.query(
      "SELECT * FROM paf_sessions WHERE statut = 'OUVERTE' ORDER BY id DESC LIMIT 1"
    );
    return session;
  }
}

async function listCurrentOperations(userId) {
  const session = await getCurrentSession(pool, userId);
  const [rows] = await pool.query(
    `SELECT * FROM paf_operations
     WHERE session_id = ? AND cloture_id IS NULL AND statut = 'OUVERTE'
     ORDER BY date_operation DESC, id DESC`,
    [session.id]
  );
  const operations = rows.map(mapOperation);
  return { session, operations, summary: summarizeOperations(operations) };
}

async function createOperation({ details, paymentMethod, userId }) {
  return withTransaction(async (connection) => {
    const session = await getCurrentSession(connection, userId, true);
    const amount = details.reduce((sum, detail) => sum + detail.price * detail.qty, 0);
    const [result] = await connection.query(
      `INSERT INTO paf_operations
       (session_id, date_operation, montant, type_operation, description, statut, moyen_paiement, details, user_id, created_at, updated_at)
       VALUES (?, NOW(), ?, 'ENTREE', 'Ticket PAF', 'OUVERTE', ?, ?, ?, NOW(), NOW())`,
      [session.id, amount, paymentMethod, JSON.stringify(details), userId || null]
    );
    const [[row]] = await connection.query('SELECT * FROM paf_operations WHERE id = ?', [result.insertId]);
    return mapOperation(row);
  });
}

async function updateOperation(id, { details, paymentMethod }) {
  const amount = details.reduce((sum, detail) => sum + detail.price * detail.qty, 0);
  const [result] = await pool.query(
    `UPDATE paf_operations
     SET montant = ?, moyen_paiement = ?, details = ?, updated_at = NOW()
     WHERE id = ? AND cloture_id IS NULL AND statut = 'OUVERTE'`,
    [amount, paymentMethod, JSON.stringify(details), id]
  );
  if (!result.affectedRows) return null;
  const [[row]] = await pool.query('SELECT * FROM paf_operations WHERE id = ?', [id]);
  return mapOperation(row);
}

async function deleteOperation(id) {
  const [result] = await pool.query(
    "DELETE FROM paf_operations WHERE id = ? AND cloture_id IS NULL AND statut = 'OUVERTE'",
    [id]
  );
  return result.affectedRows > 0;
}

async function listClosures() {
  const [rows] = await pool.query('SELECT * FROM paf_clotures ORDER BY date_cloture DESC, id DESC');
  return rows.map((row) => mapClosure(row));
}

async function getClosure(id) {
  const [[closure]] = await pool.query('SELECT * FROM paf_clotures WHERE id = ?', [id]);
  if (!closure) return null;
  const [operations] = await pool.query(
    'SELECT * FROM paf_operations WHERE cloture_id = ? ORDER BY date_operation ASC, id ASC',
    [id]
  );
  return mapClosure(closure, operations);
}

async function closeCurrentSession(userId) {
  return withTransaction(async (connection) => {
    const session = await getCurrentSession(connection, userId, true);
    const [rows] = await connection.query(
      `SELECT * FROM paf_operations
       WHERE session_id = ? AND cloture_id IS NULL AND statut = 'OUVERTE'
       ORDER BY date_operation ASC, id ASC
       FOR UPDATE`,
      [session.id]
    );
    const operations = rows.map(mapOperation);
    const summary = summarizeOperations(operations);
    const reference = `PAF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${session.id}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const [closureResult] = await connection.query(
      `INSERT INTO paf_clotures
       (reference, session_id, date_session, date_cloture, total_initial, total_final, total_montant, nombre_operations, total_homme, total_femme, details, created_by, created_at)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [reference, session.id, session.date_session, 0, summary.totalAmount, summary.totalAmount, summary.totalTickets, summary.homme, summary.femme, JSON.stringify({ byPrice: summary.byPrice, byPayment: summary.byPayment }), userId || null]
    );
    const closureId = closureResult.insertId;

    await connection.query(
      "UPDATE paf_operations SET cloture_id = ?, statut = 'CLOTUREE', updated_at = NOW() WHERE session_id = ? AND cloture_id IS NULL",
      [closureId, session.id]
    );
    await connection.query(
      `UPDATE paf_sessions
       SET statut = 'CLOTUREE', cloture_at = NOW(), cloture_par = ?, updated_at = NOW()
       WHERE id = ?`,
      [userId || null, session.id]
    );

    const [nextSessionResult] = await connection.query(
      `INSERT INTO paf_sessions (date_session, statut, ouvert_at, ouvert_par, created_at, updated_at)
       VALUES (CURDATE(), 'OUVERTE', NOW(), ?, NOW(), NOW())`,
      [userId || null]
    );
    const [[nextSession]] = await connection.query('SELECT * FROM paf_sessions WHERE id = ?', [nextSessionResult.insertId]);
    const [[closure]] = await connection.query('SELECT * FROM paf_clotures WHERE id = ?', [closureId]);
    const [closedOperations] = await connection.query(
      'SELECT * FROM paf_operations WHERE cloture_id = ? ORDER BY date_operation ASC, id ASC',
      [closureId]
    );

    return {
      closure: mapClosure(closure, closedOperations),
      currentSession: nextSession,
      currentSummary: summarizeOperations([]),
    };
  });
}

module.exports = {
  PAF_PRICES,
  PAYMENT_METHODS,
  normalizeDetails,
  summarizeOperations,
  listCurrentOperations,
  createOperation,
  updateOperation,
  deleteOperation,
  listClosures,
  getClosure,
  closeCurrentSession,
};
