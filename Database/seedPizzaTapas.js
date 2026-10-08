const { pool } = require('../config/db');

const barItems = [
  {
    nom: 'MARGUERITA',
    ingredients: 'Sauce tomate, mozzarella, basilic',
    prix: 35000,
    categorie: 'Pizza',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Quatre Saisons',
    ingredients: 'Sauce tomate, fromage, légumes, jambon',
    prix: 38000,
    categorie: 'Pizza',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Quatre Fromage',
    ingredients: 'Fromage, crème, mozzarella, parmesan',
    prix: 40000,
    categorie: 'Pizza',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'New York Sicilienne',
    ingredients: 'Sauce tomate, fromage, olives, herbes',
    prix: 40000,
    categorie: 'Pizza',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Flocon de Neige',
    ingredients: 'Crème, fromage, champignons, mozzarella',
    prix: 40000,
    categorie: 'Pizza',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Marinara',
    ingredients: 'Sauce tomate, ail, basilic, fromage',
    prix: 45000,
    categorie: 'Pizza',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Burger Zebu',
    ingredients: 'Burger au zebu, pain, salade, sauce',
    prix: 38000,
    categorie: 'Tapas',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Burger Poulet',
    ingredients: 'Burger au poulet, pain, salade, sauce',
    prix: 38000,
    categorie: 'Tapas',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Brochette de Zebu',
    ingredients: 'Brochette de viande zebu grillée',
    prix: 38000,
    categorie: 'Tapas',
    alcool: 0,
    stock: 9999,
    unite: 'pièce',
  },
  {
    nom: 'Panier de Poulet Panes',
    ingredients: 'Poulet pané servi en panier',
    prix: 26000,
    categorie: 'Tapas',
    alcool: 0,
    stock: 9999,
    unite: 'panier',
  },
];

const restaurantItems = [
  {
    category: 'Pizza',
    items: [
      { code: 'PIZZA_MARG_001', nom: 'MARGUERITA', unite: 'PIECE', prix_vente: 35000 },
      { code: 'PIZZA_SAIS_002', nom: 'Quatre Saisons', unite: 'PIECE', prix_vente: 38000 },
      { code: 'PIZZA_FROM_003', nom: 'Quatre Fromage', unite: 'PIECE', prix_vente: 40000 },
      { code: 'PIZZA_NY_004', nom: 'New York Sicilienne', unite: 'PIECE', prix_vente: 40000 },
      { code: 'PIZZA_FLO_005', nom: 'Flocon de Neige', unite: 'PIECE', prix_vente: 40000 },
      { code: 'PIZZA_MAR_006', nom: 'Marinara', unite: 'PIECE', prix_vente: 45000 },
    ],
  },
  {
    category: 'Tapas',
    items: [
      { code: 'TAPAS_ZEBU_001', nom: 'Burger Zebu', unite: 'PIECE', prix_vente: 38000 },
      { code: 'TAPAS_POU_002', nom: 'Burger Poulet', unite: 'PIECE', prix_vente: 38000 },
      { code: 'TAPAS_BRO_003', nom: 'Brochette de Zebu', unite: 'PIECE', prix_vente: 38000 },
      { code: 'TAPAS_PAN_004', nom: 'Panier de Poulet Panes', unite: 'PANIER', prix_vente: 26000 },
    ],
  },
];

async function getOrCreateCategoryId(categoryName) {
  const [rows] = await pool.query('SELECT id FROM categories WHERE nom = ? LIMIT 1', [categoryName]);

  if (rows.length > 0) {
    return rows[0].id;
  }

  const [result] = await pool.query('INSERT INTO categories (nom) VALUES (?)', [categoryName]);
  console.log(`📂 Catégorie "${categoryName}" créée (ID: ${result.insertId})`);
  return result.insertId;
}

async function seedRestaurantProducts() {
  for (const group of restaurantItems) {
    const categoryId = await getOrCreateCategoryId(group.category);

    for (const item of group.items) {
      const [existing] = await pool.query(
        'SELECT id FROM products WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?)) LIMIT 1',
        [item.nom]
      );

      if (existing.length > 0) {
        await pool.query(
          `UPDATE products
           SET category_id = ?, code = ?, unite = ?, prix_achat = 0, prix_vente = ?, actif = 1, type_produit = 'PRODUIT_FINI'
           WHERE id = ?`,
          [categoryId, item.code, item.unite, item.prix_vente, existing[0].id]
        );
        console.log(`🔄 Produit restaurant mis à jour: ${item.nom}`);
      } else {
        await pool.query(
          `INSERT INTO products (category_id, code, nom, unite, prix_achat, prix_vente, actif, type_produit)
           VALUES (?, ?, ?, ?, 0, ?, 1, 'PRODUIT_FINI')`,
          [categoryId, item.code, item.nom, item.unite, item.prix_vente]
        );
        console.log(`✅ Produit restaurant ajouté: ${item.nom}`);
      }
    }
  }
}

async function seedBarProducts() {
  for (const item of barItems) {
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

    const [stockCheck] = await pool.query('SELECT id FROM bar_stock WHERE product_id = ?', [productId]);

    if (stockCheck.length > 0) {
      await pool.query('UPDATE bar_stock SET quantite = ?, unite = ? WHERE product_id = ?', [item.stock, item.unite, productId]);
    } else {
      await pool.query('INSERT INTO bar_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, ?, ?, ?)', [productId, item.stock, 0, item.unite]);
    }

    console.log(`✅ Produit bar prêt: ${item.nom}`);
  }
}

async function seedPizzaTapas() {
  try {
    console.log('🚀 Début du seed Pizza & Tapas...');
    await seedRestaurantProducts();
    await seedBarProducts();
    console.log('\n✅ Seed Pizza & Tapas terminé avec succès.');
  } catch (error) {
    console.error('❌ Erreur pendant le seed Pizza & Tapas:', error);
    throw error;
  }
}

if (require.main === module) {
  seedPizzaTapas()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedPizzaTapas };
