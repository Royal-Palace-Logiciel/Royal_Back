-- Champs du bulletin de paie (modèle Diamond Club). À appliquer après 20260925_rh_documents_no_size_limit.sql.
-- node Database/runMigration.js Database/migrations/20260926_rh_payslip_fields.sql
ALTER TABLE rh_employees
  ADD COLUMN qualification VARCHAR(40) NULL AFTER position,
  ADD COLUMN cnaps_number VARCHAR(40) NULL AFTER qualification,
  ADD COLUMN dependents TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER cnaps_number;
