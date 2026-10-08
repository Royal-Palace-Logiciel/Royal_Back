// controllers/spaController.js
const spa = require('../models/spaModel');
const ApiError = require('../utils/ApiError');
const { ok, created, noContent } = require('../utils/apiResponse');

const optionalInt = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw ApiError.badRequest(`${label} doit être un entier positif`);
  return number;
};

function normalizeTarif(body = {}) {
  const nom = String(body.nom || '').trim();
  if (!nom) throw ApiError.badRequest('Le nom du tarif est obligatoire');
  if (!spa.CATEGORIES.includes(body.categorie)) throw ApiError.badRequest('Catégorie de tarif invalide');
  const prix = Number(body.prix);
  if (!Number.isFinite(prix) || prix < 0) throw ApiError.badRequest('Prix invalide');
  const isAbonnement = body.categorie === 'ABONNEMENT';
  const nbEntrees = isAbonnement ? optionalInt(body.nbEntrees, "Le nombre d'entrées") : null;
  const dureeJours = isAbonnement ? optionalInt(body.dureeJours, 'La durée') : null;
  if (isAbonnement && !nbEntrees && !dureeJours) {
    throw ApiError.badRequest("Un abonnement doit avoir un nombre d'entrées, une durée, ou les deux");
  }
  return { nom, categorie: body.categorie, prix, nbEntrees, dureeJours, actif: body.actif !== false, ordre: Number(body.ordre) || 0 };
}

function normalizeVente(body = {}) {
  if (!Array.isArray(body.lignes) || body.lignes.length === 0) throw ApiError.badRequest('La vente doit contenir au moins un article');
  const lignes = body.lignes.map((ligne) => ({ tarifId: Number(ligne.tarifId), quantite: Number(ligne.quantite) }));
  if (lignes.some((ligne) => !Number.isInteger(ligne.tarifId) || !Number.isInteger(ligne.quantite) || ligne.quantite < 1)) {
    throw ApiError.badRequest('Lignes de vente invalides');
  }
  const moyenPaiement = body.moyenPaiement || 'ESPECES';
  if (!spa.PAYMENT_METHODS.includes(moyenPaiement)) throw ApiError.badRequest('Mode de paiement invalide');
  const hotelReservationId = optionalInt(body.hotelReservationId, 'La réservation');
  if (spa.HOTEL_PAYMENT_METHODS.includes(moyenPaiement) && !hotelReservationId) {
    throw ApiError.badRequest('Choisissez la réservation du client de l’hôtel');
  }
  return {
    lignes,
    moyenPaiement,
    hotelReservationId,
    clientNom: String(body.clientNom || '').trim().slice(0, 150),
    clientTelephone: String(body.clientTelephone || '').trim().slice(0, 40),
    chambre: String(body.chambre || '').trim().slice(0, 60),
  };
}

async function listTarifsHandler(req, res) {
  const includeInactive = req.query.all === '1' && req.user.role === 'admin';
  return ok(res, await spa.listTarifs({ includeInactive }));
}

async function createTarifHandler(req, res) {
  return created(res, await spa.createTarif(normalizeTarif(req.body)));
}

async function updateTarifHandler(req, res) {
  const tarif = await spa.updateTarif(req.params.id, normalizeTarif(req.body));
  if (!tarif) throw ApiError.notFound('Tarif introuvable');
  return ok(res, tarif);
}

async function deleteTarifHandler(req, res) {
  if (!(await spa.deleteTarif(req.params.id))) throw ApiError.notFound('Tarif introuvable');
  return noContent(res);
}

async function currentCaisseHandler(req, res) {
  return ok(res, await spa.getCurrentCaisse(req.user.id_admin));
}

async function createVenteHandler(req, res) {
  return created(res, await spa.createVente({ ...normalizeVente(req.body), userId: req.user.id_admin }));
}

async function cancelVenteHandler(req, res) {
  if (!(await spa.cancelVente(req.params.id))) throw ApiError.notFound('Vente introuvable ou déjà clôturée');
  return noContent(res);
}

async function closeHandler(req, res) {
  return ok(res, await spa.closeCurrentSession(req.user.id_admin));
}

async function closuresHandler(req, res) {
  return ok(res, await spa.listClosures());
}

async function closureHandler(req, res) {
  const closure = await spa.getClosure(req.params.id);
  if (!closure) throw ApiError.notFound('Clôture introuvable');
  return ok(res, closure);
}

async function abonnementsHandler(req, res) {
  return ok(res, await spa.listAbonnements({ q: req.query.q }));
}

async function addPassageHandler(req, res) {
  return created(res, await spa.addPassage(req.params.id, req.user.id_admin));
}

async function passagesHandler(req, res) {
  return ok(res, await spa.listPassages(req.params.id));
}

async function cancelAbonnementHandler(req, res) {
  if (!(await spa.cancelAbonnement(req.params.id))) throw ApiError.notFound('Abonnement introuvable');
  return noContent(res);
}

async function roomChargesHandler(req, res) {
  return ok(res, await spa.roomCharges());
}

module.exports = {
  listTarifsHandler,
  createTarifHandler,
  updateTarifHandler,
  deleteTarifHandler,
  currentCaisseHandler,
  createVenteHandler,
  cancelVenteHandler,
  closeHandler,
  closuresHandler,
  closureHandler,
  abonnementsHandler,
  addPassageHandler,
  passagesHandler,
  cancelAbonnementHandler,
  roomChargesHandler,
};
