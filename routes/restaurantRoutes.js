// routes/restaurantRoutes.js
const express = require('express');
const ctrl = require('../controllers/restaurantController');
const { createCrudRouter } = require('./routeFactory');
const stockCtrl = require('../controllers/stockController');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
router.get('/reports/:date', requireAuth, ctrl.getRestaurantReportHandler);
router.post('/reports', requireAuth, requireRole('admin', 'manager', 'caisse', 'caissier'), ctrl.saveRestaurantReportHandler);
router.delete('/orders/:id', requireAuth, requireRole('admin'), ctrl.ordersCrud.remove);
router.get('/product-history', requireAuth, requireRole('admin'), ctrl.getProductHistoryHandler);
// Stock restaurant - same data as stock module, with labels needed for the interface.
router.get('/stock', ctrl.restaurantStockHandler);
router.get('/stock/movements', ctrl.restaurantStockMovementsHandler);
router.post('/stock/adjust', ctrl.adjustRestaurantStockHandler);
router.post('/stock/consume-portion', ctrl.consumeRestaurantPortionHandler);
// DELETE /api/restaurant/stock?id=... or ?product_id=...&location_id=...
router.delete('/stock', ctrl.removeRestaurantStockHandler);
router.use('/stock/locations', createCrudRouter(stockCtrl.stockLocationsCrud));
router.get('/products/next-code', ctrl.productsCrud.nextCode);
router.use('/products', createCrudRouter(ctrl.productsCrud));
router.use('/units', createCrudRouter(stockCtrl.unitsCrud));
router.use('/product-types', createCrudRouter(stockCtrl.productTypesCrud));
router.use('/categories', createCrudRouter(stockCtrl.categoriesCrud));
router.use('/subcategories', createCrudRouter(stockCtrl.subcategoriesCrud));
router.use('/suppliers', createCrudRouter(stockCtrl.suppliersCrud));
router.get('/purchases', ctrl.listRestaurantPurchasesHandler);
router.post('/purchases', ctrl.createRestaurantPurchaseHandler);
router.get('/purchases/:id', ctrl.restaurantPurchaseDetailHandler);

// Tables
router.use('/tables', createCrudRouter(ctrl.tablesCrud));

// Menu
router.get('/menu', ctrl.menuHandler);

// Orders - specific routes BEFORE CRUD
router.post('/orders', ctrl.createOrderHandler);
router.post('/orders/close-all', ctrl.closeAllRestaurantOrdersHandler);
router.get('/orders/in-progress', ctrl.ordersInProgressHandler);
router.get('/orders/history-total', ctrl.historyTotalHandler);
router.get('/orders/:id/invoice', ctrl.orderInvoiceHandler);
router.get('/orders/:id/invoice.pdf', ctrl.orderInvoicePdfHandler);
router.get('/orders/:id/detail', ctrl.orderDetailHandler);
router.put('/orders/:id', ctrl.updateOrderHandler);
router.put('/orders/:id/status', ctrl.updateOrderStatusHandler);
router.use('/orders', createCrudRouter(ctrl.ordersCrud));
router.use('/order-items', createCrudRouter(ctrl.orderItemsCrud));

// Recipes routes removed

// Cashiers & Sessions
router.post('/cashier/open', ctrl.openCashierHandler);
router.post('/cashier/close', ctrl.closeCashierHandler);
router.get('/cashier/status', ctrl.cashierStatusHandler);
router.use('/cashiers', createCrudRouter(ctrl.cashiersCrud));
router.use('/sessions', createCrudRouter(ctrl.sessionsCrud));

// Payments
router.post('/payments', ctrl.processPaymentHandler);
router.post('/bill-to-room', ctrl.billToRoomHandler);

// Stats
router.get('/stats', ctrl.statsHandler);

module.exports = router;
