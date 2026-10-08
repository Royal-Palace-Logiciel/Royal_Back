-- Move legacy accommodation-only products into the shared products/stocks model.
-- Safe to re-run: synthetic product codes and product/location stock pairs are checked.
INSERT IGNORE INTO stock_locations (id, nom) VALUES (5, 'Hôtel');

INSERT INTO categories (nom)
SELECT DISTINCT hp.categorie
FROM hebergement_products hp
WHERE hp.categorie IS NOT NULL
  AND TRIM(hp.categorie) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.nom COLLATE utf8mb4_unicode_ci = hp.categorie COLLATE utf8mb4_unicode_ci
  );

INSERT INTO products (category_id, code, nom, unite, prix_vente, actif, type_produit)
SELECT
  (SELECT c.id FROM categories c
   WHERE c.nom COLLATE utf8mb4_unicode_ci = hp.categorie COLLATE utf8mb4_unicode_ci
   ORDER BY c.id LIMIT 1),
  CONCAT('HEBERGEMENT-LEGACY-', hp.id),
  hp.nom,
  COALESCE(hs.unite, 'unités'),
  COALESCE(hp.prix, 0),
  1,
  'CONSOMMABLE'
FROM hebergement_products hp
LEFT JOIN hebergement_stock hs ON hs.product_id = hp.id
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.code = CONCAT('HEBERGEMENT-LEGACY-', hp.id)
);

INSERT INTO stocks (product_id, location_id, quantite, seuil_minimum)
SELECT p.id, 5, COALESCE(hs.quantite, 0), COALESCE(hs.seuil_minimum, 5)
FROM hebergement_products hp
LEFT JOIN hebergement_stock hs ON hs.product_id = hp.id
JOIN products p ON p.code = CONCAT('HEBERGEMENT-LEGACY-', hp.id)
WHERE NOT EXISTS (
  SELECT 1 FROM stocks s WHERE s.product_id = p.id AND s.location_id = 5
);

INSERT INTO stock_movements
  (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at, stock_after, motif)
SELECT
  p.id,
  5,
  'ENTREE',
  hs.quantite,
  'HEBERGEMENT_LEGACY',
  hp.id,
  NOW(),
  hs.quantite,
  'Migration du stock hébergement historique'
FROM hebergement_products hp
JOIN hebergement_stock hs ON hs.product_id = hp.id
JOIN products p ON p.code = CONCAT('HEBERGEMENT-LEGACY-', hp.id)
WHERE hs.quantite > 0
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements sm
    WHERE sm.product_id = p.id
      AND sm.location_id = 5
      AND sm.source_module = 'HEBERGEMENT_LEGACY'
      AND sm.reference_id = hp.id
  );
