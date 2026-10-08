const express = require('express');
const ctrl = require('../controllers/pafController');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
const cashierRoles = requireRole('admin', 'manager', 'caisse', 'caissier');

router.use(requireAuth);
router.get('/current', ctrl.currentHandler);
router.get('/closures', requireRole('admin'), ctrl.closuresHandler);
router.get('/closures/:id', requireRole('admin'), ctrl.closureHandler);
router.get('/history', requireRole('admin'), ctrl.closuresHandler);
router.post('/operations', cashierRoles, ctrl.createHandler);
router.put('/operations/:id', cashierRoles, ctrl.updateHandler);
router.delete('/operations/:id', cashierRoles, ctrl.deleteHandler);
router.post('/close', cashierRoles, ctrl.closeHandler);

module.exports = router;
