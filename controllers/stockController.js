// controllers/stockController.js
const stock = require('../models/stockModel');
const { withTransaction } = require('../config/db');
const { createCrudController } = require('./controllerFactory');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/apiResponse');

// CRUD génériques générés par le controllerFactory
const categoriesCrud = createCrudController(stock.Categories, {});
const subcategoriesCrud = createCrudController(stock.Subcategories, { filterable: ['category_id'] });
const productTypesCrud = createCrudController(stock.ProductTypes, { filterable: ['actif'] });
const unitsCrud = createCrudController(stock.Units, {});
const productsCrud = createCrudController(stock.Products, { filterable: ['category_id', 'subcategory_id', 'actif', 'type_produit'] });
const stockLocationsCrud = createCrudController(stock.StockLocations, {});
const stocksCrud = createCrudController(stock.Stocks, { filterable: ['product_id', 'location_id'] });
const stockMovementsCrud = createCrudController(stock.StockMovements, { filterable: ['product_id', 'location_id', 'type_mouvement', 'source_module'] });
const suppliersCrud = createCrudController(stock.Suppliers, {});
const purchasesCrud = createCrudController(stock.Purchases, { filterable: ['supplier_id', 'statut'] });
const purchaseItemsCrud = createCrudController(stock.PurchaseItems, { filterable: ['purchase_id'] });

// Override stocksCrud.remove to use our custom delete handler
const stocksCrudRemove = stocksCrud.remove;
stocksCrud.remove = async function(req, res, next) {
  return await deleteStockHandler(req, res, next);
};

function validateStockPayload(body) {
  if (body.quantite !== undefined && (!Number.isFinite(Number(body.quantite)) || Number(body.quantite) < 0)) {
    throw ApiError.badRequest('La quantité de stock doit être positive ou nulle');
  }
  if (body.seuil_minimum !== undefined && (!Number.isFinite(Number(body.seuil_minimum)) || Number(body.seuil_minimum) < 0)) {
    throw ApiError.badRequest('Le seuil minimum doit être positif ou nul');
  }
}

async function createStockHandler(req, res) {
  validateStockPayload(req.body);
  const productId = Number(req.body.product_id);
  const locationId = Number(req.body.location_id);
  const quantity = Number(req.body.quantite || 0);
  if (!productId || !locationId) throw ApiError.badRequest('product_id et location_id sont requis');
  if (locationId === 5 && (!Number.isInteger(quantity) || !Number.isInteger(Number(req.body.seuil_minimum ?? 0)))) {
    throw ApiError.badRequest('La quantité et le seuil du stock hôtel doivent être des nombres entiers');
  }

  const stockRow = await withTransaction(async (conn) => {
    const [existing] = await conn.query(
      'SELECT id FROM stocks WHERE product_id = ? AND location_id = ? FOR UPDATE',
      [productId, locationId]
    );
    if (existing.length) {
      throw ApiError.conflict('Un stock existe déjà pour ce produit à cet emplacement. Utilisez PUT pour le mettre à jour.');
    }

    await conn.query(
      'INSERT INTO stocks (product_id, location_id, quantite, seuil_minimum) VALUES (?, ?, 0, ?)',
      [productId, locationId, Number(req.body.seuil_minimum || 0)]
    );
    if (quantity > 0) {
      await stock.recordMovement({
        productId,
        locationId,
        type: 'ENTREE',
        quantite: quantity,
        sourceModule: 'STOCK_MANUEL',
        motif: 'Création stock',
        userId: req.user?.id_admin || req.user?.id,
        conn,
      });
    }
    const [rows] = await conn.query(
      'SELECT * FROM stocks WHERE product_id = ? AND location_id = ? LIMIT 1',
      [productId, locationId]
    );
    return rows[0];
  });
  return created(res, stockRow);
}

async function createProductWithStockHandler(req, res) {
  const { nom, categorie, code, unite, prix_vente, quantite, seuil_minimum, location_id } = req.body;
  const productName = String(nom || '').trim();
  const categoryName = String(categorie || '').trim();
  const quantity = Number(quantite ?? 0);
  const price = Number(prix_vente ?? 0);
  const threshold = Number(seuil_minimum ?? 5);
  const locationId = Number(location_id);
  const sourceModule = locationId === 5 ? 'HOTEL' : locationId === 3 ? 'BAR' : locationId === 2 ? 'RESTAURANT' : 'GENERAL';
  if (!productName || !categoryName || !locationId) {
    throw ApiError.badRequest('nom, categorie et location_id sont requis');
  }
  if (![quantity, price, threshold].every(Number.isFinite) || quantity < 0 || price < 0 || threshold < 0) {
    throw ApiError.badRequest('La quantité, le prix et le seuil doivent être positifs ou nuls');
  }
  if (locationId === 5 && (!Number.isInteger(quantity) || !Number.isInteger(threshold))) {
    throw ApiError.badRequest('La quantité et le seuil du stock hôtel doivent être des nombres entiers');
  }

  const result = await withTransaction(async (conn) => {
    const [categoryRows] = await conn.query(
      'SELECT id FROM categories WHERE nom COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci ORDER BY id LIMIT 1 FOR UPDATE',
      [categoryName]
    );
    let categoryId = categoryRows[0]?.id;
    if (!categoryId) {
      const [categoryResult] = await conn.query('INSERT INTO categories (nom) VALUES (?)', [categoryName]);
      categoryId = categoryResult.insertId;
    }

    const productCode = String(code || `HOTEL-${Date.now()}`).trim();
    const [productResult] = await conn.query(
      `INSERT INTO products (category_id, code, nom, unite, prix_vente, actif, type_produit, source_module)
       VALUES (?, ?, ?, ?, ?, 1, 'CONSOMMABLE', ?)`,
      [categoryId, productCode, productName, unite || 'unités', price, sourceModule]
    );
    const productId = productResult.insertId;
    await conn.query(
      'INSERT INTO stocks (product_id, location_id, quantite, seuil_minimum) VALUES (?, ?, 0, ?)',
      [productId, locationId, threshold]
    );
    if (quantity > 0) {
      await stock.recordMovement({
        productId,
        locationId,
        type: 'ENTREE',
        quantite: quantity,
        sourceModule: 'STOCK_MANUEL',
        motif: 'Création produit et stock hôtel',
        userId: req.user?.id_admin || req.user?.id,
        conn,
      });
    }
    const [rows] = await conn.query(
      `SELECT s.*, p.nom AS product_nom, p.unite AS product_unite, p.prix_vente,
              p.category_id, p.type_produit
       FROM stocks s JOIN products p ON p.id = s.product_id WHERE s.product_id = ? AND s.location_id = ?`,
      [productId, locationId]
    );
    return rows[0];
  });
  return created(res, result);
}

async function updateStockHandler(req, res) {
  validateStockPayload(req.body);
  const updatedStock = await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM stocks WHERE id = ? FOR UPDATE', [req.params.id]);
    const existing = rows[0];
    if (!existing) throw ApiError.notFound(`stocks #${req.params.id} introuvable`);
    if (req.body.quantite !== undefined) {
      if (Number(existing.location_id) === 5 && !Number.isInteger(Number(req.body.quantite))) {
        throw ApiError.badRequest('La quantité du stock hôtel doit être un nombre entier');
      }
      const difference = Number(req.body.quantite) - Number(existing.quantite || 0);
      if (difference !== 0) {
        await stock.recordMovement({
          productId: existing.product_id,
          locationId: existing.location_id,
          type: difference > 0 ? 'ENTREE' : 'SORTIE',
          quantite: Math.abs(difference),
          sourceModule: 'STOCK_MANUEL',
          motif: 'Modification manuelle',
          userId: req.user?.id_admin || req.user?.id,
          conn,
        });
      }
    }
    if (req.body.seuil_minimum !== undefined) {
      if (Number(existing.location_id) === 5 && !Number.isInteger(Number(req.body.seuil_minimum))) {
        throw ApiError.badRequest('Le seuil du stock hôtel doit être un nombre entier');
      }
      await conn.query('UPDATE stocks SET seuil_minimum = ? WHERE id = ?', [Number(req.body.seuil_minimum), req.params.id]);
    }
    const [updated] = await conn.query('SELECT * FROM stocks WHERE id = ?', [req.params.id]);
    return updated[0];
  });
  return ok(res, updatedStock);
}

async function deleteStockHandler(req, res) {
  const id = req.params.id;
  const existing = await stock.Stocks.findById(id);
  if (!existing) throw ApiError.notFound(`stocks #${id} introuvable`);
  
  // Record movement for the remaining quantity before deletion
  const remainingQuantity = Number(existing.quantite || 0);
  if (remainingQuantity > 0) {
    try {
      await stock.recordMovement({
        productId: existing.product_id,
        locationId: existing.location_id,
        type: 'SORTIE',
        quantite: remainingQuantity,
        sourceModule: 'STOCK_MANUEL',
        motif: 'Suppression stock',
        userId: req.user?.id_admin || req.user?.id,
        allowNegative: true
      });
    } catch (err) {
      console.error('Error recording movement for stock deletion:', err);
      // Don't fail the deletion if movement fails
    }
  }
  
  // Delete the stock row
  await stock.Stocks.remove(id);
  return ok(res, { message: 'Stock supprimé avec succès' });
}

/**
 * Enregistre un mouvement de stock manuel ou provenant d'un module tiers
 */
async function movementHandler(req, res, next) {
  try {
    const { product_id, location_id, type, quantite, source_module, reference_id } = req.body;

    if (!product_id || !location_id || !type || quantite === undefined) {
      throw ApiError.badRequest('product_id, location_id, type et quantite sont requis');
    }

    if (isNaN(quantite) || Number(quantite) <= 0) {
      throw ApiError.badRequest('La quantité doit être un nombre positif supérieur à 0');
    }

    const movement = await stock.recordMovement({
      productId: product_id,
      locationId: location_id,
      type,
      quantite: Number(quantite),
      sourceModule: source_module,
      referenceId: reference_id,
    });

    return created(res, movement);
  } catch (err) {
    next(err);
  }
}

/**
 * Crée un bon d'achat avec ses articles associés
 */
async function createPurchaseHandler(req, res, next) {
  try {
    const { supplier_id, location_id, items, source_module } = req.body;

    if (!supplier_id || !location_id || !Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest('supplier_id, location_id et un tableau items non vide sont requis');
    }

    const purchase = await stock.createPurchaseWithItems({
      supplierId: supplier_id,
      locationId: location_id,
      items,
      sourceModule: source_module || 'GENERAL',
    });

    return created(res, purchase);
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère les produits sous le seuil de stock minimal
 */
async function lowStockHandler(req, res, next) {
  try {
    const threshold = Math.max(0, Number(req.query.threshold) || 10);
    const rows = await stock.lowStock(threshold);
    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère l'état des stocks d'un produit spécifique
 */
async function stockByProductHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      throw ApiError.badRequest('L\'ID du produit est requis');
    }
    const rows = await stock.stockByProduct(id);
    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère les stocks avec informations produits
 */
async function getProductsWithStockHandler(req, res, next) {
  try {
    const location_id = req.query.location_id ? Number(req.query.location_id) : null;
    const rows = await stock.getProductsWithStock(location_id);
    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Consomme une portion d'un produit (stock basé sur les portions)
 */
async function consumePortionHandler(req, res, next) {
  try {
    const { product_id, location_id, portion_size, portion_unit, reference_id, source_module } = req.body;

    if (!product_id || !location_id || portion_size === undefined) {
      throw ApiError.badRequest('product_id, location_id et portion_size sont requis');
    }

    if (isNaN(portion_size) || Number(portion_size) <= 0) {
      throw ApiError.badRequest('La portion doit être un nombre positif');
    }

    const result = await stock.consumePortion({
      productId: product_id,
      locationId: location_id,
      portionSize: portion_size,
      portionUnit: portion_unit,
      referenceId: reference_id,
      sourceModule: source_module,
    });

    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère l'historique des mouvements de stock d'un produit avec solde courant
 */
async function productMovementHistoryHandler(req, res, next) {
  try {
    const { pool } = require('../config/db');
    const { product_id, q, location_id, start_date, end_date, date, type, limit = 200, offset = 0 } = req.query;

    // Validate and parse parameters
    const productId = product_id ? Number(product_id) : null;
    const locationFilter = location_id ? 'AND m.location_id = ?' : '';
    const locationValue = location_id ? Number(location_id) : null;
    
    const params = [];
    
    // Build query dynamically based on filters
    let sql = `
      SELECT 
        m.id,
        m.product_id,
        m.location_id,
        m.type_mouvement,
        m.quantite,
        m.source_module,
        m.reference_id,
        m.created_at,
        m.stock_after,
        m.motif,
        m.user_id,
        p.nom AS product_nom,
        p.unite AS product_unite,
        sl.nom AS location_nom,
        u.nom AS user_nom,
        CASE 
          WHEN m.type_mouvement = 'ENTREE' THEN m.quantite
          ELSE 0
        END AS entree,
        CASE 
          WHEN m.type_mouvement = 'SORTIE' THEN m.quantite
          ELSE 0
        END AS sortie
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN stock_locations sl ON sl.id = m.location_id
      LEFT JOIN users u ON u.id_admin = m.user_id
      WHERE 1=1
    `;
    
    if (productId) {
      sql += ' AND m.product_id = ?';
      params.push(productId);
    } else if (q) {
      sql += ' AND p.nom LIKE ?';
      params.push(`%${q}%`);
    }
    
    if (start_date && end_date) {
      sql += ' AND DATE(m.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (date) {
      sql += ' AND DATE(m.created_at) = ?';
      params.push(date);
    }
    
    if (type && (type === 'ENTREE' || type === 'SORTIE')) {
      sql += ' AND m.type_mouvement = ?';
      params.push(type);
    }
    
    if (locationValue) {
      sql += ' AND m.location_id = ?';
      params.push(locationValue);
    }
    
    const limitNum = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    const offsetNum = Math.max(Number(offset) || 0, 0);
    sql += ' ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);
    
    const [movements] = await pool.query(sql, params);

    // Calculate stock_after for rows where it's NULL
    // Get current stock for the product/location
    let currentStock = 0;
    if (productId && locationValue) {
      const [stockRows] = await pool.query(
        'SELECT quantite FROM stocks WHERE product_id = ? AND location_id = ?',
        [productId, locationValue]
      );
      currentStock = stockRows[0] ? Number(stockRows[0].quantite) : 0;
    }

    // For each movement, calculate stock_after if NULL
    // Stock after = current stock - sum of signed quantities of movements AFTER this one
    const movementsWithBalance = movements.map((movement, index) => {
      if (movement.stock_after !== null) {
        return movement;
      }

      // Calculate stock after by summing movements that are newer
      const signedQty = movement.type_mouvement === 'SORTIE' ? -Number(movement.quantite) : Number(movement.quantite);
      let newerMovementsSum = 0;
      
      for (let i = 0; i < index; i++) {
        const m = movements[i];
        const qty = m.type_mouvement === 'SORTIE' ? -Number(m.quantite) : Number(m.quantite);
        newerMovementsSum += qty;
      }

      const calculatedStockAfter = currentStock - newerMovementsSum;
      return {
        ...movement,
        stock_after: calculatedStockAfter
      };
    });

    // Add reference labels when resolvable
    const movementsWithLabels = movementsWithBalance.map(movement => {
      let referenceLabel = null;
      if (movement.reference_id && movement.source_module) {
        switch (movement.source_module) {
          case 'EQUIPEMENT':
            referenceLabel = `Équipement #${movement.reference_id}`;
            break;
          case 'EQUIPEMENT_CHAMBRE':
            referenceLabel = `Affectation équipement chambre #${movement.reference_id}`;
            break;
          case 'MAINTENANCE':
            referenceLabel = `Maintenance #${movement.reference_id}`;
            break;
          case 'MENAGE':
            referenceLabel = `Ménage #${movement.reference_id}`;
            break;
          default:
            referenceLabel = null;
        }
      }
      return {
        ...movement,
        reference_label: referenceLabel
      };
    });

    // Calculate summary statistics from the movements themselves
    let totalEntrees = 0;
    let totalSorties = 0;
    
    movementsWithLabels.forEach(m => {
      totalEntrees += Number(m.entree || 0);
      totalSorties += Number(m.sortie || 0);
    });

    // Get current stock for the filtered product/location if specified
    let stockActuel = 0;
    if (productId && locationValue) {
      const [stockRows] = await pool.query(
        'SELECT quantite FROM stocks WHERE product_id = ? AND location_id = ?',
        [productId, locationValue]
      );
      stockActuel = stockRows[0] ? Number(stockRows[0].quantite) : 0;
    }

    // Calculate stock_debut_periode and stock_fin_periode
    // stock_debut_periode = stock at the start of the period (before the oldest movement in results)
    // stock_fin_periode = stock at the end of the period (after the newest movement in results)
    let stockDebutPeriode = 0;
    let stockFinPeriode = 0;

    if (movementsWithLabels.length > 0 && productId && locationValue) {
      // stock_fin_periode is just the current stock
      stockFinPeriode = stockActuel;

      // stock_debut_periode = current stock - sum of all movements in the period
      const periodNetChange = totalEntrees - totalSorties;
      stockDebutPeriode = stockActuel - periodNetChange;
    }

    return ok(res, {
      data: movementsWithLabels,
      meta: {
        total_entrees: totalEntrees,
        total_sorties: totalSorties,
        stock_actuel: stockActuel,
        stock_debut_periode: stockDebutPeriode,
        stock_fin_periode: stockFinPeriode,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  categoriesCrud,
  subcategoriesCrud,
  productTypesCrud,
  unitsCrud,
  productsCrud,
  stockLocationsCrud,
  stocksCrud,
  stockMovementsCrud,
  suppliersCrud,
  purchasesCrud,
  purchaseItemsCrud,
  movementHandler,
  createPurchaseHandler,
  lowStockHandler,
  stockByProductHandler,
  getProductsWithStockHandler,
  createStockHandler,
  createProductWithStockHandler,
  updateStockHandler,
  deleteStockHandler,
  consumePortionHandler,
  productMovementHistoryHandler,
};
