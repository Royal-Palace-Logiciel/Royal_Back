const paf = require('../models/pafModel');
const ApiError = require('../utils/ApiError');
const { ok, created, noContent } = require('../utils/apiResponse');

function normalizePayload(body = {}) {
  if (!Array.isArray(body.details) || body.details.length === 0) {
    throw ApiError.badRequest('details doit contenir au moins une ligne');
  }

  const details = paf.normalizeDetails(body.details);
  if (details.some((detail) => (
    !paf.PAF_PRICES.includes(detail.price)
    || !['Homme', 'Femme'].includes(detail.gender)
    || !Number.isInteger(detail.qty)
    || detail.qty < 1
  ))) {
    throw ApiError.badRequest('Détails PAF invalides');
  }

  const paymentMethod = body.paymentMethod || body.moyen_paiement || 'ESPECES';
  if (!paf.PAYMENT_METHODS.includes(paymentMethod)) {
    throw ApiError.badRequest('Mode de paiement invalide');
  }

  return { details, paymentMethod };
}

async function currentHandler(req, res) {
  return ok(res, await paf.listCurrentOperations(req.user.id_admin));
}

async function createHandler(req, res) {
  const payload = normalizePayload(req.body);
  const operation = await paf.createOperation({ ...payload, userId: req.user.id_admin });
  return created(res, operation);
}

async function updateHandler(req, res) {
  const payload = normalizePayload(req.body);
  const operation = await paf.updateOperation(req.params.id, payload);
  if (!operation) throw ApiError.notFound('Opération PAF introuvable ou déjà clôturée');
  return ok(res, operation);
}

async function deleteHandler(req, res) {
  const deleted = await paf.deleteOperation(req.params.id);
  if (!deleted) throw ApiError.notFound('Opération PAF introuvable ou déjà clôturée');
  return noContent(res);
}

async function closuresHandler(req, res) {
  return ok(res, await paf.listClosures());
}

async function closureHandler(req, res) {
  const closure = await paf.getClosure(req.params.id);
  if (!closure) throw ApiError.notFound('Clôture PAF introuvable');
  return ok(res, closure);
}

async function closeHandler(req, res) {
  return ok(res, await paf.closeCurrentSession(req.user.id_admin));
}

module.exports = {
  currentHandler,
  createHandler,
  updateHandler,
  deleteHandler,
  closuresHandler,
  closureHandler,
  closeHandler,
};
