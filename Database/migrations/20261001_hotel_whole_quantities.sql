-- Hotel stock is counted in whole items. Keep the correction visible in the movement ledger.
INSERT INTO stock_movements
  (product_id, location_id, type_mouvement, quantite, source_module, created_at, stock_after, motif)
SELECT
  s.product_id,
  s.location_id,
  'AJUSTEMENT',
  ROUND(s.quantite) - s.quantite,
  'STOCK_MANUEL',
  NOW(),
  ROUND(s.quantite),
  'Arrondi de quantité Hotel à l’unité entière'
FROM stocks s
WHERE s.location_id = 5
  AND s.quantite <> ROUND(s.quantite);

UPDATE stocks
SET quantite = ROUND(quantite)
WHERE location_id = 5
  AND quantite <> ROUND(quantite);