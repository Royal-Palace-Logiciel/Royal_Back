// Database/SeedBarProducts.js
const { pool } = require('../config/db');

/**
 * Seeder pour la table bar_products
 */
class SeedBarProducts {
  
  /**
   * Liste des produits à insérer
   */
  getItems() {
    return [
      // --- BOISSONS SOFT --- (Alcool = 0)
      { nom: 'BBA GM 100 CL', categorie: 'Softs', alcool: 0 },
      { nom: 'BBA PM', categorie: 'Softs', alcool: 0 },
      { nom: 'COCA 30 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'COCA GM 100 CL', categorie: 'Softs', alcool: 0 },
      { nom: 'WORD COLA PM', categorie: 'Softs', alcool: 0 },
      { nom: 'WORD COLA GM', categorie: 'Softs', alcool: 0 },
      { nom: 'CRISTAL PM 50 CL', categorie: 'Softs', alcool: 0 },
      { nom: 'EAU VIVE GM 100 CL', categorie: 'Softs', alcool: 0 },
      { nom: 'EAU VIVE PM 50 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'CAPRICE SODA', categorie: 'Softs', alcool: 0 },
      { nom: 'CAPRICE GRENADINE', categorie: 'Softs', alcool: 0 },
      { nom: 'GOLD BLANCHE 33 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'GOLD BLANCHE 50 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'GOLD NORMALE 50 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'THB GM 65 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'THB PM 33 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'HEINEKEN 33 CL', categorie: 'Softs', alcool: 0 },
      { nom: 'BEAUFORT 33 CL', categorie: 'Softs', alcool: 0 },
      { nom: 'RANOVISY 33 cl', categorie: 'Softs', alcool: 0 },
      { nom: 'YOUZOU 100cl', categorie: 'Softs', alcool: 0 },
      { nom: 'SIROP DE FRAISE', categorie: 'Softs', alcool: 0 },
      { nom: 'SIROP DE GRENADINE', categorie: 'Softs', alcool: 0 },
      { nom: 'SIROP DE MENTHE', categorie: 'Softs', alcool: 0 },
      { nom: 'SUCRE DE CANNE 1 L', categorie: 'Softs', alcool: 0 },
      { nom: 'REDBULL', categorie: 'Softs', alcool: 0 },
      { nom: 'XXL', categorie: 'Softs', alcool: 0 },
      { nom: 'TONIC PM', categorie: 'Softs', alcool: 0 },
      { nom: 'TONIC GM', categorie: 'Softs', alcool: 0 },
      { nom: 'BOOSTER APPLE MIX', categorie: 'Softs', alcool: 0 },
      { nom: 'BOOSTER TORNADO', categorie: 'Softs', alcool: 0 },

      // --- DIVERS / ACCESSOIRES --- (Alcool = 0)
      { nom: "GIN GORDON'S", categorie: 'Divers', alcool: 0 }, // Note: Gin est de l'alcool, mais si c'est pour le retour de bouteille/accessoire on met 0, sinon 1. Ici je le mets en accessoire.
      { nom: 'AVOIRS BOUTEILLE VIDE 30/33cl', categorie: 'Divers', alcool: 0 },
      { nom: 'AVOIRS BOUTEILLE VIDE 50/65cl', categorie: 'Divers', alcool: 0 },
      { nom: 'AVOIRS BOUTEILLE VIDE 100cl', categorie: 'Divers', alcool: 0 },
      { nom: 'AVOIRS BOUTEILLE SODEAM 100cl', categorie: 'Divers', alcool: 0 },
      { nom: 'AVOIRS BOUTEILLE RANOVISY', categorie: 'Divers', alcool: 0 },
      { nom: 'CAGEOT DE 12', categorie: 'Divers', alcool: 0 },
      { nom: 'CAGEOT DE 20', categorie: 'Divers', alcool: 0 },
      { nom: 'CAGEOT DE 24', categorie: 'Divers', alcool: 0 },
      { nom: 'CAGEOT RANOVISY', categorie: 'Divers', alcool: 0 },
      { nom: 'PARFUM SHISHA', categorie: 'Divers', alcool: 0 },
      { nom: 'CHARBON SHISHA', categorie: 'Divers', alcool: 0 },

      // --- BOISSONS (SPIRITUEUX) --- (Alcool = 1)
      { nom: 'CAZANOVE 1 L', categorie: 'Alcools', alcool: 1 },
      { nom: 'VODKA PRISKAIA', categorie: 'Alcools', alcool: 1 },
      { nom: 'TEQUILA VICTORIA', categorie: 'Alcools', alcool: 1 },
      { nom: 'MANGUSTAN', categorie: 'Alcools', alcool: 1 },
      { nom: 'TEQUILA MUNICION 70 CL', categorie: 'Alcools', alcool: 1 },
      { nom: 'CUVEE BLANCHE DZAMA', categorie: 'Alcools', alcool: 1 },
      { nom: 'DZAMA CUVEE PRESTIGE', categorie: 'Alcools', alcool: 1 },
      { nom: 'DZAMA CUVEE NOIR', categorie: 'Alcools', alcool: 1 },

      // --- VINS PM et CUBI --- (Alcool = 1)
      { nom: 'PETIT VIN 18,7 CL (BLANC)', categorie: 'Vins', alcool: 1 },
      { nom: 'PETIT VIN 18,7 CL (ROUGE)', categorie: 'Vins', alcool: 1 },
      { nom: 'CUBI BLANC', categorie: 'Vins', alcool: 1 },
      { nom: 'CUBI ROUGE', categorie: 'Vins', alcool: 1 },

      // --- VINS BOUTEILLE --- (Alcool = 1)
      { nom: 'SATYRICON', categorie: 'Vins', alcool: 1 },
      { nom: 'CUVEE DE L\'AUBA DE (COTE DE PROVENCE 2015)', categorie: 'Vins', alcool: 1 },
      { nom: 'TOURAINE PINOT NOIR', categorie: 'Vins', alcool: 1 },
      { nom: 'GABARDES (CH. AUZIAS 2009)', categorie: 'Vins', alcool: 1 },
      { nom: 'LES FONCANELLES', categorie: 'Vins', alcool: 1 },
      { nom: 'MOULINS DE CITRAN (HAUT MEDOC 2017)', categorie: 'Vins', alcool: 1 },
      { nom: 'CH. LETAILLANET (MEDOC 2012)', categorie: 'Vins', alcool: 1 },
      { nom: 'LA VIERGE PINOT NOIR (2011)', categorie: 'Vins', alcool: 1 },
      { nom: 'CARDINALICES (COTE DU RHONE 2005)', categorie: 'Vins', alcool: 1 },
      { nom: 'LAZO CABERNET SAUVIGNON (2016)', categorie: 'Vins', alcool: 1 },
      { nom: 'CH ST CLOTILDE (2010)', categorie: 'Vins', alcool: 1 },
      { nom: 'VERSUS RED', categorie: 'Vins', alcool: 1 },
      { nom: 'DOMAINE AUZIAS (2011)', categorie: 'Vins', alcool: 1 },
      { nom: 'SUNNINGHILL', categorie: 'Vins', alcool: 1 },
      { nom: 'LAZO CHARDONNAY', categorie: 'Vins', alcool: 1 },
      { nom: 'GEWUERZTRAMINER (VIN D\'ALSACE 2016)', categorie: 'Vins', alcool: 1 },
      { nom: 'BOURGOGNE (LOUIS JADOT)', categorie: 'Vins', alcool: 1 },
      { nom: 'LOUPIAC (DOM. BOIS DE ROCHE 2014)', categorie: 'Vins', alcool: 1 },
      { nom: 'RIESELING (2016)', categorie: 'Vins', alcool: 1 },
      { nom: 'CROIX ST SALVY (GAILLAC 2017)', categorie: 'Vins', alcool: 1 },
      { nom: 'PROTEA ROSE', categorie: 'Vins', alcool: 1 },
      { nom: 'MEDAILLON ROSE', categorie: 'Vins', alcool: 1 },

      // --- CHAMPAGNE / VIN MOUSSEUX --- (Alcool = 1)
      { nom: 'CUVEE BRUT ( LAURENT PERRIER )', categorie: 'Champagne', alcool: 1 },
      { nom: 'DELAHAIE', categorie: 'Champagne', alcool: 1 },
      { nom: 'LANSON BRUT', categorie: 'Champagne', alcool: 1 },
      { nom: 'CHAPAGNE TD', categorie: 'Champagne', alcool: 1 },
      { nom: 'ROSE BERTELETTI', categorie: 'Champagne', alcool: 1 },
      { nom: 'LES DIEUX CHARDONAI', categorie: 'Champagne', alcool: 1 },
      { nom: 'MAGUIS ROBIATAILLES', categorie: 'Champagne', alcool: 1 },
      { nom: 'PLATINIUM LABEL', categorie: 'Champagne', alcool: 1 }
    ];
  }

  /**
   * Exécuter le seeder
   */
  async run() {
    try {
      console.log('🚀 Début du seeder des produits du Bar...');

      const items = this.getItems();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of items) {
        // Vérifier si le produit existe déjà (par nom)
        const [existing] = await pool.query(
          'SELECT id FROM bar_products WHERE nom = ?',
          [item.nom]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Produit déjà existant: ${item.nom} – ignoré`);
          skippedCount++;
          continue;
        }

        // Insérer le produit
        await pool.query(
          `INSERT INTO bar_products 
          (nom, ingredients, prix, categorie, alcool, type_produit, source_module, created_at) 
          VALUES (?, NULL, 0.00, ?, ?, 'PRODUIT_FINI', 'BAR', CURRENT_TIMESTAMP)`,
          [item.nom, item.categorie, item.alcool]
        );

        console.log(`✅ Produit créé: ${item.nom} (Cat: ${item.categorie})`);
        insertedCount++;
      }

      console.log(`\n📊 Résumé du seeder des produits du Bar:`);
      console.log(`   ✅ ${insertedCount} produit(s) créé(s)`);
      console.log(`   ⏭️  ${skippedCount} produit(s) déjà existant(s)`);
      console.log(`   📋 Total: ${items.length} produit(s)`);
      
      console.log('✅ Seeder des produits du Bar terminé !\n');

    } catch (error) {
      console.error('❌ Erreur lors du seeder des produits du Bar:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer tous les produits
   */
  async truncate() {
    try {
      await pool.query('DELETE FROM bar_products');
      console.log('🗑️  Tous les produits du Bar ont été supprimés');
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
  const seeder = new SeedBarProducts();
  seeder.run()
    .then(() => {
      console.log('🎉 Seeder des produits du Bar exécuté avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = SeedBarProducts;