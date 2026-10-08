require('dotenv').config();
const mysql = require('mysql2/promise');

async function diagnose() {
  console.log('🔍 Configuration de la base de données:');
  console.log(`   Host: ${process.env.DB_HOST || '127.0.0.1'}`);
  console.log(`   Port: ${process.env.DB_PORT || 3306}`);
  console.log(`   User: ${process.env.DB_USER || 'root'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'hda'}`);
  console.log('');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hda'
    });

    console.log('✅ Connexion établie');

    // Test simple query
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Nombre d'utilisateurs: ${rows[0].count}`);

    // Show users
    const [users] = await connection.query('SELECT id_admin, email, role FROM users LIMIT 5');
    console.log('\n📋 Utilisateurs dans la base:');
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
    });

    await connection.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

diagnose();
