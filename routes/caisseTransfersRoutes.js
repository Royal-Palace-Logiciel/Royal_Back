// routes/caisseTransfersRoutes.js
//
// Monté à part de casinoRoutes (module transversal, pas propre au casino) :
//   app.use('/api/caisse-transfers', require('./routes/caisseTransfersRoutes'));

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/caisseTransfersController');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);

router.get('/', ctrl.listCaisseTransfersHandler);                                  // GET  /api/caisse-transfers?module=&statut=
router.get('/:id', ctrl.getCaisseTransferHandler);                                 // GET  /api/caisse-transfers/:id
router.post('/', ctrl.createCaisseTransferHandler);                                // POST /api/caisse-transfers
router.post('/:id/confirm', ctrl.confirmCaisseTransferHandler);                    // POST /api/caisse-transfers/:id/confirm
router.post('/:id/reject', ctrl.rejectCaisseTransferHandler);                      // POST /api/caisse-transfers/:id/reject
router.get('/pending/casino/:sessionId', ctrl.pendingForCasinoSessionHandler);     // GET  /api/caisse-transfers/pending/casino/:sessionId

module.exports = router;