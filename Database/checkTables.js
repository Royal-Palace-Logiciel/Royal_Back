const { pool } = require('../config/db');
require('dotenv').config();

async function listTables() {
  try {
    const connection = await pool.getConnection();
    const [tables] = await connection.query(`SHOW TABLES FROM ${process.env.DB_NAME || 'hda'}`);
    
    console.log(`📋 Tables dans la base '${process.env.DB_NAME || 'hda'}':`);
    if (tables.length === 0) {
      console.log('❌ Aucune table trouvée !');
    } else {
      tables.forEach(row => {
        const tableName = Object.values(row)[0];
        console.log(`  ✓ ${tableName}`);
      });
      console.log(`\n✅ Total: ${tables.length} tables`);
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

listTables();
