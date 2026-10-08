// routes/clientRoutes.js
const express = require('express');
const ctrl = require('../controllers/clientController');
const { createCrudRouter } = require('./routeFactory');

const router = express.Router();

// Routes spécifiques AVANT les routes génériques /:id pour éviter les conflits
router.get('/search', ctrl.searchClients);              // GET /api/clients/search?q=
router.get('/next-code', ctrl.nextCodeHandler);          // GET /api/clients/next-code (aperçu CH<n>/<année>)
router.get('/:id/full', ctrl.getOneWithAccount);         // GET /api/clients/:id/full (client + solde + kyc)
router.get('/:id/account', ctrl.getAccount);             // GET /api/clients/:id/account
router.post('/:id/account/credit', ctrl.creditAccount);  // POST /api/clients/:id/account/credit
router.post('/:id/account/debit', ctrl.debitAccount);    // POST /api/clients/:id/account/debit
router.get('/:id/loyalty', ctrl.loyaltyHistory);         // GET /api/clients/:id/loyalty
router.get('/:id/kyc', ctrl.getKyc);                             // GET /api/clients/:id/kyc (fiche KYC LBC/FT)
router.put('/:id/kyc', ctrl.saveKyc);                             // PUT /api/clients/:id/kyc (créer/mettre à jour)
router.get('/:id/kyc/signature/history', ctrl.getKycSignatureHistory); // GET historique complet des signatures
router.get('/:id/kyc/signature', ctrl.getKycSignature);           // GET dernière signature
router.post('/:id/kyc/signature', ctrl.saveKycSignature);         // POST nouvelle signature (append-only, jamais un remplacement)

// Création / mise à jour : logique dédiée (nom obligatoire, code_client
// auto-généré et immuable) — doit précéder le CRUD générique ci-dessous.
router.get('/', ctrl.listClients);                // GET /api/clients (sans les clients supprimés)
router.post('/', ctrl.createClientHandler);       // POST /api/clients
router.put('/:id', ctrl.updateClientHandler);     // PUT /api/clients/:id
router.delete('/:id', ctrl.deleteClientHandler);  // DELETE /api/clients/:id (soft delete support)

// CRUD standard sur /api/clients (GET liste, GET /:id, etc. - DELETE est remplacé par deleteClientHandler)
router.use('/', createCrudRouter(ctrl.clientsCrud));

module.exports = router;