// middlewares/errorHandler.js
const ApiError = require('../utils/ApiError');
const { fail } = require('../utils/apiResponse');

function notFoundHandler(req, res) {
  return fail(res, 404, `Route ${req.method} ${req.originalUrl} introuvable`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return fail(res, err.status, err.message, err.details);
  }

  // Erreurs MySQL connues
  if (err && err.code === 'ER_DUP_ENTRY') {
    return fail(res, 409, 'Cette ressource existe déjà (contrainte d\'unicité).', err.sqlMessage);
  }
  if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
    return fail(res, 400, 'Référence invalide : la ressource liée n\'existe pas.', err.sqlMessage);
  }
  if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
    return fail(res, 409, 'Suppression impossible : la ressource est référencée ailleurs.', err.sqlMessage);
  }
  if (err && err.code === 'ER_BAD_FIELD_ERROR') {
    return fail(res, 500, 'Schéma casino incomplet : exécutez la migration des tables de jeu sur la base en ligne.', err.sqlMessage);
  }
  if (err && err.code === 'ER_NO_DEFAULT_FOR_FIELD') {
    return fail(res, 400, 'Champ obligatoire manquant dans la base casino. Vérifiez la migration du schéma.', err.sqlMessage);
  }
  if (err && err.code === 'ER_DATA_TOO_LONG') {
    return fail(res, 400, 'Une valeur est trop longue pour un champ de la table casino.', err.sqlMessage);
  }
  if (err && err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
    return fail(res, 400, 'Une valeur envoyée n’est pas compatible avec le schéma casino.', err.sqlMessage);
  }

  console.error('[error]', err);
  return fail(res, 500, 'Erreur interne du serveur.');
}

module.exports = { notFoundHandler, errorHandler };
