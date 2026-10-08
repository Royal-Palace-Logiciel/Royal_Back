require('dotenv').config();
const mysql = require('mysql2/promise');

async function recreateUsersTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hda'
    });

    console.log('🔧 Attempting to fix users table...\n');

    // Try dropping with ALTER to handle InnoDB engine  
    console.log('Step 1: Checking current table status...');
    
    try {
      // Try to check if we can even access basic info
      const [info] = await connection.query(
        `SELECT TABLE_NAME, ENGINE FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
        [process.env.DB_NAME || 'hda']
      );
      
      if (info.length > 0) {
        console.log(`Found users table with engine: ${info[0].ENGINE}`);
      }
    } catch (e) {
      console.log('Could not query table info');
    }

    // Create a backup table name
    const backupName = 'users_backup_' + Date.now();
    
    // Try renaming first
    console.log('Step 2: Attempting to rename corrupt table...');
    try {
      await connection.query(`RENAME TABLE users TO ${backupName}`);
      console.log(`✅ Renamed to ${backupName}`);
    } catch (e) {
      console.log(`⚠️  Cannot rename: ${e.message}`);
      console.log('Attempting direct drop...');
      try {
        await connection.query('DROP TABLE users');
        console.log('✅ Dropped table');
      } catch (e2) {
        console.log(`⚠️  Cannot drop: ${e2.message}`);
      }
    }

    // Create new clean users table
    console.log('\nStep 3: Creating new users table...');
    
    const createSQL = `
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
    
    await connection.query(createSQL);
    console.log('✅ New users table created');

    // Test it
    console.log('\nStep 4: Testing new table...');
    const [testResult] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Table is working! Row count: ${testResult[0].count}`);

    // Show table structure
    console.log('\nUsers table structure:');
    const [columns] = await connection.query('DESCRIBE users');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    await connection.end();
    
    console.log('\n🎉 Users table fixed successfully!');
    console.log('You can now run: npm run seed');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    process.exit(1);
  }
}

recreateUsersTable();
