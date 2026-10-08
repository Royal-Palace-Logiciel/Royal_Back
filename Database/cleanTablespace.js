require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function findAndDeleteUsersTablespace() {
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

    // Close connection
    await connection.end();

    // Clean up the datadir path  
    if (!dataDir) {
      console.log('❌ Could not determine MySQL data directory');
      process.exit(1);
    }

    // Path to hda database files
    const hdaDir = path.join(dataDir, 'hda');
    const usersDir = path.join(dataDir, 'hda', 'users');
    
    console.log('\n🔍 Looking for users table files...');
    console.log('   Checking:', hdaDir);

    if (!fs.existsSync(hdaDir)) {
      console.log('❌ hda directory does not exist');
      process.exit(1);
    }

    // Look for users table files
    const files = fs.readdirSync(hdaDir);
    const usersFiles = files.filter(f => f.startsWith('users.'));
    
    console.log(`\n📋 Found ${usersFiles.length} files for users table:`);
    usersFiles.forEach(f => {
      const filePath = path.join(hdaDir, f);
      const stat = fs.statSync(filePath);
      console.log(`   - ${f} (${stat.size} bytes)`);
    });

    if (usersFiles.length > 0) {
      console.log('\n🗑️  Deleting corrupt users table files...');
      usersFiles.forEach(f => {
        const filePath = path.join(hdaDir, f);
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✅ Deleted: ${f}`);
        } catch (e) {
          console.error(`   ❌ Failed to delete ${f}: ${e.message}`);
        }
      });
    }

    console.log('\n✅ Tablespace files cleaned!');
    console.log('   Now try: node Database/fixUsersTableV2.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findAndDeleteUsersTablespace();
