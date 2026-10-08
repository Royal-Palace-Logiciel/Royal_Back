// Database/seedStockLocation.js
const { pool } = require('../config/db');

/**
 * Seeder pour la table stock_locations
 */
class SeedStockLocation {
  
  /**
   * Liste des emplacements à insérer
   */
  getItems() {
    return [
      { id: 1, nom: 'Hébergement' },
      { id: 2, nom: 'Restaurant' },
      { id: 3, nom: 'Bar & Lounge' },
      { id: 4, nom: 'Casino' }
    ];
  }

  /**
   * Exécuter le seeder
   */
  async run() {
    try {
      console.log('🚀 Début du seeder des emplacements de stock...');

      const items = this.getItems();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of items) {
        // Vérifier si l'emplacement existe déjà (par ID)
        const [existing] = await pool.query(
          'SELECT id FROM stock_locations WHERE id = ?',
          [item.id]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Emplacement déjà existant: ${item.nom} (id ${item.id}) – ignoré`);
          skippedCount++;
          continue;
        }

        // Insérer l'emplacement
        await pool.query(
          'INSERT INTO stock_locations (id, nom) VALUES (?, ?)',
          [item.id, item.nom]
        );

        console.log(`✅ Emplacement créé: ${item.nom} (id ${item.id})`);
        insertedCount++;
      }

      console.log(`\n📊 Résumé du seeder des emplacements:`);
      console.log(`   ✅ ${insertedCount} emplacement(s) créé(s)`);
      console.log(`   ⏭️  ${skippedCount} emplacement(s) déjà existant(s)`);
      console.log(`   📋 Total: ${items.length} emplacement(s)`);
      
      console.log('✅ Seeder des emplacements terminé !\n');

    } catch (error) {
      console.error('❌ Erreur lors du seeder des emplacements:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer tous les emplacements
   */
  async truncate() {
    try {
      await pool.query('DELETE FROM stock_locations');
      console.log('🗑️  Tous les emplacements de stock ont été supprimés');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des emplacements:', error.message);
      throw error;
    }
  }

  /**
   * Réinitialiser et recréer les emplacements
   */
  async refresh() {
    await this.truncate();
    await this.run();
  }
}

// Exécution directe
if (require.main === module) {
  const seeder = new SeedStockLocation();
  seeder.run()
    .then(() => {
      console.log('🎉 Seeder des emplacements exécuté avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = SeedStockLocation;