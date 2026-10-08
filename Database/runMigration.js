// Database/runMigration.js
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigration(sqlFilePath) {
  try {
    console.log('🚀 Running migration:', sqlFilePath);

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
