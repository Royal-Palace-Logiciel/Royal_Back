// Database/seedUnit.js
const { pool } = require('../config/db');

/**
 * Seeder pour la table units
 */
class SeedUnit {
  
  /**
   * Liste des unités à insérer
   */
  getItems() {
    return [
      { id: 1, code: 'KG', nom: 'Kilogrammes' },
      { id: 2, code: 'G', nom: 'Grammes' },
      { id: 3, code: 'L', nom: 'Litre' },
      { id: 4, code: 'CL', nom: 'Centilitre' },
      { id: 5, code: 'ML', nom: 'Mililitre' },
      { id: 6, code: 'PIECE', nom: 'Pièce' },
      { id: 7, code: 'PORTION', nom: 'Portion' },
      { id: 8, code: 'BOUTEILLE', nom: 'Bouteille' },
      { id: 9, code: 'BOITE', nom: 'Boite' },
      { id: 10, code: 'SACHET', nom: 'Sachet' }
    ];
  }

  /**
   * Exécuter le seeder
   */
  async run() {
    try {
      console.log('🚀 Début du seeder des unités...');

      const items = this.getItems();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of items) {
        // Vérifier si l'unité existe déjà (par ID)
        const [existing] = await pool.query(
          'SELECT id FROM units WHERE id = ?',
          [item.id]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Unité déjà existante: ${item.nom} (id ${item.id}) – ignorée`);
          skippedCount++;
          continue;
        }

        // Insérer l'unité
        await pool.query(
          'INSERT INTO units (id, code, nom) VALUES (?, ?, ?)',
          [item.id, item.code, item.nom]
        );

        console.log(`✅ Unité créée: ${item.nom} (id ${item.id})`);
        insertedCount++;
      }

      console.log(`\n📊 Résumé du seeder des unités:`);
      console.log(`   ✅ ${insertedCount} unité(s) créée(s)`);
      console.log(`   ⏭️  ${skippedCount} unité(s) déjà existante(s)`);
      console.log(`   📋 Total: ${items.length} unité(s)`);
      
      console.log('✅ Seeder des unités terminé !\n');

    } catch (error) {
      console.error('❌ Erreur lors du seeder des unités:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer toutes les unités
   */
  async truncate() {
    try {
      await pool.query('DELETE FROM units');
      console.log('🗑️  Toutes les unités ont été supprimées');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des unités:', error.message);
      throw error;
    }
  }

  /**
   * Réinitialiser et recréer les unités
   */
  async refresh() {
    await this.truncate();
    await this.run();
  }
}

// Exécution directe
if (require.main === module) {
  const seeder = new SeedUnit();
  seeder.run()
    .then(() => {
      console.log('🎉 Seeder des unités exécuté avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = SeedUnit;