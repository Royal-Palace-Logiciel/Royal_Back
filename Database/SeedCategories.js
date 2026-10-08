// Database/seedCategory.js
const { pool } = require('../config/db');

/**
 * Seeder pour la table categories
 */
class SeedCategory {
  
  /**
   * Liste des catégories à insérer
   */
  getItems() {
    return [
      { id: 1, nom: 'Viandes' },
      { id: 2, nom: 'Poissons & Fruits de mer' },
      { id: 3, nom: 'Légumes' },
      { id: 4, nom: 'Fruits' },
      { id: 5, nom: 'Produits laitiers' },
      { id: 6, nom: 'Céréales & Farines' },
      { id: 7, nom: 'Épices & Condiments' },
      { id: 8, nom: 'Huiles & Graisses' },
      { id: 9, nom: 'Boissons non alcoolisées' },
      { id: 10, nom: 'Boissons alcoolisées' },
      { id: 11, nom: 'Desserts' },
      { id: 12, nom: 'Produits surgelés' },
      { id: 13, nom: "Produits d'entretien" },
      { id: 14, nom: 'Consommables' },
      { id: 15, nom: 'Plats cuisinés' }
    ];
  }

  /**
   * Exécuter le seeder
   */
  async run() {
    try {
      console.log('🚀 Début du seeder des catégories...');

      const items = this.getItems();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of items) {
        // Vérifier si la catégorie existe déjà (par ID)
        const [existing] = await pool.query(
          'SELECT id FROM categories WHERE id = ?',
          [item.id]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Catégorie déjà existante: ${item.nom} (id ${item.id}) – ignorée`);
          skippedCount++;
          continue;
        }

        // Insérer la catégorie
        await pool.query(
          'INSERT INTO categories (id, nom) VALUES (?, ?)',
          [item.id, item.nom]
        );

        console.log(`✅ Catégorie créée: ${item.nom} (id ${item.id})`);
        insertedCount++;
      }

      console.log(`\n📊 Résumé du seeder des catégories:`);
      console.log(`   ✅ ${insertedCount} catégorie(s) créée(s)`);
      console.log(`   ⏭️  ${skippedCount} catégorie(s) déjà existante(s)`);
      console.log(`   📋 Total: ${items.length} catégorie(s)`);
      
      console.log('✅ Seeder des catégories terminé !\n');

    } catch (error) {
      console.error('❌ Erreur lors du seeder des catégories:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer toutes les catégories
   */
  async truncate() {
    try {
      await pool.query('DELETE FROM categories');
      console.log('🗑️  Toutes les catégories ont été supprimées');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des catégories:', error.message);
      throw error;
    }
  }

  /**
   * Réinitialiser et recréer les catégories
   */
  async refresh() {
    await this.truncate();
    await this.run();
  }
}

// Exécution directe
if (require.main === module) {
  const seeder = new SeedCategory();
  seeder.run()
    .then(() => {
      console.log('🎉 Seeder des catégories exécuté avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = SeedCategory;