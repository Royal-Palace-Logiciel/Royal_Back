// Database/seedProducts.js
const { pool } = require('../config/db');

/**
 * Seeder pour la table products
 */
class SeedProducts {
  
  /**
   * Liste des produits à insérer
   */
  getItems() {
    return [
      { id: 1, category_id: 9, code: 'EAU_MIN_50', nom: 'Eau minérale 50cl', unite: 'Bouteille', prix_achat: 500, prix_vente: 1000, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 2, category_id: 9, code: 'EAU_MIN_100', nom: 'Eau minérale 1L', unite: 'Bouteille', prix_achat: 700, prix_vente: 1500, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 3, category_id: 10, code: 'BIERE_BL_33', nom: 'Bière blonde 33cl', unite: 'Bouteille', prix_achat: 1000, prix_vente: 2500, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 4, category_id: 10, code: 'BIERE_BR_33', nom: 'Bière brune 33cl', unite: 'Bouteille', prix_achat: 1200, prix_vente: 3000, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 5, category_id: 10, code: 'VIN_ROU_75', nom: 'Vin rouge 75cl', unite: 'Bouteille', prix_achat: 3000, prix_vente: 8000, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 6, category_id: 10, code: 'VIN_BLA_75', nom: 'Vin blanc 75cl', unite: 'Bouteille', prix_achat: 3000, prix_vente: 8000, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 7, category_id: 10, code: 'CHAMP_75', nom: 'Champagne 75cl', unite: 'Bouteille', prix_achat: 8000, prix_vente: 20000, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 8, category_id: 9, code: 'COLA_33', nom: 'Cola 33cl', unite: 'Canette', prix_achat: 400, prix_vente: 1000, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 9, category_id: 9, code: 'ORANGE_33', nom: 'Jus d\'orange 33cl', unite: 'Canette', prix_achat: 500, prix_vente: 1200, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 10, category_id: 11, code: 'CHOCLAT', nom: 'Chocolat', unite: 'Barre', prix_achat: 300, prix_vente: 800, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 11, category_id: 11, code: 'BISCUIT', nom: 'Biscuits assortis', unite: 'Paquet', prix_achat: 400, prix_vente: 1000, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 12, category_id: 11, code: 'NOIX', nom: 'Fruits secs assortis', unite: 'Sachet', prix_achat: 600, prix_vente: 1500, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 13, category_id: 9, code: 'CAFE_INST', nom: 'Café instantané', unite: 'Sachet', prix_achat: 200, prix_vente: 500, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 14, category_id: 9, code: 'THE_VERT', nom: 'Thé vert', unite: 'Sachet', prix_achat: 200, prix_vente: 500, actif: 1, type_produit: 'CONSOMMABLE' },
      { id: 15, category_id: 10, code: 'WHISKY', nom: 'Whisky', unite: 'Bouteille', prix_achat: 5000, prix_vente: 15000, actif: 1, type_produit: 'CONSOMMABLE' },
    ];
  }

  /**
   * Exécuter le seeder
   */
  async run() {
    try {
      console.log('🚀 Début du seeder des produits...');

      const items = this.getItems();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of items) {
        // Vérifier si le produit existe déjà (par ID)
        const [existing] = await pool.query(
          'SELECT id FROM products WHERE id = ?',
          [item.id]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Produit déjà existant: ${item.nom} (id ${item.id}) – ignoré`);
          skippedCount++;
          continue;
        }

        // Insérer le produit
        await pool.query(
          'INSERT INTO products (id, category_id, code, nom, unite, prix_achat, prix_vente, actif, type_produit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [item.id, item.category_id, item.code, item.nom, item.unite, item.prix_achat, item.prix_vente, item.actif, item.type_produit]
        );

        console.log(`✅ Produit créé: ${item.nom} (id ${item.id})`);
        insertedCount++;
      }

      console.log(`\n📊 Résumé du seeder des produits:`);
      console.log(`   ✅ ${insertedCount} produit(s) créé(s)`);
      console.log(`   ⏭️  ${skippedCount} produit(s) déjà existant(s)`);
      console.log(`   📋 Total: ${items.length} produit(s)`);
      
      console.log('✅ Seeder des produits terminé !\n');

    } catch (error) {
      console.error('❌ Erreur lors du seeder des produits:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer tous les produits
   */
  async truncate() {
    try {
      await pool.query('DELETE FROM products');
      console.log('🗑️  Tous les produits ont été supprimés');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des produits:', error.message);
      throw error;
    }
  }

  /**
   * Réinitialiser et recréer les produits
   */
  async refresh() {
    await this.truncate();
    await this.run();
  }
}

// Exécution directe
if (require.main === module) {
  const seeder = new SeedProducts();
  seeder.run()
    .then(() => {
      console.log('🎉 Seeder des produits exécuté avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = SeedProducts;
