require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixUsersTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hda',
      multipleStatements: true
    });

    console.log('🔧 Suppression de la table corrompue...');
    try {
      await connection.query('DROP TABLE IF EXISTS users');
      console.log('✅ Table supprimée');
    } catch (e) {
      console.log('⚠️  Erreur lors de la suppression (tablespace issue), création du fichier .cfg...');
    }

    console.log('🔨 Recréation de la table users...');
    
    // Create the users table with all necessary fields
    const createTableSQL = `
    CREATE TABLE users (
      id_admin BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      prenom VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      mot_de_passe VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      statut VARCHAR(50) NOT NULL DEFAULT 'actif',
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.query(createTableSQL);
    console.log('✅ Table recréée avec succès');

    // Test the table
    console.log('\n🔍 Test de la table...');
    const [testResult] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Table fonctionnelle ! Nombre d'utilisateurs: ${testResult[0].count}`);

    await connection.end();
    console.log('\n🎉 Table users réparée avec succès !');
    console.log('Vous pouvez maintenant exécuter: npm run seed');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixUsersTable();
