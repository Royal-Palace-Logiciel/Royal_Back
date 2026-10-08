const { createCrudModel } = require('./crudFactory');

const BarTables = createCrudModel({
  table: 'bar_tables',
  pk: 'id',
  fields: ['numero', 'capacite', 'statut'],
  sortable: ['id', 'numero', 'statut'],
});

async function ensureDefaultBarTables() {
  const { pool } = require('../config/db');
  const defaultTables = Array.from({ length: 16 }, (_, index) => [
    `T${index + 1}`,
    index % 2 === 0 ? 4 : 2,
    'LIBRE',
  ]);

  for (const [numero, capacite, statut] of defaultTables) {
    await pool.query(
      `INSERT INTO bar_tables (numero, capacite, statut)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM bar_tables WHERE numero = ? LIMIT 1)`,
      [numero, capacite, statut, numero]
    );
  }
}

async function tablesStats() {
  const [rows] = await require('../config/db').pool.query(`
    SELECT 
      COUNT(*) as total_tables,
      SUM(capacite) as capacite_totale,
      SUM(CASE WHEN statut = 'LIBRE' THEN 1 ELSE 0 END) as libres,
      SUM(CASE WHEN statut = 'OCCUPEE' THEN 1 ELSE 0 END) as occupees,
      SUM(CASE WHEN statut = 'RESERVEE' THEN 1 ELSE 0 END) as reservees,
      SUM(CASE WHEN statut = 'EN_COURS' THEN 1 ELSE 0 END) as en_cours
    FROM bar_tables
  `);
  return rows[0];
}

module.exports = { BarTables, tablesStats, ensureDefaultBarTables };