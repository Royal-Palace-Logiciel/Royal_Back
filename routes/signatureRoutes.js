// routes/signatureRoutes.js
//
// Module signature générique et réutilisable, append-only : n'importe quelle
// entité "signable" (fiche KYC, opération de caisse comme une recave, crédit...)
// peut être signée via ces routes, identifiée par son type + son id. Chaque
// signature est conservée ; rien n'est jamais écrasé.
//
// À monter dans l'app principale, ex: app.use('/api/signatures', require('./routes/signatureRoutes'));

const express = require('express');
const ctrl = require('../controllers/signatureController');

const router = express.Router();

router.get('/:type/:id/history', ctrl.getSignatureHistory); // historique complet (AVANT la route générique /:type/:id)
router.get('/:type/:id', ctrl.getLatestSignature);          // dernière signature
router.post('/:type/:id', ctrl.postSignature);              // enregistre une nouvelle signature
router.delete('/id/:signatureId', ctrl.removeSignature);    // supprime une signature précise (correction admin)

module.exports = router;