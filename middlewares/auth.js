// middlewares/auth.js
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const presence = require('../utils/presence');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Token manquant');

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id_admin, role, email }
    presence.touch(payload.id_admin);
    next();
  } catch (err) {
    throw ApiError.unauthorized('Token invalide ou expiré');
  }
}

// Usage: requireRole('admin', 'manager')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Rôle insuffisant (requis: ${roles.join(', ')})`);
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
