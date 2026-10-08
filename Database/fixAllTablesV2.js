require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function properlyFixAllTables() {
  try {
    const dbName = process.env.DB_NAME || 'hda';
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    // Get the datadir
    const [vars] = await connection.query('SHOW VARIABLES LIKE "datadir"');
    let dataDir = vars[0] ? vars[0].Value : '';
    
    console.log('📂 MySQL Data Directory:', dataDir);

    if (!dataDir) {
      console.log('❌ Could not determine MySQL data directory');
      process.exit(1);
    }

    const hdaDir = path.join(dataDir, dbName);

    if (!fs.existsSync(hdaDir)) {
      console.log('❌ hda directory does not exist');
      process.exit(1);
    }

    // Step 1: Get all tables
    console.log('\n📋 Getting list of tables...');
    await connection.query(`USE ${dbName}`);
    const [tables] = await connection.query('SHOW TABLES');
    
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`Found ${tableNames.length} tables`);

    // Step 2: Drop all tables
    console.log('\n🗑️  Dropping all tables...');
    for (const tableName of tableNames) {
      try {
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        console.log(`   ✅ Dropped ${tableName}`);
      } catch (e) {
        console.log(`   ⚠️  Could not drop ${tableName}: ${e.message}`);
      }
    }

    // Step 3: Delete .ibd files
    console.log('\n🗑️  Deleting .ibd files from disk...');
    const files = fs.readdirSync(hdaDir);
    const ibdFiles = files.filter(f => f.endsWith('.ibd'));
    
    ibdFiles.forEach(f => {
      const filePath = path.join(hdaDir, f);
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Silent fail
      }
    });
    console.log(`   ✅ Cleaned up ${ibdFiles.length} .ibd files`);

    // Step 4: Import schema
    console.log('\n📥 Importing schema...');
    const schemaPath = path.join(__dirname, 'hda_schema_clean.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
      const results = await connection.query(schema);
      console.log('✅ Schema imported successfully');
    } catch (e) {
      console.error('❌ Schema import error:', e.message);
      throw e;
    }

    // Step 5: Verify
    console.log('\n✅ Verifying tables...');
    const [newTables] = await connection.query('SHOW TABLES');
    console.log(`   Restored ${newTables.length} tables`);

    await connection.end();
    
    console.log('\n🎉 Database fully restored!');
    console.log('You can now run: npm run seed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

properlyFixAllTables();
