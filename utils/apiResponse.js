// utils/apiResponse.js
// Enveloppe standard de toutes les réponses API (succès/erreur).

function ok(res, data, meta = undefined, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

function created(res, data) {
  return ok(res, data, undefined, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, status, message, details = undefined) {
  return res.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
  });
}

module.exports = { ok, created, noContent, fail };
