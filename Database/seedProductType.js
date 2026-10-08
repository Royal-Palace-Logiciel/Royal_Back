// Database/seedProductType.js
const { pool } = require('../config/db');

/**
 * Seeder pour la table product_types
 */
class SeedProductType {
  
  /**
   * Liste des types de produits à insérer
   */
  getItems() {
    return [
      {
        nom: 'MATIERE_PREMIERE',
        description: 'Produits utilisés pour préparer les recettes'
      },
      {
        nom: 'PRODUIT_FINI',
        description: 'Produits prêts à être vendus'
      },
      {
        nom: 'BOISSON',
        description: 'Boissons alcoolisées et non alcoolisées'
      },
      {
        nom: 'CONSOMMABLE',
        description: 'Produits consommables non alimentaires'
      },
      {
        nom: 'EMBALLAGE',
        description: 'Boîtes, sacs, cartons, emballages'
      },
      {
        nom: 'SERVICE',
        description: 'Prestations de service'
      }
    ];
  }

  /**
   * Exécuter le seeder
   */
  async run() {
    try {
      console.log('🚀 Début du seeder des types de produits...');

      const items = this.getItems();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of items) {
        // Vérifier si le type existe déjà par son nom (unique)
        const [existing] = await pool.query(
          'SELECT id FROM product_types WHERE nom = ?',
          [item.nom]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Type de produit déjà existant: ${item.nom} – ignoré`);
          skippedCount++;
          continue;
        }

        // Insérer le type (l'ID sera auto-généré)
        await pool.query(
          'INSERT INTO product_types (nom, description) VALUES (?, ?)',
          [item.nom, item.description]
        );

        console.log(`✅ Type de produit créé: ${item.nom}`);
        insertedCount++;
      }

      console.log(`\n📊 Résumé du seeder des types de produits:`);
      console.log(`   ✅ ${insertedCount} type(s) créé(s)`);
      console.log(`   ⏭️  ${skippedCount} type(s) déjà existant(s)`);
      console.log(`   📋 Total: ${items.length} type(s)`);
      
      console.log('✅ Seeder des types de produits terminé !\n');

    } catch (error) {
      console.error('❌ Erreur lors du seeder des types de produits:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer tous les types de produits
   */
  async truncate() {
    try {
      await pool.query('DELETE FROM product_types');
      console.log('🗑️  Tous les types de produits ont été supprimés');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des types de produits:', error.message);
      throw error;
    }
  }

  /**
   * Réinitialiser et recréer les types de produits
   */
  async refresh() {
    await this.truncate();
    await this.run();
  }
}

// Exécution directe
if (require.main === module) {
  const seeder = new SeedProductType();
  seeder.run()
    .then(() => {
      console.log('🎉 Seeder des types de produits exécuté avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = SeedProductType;