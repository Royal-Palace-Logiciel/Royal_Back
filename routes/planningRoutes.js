const express = require('express');
const controller = require('../controllers/planningController');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin', 'manager'));
router.get('/', controller.getDailyPlanning);
router.put('/', controller.saveDailyPlanning);

module.exports = router;
