-- Corriger les données bar avec bons accents en UTF-8
DELETE FROM bar_transactions;
DELETE FROM bar_orders;
DELETE FROM bar_stock;
DELETE FROM bar_products;

-- Alcools
INSERT INTO bar_products (nom, ingredients, prix, categorie, alcool, type_produit, source_module) VALUES
('Cachaça', 'Alcool premium', 2500, 'Alcools', 1, 'PRODUIT_FINI', 'BAR'),
('Rhum Arrangé', 'Rhum vieilli', 3000, 'Alcools', 1, 'PRODUIT_FINI', 'BAR'),
('Cognac', 'Cognac premium', 4000, 'Alcools', 1, 'PRODUIT_FINI', 'BAR');

-- Cocktails
INSERT INTO bar_products (nom, ingredients, prix, categorie, alcool, type_produit, source_module) VALUES
('Mojito', 'Rhum blanc, menthe, citron, sucre', 3500, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
('Piña Colada', 'Rhum blanc, lait de coco, jus d''ananas', 4000, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
('Margarita', 'Tequila, triple sec, jus de citron', 3000, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
('Daiquiri', 'Rhum blanc, jus de citron, sucre', 3000, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR');

-- Ajouter le stock
INSERT INTO bar_stock (product_id, quantite, seuil_minimum, unite) 
SELECT id, 100, 5, 'bouteilles' FROM bar_products;
