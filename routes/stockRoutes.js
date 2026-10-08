// routes/stockRoutes.js
const express = require('express');
const ctrl = require('../controllers/stockController');
const { createCrudRouter } = require('./routeFactory');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth);
const managementRoles = requireRole('admin', 'manager', 'stock_manager');

router.delete('/stocks/:id', managementRoles, ctrl.stocksCrud.remove);  // DELETE /api/stock/stocks/:id
router.use('/categories', managementRoles, createCrudRouter(ctrl.categoriesCrud));
router.use('/subcategories', managementRoles, createCrudRouter(ctrl.subcategoriesCrud));
router.use('/product-types', managementRoles, createCrudRouter(ctrl.productTypesCrud));
router.use('/units', managementRoles, createCrudRouter(ctrl.unitsCrud));
router.use('/products', managementRoles, createCrudRouter(ctrl.productsCrud));
router.use('/locations', createCrudRouter(ctrl.stockLocationsCrud)); // Read-only access to locations for all authenticated users

router.get('/alerts/low-stock', ctrl.lowStockHandler);            // GET /api/stock/alerts/low-stock?threshold=
router.get('/products/:id/stock', ctrl.stockByProductHandler);    // GET /api/stock/products/:id/stock
router.get('/stocks/with-products', ctrl.getProductsWithStockHandler); // GET /api/stock/stocks/with-products?location_id=
router.post('/products-with-stock', managementRoles, ctrl.createProductWithStockHandler);
router.delete('/stocks/:id', managementRoles, ctrl.deleteStockHandler);  // DELETE /api/stock/stocks/:id (custom handler for movement recording)
router.post('/stocks', managementRoles, ctrl.createStockHandler);
router.put('/stocks/:id', managementRoles, ctrl.updateStockHandler);
router.use('/stocks', createCrudRouter(ctrl.stocksCrud));

router.post('/movements', managementRoles, ctrl.movementHandler);                  // POST /api/stock/movements
// Product movement history endpoint (must be before generic movements router)
router.get('/movements/history', ctrl.productMovementHistoryHandler);       // GET /api/stock/movements/history?product_id=&location_id=
router.use('/movements', managementRoles, createCrudRouter(ctrl.stockMovementsCrud)); // Generic CRUD for movements

router.post('/consume-portion', managementRoles, ctrl.consumePortionHandler);       // POST /api/stock/consume-portion

router.use('/suppliers', managementRoles, createCrudRouter(ctrl.suppliersCrud));

router.post('/purchases', managementRoles, ctrl.createPurchaseHandler);            // POST /api/stock/purchases (avec lignes + réception auto)
router.use('/purchases', managementRoles, createCrudRouter(ctrl.purchasesCrud));
router.use('/purchase-items', managementRoles, createCrudRouter(ctrl.purchaseItemsCrud));

module.exports = router;
