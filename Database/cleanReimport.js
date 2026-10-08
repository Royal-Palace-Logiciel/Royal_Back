require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanReimport() {
  try {
    // Connect without database first
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'hda';
    
    console.log(`🔧 Suppression de la base de données '${dbName}'...`);
    try {
      await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
      console.log('✅ Base de données supprimée');
    } catch (e) {
      console.log('⚠️  Impossible de supprimer:', e.message);
    }

    console.log(`\n🔨 Création de la base de données '${dbName}'...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Base de données créée');

    await connection.query(`USE ${dbName}`);

    console.log('\n📥 Import du schéma...');
    
    // Read schema file
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'hda_schema_clean.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await connection.query(schema);
    console.log('✅ Schéma importé');

    // Test the users table
    console.log('\n🔍 Vérification de la table users...');
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Table users fonctionnelle ! Nombre d'utilisateurs: ${rows[0].count}`);

    await connection.end();
    
    console.log('\n🎉 Base de données restaurée avec succès !');
    console.log('Vous pouvez maintenant exécuter: npm run seed');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

cleanReimport();
