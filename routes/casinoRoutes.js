// routes/casinoRoutes.js
const express = require('express');
const ctrl = require('../controllers/casinoController');
const { createCrudRouter } = require('./routeFactory');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth);

// =====================================================================
// Tableau de bord & consolidation
// =====================================================================
router.get('/dashboard', ctrl.dashboardHandler);                              // GET /api/casino/dashboard
router.get('/reports/produit-net', ctrl.produitNetHandler);                   // GET /api/casino/reports/produit-net?salle=&du=&au=
router.get('/reports/ecarts-caisse', ctrl.ecartsCaisseHandler);               // GET /api/casino/reports/ecarts-caisse?salle=&session_id=
router.get('/reports/encours-credit', ctrl.encoursCreditHandler);            // GET /api/casino/reports/encours-credit
router.get('/reports/flux-a-synchroniser', ctrl.fluxPendingHandler);         // GET /api/casino/reports/flux-a-synchroniser (batch de réconciliation)

// =====================================================================
// Salles & caisses (une salle -> plusieurs caisses)
// =====================================================================
router.use('/rooms', createCrudRouter(ctrl.roomsCrud));                       // /api/casino/rooms
router.use('/cashiers', createCrudRouter(ctrl.cashiersCrud));                 // /api/casino/cashiers

// =====================================================================
// Sessions de caisse (ouverture / fermeture, une caisse = 1 session ouverte)
// =====================================================================
router.get('/sessions/active', ctrl.activeSessionsHandler);                  // GET  /api/casino/sessions/active?cashier_id=
router.post('/sessions/open', ctrl.openSessionHandler);                      // POST /api/casino/sessions/open           { cashier_id, fond_initial }
router.post('/sessions/:id/close', ctrl.closeSessionHandler);                // POST /api/casino/sessions/:id/close      { fond_final_declare, commentaire }
router.get('/sessions/:id/summary', ctrl.sessionSummaryHandler);             // GET  /api/casino/sessions/:id/summary    (entrées/sorties/écart en direct)
router.get('/sessions/:id/transactions', ctrl.sessionTransactionsHandler);   // GET  /api/casino/sessions/:id/transactions (cash-ops + chips confondus)
router.use('/sessions', createCrudRouter(ctrl.sessionsCrud));                // /api/casino/sessions (CRUD générique / historique)

// =====================================================================
// Clients en caisse : recherche/sélection rapide, sans carte obligatoire
// =====================================================================
router.get('/clients/search', ctrl.searchClientHandler);                     // GET  /api/casino/clients/search?q=       (sélection simple)
router.post('/clients/quick-add', ctrl.quickAddClientHandler);               // POST /api/casino/clients/quick-add       (ajout simple, sans passer par le module clients complet)
router.get('/clients/:id/profile', ctrl.clientProfileHandler);               // GET  /api/casino/clients/:id/profile     (statut VIP/surveillance/exclu + antécédents)
router.get('/clients/:id/history', ctrl.clientHistoryHandler);               // GET  /api/casino/clients/:id/history     (visites, sessions de jeu, salles fréquentées)
router.get('/clients/:id/consumption', ctrl.clientConsumptionHandler);       // GET  /api/casino/clients/:id/consumption (F&B/bar : fréquence, panier moyen)
router.get('/clients/:id/incidents', ctrl.clientIncidentsHandler);           // GET  /api/casino/clients/:id/incidents

// =====================================================================
// Cartes de fidélité + scan QR code
// =====================================================================
router.get('/cards/scan/:qrCode', ctrl.scanCardHandler);                     // GET  /api/casino/cards/scan/:qrCode      (retrouve le client depuis le QR)
router.get('/cards/by-client/:clientId', ctrl.cardByClientHandler);          // GET  /api/casino/cards/by-client/:clientId
router.post('/cards/:id/points', ctrl.addPointsHandler);                     // POST /api/casino/cards/:id/points
router.use('/cards', createCrudRouter(ctrl.cardsCrud));                      // /api/casino/cards

// =====================================================================
// Antécédents client : profil (VIP / à surveiller / exclu) & incidents-litiges
// =====================================================================
router.post('/client-profiles/:clientId/statut', ctrl.setClientStatutHandler); // POST /api/casino/client-profiles/:clientId/statut { statut_special, motif } — décision humaine, jamais automatique
router.use('/client-profiles', createCrudRouter(ctrl.clientProfilesCrud));   // /api/casino/client-profiles
router.use('/incidents', createCrudRouter(ctrl.incidentsCrud));              // /api/casino/incidents

// =====================================================================
// Jetons (CRUD des types de jetons, chacun avec son prix)
// =====================================================================
router.use('/chip-types', createCrudRouter(ctrl.chipTypesCrud));             // /api/casino/chip-types

// Achat par jetons (echanger des jetons contre des articles ou services, rattaché à une session de caisse)
router.post('/chips/pay', ctrl.payWithChipsHandler);

// Mouvements de jetons (achat / reprise), rattachés à une session de caisse
router.post('/chips/buy', ctrl.buyChipsHandler);                             // POST /api/casino/chips/buy   { session_id, chip_type_id, quantite, client_id?|client_libre?, moyen_paiement }
router.post('/chips/sell', ctrl.sellChipsHandler);                          // POST /api/casino/chips/sell  { session_id, chip_type_id, quantite, client_id?|client_libre?, moyen_paiement }
router.get('/chips/by-client/:clientId', ctrl.chipHistoryByClientHandler);   // GET  /api/casino/chips/by-client/:clientId
router.use('/chips', createCrudRouter(ctrl.chipTransactionsCrud));           // /api/casino/chips

// =====================================================================
// Opérations de caisse : buy-in, cash-out, avance/remboursement crédit, dépôt
// Chaque opération : horodatée, rattachée au caissier connecté (req.user)
// et au joueur si carte présentée (sinon client_id/client_libre optionnels)
// =====================================================================
router.post('/operations/buy-in', ctrl.buyInHandler);                       // POST /api/casino/operations/buy-in           { session_id, montant, moyen_paiement, client_id?|client_libre? }
router.post('/operations/cash-out', ctrl.cashOutHandler);                   // POST /api/casino/operations/cash-out         { session_id, montant, moyen_paiement, client_id?|client_libre? }
router.post('/operations/deposit', ctrl.depositHandler);                    // POST /api/casino/operations/deposit          { session_id, montant, moyen_paiement, client_id? }
router.use('/operations', createCrudRouter(ctrl.cashOperationsCrud));        // /api/casino/operations (historique générique)

// =====================================================================
// Crédits joueur (avance / remboursement) + scoring
// =====================================================================
router.post('/credits/grant', ctrl.grantCreditHandler);                     // POST /api/casino/credits/grant           { client_id, montant, echeance } — vérifie plafond (config + carte)
router.post('/credits/:id/repay', ctrl.repayCreditHandler);                 // POST /api/casino/credits/:id/repay       { montant, moyen_paiement }
router.post('/credits/:id/draw', ctrl.drawCreditHandler);                   // POST /api/casino/credits/:id/draw        (tirage sur un crédit déjà accordé)
router.get('/credits/by-client/:clientId/active', ctrl.activeCreditsByClientHandler); // GET /api/casino/credits/by-client/:clientId/active
router.use('/credits', createCrudRouter(ctrl.creditsCrud));                 // /api/casino/credits

// Scoring de crédit (configurable, jamais bloquant à lui seul)
router.get('/scoring/config', ctrl.getScoringConfigHandler);                // GET  /api/casino/scoring/config                (seuils & poids, paramétrables par la direction)
router.put('/scoring/config', requireRole('admin', 'manager'), ctrl.updateScoringConfigHandler); // PUT /api/casino/scoring/config { cle, valeur } — direction uniquement (ajuste les rôles à ton système réel)
router.post('/scoring/:clientId/compute', ctrl.computeScoreHandler);        // POST /api/casino/scoring/:clientId/compute     (recalcul, renvoie score + catégorie + facteurs)
router.get('/scoring/:clientId/history', ctrl.scoreHistoryHandler);         // GET  /api/casino/scoring/:clientId/history
router.post('/scoring/:scoreId/decision', ctrl.scoreDecisionHandler);       // POST /api/casino/scoring/:scoreId/decision     { decision: 'VALIDEE'|'CONTESTEE'|'ANNULEE', commentaire } — décision humaine obligatoire
router.use('/scoring', createCrudRouter(ctrl.scoresCrud));                  // /api/casino/scoring (lecture brute)

// =====================================================================
// Visites de salle (entrée/sortie, scan QR ou saisie manuelle)
// =====================================================================
router.post('/visits/check-in', ctrl.checkInHandler);                       // POST /api/casino/visits/check-in   { room_id, client_id? , qr_code?, entree_via }
router.post('/visits/:id/check-out', ctrl.checkOutHandler);                 // POST /api/casino/visits/:id/check-out
router.get('/visits/in-room/:roomId', ctrl.currentlyInRoomHandler);         // GET  /api/casino/visits/in-room/:roomId
router.use('/visits', createCrudRouter(ctrl.visitsCrud));                   // /api/casino/visits
router.get('/players', ctrl.playersCrud.list);                              // consultation du registre durable
router.get('/players/:id', ctrl.playersCrud.getOne);
router.post('/players', requireRole('admin', 'manager', 'croupier'), ctrl.playersCrud.create); // création par l'admin, le manager ou le croupier
router.put('/players/:id', requireRole('admin'), ctrl.playersCrud.update);   // modification réservée à l'admin
router.delete('/players/:id', requireRole('admin'), ctrl.playersCrud.remove); // suppression réservée à l'admin
router.post('/players/:id/play', requireRole('admin', 'manager', 'croupier'), ctrl.playCasinoPlayerHandler); // ajout à une partie par l'admin, le manager ou le croupier

// =====================================================================
// Tables de jeu & Caves/Recaves (une salle -> plusieurs tables ; chaque
// cave/recave génère une écriture de caisse buy-in si payée, et exige une
// signature du joueur via la table transversale `signatures`)
// =====================================================================
router.post('/tables-jeu/:id/ouvrir', ctrl.ouvrirTableHandler);              // POST /api/casino/tables-jeu/:id/ouvrir
router.post('/tables-jeu/:id/fermer', ctrl.fermerTableHandler);              // POST /api/casino/tables-jeu/:id/fermer
router.post('/tables-jeu/:id/caves', ctrl.addCaveHandler);                   // POST /api/casino/tables-jeu/:id/caves      { session_id, client_id?|client_libre?, numero_adherent?, montant, statut_paiement, moyen_paiement? }
router.get('/tables-jeu/:id/caves', ctrl.listCavesHandler);                  // GET  /api/casino/tables-jeu/:id/caves?date=
router.get('/tables-jeu/:id/feuille', ctrl.feuilleTableHandler);             // GET  /api/casino/tables-jeu/:id/feuille?date=  (feuille de table consolidée)
router.get('/player-sheets/final-results', requireRole('admin', 'manager', 'caissier', 'caisse'), ctrl.finalResultsHandler); // GET /api/casino/player-sheets/final-results?date_from=&date_to=
router.get('/player-sheets', requireRole('admin', 'manager', 'caissier', 'caisse', 'croupier'), ctrl.getPlayerSheetHandler); // GET /api/casino/player-sheets?date=&table_name=
router.put('/player-sheets', requireRole('admin', 'manager', 'caissier', 'caisse', 'croupier'), ctrl.savePlayerSheetHandler); // PUT /api/casino/player-sheets
router.post('/player-sheets/whatsapp', requireRole('admin', 'manager', 'caissier', 'caisse', 'croupier'), ctrl.sendPlayerSheetWhatsappHandler); // envoi de la capture de fiche au WhatsApp du joueur
router.post('/player-sheets/whatsapp-desktop', requireRole('admin', 'manager', 'caissier', 'caisse', 'croupier'), ctrl.openPlayerSheetWhatsappDesktopHandler); // secours : capture collée dans WhatsApp Desktop du PC serveur
router.post('/player-sheets/finish', requireRole('admin', 'croupier'), ctrl.finishPlayerSheetHandler); // clôture sans suppression
router.use('/identity-verifications', createCrudRouter(ctrl.identityVerificationsCrud)); // /api/casino/identity-verifications
router.get('/tables-jeu', ctrl.listTablesHandler);                            // GET  /api/casino/tables-jeu?room_id=   (remplace la liste générique : ajoute `a_historique`)
router.post('/tables-jeu/:id/archiver', ctrl.archiverTableHandler);           // POST /api/casino/tables-jeu/:id/archiver
router.post('/tables-jeu/:id/desarchiver', ctrl.desarchiverTableHandler);     // POST /api/casino/tables-jeu/:id/desarchiver
router.delete('/tables-jeu/:id', ctrl.removeTableHandler);                    // DELETE /api/casino/tables-jeu/:id      (409 explicite si historique, au lieu de l'erreur SQL 1451 brute)
router.use('/tables-jeu', createCrudRouter(ctrl.tablesJeuCrud));             // /api/casino/tables-jeu (CRUD standard)
 
router.post('/table-caves/:caveId/signature', ctrl.signCaveHandler);         // POST /api/casino/table-caves/:caveId/signature  { signature_data }
router.get('/table-caves/:caveId/signature', ctrl.getCaveSignatureHandler);  // GET  /api/casino/table-caves/:caveId/signature

router.post('/tables-jeu/:id/prolongations', ctrl.addProlongationHandler);          // POST /api/casino/tables-jeu/:id/prolongations  { session_id, client_id?|client_libre?, statut_paiement, moyen_paiement? } — 400 si le timer n'est pas encore écoulé
router.get('/tables-jeu/:id/prolongations', ctrl.listProlongationsHandler);         // GET  /api/casino/tables-jeu/:id/prolongations?date=
router.post('/table-prolongations/:prolongationId/signature', ctrl.signProlongationHandler); // POST /api/casino/table-prolongations/:prolongationId/signature { signature_data }
 
router.post('/tables-jeu/:id/pourboires', ctrl.addPourboireHandler);                // POST /api/casino/tables-jeu/:id/pourboires     { session_id, montant, type_pourboire: 'JETONS'|'ESPECES' }
router.get('/tables-jeu/:id/pourboires', ctrl.listPourboiresHandler);               // GET  /api/casino/tables-jeu/:id/pourboires?date=

// Rapports (à côté du bloc "Tableau de bord & consolidation" existant) :
router.get('/reports/temps-jeu-joueur/:clientId', ctrl.tempsJeuJoueurHandler); // GET /api/casino/reports/temps-jeu-joueur/:clientId?date=  (total minutes, cumul si pas de date)
router.get('/reports/temps-jeu-jour', ctrl.tempsJeuJourHandler);               // GET /api/casino/reports/temps-jeu-jour?date=              (total minutes, toutes tables, défaut aujourd'hui)
 
// Dans le bloc "Tables de jeu" existant, avant `router.use('/tables-jeu', createCrudRouter(...))` :
router.get('/tables-jeu/:id/joueurs-actifs', ctrl.joueursActifsHandler);       // GET /api/casino/tables-jeu/:id/joueurs-actifs
router.post('/table-visits/:visitId/terminer', ctrl.terminerVisiteHandler);    // POST /api/casino/table-visits/:visitId/terminer
router.post('/table-visits/:visitId/place', ctrl.changerPlaceHandler);          // POST /api/casino/table-visits/:visitId/place { numero_place }

module.exports = router;
