// models/restaurantProductHistory.model.js
const { pool } = require('../config/db');

/**
 * Récupère l'historique des produits vendus (commandes payées) entre deux dates.
 * Se base sur orders + order_items (statut = 'PAYEE') pour ne compter que le vendu réel.
 */
async function getProductHistory({ dateFrom, dateTo, productName } = {}) {
  const params = [];
  const conditions = [
    "o.source_module = 'RESTAURANT'",
    "o.statut IN ('PAYEE', 'PAYE')",
  ];

  if (dateFrom) {
    conditions.push('DATE(o.created_at) >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('DATE(o.created_at) <= ?');
    params.push(dateTo);
  }
  if (productName && String(productName).trim()) {
    conditions.push('p.nom LIKE ?');
    params.push(`%${String(productName).trim()}%`);
  }

  const sql = `
    SELECT
      DATE(o.created_at) AS date_vente,
      oi.product_id AS product_id,
      COALESCE(p.nom, CONCAT('Produit #', oi.product_id)) AS produit,
      COALESCE(c.nom, 'Autre') AS categorie,
      SUM(oi.quantite) AS quantite_totale,
      SUM(oi.quantite * oi.prix_unitaire) AS montant_total,
      COUNT(DISTINCT o.id) AS nb_commandes
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY DATE(o.created_at), oi.product_id, p.nom, c.nom
    ORDER BY date_vente DESC, quantite_totale DESC
  `;

  const [rows] = await pool.query(sql, params);

  return rows.map((row) => ({
    date_vente: row.date_vente instanceof Date
      ? row.date_vente.toISOString().slice(0, 10)
      : String(row.date_vente).slice(0, 10),
    product_id: Number(row.product_id),
    produit: row.produit,
    categorie: row.categorie,
    quantite_totale: Number(row.quantite_totale || 0),
    montant_total: Number(row.montant_total || 0),
    nb_commandes: Number(row.nb_commandes || 0),
  }));
}

module.exports = { getProductHistory };