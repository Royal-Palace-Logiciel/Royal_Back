-- Remove the test drinks that populated the Bar & Lounge menu categories.
-- Their transactions are removed first because bar_transactions restricts product deletion.
START TRANSACTION;

DELETE bt
FROM bar_transactions bt
JOIN bar_products bp ON bp.id = bt.product_id
WHERE bp.source_module = 'BAR'
  AND (
    (bp.categorie = 'Bières' AND bp.nom IN ('Bière Local', 'Heineken'))
    OR (bp.categorie = 'Boissons' AND bp.nom IN ('Coca-Cola', 'Jus d''Orange', 'Eau Minérale', 'Verre d''eau'))
  );

DELETE bs
FROM bar_stock bs
JOIN bar_products bp ON bp.id = bs.product_id
WHERE bp.source_module = 'BAR'
  AND (
    (bp.categorie = 'Bières' AND bp.nom IN ('Bière Local', 'Heineken'))
    OR (bp.categorie = 'Boissons' AND bp.nom IN ('Coca-Cola', 'Jus d''Orange', 'Eau Minérale', 'Verre d''eau'))
  );

DELETE bp
FROM bar_products bp
WHERE bp.source_module = 'BAR'
  AND (
    (bp.categorie = 'Bières' AND bp.nom IN ('Bière Local', 'Heineken'))
    OR (bp.categorie = 'Boissons' AND bp.nom IN ('Coca-Cola', 'Jus d''Orange', 'Eau Minérale', 'Verre d''eau'))
  );

COMMIT;
