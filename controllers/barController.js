// controllers/barController.js
const { BarTables, tablesStats, ensureDefaultBarTables } = require('../models/barTables.model');
const { BarCashiers, openCashierSession, closeCashierSession, getCurrentSession } = require('../models/barCashier.model');
const { BarSessions, sessionStats } = require('../models/barSession.model');
const barProductModel = require('../models/barProduct.model');
const { addTransaction } = require('../models/barTransaction.model');
const { getBarReport, saveBarReport } = require('../models/barReport.model');
const { listBarOrders, listBarHistory, createBarOrder, updateBarOrder, deleteBarOrder, updateBarOrderStatus, closeAllBarOrders } = require('../models/barOrder.model');
const { getProductHistory } = require('../models/barProductHistory.model');
const barEquipmentModel = require('../models/barEquipment.model');
const { createCrudController } = require('./controllerFactory');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/apiResponse');

const tablesCrud = {
  ...createCrudController(BarTables, { filterable: ['statut'] }),
  list: async (req, res) => {
    await ensureDefaultBarTables();
    return createCrudController(BarTables, { filterable: ['statut'] }).list(req, res);
  },
};
const cashiersCrud = createCrudController(BarCashiers, { filterable: ['statut'] });
const sessionsCrud = createCrudController(BarSessions, { filterable: ['cashier_id', 'user_id'] });
const barEquipmentsBaseCrud = createCrudController(barEquipmentModel);

function normalizeBarEquipment(body = {}, partial = false) {
  const data = {};
  if (!partial || body.nom !== undefined) {
    data.nom = String(body.nom || '').trim();
    if (!data.nom) throw ApiError.badRequest('Le nom de l’équipement est requis');
  }
  if (!partial || body.categorie !== undefined) data.categorie = String(body.categorie || 'Divers').trim() || 'Divers';
  if (!partial || body.description !== undefined) data.description = String(body.description || '').trim();
  if (!partial || body.quantite !== undefined) {
    data.quantite = Number(body.quantite ?? 1);
    if (!Number.isInteger(data.quantite) || data.quantite < 0) {
      throw ApiError.badRequest('La quantité doit être un entier positif ou nul');
    }
  }
  if (!partial || body.etat !== undefined) {
    data.etat = String(body.etat || 'EN_SERVICE');
    if (!['EN_SERVICE', 'A_REPARER', 'HORS_SERVICE'].includes(data.etat)) {
      throw ApiError.badRequest('État d’équipement invalide');
    }
  }
  return data;
}

const barEquipmentsCrud = {
  ...barEquipmentsBaseCrud,
  list: async (req, res) => ok(res, await barEquipmentModel.findAll({ orderBy: '`nom` ASC' })),
  create: async (req, res) => created(res, await barEquipmentModel.create(normalizeBarEquipment(req.body))),
  update: async (req, res) => {
    const { id } = req.params;
    if (!await barEquipmentModel.findById(id)) throw ApiError.notFound(`Équipement bar #${id} introuvable`);
    return ok(res, await barEquipmentModel.update(id, normalizeBarEquipment(req.body, true)));
  },
};

const productsCrud = {
  ...createCrudController(barProductModel.barProducts, { filterable: ['categorie', 'alcool'] }),
  list: async (req, res) => {
    const products = await barProductModel.getBarProductsWithStock();
    return ok(res, products);
  },
  create: async (req, res) => {
    const product = await barProductModel.addBarProductWithStock(req.body);
    return created(res, product);
  },
  update: async (req, res) => {
    const { id } = req.params;
    const product = await barProductModel.updateBarProductWithStock(id, req.body);
    return ok(res, product);
  },
  delete: async (req, res) => {
    const { id } = req.params;
    await barProductModel.deleteBarProductWithStock(id);
    return ok(res, { message: 'Supprimé' });
  },
  remove: async (req, res) => {
    const { id } = req.params;
    await barProductModel.deleteBarProductWithStock(id);
    return ok(res, { message: 'Supprimé' });
  }
};

async function tablesStatsHandler(req, res) {
  const stats = await tablesStats();
  return ok(res, stats);
}

async function openCashierHandler(req, res) {
  const { cashier_id, user_id, fond_initial } = req.body;
  if (cashier_id === undefined || user_id === undefined || fond_initial === undefined) {
    throw ApiError.badRequest('cashier_id, user_id et fond_initial sont requis');
  }
  const sessionId = await openCashierSession({ cashier_id, user_id, fond_initial });
  const session = await BarSessions.findById(sessionId);
  return created(res, { session_id: sessionId, session });
}

async function closeCashierHandler(req, res) {
  const { session_id, fond_final } = req.body;
  if (session_id === undefined || fond_final === undefined) {
    throw ApiError.badRequest('session_id et fond_final sont requis');
  }
  const closed = await closeCashierSession(session_id, fond_final);
  if (!closed) throw ApiError.notFound('Session non trouvée ou déjà fermée');
  return ok(res, { message: 'Session fermée' });
}

async function cashierStatusHandler(req, res) {
  const cashiers = await BarCashiers.findAll();
  for (const cashier of cashiers) {
    cashier.current_session = await getCurrentSession(cashier.id);
  }
  return ok(res, cashiers);
}

async function openSessionsHandler(req, res) {
  const { cashier_id } = req.query;
  let sessions;
  if (cashier_id) {
    sessions = await BarSessions.findAll({ whereSql: 'WHERE cashier_id = ? AND fermeture_at IS NULL', whereValues: [cashier_id] });
  } else {
    const allSessions = await BarSessions.findAll({ whereSql: 'WHERE fermeture_at IS NULL' });
    sessions = allSessions;
  }
  return ok(res, sessions);
}

async function sessionStatsHandler(req, res) {
  const stats = await sessionStats();
  return ok(res, stats);
}

async function currentSessionHandler(req, res) {
  const session = await BarSessions.findById(req.params.id);
  if (!session) throw ApiError.notFound(`Session #${req.params.id} introuvable`);
  return ok(res, session);
}

async function getBarStockHandler(req, res) {
  const stock = await barProductModel.getBarProductsWithStock();
  return ok(res, stock);
}

async function addBarStockHandler(req, res) {
  const product = await barProductModel.addBarProductWithStock(req.body);
  return created(res, product);
}

async function updateBarStockHandler(req, res) {
  const { id } = req.params;
  const product = await barProductModel.updateBarProductWithStock(id, req.body);
  return ok(res, product);
}

async function deleteBarStockHandler(req, res) {
  const { id } = req.params;
  await barProductModel.deleteBarProductWithStock(id);
  return ok(res, { message: 'Supprimé' });
}

async function addTransactionHandler(req, res) {
  const { session_id, product_id, quantite, prix_unitaire } = req.body;
  if (product_id === undefined || quantite === undefined || prix_unitaire === undefined) {
    throw ApiError.badRequest('product_id, quantite et prix_unitaire sont requis');
  }
  const transaction = await addTransaction({ session_id, product_id, quantite, prix_unitaire });
  return created(res, transaction);
}

async function latestTransactionsByProductHandler(req, res) {
  const { product_id } = req.query;
  const { pool } = require('../config/db');
  const [rows] = await pool.query(
    `SELECT t.*, bp.nom, bp.prix FROM bar_transactions t
     JOIN bar_products bp ON bp.id = t.product_id
     WHERE t.product_id = ? AND t.statut = 'PAYEE'
     ORDER BY t.created_at DESC LIMIT 1`,
    [product_id]
  );
  return ok(res, rows[0] || null);
}

async function listTransactionsHandler(req, res) {
  const { pool } = require('../config/db');
  const [rows] = await pool.query(
    `SELECT t.*, bp.nom, bp.prix, bp.categorie FROM bar_transactions t
     JOIN bar_products bp ON bp.id = t.product_id
     JOIN bar_orders bo ON bo.id = t.order_id
     WHERE t.statut = 'PAYEE' AND bo.statut <> 'CLOTUREE'
     ORDER BY t.created_at DESC LIMIT 50`
  );
  return ok(res, rows);
}

async function listBarOrdersHandler(req, res) {
  const orders = await listBarOrders({ createdBy: req.user?.role === 'hotesse' ? req.user.id_admin : undefined });
  return ok(res, orders);
}

async function listBarHistoryHandler(req, res) {
  return ok(res, await listBarHistory());
}

async function getBarReportHandler(req, res) {
  return ok(res, await getBarReport(req.params.date));
}

async function saveBarReportHandler(req, res) {
  const { reportDate, personnel, manual, metrics } = req.body || {};
  const report = await saveBarReport({
    reportDate,
    personnel,
    manual,
    metrics,
    createdBy: req.user?.id_admin ?? null,
  });
  return ok(res, report);
}

async function getProductHistoryHandler(req, res) {
  const { dateFrom, dateTo, productName } = req.query;
  const history = await getProductHistory({ dateFrom, dateTo, productName });
  return ok(res, history);
}

function normalizeBarOrderRequest(body = {}) {
  const { client, table, nombre_personnes, moyen_paiement, observation, items, hotel_reservation_id, room_id, room_guest_name, room_account_paid } = body;
  const safeTableValue = Number(table);
  const safeGuestCount = Number(nombre_personnes || 1);
  const safePayment = String(moyen_paiement || 'ESPECES').trim().toUpperCase();
  const safeItems = Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        product_id: Number(item?.product_id ?? item?.id ?? 0),
        quantite: Number(item?.quantite ?? 1),
        prix: Number(item?.prix ?? item?.prix_unitaire ?? 0),
        prix_unitaire: Number(item?.prix_unitaire ?? item?.prix ?? 0),
      }))
    : [];

  if (table === undefined || !Array.isArray(items) || safeItems.length === 0) {
    throw ApiError.badRequest('table et items sont requis');
  }
  if (!Number.isInteger(safeTableValue) || safeTableValue < 0) {
    throw ApiError.badRequest('table doit être un entier valide');
  }
  if (!Number.isInteger(safeGuestCount) || safeGuestCount < 1) {
    throw ApiError.badRequest('nombre_personnes doit être un entier positif');
  }
  if (safePayment && !['ESPECES', 'CREDIT', 'TPE', 'ORANGE_MONEY', 'MVOLA', 'GRATUIT'].includes(safePayment)) {
    throw ApiError.badRequest('Mode de paiement invalide');
  }

  return {
    client: typeof client === 'string' ? client : 'Client anonyme',
    table: safeTableValue,
    nombre_personnes: safeGuestCount,
    moyen_paiement: safePayment,
    observation: typeof observation === 'string' ? observation.trim() : '',
    items: safeItems,
    hotel_reservation_id: hotel_reservation_id ?? null,
    room_id: room_id ?? null,
    room_guest_name: room_guest_name ?? null,
    room_account_paid: Boolean(room_account_paid),
  };
}

async function createBarOrderHandler(req, res) {
  await ensureDefaultBarTables();
  const normalized = normalizeBarOrderRequest(req.body || {});
  const order = await createBarOrder({
    clientName: normalized.client,
    tableId: normalized.table,
    nombrePersonnes: normalized.nombre_personnes,
    moyenPaiement: normalized.moyen_paiement,
    observation: normalized.observation,
    items: normalized.items,
    createdBy: req.user?.id_admin,
    hotelReservationId: normalized.hotel_reservation_id,
    roomId: normalized.room_id,
    roomGuestName: normalized.room_guest_name,
    roomAccountPaid: normalized.room_account_paid,
  });
  return created(res, order);
}

async function updateBarOrderHandler(req, res) {
  const normalized = normalizeBarOrderRequest(req.body || {});
  const order = await updateBarOrder(req.params.id, {
    clientName: normalized.client,
    tableId: normalized.table,
    nombrePersonnes: normalized.nombre_personnes,
    moyenPaiement: normalized.moyen_paiement,
    observation: normalized.observation,
    items: normalized.items,
    createdBy: req.user?.role === 'hotesse' ? req.user.id_admin : undefined,
    hotelReservationId: normalized.hotel_reservation_id,
    roomId: normalized.room_id,
    roomGuestName: normalized.room_guest_name,
    roomAccountPaid: normalized.room_account_paid,
  });

  if (!order) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);
  return ok(res, order);
}

async function deleteBarOrderHandler(req, res) {
  const deleted = await deleteBarOrder(req.params.id);
  if (!deleted) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);
  return ok(res, { message: 'Commande supprimée' });
}

async function updateBarOrderStatusHandler(req, res) {
  const { statut, moyen_paiement } = req.body || {};
  const allowedPayments = ['ESPECES', 'CREDIT', 'TPE', 'ORANGE_MONEY', 'MVOLA', 'GRATUIT'];
  if (moyen_paiement && !allowedPayments.includes(moyen_paiement)) {
    throw ApiError.badRequest('Mode de paiement invalide');
  }
  const order = await updateBarOrderStatus(req.params.id, statut, moyen_paiement);
  if (!order) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);
  return ok(res, order);
}

async function closeAllBarOrdersHandler(req, res) {
  const { order_ids } = req.body || {};
  if (order_ids !== undefined && !Array.isArray(order_ids)) {
    throw ApiError.badRequest('order_ids doit être un tableau');
  }
  const result = await closeAllBarOrders(order_ids || []);
  return ok(res, result);
}

module.exports = {
  tablesCrud, cashiersCrud, sessionsCrud, productsCrud, barEquipmentsCrud,
  tablesStatsHandler, openCashierHandler, closeCashierHandler,
  cashierStatusHandler, openSessionsHandler, sessionStatsHandler,
  currentSessionHandler, getBarStockHandler,
  addBarStockHandler, updateBarStockHandler, deleteBarStockHandler,
  addTransactionHandler, latestTransactionsByProductHandler, listTransactionsHandler,
  listBarOrdersHandler, listBarHistoryHandler, getBarReportHandler, saveBarReportHandler,
  getProductHistoryHandler,
  createBarOrderHandler, updateBarOrderHandler, deleteBarOrderHandler, updateBarOrderStatusHandler, closeAllBarOrdersHandler,
  normalizeBarOrderRequest,
};