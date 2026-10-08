const { pool } = require('../config/db');

const items = [
  {
    nom: 'Verre cassé',
    ingredients: 'Dommage matériel',
    prix: 7000,
    categorie: 'Accessoires',
    alcool: 0,
    stock: 9999,
    unite: 'unité',
  },
  {
    nom: 'Consignation de bouteille',
    ingredients: 'Consignation bouteille',
    prix: 1000,
    categorie: 'Accessoires',
    alcool: 0,
    stock: 9999,
    unite: 'bouteille',
  },
];

async function seedBottleExtras() {
  try {
    for (const item of items) {
      const [existing] = await pool.query(
        'SELECT id FROM bar_products WHERE nom = ? LIMIT 1',
        [item.nom]
      );

      let productId;

      if (existing.length > 0) {
        productId = existing[0].id;
        await pool.query(
          `UPDATE bar_products
           SET ingredients = ?, prix = ?, categorie = ?, alcool = ?, type_produit = 'PRODUIT_FINI', source_module = 'BAR'
           WHERE id = ?`,
          [item.ingredients, item.prix, item.categorie, item.alcool, productId]
        );
      } else {
        const [result] = await pool.query(
          `INSERT INTO bar_products (nom, ingredients, prix, categorie, alcool, type_produit, source_module)
           VALUES (?, ?, ?, ?, ?, 'PRODUIT_FINI', 'BAR')`,
          [item.nom, item.ingredients, item.prix, item.categorie, item.alcool]
        );
        productId = result.insertId;
      }                                                                                                                                                                                                                                                                                                                                                                                                                                                           

      const [stockCheck] = await pool.query(
        'SELECT id FROM bar_stock WHERE product_id = ?',
        [productId]
      );                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            

      if (stockCheck.length > 0) {
        await pool.query(
          'UPDATE bar_stock SET quantite = ?, unite = ? WHERE product_id = ?',
          [item.stock, item.unite, productId]
        );
      } else {
        await pool.query(
          'INSERT INTO bar_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, ?, ?, ?)',
          [productId, item.stock, 0, item.unite]
        );
      }

      console.log(`✅ ${item.nom} prêt (${productId})`);
    }

    console.log('\n✅ Les articles Accessoires ont été ajoutés dans la base de données.');
  } catch (error) {
    console.error('Erreur seed bottle extras:', error);
    throw error;
  }
}

if (require.main === module) {
  seedBottleExtras()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seedBottleExtras;
