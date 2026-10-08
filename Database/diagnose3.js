require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTableType() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hda'
    });

    // Check what type of object "users" is
    const [info] = await connection.query(
      `SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [process.env.DB_NAME || 'hda', 'users']
    );

    console.log('📋 Information sur "users":');
    if (info.length > 0) {
      console.log(JSON.stringify(info[0], null, 2));
    } else {
      console.log('❌ Pas d\'information trouvée');
    }

    // Try to select from the table
    console.log('\n🔍 Tentative de requête SELECT...');
    try {
      const [rows] = await connection.query('SELECT * FROM users LIMIT 1');
      console.log('✅ SELECT fonctionne');
      console.log('Résultat:', rows);
    } catch (e) {
      console.error('❌ SELECT échoue:', e.message);
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkTableType();
