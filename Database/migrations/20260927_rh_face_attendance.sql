-- Pointage par reconnaissance faciale (admin uniquement). À appliquer après 20260926_rh_payslip_fields.sql.
-- node Database/runMigration.js Database/migrations/20260927_rh_face_attendance.sql
-- Attention : runMigration découpe le fichier sur les points-virgules, n'en mettez pas dans les commentaires.

-- Accord de l'employé pour l'usage de son visage (loi 2014-038 sur les données personnelles).
ALTER TABLE rh_employees
  ADD COLUMN face_consent_at DATETIME NULL AFTER dependents;

-- Signatures faciales : 128 nombres calculés à partir des photos d'enrôlement.
-- Les photos d'enrôlement elles-mêmes ne sont pas conservées.
CREATE TABLE IF NOT EXISTS rh_face_descriptors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  descriptor JSON NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rh_face_employee (employee_id),
  CONSTRAINT fk_rh_face_employee FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_rh_face_creator FOREIGN KEY (created_by) REFERENCES users(id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Méthode de pointage et photo prise au moment du pointage (preuve en cas de doute).
ALTER TABLE rh_attendance
  ADD COLUMN check_in_method ENUM('MANUEL', 'VISAGE') NOT NULL DEFAULT 'MANUEL' AFTER check_out,
  ADD COLUMN check_out_method ENUM('MANUEL', 'VISAGE') NULL AFTER check_in_method,
  ADD COLUMN check_in_photo VARCHAR(255) NULL AFTER check_out_method,
  ADD COLUMN check_out_photo VARCHAR(255) NULL AFTER check_in_photo;
