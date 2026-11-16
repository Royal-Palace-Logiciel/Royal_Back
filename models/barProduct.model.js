const { createCrudModel } = require('./crudFactory');
const { withTransaction } = require('../config/db');

let schemaReady;

async function ensureBarProductSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = require('../config/db').pool;
      await pool.query(`
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
          PRIMARY KEY (id),
          KEY idx_bar_products_categorie (categorie)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bar_stock (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          product_id BIGINT UNSIGNED NOT NULL,
          quantite DECIMAL(12,2) NOT NULL DEFAULT 0,
          seuil_minimum DECIMAL(12,2) NOT NULL DEFAULT 0,
          unite VARCHAR(30) NOT NULL DEFAULT 'unités',
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_bar_stock_product_id (product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

const barProducts = createCrudModel({
  table: 'bar_products',
  pk: 'id',
  fields: ['nom', 'ingredients', 'prix', 'categorie', 'alcool', 'type_produit', 'source_module'],
  sortable: ['id', 'nom', 'categorie'],
});

async function getBarProductsWithStock() {
  await ensureBarProductSchema();
  const pool = require('../config/db').pool;
  const [rows] = await pool.query(`
    SELECT bp.*, bs.product_id, bs.quantite, bs.seuil_minimum, bs.unite
    FROM bar_products bp
    LEFT JOIN bar_stock bs ON bs.product_id = bp.id
    ORDER BY bp.id DESC
  `);
  return rows;
}

async function addBarProductWithStock(data) {
  await ensureBarProductSchema();
  const nom = String(data.nom || '').trim();
  const categorie = String(data.categorie || data.category || 'Bar').trim();
  const prix = Number(data.prix ?? data.prixUnitaire ?? data.prix_unitaire ?? data.price ?? 0);
  const alcool = data.alcool === false || data.alcool === 0 ? 0 : 1;
  const unite = String(data.unite || 'unités').trim();
  const quantite = Number(data.quantite ?? 0);
  const seuil_minimum = Number(data.seuil_minimum ?? data.seuilMinimum ?? 5);
  const ingredients = String(data.ingredients || '').trim();

  if (!nom) throw new Error('Le nom du produit est requis');
  if (![prix, quantite, seuil_minimum].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error('Le prix, la quantité et le seuil doivent être des nombres positifs');
  }

  return withTransaction(async (conn) => {
    const [result] = await conn.query(
      'INSERT INTO bar_products (nom, ingredients, prix, categorie, alcool, type_produit, source_module) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nom, ingredients, Number.isFinite(prix) ? prix : 0, categorie, alcool, 'PRODUIT_FINI', 'BAR']
    );
    const productId = result.insertId;
    await conn.query(
      'INSERT INTO bar_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, ?, ?, ?)',
      [productId, Number.isFinite(quantite) ? quantite : 0, Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite]
    );
    return { id: productId, nom, categorie, prix: Number.isFinite(prix) ? prix : 0, quantite: Number.isFinite(quantite) ? quantite : 0, seuil_minimum: Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite, ingredients, alcool };
  });
}

async function updateBarProductWithStock(id, data) {
  await ensureBarProductSchema();
  const nom = String(data.nom || '').trim();
  const categorie = String(data.categorie || data.category || 'Bar').trim();
  const prix = Number(data.prix ?? data.prixUnitaire ?? data.prix_unitaire ?? data.price ?? 0);
  const alcool = data.alcool === false || data.alcool === 0 ? 0 : 1;
  const unite = String(data.unite || 'unités').trim();
  const quantite = Number(data.quantite ?? 0);
  const seuil_minimum = Number(data.seuil_minimum ?? data.seuilMinimum ?? 5);
  const ingredients = String(data.ingredients || '').trim();

  if (!nom) throw new Error('Le nom du produit est requis');
  if (![prix, quantite, seuil_minimum].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error('Le prix, la quantité et le seuil doivent être des nombres positifs');
  }

  return withTransaction(async (conn) => {
    const [products] = await conn.query('SELECT id FROM bar_products WHERE id = ? FOR UPDATE', [id]);
    if (!products.length) throw new Error(`Produit bar #${id} introuvable`);

    await conn.query(
      'UPDATE bar_products SET nom=?, ingredients=?, prix=?, categorie=?, alcool=?, type_produit=?, source_module=? WHERE id=?',
      [nom, ingredients, Number.isFinite(prix) ? prix : 0, categorie, alcool, 'PRODUIT_FINI', 'BAR', id]
    );
    await conn.query(
      'INSERT INTO bar_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantite=VALUES(quantite), seuil_minimum=VALUES(seuil_minimum), unite=VALUES(unite)',
      [id, Number.isFinite(quantite) ? quantite : 0, Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite]
    );
    return { id, nom, categorie, prix: Number.isFinite(prix) ? prix : 0, quantite: Number.isFinite(quantite) ? quantite : 0, seuil_minimum: Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite, ingredients, alcool };
  });
}

async function deleteBarProductWithStock(id) {
  await ensureBarProductSchema();
  return withTransaction(async (conn) => {
    const [products] = await conn.query('SELECT id FROM bar_products WHERE id = ? FOR UPDATE', [id]);
    if (!products.length) throw new Error(`Produit bar #${id} introuvable`);

    await conn.query('DELETE FROM bar_transactions WHERE product_id = ?', [id]);
    await conn.query('DELETE FROM bar_stock WHERE product_id = ?', [id]);
    await conn.query('DELETE FROM bar_products WHERE id = ?', [id]);
    return { id };
  });
}

module.exports = {
  barProducts,
  getBarProductsWithStock,
  addBarProductWithStock,
  updateBarProductWithStock,
  deleteBarProductWithStock,
  ensureBarProductSchema,
};