// controllers/clientController.js
const {
  Clients, ClientAccounts, LoyaltyPoints,
  createClient, updateClient, peekNextClientCode,
  findByClientId, search, adjustAccountBalance,
  findKycByClientId, upsertKyc,
} = require('../models/clientModel');
const { findLatestSignature, findSignatureHistory, createSignature } = require('../models/signatureModel');
const { createCrudController } = require('./controllerFactory');
const { renderClient, renderClientWithKyc, renderKyc } = require('../views/clientView');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/apiResponse');
const { pool } = require('../config/db');
const { getPagination, getSort, buildWhere } = require('../utils/queryHelpers');

const NIVEAUX_RISQUE = ['FAIBLE', 'MOYEN', 'ELEVE'];

const clientsCrud = createCrudController(Clients, {
  filterable: ['statut', 'is_casino_player'],
  view: renderClient,
});

// POST /api/clients — nom est le seul champ obligatoire ; code_client est
// toujours auto-généré au format CH<n>/<année> (voir clientModel.createClient).
async function createClientHandler(req, res) {
  if (!req.body?.nom || !String(req.body.nom).trim()) {
    throw ApiError.badRequest('Le nom est requis');
  }
  const client = await createClient(req.body);
  return created(res, renderClient(client));
}

// GET /api/clients/next-code — aperçu du code qui sera attribué au prochain client
async function nextCodeHandler(req, res) {
  return ok(res, { code_client: await peekNextClientCode() });
}

// PUT /api/clients/:id — code_client ne peut plus être modifié une fois attribué
// (voir clientModel.updateClient, qui ignore silencieusement toute tentative).
async function updateClientHandler(req, res) {
  if (req.body?.nom !== undefined && !String(req.body.nom).trim()) {
    throw ApiError.badRequest('Le nom est requis');
  }
  const client = await updateClient(req.params.id, req.body);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);
  return ok(res, renderClient(client));
}

async function getOneWithAccount(req, res) {
  const client = await Clients.findById(req.params.id);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);
  const [account, kyc] = await Promise.all([
    findByClientId(req.params.id),
    findKycByClientId(req.params.id),
  ]);
  return ok(res, renderClientWithKyc(client, account, kyc));
}

async function searchClients(req, res) {
  const term = req.query.q;
  if (!term || term.length < 2) throw ApiError.badRequest('Le paramètre "q" doit contenir au moins 2 caractères');
  const rows = await search(term, Number(req.query.limit) || 20);
  return ok(res, rows.map(renderClient));
}

async function getAccount(req, res) {
  const account = await findByClientId(req.params.id);
  if (!account) throw ApiError.notFound('Aucun compte pour ce client');
  return ok(res, account);
}

async function creditAccount(req, res) {
  const { montant, points, motif } = req.body;
  if (!montant) throw ApiError.badRequest('montant requis');
  const account = await adjustAccountBalance(req.params.id, Math.abs(montant), { points, motif });
  return ok(res, account);
}

async function debitAccount(req, res) {
  const { montant, motif } = req.body;
  if (!montant) throw ApiError.badRequest('montant requis');
  const account = await adjustAccountBalance(req.params.id, -Math.abs(montant), { motif });
  return ok(res, account);
}

async function loyaltyHistory(req, res) {
  const rows = await LoyaltyPoints.findAll({ whereSql: 'WHERE client_id = ?', whereValues: [req.params.id], orderBy: '`created_at` DESC' });
  return ok(res, rows);
}

// GET /api/clients/:id/kyc — fiche KYC (conformité LBC/FT)
async function getKyc(req, res) {
  const client = await Clients.findById(req.params.id);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);
  const kyc = await findKycByClientId(req.params.id);
  return ok(res, renderKyc(kyc));
}

// PUT /api/clients/:id/kyc — crée ou met à jour la fiche KYC (upsert)
async function saveKyc(req, res) {
  const client = await Clients.findById(req.params.id);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);

  const rawNiveau = req.body.niveau_risque;
  if (rawNiveau && String(rawNiveau).trim() && !NIVEAUX_RISQUE.includes(rawNiveau)) {
    throw ApiError.badRequest(`niveau_risque doit être l'un de : ${NIVEAUX_RISQUE.join(', ')}`);
  }

  const agent_verificateur = (req.body.agent_verificateur !== undefined && req.body.agent_verificateur !== '' && req.body.agent_verificateur !== null)
    ? Number(req.body.agent_verificateur)
    : (req.user?.id_admin ?? null);

  const date_verification = (req.body.date_verification && String(req.body.date_verification).trim())
    ? req.body.date_verification
    : new Date().toISOString().slice(0, 10);

  const kyc = await upsertKyc(req.params.id, {
    ...req.body,
    niveau_risque: (rawNiveau && NIVEAUX_RISQUE.includes(rawNiveau)) ? rawNiveau : null,
    agent_verificateur: isNaN(agent_verificateur) ? null : agent_verificateur,
    date_verification,
  });
  return ok(res, renderKyc(kyc));
}

// GET /api/clients/:id/kyc/signature — dernière signature électronique liée à la déclaration KYC
async function getKycSignature(req, res) {
  const client = await Clients.findById(req.params.id);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);
  const signature = await findLatestSignature('client_kyc', req.params.id);
  return ok(res, signature);
}

// GET /api/clients/:id/kyc/signature/history — historique complet des signatures KYC de ce client
async function getKycSignatureHistory(req, res) {
  const client = await Clients.findById(req.params.id);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);
  const rows = await findSignatureHistory('client_kyc', req.params.id);
  return ok(res, rows);
}

// POST /api/clients/:id/kyc/signature — enregistre une NOUVELLE signature (jamais un remplacement)
async function saveKycSignature(req, res) {
  const client = await Clients.findById(req.params.id);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);
  const { signature_data } = req.body;
  if (!signature_data) throw ApiError.badRequest('signature_data requis');

  const signature = await createSignature({
    signableType: 'client_kyc',
    signableId: req.params.id,
    clientId: req.params.id,
    signatureData: signature_data,
  });
  return created(res, signature);
}

// Custom delete handler with soft delete support
async function deleteClientHandler(req, res) {
  const client = await Clients.findById(req.params.id);
  if (!client) throw ApiError.notFound(`Client #${req.params.id} introuvable`);

  // Historique du client : toutes les tables dont la clé étrangère vers clients.id
  // bloque la suppression (NO ACTION / RESTRICT). La liste est lue dans le schéma de la
  // base, pour qu'une table ajoutée plus tard (ex. casino_table_visits, oubliée dans
  // l'ancienne liste écrite à la main) ne fasse plus échouer la suppression.
  // client_kyc (CASCADE) et signatures (SET NULL) ne bloquent pas.
  const [blockingTables] = await pool.query(
    `SELECT k.TABLE_NAME table_name, k.COLUMN_NAME column_name
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.REFERENCED_TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME = 'clients'
        AND r.DELETE_RULE IN ('NO ACTION', 'RESTRICT')`
  );
  const counts = await Promise.all(blockingTables.map(({ table_name: table, column_name: column }) =>
    pool.query(`SELECT COUNT(*) AS count FROM \`${table}\` WHERE \`${column}\` = ?`, [req.params.id]).then(([[row]]) => Number(row.count || 0))
  ));
  const totalRelated = counts.reduce((sum, n) => sum + n, 0);

  if (totalRelated === 0) {
    // No related records - perform hard delete
    await Clients.remove(req.params.id);
    return ok(res, { 
      success: true, 
      message: 'Client supprimé définitivement',
      deleted: true,
      deactivated: false
    });
  } else {
    // Historique à conserver : le client est retiré des listes et des recherches
    // (deleted_at), sans changer son statut. Il reste lisible par son id, pour que
    // ses anciennes factures, réservations, opérations de casino… affichent son nom.
    await pool.query('UPDATE clients SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user?.id_admin || null, req.params.id]);
    return ok(res, {
      success: true,
      message: `Client supprimé de la liste (${totalRelated} enregistrements d’historique conservés)`,
      deleted: true,
      deactivated: false,
      archived: true,
      relatedCount: totalRelated
    });
  }
}

// GET /api/clients — liste sans les clients supprimés (deleted_at).
async function listClients(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const orderBy = getSort(req.query, Clients.sortableCols, Clients.pk);
  const { sql, values } = buildWhere(req.query, ['statut', 'is_casino_player']);
  const whereSql = sql ? `${sql} AND deleted_at IS NULL` : 'WHERE deleted_at IS NULL';
  const [rows, total] = await Promise.all([
    Clients.findAll({ whereSql, whereValues: values, orderBy, limit, offset }),
    Clients.count({ whereSql, whereValues: values }),
  ]);
  return ok(res, rows.map(renderClient), { page, limit, total, totalPages: Math.ceil(total / limit) });
}

module.exports = {
  clientsCrud, listClients, createClientHandler, nextCodeHandler, updateClientHandler, deleteClientHandler,
  getOneWithAccount, searchClients, getAccount, creditAccount, debitAccount, loyaltyHistory,
  getKyc, saveKyc, getKycSignature, getKycSignatureHistory, saveKycSignature,
  ClientAccountsCrud: createCrudController(ClientAccounts, { filterable: ['client_id'] }),
};