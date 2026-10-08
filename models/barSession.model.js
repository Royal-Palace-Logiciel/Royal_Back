const { createCrudModel } = require('./crudFactory');

const BarSessions = createCrudModel({
  table: 'bar_sessions',
  pk: 'id',
  fields: ['cashier_id', 'user_id', 'ouverture_at', 'fermeture_at', 'fond_initial', 'fond_final', 'ecart'],
  sortable: ['id', 'ouverture_at', 'fermeture_at'],
});

async function sessionStats() {
  const { pool } = require('../config/db');
  const [rows] = await pool.query(`
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN fermeture_at IS NULL THEN 1 END) as sessions_ouvertes,
      COALESCE(SUM(fond_initial), 0) as fond_total_initial,
      COALESCE(SUM(fond_final), 0) as fond_total_final,
      COALESCE(SUM(ecart), 0) as ecart_total
    FROM bar_sessions
  `);
  return rows[0];
}

module.exports = { BarSessions, sessionStats };