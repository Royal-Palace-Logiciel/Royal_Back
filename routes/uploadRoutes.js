// routes/uploadRoutes.js
const express = require('express');
const { upload } = require('../middlewares/upload');
const { requireAuth } = require('../middlewares/auth');
const ApiError = require('../utils/ApiError');
const { created } = require('../utils/apiResponse');

const router = express.Router();
router.use(requireAuth);

// POST /api/uploads (multipart/form-data, champ "file")
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (10 Mo maximum)'
        : err.message || 'Erreur lors du téléversement du fichier';
      return next(ApiError.badRequest(message));
    }
    if (!req.file) {
      return next(ApiError.badRequest('Aucun fichier reçu (champ "file" requis)'));
    }
    return created(res, {
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      size: req.file.size,
    });
  });
});

module.exports = router;
