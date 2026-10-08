-- HR hardening. Apply after 20260909_hr_module.sql.
-- Payroll amounts deliberately exclude Madagascar statutory contributions (CNAPS,
-- OSTIE and IRSA) are entered as audited deductions until a local tax
-- rules engine is approved.

UPDATE rh_employees SET status = 'ACTIF' WHERE status = 'ABSENT';
UPDATE rh_leave_requests SET leave_type = CASE leave_type
  WHEN 'Congé annuel' THEN 'ANNUEL'
  WHEN 'Congé maladie' THEN 'MALADIE'
  WHEN 'Congé sans solde' THEN 'SANS_SOLDE'
  ELSE 'ANNUEL' END;

ALTER TABLE rh_employees
  MODIFY status ENUM('ACTIF', 'EN_CONGE', 'SUSPENDU', 'SORTI') NOT NULL DEFAULT 'ACTIF',
  ADD UNIQUE KEY uq_rh_employees_email (email),
  ADD UNIQUE KEY uq_rh_employees_identification_number (identification_number);

ALTER TABLE rh_leave_requests
  MODIFY leave_type ENUM('ANNUEL', 'MALADIE', 'MATERNITE_PATERNITE', 'SANS_SOLDE') NOT NULL DEFAULT 'ANNUEL',
  MODIFY status ENUM('EN_ATTENTE', 'APPROUVE', 'REFUSE', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
  DROP FOREIGN KEY fk_rh_leave_employee,
  ADD CONSTRAINT fk_rh_leave_employee_history FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE RESTRICT;

ALTER TABLE rh_attendance
  MODIFY status ENUM('PRESENT', 'RETARD', 'ABSENT', 'NON_POINTE') NOT NULL DEFAULT 'PRESENT',
  DROP FOREIGN KEY fk_rh_attendance_employee,
  ADD CONSTRAINT fk_rh_attendance_employee_history FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE RESTRICT;

ALTER TABLE rh_payroll
  MODIFY status ENUM('BROUILLON', 'VALIDE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
  ADD COLUMN absence_deductions DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER deductions,
  DROP FOREIGN KEY fk_rh_payroll_employee,
  ADD CONSTRAINT fk_rh_payroll_employee_history FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS rh_departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_rh_department_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_positions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_rh_position_department_name (department_id, name),
  CONSTRAINT fk_rh_position_department FOREIGN KEY (department_id) REFERENCES rh_departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_leave_balances (
  employee_id BIGINT UNSIGNED NOT NULL,
  annual_accrued DECIMAL(6,2) NOT NULL DEFAULT 0,
  annual_used DECIMAL(6,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id),
  CONSTRAINT fk_rh_balance_employee FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_evaluations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  period VARCHAR(30) NOT NULL,
  reviewer_id BIGINT UNSIGNED NULL,
  score DECIMAL(4,2) NULL,
  comment TEXT NULL,
  evaluation_date DATE NOT NULL,
  status ENUM('BROUILLON', 'FINALISE') NOT NULL DEFAULT 'BROUILLON',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_rh_evaluations_employee (employee_id),
  CONSTRAINT fk_rh_evaluation_employee FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rh_evaluation_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO rh_departments (name) VALUES
  ('Administration'), ('Réception'), ('Restauration'), ('Casino'), ('Maintenance'), ('Hébergement'), ('Sécurité');

INSERT IGNORE INTO rh_leave_balances (employee_id, annual_accrued, annual_used)
SELECT id, 24, 0 FROM rh_employees;

-- HR history cannot be removed by deletion: foreign keys are RESTRICT and the
-- application’s everyday lifecycle endpoint only performs logical offboarding.
