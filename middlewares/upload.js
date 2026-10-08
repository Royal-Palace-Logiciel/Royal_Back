// middlewares/upload.js
// Upload générique de fichiers (photos, pièces d'identité, contrats, devis...)
// stockés sur disque local et servis statiquement depuis /uploads (voir server.js).
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      // Une simple Error (pas MulterError) pour que le message personnalisé
      // survive : MulterError ignore le message fourni et le remplace par un
      // texte générique basé sur son code.
      return cb(new Error('Type de fichier non autorisé (images ou PDF uniquement)'));
    }
    cb(null, true);
  },
});

// Pièces du dossier RH (CIN, justificatif de résidence, CV, contrat) : données
// personnelles, donc stockées HORS du dossier /uploads servi publiquement.
// Elles ne sont lisibles que via GET /api/rh/employees/:id/documents/:docId (accès RH).
const RH_DOCUMENTS_DIR = path.join(__dirname, '..', 'private_uploads', 'rh_documents');
if (!fs.existsSync(RH_DOCUMENTS_DIR)) fs.mkdirSync(RH_DOCUMENTS_DIR, { recursive: true });

const rhDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, RH_DOCUMENTS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  // Pas de limite de taille : les scans (contrats, CIN) peuvent être volumineux.
  // Multer écrit le fichier sur disque au fil de l'eau, sans le garder en mémoire.
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(new Error('Type de fichier non autorisé (images ou PDF uniquement)'));
    cb(null, true);
  },
});

// Photos prises au pointage par reconnaissance faciale : privées comme les pièces RH.
const RH_ATTENDANCE_PHOTOS_DIR = path.join(__dirname, '..', 'private_uploads', 'rh_attendance_photos');
if (!fs.existsSync(RH_ATTENDANCE_PHOTOS_DIR)) fs.mkdirSync(RH_ATTENDANCE_PHOTOS_DIR, { recursive: true });

module.exports = { upload, UPLOAD_DIR, rhDocumentUpload, RH_DOCUMENTS_DIR, RH_ATTENDANCE_PHOTOS_DIR };
