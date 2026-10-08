-- Évolutions RH. À appliquer après 20260914_rh_link_users.sql.
-- node Database/runMigration.js Database/migrations/20260923_rh_evolutions.sql
-- Attention : runMigration découpe le fichier sur les points-virgules, n'en mettez pas dans les commentaires.

-- Statuts de fin de contrat : la raison est stockée dans departure_reason.
ALTER TABLE rh_employees
  MODIFY status ENUM('ACTIF', 'EN_CONGE', 'SUSPENDU', 'SORTI', 'RETRAITE', 'RENVOYE', 'DEMISSIONNE') NOT NULL DEFAULT 'ACTIF',
  ADD COLUMN prime DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER salary,
  ADD COLUMN cnaps DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER prime,
  ADD COLUMN ostie DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER cnaps,
  ADD COLUMN irsa DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER ostie,
  ADD KEY idx_rh_employees_contract_type (contract_type);

-- L'ancienne option « Stage » devient « Stagiaire ».
UPDATE rh_employees SET contract_type = 'Stagiaire' WHERE contract_type = 'Stage';

-- Cotisations des CDI/CDD existants : CNAPS et OSTIE à 1 % du salaire.
UPDATE rh_employees SET cnaps = ROUND(salary * 0.01, 2), ostie = ROUND(salary * 0.01, 2) WHERE contract_type IN ('CDI', 'CDD');

-- Cotisations figées sur la ligne de paie + jours de présence (prestataires payés au jour).
ALTER TABLE rh_payroll
  ADD COLUMN cnaps DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER absence_deductions,
  ADD COLUMN ostie DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER cnaps,
  ADD COLUMN irsa DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER ostie,
  ADD COLUMN presence_days INT UNSIGNED NULL AFTER irsa;

-- Pièces jointes du dossier employé. Fichiers stockés hors du dossier public /uploads
-- et servis uniquement via l'API RH authentifiée.
CREATE TABLE IF NOT EXISTS rh_employee_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  doc_type ENUM('CIN', 'RESIDENCE', 'CV', 'CONTRAT') NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rh_documents_employee (employee_id),
  CONSTRAINT fk_rh_documents_employee FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rh_documents_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Budget salarial mensuel par département (module Évaluation).
CREATE TABLE IF NOT EXISTS rh_department_budgets (
  department VARCHAR(120) NOT NULL,
  monthly_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
