// routes/index.js
const express = require('express');

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const clientRoutes = require('./clientRoutes');
const casinoRoutes = require('./casinoRoutes');
const caisseTransfersRoutes = require('./caisseTransfersRoutes');
const hebergementRoutes = require('./hebergementRoutes');
const restaurantRoutes = require('./restaurantRoutes');
const stockRoutes = require('./stockRoutes');
const financeRoutes = require('./financeRoutes');
const barRoutes = require('./barRoutes');
const pafRoutes = require('./pafRoutes');
const alcoolRoutes = require('./alcoolRoutes');
const signatureRoutes = require('./signatureRoutes');
const rhRoutes = require('./rhRoutes');
const planningRoutes = require('./planningRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.get('/', (req, res) => res.json({
  success: true,
  data: {
    message: 'API HDA opérationnelle',
    modules: ['auth', 'admin', 'clients', 'casino', 'hebergement', 'restaurant', 'stock', 'finance', 'bar', 'paf', 'alcool', 'alchool', 'signatures', 'rh', 'planning'],
  },
}));

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/clients', clientRoutes);
router.use('/casino', casinoRoutes);
router.use('/caisse-transfers', caisseTransfersRoutes);
router.use('/hebergement', hebergementRoutes);
router.use('/restaurant', restaurantRoutes);
router.use('/stock', stockRoutes);
router.use('/finance', financeRoutes);
router.use('/bar', barRoutes);
router.use('/paf', pafRoutes);
router.use('/alcool', alcoolRoutes);
router.use('/alchool', alcoolRoutes);
router.use('/signatures', signatureRoutes);
router.use('/rh', rhRoutes);
router.use('/planning', planningRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
