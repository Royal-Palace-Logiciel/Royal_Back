-- Suppression d'un client qui a un historique : il est retiré des listes et des
-- recherches (deleted_at), sans changer son statut, et son historique est conservé.
-- node Database/runMigration.js Database/migrations/20260929_clients_soft_delete.sql
ALTER TABLE clients
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT UNSIGNED NULL,
  ADD KEY idx_clients_deleted_at (deleted_at);
