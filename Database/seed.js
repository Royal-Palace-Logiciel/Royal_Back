// Database/seed.js
const SeedUser = require('./seedUser');
const SeedCategory = require('./SeedCategories');
const SeedStockLocation = require('./seedStockLocation');
const SeedUnit = require('./seedUnit');
const SeedProductType = require('./seedProductType');
const SeedProducts = require('./seedProducts');
const SeedQuintanaSkyDrinks = require('./seedQuintanaSkyDrinks');
const SeedQuintanaSkyProducts = require('./Seedquintanaskyproducts');
const SeedBillardExtras = require('./seedBillardExtras');
const SeedBottleExtras = require('./seedBottleExtras');
const SeedRestaurantIngredients = require('./seedRestaurantIngredients');

/**
 * Script principal pour exécuter tous les seeders
 */
async function runAllSeeders() {
  console.log('🌱 Démarrage des seeders...\n');

  try {
    // 1. Seeder des utilisateurs
    const seedUser = new SeedUser();
    await seedUser.run();

    // 2. Seeder des catégories
    const seedCategory = new SeedCategory();
    await seedCategory.run();

    // 3. Seeder des emplacements de stock
    const seedStockLocation = new SeedStockLocation();
    await seedStockLocation.run();

    // 4. Seeder des unités
    const seedUnit = new SeedUnit();
    await seedUnit.run();

    // 5. Seeder des types de produits
    const seedProductType = new SeedProductType();
    await seedProductType.run();

    // 6. Seeder des produits génériques
    const seedProducts = new SeedProducts();
    await seedProducts.run();

    // 7. Seeder des boissons Quintana Sky (Bar)
    const seedBarProducts = new SeedQuintanaSkyDrinks();
    await seedBarProducts.run();

    // 8. Seeder des produits Quintana Sky (Restaurant)
    const seedRestaurantProducts = new SeedQuintanaSkyProducts();
    await seedRestaurantProducts.run();

    // 9. Seeder des extras Billard
    await SeedBillardExtras();

    // 10. Seeder des extras Bouteille
    await SeedBottleExtras();

    // 11. Seeder des ingrédients du restaurant
    const seedIngredients = new SeedRestaurantIngredients();
    await seedIngredients.run();

    console.log('\n🎉 Tous les seeders ont été exécutés avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'exécution des seeders:', error.message);
    process.exit(1);
  }
}

// Exécuter si le fichier est appelé directement
if (require.main === module) {
  runAllSeeders();
}

module.exports = { runAllSeeders };