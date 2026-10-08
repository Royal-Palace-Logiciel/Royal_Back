// models/barProductHistory.model.js
const { pool } = require('../config/db');

/**
 * Récupère l'historique des produits vendus (encaissés) entre deux dates.
 * Se base sur bar_transactions (statut = 'PAYEE') pour ne compter que le vendu réel.
 */
async function getProductHistory({ dateFrom, dateTo, productName } = {}) {
  const params = [];
  const conditions = ["bt.statut = 'PAYEE'"];

  if (dateFrom) {
    conditions.push('DATE(bt.created_at) >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('DATE(bt.created_at) <= ?');
    params.push(dateTo);
  }
  if (productName && String(productName).trim()) {
    conditions.push('bp.nom LIKE ?');
    params.push(`%${String(productName).trim()}%`);
  }

  const sql = `
    SELECT
      DATE(bt.created_at) AS date_vente,
      bt.product_id AS product_id,
      bp.nom AS produit,
      bp.categorie AS categorie,
      SUM(bt.quantite) AS quantite_totale,
      SUM(bt.quantite * bt.prix_unitaire) AS montant_total,
      COUNT(DISTINCT bt.order_id) AS nb_commandes
    FROM bar_transactions bt
    JOIN bar_products bp ON bp.id = bt.product_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY DATE(bt.created_at), bt.product_id, bp.nom, bp.categorie
    ORDER BY date_vente DESC, quantite_totale DESC
  `;

  const [rows] = await pool.query(sql, params);

  return rows.map((row) => ({
    date_vente: row.date_vente instanceof Date
      ? row.date_vente.toISOString().slice(0, 10)
      : String(row.date_vente).slice(0, 10),
    product_id: Number(row.product_id),
    produit: row.produit,
    categorie: row.categorie || 'Autre',
    quantite_totale: Number(row.quantite_totale || 0),
    montant_total: Number(row.montant_total || 0),
    nb_commandes: Number(row.nb_commandes || 0),
  }));
}

module.exports = { getProductHistory };