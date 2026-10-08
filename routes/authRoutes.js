// routes/authRoutes.js
const express = require('express');
const { register, login, verifyAdminPassword, me, changePassword, refreshToken, logout, profile, getConnectionHistory, heartbeat } = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);                              // POST /api/auth/register
router.post('/login', login);                                     // POST /api/auth/login
router.post('/verify-admin-password', requireAuth, verifyAdminPassword);
router.post('/refresh-token', refreshToken);                      // POST /api/auth/refresh-token
router.post('/logout', logout);                                   // POST /api/auth/logout
router.get('/me', requireAuth, me);                               // GET  /api/auth/me
router.get('/profile', requireAuth, profile);                     // GET  /api/auth/profile
router.post('/change-password', requireAuth, changePassword);      // POST /api/auth/change-password
router.get('/connection-history', requireAuth, getConnectionHistory); // GET /api/auth/connection-history
router.post('/heartbeat', requireAuth, heartbeat);                 // POST /api/auth/heartbeat (présence en ligne)

module.exports = router;