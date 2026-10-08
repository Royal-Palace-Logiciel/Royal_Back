// routes/spaRoutes.js — module SPA (piscine), monté sur /api/spa
const express = require('express');
const ctrl = require('../controllers/spaController');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
const spaRoles = requireRole('admin', 'manager', 'caisse', 'caissier');
const adminOnly = requireRole('admin');
const managers = requireRole('admin', 'manager');

router.use(requireAuth);

router.get('/tarifs', spaRoles, ctrl.listTarifsHandler);
router.post('/tarifs', adminOnly, ctrl.createTarifHandler);
router.put('/tarifs/:id', adminOnly, ctrl.updateTarifHandler);
router.delete('/tarifs/:id', adminOnly, ctrl.deleteTarifHandler);

router.get('/caisse', spaRoles, ctrl.currentCaisseHandler);
router.post('/caisse/close', spaRoles, ctrl.closeHandler);
router.post('/ventes', spaRoles, ctrl.createVenteHandler);
router.delete('/ventes/:id', spaRoles, ctrl.cancelVenteHandler);

router.get('/clotures', managers, ctrl.closuresHandler);
router.get('/clotures/:id', managers, ctrl.closureHandler);

router.get('/abonnements', spaRoles, ctrl.abonnementsHandler);
router.post('/abonnements/:id/passages', spaRoles, ctrl.addPassageHandler);
router.get('/abonnements/:id/passages', spaRoles, ctrl.passagesHandler);
router.post('/abonnements/:id/annuler', adminOnly, ctrl.cancelAbonnementHandler);

// Lu par le module Hôtel pour afficher les dépenses piscine portées sur la chambre.
router.get('/room-charges', ctrl.roomChargesHandler);

module.exports = router;
