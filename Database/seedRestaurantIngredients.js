// Database/seedRestaurantIngredients.js
const { pool } = require('../config/db');

/**
 * Seeder pour créer les ingrédients et les recettes pour les produits du restaurant
 * Établit la relation entre Menu-Restaurant et Stock-Restaurant
 */
class SeedRestaurantIngredients {
    async run() {
        try {
            console.log('🚀 Début du seeder des ingrédients du restaurant...');

            // 1. Créer les catégories d'ingrédients si elles n'existent pas
            const ingredientCategories = [
                'Viandes (Ingrédients)', 'Légumes', 'Fruits', 'Produits laitiers', 
                'Épices & Condiments', 'Céréales', 'Huiles', 'Autres'
            ];

            const categoryIds = {};
            for (const catName of ingredientCategories) {
                const [existing] = await pool.query(
                    'SELECT id FROM categories WHERE nom = ? LIMIT 1',
                    [catName]
                );
                if (existing.length > 0) {
                    categoryIds[catName] = existing[0].id;
                } else {
                    const [result] = await pool.query(
                        'INSERT INTO categories (nom) VALUES (?)',
                        [catName]
                    );
                    categoryIds[catName] = result.insertId;
                    console.log(`📂 Catégorie ingrédient créée: ${catName}`);
                }
            }

            // 2. Définir les ingrédients pour chaque type de produit
            const ingredients = [
                // Viandes
                { nom: 'Poulet', code: 'ING_POULET', category: 'Viandes (Ingrédients)', unite: 'kg', prix_achat: 8000, default_stock: 20 },
                { nom: 'Bœuf', code: 'ING_BOEUF', category: 'Viandes (Ingrédients)', unite: 'kg', prix_achat: 12000, default_stock: 15 },
                { nom: 'Mouton', code: 'ING_MOUTON', category: 'Viandes (Ingrédients)', unite: 'kg', prix_achat: 15000, default_stock: 10 },
                { nom: 'Crevettes', code: 'ING_CREVETTES', category: 'Viandes (Ingrédients)', unite: 'kg', prix_achat: 18000, default_stock: 8 },
                { nom: 'Porc', code: 'ING_PORC', category: 'Viandes (Ingrédients)', unite: 'kg', prix_achat: 10000, default_stock: 12 },

                // Légumes
                { nom: 'Oignons', code: 'ING_OIGNONS', category: 'Légumes', unite: 'kg', prix_achat: 2000, default_stock: 30 },
                { nom: 'Tomates', code: 'ING_TOMATES', category: 'Légumes', unite: 'kg', prix_achat: 3000, default_stock: 25 },
                { nom: 'Ail', code: 'ING_AIL', category: 'Légumes', unite: 'kg', prix_achat: 5000, default_stock: 5 },
                { nom: 'Gingembre', code: 'ING_GINGEMBRE', category: 'Légumes', unite: 'kg', prix_achat: 6000, default_stock: 5 },
                { nom: 'Pommes de terre', code: 'ING_POMMES_DE_TERRE', category: 'Légumes', unite: 'kg', prix_achat: 1500, default_stock: 40 },
                { nom: 'Carottes', code: 'ING_CAROTTES', category: 'Légumes', unite: 'kg', prix_achat: 2000, default_stock: 20 },
                { nom: 'Poivrons', code: 'ING_POIVRONS', category: 'Légumes', unite: 'kg', prix_achat: 4000, default_stock: 15 },
                { nom: 'Champignons', code: 'ING_CHAMPIGNONS', category: 'Légumes', unite: 'kg', prix_achat: 8000, default_stock: 10 },
                { nom: 'Épinards', code: 'ING_EPINARDS', category: 'Légumes', unite: 'kg', prix_achat: 3000, default_stock: 15 },
                { nom: 'Okra', code: 'ING_OKRA', category: 'Légumes', unite: 'kg', prix_achat: 3500, default_stock: 12 },

                // Fruits
                { nom: 'Citrons', code: 'ING_CITRONS', category: 'Fruits', unite: 'kg', prix_achat: 4000, default_stock: 20 },
                { nom: 'Mangues', code: 'ING_MANGUES', category: 'Fruits', unite: 'kg', prix_achat: 5000, default_stock: 15 },

                // Produits laitiers
                { nom: 'Lait', code: 'ING_LAIT', category: 'Produits laitiers', unite: 'L', prix_achat: 2000, default_stock: 30 },
                { nom: 'Beurre', code: 'ING_BEURRE', category: 'Produits laitiers', unite: 'kg', prix_achat: 8000, default_stock: 10 },
                { nom: 'Fromage', code: 'ING_FROMAGE', category: 'Produits laitiers', unite: 'kg', prix_achat: 15000, default_stock: 8 },
                { nom: 'Crème', code: 'ING_CREME', category: 'Produits laitiers', unite: 'L', prix_achat: 4000, default_stock: 15 },
                { nom: 'Paneer', code: 'ING_PANEER', category: 'Produits laitiers', unite: 'kg', prix_achat: 12000, default_stock: 12 },

                // Épices & Condiments
                { nom: 'Curry en poudre', code: 'ING_CURRY', category: 'Épices & Condiments', unite: 'kg', prix_achat: 10000, default_stock: 5 },
                { nom: 'Cumin', code: 'ING_CUMIN', category: 'Épices & Condiments', unite: 'kg', prix_achat: 12000, default_stock: 3 },
                { nom: 'Coriandre', code: 'ING_CORIANDRE', category: 'Épices & Condiments', unite: 'kg', prix_achat: 8000, default_stock: 4 },
                { nom: 'Poudre de chili', code: 'ING_CHILI', category: 'Épices & Condiments', unite: 'kg', prix_achat: 9000, default_stock: 3 },
                { nom: 'Turmeric', code: 'ING_TURMERIC', category: 'Épices & Condiments', unite: 'kg', prix_achat: 7000, default_stock: 4 },
                { nom: 'Garam Masala', code: 'ING_GARAM', category: 'Épices & Condiments', unite: 'kg', prix_achat: 15000, default_stock: 3 },
                { nom: 'Sel', code: 'ING_SEL', category: 'Épices & Condiments', unite: 'kg', prix_achat: 1000, default_stock: 20 },
                { nom: 'Poivre', code: 'ING_POIVRE', category: 'Épices & Condiments', unite: 'kg', prix_achat: 8000, default_stock: 5 },

                // Céréales
                { nom: 'Riz Basmati', code: 'ING_RIZ', category: 'Céréales', unite: 'kg', prix_achat: 5000, default_stock: 50 },
                { nom: 'Farine', code: 'ING_FARINE', category: 'Céréales', unite: 'kg', prix_achat: 3000, default_stock: 30 },
                { nom: 'Pâtes', code: 'ING_PATES', category: 'Céréales', unite: 'kg', prix_achat: 4000, default_stock: 25 },
                { nom: 'Nouilles', code: 'ING_NOUILLES', category: 'Céréales', unite: 'kg', prix_achat: 6000, default_stock: 20 },

                // Huiles
                { nom: 'Huile végétale', code: 'ING_HUILE', category: 'Huiles', unite: 'L', prix_achat: 8000, default_stock: 20 },
                { nom: 'Huile d\'olive', code: 'ING_HUILE_OLIVE', category: 'Huiles', unite: 'L', prix_achat: 25000, default_stock: 10 },

                // Autres
                { nom: 'Sauce tomate', code: 'ING_SAUCE_TOMATE', category: 'Autres', unite: 'L', prix_achat: 5000, default_stock: 15 },
                { nom: 'Sauce soja', code: 'ING_SAUCE_SOJA', category: 'Autres', unite: 'L', prix_achat: 6000, default_stock: 10 },
                { nom: 'Œufs', code: 'ING_OEUF', category: 'Autres', unite: 'pièce', prix_achat: 500, default_stock: 100 },
                { nom: 'Pain', code: 'ING_PAIN', category: 'Autres', unite: 'pièce', prix_achat: 2000, default_stock: 50 },
                { nom: 'Levure', code: 'ING_LEVURE', category: 'Autres', unite: 'kg', prix_achat: 8000, default_stock: 5 },
            ];

            // 3. Créer les produits ingrédients
            const ingredientIds = {};
            let createdIngredients = 0;
            let updatedIngredients = 0;

            for (const ing of ingredients) {
                const [existing] = await pool.query(
                    'SELECT id FROM products WHERE code = ? LIMIT 1',
                    [ing.code]
                );

                if (existing.length > 0) {
                    ingredientIds[ing.code] = existing[0].id;
                    await pool.query(
                        `UPDATE products 
                         SET nom = ?, category_id = ?, unite = ?, prix_achat = ?, type_produit = 'MATIERE_PREMIERE', actif = 1
                         WHERE id = ?`,
                        [ing.nom, categoryIds[ing.category], ing.unite, ing.prix_achat, existing[0].id]
                    );
                    updatedIngredients++;
                } else {
                    const [result] = await pool.query(
                        `INSERT INTO products (category_id, code, nom, unite, prix_achat, prix_vente, actif, type_produit)
                         VALUES (?, ?, ?, ?, ?, ?, 1, 'MATIERE_PREMIERE')`,
                        [categoryIds[ing.category], ing.code, ing.nom, ing.unite, ing.prix_achat, ing.prix_achat * 1.5]
                    );
                    ingredientIds[ing.code] = result.insertId;
                    createdIngredients++;
                }
            }

            console.log(`📦 Ingrédients: ${createdIngredients} créés, ${updatedIngredients} mis à jour`);

            // 4. Créer le stock pour les ingrédients dans le Restaurant (location_id = 2)
            const restaurantLocationId = 2;
            let stockCreated = 0;
            let stockUpdated = 0;

            for (const ing of ingredients) {
                const productId = ingredientIds[ing.code];
                const [existingStock] = await pool.query(
                    'SELECT id FROM stocks WHERE product_id = ? AND location_id = ?',
                    [productId, restaurantLocationId]
                );

                if (existingStock.length > 0) {
                    await pool.query(
                        'UPDATE stocks SET quantite = ? WHERE id = ?',
                        [ing.default_stock, existingStock[0].id]
                    );
                    stockUpdated++;
                } else {
                    await pool.query(
                        'INSERT INTO stocks (product_id, location_id, quantite) VALUES (?, ?, ?)',
                        [productId, restaurantLocationId, ing.default_stock]
                    );
                    stockCreated++;
                }
            }

            console.log(`📊 Stock restaurant: ${stockCreated} créés, ${stockUpdated} mis à jour`);

            // 5. Définir les recettes pour les produits du menu
            const recipes = [
                // Pizzas
                { productCode: 'PIZZA_MARG_001', ingredients: [{ code: 'ING_SAUCE_TOMATE', qty: 0.1 }, { code: 'ING_FROMAGE', qty: 0.15 }, { code: 'ING_HUILE', qty: 0.02 }, { code: 'ING_PAIN', qty: 0.2 }] },
                { productCode: 'PIZZA_SAIS_002', ingredients: [{ code: 'ING_SAUCE_TOMATE', qty: 0.1 }, { code: 'ING_FROMAGE', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.05 }, { code: 'ING_POMMES_DE_TERRE', qty: 0.05 }, { code: 'ING_PAIN', qty: 0.2 }] },
                { productCode: 'PIZZA_FROM_003', ingredients: [{ code: 'ING_SAUCE_TOMATE', qty: 0.1 }, { code: 'ING_FROMAGE', qty: 0.25 }, { code: 'ING_HUILE', qty: 0.02 }, { code: 'ING_PAIN', qty: 0.2 }] },
                { productCode: 'PIZZA_NY_004', ingredients: [{ code: 'ING_SAUCE_TOMATE', qty: 0.1 }, { code: 'ING_FROMAGE', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.03 }, { code: 'ING_PAIN', qty: 0.2 }] },
                { productCode: 'PIZZA_FLO_005', ingredients: [{ code: 'ING_CREME', qty: 0.1 }, { code: 'ING_FROMAGE', qty: 0.2 }, { code: 'ING_CHAMPIGNONS', qty: 0.08 }, { code: 'ING_PAIN', qty: 0.2 }] },
                { productCode: 'PIZZA_MAR_006', ingredients: [{ code: 'ING_SAUCE_TOMATE', qty: 0.15 }, { code: 'ING_AIL', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.03 }, { code: 'ING_PAIN', qty: 0.2 }] },

                // Tapas
                { productCode: 'TAPAS_ZEBU_001', ingredients: [{ code: 'ING_BOEUF', qty: 0.15 }, { code: 'ING_PAIN', qty: 0.1 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_SAUCE_TOMATE', qty: 0.03 }] },
                { productCode: 'TAPAS_POU_002', ingredients: [{ code: 'ING_POULET', qty: 0.15 }, { code: 'ING_PAIN', qty: 0.1 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_SAUCE_TOMATE', qty: 0.03 }] },
                { productCode: 'TAPAS_BRO_003', ingredients: [{ code: 'ING_BOEUF', qty: 0.2 }, { code: 'ING_OIGNONS', qty: 0.03 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'TAPAS_PAN_004', ingredients: [{ code: 'ING_POULET', qty: 0.25 }, { code: 'ING_FARINE', qty: 0.1 }, { code: 'ING_HUILE', qty: 0.05 }] },

                // Quintana Sky - Entrées Indiennes
                { productCode: 'QSKY_APP_001', ingredients: [{ code: 'ING_POMMES_DE_TERRE', qty: 0.1 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_CURRY', qty: 0.01 }, { code: 'ING_HUILE', qty: 0.03 }] },
                { productCode: 'QSKY_APP_002', ingredients: [{ code: 'ING_POULET', qty: 0.1 }, { code: 'ING_POMMES_DE_TERRE', qty: 0.08 }, { code: 'ING_CURRY', qty: 0.01 }, { code: 'ING_HUILE', qty: 0.03 }] },
                { productCode: 'QSKY_APP_003', ingredients: [{ code: 'ING_POULET', qty: 0.15 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_APP_004', ingredients: [{ code: 'ING_POULET', qty: 0.2 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },

                // Quintana Sky - Rolls
                { productCode: 'QSKY_ROLL_001', ingredients: [{ code: 'ING_POULET', qty: 0.15 }, { code: 'ING_PAIN', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_SAUCE_TOMATE', qty: 0.03 }] },
                { productCode: 'QSKY_ROLL_002', ingredients: [{ code: 'ING_MOUTON', qty: 0.15 }, { code: 'ING_PAIN', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_CORIANDRE', qty: 0.01 }] },
                { productCode: 'QSKY_ROLL_003', ingredients: [{ code: 'ING_POULET', qty: 0.15 }, { code: 'ING_PAIN', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_CORIANDRE', qty: 0.01 }] },

                // Quintana Sky - Plats Indiens
                { productCode: 'QSKY_PLAT_001', ingredients: [{ code: 'ING_RIZ', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_TURMERIC', qty: 0.01 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_PLAT_002', ingredients: [{ code: 'ING_RIZ', qty: 0.15 }, { code: 'ING_PANEER', qty: 0.08 }, { code: 'ING_CREME', qty: 0.05 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_PLAT_003', ingredients: [{ code: 'ING_OKRA', qty: 0.12 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_CHILI', qty: 0.01 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_PLAT_004', ingredients: [{ code: 'ING_PANEER', qty: 0.12 }, { code: 'ING_POIVRONS', qty: 0.08 }, { code: 'ING_SAUCE_SOJA', qty: 0.03 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_PLAT_005', ingredients: [{ code: 'ING_PANEER', qty: 0.12 }, { code: 'ING_EPINARDS', qty: 0.1 }, { code: 'ING_CREME', qty: 0.05 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_PLAT_006', ingredients: [{ code: 'ING_MOUTON', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.03 }, { code: 'ING_GARAM', qty: 0.01 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_PLAT_007', ingredients: [{ code: 'ING_POULET', qty: 0.15 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_TOMATES', qty: 0.05 }, { code: 'ING_CREME', qty: 0.05 }] },
                { productCode: 'QSKY_PLAT_008', ingredients: [{ code: 'ING_POULET', qty: 0.15 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_TOMATES', qty: 0.05 }, { code: 'ING_CREME', qty: 0.05 }] },
                { productCode: 'QSKY_PLAT_009', ingredients: [{ code: 'ING_CREVETTES', qty: 0.15 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_TOMATES', qty: 0.05 }, { code: 'ING_CREME', qty: 0.05 }] },
                { productCode: 'QSKY_PLAT_010', ingredients: [{ code: 'ING_PANEER', qty: 0.12 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_TOMATES', qty: 0.05 }, { code: 'ING_CREME', qty: 0.08 }] },
                { productCode: 'QSKY_PLAT_011', ingredients: [{ code: 'ING_PANEER', qty: 0.12 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_TOMATES', qty: 0.05 }, { code: 'ING_CREME', qty: 0.08 }] },

                // Quintana Sky - Pains Indiens
                { productCode: 'QSKY_PAIN_001', ingredients: [{ code: 'ING_FARINE', qty: 0.08 }, { code: 'ING_HUILE', qty: 0.01 }, { code: 'ING_BEURRE', qty: 0.02 }] },
                { productCode: 'QSKY_PAIN_002', ingredients: [{ code: 'ING_FARINE', qty: 0.1 }, { code: 'ING_HUILE', qty: 0.01 }, { code: 'ING_LEVURE', qty: 0.005 }] },
                { productCode: 'QSKY_PAIN_003', ingredients: [{ code: 'ING_FARINE', qty: 0.1 }, { code: 'ING_HUILE', qty: 0.01 }, { code: 'ING_BEURRE', qty: 0.03 }] },
                { productCode: 'QSKY_PAIN_004', ingredients: [{ code: 'ING_FARINE', qty: 0.1 }, { code: 'ING_HUILE', qty: 0.01 }, { code: 'ING_AIL', qty: 0.01 }, { code: 'ING_BEURRE', qty: 0.03 }] },
                { productCode: 'QSKY_PAIN_005', ingredients: [{ code: 'ING_FARINE', qty: 0.1 }, { code: 'ING_HUILE', qty: 0.01 }, { code: 'ING_FROMAGE', qty: 0.03 }, { code: 'ING_BEURRE', qty: 0.02 }] },

                // Quintana Sky - Spécialités Chinoises
                { productCode: 'QSKY_CHIN_001', ingredients: [{ code: 'ING_NOUILLES', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_POIVRONS', qty: 0.05 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_CHIN_002', ingredients: [{ code: 'ING_RIZ', qty: 0.15 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_POIVRONS', qty: 0.05 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_CHIN_003', ingredients: [{ code: 'ING_RIZ', qty: 0.15 }, { code: 'ING_NOUILLES', qty: 0.05 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_SAUCE_SOJA', qty: 0.03 }] },
                { productCode: 'QSKY_CHIN_004', ingredients: [{ code: 'ING_NOUILLES', qty: 0.15 }, { code: 'ING_POULET', qty: 0.1 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_CHIN_005', ingredients: [{ code: 'ING_RIZ', qty: 0.15 }, { code: 'ING_POULET', qty: 0.1 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_CHIN_006', ingredients: [{ code: 'ING_RIZ', qty: 0.15 }, { code: 'ING_POULET', qty: 0.1 }, { code: 'ING_NOUILLES', qty: 0.05 }, { code: 'ING_SAUCE_SOJA', qty: 0.03 }] },
                { productCode: 'QSKY_CHIN_007', ingredients: [{ code: 'ING_NOUILLES', qty: 0.1 }, { code: 'ING_OIGNONS', qty: 0.03 }, { code: 'ING_SAUCE_SOJA', qty: 0.04 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_CHIN_008', ingredients: [{ code: 'ING_POMMES_DE_TERRE', qty: 0.15 }, { code: 'ING_CHILI', qty: 0.01 }, { code: 'ING_SAUCE_SOJA', qty: 0.03 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_CHIN_009', ingredients: [{ code: 'ING_PANEER', qty: 0.12 }, { code: 'ING_POIVRONS', qty: 0.08 }, { code: 'ING_SAUCE_SOJA', qty: 0.03 }, { code: 'ING_HUILE', qty: 0.02 }] },

                // Quintana Sky - Soupes
                { productCode: 'QSKY_SOUP_001', ingredients: [{ code: 'ING_POULET', qty: 0.08 }, { code: 'ING_RIZ', qty: 0.05 }, { code: 'ING_CREME', qty: 0.05 }] },
                { productCode: 'QSKY_SOUP_002', ingredients: [{ code: 'ING_POMMES_DE_TERRE', qty: 0.08 }, { code: 'ING_OIGNONS', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.01 }] },
                { productCode: 'QSKY_SOUP_003', ingredients: [{ code: 'ING_POULET', qty: 0.1 }, { code: 'ING_POMMES_DE_TERRE', qty: 0.05 }, { code: 'ING_OIGNONS', qty: 0.02 }] },

                // Quintana Sky - Riz & Biryani
                { productCode: 'QSKY_BIRY_001', ingredients: [{ code: 'ING_RIZ', qty: 0.2 }, { code: 'ING_HUILE', qty: 0.01 }] },
                { productCode: 'QSKY_BIRY_002', ingredients: [{ code: 'ING_RIZ', qty: 0.2 }, { code: 'ING_POULET', qty: 0.1 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_BIRY_003', ingredients: [{ code: 'ING_RIZ', qty: 0.2 }, { code: 'ING_OEUF', qty: 0.1 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_BIRY_004', ingredients: [{ code: 'ING_RIZ', qty: 0.2 }, { code: 'ING_OIGNONS', qty: 0.03 }, { code: 'ING_CAROTTES', qty: 0.03 }, { code: 'ING_CURRY', qty: 0.02 }] },
                { productCode: 'QSKY_BIRY_005', ingredients: [{ code: 'ING_RIZ', qty: 0.2 }, { code: 'ING_POULET', qty: 0.05 }, { code: 'ING_OEUF', qty: 0.05 }, { code: 'ING_CREVETTES', qty: 0.05 }] },
                { productCode: 'QSKY_BIRY_006', ingredients: [{ code: 'ING_RIZ', qty: 0.2 }, { code: 'ING_MOUTON', qty: 0.12 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },
                { productCode: 'QSKY_BIRY_007', ingredients: [{ code: 'ING_RIZ', qty: 0.2 }, { code: 'ING_CREVETTES', qty: 0.12 }, { code: 'ING_CURRY', qty: 0.02 }, { code: 'ING_HUILE', qty: 0.02 }] },
            ];

            // 6. Créer les recettes et leurs ingrédients
            let recipesCreated = 0;
            let recipesUpdated = 0;
            let recipeItemsCreated = 0;

            for (const recipe of recipes) {
                // Trouver le produit correspondant
                const [product] = await pool.query(
                    'SELECT id, nom FROM products WHERE code = ? LIMIT 1',
                    [recipe.productCode]
                );

                if (!product.length) {
                    console.log(`⚠️ Produit non trouvé: ${recipe.productCode}`);
                    continue;
                }

                const productId = product[0].id;
                const productName = product[0].nom;

                // Vérifier si une recette existe déjà
                const [existingRecipe] = await pool.query(
                    'SELECT id FROM recipes WHERE product_id = ?',
                    [productId]
                );

                let recipeId;

                if (existingRecipe.length > 0) {
                    recipeId = existingRecipe[0].id;
                    // Supprimer les anciens ingrédients de la recette
                    await pool.query('DELETE FROM recipe_items WHERE recipe_id = ?', [recipeId]);
                    await pool.query(
                        'UPDATE recipes SET nom = ? WHERE id = ?',
                        [`Recette: ${productName}`, recipeId]
                    );
                    recipesUpdated++;
                } else {
                    const [result] = await pool.query(
                        'INSERT INTO recipes (product_id, nom) VALUES (?, ?)',
                        [productId, `Recette: ${productName}`]
                    );
                    recipeId = result.insertId;
                    recipesCreated++;
                }

                // Ajouter les ingrédients de la recette
                for (const ing of recipe.ingredients) {
                    const ingredientId = ingredientIds[ing.code];
                    if (!ingredientId) {
                        console.log(`⚠️ Ingrédient non trouvé: ${ing.code}`);
                        continue;
                    }

                    await pool.query(
                        'INSERT INTO recipe_items (recipe_id, ingredient_id, quantite) VALUES (?, ?, ?)',
                        [recipeId, ingredientId, ing.qty]
                    );
                    recipeItemsCreated++;
                }
            }

            console.log(`🍽️ Recettes: ${recipesCreated} créées, ${recipesUpdated} mises à jour`);
            console.log(`📝 Items de recette: ${recipeItemsCreated} créés`);

            console.log('\n✅ Seeder des ingrédients du restaurant terminé avec succès !');
            console.log(`📊 Résumé:`);
            console.log(`   - Ingrédients: ${createdIngredients} créés, ${updatedIngredients} mis à jour`);
            console.log(`   - Stock: ${stockCreated} créés, ${stockUpdated} mis à jour`);
            console.log(`   - Recettes: ${recipesCreated} créées, ${recipesUpdated} mises à jour`);
            console.log(`   - Items de recette: ${recipeItemsCreated} créés`);

        } catch (error) {
            console.error('❌ Erreur lors du seeder des ingrédients:', error.message);
            throw error;
        }
    }
}

if (require.main === module) {
    const seeder = new SeedRestaurantIngredients();
    seeder.run()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = SeedRestaurantIngredients;