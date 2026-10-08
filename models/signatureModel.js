// models/signatureModel.js
//
// Module signature électronique générique et réutilisable.
// N'importe quelle entité "signable" (fiche KYC, opération de caisse comme
// une recave, crédit...) est identifiée par un couple (signable_type, signable_id).
//
// IMPORTANT : append-only. On n'écrase jamais une signature précédente —
// chaque signature (chaque re-signature du KYC, chaque opération de caisse
// signée) est un nouvel enregistrement. L'historique complet est conservé.

const { pool } = require('../config/db');
const { createCrudModel } = require('./crudFactory');

const Signatures = createCrudModel({
  table: 'signatures',
  pk: 'id',
  fields: ['signable_type', 'signable_id', 'client_id', 'signature_data', 'signed_at'],
  sortable: ['id', 'signable_type', 'signed_at', 'created_at'],
});

// Dernière signature connue pour une entité donnée (ex: affichage rapide dans un formulaire).
async function findLatestSignature(signableType, signableId) {
  const [rows] = await pool.query(
    `SELECT * FROM signatures
     WHERE signable_type = ? AND signable_id = ?
     ORDER BY signed_at DESC, id DESC
     LIMIT 1`,
    [signableType, signableId]
  );
  return rows[0] || null;
}

// Historique complet des signatures d'une entité, du plus récent au plus ancien.
async function findSignatureHistory(signableType, signableId) {
  const [rows] = await pool.query(
    `SELECT * FROM signatures
     WHERE signable_type = ? AND signable_id = ?
     ORDER BY signed_at DESC, id DESC`,
    [signableType, signableId]
  );
  return rows;
}

// Enregistre une NOUVELLE signature (jamais un remplacement).
async function createSignature({ signableType, signableId, clientId, signatureData, signedAt }) {
  const [ins] = await pool.query(
    'INSERT INTO signatures (signable_type, signable_id, client_id, signature_data, signed_at) VALUES (?, ?, ?, ?, ?)',
    [signableType, signableId, clientId ?? null, signatureData, signedAt || new Date()]
  );
  const [created] = await pool.query('SELECT * FROM signatures WHERE id = ?', [ins.insertId]);
  return created[0];
}

// Suppression ciblée d'UNE signature précise (ex: correction admin d'une erreur de saisie).
// Ne supprime jamais tout l'historique d'une entité en une fois.
async function deleteSignatureById(id) {
  await pool.query('DELETE FROM signatures WHERE id = ?', [id]);
}

module.exports = {
  Signatures,
  findLatestSignature,
  findSignatureHistory,
  createSignature,
  deleteSignatureById,
};