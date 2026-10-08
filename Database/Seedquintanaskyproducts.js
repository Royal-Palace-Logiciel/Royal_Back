// Database/seedQuintanaSkyProducts.js
const { pool } = require('../config/db');

/**
 * Seeder portable pour le restaurant Quintana Sky
 * Gère la création dynamique des vraies catégories et la mise à jour automatique des produits.
 */
class SeedQuintanaSkyProducts {

    /**
     * Trouve ou crée automatiquement une catégorie par son nom
     */
    async getOrCreateCategoryId(categoryName) {
        const [rows] = await pool.query(
            'SELECT id FROM categories WHERE nom = ? LIMIT 1',
            [categoryName]
        );

        if (rows.length > 0) {
            return rows[0].id;
        }

        const [result] = await pool.query(
            'INSERT INTO categories (nom) VALUES (?)',
            [categoryName]
        );

        console.log(`📂 Catégorie "${categoryName}" créée dynamiquement (ID: ${result.insertId})`);
        return result.insertId;
    }

    /**
     * Exécuter le seeder avec les bonnes catégories et mise à jour automatique
     */
    async run() {
        try {
            console.log('🚀 Début du seeder des produits Quintana Sky...');

            // 1. Récupérer ou créer dynamiquement chaque vraie catégorie
            const catEntreesId = await this.getOrCreateCategoryId('Entrées Indiennes');
            const catRollsId = await this.getOrCreateCategoryId('Rolls');
            const catPlatsId = await this.getOrCreateCategoryId('Plats Indiens');
            const catPainsId = await this.getOrCreateCategoryId('Pains Indiens');
            const catChinoisesId = await this.getOrCreateCategoryId('Spécialités Chinoises');
            const catSoupesId = await this.getOrCreateCategoryId('Soupes');
            const catRizId = await this.getOrCreateCategoryId('Riz & Biryani');

            // 2. Liste complète des produits assignés à leur vraie catégorie respective
            const items = [
                // =========================================================================
                // ENTRÉES INDIENNES
                // =========================================================================
                { category_id: catEntreesId, code: 'QSKY_APP_001', nom: 'Veg Samosa', unite: 'PIECE', prix_achat: 0, prix_vente: 25000, type_produit: 'PRODUIT_FINI' },
                { category_id: catEntreesId, code: 'QSKY_APP_002', nom: 'Chicken Samosa', unite: 'PIECE', prix_achat: 0, prix_vente: 30000, type_produit: 'PRODUIT_FINI' },
                { category_id: catEntreesId, code: 'QSKY_APP_003', nom: 'Tandoori Chicken', unite: 'PIECE', prix_achat: 0, prix_vente: 30000, type_produit: 'PRODUIT_FINI' },
                { category_id: catEntreesId, code: 'QSKY_APP_004', nom: 'Chicken Tandoori Kebab', unite: 'PIECE', prix_achat: 0, prix_vente: 35000, type_produit: 'PRODUIT_FINI' },

                // =========================================================================
                // ROLLS
                // =========================================================================
                { category_id: catRollsId, code: 'QSKY_ROLL_001', nom: 'Chicken Tikka Roll', unite: 'PIECE', prix_achat: 0, prix_vente: 25000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRollsId, code: 'QSKY_ROLL_002', nom: 'Mutton Seekh Roll', unite: 'PIECE', prix_achat: 0, prix_vente: 27000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRollsId, code: 'QSKY_ROLL_003', nom: 'Chicken Seekh Roll', unite: 'PIECE', prix_achat: 0, prix_vente: 27000, type_produit: 'PRODUIT_FINI' },

                // =========================================================================
                // PLATS INDIENS
                // =========================================================================
                { category_id: catPlatsId, code: 'QSKY_PLAT_001', nom: 'Dal Tadka', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 20000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_002', nom: 'Dal Makhni', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 30000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_003', nom: 'Bhindi Masala', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 30000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_004', nom: 'Chilli Paneer', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 35000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_005', nom: 'Palak Paneer', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 35000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_006', nom: 'Mutton Rogan Josh', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 35000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_007', nom: 'Chicken Tikka Masala', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 35000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_008', nom: 'Butter Chicken', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 35000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_009', nom: 'Prawn Tikka Masala', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 38000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_010', nom: 'Paneer Butter Masala', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 40000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPlatsId, code: 'QSKY_PLAT_011', nom: 'Paneer Tikka Masala', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 45000, type_produit: 'PRODUIT_FINI' },

                // =========================================================================
                // PAINS INDIENS
                // =========================================================================
                { category_id: catPainsId, code: 'QSKY_PAIN_001', nom: 'Tandoori Butter Roti', unite: 'PIECE', prix_achat: 0, prix_vente: 10000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPainsId, code: 'QSKY_PAIN_002', nom: 'Plain Naan', unite: 'PIECE', prix_achat: 0, prix_vente: 11000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPainsId, code: 'QSKY_PAIN_003', nom: 'Butter Naan', unite: 'PIECE', prix_achat: 0, prix_vente: 12000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPainsId, code: 'QSKY_PAIN_004', nom: 'Garlic Naan', unite: 'PIECE', prix_achat: 0, prix_vente: 13000, type_produit: 'PRODUIT_FINI' },
                { category_id: catPainsId, code: 'QSKY_PAIN_005', nom: 'Cheese Naan', unite: 'PIECE', prix_achat: 0, prix_vente: 13000, type_produit: 'PRODUIT_FINI' },

                // =========================================================================
                // SPÉCIALITÉS CHINOISES
                // =========================================================================
                { category_id: catChinoisesId, code: 'QSKY_CHIN_001', nom: 'Veg Noodles', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 20000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_002', nom: 'Veg Fried Rice', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 20000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_003', nom: 'Veg Manchurian Fried Rice', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 23000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_004', nom: 'Chicken Noodles', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 25000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_005', nom: 'Chicken Fried Rice', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 25000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_006', nom: 'Chicken Manchurian Fried Rice', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 27000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_007', nom: 'Veg Manchurian', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 30000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_008', nom: 'Chilli Potato', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 30000, type_produit: 'PRODUIT_FINI' },
                { category_id: catChinoisesId, code: 'QSKY_CHIN_009', nom: 'Chilli Paneer (Chinoise)', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 35000, type_produit: 'PRODUIT_FINI' },

                // =========================================================================
                // SOUPES
                // =========================================================================
                { category_id: catSoupesId, code: 'QSKY_SOUP_001', nom: 'Chicken Sweet Corn Soup', unite: 'BOL', prix_achat: 0, prix_vente: 20000, type_produit: 'PRODUIT_FINI' },
                { category_id: catSoupesId, code: 'QSKY_SOUP_002', nom: 'Veg Wonton Soup', unite: 'BOL', prix_achat: 0, prix_vente: 23000, type_produit: 'PRODUIT_FINI' },
                { category_id: catSoupesId, code: 'QSKY_SOUP_003', nom: 'Non-Veg Wonton Soup', unite: 'BOL', prix_achat: 0, prix_vente: 26000, type_produit: 'PRODUIT_FINI' },

                // =========================================================================
                // RIZ & BIRYANI
                // =========================================================================
                { category_id: catRizId, code: 'QSKY_BIRY_001', nom: 'Steam Rice Basmati', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 10000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRizId, code: 'QSKY_BIRY_002', nom: 'Chicken Biryani', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 23000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRizId, code: 'QSKY_BIRY_003', nom: 'Egg Biryani', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 25000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRizId, code: 'QSKY_BIRY_004', nom: 'Veg Biryani', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 25000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRizId, code: 'QSKY_BIRY_005', nom: 'Mix Biryani', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 30000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRizId, code: 'QSKY_BIRY_006', nom: 'Mutton Biryani', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 31000, type_produit: 'PRODUIT_FINI' },
                { category_id: catRizId, code: 'QSKY_BIRY_007', nom: 'Prawn Biryani', unite: 'ASSIETTE', prix_achat: 0, prix_vente: 31000, type_produit: 'PRODUIT_FINI' }
            ];

            let insertedCount = 0;
            let updatedCount = 0;

            for (const item of items) {
                // Vérifier si le produit existe déjà par son code unique
                const [existing] = await pool.query(
                    'SELECT id FROM products WHERE code = ?',
                    [item.code]
                );

                if (existing.length > 0) {
                    // Si le produit existe déjà, on met à jour sa catégorie et ses infos (nettoyage automatique)
                    await pool.query(
                        `UPDATE products 
                         SET category_id = ?, nom = ?, unite = ?, prix_achat = ?, prix_vente = ?, type_produit = ?, source_module = 'RESTAURANT'
                         WHERE code = ?`,
                        [
                            item.category_id,
                            item.nom,
                            item.unite,
                            item.prix_achat,
                            item.prix_vente,
                            item.type_produit,
                            item.code
                        ]
                    );
                    updatedCount++;
                } else {
                    // Sinon, on l'insère
                    await pool.query(
                        `INSERT INTO products (category_id, code, nom, unite, prix_achat, prix_vente, actif, type_produit, source_module)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RESTAURANT')`,
                        [
                            item.category_id,
                            item.code,
                            item.nom,
                            item.unite,
                            item.prix_achat,
                            item.prix_vente,
                            1,
                            item.type_produit
                        ]
                    );
                    insertedCount++;
                }
            }

            console.log(`\n📊 Résumé du seeder Quintana Sky :`);
            console.log(`   ✅ ${insertedCount} produit(s) créé(s)`);
            console.log(`   🔄 ${updatedCount} produit(s) mis à jour (catégories corrigées)`);
            console.log(`   📋 Total traité: ${items.length} produit(s)`);
            console.log('✅ Seeder terminé avec succès !\n');

        } catch (error) {
            console.error('❌ Erreur lors du seeder :', error.message);
            throw error;
        }
    }
}

// Exécution directe
if (require.main === module) {
    const seeder = new SeedQuintanaSkyProducts();
    seeder.run()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = SeedQuintanaSkyProducts;