// controllers/casinoController.js
//
// Corrigé selon le code réel du projet :
//  - routeFactory.createCrudRouter(controller) attend un objet avec les 5
//    handlers { list, getOne, create, update, remove } — pas une config
//    passive. Les exports `*Crud` ci-dessous sont donc de vrais mini-contrôleurs
//    générés par `buildCrud(...)`.
//  - config/db exporte { pool, checkConnection, withTransaction }.
//  - req.user = payload JWT { id_admin, role, email } (auth.js) → on utilise
//    partout `req.user.id_admin` (jamais `req.user.id`).
//  - ApiError existe dans utils/ApiError avec au moins `.unauthorized()` et
//    `.forbidden()` (vu dans auth.js). Je suppose ici la présence de
//    `.badRequest()`, `.notFound()`, `.conflict()`, qui suivent la même
//    convention statique — si les noms diffèrent chez toi, un rename global
//    suffit (les usages sont regroupés et explicites).
//
// Toutes les écritures financières restent idempotentes via `ref_flux_global`
// (contrainte UNIQUE côté SQL + `INSERT IGNORE`).

const { randomUUID } = require('crypto');
const { pool, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const transport = require('../utils/whatsappTransport');
const whatsappDesktop = require('../utils/whatsappDesktop');

// =====================================================================
// Helpers génériques
// =====================================================================

function genRef() {
  return randomUUID();
}

function asMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) throw ApiError.badRequest('Montant invalide');
  return v;
}

function parseCasinoAmount(value) {
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return 0;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const amount = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function caissierId(req) {
  return req.user.id_admin;
}

/**
 * Écrit une ligne dans le module financier global à partir d'un événement
 * casino. Idempotent grâce à `ref_flux_global` (UNIQUE en base) : si la ligne
 * existe déjà, `INSERT IGNORE` ne crée pas de doublon.
 */
async function recordFinancialTransaction(conn, { client_id = null, module = 'CASINO', type_flux, montant, reference_id, description, ref_flux_global }) {
  await conn.query(
    `INSERT IGNORE INTO financial_transactions
       (client_id, module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', NOW())`,
    [client_id, module, type_flux, montant, reference_id, ref_flux_global, description]
  );
}

async function getOpenSession(conn, sessionId) {
  const [rows] = await conn.query(
    `SELECT * FROM casino_cashier_sessions WHERE id = ? AND statut = 'OUVERTE' LIMIT 1`,
    [sessionId]
  );
  return rows[0] || null;
}

/**
 * Source de vérité du solde consolidé d'un client, tous départements
 * confondus (`client_accounts.solde`). Positif = le client doit de l'argent
 * à HDA (encours de crédit). Nécessite la contrainte UNIQUE(client_id)
 * (migration) pour que ON DUPLICATE KEY UPDATE cible la bonne ligne.
 */
async function adjustClientAccountSolde(conn, clientId, delta) {
  if (!clientId || !delta) return;
  await conn.query(
    `INSERT INTO client_accounts (client_id, solde) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE solde = solde + VALUES(solde)`,
    [clientId, delta]
  );
}

async function getScoringConfigMap(conn) {
  const [rows] = await conn.query(`SELECT cle, valeur FROM casino_scoring_config`);
  const map = {};
  for (const r of rows) map[r.cle] = r.valeur;
  return map;
}

// =====================================================================
// Générateur de CRUD générique (utilisé pour les exports `*Crud`)
// =====================================================================

/**
 * Construit un mini-contrôleur { list, getOne, create, update, remove }
 * compatible avec routeFactory.createCrudRouter.
 *
 * @param {string} table
 * @param {object} opts
 *  - pk: colonne clé primaire (défaut 'id')
 *  - allowedFields: colonnes acceptées en create/update
 *  - readOnly: si true, create/update/remove renvoient 405
 *  - orderBy: clause ORDER BY par défaut pour list()
 *  - defaults: fn(req) => objet de valeurs par défaut fusionnées à la création
 *    (ex: created_by: req.user.id_admin)
 */
function buildCrud(table, { pk = 'id', allowedFields = [], readOnly = false, orderBy = `${pk} DESC`, defaults = null } = {}) {
  function pickAllowed(body) {
    const out = {};
    for (const f of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, f)) out[f] = body[f];
    }
    return out;
  }

  return {
    async list(req, res, next) {
      try {
        const { limit = 100, offset = 0 } = req.query;
        const [rows] = await pool.query(
          `SELECT * FROM \`${table}\` ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
          [Number(limit), Number(offset)]
        );
        res.json(rows);
      } catch (err) { next(err); }
    },

    async getOne(req, res, next) {
      try {
        const [[row]] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`${pk}\` = ?`, [req.params[pk] ?? req.params.id]);
        if (!row) throw ApiError.notFound(`${table} introuvable`);
        res.json(row);
      } catch (err) { next(err); }
    },

    async create(req, res, next) {
      try {
        if (readOnly) throw ApiError.forbidden(`${table} : création non autorisée via cette route`);
        const data = { ...pickAllowed(req.body), ...(defaults ? defaults(req) : {}) };
        if (Object.keys(data).length === 0) throw ApiError.badRequest('Aucun champ valide fourni');
        const columns = Object.keys(data);
        const [result] = await pool.query(
          `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map(c => data[c])
        );
        const [[row]] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`${pk}\` = ?`, [result.insertId]);
        res.status(201).json(row);
      } catch (err) { next(err); }
    },

    async update(req, res, next) {
      try {
        if (readOnly) throw ApiError.forbidden(`${table} : modification non autorisée via cette route`);
        const data = pickAllowed(req.body);
        if (Object.keys(data).length === 0) throw ApiError.badRequest('Aucun champ valide fourni');
        const columns = Object.keys(data);
        const [result] = await pool.query(
          `UPDATE \`${table}\` SET ${columns.map(c => `\`${c}\` = ?`).join(', ')} WHERE \`${pk}\` = ?`,
          [...columns.map(c => data[c]), req.params[pk] ?? req.params.id]
        );
        if (result.affectedRows === 0) throw ApiError.notFound(`${table} introuvable`);
        const [[row]] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`${pk}\` = ?`, [req.params[pk] ?? req.params.id]);
        res.json(row);
      } catch (err) { next(err); }
    },

    async remove(req, res, next) {
      try {
        if (readOnly) throw ApiError.forbidden(`${table} : suppression non autorisée via cette route`);
        const [result] = await pool.query(`DELETE FROM \`${table}\` WHERE \`${pk}\` = ?`, [req.params[pk] ?? req.params.id]);
        if (result.affectedRows === 0) throw ApiError.notFound(`${table} introuvable`);
        res.status(204).send();
      } catch (err) { next(err); }
    },
  };
}

exports.roomsCrud = buildCrud('casino_rooms', {
  allowedFields: ['code', 'nom', 'type_salle', 'statut'],
});

// Suppression définitive d'une salle et de toutes ses données casino liées.
// L'opération est transactionnelle afin d'éviter une suppression partielle.
exports.roomsCrud.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await withTransaction(async (conn) => {
      const [[room]] = await conn.query(`SELECT id FROM casino_rooms WHERE id = ? FOR UPDATE`, [id]);
      if (!room) throw ApiError.notFound('Salle introuvable');

      // Les écritures globales sont supprimées avant leurs sources casino.
      await conn.query(
        `DELETE FROM financial_transactions
          WHERE module = 'CASINO' AND (
            reference_id IN (
              SELECT co.id FROM casino_cash_operations co
              JOIN casino_cashier_sessions cs ON cs.id = co.cashier_session_id
              JOIN casino_cashiers cc ON cc.id = cs.cashier_id
              WHERE cc.room_id = ?
            ) OR ref_flux_global IN (
              SELECT co.ref_flux_global FROM casino_cash_operations co
              JOIN casino_cashier_sessions cs ON cs.id = co.cashier_session_id
              JOIN casino_cashiers cc ON cc.id = cs.cashier_id
              WHERE cc.room_id = ? AND co.ref_flux_global IS NOT NULL
            ) OR ref_flux_global IN (
              SELECT ct.ref_flux_global FROM casino_chip_transactions ct
              JOIN casino_cashier_sessions cs ON cs.id = ct.cashier_session_id
              JOIN casino_cashiers cc ON cc.id = cs.cashier_id
              WHERE cc.room_id = ? AND ct.ref_flux_global IS NOT NULL
            )
          )`,
        [id, id, id]
      );

      await conn.query(
        `DELETE FROM caisse_transfers
          WHERE (module_source = 'CASINO' AND session_source_id IN (
            SELECT cs.id FROM casino_cashier_sessions cs JOIN casino_cashiers cc ON cc.id = cs.cashier_id WHERE cc.room_id = ?
          )) OR (module_destination = 'CASINO' AND session_destination_id IN (
            SELECT cs.id FROM casino_cashier_sessions cs JOIN casino_cashiers cc ON cc.id = cs.cashier_id WHERE cc.room_id = ?
          ))`,
        [id, id]
      );
      await conn.query(
        `DELETE s FROM signatures s
          JOIN casino_table_caves tc ON s.signable_type = 'casino_table_cave' AND s.signable_id = tc.id
          JOIN casino_tables_jeu tj ON tj.id = tc.table_jeu_id
         WHERE tj.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE s FROM signatures s
          JOIN casino_table_prolongations tp ON s.signable_type = 'casino_table_prolongation' AND s.signable_id = tp.id
          JOIN casino_tables_jeu tj ON tj.id = tp.table_jeu_id
         WHERE tj.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE tv FROM casino_table_visits tv
          JOIN casino_tables_jeu tj ON tj.id = tv.table_jeu_id
         WHERE tj.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE tc FROM casino_table_caves tc
          JOIN casino_tables_jeu tj ON tj.id = tc.table_jeu_id
         WHERE tj.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE tp FROM casino_table_prolongations tp
          JOIN casino_tables_jeu tj ON tj.id = tp.table_jeu_id
         WHERE tj.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE tb FROM casino_table_pourboires tb
          JOIN casino_tables_jeu tj ON tj.id = tb.table_jeu_id
         WHERE tj.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE co FROM casino_cash_operations co
          JOIN casino_cashier_sessions cs ON cs.id = co.cashier_session_id
          JOIN casino_cashiers cc ON cc.id = cs.cashier_id
         WHERE cc.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE ct FROM casino_chip_transactions ct
          JOIN casino_cashier_sessions cs ON cs.id = ct.cashier_session_id
          JOIN casino_cashiers cc ON cc.id = cs.cashier_id
         WHERE cc.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE crp FROM casino_credit_repayments crp
          JOIN casino_credits cr ON cr.id = crp.credit_id
          JOIN casino_cashier_sessions cs ON cs.id = cr.session_id
          JOIN casino_cashiers cc ON cc.id = cs.cashier_id
         WHERE cc.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE cr FROM casino_credits cr
          JOIN casino_cashier_sessions cs ON cs.id = cr.session_id
          JOIN casino_cashiers cc ON cc.id = cs.cashier_id
         WHERE cc.room_id = ?`, [id]
      );
      await conn.query(
        `DELETE ci FROM casino_incidents ci
          JOIN casino_cashier_sessions cs ON cs.id = ci.session_id
          JOIN casino_cashiers cc ON cc.id = cs.cashier_id
         WHERE cc.room_id = ?`, [id]
      );
      await conn.query(`DELETE FROM casino_visits WHERE room_id = ?`, [id]);
      await conn.query(`DELETE FROM casino_tables_jeu WHERE room_id = ?`, [id]);
      await conn.query(
        `DELETE cs FROM casino_cashier_sessions cs
          JOIN casino_cashiers cc ON cc.id = cs.cashier_id
         WHERE cc.room_id = ?`, [id]
      );
      await conn.query(`DELETE FROM casino_cashiers WHERE room_id = ?`, [id]);
      const [result] = await conn.query(`DELETE FROM casino_rooms WHERE id = ?`, [id]);
      if (result.affectedRows === 0) throw ApiError.notFound('Salle introuvable');
    });
    res.status(204).send();
  } catch (err) { next(err); }
};

const genericCashiersCrud = buildCrud('casino_cashiers', {
  allowedFields: ['room_id', 'code', 'nom', 'statut'],
});

exports.cashiersCrud = genericCashiersCrud;
exports.cashiersCrud.create = async (req, res, next) => {
  try {
    const roomId = Number(req.body.room_id);
    const code = String(req.body.code || '').trim();
    const nom = String(req.body.nom || '').trim();
    if (!Number.isInteger(roomId) || roomId < 1) throw ApiError.badRequest('Une salle valide est requise pour créer la caisse.');
    if (!code || !nom) throw ApiError.badRequest('Le code et le nom de la caisse sont requis.');

    const [[room]] = await pool.query(`SELECT id FROM casino_rooms WHERE id = ?`, [roomId]);
    if (!room) throw ApiError.badRequest('La salle sélectionnée n’existe plus. Actualisez la page puis recommencez.');
    const [[duplicate]] = await pool.query(`SELECT id FROM casino_cashiers WHERE code = ? LIMIT 1`, [code]);
    if (duplicate) throw ApiError.conflict(`Le code de caisse « ${code} » est déjà utilisé.`);

    const [result] = await pool.query(
      `INSERT INTO casino_cashiers (room_id, code, nom, statut) VALUES (?, ?, ?, ?)`,
      [roomId, code, nom, req.body.statut || 'FERMEE']
    );
    const [[cashier]] = await pool.query(`SELECT * FROM casino_cashiers WHERE id = ?`, [result.insertId]);
    res.status(201).json(cashier);
  } catch (err) { next(err); }
};

exports.sessionsCrud = buildCrud('casino_cashier_sessions', {
  allowedFields: ['cashier_id', 'user_id', 'ouverture_at', 'fermeture_at', 'fond_initial', 'fond_final_declare', 'fond_final_theorique', 'ecart', 'cash_check', 'cashing_verifie', 'cashing_verifie_le', 'cashing_verifie_par', 'cashing_montant_verifie', 'rack_check_verifie', 'rack_check_montant', 'rack_check_manquant', 'rack_check_le', 'rack_check_par', 'statut', 'commentaire'],
  orderBy: 'ouverture_at DESC',
});

exports.cardsCrud = buildCrud('casino_cards', {
  allowedFields: ['client_id', 'numero_carte', 'qr_code', 'niveau', 'plafond_credit', 'statut', 'date_emission'],
});

exports.clientProfilesCrud = buildCrud('casino_client_profiles', {
  allowedFields: ['client_id', 'statut_special', 'motif', 'date_effet', 'decide_par'],
});

exports.incidentsCrud = buildCrud('casino_incidents', {
  allowedFields: ['client_id', 'session_id', 'type', 'gravite', 'description', 'statut', 'resolved_at'],
  orderBy: 'created_at DESC',
});

exports.chipTypesCrud = buildCrud('casino_chip_types', {
  allowedFields: ['code', 'nom', 'valeur_nominale', 'couleur', 'statut', 'quantite_stock'],
});

// Lecture seule : la création passe par /chips/buy et /chips/sell
// (il faut calculer valeur_unitaire, générer ref_flux_global, écrire le flux global).
exports.chipTransactionsCrud = buildCrud('casino_chip_transactions', {
  readOnly: true,
  orderBy: 'created_at DESC',
});

// Lecture seule : la création passe par /operations/buy-in, /cash-out, /deposit.
exports.cashOperationsCrud = buildCrud('casino_cash_operations', {
  readOnly: true,
  orderBy: 'created_at DESC',
});

exports.creditsCrud = buildCrud('casino_credits', {
  allowedFields: ['client_id', 'session_id', 'montant_accorde', 'encours', 'echeance', 'statut'],
  orderBy: 'date_octroi DESC',
});

// Lecture seule : la création passe par /scoring/:clientId/compute,
// la décision humaine par /scoring/:scoreId/decision.
exports.scoresCrud = buildCrud('casino_scores', {
  readOnly: true,
  orderBy: 'calcule_le DESC',
});

exports.visitsCrud = buildCrud('casino_visits', {
  allowedFields: ['client_id', 'room_id', 'card_id', 'entree_at', 'sortie_at', 'entree_via'],
  orderBy: 'entree_at DESC',
});

exports.playersCrud = buildCrud('casino_players', {
  allowedFields: ['nom', 'prenom', 'surnom', 'telephone', 'whatsapp', 'whatsapp_fiche_consent', 'whatsapp_fiche_consent_signature', 'whatsapp_fiche_consent_at', 'identite_type', 'identite_numero', 'identite_nom_complet', 'identite_date_emission', 'identite_verifiee', 'identite_fichier_url', 'identite_fichiers_urls', 'date_inscription', 'depot', 'credit', 'mode_jeu', 'statut_jeu', 'statut'],
  orderBy: 'date_inscription DESC, nom ASC, prenom ASC',
});

const isTruthyFlag = (value) => value === true || value === 1 || value === '1' || value === 'true';

// Consentement « envoi des fiches par WhatsApp » : il doit être signé par le joueur et
// associé à un numéro. La date du consentement est fixée par le serveur, jamais par le client.
const applyWhatsappFicheConsent = (body, existing = null) => {
  delete body.whatsapp_fiche_consent_at;
  if (!Object.prototype.hasOwnProperty.call(body, 'whatsapp_fiche_consent')) return null;
  if (!isTruthyFlag(body.whatsapp_fiche_consent)) {
    body.whatsapp_fiche_consent = 0;
    body.whatsapp_fiche_consent_signature = null;
    body.whatsapp_fiche_consent_at = null;
    return null;
  }
  const signature = body.whatsapp_fiche_consent_signature ?? existing?.whatsapp_fiche_consent_signature;
  const number = body.whatsapp ?? existing?.whatsapp ?? body.telephone ?? existing?.telephone;
  if (typeof signature !== 'string' || !signature.startsWith('data:image/')) return 'La signature du joueur est obligatoire pour l’envoi des fiches par WhatsApp';
  if (!String(number || '').trim()) return 'Un numéro WhatsApp est obligatoire pour l’envoi des fiches par WhatsApp';
  body.whatsapp_fiche_consent = 1;
  body.whatsapp_fiche_consent_signature = signature;
  if (!existing?.whatsapp_fiche_consent || body.whatsapp_fiche_consent_signature !== existing.whatsapp_fiche_consent_signature) {
    body.whatsapp_fiche_consent_at = new Date();
  }
  return null;
};

const playersUpdate = exports.playersCrud.update;
exports.playersCrud.update = async (req, res, next) => {
  try {
    const [[existing]] = await pool.query('SELECT whatsapp, telephone, whatsapp_fiche_consent, whatsapp_fiche_consent_signature FROM casino_players WHERE id = ?', [req.params.id]);
    if (!existing) throw ApiError.notFound('Joueur Casino introuvable');
    const consentError = applyWhatsappFicheConsent(req.body, existing);
    if (consentError) throw ApiError.badRequest(consentError);
  } catch (err) { return next(err); }
  return playersUpdate(req, res, next);
};

const playersCreate = exports.playersCrud.create;
exports.playersCrud.create = async (req, res, next) => {
  const consentError = applyWhatsappFicheConsent(req.body);
  if (consentError) return next(ApiError.badRequest(consentError));
  const { identite_type: identityType, identite_numero: identityNumber, identite_nom_complet: identityName, identite_date_emission: identityDate, identite_verifiee: identityVerified, identite_fichiers_urls: identityFiles } = req.body;
  let identityFileList = [];
  try { identityFileList = Array.isArray(identityFiles) ? identityFiles : JSON.parse(identityFiles || '[]'); } catch { identityFileList = []; }
  identityFileList = Array.isArray(identityFileList) ? identityFileList.filter((url) => typeof url === 'string' && url.trim()) : [];
  if (!identityType || !identityNumber || !identityName || !identityDate || identityFileList.length < 1 || !(identityVerified === true || identityVerified === 1 || identityVerified === '1' || identityVerified === 'true')) {
    return next(ApiError.badRequest('Au moins un fichier d’identité est obligatoire avant l’inscription du joueur'));
  }
  return playersCreate(req, res, next);
};

// Numero au format international sans « + » : 034… devient 26134… (indicatif par defaut).
const toInternationalNumber = (raw) => {
  const compact = String(raw || '').trim().replace(/[^\d+]/g, '');
  if (compact.startsWith('+')) return compact.slice(1);
  if (compact.startsWith('00')) return compact.slice(2);
  if (compact.startsWith('0')) return `${process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '261'}${compact.slice(1)}`;
  return compact;
};

const parsePlayerSheetImage = (image) => {
  const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(String(image || ''));
  if (!match) throw ApiError.badRequest('Capture de la fiche invalide (PNG ou JPEG attendu)');
  return match;
};

// Le WhatsApp de la fiche d'inscription du joueur fait foi, puis le numero transmis, puis le telephone.
const resolvePlayerWhatsappNumber = async (casinoPlayerId, numero) => {
  let rawNumber = numero;
  if (casinoPlayerId) {
    const [[player]] = await pool.query('SELECT whatsapp, telephone FROM casino_players WHERE id = ?', [casinoPlayerId]);
    rawNumber = player?.whatsapp || numero || player?.telephone;
  }
  const destinataire = toInternationalNumber(rawNumber);
  if (!destinataire) throw ApiError.badRequest('Aucun numéro WhatsApp enregistré pour ce joueur');
  return destinataire;
};

// Secours : ouvre la discussion du joueur dans WhatsApp Desktop sur ce PC et y colle la capture,
// prete a partir (apercu d'envoi). Reserve au poste sur lequel tourne le serveur.
exports.openPlayerSheetWhatsappDesktopHandler = async (req, res, next) => {
  try {
    if (!whatsappDesktop.isAvailableFor(req)) throw new ApiError(409, 'Ouverture automatique de WhatsApp Desktop possible uniquement sur le PC du serveur.');
    const [, mimetype, base64] = parsePlayerSheetImage(req.body.image);
    const destinataire = await resolvePlayerWhatsappNumber(req.body.casino_player_id, req.body.numero);
    const result = await whatsappDesktop.pasteImageInChat(destinataire, { base64, mimetype });
    if (!result.ok) throw new ApiError(502, `Ouverture de WhatsApp Desktop impossible : ${result.erreur}`);
    res.json({ ok: true, numero: destinataire });
  } catch (err) { next(err); }
};

// Envoi automatique de la capture de la fiche joueur (PNG/JPEG) au numero WhatsApp du joueur,
// depuis le compte WhatsApp rattache au serveur (transport web, QR code).
exports.sendPlayerSheetWhatsappHandler = async (req, res, next) => {
  try {
    const { image, casino_player_id: casinoPlayerId, numero, caption, filename } = req.body;
    const match = parsePlayerSheetImage(image);
    const destinataire = await resolvePlayerWhatsappNumber(casinoPlayerId, numero);

    if (transport.isWeb()) void transport.web.ensureStarted();
    const blocker = transport.describeBlocker();
    if (blocker) throw new ApiError(503, `${blocker} Connectez le compte WhatsApp (QR code) dans l’onglet Rapport de l’hôtel.`);

    const [, mimetype, base64] = match;
    const result = await transport.sendImage(destinataire, {
      base64,
      mimetype,
      filename: String(filename || `fiche-joueur.${mimetype === 'image/png' ? 'png' : 'jpg'}`),
      caption: caption ? String(caption).slice(0, 1000) : undefined,
    });
    if (!result.ok) throw new ApiError(502, `Envoi WhatsApp au ${destinataire} impossible : ${result.erreur}`);
    res.json({ ok: true, numero: destinataire });
  } catch (err) { next(err); }
};

exports.playCasinoPlayerHandler = async (req, res, next) => {
  try {
    const playerId = Number(req.params.id);
    const { game_date: gameDate, table_name: tableName, depot = 0, credit = 0 } = req.body;
    if (!Number.isInteger(playerId) || !gameDate || !tableName) throw ApiError.badRequest('Joueur, date et table obligatoires');
    const [[player]] = await pool.query(`SELECT id, nom, prenom, surnom, whatsapp, identite_verifiee FROM casino_players WHERE id = ? AND statut = 'ACTIF'`, [playerId]);
    if (!player) throw ApiError.notFound('Joueur Casino introuvable ou inactif');
    if (!player.identite_verifiee) throw ApiError.forbidden('Le joueur doit avoir une identité vérifiée avant de jouer');
    const depositAmount = asMoney(depot);
    const creditAmount = asMoney(credit);
    await pool.query(
      `INSERT INTO casino_player_games (casino_player_id, game_date, table_name, depot, credit, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE depot = VALUES(depot), credit = VALUES(credit), statut = 'EN_JEU', updated_at = CURRENT_TIMESTAMP`,
      [playerId, gameDate, tableName, depositAmount, creditAmount, req.user.id_admin || null]
    );
    await pool.query(`UPDATE casino_players SET statut_jeu = 'EN_JEU' WHERE id = ?`, [playerId]);
    const [[game]] = await pool.query(
      `SELECT g.*, p.nom, p.prenom, p.surnom, p.whatsapp FROM casino_player_games g
       JOIN casino_players p ON p.id = g.casino_player_id
       WHERE g.casino_player_id = ? AND g.game_date = ? AND g.table_name = ?`,
      [playerId, gameDate, tableName]
    );
    res.status(201).json(game);
  } catch (err) { next(err); }
};

// =====================================================================
// Tableau de bord & consolidation
// =====================================================================

exports.dashboardHandler = async (req, res, next) => {
  try {
    const [[salles]] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(statut='OUVERTE') AS ouvertes FROM casino_rooms`
    );
    const [[sessions]] = await pool.query(
      `SELECT COUNT(*) AS ouvertes FROM casino_cashier_sessions WHERE statut = 'OUVERTE'`
    );
    const [[produitJour]] = await pool.query(
      `SELECT COALESCE(SUM(produit_net),0) AS produit_net_jour
         FROM v_casino_produit_net_jour WHERE jour = CURDATE()`
    );
    const [[encours]] = await pool.query(
      `SELECT COALESCE(SUM(encours_total),0) AS encours_credit_total FROM v_casino_encours_credit`
    );
    const [[incidents]] = await pool.query(
      `SELECT COUNT(*) AS ouverts FROM casino_incidents WHERE statut IN ('OUVERT','EN_COURS')`
    );
    res.json({
      salles_total: salles.total,
      salles_ouvertes: salles.ouvertes,
      sessions_ouvertes: sessions.ouvertes,
      produit_net_jour: produitJour.produit_net_jour,
      encours_credit_total: encours.encours_credit_total,
      incidents_ouverts: incidents.ouverts,
    });
  } catch (err) { next(err); }
};

exports.produitNetHandler = async (req, res, next) => {
  try {
    const { salle, du, au } = req.query;
    const clauses = [];
    const params = [];
    if (salle) { clauses.push('salle = ?'); params.push(salle); }
    if (du) { clauses.push('jour >= ?'); params.push(du); }
    if (au) { clauses.push('jour <= ?'); params.push(au); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM v_casino_produit_net_jour ${where} ORDER BY jour DESC, salle`, params
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.ecartsCaisseHandler = async (req, res, next) => {
  try {
    const { salle, session_id } = req.query;
    const clauses = [];
    const params = [];
    if (salle) { clauses.push('r.nom = ?'); params.push(salle); }
    if (session_id) { clauses.push('cs.id = ?'); params.push(session_id); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT cs.id AS session_id, c.nom AS caisse, r.nom AS salle,
              cs.user_id, cs.ouverture_at, cs.fermeture_at, cs.fond_initial,
              cs.fond_final_theorique, cs.fond_final_declare, cs.ecart, cs.cash_check,
              cs.rack_check_verifie, cs.rack_check_montant, cs.rack_check_manquant
         FROM casino_cashier_sessions cs
         JOIN casino_cashiers c ON c.id = cs.cashier_id
         JOIN casino_rooms r ON r.id = c.room_id
         ${where}
        ORDER BY cs.ouverture_at DESC`, params
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.encoursCreditHandler = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM v_casino_encours_credit ORDER BY encours_total DESC`);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.fluxPendingHandler = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 'cash_operation' AS source, id, ref_flux_global, montant, created_at
        FROM casino_cash_operations
       WHERE ref_flux_global IS NOT NULL
         AND ref_flux_global NOT IN (SELECT ref_flux_global FROM financial_transactions WHERE ref_flux_global IS NOT NULL)
      UNION ALL
      SELECT 'chip_transaction' AS source, id, ref_flux_global, montant_total, created_at
        FROM casino_chip_transactions
       WHERE ref_flux_global IS NOT NULL
         AND ref_flux_global NOT IN (SELECT ref_flux_global FROM financial_transactions WHERE ref_flux_global IS NOT NULL)
      UNION ALL
      SELECT 'credit_repayment' AS source, id, ref_flux_global, montant, created_at
        FROM casino_credit_repayments
       WHERE ref_flux_global IS NOT NULL
         AND ref_flux_global NOT IN (SELECT ref_flux_global FROM financial_transactions WHERE ref_flux_global IS NOT NULL)
      ORDER BY created_at
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

// =====================================================================
// Sessions de caisse
// =====================================================================

exports.activeSessionsHandler = async (req, res, next) => {
  try {
    const { cashier_id } = req.query;
    const clauses = [`statut = 'OUVERTE'`];
    const params = [];
    if (cashier_id) { clauses.push('cashier_id = ?'); params.push(cashier_id); }
    const [rows] = await pool.query(
      `SELECT * FROM casino_cashier_sessions WHERE ${clauses.join(' AND ')} ORDER BY ouverture_at DESC`, params
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.openSessionHandler = async (req, res, next) => {
  try {
    const { cashier_id, fond_initial } = req.body;
    if (!cashier_id) throw ApiError.badRequest('cashier_id requis');

    const session = await withTransaction(async (conn) => {
      const [existing] = await conn.query(
        `SELECT id FROM casino_cashier_sessions WHERE cashier_id = ? AND statut = 'OUVERTE' LIMIT 1`,
        [cashier_id]
      );
      if (existing.length) throw ApiError.conflict('Une session est déjà ouverte pour cette caisse');

      const [result] = await conn.query(
        `INSERT INTO casino_cashier_sessions (cashier_id, user_id, ouverture_at, fond_initial, statut)
         VALUES (?, ?, NOW(), ?, 'OUVERTE')`,
        [cashier_id, caissierId(req), asMoney(fond_initial || 0)]
      );
      await conn.query(`UPDATE casino_cashiers SET statut = 'OUVERTE' WHERE id = ?`, [cashier_id]);
      const [[row]] = await conn.query(`SELECT * FROM casino_cashier_sessions WHERE id = ?`, [result.insertId]);
      return row;
    });

    res.status(201).json(session);
  } catch (err) { next(err); }
};

async function computeSessionTotals(conn, sessionId) {
  const [[cashTotals]] = await conn.query(
    `SELECT
       SUM(CASE WHEN type_operation IN ('BUY_IN','DEPOT','REMBOURSEMENT_CREDIT','TRANSFERT_ENTRANT') THEN montant ELSE 0 END) AS entrees,
       SUM(CASE WHEN type_operation IN ('CASH_OUT','AVANCE_CREDIT','TRANSFERT_SORTANT') THEN montant ELSE 0 END) AS sorties
     FROM casino_cash_operations WHERE cashier_session_id = ?`,
    [sessionId]
  );
  const [[chipTotals]] = await conn.query(
    `SELECT
       SUM(CASE WHEN type_operation = 'ACHAT' THEN montant_total ELSE 0 END) AS entrees,
       SUM(CASE WHEN type_operation = 'REPRISE' THEN montant_total ELSE 0 END) AS sorties
     FROM casino_chip_transactions WHERE cashier_session_id = ?`,
    [sessionId]
  );
  const entrees = Number(cashTotals.entrees || 0) + Number(chipTotals.entrees || 0);
  const sorties = Number(cashTotals.sorties || 0) + Number(chipTotals.sorties || 0);
  return { entrees, sorties };
}

exports.closeSessionHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fond_final_declare,
      commentaire,
      cash_check,
      cashing_verifie,
      cashing_montant,
      rack_check_verifie,
      rack_check_montant,
      rack_check_manquant,
    } = req.body;

    const updated = await withTransaction(async (conn) => {
      const session = await getOpenSession(conn, id);
      if (!session) throw ApiError.notFound('Session introuvable ou déjà fermée');

      const { entrees, sorties } = await computeSessionTotals(conn, id);
      const fondFinalTheorique = Number(session.fond_initial) + entrees - sorties;
      const declare = asMoney(fond_final_declare);
      const ecart = declare - fondFinalTheorique;
      const verified = Boolean(cashing_verifie === true || cashing_verifie === 1 || cashing_verifie === 'true');
      const verifiedAmount = cashing_montant === undefined || cashing_montant === null || cashing_montant === ''
        ? declare
        : asMoney(cashing_montant);
      const cashCheckValue = cash_check === undefined || cash_check === null || cash_check === ''
        ? (ecart < 0 ? Math.abs(ecart) : 0)
        : asMoney(cash_check);

      const rackCheckVerified = Boolean(rack_check_verifie === true || rack_check_verifie === 1 || rack_check_verifie === 'true');
      const rackCheckAmount = rack_check_montant === undefined || rack_check_montant === null || rack_check_montant === ''
        ? 220000
        : asMoney(rack_check_montant);
      const rackCheckMissing = rack_check_manquant === undefined || rack_check_manquant === null || rack_check_manquant === ''
        ? 0
        : asMoney(rack_check_manquant);

      await conn.query(
        `UPDATE casino_cashier_sessions
           SET fermeture_at = NOW(), fond_final_declare = ?, fond_final_theorique = ?, ecart = ?, cash_check = ?,
               cashing_verifie = ?, cashing_verifie_le = ?, cashing_verifie_par = ?, cashing_montant_verifie = ?,
               rack_check_verifie = ?, rack_check_montant = ?, rack_check_manquant = ?, rack_check_le = ?, rack_check_par = ?,
               statut = 'FERMEE', commentaire = ?
         WHERE id = ?`,
        [
          declare,
          fondFinalTheorique,
          ecart,
          cashCheckValue,
          verified ? 1 : 0,
          verified ? new Date() : null,
          verified ? req.user.id_admin : null,
          verified ? verifiedAmount : null,
          rackCheckVerified ? 1 : 0,
          rackCheckAmount,
          rackCheckMissing,
          rackCheckVerified ? new Date() : null,
          rackCheckVerified ? req.user.id_admin : null,
          commentaire || null,
          id,
        ]
      );
      await conn.query(`UPDATE casino_cashiers SET statut = 'FERMEE' WHERE id = ?`, [session.cashier_id]);

      if (verified) {
        const [[cashier]] = await conn.query(
          `SELECT nom, prenom FROM users WHERE id_admin = ? LIMIT 1`,
          [req.user.id_admin]
        );
        const [[sessionMeta]] = await conn.query(
          `SELECT c.nom AS caisse, r.nom AS salle
             FROM casino_cashier_sessions cs
             JOIN casino_cashiers c ON c.id = cs.cashier_id
             JOIN casino_rooms r ON r.id = c.room_id
            WHERE cs.id = ?`,
          [id]
        );
        const [directionUsers] = await conn.query(
          `SELECT id_admin, nom, prenom, role
             FROM users
            WHERE role IN ('admin', 'manager') AND statut = 'actif'`
        );
        const caissier = cashier ? `${cashier.prenom || ''} ${cashier.nom || ''}`.trim() : 'Caissier';
        const message = `Validation du cashing effectuée — caisse ${sessionMeta?.caisse || ''} (${sessionMeta?.salle || 'salle'}). Le caissier ${caissier} confirme le montant en espèces : ${verifiedAmount} Ariary. Écart: ${ecart} Ariary.`;
        for (const user of directionUsers) {
          await conn.query(
            `INSERT INTO notifications (titre, message, statut, created_at) VALUES (?, ?, 'nouveau', NOW())`,
            [`Validation cashing caisse ${sessionMeta?.caisse || ''}`, `${message} — Référence session #${id}`]
          );
        }
      }

      if (rackCheckVerified && rackCheckMissing > 0) {
        const [[sessionMeta]] = await conn.query(
          `SELECT c.nom AS caisse, r.nom AS salle
             FROM casino_cashier_sessions cs
             JOIN casino_cashiers c ON c.id = cs.cashier_id
             JOIN casino_rooms r ON r.id = c.room_id
            WHERE cs.id = ?`,
          [id]
        );
        const [directionUsers] = await conn.query(
          `SELECT id_admin, nom, prenom, role
             FROM users
            WHERE role IN ('admin', 'manager') AND statut = 'actif'`
        );
        const message = `Rack check signalé — caisse ${sessionMeta?.caisse || ''} (${sessionMeta?.salle || 'salle'}). Manque de jetons constaté dans le rack : ${rackCheckMissing} Ariary.`;
        for (const user of directionUsers) {
          await conn.query(
            `INSERT INTO notifications (titre, message, statut, created_at) VALUES (?, ?, 'nouveau', NOW())`,
            [`Rack check caisse ${sessionMeta?.caisse || ''}`, `${message} — Référence session #${id}`]
          );
        }
      }

      const [[row]] = await conn.query(`SELECT * FROM casino_cashier_sessions WHERE id = ?`, [id]);
      return row;
    });

    res.json(updated);
  } catch (err) { next(err); }
};

exports.sessionSummaryHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[session]] = await pool.query(`SELECT * FROM casino_cashier_sessions WHERE id = ?`, [id]);
    if (!session) throw ApiError.notFound('Session introuvable');
    const { entrees, sorties } = await computeSessionTotals(pool, id);
    res.json({
      session,
      total_entrees: entrees,
      total_sorties: sorties,
      solde_theorique: Number(session.fond_initial) + entrees - sorties,
    });
  } catch (err) { next(err); }
};

exports.sessionTransactionsHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT 'cash_operation' AS source, id, type_operation, montant, moyen_paiement, client_id, client_libre, created_at
         FROM casino_cash_operations WHERE cashier_session_id = ?
       UNION ALL
       SELECT 'chip_transaction' AS source, id, type_operation, montant_total AS montant, moyen_paiement, client_id, client_libre, created_at
         FROM casino_chip_transactions WHERE cashier_session_id = ?
       ORDER BY created_at`,
      [id, id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// =====================================================================
// Clients en caisse (recherche / ajout simple, sans carte obligatoire)
// =====================================================================

exports.searchClientHandler = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT id, code_client, nom, prenom, telephone, is_casino_player, statut
         FROM clients
        WHERE deleted_at IS NULL AND (nom LIKE ? OR prenom LIKE ? OR telephone LIKE ? OR code_client LIKE ?)
        ORDER BY nom LIMIT 20`,
      [like, like, like, like]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.quickAddClientHandler = async (req, res, next) => {
  try {
    const { nom, prenom, telephone } = req.body;
    if (!nom) throw ApiError.badRequest('nom requis');
    const [result] = await pool.query(
      `INSERT INTO clients (nom, prenom, telephone, is_casino_player, statut, created_at)
       VALUES (?, ?, ?, 1, 'ACTIF', NOW())`,
      [nom, prenom || null, telephone || null]
    );
    const [[client]] = await pool.query(`SELECT * FROM clients WHERE id = ?`, [result.insertId]);
    res.status(201).json(client);
  } catch (err) { next(err); }
};

exports.clientProfileHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[client]] = await pool.query(`SELECT * FROM clients WHERE id = ?`, [id]);
    if (!client) throw ApiError.notFound('Client introuvable');
    const [[profile]] = await pool.query(`SELECT * FROM casino_client_profiles WHERE client_id = ?`, [id]);
    const [[card]] = await pool.query(`SELECT * FROM casino_cards WHERE client_id = ?`, [id]);
    const [[lastScore]] = await pool.query(
      `SELECT * FROM casino_scores WHERE client_id = ? ORDER BY calcule_le DESC LIMIT 1`, [id]
    );
    const [[account]] = await pool.query(`SELECT solde FROM client_accounts WHERE client_id = ?`, [id]);
    res.json({
      client,
      profile: profile || null,
      card: card || null,
      dernier_score: lastScore || null,
      solde_compte: account ? Number(account.solde) : 0,
    });
  } catch (err) { next(err); }
};

exports.clientHistoryHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [visites] = await pool.query(
      `SELECT v.*, r.nom AS salle FROM casino_visits v
         JOIN casino_rooms r ON r.id = v.room_id
        WHERE v.client_id = ? ORDER BY v.entree_at DESC LIMIT 100`,
      [id]
    );
    const [salles] = await pool.query(
      `SELECT r.id, r.nom, COUNT(*) AS nb_visites
         FROM casino_visits v JOIN casino_rooms r ON r.id = v.room_id
        WHERE v.client_id = ? GROUP BY r.id, r.nom ORDER BY nb_visites DESC`,
      [id]
    );
    res.json({ visites, salles_frequentees: salles });
  } catch (err) { next(err); }
};

exports.clientConsumptionHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[stats]] = await pool.query(
      `SELECT COUNT(*) AS nb_commandes, COALESCE(AVG(montant_total),0) AS panier_moyen,
              MIN(created_at) AS premiere_commande, MAX(created_at) AS derniere_commande
         FROM orders WHERE client_id = ? AND source_module IN ('RESTAURANT','BAR')`,
      [id]
    );
    res.json(stats);
  } catch (err) { next(err); }
};

exports.clientIncidentsHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM casino_incidents WHERE client_id = ? ORDER BY created_at DESC`, [id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// =====================================================================
// Cartes de fidélité + scan QR
// =====================================================================

exports.scanCardHandler = async (req, res, next) => {
  try {
    const { qrCode } = req.params;
    const [[card]] = await pool.query(`SELECT * FROM casino_cards WHERE qr_code = ?`, [qrCode]);
    if (!card) throw ApiError.notFound('Carte introuvable pour ce QR code');
    const [[client]] = await pool.query(`SELECT * FROM clients WHERE id = ?`, [card.client_id]);
    const [[profile]] = await pool.query(`SELECT * FROM casino_client_profiles WHERE client_id = ?`, [card.client_id]);
    res.json({ card, client, profile: profile || null });
  } catch (err) { next(err); }
};

exports.cardByClientHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const [[card]] = await pool.query(`SELECT * FROM casino_cards WHERE client_id = ?`, [clientId]);
    if (!card) throw ApiError.notFound('Aucune carte pour ce client');
    res.json(card);
  } catch (err) { next(err); }
};

exports.addPointsHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { points } = req.body;
    if (!Number.isFinite(Number(points))) throw ApiError.badRequest('points invalide');
    await pool.query(`UPDATE casino_cards SET points = points + ? WHERE id = ?`, [Number(points), id]);
    const [[card]] = await pool.query(`SELECT * FROM casino_cards WHERE id = ?`, [id]);
    if (!card) throw ApiError.notFound('Carte introuvable');
    res.json(card);
  } catch (err) { next(err); }
};

// =====================================================================
// Profil client / statut spécial (toujours une décision humaine)
// =====================================================================

exports.setClientStatutHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { statut_special, motif } = req.body;
    const allowed = ['NORMAL', 'VIP', 'A_SURVEILLER', 'EXCLU', 'AUTO_EXCLU'];
    if (!allowed.includes(statut_special)) throw ApiError.badRequest('statut_special invalide');

    await pool.query(
      `INSERT INTO casino_client_profiles (client_id, statut_special, motif, date_effet, decide_par)
       VALUES (?, ?, ?, CURDATE(), ?)
       ON DUPLICATE KEY UPDATE statut_special = VALUES(statut_special), motif = VALUES(motif),
         date_effet = VALUES(date_effet), decide_par = VALUES(decide_par), updated_at = NOW()`,
      [clientId, statut_special, motif || null, caissierId(req)]
    );
    const [[profile]] = await pool.query(`SELECT * FROM casino_client_profiles WHERE client_id = ?`, [clientId]);
    res.json(profile);
  } catch (err) { next(err); }
};

// =====================================================================
// Jetons — mouvements (le CRUD des types est `chipTypesCrud` ci-dessus)
// =====================================================================

async function chipMovement(req, res, next, typeOperation) {
  try {
    const { session_id, chip_type_id, quantite, client_id, client_libre, moyen_paiement } = req.body;
    const qty = Number(quantite);
    if (!Number.isInteger(qty) || qty <= 0) throw ApiError.badRequest('quantite invalide');

    const tx = await withTransaction(async (conn) => {
      const session = await getOpenSession(conn, session_id);
      if (!session) throw ApiError.badRequest('Session de caisse introuvable ou fermée');

      // FOR UPDATE : verrouille la ligne le temps de la transaction pour
      // éviter une survente en cas de mouvements concurrents sur le même type.
      const [[chipType]] = await conn.query(
        `SELECT * FROM casino_chip_types WHERE id = ? AND statut = 'ACTIF' FOR UPDATE`,
        [chip_type_id]
      );
      if (!chipType) throw ApiError.notFound('Type de jeton introuvable ou inactif');

      if (typeOperation === 'ACHAT' && chipType.quantite_stock < qty) {
        throw ApiError.conflict(
          `Stock de jetons insuffisant (disponible : ${chipType.quantite_stock}, demandé : ${qty})`
        );
      }

      const stockDelta = typeOperation === 'ACHAT' ? -qty : qty;
      await conn.query(
        `UPDATE casino_chip_types SET quantite_stock = quantite_stock + ? WHERE id = ?`,
        [stockDelta, chip_type_id]
      );

      const ref = genRef();
      const [result] = await conn.query(
        `INSERT INTO casino_chip_transactions
           (chip_type_id, cashier_session_id, client_id, client_libre, type_operation, quantite, valeur_unitaire,
            moyen_paiement, ref_flux_global, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [chip_type_id, session_id, client_id || null, client_id ? null : (client_libre || null),
         typeOperation, qty, chipType.valeur_nominale, moyen_paiement || 'ESPECES', ref, caissierId(req)]
      );

      const montantTotal = qty * chipType.valeur_nominale;
      await recordFinancialTransaction(conn, {
        client_id: client_id || null,
        type_flux: typeOperation === 'ACHAT' ? 'ENTREE_CAISSE_CASINO' : 'SORTIE_CAISSE_CASINO',
        montant: montantTotal,
        reference_id: result.insertId,
        ref_flux_global: ref,
        description: `${typeOperation} ${qty} jeton(s) ${chipType.nom}`,
      });

      const [[row]] = await conn.query(`SELECT * FROM casino_chip_transactions WHERE id = ?`, [result.insertId]);
      return row;
    });

    res.status(201).json(tx);
  } catch (err) { next(err); }
}

exports.buyChipsHandler = (req, res, next) => chipMovement(req, res, next, 'ACHAT');
exports.sellChipsHandler = (req, res, next) => chipMovement(req, res, next, 'REPRISE');

// =====================================================================
// Paiement en jetons dans un autre département (Restaurant/Bar/Boutique/
// Hébergement). Distinct de chipMovement : pas de session de caisse casino
// obligatoire, client_id obligatoire (traçabilité), recette imputée au
// module cible et non au casino.
// =====================================================================

const CHIP_PAYMENT_MODULES = ['RESTAURANT', 'BAR', 'BOUTIQUE', 'HEBERGEMENT'];

exports.payWithChipsHandler = async (req, res, next) => {
  try {
    const { client_id, chip_type_id, quantite, module_cible, reference_commande_id } = req.body;
    const qty = Number(quantite);

    if (!client_id) throw ApiError.badRequest('client_id obligatoire pour un paiement en jetons');
    if (!Number.isInteger(qty) || qty <= 0) throw ApiError.badRequest('quantite invalide');
    if (!CHIP_PAYMENT_MODULES.includes(module_cible)) {
      throw ApiError.badRequest(`module_cible invalide (attendu : ${CHIP_PAYMENT_MODULES.join(', ')})`);
    }

    const tx = await withTransaction(async (conn) => {
      const [[chipType]] = await conn.query(
        `SELECT * FROM casino_chip_types WHERE id = ? AND statut = 'ACTIF' FOR UPDATE`,
        [chip_type_id]
      );
      if (!chipType) throw ApiError.notFound('Type de jeton introuvable ou inactif');

      // Les jetons remis au comptoir du module cible reviennent physiquement
      // à la cage du casino (réconciliation manuelle des espèces/jetons côté
      // module cible) → le stock casino est réincrémenté immédiatement.
      await conn.query(
        `UPDATE casino_chip_types SET quantite_stock = quantite_stock + ? WHERE id = ?`,
        [qty, chip_type_id]
      );

      const ref = genRef();
      const montantTotal = qty * chipType.valeur_nominale;

      const [result] = await conn.query(
        `INSERT INTO casino_chip_transactions
           (chip_type_id, cashier_session_id, client_id, client_libre, type_operation, module_cible,
            reference_commande_id, quantite, valeur_unitaire, moyen_paiement, ref_flux_global, created_by, created_at)
         VALUES (?, NULL, ?, NULL, 'PAIEMENT', ?, ?, ?, ?, 'JETONS', ?, ?, NOW())`,
        [chip_type_id, client_id, module_cible, reference_commande_id || null,
         qty, chipType.valeur_nominale, ref, caissierId(req)]
      );

      // Recette attribuée au vrai département consommateur, pas au casino,
      // pour que produit_net / reporting casino ne soit pas gonflé à tort.
      await recordFinancialTransaction(conn, {
        client_id,
        module: module_cible,
        type_flux: `PAIEMENT_JETONS_${module_cible}`,
        montant: montantTotal,
        reference_id: reference_commande_id || result.insertId,
        ref_flux_global: ref,
        description: `Paiement en jetons (${qty} × ${chipType.nom}) — ${module_cible}`,
      });

      const [[row]] = await conn.query(`SELECT * FROM casino_chip_transactions WHERE id = ?`, [result.insertId]);
      return row;
    });

    res.status(201).json(tx);
  } catch (err) { next(err); }
};

exports.chipHistoryByClientHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const [rows] = await pool.query(
      `SELECT ct.*, t.nom AS type_jeton FROM casino_chip_transactions ct
         JOIN casino_chip_types t ON t.id = ct.chip_type_id
        WHERE ct.client_id = ? ORDER BY ct.created_at DESC`,
      [clientId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// =====================================================================
// Opérations de caisse (buy-in / cash-out / dépôt)
// =====================================================================

async function insertCashOperation(req, res, next, typeOperation) {
  try {
    const { session_id, montant, moyen_paiement, client_id, client_libre } = req.body;
    const amount = asMoney(montant);

    const op = await withTransaction(async (conn) => {
      const session = await getOpenSession(conn, session_id);
      if (!session) throw ApiError.badRequest('Session de caisse introuvable ou fermée');

      const ref = genRef();
      const [result] = await conn.query(
        `INSERT INTO casino_cash_operations
           (cashier_session_id, client_id, client_libre, type_operation, montant, moyen_paiement,
            ref_flux_global, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [session_id, client_id || null, client_id ? null : (client_libre || null),
         typeOperation, amount, moyen_paiement || 'ESPECES', ref, caissierId(req)]
      );

      const entree = ['BUY_IN', 'DEPOT', 'REMBOURSEMENT_CREDIT'].includes(typeOperation);
      await recordFinancialTransaction(conn, {
        client_id: client_id || null,
        type_flux: entree ? 'ENTREE_CAISSE_CASINO' : 'SORTIE_CAISSE_CASINO',
        montant: amount,
        reference_id: result.insertId,
        ref_flux_global: ref,
        description: `${typeOperation} caisse casino`,
      });

      const [[row]] = await conn.query(`SELECT * FROM casino_cash_operations WHERE id = ?`, [result.insertId]);
      return row;
    });

    res.status(201).json(op);
  } catch (err) { next(err); }
}

exports.buyInHandler = (req, res, next) => insertCashOperation(req, res, next, 'BUY_IN');
exports.cashOutHandler = (req, res, next) => insertCashOperation(req, res, next, 'CASH_OUT');
exports.depositHandler = (req, res, next) => insertCashOperation(req, res, next, 'DEPOT');

// =====================================================================
// Crédits joueur
// =====================================================================

exports.grantCreditHandler = async (req, res, next) => {
  try {
    const { client_id, montant, echeance, session_id } = req.body;
    const amount = asMoney(montant);

    const credit = await withTransaction(async (conn) => {
      const config = await getScoringConfigMap(conn);
      const [[card]] = await conn.query(`SELECT plafond_credit FROM casino_cards WHERE client_id = ?`, [client_id]);
      const plafond = (card && card.plafond_credit != null) ? Number(card.plafond_credit) : Number(config.plafond_credit_defaut || 0);

      const [[encoursRow]] = await conn.query(
        `SELECT COALESCE(SUM(encours),0) AS total FROM casino_credits WHERE client_id = ? AND statut IN ('ACTIF','EN_RETARD')`,
        [client_id]
      );
      if (Number(encoursRow.total) + amount > plafond) {
        throw ApiError.conflict(`Plafond de crédit dépassé (plafond: ${plafond}, encours actuel: ${encoursRow.total})`);
      }

      const [result] = await conn.query(
        `INSERT INTO casino_credits (client_id, session_id, montant_accorde, encours, date_octroi, echeance, statut, created_by)
         VALUES (?, ?, ?, ?, NOW(), ?, 'ACTIF', ?)`,
        [client_id, session_id || null, amount, amount, echeance || null, caissierId(req)]
      );
      await adjustClientAccountSolde(conn, client_id, amount);
      const [[row]] = await conn.query(`SELECT * FROM casino_credits WHERE id = ?`, [result.insertId]);
      return row;
    });

    res.status(201).json(credit);
  } catch (err) { next(err); }
};

exports.drawCreditHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { session_id, montant, moyen_paiement } = req.body;
    const amount = asMoney(montant);

    const op = await withTransaction(async (conn) => {
      const [[credit]] = await conn.query(`SELECT * FROM casino_credits WHERE id = ? AND statut IN ('ACTIF','EN_RETARD')`, [id]);
      if (!credit) throw ApiError.notFound('Crédit introuvable ou soldé');

      const session = await getOpenSession(conn, session_id);
      if (!session) throw ApiError.badRequest('Session de caisse introuvable ou fermée');

      const ref = genRef();
      const [result] = await conn.query(
        `INSERT INTO casino_cash_operations
           (cashier_session_id, client_id, type_operation, montant, moyen_paiement, credit_id, ref_flux_global, created_by, created_at)
         VALUES (?, ?, 'AVANCE_CREDIT', ?, ?, ?, ?, ?, NOW())`,
        [session_id, credit.client_id, amount, moyen_paiement || 'ESPECES', id, ref, caissierId(req)]
      );
      await recordFinancialTransaction(conn, {
        client_id: credit.client_id,
        type_flux: 'SORTIE_CAISSE_CASINO',
        montant: amount,
        reference_id: result.insertId,
        ref_flux_global: ref,
        description: `Avance sur crédit #${id}`,
      });
      await adjustClientAccountSolde(conn, credit.client_id, amount);

      const [[row]] = await conn.query(`SELECT * FROM casino_cash_operations WHERE id = ?`, [result.insertId]);
      return row;
    });

    res.status(201).json(op);
  } catch (err) { next(err); }
};

exports.repayCreditHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { montant, moyen_paiement, session_id } = req.body;
    const amount = asMoney(montant);

    const repayment = await withTransaction(async (conn) => {
      const [[credit]] = await conn.query(`SELECT * FROM casino_credits WHERE id = ?`, [id]);
      if (!credit) throw ApiError.notFound('Crédit introuvable');

      const delaiJours = credit.echeance
        ? Math.round((Date.now() - new Date(credit.echeance).getTime()) / 86400000)
        : null;

      const ref = genRef();
      const [repayResult] = await conn.query(
        `INSERT INTO casino_credit_repayments
           (credit_id, montant, date_remboursement, delai_jours, moyen_paiement, ref_flux_global, created_by, created_at)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, NOW())`,
        [id, amount, delaiJours, moyen_paiement || 'ESPECES', ref, caissierId(req)]
      );

      const nouvelEncours = Math.max(0, Number(credit.encours) - amount);
      const nouveauStatut = nouvelEncours === 0 ? 'SOLDE' : (delaiJours && delaiJours > 0 ? 'EN_RETARD' : credit.statut);
      await conn.query(`UPDATE casino_credits SET encours = ?, statut = ? WHERE id = ?`, [nouvelEncours, nouveauStatut, id]);
      await adjustClientAccountSolde(conn, credit.client_id, -amount);

      if (session_id) {
        await conn.query(
          `INSERT INTO casino_cash_operations
             (cashier_session_id, client_id, type_operation, montant, moyen_paiement, credit_id, created_by, created_at)
           VALUES (?, ?, 'REMBOURSEMENT_CREDIT', ?, ?, ?, ?, NOW())`,
          [session_id, credit.client_id, amount, moyen_paiement || 'ESPECES', id, caissierId(req)]
        );
      }

      await recordFinancialTransaction(conn, {
        client_id: credit.client_id,
        type_flux: 'ENTREE_CAISSE_CASINO',
        montant: amount,
        reference_id: repayResult.insertId,
        ref_flux_global: ref,
        description: `Remboursement crédit #${id}`,
      });

      const [[row]] = await conn.query(`SELECT * FROM casino_credit_repayments WHERE id = ?`, [repayResult.insertId]);
      return row;
    });

    res.status(201).json(repayment);
  } catch (err) { next(err); }
};

exports.activeCreditsByClientHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM casino_credits WHERE client_id = ? AND statut IN ('ACTIF','EN_RETARD') ORDER BY date_octroi DESC`,
      [clientId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// =====================================================================
// Scoring de crédit — configurable, traçable, jamais bloquant à lui seul
// =====================================================================

exports.getScoringConfigHandler = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM casino_scoring_config ORDER BY cle`);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.updateScoringConfigHandler = async (req, res, next) => {
  try {
    const { cle, valeur } = req.body;
    if (!cle || valeur === undefined) throw ApiError.badRequest('cle et valeur requis');
    // Protégée par requireRole('admin','manager') au niveau de la route.
    const [result] = await pool.query(
      `UPDATE casino_scoring_config SET valeur = ?, updated_by = ?, updated_at = NOW() WHERE cle = ?`,
      [String(valeur), caissierId(req), cle]
    );
    if (result.affectedRows === 0) throw ApiError.notFound('Paramètre inconnu');
    const [[row]] = await pool.query(`SELECT * FROM casino_scoring_config WHERE cle = ?`, [cle]);
    res.json(row);
  } catch (err) { next(err); }
};

exports.computeScoreHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const row = await withTransaction(async (conn) => {
      const config = await getScoringConfigMap(conn);
      const poids = {
        remboursement: Number(config.poids_ratio_remboursement || 0),
        retard: Number(config.poids_retard_moyen || 0),
        encours: Number(config.poids_encours_vs_plafond || 0),
        anciennete: Number(config.poids_anciennete || 0),
        regularite: Number(config.poids_regularite || 0),
      };
      const plafondDefaut = Number(config.plafond_credit_defaut || 0);
      const seuilBon = Number(config.seuil_bon_payeur || 75);
      const seuilMoyen = Number(config.seuil_moyen_payeur || 50);

      const [[card]] = await conn.query(`SELECT plafond_credit FROM casino_cards WHERE client_id = ?`, [clientId]);
      const plafond = (card && card.plafond_credit != null) ? Number(card.plafond_credit) : plafondDefaut;

      const [[creditAgg]] = await conn.query(
        `SELECT COALESCE(SUM(montant_accorde),0) AS accorde, COALESCE(SUM(encours),0) AS encours_actuel
           FROM casino_credits WHERE client_id = ?`, [clientId]
      );
      const [[repayAgg]] = await conn.query(
        `SELECT COALESCE(SUM(cr.montant),0) AS rembourse, AVG(GREATEST(cr.delai_jours,0)) AS retard_moyen
           FROM casino_credit_repayments cr JOIN casino_credits c ON c.id = cr.credit_id
          WHERE c.client_id = ?`, [clientId]
      );
      const [[anciennete]] = await conn.query(
        `SELECT MIN(entree_at) AS premiere_visite FROM casino_visits WHERE client_id = ?`, [clientId]
      );
      const [[regularite]] = await conn.query(
        `SELECT COUNT(*) AS nb_visites_12m FROM casino_visits
          WHERE client_id = ? AND entree_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`, [clientId]
      );

      const ratioRemboursement = creditAgg.accorde > 0
        ? Math.min(1, Number(repayAgg.rembourse) / Number(creditAgg.accorde)) : 1;
      const retardMoyenJours = Number(repayAgg.retard_moyen || 0);
      const retardScore = Math.max(0, 1 - Math.min(retardMoyenJours, 30) / 30);
      const encoursRatio = plafond > 0 ? Math.min(1, Number(creditAgg.encours_actuel) / plafond) : 0;
      const encoursScore = 1 - encoursRatio;
      const ancienneteMois = anciennete.premiere_visite
        ? Math.max(0, (Date.now() - new Date(anciennete.premiere_visite).getTime()) / (30 * 86400000)) : 0;
      const ancienneteScore = Math.min(1, ancienneteMois / 24);
      const regulariteScore = Math.min(1, Number(regularite.nb_visites_12m || 0) / 24);

      const totalPoids = Object.values(poids).reduce((a, b) => a + b, 0) || 1;
      const score = 100 * (
        poids.remboursement * ratioRemboursement +
        poids.retard * retardScore +
        poids.encours * encoursScore +
        poids.anciennete * ancienneteScore +
        poids.regularite * regulariteScore
      ) / totalPoids;

      const categorie = score >= seuilBon ? 'BON' : (score >= seuilMoyen ? 'MOYEN' : 'MAUVAIS');

      const facteurs = {
        ratio_remboursement: { valeur: ratioRemboursement, poids: poids.remboursement },
        retard_moyen_jours: { valeur: retardMoyenJours, score: retardScore, poids: poids.retard },
        encours_vs_plafond: { encours: Number(creditAgg.encours_actuel), plafond, ratio: encoursRatio, poids: poids.encours },
        anciennete_mois: { valeur: Math.round(ancienneteMois), poids: poids.anciennete },
        regularite_visites_12m: { valeur: Number(regularite.nb_visites_12m || 0), poids: poids.regularite },
        seuils: { seuil_bon_payeur: seuilBon, seuil_moyen_payeur: seuilMoyen },
      };

      const [result] = await conn.query(
        `INSERT INTO casino_scores (client_id, score, categorie, facteurs, calcule_le, decision)
         VALUES (?, ?, ?, ?, NOW(), 'AUCUNE')`,
        [clientId, score.toFixed(2), categorie, JSON.stringify(facteurs)]
      );
      const [[scoreRow]] = await conn.query(`SELECT * FROM casino_scores WHERE id = ?`, [result.insertId]);
      return scoreRow;
    });

    // Important : ce calcul ne modifie JAMAIS casino_client_profiles.statut_special
    // automatiquement. Toute conséquence (restriction, surveillance, exclusion)
    // nécessite un appel explicite à /client-profiles/:clientId/statut par un
    // humain, après revue de /scoring/:scoreId/decision.
    res.status(201).json(row);
  } catch (err) { next(err); }
};

exports.scoreHistoryHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM casino_scores WHERE client_id = ? ORDER BY calcule_le DESC`, [clientId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.scoreDecisionHandler = async (req, res, next) => {
  try {
    const { scoreId } = req.params;
    const { decision, commentaire } = req.body;
    const allowed = ['VALIDEE', 'CONTESTEE', 'ANNULEE'];
    if (!allowed.includes(decision)) throw ApiError.badRequest('decision invalide');

    const [result] = await pool.query(
      `UPDATE casino_scores SET decision = ?, decide_par = ?, decide_le = NOW(), commentaire_contestation = ?
       WHERE id = ?`,
      [decision, caissierId(req), commentaire || null, scoreId]
    );
    if (result.affectedRows === 0) throw ApiError.notFound('Score introuvable');
    const [[row]] = await pool.query(`SELECT * FROM casino_scores WHERE id = ?`, [scoreId]);
    res.json(row);
  } catch (err) { next(err); }
};

// =====================================================================
// Visites de salle (check-in / check-out, QR ou manuel)
// =====================================================================

exports.checkInHandler = async (req, res, next) => {
  try {
    const { room_id, client_id, qr_code, entree_via } = req.body;
    let resolvedClientId = client_id || null;
    let cardId = null;

    if (qr_code) {
      const [[card]] = await pool.query(`SELECT * FROM casino_cards WHERE qr_code = ?`, [qr_code]);
      if (!card) throw ApiError.notFound('QR code inconnu');
      resolvedClientId = card.client_id;
      cardId = card.id;
    }
    if (!resolvedClientId) throw ApiError.badRequest('client_id ou qr_code requis');

    const [result] = await pool.query(
      `INSERT INTO casino_visits (client_id, room_id, card_id, entree_at, entree_via)
       VALUES (?, ?, ?, NOW(), ?)`,
      [resolvedClientId, room_id, cardId, entree_via || (qr_code ? 'QR' : 'MANUEL')]
    );
    const [[visit]] = await pool.query(`SELECT * FROM casino_visits WHERE id = ?`, [result.insertId]);
    res.status(201).json(visit);
  } catch (err) { next(err); }
};

exports.checkOutHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`UPDATE casino_visits SET sortie_at = NOW() WHERE id = ? AND sortie_at IS NULL`, [id]);
    if (result.affectedRows === 0) throw ApiError.notFound('Visite introuvable ou déjà clôturée');
    const [[visit]] = await pool.query(`SELECT * FROM casino_visits WHERE id = ?`, [id]);
    res.json(visit);
  } catch (err) { next(err); }
};

exports.currentlyInRoomHandler = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const [rows] = await pool.query(
      `SELECT v.*, c.nom, c.prenom FROM casino_visits v
         JOIN clients c ON c.id = v.client_id
        WHERE v.room_id = ? AND v.sortie_at IS NULL
        ORDER BY v.entree_at`,
      [roomId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// -------------------------------------------------------------------------
// Tables de jeu (CRUD standard + ouvrir/fermer)
// -------------------------------------------------------------------------
 
const genericTablesJeuCrud = buildCrud('casino_tables_jeu', {
  allowedFields: [
    'room_id', 'cashier_id', 'numero', 'type_jeu', 'type_partie', 'nombre_places', 'cave_minimum',
    'salaire_horaire_croupier', 'duree_jeu_simple_minutes', 'duree_prolongation_minutes', 'statut',
  ],
});

exports.tablesJeuCrud = genericTablesJeuCrud;
exports.tablesJeuCrud.create = async (req, res, next) => {
  try {
    const roomId = Number(req.body.room_id);
    const cashierId = Number(req.body.cashier_id);
    if (!Number.isInteger(roomId) || roomId < 1) throw ApiError.badRequest('Une salle valide est requise pour créer la table');
    if (!Number.isInteger(cashierId) || cashierId < 1) throw ApiError.badRequest('Une caisse est requise pour créer la table');
    const [[room]] = await pool.query(`SELECT id FROM casino_rooms WHERE id = ?`, [roomId]);
    if (!room) throw ApiError.badRequest('La salle sélectionnée n’existe plus. Actualisez la liste des salles puis recommencez.');
    const [[cashier]] = await pool.query(`SELECT id FROM casino_cashiers WHERE id = ? AND room_id = ?`, [cashierId, roomId]);
    if (!cashier) throw ApiError.badRequest('La caisse sélectionnée n’appartient pas à cette salle.');

    const numero = String(req.body.numero || '').trim();
    const typeJeu = req.body.type_jeu || 'AUTRE';
    const typePartie = req.body.type_partie || 'JEU_SIMPLE';
    const nombrePlaces = Number(req.body.nombre_places || 8);
    const caveMinimum = Number(req.body.cave_minimum);
    const salaire = Number(req.body.salaire_horaire_croupier || 0);
    const dureeSimple = Number(req.body.duree_jeu_simple_minutes || 120);
    const dureeProlongation = Number(req.body.duree_prolongation_minutes || 60);
    if (!numero) throw ApiError.badRequest('Le numéro de table est requis');
    if (!['POKER', 'BLACKJACK', 'ROULETTE', 'BACCARA', 'AUTRE'].includes(typeJeu)) throw ApiError.badRequest('Type de jeu invalide');
    if (!['JEU_SIMPLE', 'TOURNOI'].includes(typePartie)) throw ApiError.badRequest('Format de partie invalide');
    if (!Number.isInteger(nombrePlaces) || nombrePlaces < 2) throw ApiError.badRequest('Le nombre de places doit être au moins égal à 2');
    if (!Number.isFinite(caveMinimum) || caveMinimum <= 0) throw ApiError.badRequest('La cave minimum doit être positive');
    if (!Number.isFinite(salaire) || salaire < 0 || !Number.isInteger(dureeSimple) || dureeSimple <= 0 || !Number.isInteger(dureeProlongation) || dureeProlongation <= 0) {
      throw ApiError.badRequest('Les paramètres de durée ou de salaire sont invalides');
    }
    const [result] = await pool.query(
      `INSERT INTO casino_tables_jeu
        (room_id, cashier_id, numero, type_jeu, type_partie, nombre_places, cave_minimum,
         salaire_horaire_croupier, duree_jeu_simple_minutes, duree_prolongation_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [roomId, cashierId, numero, typeJeu, typePartie, nombrePlaces, caveMinimum, salaire, dureeSimple, dureeProlongation]
    );
    const [[table]] = await pool.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [result.insertId]);
    res.status(201).json(table);
  } catch (err) { next(err); }
};
exports.tablesJeuCrud.update = async (req, res, next) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, 'room_id')) {
      const roomId = Number(req.body.room_id);
      const [[room]] = await pool.query(`SELECT id FROM casino_rooms WHERE id = ?`, [roomId]);
      if (!room) throw ApiError.badRequest('La salle sélectionnée n’existe plus. Actualisez la liste des salles puis recommencez.');
    }
    await genericTablesJeuCrud.update(req, res, next);
  } catch (err) { next(err); }
};
 
exports.ouvrirTableHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Chaque ouverture = nouvelle session de jeu : le timer "temps de jeu
    // simple" repart de zéro (derniere_ouverture_at = NOW()) et l'historique
    // de prolongation d'une session précédente n'est plus pris en compte
    // (derniere_prolongation_at remis à NULL).
    const [result] = await pool.query(
      `UPDATE casino_tables_jeu SET statut = 'OUVERTE', derniere_ouverture_at = NOW(), derniere_prolongation_at = NULL WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) throw ApiError.notFound('Table de jeu introuvable');
    const [[row]] = await pool.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [id]);
    res.json(row);
  } catch (err) { next(err); }
};
 
exports.fermerTableHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await withTransaction(async (conn) => {
      const [result] = await conn.query(
        `UPDATE casino_tables_jeu SET statut = 'FERMEE', derniere_prolongation_at = NULL WHERE id = ?`,
        [id]
      );
      if (result.affectedRows === 0) throw ApiError.notFound('Table de jeu introuvable');

      // Fermeture de la table = tous les joueurs encore présents sont
      // considérés partis à cet instant (départ manuel possible avant via
      // "Terminer" pour une précision fine par joueur).
      await conn.query(
        `UPDATE casino_table_visits SET sortie_at = NOW() WHERE table_jeu_id = ? AND sortie_at IS NULL`,
        [id]
      );

      const [[updated]] = await conn.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [id]);
      return updated;
    });
    res.json(row);
  } catch (err) { next(err); }
};
 
// -------------------------------------------------------------------------
// Caves & recaves
// -------------------------------------------------------------------------
 
exports.addCaveHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const { session_id, client_id, client_libre, numero_adherent, numero_place, montant, statut_paiement, moyen_paiement } = req.body;
    const amount = asMoney(montant);
    const statutPaiement = statut_paiement === 'NON_PAYE' ? 'NON_PAYE' : 'PAYE';
    if (!client_id && !client_libre) throw ApiError.badRequest('client_id ou client_libre requis');
 
    const cave = await withTransaction(async (conn) => {
      const [[table]] = await conn.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [tableJeuId]);
      if (!table) throw ApiError.notFound('Table de jeu introuvable');
      if (table.statut !== 'OUVERTE') throw ApiError.badRequest('Cette table de jeu est fermée');

      const place = Number(numero_place);
      if (!Number.isInteger(place) || place < 1 || place > Number(table.nombre_places)) {
        throw ApiError.badRequest(`Le numéro de place doit être compris entre 1 et ${table.nombre_places}`);
      }
 
      const session = await getOpenSession(conn, session_id);
      if (!session) throw ApiError.badRequest('Session de caisse introuvable ou fermée');
 
      // Verrouille les caves déjà enregistrées pour ce joueur/table/jour, le
      // temps de la transaction, pour éviter une désynchronisation de
      // numero_cave / montant_total_joueur en cas de doubles clics concurrents.
      const identClause = client_id ? 'client_id = ?' : 'client_libre = ?';
      const identParam = client_id || client_libre;
      const [previousRows] = await conn.query(
        `SELECT * FROM casino_table_caves
          WHERE table_jeu_id = ? AND ${identClause} AND date_jeu = CURDATE()
          ORDER BY numero_cave ASC FOR UPDATE`,
        [tableJeuId, identParam]
      );
 
      const numeroCave = previousRows.length + 1;
      const heureArrivee = previousRows.length ? previousRows[0].heure_arrivee : new Date();
      const montantTotalJoueur = previousRows.reduce((sum, r) => sum + Number(r.montant_cave), 0) + amount;
 
      if (numeroCave === 1 && amount < Number(table.cave_minimum)) {
        throw ApiError.badRequest(`La cave initiale doit être au moins de ${table.cave_minimum} Ar`);
      }
 
      let cashOperationId = null;
      if (statutPaiement === 'PAYE') {
        const ref = genRef();
        const [opResult] = await conn.query(
          `INSERT INTO casino_cash_operations
             (cashier_session_id, client_id, client_libre, type_operation, montant, moyen_paiement,
              ref_flux_global, created_by, created_at)
           VALUES (?, ?, ?, 'BUY_IN', ?, ?, ?, ?, NOW())`,
          [session_id, client_id || null, client_id ? null : (client_libre || null),
           amount, moyen_paiement || 'ESPECES', ref, caissierId(req)]
        );
        cashOperationId = opResult.insertId;
 
        await recordFinancialTransaction(conn, {
          client_id: client_id || null,
          type_flux: 'ENTREE_CAISSE_CASINO',
          montant: amount,
          reference_id: cashOperationId,
          ref_flux_global: ref,
          description: `Cave/recave table ${table.numero} (n°${numeroCave})`,
        });
      }
 
      const [result] = await conn.query(
        `INSERT INTO casino_table_caves
           (table_jeu_id, cashier_session_id, client_id, client_libre, numero_adherent, date_jeu,
            heure_arrivee, heure_mouvement, numero_cave, montant_cave, montant_total_joueur,
            montant_jetons_remis, statut_paiement, moyen_paiement, cash_operation_id, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [tableJeuId, session_id, client_id || null, client_id ? null : (client_libre || null),
         numero_adherent || null, heureArrivee, numeroCave, amount, montantTotalJoueur,
         amount, statutPaiement, statutPaiement === 'PAYE' ? (moyen_paiement || 'ESPECES') : null,
         cashOperationId, caissierId(req)]
      );

      // Arrivée automatique (présence par table) sur la toute première cave
      // du joueur ce jour-là — nécessaire pour totaliser un temps de jeu réel
      // (voir casino_table_visits). Les caves/recaves suivantes du même
      // joueur le même jour ne rouvrent pas une nouvelle présence.
      if (numeroCave === 1) {
        const [[occupied]] = await conn.query(
          `SELECT id FROM casino_table_visits WHERE table_jeu_id = ? AND numero_place = ? AND sortie_at IS NULL LIMIT 1 FOR UPDATE`,
          [tableJeuId, place]
        );
        if (occupied) throw ApiError.conflict(`La place ${place} est déjà occupée`);
        await conn.query(
          `INSERT INTO casino_table_visits (table_jeu_id, client_id, client_libre, numero_place, entree_at, created_by)
           VALUES (?, ?, ?, ?, NOW(), ?)`,
          [tableJeuId, client_id || null, client_id ? null : (client_libre || null), place, caissierId(req)]
        );
      }

      const [[row]] = await conn.query(`SELECT * FROM casino_table_caves WHERE id = ?`, [result.insertId]);
      return row;
    });
 
    res.status(201).json(cave);
  } catch (err) { next(err); }
};
 
exports.listCavesHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const { date } = req.query;
    const [rows] = await pool.query(
      `SELECT * FROM casino_table_caves WHERE table_jeu_id = ? AND date_jeu = ? ORDER BY heure_mouvement ASC`,
      [tableJeuId, date || new Date().toISOString().slice(0, 10)]
    );
    res.json(rows);
  } catch (err) { next(err); }
};
 
// -------------------------------------------------------------------------
// Signature d'une cave/recave (table transversale `signatures`, comme pour
// le KYC — signable_type = 'casino_table_cave', signable_id = cave.id)
// -------------------------------------------------------------------------
 
exports.signCaveHandler = async (req, res, next) => {
  try {
    const { caveId } = req.params;
    const { signature_data } = req.body;
    if (!signature_data) throw ApiError.badRequest('signature_data requis');
 
    const [[cave]] = await pool.query(`SELECT * FROM casino_table_caves WHERE id = ?`, [caveId]);
    if (!cave) throw ApiError.notFound('Cave introuvable');
 
    const [result] = await pool.query(
      `INSERT INTO signatures (signable_type, signable_id, client_id, signature_data, signed_at, created_at)
       VALUES ('casino_table_cave', ?, ?, ?, NOW(), NOW())`,
      [caveId, cave.client_id || null, signature_data]
    );
    const [[row]] = await pool.query(`SELECT * FROM signatures WHERE id = ?`, [result.insertId]);
    res.status(201).json(row);
  } catch (err) { next(err); }
};
 
exports.getCaveSignatureHandler = async (req, res, next) => {
  try {
    const { caveId } = req.params;
    const [[row]] = await pool.query(
      `SELECT * FROM signatures WHERE signable_type = 'casino_table_cave' AND signable_id = ?
        ORDER BY signed_at DESC LIMIT 1`,
      [caveId]
    );
    res.json(row || null);
  } catch (err) { next(err); }
};

// -------------------------------------------------------------------------
// Prolongations (salaire horaire du croupier, à charge du joueur)
// -------------------------------------------------------------------------
 
// Deux temps distincts :
//  - Tant qu'aucune prolongation n'a encore été faite (`derniere_prolongation_at`
//    NULL) : phase JEU_SIMPLE, référence = derniere_ouverture_at (repartie à
//    chaque ouverture) — ou created_at si la table n'a jamais été ouverte
//    explicitement via /ouvrir —, durée = duree_jeu_simple_minutes.
//  - Dès qu'au moins une prolongation existe : phase PROLONGATION,
//    référence = derniere_prolongation_at, durée = duree_prolongation_minutes.
function calculerEtatProlongation(table) {
  const enPhaseSimple = !table.derniere_prolongation_at;
  const reference = enPhaseSimple
    ? (table.derniere_ouverture_at || table.created_at)
    : table.derniere_prolongation_at;
  const dureeMinutes = enPhaseSimple ? table.duree_jeu_simple_minutes : table.duree_prolongation_minutes;
  const expiry = new Date(reference).getTime() + Number(dureeMinutes) * 60000;
  return {
    disponible: Date.now() >= expiry,
    phase: enPhaseSimple ? 'JEU_SIMPLE' : 'PROLONGATION',
    expiry,
  };
}
 
exports.addProlongationHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const { session_id, client_id, client_libre, statut_paiement, moyen_paiement } = req.body;
    const statutPaiement = statut_paiement === 'NON_PAYE' ? 'NON_PAYE' : 'PAYE';
    if (!client_id && !client_libre) throw ApiError.badRequest('client_id ou client_libre requis');
 
    const prolongation = await withTransaction(async (conn) => {
      const [[table]] = await conn.query(`SELECT * FROM casino_tables_jeu WHERE id = ? FOR UPDATE`, [tableJeuId]);
      if (!table) throw ApiError.notFound('Table de jeu introuvable');
      if (table.statut !== 'OUVERTE') throw ApiError.badRequest('Cette table de jeu est fermée');
      const { disponible } = calculerEtatProlongation(table);
      if (!disponible) {
        throw ApiError.badRequest("Prolongation pas encore disponible : le temps de jeu en cours n'est pas terminé");
      }
 
      const session = await getOpenSession(conn, session_id);
      if (!session) throw ApiError.badRequest('Session de caisse introuvable ou fermée');
 
      const montant = Number(table.salaire_horaire_croupier);
 
      let cashOperationId = null;
      if (statutPaiement === 'PAYE') {
        const ref = genRef();
        const [opResult] = await conn.query(
          `INSERT INTO casino_cash_operations
             (cashier_session_id, client_id, client_libre, type_operation, montant, moyen_paiement,
              ref_flux_global, created_by, created_at)
           VALUES (?, ?, ?, 'PROLONGATION', ?, ?, ?, ?, NOW())`,
          [session_id, client_id || null, client_id ? null : (client_libre || null),
           montant, moyen_paiement || 'ESPECES', ref, caissierId(req)]
        );
        cashOperationId = opResult.insertId;
 
        await recordFinancialTransaction(conn, {
          client_id: client_id || null,
          type_flux: 'ENTREE_CAISSE_CASINO',
          montant,
          reference_id: cashOperationId,
          ref_flux_global: ref,
          description: `Prolongation table ${table.numero} (salaire croupier)`,
        });
      }
 
      const [result] = await conn.query(
        `INSERT INTO casino_table_prolongations
           (table_jeu_id, cashier_session_id, client_id, client_libre, montant, statut_paiement,
            moyen_paiement, cash_operation_id, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [tableJeuId, session_id, client_id || null, client_id ? null : (client_libre || null),
         montant, statutPaiement, statutPaiement === 'PAYE' ? (moyen_paiement || 'ESPECES') : null,
         cashOperationId, caissierId(req)]
      );
 
      await conn.query(`UPDATE casino_tables_jeu SET derniere_prolongation_at = NOW() WHERE id = ?`, [tableJeuId]);
 
      const [[row]] = await conn.query(`SELECT * FROM casino_table_prolongations WHERE id = ?`, [result.insertId]);
      return row;
    });
 
    res.status(201).json(prolongation);
  } catch (err) { next(err); }
};
 
exports.listProlongationsHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const { date } = req.query;
    const [rows] = await pool.query(
      `SELECT * FROM casino_table_prolongations WHERE table_jeu_id = ? AND DATE(created_at) = ? ORDER BY created_at ASC`,
      [tableJeuId, date || new Date().toISOString().slice(0, 10)]
    );
    res.json(rows);
  } catch (err) { next(err); }
};
 
// Signature d'une prolongation — même mécanisme que pour les caves.
exports.signProlongationHandler = async (req, res, next) => {
  try {
    const { prolongationId } = req.params;
    const { signature_data } = req.body;
    if (!signature_data) throw ApiError.badRequest('signature_data requis');
 
    const [[prolongation]] = await pool.query(`SELECT * FROM casino_table_prolongations WHERE id = ?`, [prolongationId]);
    if (!prolongation) throw ApiError.notFound('Prolongation introuvable');
 
    const [result] = await pool.query(
      `INSERT INTO signatures (signable_type, signable_id, client_id, signature_data, signed_at, created_at)
       VALUES ('casino_table_prolongation', ?, ?, ?, NOW(), NOW())`,
      [prolongationId, prolongation.client_id || null, signature_data]
    );
    const [[row]] = await pool.query(`SELECT * FROM signatures WHERE id = ?`, [result.insertId]);
    res.status(201).json(row);
  } catch (err) { next(err); }
};
 
// -------------------------------------------------------------------------
// Pourboires (déclaratif — jetons ou espèces, ne génère pas d'écriture de
// caisse : l'argent a déjà transité via les caves)
// -------------------------------------------------------------------------
 
exports.addPourboireHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const { session_id, montant, type_pourboire } = req.body;
    const amount = asMoney(montant);
    if (!['JETONS', 'ESPECES'].includes(type_pourboire)) {
      throw ApiError.badRequest('type_pourboire doit être JETONS ou ESPECES');
    }
 
    const [[table]] = await pool.query(`SELECT id FROM casino_tables_jeu WHERE id = ?`, [tableJeuId]);
    if (!table) throw ApiError.notFound('Table de jeu introuvable');
 
    const [result] = await pool.query(
      `INSERT INTO casino_table_pourboires
         (table_jeu_id, cashier_session_id, montant, type_pourboire, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [tableJeuId, session_id, amount, type_pourboire, caissierId(req)]
    );
    const [[row]] = await pool.query(`SELECT * FROM casino_table_pourboires WHERE id = ?`, [result.insertId]);
    res.status(201).json(row);
  } catch (err) { next(err); }
};
 
exports.listPourboiresHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const { date } = req.query;
    const [rows] = await pool.query(
      `SELECT * FROM casino_table_pourboires WHERE table_jeu_id = ? AND DATE(created_at) = ? ORDER BY created_at ASC`,
      [tableJeuId, date || new Date().toISOString().slice(0, 10)]
    );
    res.json(rows);
  } catch (err) { next(err); }
};
 
// -------------------------------------------------------------------------
// `feuilleTableHandler` (déjà livré) — remplace la version précédente pour
// inclure prolongations + pourboires. Colle cette version à la place de
// l'ancienne, même signature de route (`GET /tables-jeu/:id/feuille`).
// -------------------------------------------------------------------------
 
exports.feuilleTableHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const { date } = req.query;
    const jour = date || new Date().toISOString().slice(0, 10);
 
    const [[table]] = await pool.query(
      `SELECT tj.*, r.nom AS salle FROM casino_tables_jeu tj
         JOIN casino_rooms r ON r.id = tj.room_id
        WHERE tj.id = ?`,
      [tableJeuId]
    );
    if (!table) throw ApiError.notFound('Table de jeu introuvable');
 
    const [caveRows] = await pool.query(
      `SELECT tc.*, c.nom, c.prenom,
              (SELECT COUNT(*) FROM signatures s
                WHERE s.signable_type = 'casino_table_cave' AND s.signable_id = tc.id) AS nb_signatures,
              (SELECT s.signature_data FROM signatures s
                WHERE s.signable_type = 'casino_table_cave' AND s.signable_id = tc.id
                ORDER BY s.signed_at DESC LIMIT 1) AS signature_data
         FROM casino_table_caves tc
         LEFT JOIN clients c ON c.id = tc.client_id
        WHERE tc.table_jeu_id = ? AND tc.date_jeu = ?
        ORDER BY tc.heure_mouvement ASC`,
      [tableJeuId, jour]
    );
 
    const [prolongationRows] = await pool.query(
      `SELECT tp.*, c.nom, c.prenom,
              (SELECT COUNT(*) FROM signatures s
                WHERE s.signable_type = 'casino_table_prolongation' AND s.signable_id = tp.id) AS nb_signatures,
              (SELECT s.signature_data FROM signatures s
                WHERE s.signable_type = 'casino_table_prolongation' AND s.signable_id = tp.id
                ORDER BY s.signed_at DESC LIMIT 1) AS signature_data
         FROM casino_table_prolongations tp
         LEFT JOIN clients c ON c.id = tp.client_id
        WHERE tp.table_jeu_id = ? AND DATE(tp.created_at) = ?
        ORDER BY tp.created_at ASC`,
      [tableJeuId, jour]
    );
 
    const [pourboireRows] = await pool.query(
      `SELECT * FROM casino_table_pourboires WHERE table_jeu_id = ? AND DATE(created_at) = ? ORDER BY created_at ASC`,
      [tableJeuId, jour]
    );
 
    const lignes = caveRows.map((r) => ({
      cave_id: r.id,
      joueur: r.client_id ? `${r.nom || ''} ${r.prenom || ''}`.trim() : (r.client_libre || 'Joueur de passage'),
      numero_adherent: r.numero_adherent,
      heure_arrivee: r.heure_arrivee,
      heure: r.heure_mouvement,
      numero_cave: r.numero_cave,
      montant_cave: Number(r.montant_cave),
      montant_total_joueur: Number(r.montant_total_joueur),
      statut_paiement: r.statut_paiement,
      moyen_paiement: r.moyen_paiement,
      signature_presente: Number(r.nb_signatures) > 0,
      signature_data: r.signature_data || null,
    }));
 
    const prolongations = prolongationRows.map((r) => ({
      prolongation_id: r.id,
      joueur: r.client_id ? `${r.nom || ''} ${r.prenom || ''}`.trim() : (r.client_libre || 'Joueur de passage'),
      heure: r.created_at,
      montant: Number(r.montant),
      statut_paiement: r.statut_paiement,
      moyen_paiement: r.moyen_paiement,
      signature_presente: Number(r.nb_signatures) > 0,
      signature_data: r.signature_data || null,
    }));
 
    const totaux = caveRows.reduce(
      (acc, r) => {
        acc.total_cashing_jetons += Number(r.montant_jetons_remis);
        if (r.statut_paiement === 'PAYE') {
          acc.total_caves_encaissees += Number(r.montant_cave);
          if (r.moyen_paiement === 'ESPECES') acc.montant_paye_especes += Number(r.montant_cave);
          if (r.moyen_paiement === 'CARTE') acc.montant_paye_tpe += Number(r.montant_cave);
        } else {
          acc.montant_non_paye += Number(r.montant_cave);
        }
        return acc;
      },
      { total_cashing_jetons: 0, total_caves_encaissees: 0, montant_paye_especes: 0, montant_paye_tpe: 0, montant_non_paye: 0 }
    );
 
    totaux.total_prolongation = prolongationRows.reduce((sum, r) => sum + Number(r.montant), 0);
    totaux.total_prolongation_payee = prolongationRows
      .filter((r) => r.statut_paiement === 'PAYE')
      .reduce((sum, r) => sum + Number(r.montant), 0);
    totaux.total_prolongation_non_payee = totaux.total_prolongation - totaux.total_prolongation_payee;
 
    const pourboires = {
      total_jetons: pourboireRows.filter((r) => r.type_pourboire === 'JETONS').reduce((s, r) => s + Number(r.montant), 0),
      total_especes: pourboireRows.filter((r) => r.type_pourboire === 'ESPECES').reduce((s, r) => s + Number(r.montant), 0),
    };
    pourboires.total = pourboires.total_jetons + pourboires.total_especes;
 
    res.json({
      table: {
        id: table.id, numero: table.numero, type_jeu: table.type_jeu,
        cave_minimum: Number(table.cave_minimum), salaire_horaire_croupier: Number(table.salaire_horaire_croupier),
        duree_jeu_simple_minutes: Number(table.duree_jeu_simple_minutes),
        duree_prolongation_minutes: Number(table.duree_prolongation_minutes),
        salle: table.salle,
      },
      date: jour,
      lignes,
      prolongations,
      pourboires,
      totaux,
    });
  } catch (err) { next(err); }
};


// GET /tables-jeu?room_id= — remplace la liste générique de tablesJeuCrud
// pour exposer `a_historique` (utilisé par le front pour griser la
// suppression et proposer "Archiver" à la place).
exports.listTablesHandler = async (req, res, next) => {
  try {
    const { room_id } = req.query;
    const params = [];
    let sql = `
      SELECT tj.*,
        EXISTS(SELECT 1 FROM casino_table_caves tc WHERE tc.table_jeu_id = tj.id) OR
        EXISTS(SELECT 1 FROM casino_table_prolongations tp WHERE tp.table_jeu_id = tj.id) OR
        EXISTS(SELECT 1 FROM casino_table_pourboires tb WHERE tb.table_jeu_id = tj.id) AS a_historique
      FROM casino_tables_jeu tj`;
    if (room_id) {
      sql += ' WHERE tj.room_id = ?';
      params.push(room_id);
    }
    sql += ' ORDER BY tj.numero ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map((r) => ({ ...r, a_historique: !!r.a_historique })));
  } catch (err) { next(err); }
};
 
// DELETE /tables-jeu/:id — remplace le delete générique : vérifie l'absence
// d'historique AVANT de tenter le DELETE, pour renvoyer un message clair
// plutôt que l'erreur SQL 1451 brute remontée par le générique.
exports.removeTableHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[table]] = await pool.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [id]);
    if (!table) throw ApiError.notFound('Table de jeu introuvable');
 
    const [[{ n }]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM casino_table_caves WHERE table_jeu_id = ?) +
         (SELECT COUNT(*) FROM casino_table_prolongations WHERE table_jeu_id = ?) +
         (SELECT COUNT(*) FROM casino_table_pourboires WHERE table_jeu_id = ?) AS n`,
      [id, id, id]
    );
    if (Number(n) > 0) {
      throw ApiError.conflict(
        'Impossible de supprimer une table ayant un historique (caves, prolongations ou pourboires). Archivez-la à la place.'
      );
    }
 
    await pool.query(`DELETE FROM casino_tables_jeu WHERE id = ?`, [id]);
    res.status(204).end();
  } catch (err) { next(err); }
};
 
// POST /tables-jeu/:id/archiver — n'efface rien, sort juste la table de la
// rotation active. L'historique (caves, prolongations, pourboires, feuille)
// reste consultable normalement.
exports.archiverTableHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`UPDATE casino_tables_jeu SET statut = 'ARCHIVEE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) throw ApiError.notFound('Table de jeu introuvable');
    const [[row]] = await pool.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [id]);
    res.json(row);
  } catch (err) { next(err); }
};
 
// POST /tables-jeu/:id/desarchiver — remet la table en FERMEE (à rouvrir
// ensuite normalement via /ouvrir si besoin).
exports.desarchiverTableHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[table]] = await pool.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [id]);
    if (!table) throw ApiError.notFound('Table de jeu introuvable');
    if (table.statut !== 'ARCHIVEE') throw ApiError.badRequest('Cette table n\'est pas archivée');
    await pool.query(`UPDATE casino_tables_jeu SET statut = 'FERMEE' WHERE id = ?`, [id]);
    const [[row]] = await pool.query(`SELECT * FROM casino_tables_jeu WHERE id = ?`, [id]);
    res.json(row);
  } catch (err) { next(err); }
};
// -------------------------------------------------------------------------
// Présence par table (casino_table_visits) & totalisation du temps de jeu
// -------------------------------------------------------------------------

// GET /tables-jeu/:id/joueurs-actifs — joueurs actuellement présents à
// cette table (sortie_at IS NULL), avec la durée écoulée depuis l'arrivée.
exports.joueursActifsHandler = async (req, res, next) => {
  try {
    const { id: tableJeuId } = req.params;
    const [rows] = await pool.query(
      `SELECT tv.*, tj.type_partie, tj.nombre_places, c.nom, c.prenom,
              TIMESTAMPDIFF(MINUTE, tv.entree_at, NOW()) AS minutes_ecoulees
         FROM casino_table_visits tv
         JOIN casino_tables_jeu tj ON tj.id = tv.table_jeu_id
         LEFT JOIN clients c ON c.id = tv.client_id
        WHERE tv.table_jeu_id = ? AND tv.sortie_at IS NULL
        ORDER BY tv.entree_at ASC`,
      [tableJeuId]
    );
    res.json(rows.map((r) => ({
      id: r.id,
      joueur: r.client_id ? `${r.nom || ''} ${r.prenom || ''}`.trim() : (r.client_libre || 'Joueur de passage'),
      client_id: r.client_id,
      numero_place: Number(r.numero_place),
      type_partie: r.type_partie,
      entree_at: r.entree_at,
      minutes_ecoulees: Number(r.minutes_ecoulees),
    })));
  } catch (err) { next(err); }
};

// POST /table-visits/:visitId/terminer — départ manuel d'un joueur précis
// (plus précis que d'attendre la fermeture de la table).
exports.terminerVisiteHandler = async (req, res, next) => {
  try {
    const { visitId } = req.params;
    const [result] = await pool.query(
      `UPDATE casino_table_visits SET sortie_at = NOW() WHERE id = ? AND sortie_at IS NULL`,
      [visitId]
    );
    if (result.affectedRows === 0) throw ApiError.notFound('Présence introuvable ou déjà terminée');
    const [[row]] = await pool.query(`SELECT * FROM casino_table_visits WHERE id = ?`, [visitId]);
    res.json(row);
  } catch (err) { next(err); }
};

// GET /reports/temps-jeu-joueur/:clientId?date= — temps de jeu total d'un
// joueur identifié (carte/fiche). `date` optionnel (YYYY-MM-DD) pour ne
// compter qu'un jour donné ; sans `date`, cumul toutes dates confondues.
// Une présence encore ouverte compte jusqu'à NOW().
exports.tempsJeuJoueurHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { date } = req.query;
    const params = [clientId];
    let sql = `
      SELECT tv.id, tv.table_jeu_id, tj.numero AS table_numero, tj.type_jeu, tv.entree_at, tv.sortie_at,
             TIMESTAMPDIFF(MINUTE, tv.entree_at, COALESCE(tv.sortie_at, NOW())) AS minutes
        FROM casino_table_visits tv
        JOIN casino_tables_jeu tj ON tj.id = tv.table_jeu_id
       WHERE tv.client_id = ?`;
    if (date) {
      sql += ' AND DATE(tv.entree_at) = ?';
      params.push(date);
    }
    sql += ' ORDER BY tv.entree_at ASC';
    const [rows] = await pool.query(sql, params);

    const sessions = rows.map((r) => ({
      table_jeu_id: r.table_jeu_id,
      table_numero: r.table_numero,
      type_jeu: r.type_jeu,
      entree_at: r.entree_at,
      sortie_at: r.sortie_at,
      minutes: Number(r.minutes),
      en_cours: !r.sortie_at,
    }));
    const total_minutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

    // Cumul par type de jeu — déterminé à partir des tables où le joueur a
    // effectivement une présence enregistrée (casino_table_visits), pas
    // d'inférence : c'est du réel, pas une supposition.
    const parType = {};
    for (const s of sessions) {
      if (!parType[s.type_jeu]) parType[s.type_jeu] = { type_jeu: s.type_jeu, minutes: 0, nb_sessions: 0 };
      parType[s.type_jeu].minutes += s.minutes;
      parType[s.type_jeu].nb_sessions += 1;
    }
    const par_type_jeu = Object.values(parType).sort((a, b) => b.minutes - a.minutes);
    const type_jeu_prefere = par_type_jeu.length ? par_type_jeu[0].type_jeu : null;

    res.json({
      client_id: Number(clientId),
      date: date || null,
      total_minutes,
      type_jeu_prefere,
      par_type_jeu,
      sessions,
    });
  } catch (err) { next(err); }
};

// GET /reports/temps-jeu-jour?date= — temps de jeu total du jour, tous
// joueurs et toutes tables confondus (defaut = aujourd'hui), avec le
// détail par table.
exports.tempsJeuJourHandler = async (req, res, next) => {
  try {
    const jour = req.query.date || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT tv.table_jeu_id, tj.numero AS table_numero,
              TIMESTAMPDIFF(MINUTE, tv.entree_at, COALESCE(tv.sortie_at, NOW())) AS minutes
         FROM casino_table_visits tv
         JOIN casino_tables_jeu tj ON tj.id = tv.table_jeu_id
        WHERE DATE(tv.entree_at) = ?`,
      [jour]
    );

    const parTable = {};
    let total_minutes = 0;
    for (const r of rows) {
      const minutes = Number(r.minutes);
      total_minutes += minutes;
      if (!parTable[r.table_jeu_id]) parTable[r.table_jeu_id] = { table_jeu_id: r.table_jeu_id, table_numero: r.table_numero, minutes: 0, nb_sessions: 0 };
      parTable[r.table_jeu_id].minutes += minutes;
      parTable[r.table_jeu_id].nb_sessions += 1;
    }

    res.json({ date: jour, total_minutes, par_table: Object.values(parTable) });
  } catch (err) { next(err); }
};

// Le déplacement est autorisé uniquement pour une partie simple. Le verrou
// de la présence et le contrôle d'occupation rendent l'opération atomique.
exports.changerPlaceHandler = async (req, res, next) => {
  try {
    const { visitId } = req.params;
    const place = Number(req.body.numero_place);
    if (!Number.isInteger(place) || place < 1) throw ApiError.badRequest('Numéro de place invalide');

    await withTransaction(async (conn) => {
      const [[visit]] = await conn.query(
        `SELECT tv.id, tv.table_jeu_id, tv.numero_place, tj.type_partie, tj.nombre_places
           FROM casino_table_visits tv
           JOIN casino_tables_jeu tj ON tj.id = tv.table_jeu_id
          WHERE tv.id = ? AND tv.sortie_at IS NULL FOR UPDATE`,
        [visitId]
      );
      if (!visit) throw ApiError.notFound('Présence introuvable ou déjà terminée');
      if (visit.type_partie === 'TOURNOI') {
        throw ApiError.conflict('Changement de place interdit pendant un tournoi');
      }
      if (place > Number(visit.nombre_places)) {
        throw ApiError.badRequest(`Le numéro de place doit être compris entre 1 et ${visit.nombre_places}`);
      }
      if (place === Number(visit.numero_place)) return;

      const [[occupied]] = await conn.query(
        `SELECT id FROM casino_table_visits
          WHERE table_jeu_id = ? AND numero_place = ? AND sortie_at IS NULL AND id <> ?
          LIMIT 1 FOR UPDATE`,
        [visit.table_jeu_id, place, visitId]
      );
      if (occupied) throw ApiError.conflict(`La place ${place} est déjà occupée`);
      await conn.query(`UPDATE casino_table_visits SET numero_place = ? WHERE id = ?`, [place, visitId]);
    });

    const [[updated]] = await pool.query(`SELECT * FROM casino_table_visits WHERE id = ?`, [visitId]);
    res.json(updated);
  } catch (err) { next(err); }
};

// GET /player-sheets?date=YYYY-MM-DD&table_name=...
exports.getPlayerSheetHandler = async (req, res, next) => {
  try {
    const { date, table_name: tableName } = req.query;
    if (!date || !tableName) throw ApiError.badRequest('La date et la table sont obligatoires');

    const [[row]] = await pool.query(
      `SELECT id, sheet_date AS date, table_name, sheet_data
         FROM casino_player_sheets
        WHERE sheet_date = ? AND table_name = ? LIMIT 1`,
      [date, tableName]
    );
    if (!row) return res.json(null);
    const sheetData = typeof row.sheet_data === 'string' ? JSON.parse(row.sheet_data) : row.sheet_data;
    res.json({ id: row.id, date: row.date, table_name: row.table_name, ...sheetData });
  } catch (err) { next(err); }
};

// PUT /player-sheets — remplace la fiche complète de la date et de la table.
exports.savePlayerSheetHandler = async (req, res, next) => {
  try {
    const { date, table_name: tableName, players, chips = [], rackChecks = [], restaurantPayments, finals, endGameTime = '', isFinished = false, finishedAt = '' } = req.body;
    if (!date || !tableName || !Array.isArray(players)) {
      throw ApiError.badRequest('La date, la table et les joueurs sont obligatoires');
    }
    if (req.user.role === 'croupier') {
      const [[existingSheet]] = await pool.query(
        `SELECT sheet_data FROM casino_player_sheets WHERE sheet_date = ? AND table_name = ? LIMIT 1`,
        [date, tableName]
      );
      if (existingSheet) {
        const previousData = typeof existingSheet.sheet_data === 'string' ? JSON.parse(existingSheet.sheet_data) : existingSheet.sheet_data;
        const incomingLineIds = new Set(players.map((player) => String(player.id)));
        const removedLine = (previousData.players || []).find((player) => !incomingLineIds.has(String(player.id)));
        if (removedLine) throw ApiError.forbidden('Un croupier ne peut pas supprimer une ligne de joueur');
      }
    }
    const [[existingSheet]] = await pool.query(
      `SELECT sheet_data FROM casino_player_sheets WHERE sheet_date = ? AND table_name = ? LIMIT 1`,
      [date, tableName]
    );
    const previousData = existingSheet
      ? (typeof existingSheet.sheet_data === 'string' ? JSON.parse(existingSheet.sheet_data) : existingSheet.sheet_data)
      : {};
    if (existingSheet && Array.isArray(previousData.players) && previousData.players.length > 0 && players.length === 0) {
      throw ApiError.conflict('Protection des données : une fiche joueur existante ne peut pas être remplacée par une fiche vide');
    }
    const previousChecks = new Map((previousData.rackChecks || []).map((check) => [String(check.id), check]));
    const newlyValidatedCashChecks = rackChecks.filter((check) => check.type === 'Cash check'
      && check.verified
      && !previousChecks.get(String(check.id))?.verified);
    const newlyValidatedRackChecks = rackChecks.filter((check) => String(check.type || '').startsWith('Rack check')
      && check.verified
      && !previousChecks.get(String(check.id))?.verified);
    const cashingBySheet = new Map();
    players.forEach((player) => {
      const sheetId = player.ficheId || player.id;
      if (!cashingBySheet.has(sheetId) || cashingBySheet.get(sheetId) === 0) {
        cashingBySheet.set(sheetId, parseCasinoAmount(player.cashing));
      }
    });
    const totalCashingJetons = Array.from(cashingBySheet.values()).reduce((total, cashing) => total + cashing, 0);
    const totalJetonsDepart = chips.reduce((total, chip) => total + (Number(chip.value) || 0) * (Number(chip.opening) || 0), 0);
    const totalJetonsFermeture = chips.reduce((total, chip) => total + (Number(chip.value) || 0) * (Number(chip.closing) || 0), 0);
    const sheetData = JSON.stringify({
      players,
      chips,
      rackChecks,
      restaurantPayments: restaurantPayments || { especes: false, tpe: false },
      finals: finals || {},
      endGameTime,
      isFinished: Boolean(isFinished),
      finishedAt,
      total_cashing_jetons: totalCashingJetons,
      total_jetons_depart: totalJetonsDepart,
      total_jetons_fermeture: totalJetonsFermeture,
    });
    const userId = req.user.id_admin || null;

    await pool.query(
      `INSERT INTO casino_player_sheets
         (sheet_date, table_name, sheet_data, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sheet_data = VALUES(sheet_data), updated_by = VALUES(updated_by)`,
      [date, tableName, sheetData, userId, userId]
    );
    if (newlyValidatedCashChecks.length) {
      const [[cashier]] = await pool.query(
        `SELECT nom, prenom FROM users WHERE id_admin = ? LIMIT 1`,
        [userId]
      );
      const [directionUsers] = await pool.query(
        `SELECT id_admin FROM users WHERE role IN ('admin', 'manager') AND statut = 'actif'`
      );
      const caissier = cashier ? `${cashier.prenom || ''} ${cashier.nom || ''}`.trim() : 'Caissier';
      for (const check of newlyValidatedCashChecks) {
        const expected = Number(check.expected) || 0;
        const actual = Number(check.actual) || 0;
        const missing = Math.max(0, expected - actual);
        const variance = actual - expected;
        const message = `Cash check horaire validé par ${caissier} — table ${tableName}, le ${check.date || date} à ${check.time || '--:--'}. Attendu : ${expected} Ariary, constaté : ${actual} Ariary, écart : ${variance} Ariary${missing > 0 ? `, manque : ${missing} Ariary` : ''}.`;
        for (const user of directionUsers) {
          await pool.query(
            `INSERT INTO notifications (titre, message, statut, created_at) VALUES (?, ?, 'nouveau', NOW())`,
            [`Cash check horaire — ${tableName}`, `${message} Référence fiche ${date}.`]
          );
        }
      }
    }
    if (newlyValidatedRackChecks.length) {
      const [[cashier]] = await pool.query(
        `SELECT nom, prenom FROM users WHERE id_admin = ? LIMIT 1`,
        [userId]
      );
      const [directionUsers] = await pool.query(
        `SELECT id_admin FROM users WHERE role IN ('admin', 'manager') AND statut = 'actif'`
      );
      const caissier = cashier ? `${cashier.prenom || ''} ${cashier.nom || ''}`.trim() : 'Caissier';
      for (const check of newlyValidatedRackChecks) {
        const expected = Number(check.expected) || 220000;
        const actual = Number(check.actual) || 0;
        const missing = Math.max(0, expected - actual);
        const message = `Rack check validé par ${caissier} — table ${tableName}, le ${check.date || date} à ${check.time || '--:--'}. ${check.type}, attendu : ${expected} Ariary, constaté : ${actual} Ariary, manque : ${missing} Ariary.`;
        for (const user of directionUsers) {
          await pool.query(
            `INSERT INTO notifications (titre, message, statut, created_at) VALUES (?, ?, 'nouveau', NOW())`,
            [`Rack check — ${tableName}`, `${message} Référence fiche ${date}.`]
          );
        }
      }
    }
    const [[row]] = await pool.query(
      `SELECT id, sheet_date AS date, table_name, sheet_data
         FROM casino_player_sheets
        WHERE sheet_date = ? AND table_name = ? LIMIT 1`,
      [date, tableName]
    );
    const casinoPlayerIds = [...new Set(players.map((player) => Number(player.casinoPlayerId)).filter(Number.isInteger))];
    if (casinoPlayerIds.length) {
      await pool.query(
        `UPDATE casino_player_games SET player_sheet_id = ?
          WHERE game_date = ? AND table_name = ? AND casino_player_id IN (?)`,
        [row.id, date, tableName, casinoPlayerIds]
      );
      const gameAmounts = new Map();
      players.forEach((player) => {
        const casinoPlayerId = Number(player.casinoPlayerId);
        if (Number.isInteger(casinoPlayerId) && !gameAmounts.has(casinoPlayerId)) {
          gameAmounts.set(casinoPlayerId, [parseCasinoAmount(player.initialDeposit), parseCasinoAmount(player.initialCredit)]);
        }
      });
      for (const [casinoPlayerId, [depot, credit]] of gameAmounts) {
        await pool.query(
          `UPDATE casino_players SET depot = ?, credit = ? WHERE id = ?`,
          [depot, credit, casinoPlayerId]
        );
        await pool.query(
          `UPDATE casino_player_games SET depot = ?, credit = ?
            WHERE casino_player_id = ? AND game_date = ? AND table_name = ?`,
          [depot, credit, casinoPlayerId, date, tableName]
        );
      }
    }
    const savedData = typeof row.sheet_data === 'string' ? JSON.parse(row.sheet_data) : row.sheet_data;
    res.json({ id: row.id, date: row.date, table_name: row.table_name, ...savedData });
  } catch (err) { next(err); }
};

// GET /player-sheets/final-results?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
// Vérification des « Résultat final » enregistrés : pour chaque fiche (date + table),
// le résultat du dernier « Enregistrer le calcul », repris par le rapport financier.
exports.finalResultsHandler = async (req, res, next) => {
  try {
    const { date_from: dateFrom, date_to: dateTo } = req.query;
    const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
    if (!isDate(dateFrom) || !isDate(dateTo)) throw ApiError.badRequest('date_from et date_to (YYYY-MM-DD) sont obligatoires');

    const { extractCasinoFinalResult } = require('../models/financeReportingModel');
    const [rows] = await pool.query(
      `SELECT id, DATE_FORMAT(sheet_date, '%Y-%m-%d') AS sheet_date, table_name, updated_at, sheet_data
         FROM casino_player_sheets
        WHERE sheet_date BETWEEN ? AND ?`,
      [dateFrom, dateTo]
    );
    // Tri en JS : un ORDER BY sur des lignes contenant le JSON sheet_data épuise
    // le sort buffer de MySQL en ligne (« Out of sort memory »).
    rows.sort((a, b) => a.sheet_date.localeCompare(b.sheet_date)
      || String(a.table_name).localeCompare(String(b.table_name), 'fr', { numeric: true }));

    const results = rows.map((row) => {
      let montant = null;
      try { montant = extractCasinoFinalResult(row.sheet_data); } catch (err) {
        console.error('[final-results] fiche illisible', row.id, err.message);
      }
      return {
        sheet_id: row.id,
        date: row.sheet_date,
        table_name: row.table_name,
        updated_at: row.updated_at,
        montant_rapport: montant,
      };
    });

    res.json(results);
  } catch (err) {
    console.error('[final-results] échec', { message: err.message, code: err.code, sqlMessage: err.sqlMessage, stack: err.stack });
    next(err);
  }
};

// POST /player-sheets/finish — clôture une partie sans supprimer sa fiche.
exports.finishPlayerSheetHandler = async (req, res, next) => {
  try {
    const { date, table_name: tableName } = req.body;
    if (!date || !tableName) throw ApiError.badRequest('La date et la table sont obligatoires');

    const result = await withTransaction(async (conn) => {
      const [[sheet]] = await conn.query(
        `SELECT id, sheet_data FROM casino_player_sheets WHERE sheet_date = ? AND table_name = ? FOR UPDATE`,
        [date, tableName]
      );
      if (!sheet) throw ApiError.notFound('Fiche joueur introuvable');

      const finishedAt = new Date().toISOString();
      const sheetData = typeof sheet.sheet_data === 'string' ? JSON.parse(sheet.sheet_data) : sheet.sheet_data;
      sheetData.isFinished = true;
      sheetData.finishedAt = finishedAt;
      await conn.query(
        `UPDATE casino_player_sheets SET sheet_data = ?, updated_by = ? WHERE id = ?`,
        [JSON.stringify(sheetData), req.user.id_admin || null, sheet.id]
      );

      const [games] = await conn.query(
        `SELECT DISTINCT casino_player_id FROM casino_player_games WHERE game_date = ? AND table_name = ? AND statut = 'EN_JEU' FOR UPDATE`,
        [date, tableName]
      );
      const playerIds = games.map((game) => Number(game.casino_player_id));
      await conn.query(
        `UPDATE casino_player_games SET statut = 'TERMINE' WHERE game_date = ? AND table_name = ? AND statut = 'EN_JEU'`,
        [date, tableName]
      );
      if (playerIds.length) {
        await conn.query(
          `UPDATE casino_players p
             LEFT JOIN casino_player_games active ON active.casino_player_id = p.id AND active.statut = 'EN_JEU'
             SET p.statut_jeu = 'ARRETE'
           WHERE p.id IN (${playerIds.map(() => '?').join(',')}) AND active.id IS NULL`,
          playerIds
        );
      }
      return { finishedAt, playerIds };
    });
    res.json(result);
  } catch (err) { next(err); }
};

// =====================================================================
// Vérifications d'identité (conformité AML/CTF : seuil 3 000 000 Ar)
// =====================================================================

exports.identityVerificationsCrud = {
  async list(req, res, next) {
    try {
      const { player_sheet_id, fiche_id, date_from, date_to, limit = 100, offset = 0 } = req.query;
      const clauses = [];
      const params = [];
      if (player_sheet_id) { clauses.push('player_sheet_id = ?'); params.push(Number(player_sheet_id)); }
      if (fiche_id) { clauses.push('fiche_id = ?'); params.push(Number(fiche_id)); }
      if (date_from) { clauses.push('DATE(created_at) >= ?'); params.push(date_from); }
      if (date_to) { clauses.push('DATE(created_at) <= ?'); params.push(date_to); }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const [rows] = await pool.query(
        `SELECT * FROM casino_identity_verifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
      );
      res.json(rows);
    } catch (err) { next(err); }
  },

  async getOne(req, res, next) {
    try {
      const [[row]] = await pool.query(`SELECT * FROM casino_identity_verifications WHERE id = ?`, [req.params.id]);
      if (!row) throw ApiError.notFound('Vérification d\'identité introuvable');
      res.json(row);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { player_sheet_id, fiche_id, full_name, id_type, id_number, issue_date, transaction_type, amount } = req.body;
      // Support camelCase from frontend
      const fullName = full_name || req.body.fullName;
      const idType = id_type || req.body.idType;
      const idNumber = id_number || req.body.idNumber;
      const issueDate = issue_date || req.body.issueDate;
      const transactionType = transaction_type || req.body.transactionType;
      const ficheId = fiche_id || req.body.fiche_id;
      if (!fullName || !idType || !idNumber || !issueDate || !transactionType || !amount) {
        throw ApiError.badRequest('fullName, idType, idNumber, issueDate, transactionType et amount sont requis');
      }
      if (!Number.isFinite(Number(ficheId))) {
        throw ApiError.badRequest('fiche_id est requis et doit être numérique');
      }
      console.log('[CASINO IDENTITY CREATE] Données reçues:', {
        player_sheet_id, fiche_id: ficheId, full_name: fullName, id_type: idType,
        id_number: idNumber, issue_date: issueDate, transaction_type: transactionType,
        amount, req_user: req.user, id_admin: req.user?.id_admin
      });
      const [result] = await pool.query(
        `INSERT INTO casino_identity_verifications
           (player_sheet_id, fiche_id, full_name, id_type, id_number, issue_date, transaction_type, amount, verified_at, verified_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [player_sheet_id || null, Number(ficheId), fullName, idType, idNumber, issueDate, transactionType, Number(amount), req.user?.id_admin || null]
      );
      console.log('[CASINO IDENTITY CREATE] Insert réussi, insertId:', result.insertId);
      const [[row]] = await pool.query(`SELECT * FROM casino_identity_verifications WHERE id = ?`, [result.insertId]);
      console.log('[CASINO IDENTITY CREATE] Ligne sélectionnée:', row);
      res.status(201).json(row);
    } catch (err) {
      console.error('[CASINO IDENTITY CREATE] Échec:', {
        message: err.message,
        code: err.code,
        sqlMessage: err.sqlMessage,
        status: err.status,
      });
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { full_name, id_type, id_number, issue_date, transaction_type, amount } = req.body;
      const [[existing]] = await pool.query(`SELECT id FROM casino_identity_verifications WHERE id = ?`, [id]);
      if (!existing) throw ApiError.notFound('Vérification d\'identité introuvable');
      const [result] = await pool.query(
        `UPDATE casino_identity_verifications
            SET full_name = ?, id_type = ?, id_number = ?, issue_date = ?, transaction_type = ?, amount = ?
          WHERE id = ?`,
        [full_name, id_type, id_number, issue_date, transaction_type, Number(amount), id]
      );
      if (result.affectedRows === 0) throw ApiError.notFound('Vérification d\'identité introuvable');
      const [[row]] = await pool.query(`SELECT * FROM casino_identity_verifications WHERE id = ?`, [id]);
      res.json(row);
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      const [result] = await pool.query(`DELETE FROM casino_identity_verifications WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) throw ApiError.notFound('Vérification d\'identité introuvable');
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
