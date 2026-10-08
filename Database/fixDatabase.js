require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fixDatabase() {
  try {
    // Connect without database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'hda';
    
    console.log(`📋 Connexion à la base '${dbName}'...`);
    await connection.query(`USE ${dbName}`);

    // Read the schema
    const schemaPath = path.join(__dirname, 'hda_schema_clean.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Preprocess: Add DROP TABLE IF EXISTS before each CREATE TABLE
    schema = schema.replace(/CREATE TABLE/g, 'DROP TABLE IF EXISTS');
    schema = schema.replace(/DROP TABLE IF EXISTS/g, 'DROP TABLE IF EXISTS');
    
    // Split by CREATE TABLE statements to process individually
    const createStatements = schema.match(/CREATE TABLE[^;]+;/gi);
    
    if (createStatements && createStatements.length > 0) {
      console.log(`\n🔧 Recreating ${createStatements.length} tables...`);
      
      for (const statement of createStatements) {
        try {
          // Get table name
          const tableNameMatch = statement.match(/CREATE TABLE [`"]?(\w+)[`"]?/i);
          const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';
          
          // Drop table first
          await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
          
          // Create table
          await connection.query(statement);
          
          console.log(`✅ ${tableName}`);
        } catch (e) {
          if (e.message.includes('Tablespace')) {
            console.log(`⚠️  ${tableName} - skipped (tablespace issue)`);
          } else {
            console.error(`❌ ${tableName} - ${e.message}`);
          }
        }
      }
    }

    // Test users table
    console.log('\n🔍 Testing users table...');
    try {
      const [result] = await connection.query('SELECT COUNT(*) as count FROM users');
      console.log(`✅ users table works! Count: ${result[0].count}`);
    } catch (e) {
      console.error(`❌ users table still has issues: ${e.message}`);
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDatabase();
