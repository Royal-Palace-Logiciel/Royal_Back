require('dotenv').config();
const mysql = require('mysql2/promise');

async function repairTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hda'
    });

    // Check table status
    console.log('🔍 Vérification de la table...');
    const [checkResult] = await connection.query('CHECK TABLE users');
    console.log('CHECK TABLE résultat:');
    console.log(JSON.stringify(checkResult, null, 2));

    // Try to repair
    console.log('\n🔧 Réparation de la table...');
    const [repairResult] = await connection.query('REPAIR TABLE users');
    console.log('REPAIR TABLE résultat:');
    console.log(JSON.stringify(repairResult, null, 2));

    // Try to select again
    console.log('\n🔍 Tentative de SELECT après réparation...');
    try {
      const [rows] = await connection.query('SELECT * FROM users LIMIT 1');
      console.log('✅ SELECT fonctionne maintenant !');
      console.log('Résultat:', rows);
    } catch (e) {
      console.error('❌ SELECT échoue toujours:', e.message);
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

repairTable();
