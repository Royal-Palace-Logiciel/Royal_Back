const fs = require('fs');
const mysql = require('mysql2/promise');

async function test() {
  try {
    const config = require('./config/db.js');
    const connection = await mysql.createConnection(config);
    
    console.log('📊 Base de données:', config.database);
    
    // 1. Exécuter la migration
    console.log('\n1️⃣ Création de la table...');
    const sql = fs.readFileSync('Database/migrations/add_casino_identity_verifications.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
        console.log('✅ Migration exécutée');
      }
    }
    
    // 2. Vérifier que la table existe
    console.log('\n2️⃣ Vérification de la table...');
    const [tables] = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      ['casino_identity_verifications']
    );
    
    if (tables.length > 0) {
      console.log('✅ Table casino_identity_verifications existe');
    } else {
      console.log('❌ La table n\'existe pas');
    }
    
    // 3. Vérifier la structure
    console.log('\n3️⃣ Structure de la table...');
    const [columns] = await connection.query(
      'SHOW COLUMNS FROM casino_identity_verifications'
    );
    console.log('Colonnes:', columns.map(c => c.Field).join(', '));
    
    // 4. Insérer un test
    console.log('\n4️⃣ Test d\'insertion...');
    try {
      const [result] = await connection.query(
        `INSERT INTO casino_identity_verifications 
         (fiche_id, full_name, id_type, id_number, issue_date, transaction_type, amount, verified_at, verified_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [1, 'Test User', 'CIN', '123456789', '2024-01-01', 'APPORT', 5000000, 1]
      );
      console.log('✅ Données insérées, ID:', result.insertId);
      
      // 5. Vérifier les données
      console.log('\n5️⃣ Récupération des données...');
      const [rows] = await connection.query(
        'SELECT * FROM casino_identity_verifications WHERE id = ?',
        [result.insertId]
      );
      if (rows.length > 0) {
        console.log('✅ Données récupérées:', JSON.stringify(rows[0], null, 2));
      }
    } catch (insertErr) {
      console.log('⚠️ Erreur lors de l\'insertion:', insertErr.message);
    }
    
    await connection.end();
    console.log('\n✅ Test terminé');
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

test();
