// Database/seedBarStock.js
const { pool } = require('../config/db');

async function seedStock() {
    try {
        console.log('🚀 Initialisation du stock pour les boissons Quintana Sky...');

        // Récupérer toutes les boissons du bar (catégories créées ou codes QSKY)
        const [products] = await pool.query(
            "SELECT id FROM bar_products WHERE categorie LIKE '%Quintana%' OR categorie LIKE '%QSKY%'"
        );

        let added = 0;
        for (const prod of products) {
            // Vérifier si le stock existe déjà pour ce produit
            const [existing] = await pool.query(
                "SELECT id FROM bar_stock WHERE product_id = ?",
                [prod.id]
            );

            if (existing.length === 0) {
                // Insérer un stock par défaut de 50 unités
                await pool.query(
                    "INSERT INTO bar_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, 50, 5, 'unités')",
                    [prod.id]
                );
                added++;
            }
        }

        console.log(`✅ Stock initialisé pour ${added} nouvelle(s) boisson(s) !`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur :', error.message);
        process.exit(1);
    }
}

seedStock();