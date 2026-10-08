// Database/runMigration.js
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigration(sqlFilePath) {
  try {
    console.log('🚀 Running migration:', sqlFilePath);

    // A schema dump may leave report names as base tables. Remove either
    // object type before recreating the report views.
    if (path.basename(sqlFilePath) === 'add_casino_report_views.sql') {
      const objectNames = [
        'v_casino_ecarts_caisse',
        'v_casino_encours_credit',
        'v_casino_produit_net_jour',
      ];
      for (const objectName of objectNames) {
        const [[object]] = await pool.query(
          `SELECT TABLE_TYPE AS object_type
             FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [objectName]
        );
        if (object?.object_type === 'VIEW') {
          await pool.query(`DROP VIEW \`${objectName}\``);
        } else if (object?.object_type === 'BASE TABLE') {
          await pool.query(`DROP TABLE \`${objectName}\``);
        }
      }
    }
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    const statements = sql
      .split(';')
      .filter((statement) => statement.trim())
      .filter((statement) => !/^\s*DROP\s+VIEW\s+IF\s+EXISTS/i.test(statement));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: node runMigration.js <migration-file.sql>');
    process.exit(1);
  }
  
  runMigration(migrationFile)
    .then(() => {
      console.log('🎉 Migration executed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
