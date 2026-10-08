const { createCrudModel } = require('../models/crudFactory');
const { createCrudController } = require('./controllerFactory');
const { pool, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/apiResponse');

const alcoolTables = createCrudModel({
  table: 'alcool_tables',
  pk: 'id',
  fields: ['numero', 'capacite', 'statut'],
  sortable: ['id', 'numero', 'capacite', 'statut'],
});

const alcoolCashiers = createCrudModel({
  table: 'alcool_cashiers',
  pk: 'id',
  fields: ['nom', 'statut'],
  sortable: ['id', 'nom', 'statut'],
});

const alcoolSessions = createCrudModel({
  table: 'alcool_sessions',
  pk: 'id',
  fields: ['cashier_id', 'user_id', 'fond_initial', 'fond_final', 'ouverture_at', 'fermeture_at'],
  sortable: ['id', 'cashier_id', 'user_id'],
});

const alcoolProducts = createCrudModel({
  table: 'alcool_products',
  pk: 'id',
  fields: ['nom', 'ingredients', 'prix', 'categorie', 'alcool', 'type_produit', 'source_module'],
  sortable: ['id', 'nom', 'categorie'],
});

const tablesCrud = createCrudController(alcoolTables, { filterable: ['statut'] });
const cashiersCrud = createCrudController(alcoolCashiers, { filterable: ['statut'] });
const sessionsCrud = createCrudController(alcoolSessions, { filterable: ['cashier_id', 'user_id'] });

// Statuts valides pour une commande alcool (colonne alcool_orders.statut est un VARCHAR,
// donc on valide nous-mêmes côté application pour éviter des valeurs corrompues).
const VALID_ORDER_STATUTS = ['EN_ATTENTE', 'EN_PREPARATION', 'PRETE', 'SERVIE', 'ENCAISSEE'];

// Moyens de paiement valides pour une commande alcool.
const VALID_PAYMENT_METHODS = [
  'ESPECES',
  'CARTE',
  'TPE',
  'CREDIT',
  'EURO',
  'ORANGE_MONEY',
  'MVOLA',
  'DOLLAR',
  'VIREMENT',
  'CHEQUE',
];

async function findOrCreateClient(name, connection = pool) {
  const clientName = String(name || '').trim();
  if (!clientName) return null;
  const [existing] = await connection.query('SELECT id FROM alcool_clients WHERE nom = ? ORDER BY id ASC LIMIT 1', [clientName]);
  if (existing.length) return existing[0].id;
  const [result] = await connection.query("INSERT INTO alcool_clients (nom, statut) VALUES (?, 'ACTIF')", [clientName]);
  return result.insertId;
}

async function getAlcoolProductsWithStock() {
  const [rows] = await pool.query(`
    SELECT ap.*, asq.product_id, asq.quantite, asq.seuil_minimum, asq.unite
    FROM alcool_products ap
    LEFT JOIN alcool_stock asq ON asq.product_id = ap.id
    ORDER BY ap.id DESC
  `);
  return rows;
}

async function addAlcoolProductWithStock(data) {
  const nom = String(data.nom || '').trim();
  const categorie = String(data.categorie || data.category || 'Alcools').trim();
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
      'INSERT INTO alcool_products (nom, ingredients, prix, categorie, alcool, type_produit, source_module) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nom, ingredients, Number.isFinite(prix) ? prix : 0, categorie, alcool, 'PRODUIT_FINI', 'ALCOOL']
    );
    const productId = result.insertId;
    await conn.query(
      'INSERT INTO alcool_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, ?, ?, ?)',
      [productId, Number.isFinite(quantite) ? quantite : 0, Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite]
    );
    return { id: productId, nom, categorie, prix: Number.isFinite(prix) ? prix : 0, quantite: Number.isFinite(quantite) ? quantite : 0, seuil_minimum: Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite, ingredients, alcool };
  });
}

async function updateAlcoolProductWithStock(id, data) {
  const nom = String(data.nom || '').trim();
  const categorie = String(data.categorie || data.category || 'Alcools').trim();
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
    const [products] = await conn.query('SELECT id FROM alcool_products WHERE id = ? FOR UPDATE', [id]);
    if (!products.length) throw new Error(`Produit alcool #${id} introuvable`);

    await conn.query(
      'UPDATE alcool_products SET nom=?, ingredients=?, prix=?, categorie=?, alcool=?, type_produit=?, source_module=? WHERE id=?',
      [nom, ingredients, Number.isFinite(prix) ? prix : 0, categorie, alcool, 'PRODUIT_FINI', 'ALCOOL', id]
    );
    await conn.query(
      'INSERT INTO alcool_stock (product_id, quantite, seuil_minimum, unite) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantite=VALUES(quantite), seuil_minimum=VALUES(seuil_minimum), unite=VALUES(unite)',
      [id, Number.isFinite(quantite) ? quantite : 0, Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite]
    );
    return { id, nom, categorie, prix: Number.isFinite(prix) ? prix : 0, quantite: Number.isFinite(quantite) ? quantite : 0, seuil_minimum: Number.isFinite(seuil_minimum) ? seuil_minimum : 5, unite, ingredients, alcool };
  });
}

async function deleteAlcoolProductWithStock(id) {
  return withTransaction(async (conn) => {
    const [products] = await conn.query('SELECT id FROM alcool_products WHERE id = ? FOR UPDATE', [id]);
    if (!products.length) throw new Error(`Produit alcool #${id} introuvable`);

    await conn.query('DELETE FROM alcool_transactions WHERE product_id = ?', [id]);
    await conn.query('DELETE FROM alcool_stock WHERE product_id = ?', [id]);
    await conn.query('DELETE FROM alcool_products WHERE id = ?', [id]);
    return { id };
  });
}

const productsCrud = {
  list: async (req, res) => ok(res, await alcoolProducts.findAll({ orderBy: '`id` DESC' })),
  getOne: async (req, res) => {
    const item = await alcoolProducts.findById(req.params.id);
    if (!item) throw ApiError.notFound(`Produit alcool #${req.params.id} introuvable`);
    return ok(res, item);
  },
  create: async (req, res) => {
    const product = await addAlcoolProductWithStock(req.body);
    return created(res, product);
  },
  update: async (req, res) => {
    const { id } = req.params;
    const product = await updateAlcoolProductWithStock(id, req.body);
    return ok(res, product);
  },
  remove: async (req, res) => {
    const { id } = req.params;
    await deleteAlcoolProductWithStock(id);
    return ok(res, { message: 'Supprimé' });
  },
};

async function tablesStatsHandler(req, res) {
  const [stats] = await pool.query(`
    SELECT COUNT(*) AS total_tables,
           COALESCE(SUM(capacite),0) AS capacite_totale,
           SUM(CASE WHEN statut = 'LIBRE' THEN 1 ELSE 0 END) AS libres,
           SUM(CASE WHEN statut = 'OCCUPEE' THEN 1 ELSE 0 END) AS occupees,
           SUM(CASE WHEN statut = 'RESERVEE' THEN 1 ELSE 0 END) AS reservees,
           SUM(CASE WHEN statut = 'EN_COURS' THEN 1 ELSE 0 END) AS en_cours
    FROM alcool_tables
  `);
  return ok(res, stats[0] || { total_tables: 0, capacite_totale: 0, libres: 0, occupees: 0, reservees: 0, en_cours: 0 });
}

async function openCashierHandler(req, res) {
  const { cashier_id, user_id, fond_initial } = req.body;
  if (cashier_id === undefined || user_id === undefined || fond_initial === undefined) {
    throw ApiError.badRequest('cashier_id, user_id et fond_initial sont requis');
  }
  const [result] = await pool.query(
    'INSERT INTO alcool_sessions (cashier_id, user_id, fond_initial, ouverture_at) VALUES (?, ?, ?, NOW())',
    [cashier_id, user_id, Number(fond_initial)]
  );
  const [session] = await pool.query('SELECT * FROM alcool_sessions WHERE id = ? LIMIT 1', [result.insertId]);
  return created(res, { session_id: result.insertId, session: session[0] });
}

async function closeCashierHandler(req, res) {
  const { session_id, fond_final } = req.body;
  if (session_id === undefined || fond_final === undefined) {
    throw ApiError.badRequest('session_id et fond_final sont requis');
  }
  const [result] = await pool.query(
    'UPDATE alcool_sessions SET fond_final = ?, fermeture_at = NOW() WHERE id = ? AND fermeture_at IS NULL',
    [Number(fond_final), session_id]
  );
  if (!result.affectedRows) throw ApiError.notFound('Session non trouvée ou déjà fermée');
  return ok(res, { message: 'Session fermée' });
}

async function cashierStatusHandler(req, res) {
  const [cashiers] = await pool.query('SELECT * FROM alcool_cashiers ORDER BY id DESC');
  const enriched = [];
  for (const cashier of cashiers) {
    const [sessions] = await pool.query('SELECT * FROM alcool_sessions WHERE cashier_id = ? AND fermeture_at IS NULL ORDER BY id DESC LIMIT 1', [cashier.id]);
    enriched.push({ ...cashier, current_session: sessions[0] || null });
  }
  return ok(res, enriched);
}

async function openSessionsHandler(req, res) {
  const { cashier_id } = req.query;
  if (cashier_id) {
    const [sessions] = await pool.query('SELECT * FROM alcool_sessions WHERE cashier_id = ? AND fermeture_at IS NULL ORDER BY id DESC', [cashier_id]);
    return ok(res, sessions);
  }
  const [sessions] = await pool.query('SELECT * FROM alcool_sessions WHERE fermeture_at IS NULL ORDER BY id DESC');
  return ok(res, sessions);
}

async function sessionStatsHandler(req, res) {
  const [stats] = await pool.query(`
    SELECT COUNT(*) AS total_sessions,
           SUM(CASE WHEN fermeture_at IS NULL THEN 1 ELSE 0 END) AS sessions_ouvertes
    FROM alcool_sessions
  `);
  return ok(res, stats[0] || { total_sessions: 0, sessions_ouvertes: 0 });
}

async function currentSessionHandler(req, res) {
  const [rows] = await pool.query('SELECT * FROM alcool_sessions WHERE id = ? LIMIT 1', [req.params.id]);
  if (!rows[0]) throw ApiError.notFound(`Session #${req.params.id} introuvable`);
  return ok(res, rows[0]);
}

async function getBarStockHandler(req, res) {
  return ok(res, await getAlcoolProductsWithStock());
}

async function addBarStockHandler(req, res) {
  const product = await addAlcoolProductWithStock(req.body);
  return created(res, product);
}

async function updateBarStockHandler(req, res) {
  const { id } = req.params;
  const product = await updateAlcoolProductWithStock(id, req.body);
  return ok(res, product);
}

async function deleteBarStockHandler(req, res) {
  const { id } = req.params;
  await deleteAlcoolProductWithStock(id);
  return ok(res, { message: 'Supprimé' });
}

async function addTransactionHandler(req, res) {
  const { session_id, product_id, quantite, prix_unitaire } = req.body;
  if (product_id === undefined || quantite === undefined || prix_unitaire === undefined) {
    throw ApiError.badRequest('product_id, quantite et prix_unitaire sont requis');
  }
  const [result] = await pool.query(
    'INSERT INTO alcool_transactions (session_id, product_id, quantite, prix_unitaire, statut, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [session_id || null, product_id, Number(quantite), Number(prix_unitaire), 'EN_ATTENTE']
  );
  return created(res, { id: result.insertId, session_id, product_id, quantite, prix_unitaire });
}

async function latestTransactionsByProductHandler(req, res) {
  const { product_id } = req.query;
  const [rows] = await pool.query(
    `SELECT t.*, ap.nom, ap.prix FROM alcool_transactions t
     JOIN alcool_products ap ON ap.id = t.product_id
     WHERE t.product_id = ?
     ORDER BY t.created_at DESC LIMIT 1`,
    [product_id]
  );
  return ok(res, rows[0] || null);
}

async function listTransactionsHandler(req, res) {
  const [rows] = await pool.query(
    `SELECT t.*, ap.nom, ap.prix, ap.categorie FROM alcool_transactions t
     JOIN alcool_products ap ON ap.id = t.product_id
     ORDER BY t.created_at DESC LIMIT 50`
  );
  return ok(res, rows);
}

async function listBarOrdersHandler(req, res) {
  const [orders] = await pool.query('SELECT * FROM alcool_orders ORDER BY created_at DESC');
  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) return ok(res, []);

  const [items] = await pool.query('SELECT * FROM alcool_order_items WHERE order_id IN (?) ORDER BY id ASC', [orderIds]);
  const grouped = {};
  for (const item of items || []) {
    const orderId = item.order_id;
    if (!grouped[orderId]) grouped[orderId] = [];
    grouped[orderId].push(item);
  }

  const result = orders.map((order) => ({
    id: order.id,
    client: order.client_name,
    table: Number(order.table_id),
    nombre_personnes: Number(order.nombre_personnes || 1),
    moyen_paiement: order.moyen_paiement || 'ESPECES',
    statut: order.statut,
    total: Number(order.montant_total || 0),
    created_at: order.created_at,
    items: (grouped[order.id] || []).map((item) => ({
      nom: item.nom,
      quantite: Number(item.quantite || 1),
      prix: Number(item.prix || 0),
    })),
  }));

  return ok(res, result);
}

async function createBarOrderHandler(req, res) {
  const { client, table, nombre_personnes, moyen_paiement, items } = req.body || {};
  if (!client || table === undefined || !Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('client, table et items sont requis');
  }

  const parsedGuestCount = Number(nombre_personnes);
  const guestCount = Number.isInteger(parsedGuestCount) && parsedGuestCount > 0 ? parsedGuestCount : 1;

  const paymentMethod = VALID_PAYMENT_METHODS.includes(moyen_paiement) ? moyen_paiement : 'ESPECES';

  return withTransaction(async (conn) => {
    const requestedQuantities = new Map();
    for (const item of items) {
      const productId = Number(item.product_id ?? item.id);
      const quantity = Number(item.quantite || 1);
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        throw ApiError.badRequest('Chaque article doit avoir un produit et une quantité positive.');
      }
      requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
    }

    for (const [productId, quantity] of requestedQuantities) {
      const [stocks] = await conn.query(
        `SELECT asq.quantite, ap.nom
         FROM alcool_stock asq
         JOIN alcool_products ap ON ap.id = asq.product_id
         WHERE asq.product_id = ? FOR UPDATE`,
        [productId]
      );
      if (!stocks.length) throw ApiError.badRequest(`Stock introuvable pour le produit #${productId}.`);
      if (Number(stocks[0].quantite) < quantity) {
        throw ApiError.badRequest(`Stock insuffisant pour ${stocks[0].nom}. Disponible : ${stocks[0].quantite}.`);
      }
    }

    const total = (items || []).reduce((sum, item) => sum + Number(item.quantite || 1) * Number(item.prix || 0), 0);
    const [orderResult] = await conn.query(
      'INSERT INTO alcool_orders (client_name, table_id, nombre_personnes, moyen_paiement, statut, montant_total, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [client || null, table || null, guestCount, paymentMethod, 'EN_ATTENTE', total]
    );

    const orderId = orderResult.insertId;
    for (const [productId, quantity] of requestedQuantities) {
      await conn.query('UPDATE alcool_stock SET quantite = quantite - ? WHERE product_id = ?', [quantity, productId]);
    }

    for (const item of items) {
      await conn.query(
        'INSERT INTO alcool_order_items (order_id, nom, quantite, prix, created_at) VALUES (?, ?, ?, ?, NOW())',
        [orderId, item.nom || null, Number(item.quantite || 1), Number(item.prix || 0)]
      );
      await conn.query(
        'INSERT INTO alcool_transactions (session_id, client_id, table_id, order_id, product_id, quantite, prix_unitaire, statut, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [null, null, table || null, orderId, Number(item.product_id ?? item.id), Number(item.quantite || 1), Number(item.prix_unitaire ?? item.prix ?? 0), 'EN_ATTENTE']
      );
    }

    return {
      id: orderId,
      client,
      table: Number(table),
      nombre_personnes: guestCount,
      moyen_paiement: paymentMethod,
      statut: 'EN_ATTENTE',
      total,
      items: (items || []).map((item) => ({
        nom: item.nom,
        quantite: Number(item.quantite || 1),
        prix: Number(item.prix || 0),
      })),
    };
  }).then((order) => created(res, order));
}

async function deleteBarOrderHandler(req, res) {
  return withTransaction(async (conn) => {
    const [orders] = await conn.query('SELECT id FROM alcool_orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!orders.length) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);

    // Restock uniquement des articles liés à CETTE commande (via order_id),
    // et non plus basé sur une fenêtre temporelle approximative.
    const [transactions] = await conn.query(
      'SELECT product_id, quantite FROM alcool_transactions WHERE order_id = ?',
      [req.params.id]
    );
    for (const transaction of transactions || []) {
      await conn.query('UPDATE alcool_stock SET quantite = quantite + ? WHERE product_id = ?', [transaction.quantite, transaction.product_id]);
    }

    // alcool_order_items (FK ON DELETE CASCADE) et alcool_transactions.order_id
    // (FK ON DELETE CASCADE) sont supprimés automatiquement avec la commande.
    await conn.query('DELETE FROM alcool_orders WHERE id = ?', [req.params.id]);
    return { message: 'Commande supprimée' };
  }).then((result) => ok(res, result));
}

async function updateBarOrderStatusHandler(req, res) {
  const { statut } = req.body || {};
  if (!VALID_ORDER_STATUTS.includes(statut)) {
    throw ApiError.badRequest(`Statut invalide: ${statut}. Valeurs autorisées: ${VALID_ORDER_STATUTS.join(', ')}`);
  }

  const [orders] = await pool.query('SELECT id, statut FROM alcool_orders WHERE id = ? LIMIT 1', [req.params.id]);
  if (!orders.length) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);

  await pool.query('UPDATE alcool_orders SET statut = ? WHERE id = ?', [statut, req.params.id]);
  return ok(res, { id: Number(req.params.id), statut });
}

module.exports = {
  tablesCrud,
  cashiersCrud,
  sessionsCrud,
  productsCrud,
  tablesStatsHandler,
  openCashierHandler,
  closeCashierHandler,
  cashierStatusHandler,
  openSessionsHandler,
  sessionStatsHandler,
  currentSessionHandler,
  getBarStockHandler,
  addBarStockHandler,
  updateBarStockHandler,
  deleteBarStockHandler,
  addTransactionHandler,
  latestTransactionsByProductHandler,
  listTransactionsHandler,
  listBarOrdersHandler,
  createBarOrderHandler,
  deleteBarOrderHandler,
  updateBarOrderStatusHandler,
};