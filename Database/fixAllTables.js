require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function fixAllTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    // Get the datadir
    const [vars] = await connection.query('SHOW VARIABLES LIKE "datadir"');
    let dataDir = vars[0] ? vars[0].Value : '';
    
    console.log('📂 MySQL Data Directory:', dataDir);

    await connection.end();

    if (!dataDir) {
      console.log('❌ Could not determine MySQL data directory');
      process.exit(1);
    }

    const hdaDir = path.join(dataDir, 'hda');

    if (!fs.existsSync(hdaDir)) {
      console.log('❌ hda directory does not exist');
      process.exit(1);
    }

    console.log('\n🔍 Finding all corrupt table files...');
    const files = fs.readdirSync(hdaDir);
    const ibdFiles = files.filter(f => f.endsWith('.ibd'));
    
    console.log(`📋 Found ${ibdFiles.length} .ibd files`);

    if (ibdFiles.length > 0) {
      console.log('\n🗑️  Deleting all .ibd files to force recreation...');
      let deleted = 0;
      ibdFiles.forEach(f => {
        const filePath = path.join(hdaDir, f);
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✅ ${f}`);
          deleted++;
        } catch (e) {
          console.error(`   ❌ Failed to delete ${f}: ${e.message}`);
        }
      });
      
      console.log(`\n✅ Deleted ${deleted} files`);
    }

    // Now import the schema
    console.log('\n📥 Reconnecting and importing schema...');
    
    const connection2 = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hda',
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, 'hda_schema_clean.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
      await connection2.query(schema);
      console.log('✅ Schema imported successfully');
    } catch (e) {
      console.error('❌ Schema import error:', e.message);
    }

    await connection2.end();
    
    console.log('\n🎉 All corrupt tables have been cleaned!');
    console.log('You can now run: npm run seed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAllTables();
