const express = require('express');
const ctrl = require('../controllers/alcoolController');
const { createCrudRouter } = require('./routeFactory');

const router = express.Router();

// Stock alcool
router.get('/stock', ctrl.getBarStockHandler);
router.post('/stock', ctrl.addBarStockHandler);
router.put('/stock/:id', ctrl.updateBarStockHandler);
router.delete('/stock/:id', ctrl.deleteBarStockHandler);

// Products / Cocktails
router.use('/products', createCrudRouter(ctrl.productsCrud));

// Tables — stats route BEFORE CRUD so it doesn't get caught by/:id wildcard
router.get('/tables/stats', ctrl.tablesStatsHandler);
router.use('/tables', createCrudRouter(ctrl.tablesCrud));

// Cashiers
router.get('/cashier-status', ctrl.cashierStatusHandler);
router.use('/cashiers', createCrudRouter(ctrl.cashiersCrud));

// Sessions — all specific routes BEFORE CRUD middleware
router.post('/sessions/open', ctrl.openCashierHandler);
router.post('/sessions/close', ctrl.closeCashierHandler);
router.get('/sessions/open', ctrl.openSessionsHandler);
router.get('/sessions/stats', ctrl.sessionStatsHandler);
router.get('/sessions/:id', ctrl.currentSessionHandler);
router.use('/sessions', createCrudRouter(ctrl.sessionsCrud));

// Commandes alcool
router.get('/orders', ctrl.listBarOrdersHandler);
router.post('/orders', ctrl.createBarOrderHandler);
router.put('/orders/:id/status', ctrl.updateBarOrderStatusHandler);
router.delete('/orders/:id', ctrl.deleteBarOrderHandler);

// Transactions — commandes caisse
router.get('/transactions', ctrl.listTransactionsHandler);
router.post('/transactions', ctrl.addTransactionHandler);
router.get('/transactions/latest', ctrl.latestTransactionsByProductHandler);

module.exports = router;
