// models/spaModel.js
// Module SPA — Piscine : tarifs, caisse (sessions / clôtures comme le PAF),
// ventes, abonnements et passages.
//
// Chaque vente encaissée est inscrite au grand livre financier (module SPA,
// ref SPA-VENTE-<id>) pour remonter dans Finances et le tableau de bord. Une
// vente « Offert » (client de l'hôtel) n'y est pas inscrite : rien n'est encaissé.

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { pool, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');

const CATEGORIES = ['ENTREE', 'LOCATION', 'ABONNEMENT'];
const PAYMENT_METHODS = ['ESPECES', 'TPE', 'ORANGE_MONEY', 'MVOLA', 'CHAMBRE', 'OFFERT'];
// Moyens réservés aux clients de l'hôtel : la vente doit être rattachée à une réservation.
const HOTEL_PAYMENT_METHODS = ['CHAMBRE', 'OFFERT'];

// Tarifs créés à la première utilisation, à ajuster dans l'onglet « Tarifs ».
const DEFAULT_TARIFS = [
  ['Entrée adulte', 'ENTREE', 15000, null, null],
  ['Entrée enfant', 'ENTREE', 8000, null, null],
  ['Serviette', 'LOCATION', 3000, null, null],
  ['Transat', 'LOCATION', 5000, null, null],
  ['Casier', 'LOCATION', 2000, null, null],
  ['Abonnement mensuel', 'ABONNEMENT', 150000, null, 30],
  ['Carte 10 entrées', 'ABONNEMENT', 120000, 10, null],
];

let schemaReady;

function ensureSpaSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = fs.readFileSync(path.join(__dirname, '../Database/migrations/20261008_spa_piscine.sql'), 'utf8');
      const statements = sql.split(';').map((statement) => statement.trim()).filter((statement) => /^CREATE/i.test(statement.replace(/^(--[^\n]*\n\s*)+/, '')));
      for (const statement of statements) await pool.query(statement);
      const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM spa_tarifs');
      if (Number(count) === 0) {
        await pool.query(
          'INSERT INTO spa_tarifs (nom, categorie, prix, nb_entrees, duree_jours, ordre) VALUES ?',
          [DEFAULT_TARIFS.map((tarif, index) => [...tarif, index + 1])]
        );
      }
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// --- Tarifs ---------------------------------------------------------------

function mapTarif(row) {
  return {
    id: Number(row.id),
    nom: row.nom,
    categorie: row.categorie,
    prix: Number(row.prix || 0),
    nbEntrees: row.nb_entrees === null ? null : Number(row.nb_entrees),
    dureeJours: row.duree_jours === null ? null : Number(row.duree_jours),
    actif: Boolean(row.actif),
    ordre: Number(row.ordre || 0),
  };
}

async function listTarifs({ includeInactive = false } = {}) {
  await ensureSpaSchema();
  const [rows] = await pool.query(
    `SELECT * FROM spa_tarifs ${includeInactive ? '' : 'WHERE actif = 1'}
     ORDER BY FIELD(categorie, 'ENTREE', 'LOCATION', 'ABONNEMENT'), ordre, nom`
  );
  return rows.map(mapTarif);
}

async function createTarif(data) {
  await ensureSpaSchema();
  const [result] = await pool.query(
    'INSERT INTO spa_tarifs (nom, categorie, prix, nb_entrees, duree_jours, actif, ordre) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.nom, data.categorie, data.prix, data.nbEntrees, data.dureeJours, data.actif ? 1 : 0, data.ordre]
  );
  const [[row]] = await pool.query('SELECT * FROM spa_tarifs WHERE id = ?', [result.insertId]);
  return mapTarif(row);
}

async function updateTarif(id, data) {
  await ensureSpaSchema();
  const [result] = await pool.query(
    `UPDATE spa_tarifs SET nom = ?, categorie = ?, prix = ?, nb_entrees = ?, duree_jours = ?, actif = ?, ordre = ?
     WHERE id = ?`,
    [data.nom, data.categorie, data.prix, data.nbEntrees, data.dureeJours, data.actif ? 1 : 0, data.ordre, id]
  );
  if (!result.affectedRows) return null;
  const [[row]] = await pool.query('SELECT * FROM spa_tarifs WHERE id = ?', [id]);
  return mapTarif(row);
}

// Un tarif déjà vendu est désactivé plutôt que supprimé : les ventes passées le citent.
async function deleteTarif(id) {
  await ensureSpaSchema();
  const [result] = await pool.query('UPDATE spa_tarifs SET actif = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// --- Caisse : sessions et ventes ------------------------------------------

function mapVente(row) {
  return {
    id: Number(row.id),
    date: row.date_vente,
    montant: Number(row.montant || 0),
    moyenPaiement: row.moyen_paiement,
    clientNom: row.client_nom || '',
    clientTelephone: row.client_telephone || '',
    hotelReservationId: row.hotel_reservation_id ? Number(row.hotel_reservation_id) : null,
    chambre: row.chambre || '',
    lignes: parseJson(row.lignes, []),
    statut: row.statut,
    sessionId: Number(row.session_id),
    clotureId: row.cloture_id ? Number(row.cloture_id) : null,
    userId: row.user_id ? Number(row.user_id) : null,
  };
}

function summarizeVentes(ventes) {
  const byPayment = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0]));
  const byCategorie = Object.fromEntries(CATEGORIES.map((categorie) => [categorie, { quantite: 0, montant: 0 }]));
  let nombreEntrees = 0;
  for (const vente of ventes) {
    byPayment[vente.moyenPaiement] = (byPayment[vente.moyenPaiement] || 0) + vente.montant;
    for (const ligne of vente.lignes) {
      const bucket = byCategorie[ligne.categorie];
      if (!bucket) continue;
      bucket.quantite += Number(ligne.quantite || 0);
      bucket.montant += Number(ligne.prix || 0) * Number(ligne.quantite || 0);
      if (ligne.categorie === 'ENTREE') nombreEntrees += Number(ligne.quantite || 0);
    }
  }
  const totalVentes = ventes.reduce((sum, vente) => sum + vente.montant, 0);
  return {
    nombreVentes: ventes.length,
    nombreEntrees,
    totalVentes,
    // Total réellement encaissé : sans les ventes offertes.
    totalEncaisse: totalVentes - (byPayment.OFFERT || 0),
    byPayment,
    byCategorie,
  };
}

async function getCurrentSession(connection, userId, lock = false) {
  const [rows] = await connection.query(
    `SELECT * FROM spa_sessions WHERE statut = 'OUVERTE' ORDER BY id DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`
  );
  if (rows[0]) return rows[0];
  try {
    const [result] = await connection.query(
      `INSERT INTO spa_sessions (date_session, statut, ouvert_at, ouvert_par) VALUES (CURDATE(), 'OUVERTE', NOW(), ?)`,
      [userId || null]
    );
    const [[session]] = await connection.query('SELECT * FROM spa_sessions WHERE id = ?', [result.insertId]);
    return session;
  } catch (error) {
    // Deux caisses ont ouvert la session au même instant : on reprend celle créée.
    if (error.code !== 'ER_DUP_ENTRY') throw error;
    const [[session]] = await connection.query("SELECT * FROM spa_sessions WHERE statut = 'OUVERTE' ORDER BY id DESC LIMIT 1");
    return session;
  }
}

async function getCurrentCaisse(userId) {
  await ensureSpaSchema();
  const session = await getCurrentSession(pool, userId);
  const [rows] = await pool.query(
    `SELECT * FROM spa_ventes WHERE session_id = ? AND cloture_id IS NULL ORDER BY date_vente DESC, id DESC`,
    [session.id]
  );
  const ventes = rows.map(mapVente);
  return {
    session: { id: Number(session.id), date: session.date_session, ouvertAt: session.ouvert_at },
    ventes,
    summary: summarizeVentes(ventes),
  };
}

function abonnementNumero() {
  return `AB-${todayIso().replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

// Crée une vente. Les lignes d'abonnement créent chacune un abonnement au nom du client.
async function createVente({ lignes, moyenPaiement, clientNom, clientTelephone, hotelReservationId, chambre, userId }) {
  await ensureSpaSchema();
  return withTransaction(async (conn) => {
    const ids = [...new Set(lignes.map((ligne) => ligne.tarifId))];
    const [tarifRows] = await conn.query('SELECT * FROM spa_tarifs WHERE id IN (?) AND actif = 1', [ids]);
    const tarifs = new Map(tarifRows.map((row) => [Number(row.id), mapTarif(row)]));

    const resolved = lignes.map((ligne) => {
      const tarif = tarifs.get(ligne.tarifId);
      if (!tarif) throw ApiError.badRequest(`Tarif #${ligne.tarifId} introuvable ou désactivé`);
      return { tarifId: tarif.id, nom: tarif.nom, categorie: tarif.categorie, prix: tarif.prix, quantite: ligne.quantite, tarif };
    });
    if (resolved.some((ligne) => ligne.categorie === 'ABONNEMENT') && !clientNom) {
      throw ApiError.badRequest("Le nom du client est obligatoire pour vendre un abonnement");
    }

    if (hotelReservationId) {
      const [[reservation]] = await conn.query('SELECT id FROM reservations WHERE id = ?', [hotelReservationId]);
      if (!reservation) throw ApiError.badRequest('Réservation hôtel introuvable');
    }

    const montant = resolved.reduce((sum, ligne) => sum + ligne.prix * ligne.quantite, 0);
    const session = await getCurrentSession(conn, userId, true);
    const lignesJson = resolved.map(({ tarif, ...ligne }) => ligne);
    const [result] = await conn.query(
      `INSERT INTO spa_ventes
         (session_id, date_vente, montant, moyen_paiement, client_nom, client_telephone, hotel_reservation_id, chambre, lignes, statut, user_id)
       VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'OUVERTE', ?)`,
      [session.id, montant, moyenPaiement, clientNom || null, clientTelephone || null, hotelReservationId || null, chambre || null, JSON.stringify(lignesJson), userId || null]
    );
    const venteId = result.insertId;

    for (const ligne of resolved.filter((item) => item.categorie === 'ABONNEMENT')) {
      for (let index = 0; index < ligne.quantite; index += 1) {
        await conn.query(
          `INSERT INTO spa_abonnements
             (numero, vente_id, tarif_id, formule, client_nom, client_telephone, date_debut, date_fin, entrees_total, entrees_restantes)
           VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ${ligne.tarif.dureeJours ? 'DATE_ADD(CURDATE(), INTERVAL ? DAY)' : '?'}, ?, ?)`,
          [abonnementNumero(), venteId, ligne.tarifId, ligne.nom, clientNom, clientTelephone || null,
            ligne.tarif.dureeJours ? ligne.tarif.dureeJours - 1 : null, ligne.tarif.nbEntrees, ligne.tarif.nbEntrees]
        );
      }
    }

    if (moyenPaiement !== 'OFFERT' && montant > 0) {
      await conn.query(
        `INSERT INTO financial_transactions
           (module, type_flux, montant, moyen_paiement, reference_id, ref_flux_global, description, statut_sync, created_at)
         VALUES ('SPA', 'ENTREE', ?, ?, ?, ?, ?, 'SYNCED', NOW())`,
        [montant, moyenPaiement, venteId, `SPA-VENTE-${venteId}`, `Vente piscine #${venteId}${chambre ? ` — ${chambre}` : ''}`]
      );
    }

    const [[row]] = await conn.query('SELECT * FROM spa_ventes WHERE id = ?', [venteId]);
    const [abonnements] = await conn.query('SELECT * FROM spa_abonnements WHERE vente_id = ?', [venteId]);
    return { ...mapVente(row), abonnements: abonnements.map(mapAbonnement) };
  });
}

// Annule une vente de la session en cours (avant clôture) : la vente, ses
// abonnements et son écriture au grand livre sont supprimés.
async function cancelVente(id) {
  await ensureSpaSchema();
  return withTransaction(async (conn) => {
    const [[vente]] = await conn.query(
      'SELECT * FROM spa_ventes WHERE id = ? AND cloture_id IS NULL FOR UPDATE',
      [id]
    );
    if (!vente) return false;
    const [[{ passages }]] = await conn.query(
      'SELECT COUNT(*) AS passages FROM spa_passages p JOIN spa_abonnements a ON a.id = p.abonnement_id WHERE a.vente_id = ?',
      [id]
    );
    if (Number(passages) > 0) {
      throw ApiError.conflict("Impossible d'annuler : un abonnement de cette vente a déjà été utilisé");
    }
    await conn.query('DELETE FROM spa_abonnements WHERE vente_id = ?', [id]);
    await conn.query("DELETE FROM financial_transactions WHERE module = 'SPA' AND ref_flux_global = ?", [`SPA-VENTE-${id}`]);
    await conn.query('DELETE FROM spa_ventes WHERE id = ?', [id]);
    return true;
  });
}

// --- Clôtures ---------------------------------------------------------------

function mapClosure(row, ventes = undefined) {
  const details = parseJson(row.details, {});
  const result = {
    id: Number(row.id),
    reference: row.reference,
    date: row.date_session,
    dateCloture: row.date_cloture,
    sessionId: Number(row.session_id),
    createdBy: row.created_by ? Number(row.created_by) : null,
    summary: {
      nombreVentes: Number(row.nombre_ventes || 0),
      nombreEntrees: Number(row.nombre_entrees || 0),
      totalVentes: Number(details.totalVentes ?? row.total_montant ?? 0),
      totalEncaisse: Number(row.total_montant || 0),
      byPayment: details.byPayment || {},
      byCategorie: details.byCategorie || {},
    },
  };
  if (ventes) result.ventes = ventes.map(mapVente);
  return result;
}

async function closeCurrentSession(userId) {
  await ensureSpaSchema();
  return withTransaction(async (conn) => {
    const session = await getCurrentSession(conn, userId, true);
    const [rows] = await conn.query(
      'SELECT * FROM spa_ventes WHERE session_id = ? AND cloture_id IS NULL ORDER BY date_vente, id FOR UPDATE',
      [session.id]
    );
    const ventes = rows.map(mapVente);
    const summary = summarizeVentes(ventes);
    const reference = `SPA-${todayIso().replace(/-/g, '')}-${session.id}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const [closureResult] = await conn.query(
      `INSERT INTO spa_clotures
         (reference, session_id, date_session, date_cloture, total_montant, nombre_ventes, nombre_entrees, details, created_by)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
      [reference, session.id, session.date_session, summary.totalEncaisse, summary.nombreVentes, summary.nombreEntrees,
        JSON.stringify({ totalVentes: summary.totalVentes, byPayment: summary.byPayment, byCategorie: summary.byCategorie }), userId || null]
    );
    const closureId = closureResult.insertId;
    await conn.query(
      "UPDATE spa_ventes SET cloture_id = ?, statut = 'CLOTUREE' WHERE session_id = ? AND cloture_id IS NULL",
      [closureId, session.id]
    );
    await conn.query(
      "UPDATE spa_sessions SET statut = 'CLOTUREE', cloture_at = NOW(), cloture_par = ? WHERE id = ?",
      [userId || null, session.id]
    );
    await conn.query(
      "INSERT INTO spa_sessions (date_session, statut, ouvert_at, ouvert_par) VALUES (CURDATE(), 'OUVERTE', NOW(), ?)",
      [userId || null]
    );

    const [[closure]] = await conn.query('SELECT * FROM spa_clotures WHERE id = ?', [closureId]);
    const [closed] = await conn.query('SELECT * FROM spa_ventes WHERE cloture_id = ? ORDER BY date_vente, id', [closureId]);
    return mapClosure(closure, closed);
  });
}

async function listClosures() {
  await ensureSpaSchema();
  const [rows] = await pool.query('SELECT * FROM spa_clotures ORDER BY date_cloture DESC, id DESC');
  return rows.map((row) => mapClosure(row));
}

async function getClosure(id) {
  await ensureSpaSchema();
  const [[closure]] = await pool.query('SELECT * FROM spa_clotures WHERE id = ?', [id]);
  if (!closure) return null;
  const [ventes] = await pool.query('SELECT * FROM spa_ventes WHERE cloture_id = ? ORDER BY date_vente, id', [id]);
  return mapClosure(closure, ventes);
}

// --- Abonnements et passages ------------------------------------------------

function abonnementStatut(row) {
  if (row.annule) return 'ANNULE';
  if (row.date_fin && String(row.date_fin).slice(0, 10) < todayIso()) return 'EXPIRE';
  if (row.entrees_restantes !== null && Number(row.entrees_restantes) <= 0) return 'EPUISE';
  return 'ACTIF';
}

function mapAbonnement(row) {
  return {
    id: Number(row.id),
    numero: row.numero,
    venteId: row.vente_id ? Number(row.vente_id) : null,
    formule: row.formule,
    clientNom: row.client_nom,
    clientTelephone: row.client_telephone || '',
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    entreesTotal: row.entrees_total === null ? null : Number(row.entrees_total),
    entreesRestantes: row.entrees_restantes === null ? null : Number(row.entrees_restantes),
    nombrePassages: row.nombre_passages === undefined ? undefined : Number(row.nombre_passages),
    dernierPassage: row.dernier_passage || null,
    statut: abonnementStatut(row),
  };
}

async function listAbonnements({ q } = {}) {
  await ensureSpaSchema();
  const search = String(q || '').trim();
  const [rows] = await pool.query(
    `SELECT a.*, COUNT(p.id) AS nombre_passages, MAX(p.date_passage) AS dernier_passage
       FROM spa_abonnements a
       LEFT JOIN spa_passages p ON p.abonnement_id = a.id
      ${search ? 'WHERE a.client_nom LIKE ? OR a.client_telephone LIKE ? OR a.numero LIKE ?' : ''}
      GROUP BY a.id
      ORDER BY a.created_at DESC, a.id DESC`,
    search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
  );
  return rows.map(mapAbonnement);
}

// Enregistre l'entrée d'un abonné : refusée si l'abonnement est expiré, épuisé ou annulé.
async function addPassage(abonnementId, userId) {
  await ensureSpaSchema();
  return withTransaction(async (conn) => {
    const [[row]] = await conn.query('SELECT * FROM spa_abonnements WHERE id = ? FOR UPDATE', [abonnementId]);
    if (!row) throw ApiError.notFound('Abonnement introuvable');
    const statut = abonnementStatut(row);
    const messages = { EXPIRE: 'Abonnement expiré', EPUISE: 'Plus aucune entrée sur cet abonnement', ANNULE: 'Abonnement annulé' };
    if (statut !== 'ACTIF') throw ApiError.conflict(messages[statut]);

    await conn.query('INSERT INTO spa_passages (abonnement_id, date_passage, user_id) VALUES (?, NOW(), ?)', [abonnementId, userId || null]);
    if (row.entrees_restantes !== null) {
      await conn.query('UPDATE spa_abonnements SET entrees_restantes = entrees_restantes - 1 WHERE id = ?', [abonnementId]);
    }
    const [[updated]] = await conn.query(
      `SELECT a.*, (SELECT COUNT(*) FROM spa_passages WHERE abonnement_id = a.id) AS nombre_passages, NOW() AS dernier_passage
         FROM spa_abonnements a WHERE a.id = ?`,
      [abonnementId]
    );
    return mapAbonnement(updated);
  });
}

async function listPassages(abonnementId) {
  await ensureSpaSchema();
  const [rows] = await pool.query(
    `SELECT p.id, p.date_passage, u.nom, u.prenom
       FROM spa_passages p LEFT JOIN users u ON u.id_admin = p.user_id
      WHERE p.abonnement_id = ? ORDER BY p.date_passage DESC`,
    [abonnementId]
  );
  return rows.map((row) => ({ id: Number(row.id), date: row.date_passage, enregistrePar: [row.prenom, row.nom].filter(Boolean).join(' ') }));
}

async function cancelAbonnement(id) {
  await ensureSpaSchema();
  const [result] = await pool.query('UPDATE spa_abonnements SET annule = 1 WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// --- Hôtel ------------------------------------------------------------------

// Total des ventes portées sur la note de chambre, par réservation (affiché côté Hôtel).
async function roomCharges() {
  await ensureSpaSchema();
  const [rows] = await pool.query(
    `SELECT hotel_reservation_id, COALESCE(SUM(montant), 0) AS total
       FROM spa_ventes WHERE moyen_paiement = 'CHAMBRE' AND hotel_reservation_id IS NOT NULL
      GROUP BY hotel_reservation_id`
  );
  return rows.map((row) => ({ hotelReservationId: Number(row.hotel_reservation_id), total: Number(row.total || 0) }));
}

module.exports = {
  CATEGORIES,
  PAYMENT_METHODS,
  HOTEL_PAYMENT_METHODS,
  ensureSpaSchema,
  listTarifs,
  createTarif,
  updateTarif,
  deleteTarif,
  getCurrentCaisse,
  createVente,
  cancelVente,
  closeCurrentSession,
  listClosures,
  getClosure,
  listAbonnements,
  addPassage,
  listPassages,
  cancelAbonnement,
  roomCharges,
  summarizeVentes,
};
