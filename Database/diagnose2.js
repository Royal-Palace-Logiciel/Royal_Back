require('dotenv').config();
const mysql = require('mysql2/promise');

async function diagnose2() {
  console.log('🔍 Diagnosing database issue...\n');

  try {
    // Connect without specifying database first
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✅ Connexion sans base établie\n');

    // List all databases
    const [databases] = await connection.query('SHOW DATABASES');
    console.log('📚 Bases de données disponibles:');
    databases.forEach(db => {
      const dbName = Object.values(db)[0];
      console.log(`   - ${dbName}`);
    });

    // Select hda database
    const dbName = process.env.DB_NAME || 'hda';
    await connection.query(`USE ${dbName}`);
    console.log(`\n✅ Base '${dbName}' sélectionnée`);

    // Check if users table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "users"');
    
    if (tables.length === 0) {
      console.log('❌ Table "users" introuvable !');
      
      // List all tables
      const [allTables] = await connection.query('SHOW TABLES');
      console.log(`\n📋 Toutes les tables (${allTables.length}):`);
      allTables.forEach(t => {
        const tableName = Object.values(t)[0];
        console.log(`   - ${tableName}`);
      });
    } else {
      console.log('✅ Table "users" trouvée !');
      
      // Get table structure
      const [columns] = await connection.query('DESCRIBE users');
      console.log('\n📐 Structure de la table users:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type}`);
      });
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

diagnose2();
