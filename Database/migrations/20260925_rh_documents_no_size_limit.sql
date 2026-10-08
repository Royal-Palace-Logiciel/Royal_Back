-- Pièces jointes RH sans limite de taille : INT UNSIGNED plafonne à environ 4 Go.
-- node Database/runMigration.js Database/migrations/20260925_rh_documents_no_size_limit.sql
ALTER TABLE rh_employee_documents
  MODIFY file_size BIGINT UNSIGNED NOT NULL DEFAULT 0;
