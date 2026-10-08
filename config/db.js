// config/db.js
// Pool de connexions MySQL basé sur mysql2/promise.
// Toutes les requêtes de l'application passent par ce pool.

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hda',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  dateStrings: true,
});

// Fuseau horaire des NOW() / CURDATE() de MySQL (heures de pointage, dates du jour).
// Un serveur hébergé est souvent en UTC : 3 h de moins qu'à Madagascar. Mettre par
// exemple DB_TIMEZONE=+03:00 dans .env pour aligner MySQL sur l'heure locale.
if (process.env.DB_TIMEZONE) {
  pool.pool.on('connection', (connection) => {
    connection.query('SET time_zone = ?', [process.env.DB_TIMEZONE]);
  });
}

// Vérification de la connexion au démarrage
async function checkConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    console.log('[db] Connexion MySQL établie sur', process.env.DB_NAME);
  } finally {
    conn.release();
  }
}

// Helper pour exécuter une transaction proprement
async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, checkConnection, withTransaction };
