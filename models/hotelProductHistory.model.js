// models/hotelProductHistory.model.js
const { pool } = require('../config/db');

/**
 * Récupère le journal des mouvements de stock de l'hôtel entre deux dates.
 * Inclut les entrées, sorties et ajustements issus des opérations Hotel.
 */
async function getHotelProductHistory({ dateFrom, dateTo, productName, locationId = 5 } = {}) {
  const params = [];
  const conditions = ['sm.location_id = ?'];
  params.push(locationId);

  if (dateFrom) {
    conditions.push('DATE(sm.created_at) >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('DATE(sm.created_at) <= ?');
    params.push(dateTo);
  }
  if (productName && String(productName).trim()) {
    conditions.push('p.nom LIKE ?');
    params.push(`%${String(productName).trim()}%`);
  }

  const sql = `
    SELECT
      DATE(sm.created_at) AS date_consommation,
      sm.product_id AS product_id,
      p.nom AS produit,
      COALESCE(c.nom, 'Autre') AS categorie,
      p.unite AS unite,
      SUM(sm.quantite) AS quantite_totale,
      sm.source_module AS source,
      sm.type_mouvement AS type_mouvement,
      COUNT(*) AS nb_operations
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY DATE(sm.created_at), sm.product_id, p.nom, c.nom, p.unite, sm.source_module, sm.type_mouvement
    ORDER BY date_consommation DESC, quantite_totale DESC
  `;

  const [rows] = await pool.query(sql, params);

  return rows.map((row) => ({
    date_consommation: row.date_consommation instanceof Date
      ? row.date_consommation.toISOString().slice(0, 10)
      : String(row.date_consommation).slice(0, 10),
    product_id: Number(row.product_id),
    produit: row.produit,
    categorie: row.categorie || 'Autre',
    unite: row.unite || 'unités',
    quantite_totale: Number(row.quantite_totale || 0),
    source: row.source || 'AUTRE',
    type_mouvement: row.type_mouvement,
    nb_operations: Number(row.nb_operations || 0),
  }));
}

module.exports = { getHotelProductHistory };
