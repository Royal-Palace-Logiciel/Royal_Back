// routes/adminRoutes.js
const express = require('express');
const { usersCrud, listAuditLogs, notificationsCrud, listUsersPresence } = require('../controllers/adminController');
const { createCrudRouter } = require('./routeFactory');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Statut en ligne des agents (admin/manager uniquement)
router.get('/users-presence', requireAuth, requireRole('admin', 'manager'), listUsersPresence);

// Gestion des agents (admin/manager uniquement)
router.use('/users', requireAuth, requireRole('admin', 'manager'), createCrudRouter(usersCrud, { idParam: 'id_admin' }));

// Journal d'audit (lecture seule)
router.get('/audit-logs', requireAuth, requireRole('admin'), listAuditLogs);

// Notifications
router.use('/notifications', requireAuth, createCrudRouter(notificationsCrud));

module.exports = router;
