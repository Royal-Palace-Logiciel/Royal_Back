// utils/ApiError.js
// Erreur métier typée, interceptée par le middleware d'erreurs global.

class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static notFound(message = 'Ressource introuvable') {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
  static unauthorized(message = 'Non authentifié') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Accès refusé') {
    return new ApiError(403, message);
  }
}

module.exports = ApiError;
