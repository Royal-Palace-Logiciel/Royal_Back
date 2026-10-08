-- Rôle Hôtesse : accès limité aux commandes du Bar.
-- À exécuter une seule fois. Syntaxe compatible avec les versions MySQL
-- qui ne prennent pas en charge `ADD ... IF NOT EXISTS`.
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'manager', 'receptioniste', 'caisse', 'water', 'housekeeping', 'croupier', 'hotesse') NOT NULL DEFAULT 'admin';

ALTER TABLE bar_orders
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER montant_total;

ALTER TABLE bar_orders
  ADD INDEX idx_bar_orders_created_by (created_by);

ALTER TABLE bar_orders
  ADD CONSTRAINT fk_bar_orders_created_by
  FOREIGN KEY (created_by) REFERENCES users(id_admin)
  ON DELETE SET NULL;
