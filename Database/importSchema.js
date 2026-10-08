const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function importSchema() {
  const dbName = process.env.DB_NAME || 'hda';
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = Number(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';

  // Create connection without database first (to create it)
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true,
  });

  try {
    console.log(`🔄 Création de la base de données '${dbName}'...`);
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    // Select the database
    await connection.query(`USE ${dbName}`);
    console.log(`✅ Base de données '${dbName}' sélectionnée`);

    // Read schema file
    const schemaPath = path.join(__dirname, 'hda_schema_clean.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔄 Importation du schéma...');
    
    // Execute schema
    await connection.query(schema);
    
    console.log('✅ Schéma importé avec succès !');
    console.log('🎉 Vous pouvez maintenant exécuter: npm run seed');

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation du schéma:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Load env vars
require('dotenv').config();

if (require.main === module) {
  importSchema();
}

module.exports = importSchema;
