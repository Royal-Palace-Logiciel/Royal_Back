const { createCrudModel } = require('./crudFactory');

const BarCashiers = createCrudModel({
  table: 'bar_cashiers',
  pk: 'id',
  fields: ['nom', 'statut'],
  sortable: ['id', 'nom', 'statut'],
});

async function openCashierSession({ cashier_id, user_id, fond_initial }) {
  const { pool, withTransaction } = require('../config/db');
  return withTransaction(async (conn) => {
    const [result] = await conn.query(
      'INSERT INTO bar_sessions (cashier_id, user_id, ouverture_at, fond_initial) VALUES (?, ?, NOW(), ?)',
      [cashier_id, user_id, fond_initial]
    );
    await conn.query('UPDATE bar_cashiers SET statut = ? WHERE id = ?', ['OUVERTE', cashier_id]);
    return result.insertId;
  });
}

async function closeCashierSession(sessionId, fondFinal) {
  const { pool, withTransaction } = require('../config/db');
  return withTransaction(async (conn) => {
    const [result] = await conn.query(
      `UPDATE bar_sessions SET fermeture_at = NOW(), fond_final = ?, ecart = ? - fond_initial WHERE id = ? AND fermeture_at IS NULL`,
      [fondFinal, fondFinal, sessionId]
    );
    if (result.affectedRows > 0) {
      const [sessions] = await conn.query('SELECT cashier_id FROM bar_sessions WHERE id = ?', [sessionId]);
      if (sessions.length > 0) {
        await conn.query('UPDATE bar_cashiers SET statut = ? WHERE id = ?', ['FERMEE', sessions[0].cashier_id]);
      }
    }
    return result.affectedRows > 0;
  });
}

async function getCurrentSession(cashierId) {
  const { pool } = require('../config/db');
  const [rows] = await pool.query(
    'SELECT * FROM bar_sessions WHERE cashier_id = ? AND fermeture_at IS NULL ORDER BY ouverture_at DESC LIMIT 1',
    [cashierId]
  );
  return rows[0] || null;
}

module.exports = { BarCashiers, openCashierSession, closeCashierSession, getCurrentSession };