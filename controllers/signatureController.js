// controllers/signatureController.js
const { findLatestSignature, findSignatureHistory, createSignature, deleteSignatureById } = require('../models/signatureModel');
const ApiError = require('../utils/ApiError');
const { ok, created, noContent } = require('../utils/apiResponse');

// Types de signature connus. Étendre cette liste au fur et à mesure des besoins,
// par ex. 'casino_cash_operation' ou 'casino_credit' pour signer les recaves/crédits.
const SIGNABLE_TYPES = ['client_kyc', 'casino_cash_operation', 'casino_credit'];

function assertValidType(type) {
  if (!SIGNABLE_TYPES.includes(type)) {
    throw ApiError.badRequest(`Type de signature inconnu : ${type}`);
  }
}

// GET /api/signatures/:type/:id — dernière signature connue pour cette entité
async function getLatestSignature(req, res) {
  const { type, id } = req.params;
  assertValidType(type);
  const signature = await findLatestSignature(type, id);
  return ok(res, signature);
}

// GET /api/signatures/:type/:id/history — historique complet, du plus récent au plus ancien
async function getSignatureHistory(req, res) {
  const { type, id } = req.params;
  assertValidType(type);
  const rows = await findSignatureHistory(type, id);
  return ok(res, rows);
}

// POST /api/signatures/:type/:id — enregistre une NOUVELLE signature (jamais un remplacement)
async function postSignature(req, res) {
  const { type, id } = req.params;
  assertValidType(type);
  const { client_id, signature_data, signed_at } = req.body;

  if (!signature_data) throw ApiError.badRequest('signature_data requis');

  const signature = await createSignature({
    signableType: type,
    signableId: id,
    clientId: client_id,
    signatureData: signature_data,
    signedAt: signed_at,
  });
  return created(res, signature);
}

// DELETE /api/signatures/id/:signatureId — supprime UNE signature précise (correction admin)
async function removeSignature(req, res) {
  await deleteSignatureById(req.params.signatureId);
  return noContent(res);
}

module.exports = { getLatestSignature, getSignatureHistory, postSignature, removeSignature, SIGNABLE_TYPES };