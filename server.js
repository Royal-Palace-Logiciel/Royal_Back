// server.js
require('dotenv').config();
require('express-async-errors'); // permet d'utiliser des handlers async sans try/catch manuel

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { checkConnection } = require('./config/db');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { startHotelReportDispatcher } = require('./services/hotelReportDispatcher');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://hda-frontend-ecru.vercel.app',
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Les requêtes sans Origin (Postman, appels serveur à serveur) restent autorisées.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin CORS non autorisée : ${origin}`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Fichiers téléversés (photos, contrats, devis...) : servis en dehors de /api,
// avec Cross-Origin-Resource-Policy assoupli pour rester chargeables depuis le
// frontend sur une autre origine (helmet le met à "same-origin" par défaut).
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await checkConnection();
    const server = app.listen(PORT, () => console.log(`[server] API HDA démarrée sur http://localhost:${PORT}/api`));
    // Pas de délai maximal pour recevoir le corps d'une requête : les pièces jointes RH
    // n'ont pas de limite de taille et peuvent prendre plus de 5 min (défaut Node) à envoyer.
    // Le délai de réception des en-têtes (headersTimeout) reste actif.
    server.requestTimeout = 0;

    // Envoi WhatsApp du rapport de nuitée : boucle inactive tant que
    // HOTEL_REPORT_WHATSAPP_ENABLED ne vaut pas "true".
    startHotelReportDispatcher();
  } catch (err) {
    console.error('[server] Échec de démarrage :', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
