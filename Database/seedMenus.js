require('dotenv').config();
const { pool, withTransaction } = require('../config/db');

const foodItems = [
  ['Bâtonnets crouquants', 8000, 'Tapas'],
  ['Bruschetta x2', 12000, 'Tapas'],
  ['Mini pizzas Margherita x4', 14000, 'Tapas'],
  ['Sambos maison x4', 15000, 'Tapas'],
  ['Nems maison x4', 15000, 'Tapas'],
  ['Mini burger x4', 18000, 'Tapas'],
  ['Mini brochettes de poulet x4', 16000, 'Tapas'],
  ['Mini brochettes de zébu x4', 16000, 'Tapas'],
  ['Popcorn chicken x6', 16000, 'Tapas'],
  ['Nuggets de poulet x6', 20000, 'Tapas'],
  ['Tenders de poulet x6', 24000, 'Tapas'],
  ['Camembert pané x6', 24000, 'Tapas'],
  ['Tempura de crevettes x6', 24000, 'Tapas'],
  ['Planche de fromage', 30000, 'Planches'],
  ['Planche apéro', 40000, 'Planches'],
  ['Planche chicken mix', 65000, 'Planches'],
  ['Planche mini mix', 80000, 'Planches'],
  ['Cheeseburger', 25000, 'Burgers'],
  ['Chicken cheeseburger', 25000, 'Burgers'],
  ['Crispy chicken burger', 25000, 'Burgers'],
  ['Burger montagnard', 28000, 'Burgers'],
  ['Assiette de frites', 6000, 'Petite faim'],
  ['Naan fromage', 12000, 'Petite faim'],
  ['Assiette de crudités', 14000, 'Petite faim'],
  ['Mine sao poulet', 24000, 'Petite faim'],
  ['Soupe royal', 26000, 'Petite faim'],
  ['Sandwich au poulet', 24000, 'Sandwichs'],
  ['Sandwich américain', 26000, 'Sandwichs'],
  ['Croque monsieur', 22000, 'Sandwichs'],
  ['Croque madame', 23000, 'Sandwichs'],
  ['Croque forestière', 20000, 'Sandwichs'],
  ['Club sandwich', 24000, 'Sandwichs'],
  ['Wrap poulet', 22000, 'Sandwichs'],
  ['Wrap crispy poulet', 24000, 'Sandwichs'],
  ['Wrap végétarien', 20000, 'Sandwichs'],
  ['Pizza Margherita', 25000, 'Pizzas'],
  ['Pizza végétarienne', 28000, 'Pizzas'],
  ['Pizza montagnarde', 30000, 'Pizzas'],
  ['Pizza poulet tandoori', 30000, 'Pizzas'],
  ['Pizza poulet BBQ', 30000, 'Pizzas'],
  ['Pizza 4 fromages', 32000, 'Pizzas'],
  ['Pizza royal mixte', 32000, 'Pizzas'],
  ['Pizza reine', 30000, 'Pizzas'],
  ['Pizza fruits de mer', 32000, 'Pizzas'],
  ['Pizza hawaïenne', 30000, 'Pizzas'],
  ['Pizza chèvre miel', 30000, 'Pizzas'],
  ['Glace', 6000, 'Plaisirs sucrés'],
  ['Crêpe nature', 10000, 'Plaisirs sucrés'],
  ['Crêpe', 16000, 'Plaisirs sucrés'],
  ['Mini éclair x2', 16000, 'Plaisirs sucrés'],
  ['Brownie au chocolat', 16000, 'Plaisirs sucrés'],
  ['Salade de fruits', 16000, 'Plaisirs sucrés'],
  ['Mœlleux au chocolat & glace vanille', 25000, 'Plaisirs sucrés'],
  ['Formule classique', 16000, 'Petit déjeuner'],
  ['Formule continental', 22000, 'Petit déjeuner'],
  ['Formule américain', 30000, 'Petit déjeuner'],
  ['Malagasy', 8000, 'Petit déjeuner'],
  ['Dahl curry', 12000, 'Petit déjeuner'],
  ['Assiette de kitôza', 10000, 'Petit déjeuner'],
  ['Assiette de boulette', 10000, 'Petit déjeuner'],
  ['Assiette de saucisse', 10000, 'Petit déjeuner'],
  ["Vary amin'anana sy kitôza", 18000, 'Petit déjeuner'],
  ['Œuf sur le plat', 8000, 'Œufs'],
  ['Omelette nature', 8000, 'Œufs'],
  ['Omelette fines herbes ou fromage', 12000, 'Œufs'],
  ['Omelette jambon fromage', 14000, 'Œufs'],
  ['Omelette forestière', 16000, 'Œufs'],
  ['Crêpe nature petit déjeuner', 7000, 'Crêpes & pain'],
  ['Crêpe sucre miel confiture chocolat', 10000, 'Crêpes & pain'],
  ['Pain beurre confiture', 8000, 'Crêpes & pain'],
  ['Croissant', 6000, 'Viennoiseries'],
  ['Pain au chocolat', 6000, 'Viennoiseries'],
  ['Pain au raisin', 7000, 'Viennoiseries'],
  ['Yaourt nature', 3000, 'Yaourt'],
  ['Yaourt parfumé', 3500, 'Yaourt'],
  ['Salade de fruits petit déjeuner', 12000, 'Fruits'],
  ['Assiette de fruits', 15000, 'Fruits'],
];

const barItems = [
  ['Cocktail du jour', 7000, 'Cocktails sans alcool', 0],
  ['Virgin mojito', 12000, 'Cocktails sans alcool', 0],
  ['Virgin colada', 12000, 'Cocktails sans alcool', 0],
  ['Florida', 12000, 'Cocktails sans alcool', 0],
  ['Milkshake', 15000, 'Cocktails sans alcool', 0],
  ['Thé glacé au citron', 12000, 'Cocktails sans alcool', 0],
  ['Citronnade maison', 10000, 'Cocktails sans alcool', 0],
  ['Monaco', 12000, 'Cocktails avec alcool', 1],
  ['Margarita', 15000, 'Cocktails avec alcool', 1],
  ['Caipirinha', 12000, 'Cocktails avec alcool', 1],
  ['Tequila sunrise', 14000, 'Cocktails avec alcool', 1],
  ['Cuba libre', 15000, 'Cocktails avec alcool', 1],
  ['Ti punch', 14000, 'Cocktails avec alcool', 1],
  ['Planter', 14000, 'Cocktails avec alcool', 1],
  ['Piña colada alcoolisée', 15000, 'Cocktails avec alcool', 1],
  ['Kir', 20000, 'Cocktails avec alcool', 1],
  ['Gin tonic', 26000, 'Cocktails avec alcool', 1],
  ['Spritz', 30000, 'Cocktails avec alcool', 1],
  ['THB 33 cl', 7000, 'Bières', 1],
  ['THB 65 cl', 10000, 'Bières', 1],
  ['THB canette 33 cl', 7000, 'Bières', 1],
  ['Gold 50 cl', 12000, 'Bières', 1],
  ['Gold 65 cl', 12000, 'Bières', 1],
  ['Gold Blanche 50 cl', 12000, 'Bières', 1],
  ['Beaufort 33 cl', 12000, 'Bières', 1],
  ['Banané vanille', 15000, 'Smoothies', 0],
  ['Banane chocolat', 15000, 'Smoothies', 0],
  ['Concombre', 15000, 'Smoothies', 0],
  ['Avocat glacé', 15000, 'Smoothies', 0],
  ['Tropical', 15000, 'Smoothies', 0],
  ['Fraise banane', 15000, 'Smoothies', 0],
  ['Hydratant', 12000, 'Jus détox', 0],
  ['Autofocus', 12000, 'Jus détox', 0],
  ['Boost', 12000, 'Jus détox', 0],
  ['Fresh reset', 12000, 'Jus détox', 0],
  ['Vitality', 12000, 'Jus détox', 0],
  ['Boissons star', 6000, 'Softs', 0],
  ['Coca cola, Fanta, Sprite', 6000, 'Softs', 0],
  ['Ice tea pêche 33/50 cl', 10000, 'Softs', 0],
  ['Sirop', 7000, 'Softs', 0],
  ['Jus naturel', 7000, 'Softs', 0],
  ['Carafe de jus naturel', 30000, 'Softs', 0],
  ['Eau vive', 5000, 'Softs', 0],
  ['Cristalline', 8000, 'Softs', 0],
  ['Ranovisy', 7000, 'Softs', 0],
  ['Lait chaud ou froid', 8000, 'Boissons chaudes', 0],
  ['Infusion citronnelle', 7000, 'Boissons chaudes', 0],
  ['Thé nature', 7000, 'Boissons chaudes', 0],
  ['Thé au lait, gingembre, citron', 8000, 'Boissons chaudes', 0],
  ['Thé indien', 10000, 'Boissons chaudes', 0],
  ['Café noir ou au lait', 8000, 'Boissons chaudes', 0],
  ['Expresso', 8000, 'Boissons chaudes', 0],
  ['Cappuccino', 10000, 'Boissons chaudes', 0],
  ['Chocolat chaud', 10000, 'Boissons chaudes', 0],
  ['Pastis Prado', 10000, 'Apéritifs', 1],
  ['Ricard', 20000, 'Apéritifs', 1],
  ['Crème de cassis', 20000, 'Apéritifs', 1],
  ['Martini rouge ou blanc', 25000, 'Apéritifs', 1],
  ['Porto', 20000, 'Apéritifs', 1],
  ['Campari', 25000, 'Apéritifs', 1],
  ['Suze', 20000, 'Apéritifs', 1],
  ['J&B', 25000, 'Whiskies', 1],
  ['Red Label', 25000, 'Whiskies', 1],
  ["Ballantine's", 30000, 'Whiskies', 1],
  ["Jack Daniel's", 35000, 'Whiskies', 1],
  ['Chivas 12 ans', 35000, 'Whiskies', 1],
  ['Black Label', 35000, 'Whiskies', 1],
  ['Dimple 15 ans', 40000, 'Whiskies', 1],
  ['Glenfiddich', 45000, 'Whiskies', 1],
  ['Aberlour', 45000, 'Whiskies', 1],
  ['Double Black Label', 50000, 'Whiskies', 1],
  ['Nikka Coffee Grain', 55000, 'Whiskies', 1],
  ['Markovitch citron', 10000, 'Vodkas', 1],
  ['Absolute vodka', 20000, 'Vodkas', 1],
  ['Vodka Grey Goose', 40000, 'Vodkas', 1],
  ['Harpoon Dry', 15000, 'Gins', 1],
  ["Gordon's Dry", 25000, 'Gins', 1],
  ['Bombay Sapphire', 30000, 'Gins', 1],
  ['Cazanove', 15000, 'Rhums', 1],
  ['Dzama blanc Nosy Be', 10000, 'Rhums', 1],
  ['Rhum arrangé', 10000, 'Digestifs', 1],
  ['Tequila', 15000, 'Digestifs', 1],
  ['Grand Marnier', 30000, 'Digestifs', 1],
  ['Get 27', 30000, 'Digestifs', 1],
  ['Get 31', 30000, 'Digestifs', 1],
  ['Malibu', 35000, 'Digestifs', 1],
  ["Bailey's", 35000, 'Digestifs', 1],
];

async function ensureBarTables(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bar_products (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nom VARCHAR(150) NOT NULL,
      ingredients TEXT DEFAULT NULL,
      prix DECIMAL(10,2) NOT NULL DEFAULT 0,
      categorie VARCHAR(50) DEFAULT 'Bar',
      alcool TINYINT(1) DEFAULT 0,
      type_produit VARCHAR(50) DEFAULT 'PRODUIT_FINI',
      source_module VARCHAR(50) DEFAULT 'BAR',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bar_stock (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id BIGINT UNSIGNED NOT NULL,
      quantite DECIMAL(12,2) NOT NULL DEFAULT 0,
      seuil_minimum DECIMAL(12,2) NOT NULL DEFAULT 0,
      unite VARCHAR(30) NOT NULL DEFAULT 'unités',
      PRIMARY KEY (id),
      UNIQUE KEY uk_bar_stock_product_id (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function run() {
  await withTransaction(async (connection) => {
    await ensureBarTables(connection);

    for (const [nom, prix, categorie] of foodItems) {
      const [[category]] = await connection.query('SELECT id FROM categories WHERE nom = ? LIMIT 1', [categorie]);
      let categoryId = category?.id;
      if (!categoryId) {
        const [result] = await connection.query('INSERT INTO categories (nom) VALUES (?)', [categorie]);
        categoryId = result.insertId;
      }
      const [[existing]] = await connection.query(
        "SELECT id FROM products WHERE nom = ? AND source_module = 'RESTAURANT' LIMIT 1",
        [nom]
      );
      if (existing) {
        await connection.query(
          "UPDATE products SET category_id = ?, prix_vente = ?, actif = 1, type_produit = 'PRODUIT_FINI' WHERE id = ?",
          [categoryId, prix, existing.id]
        );
      } else {
        await connection.query(
          "INSERT INTO products (category_id, nom, unite, prix_vente, actif, type_produit, source_module) VALUES (?, ?, 'portion', ?, 1, 'PRODUIT_FINI', 'RESTAURANT')",
          [categoryId, nom, prix]
        );
      }
    }

    for (const [nom, prix, categorie, alcool] of barItems) {
      const [[existing]] = await connection.query('SELECT id FROM bar_products WHERE nom = ? LIMIT 1', [nom]);
      if (existing) {
        await connection.query(
          'UPDATE bar_products SET prix = ?, categorie = ?, alcool = ?, source_module = \'BAR\' WHERE id = ?',
          [prix, categorie, alcool, existing.id]
        );
      } else {
        const [result] = await connection.query(
          "INSERT INTO bar_products (nom, prix, categorie, alcool, type_produit, source_module) VALUES (?, ?, ?, ?, 'PRODUIT_FINI', 'BAR')",
          [nom, prix, categorie, alcool]
        );
        await connection.query(
          "INSERT INTO bar_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, 0, 0, 'unités')",
          [result.insertId]
        );
      }
    }
  });
  console.log(`Menu importé : ${foodItems.length} plats et ${barItems.length} boissons.`);
}

run()
  .catch((error) => {
    console.error('Échec import menu :', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
