// models/stockModel.js
const { pool, withTransaction } = require('../config/db');
const { createCrudModel } = require('./crudFactory');
const ApiError = require('../utils/ApiError');

const Categories = createCrudModel({
  table: 'categories', pk: 'id', fields: ['nom'], sortable: ['id', 'nom'],
});

const Subcategories = createCrudModel({
  table: 'subcategories', pk: 'id',
  fields: ['category_id', 'nom'],
  sortable: ['id', 'nom', 'category_id'],
  filterable: ['category_id'],
});

const ProductTypes = createCrudModel({
  table: 'product_types', pk: 'id',
  fields: ['nom', 'description', 'actif'],
  sortable: ['id', 'nom', 'actif'],
});

const Units = createCrudModel({
  table: 'units', pk: 'id', fields: ['code', 'nom'], sortable: ['id', 'nom'],
});

const Products = createCrudModel({
  table: 'products', pk: 'id',
  fields: ['category_id', 'subcategory_id', 'code', 'nom', 'unite', 'prix_achat', 'prix_vente', 'actif', 'type_produit', 'portion_size', 'portion_unite', 'source_module'],
  sortable: ['id', 'nom', 'code', 'prix_vente'],
  filterable: ['category_id', 'subcategory_id', 'actif', 'type_produit'],
});

const StockLocations = createCrudModel({
  table: 'stock_locations', pk: 'id', fields: ['nom'], sortable: ['id', 'nom'],
});

const Stocks = createCrudModel({
  table: 'stocks', pk: 'id',
  fields: ['product_id', 'location_id', 'quantite', 'seuil_minimum', 'etat'],
  sortable: ['id', 'quantite'],
});

// Custom method to get stocks with product information
async function getProductsWithStock(locationId = null) {
  let sql = `
        SELECT s.*, p.nom as product_nom, p.unite as product_unite, p.code as product_code,
          p.prix_achat, p.prix_vente, p.prix_achat as prix, p.category_id, c.nom AS category_name,
          p.subcategory_id, p.type_produit
    FROM stocks s
    JOIN products p ON p.id = s.product_id
        LEFT JOIN categories c ON c.id = p.category_id
  `;
  const params = [];
  
  if (locationId) {
    sql += ' WHERE s.location_id = ?';
    params.push(locationId);
  }
  
  sql += ' ORDER BY s.quantite ASC';
  
  const [rows] = await pool.query(sql, params);
  return rows;
}

const StockMovements = createCrudModel({
  table: 'stock_movements', pk: 'id',
  fields: ['product_id', 'location_id', 'type_mouvement', 'quantite', 'source_module', 'reference_id', 'created_at'],
  sortable: ['id', 'created_at', 'type_mouvement'],
});

const Suppliers = createCrudModel({
  table: 'suppliers', pk: 'id', fields: ['nom', 'telephone', 'email'], sortable: ['id', 'nom'],
});

const Purchases = createCrudModel({
  table: 'purchases', pk: 'id',
  fields: ['supplier_id', 'montant_total', 'statut'],
  sortable: ['id', 'montant_total', 'statut'],
});

const PurchaseItems = createCrudModel({
  table: 'purchase_items', pk: 'id',
  fields: ['purchase_id', 'product_id', 'quantite', 'prix_unitaire'],
  sortable: ['id'],
});

// --- Logique métier -------------------------------------------------------

// Enregistre un mouvement de stock et met à jour la table `stocks` en conséquence.
// type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' (le signe de quantite peut aussi porter l'info)
// New optional params: conn (use caller's transaction), motif, userId, allowNegative
const HOTEL_LOCATION_ID = 5;

async function recordHotelStockExpense(connection, { movementId, productId, quantite }) {
  const [[product]] = await connection.query(
    'SELECT nom, COALESCE(NULLIF(prix_achat, 0), prix_vente, 0) AS prix_unitaire FROM products WHERE id = ?',
    [productId]
  );
  const montant = Math.abs(Number(quantite)) * Number(product?.prix_unitaire || 0);
  if (!(montant > 0)) return;
  await connection.query(
    `INSERT IGNORE INTO financial_transactions
       (module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
     VALUES ('HOTEL', 'SORTIE', ?, ?, ?, ?, 'SYNCED', NOW())`,
    [montant, productId, `HOTEL-STOCK-ENTREE-${movementId}`,
      `Achats - Approvisionnement stock : ${product?.nom || `produit #${productId}`} (x${Math.abs(Number(quantite))})`]
  );
}

async function recordMovement({ productId, locationId, type, quantite, sourceModule, referenceId, conn = null, motif = null, userId = null, allowNegative = true }) {
  if (Number(locationId) === 5 && !Number.isInteger(Number(quantite))) {
    throw ApiError.badRequest('Les quantités du stock hôtel doivent être des nombres entiers');
  }
  const transactionFn = async (connection) => {
    const signedQty = type === 'SORTIE' ? -Math.abs(quantite) : Math.abs(quantite);
    // For AJUSTEMENT, respect the sign of quantite directly
    const effectiveSignedQty = type === 'AJUSTEMENT' ? Number(quantite) : signedQty;

    const [stockRows] = await connection.query(
      'SELECT * FROM stocks WHERE product_id = ? AND location_id = ? FOR UPDATE',
      [productId, locationId]
    );
    
    let newQuantity;
    if (stockRows[0]) {
      newQuantity = Number(stockRows[0].quantite) + effectiveSignedQty;
      
      // Check for negative stock if not allowed
      if (!allowNegative && newQuantity < 0) {
        throw ApiError.badRequest(`Stock insuffisant : ${stockRows[0].quantite} disponible, ${Math.abs(effectiveSignedQty)} demandé`);
      }
      
      await connection.query('UPDATE stocks SET quantite = quantite + ? WHERE id = ?', [effectiveSignedQty, stockRows[0].id]);
    } else {
      newQuantity = effectiveSignedQty;
      
      // Check for negative stock if not allowed
      if (!allowNegative && newQuantity < 0) {
        throw ApiError.badRequest(`Stock insuffisant : 0 disponible, ${Math.abs(effectiveSignedQty)} demandé`);
      }
      
      await connection.query('INSERT INTO stocks (product_id, location_id, quantite) VALUES (?, ?, ?)', [productId, locationId, newQuantity]);
    }

    const [mv] = await connection.query(
      `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at, stock_after, motif, user_id)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [productId, locationId, type, quantite, sourceModule || null, referenceId || null, newQuantity, motif, userId]
    );
    // Approvisionnement manuel du stock Hôtel : la valeur ajoutée est une dépense
    // de la caisse Hôtel (SORTIE), valorisée au prix d'achat ou, à défaut, au prix du produit.
    if (Number(locationId) === HOTEL_LOCATION_ID && type === 'ENTREE' && sourceModule === 'STOCK_MANUEL') {
      await recordHotelStockExpense(connection, { movementId: mv.insertId, productId, quantite });
    }

    const [row] = await connection.query('SELECT * FROM stock_movements WHERE id = ?', [mv.insertId]);
    return row[0];
  };

  if (conn) {
    return await transactionFn(conn);
  } else {
    return await withTransaction(transactionFn);
  }
}

// Helper to get current stock quantity for a product at a location
async function getStockQuantity(productId, locationId) {
  const [rows] = await pool.query(
    'SELECT quantite FROM stocks WHERE product_id = ? AND location_id = ?',
    [productId, locationId]
  );
  return rows[0] ? Number(rows[0].quantite) : 0;
}

// Crée un achat fournisseur + ses lignes, et alimente le stock à réception.
async function createPurchaseWithItems({ supplierId, locationId, items, sourceModule = 'GENERAL' }) {
  return withTransaction(async (conn) => {
    const montantTotal = items.reduce((sum, it) => sum + Number(it.quantite) * Number(it.prix_unitaire), 0);
    const [purchase] = await conn.query(
      `INSERT INTO purchases (supplier_id, montant_total, statut) VALUES (?, ?, 'RECU')`,
      [supplierId, montantTotal]
    );
    const purchaseId = purchase.insertId;

    for (const it of items) {
      await conn.query(
        'INSERT INTO purchase_items (purchase_id, product_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)',
        [purchaseId, it.product_id, it.quantite, it.prix_unitaire]
      );
      const [stockRows] = await conn.query(
        'SELECT * FROM stocks WHERE product_id = ? AND location_id = ? FOR UPDATE',
        [it.product_id, locationId]
      );
      if (stockRows[0]) {
        await conn.query('UPDATE stocks SET quantite = quantite + ? WHERE id = ?', [it.quantite, stockRows[0].id]);
      } else {
        await conn.query('INSERT INTO stocks (product_id, location_id, quantite) VALUES (?, ?, ?)', [it.product_id, locationId, it.quantite]);
      }
      await conn.query(
        `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at)
         VALUES (?, ?, 'ENTREE', ?, 'ACHAT', ?, NOW())`,
        [it.product_id, locationId, it.quantite, purchaseId]
      );
    }

    const [row] = await conn.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    return row[0];
  });
}

// Produits sous un seuil donné (alerte réappro)
async function lowStock(threshold = 10) {
  const [rows] = await pool.query(
    `SELECT p.id, p.nom, p.code, s.location_id, s.quantite
     FROM stocks s JOIN products p ON p.id = s.product_id
     WHERE s.quantite < ? ORDER BY s.quantite ASC`,
    [threshold]
  );
  return rows;
}

async function stockByProduct(productId) {
  const [rows] = await pool.query(
    `SELECT s.*, sl.nom AS location_nom FROM stocks s
     JOIN stock_locations sl ON sl.id = s.location_id
     WHERE s.product_id = ?`,
    [productId]
  );
  return rows;
}

// Portion-based stock consumption: deduct a portion from total stock
async function consumePortion({ productId, locationId, portionSize, portionUnit, referenceId = null, sourceModule = 'RESTAURANT' }) {
  return withTransaction(async (conn) => {
    // Get current stock
    const [stockRows] = await conn.query(
      'SELECT * FROM stocks WHERE product_id = ? AND location_id = ? FOR UPDATE',
      [productId, locationId]
    );

    if (!stockRows[0]) {
      throw new Error('Stock introuvable pour ce produit à cet emplacement');
    }

    const currentQuantity = Number(stockRows[0].quantite);
    const portionToConsume = Number(portionSize);

    if (portionToConsume > currentQuantity) {
      throw new Error(`Stock insuffisant: ${currentQuantity} disponible, ${portionToConsume} demandé`);
    }

    // Update stock quantity
    const newQuantity = currentQuantity - portionToConsume;
    await conn.query(
      'UPDATE stocks SET quantite = ? WHERE id = ?',
      [newQuantity, stockRows[0].id]
    );

    // Record the movement
    const [mv] = await conn.query(
      `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at)
       VALUES (?, ?, 'SORTIE', ?, ?, ?, NOW())`,
      [productId, locationId, portionToConsume, sourceModule, referenceId]
    );

    const [movement] = await conn.query('SELECT * FROM stock_movements WHERE id = ?', [mv.insertId]);
    return {
      ...movement[0],
      previous_quantity: currentQuantity,
      new_quantity: newQuantity,
      portion_consumed: portionToConsume,
      portion_unit: portionUnit
    };
  });
}

module.exports = {
  Categories, Subcategories, ProductTypes, Units, Products, StockLocations, Stocks, StockMovements,
  Suppliers, Purchases, PurchaseItems,
  recordMovement, createPurchaseWithItems, lowStock, stockByProduct, getProductsWithStock, consumePortion, getStockQuantity,
};
