// models/casinoModel.js
//
// Regroupe les 9 tables du module casino. Les tables purement référentielles
// utilisent la crudFactory ; les tables avec une logique métier (sessions,
// crédits, jetons, visites) exposent des fonctions dédiées en plus du CRUD.

const { pool, withTransaction } = require('../config/db');
const { createCrudModel } = require('./crudFactory');

// ---------------------------------------------------------------------------
// Référentiels simples
// ---------------------------------------------------------------------------

const CasinoRooms = createCrudModel({
  table: 'casino_rooms',
  pk: 'id',
  fields: ['nom', 'type_salle', 'statut'],
  sortable: ['id', 'nom', 'type_salle', 'statut'],
});

const CasinoCashiers = createCrudModel({
  table: 'casino_cashiers',
  pk: 'id',
  fields: ['room_id', 'nom', 'statut'],
  sortable: ['id', 'nom', 'statut'],
});

// ---------------------------------------------------------------------------
// Sessions de caisse (ouverture / fermeture avec calcul d'écart)
// ---------------------------------------------------------------------------

const CasinoSessions = createCrudModel({
  table: 'casino_sessions',
  pk: 'id',
  fields: ['cashier_id', 'user_id', 'ouverture_at', 'fermeture_at', 'fond_initial', 'fond_final', 'ecart'],
  sortable: ['id', 'ouverture_at', 'fermeture_at', 'ecart'],
});

async function openSession({ cashierId, userId, fondInitial }) {
  const [result] = await pool.query(
    `INSERT INTO casino_sessions (cashier_id, user_id, ouverture_at, fond_initial)
     VALUES (?, ?, NOW(), ?)`,
    [cashierId, userId, fondInitial]
  );
  return CasinoSessions.findById(result.insertId);
}

// Ferme une session : fond_final est saisi par le caissier, l'écart est calculé
// automatiquement = fond_final - (fond_initial + somme des transactions cash de la session).
async function closeSession(sessionId, fondFinal) {
  return withTransaction(async (conn) => {
    const [sessionRows] = await conn.query('SELECT * FROM casino_sessions WHERE id = ? FOR UPDATE', [sessionId]);
    const session = sessionRows[0];
    if (!session) throw new Error(`Session casino #${sessionId} introuvable`);
    if (session.fermeture_at) throw new Error('Cette session est déjà clôturée');

    const [txRows] = await conn.query(
      `SELECT COALESCE(SUM(montant), 0) AS total FROM casino_transactions WHERE session_id = ?`,
      [sessionId]
    );
    const attendu = Number(session.fond_initial || 0) + Number(txRows[0].total || 0);
    const ecart = Number(fondFinal) - attendu;

    await conn.query(
      `UPDATE casino_sessions SET fermeture_at = NOW(), fond_final = ?, ecart = ? WHERE id = ?`,
      [fondFinal, ecart, sessionId]
    );
    const [updated] = await conn.query('SELECT * FROM casino_sessions WHERE id = ?', [sessionId]);
    return updated[0];
  });
}

async function activeSessions() {
  const [rows] = await pool.query('SELECT * FROM casino_sessions WHERE fermeture_at IS NULL ORDER BY ouverture_at DESC');
  return rows;
}

// ---------------------------------------------------------------------------
// Cartes de fidélité
// ---------------------------------------------------------------------------

const CasinoCards = createCrudModel({
  table: 'casino_cards',
  pk: 'id',
  fields: ['client_id', 'numero_carte', 'niveau', 'points'],
  sortable: ['id', 'niveau', 'points'],
});

async function findCardByClient(clientId) {
  const [rows] = await pool.query('SELECT * FROM casino_cards WHERE client_id = ? LIMIT 1', [clientId]);
  return rows[0] || null;
}

async function addCardPoints(cardId, delta) {
  await pool.query('UPDATE casino_cards SET points = points + ? WHERE id = ?', [delta, cardId]);
  return CasinoCards.findById(cardId);
}

// ---------------------------------------------------------------------------
// Crédits joueurs
// ---------------------------------------------------------------------------

const CasinoCredits = createCrudModel({
  table: 'casino_credits',
  pk: 'id',
  fields: ['client_id', 'montant_accorde', 'encours', 'echeance', 'statut'],
  sortable: ['id', 'echeance', 'statut', 'encours'],
});

async function grantCredit({ clientId, montant, echeance }) {
  const [result] = await pool.query(
    `INSERT INTO casino_credits (client_id, montant_accorde, encours, echeance, statut)
     VALUES (?, ?, ?, ?, 'ACTIF')`,
    [clientId, montant, montant, echeance || null]
  );
  return CasinoCredits.findById(result.insertId);
}

// Enregistre un remboursement (ou un tirage) partiel sur l'encours.
// delta négatif = remboursement, delta positif = tirage supplémentaire.
async function adjustCreditEncours(creditId, delta) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM casino_credits WHERE id = ? FOR UPDATE', [creditId]);
    const credit = rows[0];
    if (!credit) throw new Error(`Crédit #${creditId} introuvable`);
    const nouvelEncours = Math.max(0, Number(credit.encours) + Number(delta));
    const statut = nouvelEncours === 0 ? 'SOLDE' : credit.statut;
    await conn.query('UPDATE casino_credits SET encours = ?, statut = ? WHERE id = ?', [nouvelEncours, statut, creditId]);
    const [updated] = await conn.query('SELECT * FROM casino_credits WHERE id = ?', [creditId]);
    return updated[0];
  });
}

async function activeCreditsByClient(clientId) {
  const [rows] = await pool.query(
    `SELECT * FROM casino_credits WHERE client_id = ? AND statut = 'ACTIF' ORDER BY echeance ASC`,
    [clientId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

const CasinoScores = createCrudModel({
  table: 'casino_scores',
  pk: 'id',
  fields: ['client_id', 'score', 'categorie', 'details'],
  sortable: ['id', 'score', 'categorie'],
});

async function leaderboard({ categorie, limit = 10 } = {}) {
  const params = [];
  let sql = `
    SELECT cs.client_id, c.nom, c.prenom, SUM(cs.score) AS total_score
    FROM casino_scores cs
    JOIN clients c ON c.id = cs.client_id`;
  if (categorie) {
    sql += ' WHERE cs.categorie = ?';
    params.push(categorie);
  }
  sql += ' GROUP BY cs.client_id, c.nom, c.prenom ORDER BY total_score DESC LIMIT ?';
  params.push(limit);
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ---------------------------------------------------------------------------
// Transactions de jetons
// ---------------------------------------------------------------------------

const CasinoChipTransactions = createCrudModel({
  table: 'casino_chip_transactions',
  pk: 'id',
  fields: ['client_id', 'transaction_type', 'quantite', 'valeur_unitaire', 'created_at'],
  sortable: ['id', 'created_at', 'transaction_type'],
});

async function recordChipTransaction({ clientId, type, quantite, valeurUnitaire }) {
  const [result] = await pool.query(
    `INSERT INTO casino_chip_transactions (client_id, transaction_type, quantite, valeur_unitaire, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [clientId, type, quantite, valeurUnitaire]
  );
  return CasinoChipTransactions.findById(result.insertId);
}

async function chipTransactionsByClient(clientId, limit = 50) {
  const [rows] = await pool.query(
    'SELECT * FROM casino_chip_transactions WHERE client_id = ? ORDER BY created_at DESC LIMIT ?',
    [clientId, limit]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Visites de salle (entrée / sortie)
// ---------------------------------------------------------------------------

const CasinoVisits = createCrudModel({
  table: 'casino_visits',
  pk: 'id',
  fields: ['client_id', 'room_id', 'entree_at', 'sortie_at'],
  sortable: ['id', 'entree_at', 'sortie_at'],
});

async function checkIn({ clientId, roomId }) {
  const [result] = await pool.query(
    'INSERT INTO casino_visits (client_id, room_id, entree_at) VALUES (?, ?, NOW())',
    [clientId, roomId]
  );
  return CasinoVisits.findById(result.insertId);
}

async function checkOut(visitId) {
  await pool.query('UPDATE casino_visits SET sortie_at = NOW() WHERE id = ? AND sortie_at IS NULL', [visitId]);
  return CasinoVisits.findById(visitId);
}

async function currentlyInRoom(roomId) {
  const [rows] = await pool.query(
    `SELECT cv.*, c.nom, c.prenom FROM casino_visits cv
     JOIN clients c ON c.id = cv.client_id
     WHERE cv.room_id = ? AND cv.sortie_at IS NULL
     ORDER BY cv.entree_at ASC`,
    [roomId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Transactions financières (rattachées à une session de caisse)
// ---------------------------------------------------------------------------

const CasinoTransactions = createCrudModel({
  table: 'casino_transactions',
  pk: 'id',
  fields: ['client_id', 'session_id', 'type_transaction', 'montant', 'moyen_paiement', 'created_at'],
  sortable: ['id', 'created_at', 'montant'],
});

async function recordTransaction({ clientId, sessionId, type, montant, moyenPaiement }) {
  const [result] = await pool.query(
    `INSERT INTO casino_transactions (client_id, session_id, type_transaction, montant, moyen_paiement, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [clientId, sessionId, type, montant, moyenPaiement]
  );
  return CasinoTransactions.findById(result.insertId);
}

async function transactionsBySession(sessionId) {
  const [rows] = await pool.query(
    'SELECT * FROM casino_transactions WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Tableau de bord agrégé
// ---------------------------------------------------------------------------

async function dashboardSummary() {
  const [[visits]] = await pool.query(
    `SELECT COUNT(*) AS visiteurs_actifs FROM casino_visits WHERE sortie_at IS NULL`
  );
  const [[sessions]] = await pool.query(
    `SELECT COUNT(*) AS sessions_ouvertes FROM casino_sessions WHERE fermeture_at IS NULL`
  );
  const [[credits]] = await pool.query(
    `SELECT COALESCE(SUM(encours), 0) AS encours_total FROM casino_credits WHERE statut = 'ACTIF'`
  );
  const [[chips]] = await pool.query(
    `SELECT COALESCE(SUM(quantite * valeur_unitaire), 0) AS volume_jetons_jour
     FROM casino_chip_transactions WHERE DATE(created_at) = CURDATE()`
  );
  return {
    visiteurs_actifs: visits.visiteurs_actifs,
    sessions_ouvertes: sessions.sessions_ouvertes,
    encours_credits_actifs: credits.encours_total,
    volume_jetons_aujourdhui: chips.volume_jetons_jour,
  };
}

module.exports = {
  CasinoRooms,
  CasinoCashiers,
  CasinoSessions, openSession, closeSession, activeSessions,
  CasinoCards, findCardByClient, addCardPoints,
  CasinoCredits, grantCredit, adjustCreditEncours, activeCreditsByClient,
  CasinoScores, leaderboard,
  CasinoChipTransactions, recordChipTransaction, chipTransactionsByClient,
  CasinoVisits, checkIn, checkOut, currentlyInRoom,
  CasinoTransactions, recordTransaction, transactionsBySession,
  dashboardSummary,
};
