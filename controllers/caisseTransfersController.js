// controllers/caisseTransfersController.js
//
// Transferts de fonds physiques entre caisses de départements différents
// (ex : la cage casino avance de la monnaie au tiroir restaurant, ou
// l'inverse en fin de service). Ce n'est PAS un crédit client — aucun
// `client_id` n'intervient ici, c'est un mouvement interne entre deux
// caisses de l'établissement.
//
// Logique en 2 temps, comme une remise d'espèces physique :
//  1. createCaisseTransferHandler : la caisse source déclare l'envoi
//     (statut EN_ATTENTE) — l'argent est annoncé mais pas encore compté
//     par la caisse destination.
//  2. confirmCaisseTransferHandler : la caisse destination confirme avoir
//     physiquement reçu et recompté la somme — c'est CE moment qui génère
//     les écritures dans financial_transactions et, côté casino, le
//     mouvement dans casino_cash_operations (TRANSFERT_SORTANT /
//     TRANSFERT_ENTRANT) pour que le calcul du solde théorique de session
//     reste juste.
//
// Ce découplage évite qu'un transfert "annoncé" mais jamais remis
// physiquement ne fausse le solde théorique d'une caisse.

const { pool, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { randomUUID } = require('crypto');

function genRef() {
  return randomUUID();
}

function caissierId(req) {
  return req.user.id_admin;
}

function asMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) throw ApiError.badRequest('Montant invalide');
  return v;
}

async function recordFinancialTransaction(conn, { client_id = null, module, type_flux, montant, reference_id, description, ref_flux_global }) {
  await conn.query(
    `INSERT IGNORE INTO financial_transactions
       (client_id, module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', NOW())`,
    [client_id, module, type_flux, montant, reference_id, ref_flux_global, description]
  );
}

// =====================================================================
// Registre des sessions de caisse par département.
// À compléter au fur et à mesure que Bar/Boutique/Hébergement se dotent
// de leur propre table de session (aujourd'hui inexistante pour eux).
// =====================================================================

const SESSION_TABLES = {
  CASINO: { table: 'casino_cashier_sessions', openWhere: `statut = 'OUVERTE'` },
  RESTAURANT: { table: 'restaurant_sessions', openWhere: `fermeture_at IS NULL` },
  // BAR: ..., BOUTIQUE: ..., HEBERGEMENT: ...
};

const KNOWN_MODULES = ['CASINO', 'RESTAURANT', 'BAR', 'BOUTIQUE', 'HEBERGEMENT'];

async function assertOpenSession(conn, module, sessionId) {
  const cfg = SESSION_TABLES[module];
  if (!cfg) {
    throw ApiError.badRequest(
      `Module "${module}" non pris en charge pour les transferts inter-caisses (pas encore de session de caisse dédiée en base)`
    );
  }
  // FOR UPDATE : verrouille la ligne de session le temps de la transaction,
  // pour que le contrôle de solde disponible (computeCasinoAvailableBalance)
  // ne soit pas contourné par deux transferts créés en même temps.
  const [[row]] = await conn.query(
    `SELECT * FROM \`${cfg.table}\` WHERE id = ? AND ${cfg.openWhere} FOR UPDATE`,
    [sessionId]
  );
  if (!row) throw ApiError.badRequest(`Session ${module} #${sessionId} introuvable ou fermée`);
  return row;
}

// =====================================================================
// Solde disponible en caisse casino, avant d'autoriser un transfert
// sortant. Réplique le calcul de computeSessionTotals()
// (casinoController.js) : fond_initial + entrées − sorties, en tenant
// compte des opérations de caisse ET des mouvements de jetons. À maintenir
// synchronisé si cette formule évolue côté casinoController.js.
//
// Prend aussi en compte les transferts déjà EN_ATTENTE issus de cette même
// session : sans ça, deux transferts déclarés coup sur coup (avant
// confirmation du premier) pourraient ensemble dépasser le solde réel,
// puisque seule la CONFIRMATION écrit dans casino_cash_operations.
// =====================================================================

async function computeCasinoAvailableBalance(conn, sessionId) {
  const [[session]] = await conn.query(`SELECT * FROM casino_cashier_sessions WHERE id = ?`, [sessionId]);
  if (!session) return null;

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
  const fondTheorique = Number(session.fond_initial) + entrees - sorties;

  const [[pending]] = await conn.query(
    `SELECT COALESCE(SUM(montant), 0) AS total
       FROM caisse_transfers
      WHERE module_source = 'CASINO' AND session_source_id = ? AND statut = 'EN_ATTENTE'`,
    [sessionId]
  );

  return fondTheorique - Number(pending.total || 0);
}

// =====================================================================
// Résolution du code de caisse (affichage) — jointure session → caisse.
// Seul CASINO est résolu pour l'instant (casino_cashier_sessions.cashier_id
// → casino_cashiers.code/nom). Les autres modules n'ont pas encore de
// table de caisse dédiée exploitable de la même façon (cf. SESSION_TABLES).
// =====================================================================

async function resolveCashierInfo(conn, module, sessionId) {
  if (module === 'CASINO') {
    const [[row]] = await conn.query(
      `SELECT cc.code AS cashier_code, cc.nom AS cashier_nom
         FROM casino_cashier_sessions ccs
         JOIN casino_cashiers cc ON cc.id = ccs.cashier_id
        WHERE ccs.id = ?`,
      [sessionId]
    );
    return row || null;
  }
  return null;
}

async function enrichTransfer(conn, t) {
  if (!t) return t;
  const [source, destination] = await Promise.all([
    resolveCashierInfo(conn, t.module_source, t.session_source_id),
    resolveCashierInfo(conn, t.module_destination, t.session_destination_id),
  ]);
  return {
    ...t,
    cashier_source_code: source?.cashier_code ?? null,
    cashier_source_nom: source?.cashier_nom ?? null,
    cashier_destination_code: destination?.cashier_code ?? null,
    cashier_destination_nom: destination?.cashier_nom ?? null,
  };
}

async function enrichTransfers(conn, rows) {
  return Promise.all(rows.map((r) => enrichTransfer(conn, r)));
}

// =====================================================================
// Création (déclaration de l'envoi)
// =====================================================================

exports.createCaisseTransferHandler = async (req, res, next) => {
  try {
    const { module_source, session_source_id, module_destination, session_destination_id, montant, motif } = req.body;
    const amount = asMoney(montant);

    if (!KNOWN_MODULES.includes(module_source) || !KNOWN_MODULES.includes(module_destination)) {
      throw ApiError.badRequest(`module_source/module_destination invalide (attendu : ${KNOWN_MODULES.join(', ')})`);
    }
    if (module_source === module_destination && Number(session_source_id) === Number(session_destination_id)) {
      throw ApiError.badRequest('La caisse source et la caisse destination doivent être différentes');
    }

    const transfer = await withTransaction(async (conn) => {
      await assertOpenSession(conn, module_source, session_source_id);
      await assertOpenSession(conn, module_destination, session_destination_id);

      if (module_source === 'CASINO') {
        const disponible = await computeCasinoAvailableBalance(conn, session_source_id);
        if (amount > disponible) {
          throw ApiError.conflict(
            `Fonds insuffisants en caisse (disponible : ${disponible} Ar, demandé : ${amount} Ar)`
          );
        }
      }

      const [result] = await conn.query(
        `INSERT INTO caisse_transfers
           (module_source, session_source_id, module_destination, session_destination_id, montant, motif,
            statut, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'EN_ATTENTE', ?, NOW())`,
        [module_source, session_source_id, module_destination, session_destination_id, amount, motif || null, caissierId(req)]
      );
      const [[row]] = await conn.query(`SELECT * FROM caisse_transfers WHERE id = ?`, [result.insertId]);
      return enrichTransfer(conn, row);
    });

    res.status(201).json(transfer);
  } catch (err) { next(err); }
};

// =====================================================================
// Confirmation (réception physique par la caisse destination)
// =====================================================================

exports.confirmCaisseTransferHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transfer = await withTransaction(async (conn) => {
      const [[t]] = await conn.query(`SELECT * FROM caisse_transfers WHERE id = ? FOR UPDATE`, [id]);
      if (!t) throw ApiError.notFound('Transfert introuvable');
      if (t.statut !== 'EN_ATTENTE') throw ApiError.conflict(`Transfert déjà ${t.statut}`);

      const refSource = genRef();
      const refDest = genRef();
      const montant = Number(t.montant);

      // Casino source ou destination : on mirrore l'opération dans
      // casino_cash_operations pour que computeSessionTotals() (utilisé
      // par le résumé et la clôture de session) reste exact sans
      // modification supplémentaire.
      if (t.module_source === 'CASINO') {
        await conn.query(
          `INSERT INTO casino_cash_operations
             (cashier_session_id, type_operation, montant, moyen_paiement, transfer_id, ref_flux_global, created_by, created_at)
           VALUES (?, 'TRANSFERT_SORTANT', ?, 'ESPECES', ?, ?, ?, NOW())`,
          [t.session_source_id, montant, t.id, refSource, caissierId(req)]
        );
      }
      if (t.module_destination === 'CASINO') {
        await conn.query(
          `INSERT INTO casino_cash_operations
             (cashier_session_id, type_operation, montant, moyen_paiement, transfer_id, ref_flux_global, created_by, created_at)
           VALUES (?, 'TRANSFERT_ENTRANT', ?, 'ESPECES', ?, ?, ?, NOW())`,
          [t.session_destination_id, montant, t.id, refDest, caissierId(req)]
        );
      }

      await recordFinancialTransaction(conn, {
        module: t.module_source,
        type_flux: 'SORTIE_TRANSFERT_CAISSE',
        montant,
        reference_id: t.id,
        ref_flux_global: refSource,
        description: `Transfert vers ${t.module_destination} (session #${t.session_destination_id})${t.motif ? ' — ' + t.motif : ''}`,
      });
      await recordFinancialTransaction(conn, {
        module: t.module_destination,
        type_flux: 'ENTREE_TRANSFERT_CAISSE',
        montant,
        reference_id: t.id,
        ref_flux_global: refDest,
        description: `Transfert reçu de ${t.module_source} (session #${t.session_source_id})${t.motif ? ' — ' + t.motif : ''}`,
      });

      await conn.query(
        `UPDATE caisse_transfers
           SET statut = 'CONFIRME', confirmed_by = ?, confirmed_at = NOW(),
               ref_flux_global_source = ?, ref_flux_global_destination = ?
         WHERE id = ?`,
        [caissierId(req), refSource, refDest, id]
      );

      const [[row]] = await conn.query(`SELECT * FROM caisse_transfers WHERE id = ?`, [id]);
      return enrichTransfer(conn, row);
    });

    res.json(transfer);
  } catch (err) { next(err); }
};

// =====================================================================
// Refus / annulation (avant confirmation uniquement)
// =====================================================================

exports.rejectCaisseTransferHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { motif_refus } = req.body;

    const [result] = await pool.query(
      `UPDATE caisse_transfers SET statut = 'REFUSE', motif = CONCAT(COALESCE(motif,''), ' | refus: ', ?)
       WHERE id = ? AND statut = 'EN_ATTENTE'`,
      [motif_refus || 'non précisé', id]
    );
    if (result.affectedRows === 0) {
      throw ApiError.conflict('Transfert introuvable ou déjà traité (confirmé/refusé)');
    }
    const [[row]] = await pool.query(`SELECT * FROM caisse_transfers WHERE id = ?`, [id]);
    res.json(await enrichTransfer(pool, row));
  } catch (err) { next(err); }
};

// =====================================================================
// Consultation
// =====================================================================

exports.listCaisseTransfersHandler = async (req, res, next) => {
  try {
    const { module, statut, limit = 100, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    if (module) {
      conditions.push('(module_source = ? OR module_destination = ?)');
      params.push(module, module);
    }
    if (statut) {
      conditions.push('statut = ?');
      params.push(statut);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM caisse_transfers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    res.json(await enrichTransfers(pool, rows));
  } catch (err) { next(err); }
};

exports.getCaisseTransferHandler = async (req, res, next) => {
  try {
    const [[row]] = await pool.query(`SELECT * FROM caisse_transfers WHERE id = ?`, [req.params.id]);
    if (!row) throw ApiError.notFound('Transfert introuvable');
    res.json(await enrichTransfer(pool, row));
  } catch (err) { next(err); }
};

/**
 * En attente de confirmation ET rattachées à une caisse casino donnée —
 * pratique pour afficher une pastille "transfert entrant à confirmer" dans
 * l'UI casino sans devoir tout lister.
 */
exports.pendingForCasinoSessionHandler = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM caisse_transfers
        WHERE statut = 'EN_ATTENTE'
          AND ((module_destination = 'CASINO' AND session_destination_id = ?)
            OR (module_source = 'CASINO' AND session_source_id = ?))
        ORDER BY created_at DESC`,
      [sessionId, sessionId]
    );
    res.json(await enrichTransfers(pool, rows));
  } catch (err) { next(err); }
};