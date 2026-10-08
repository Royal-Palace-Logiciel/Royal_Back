CREATE TABLE IF NOT EXISTS rh_employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  matricule VARCHAR(30) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  photo_url VARCHAR(500) NULL,
  birth_date DATE NULL,
  phone VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  email VARCHAR(190) NULL,
  identification_number VARCHAR(100) NULL,
  department VARCHAR(120) NOT NULL,
  position VARCHAR(160) NOT NULL,
  joined_at DATE NOT NULL,
  contract_type VARCHAR(40) NOT NULL DEFAULT 'CDI',
  contract_end_date DATE NULL,
  salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIF',
  departure_date DATE NULL,
  departure_reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rh_employees_matricule (matricule),
  KEY idx_rh_employees_department (department),
  KEY idx_rh_employees_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_leave_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  leave_type VARCHAR(80) NOT NULL DEFAULT 'Congé annuel',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(5,2) NOT NULL DEFAULT 0,
  reason VARCHAR(500) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rh_leave_employee (employee_id),
  KEY idx_rh_leave_status (status),
  CONSTRAINT fk_rh_leave_employee FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PRESENT',
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rh_attendance_employee_date (employee_id, attendance_date),
  KEY idx_rh_attendance_date (attendance_date),
  CONSTRAINT fk_rh_attendance_employee FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_payroll (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  period_month DATE NOT NULL,
  base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  overtime_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  bonuses DECIMAL(15,2) NOT NULL DEFAULT 0,
  allowances DECIMAL(15,2) NOT NULL DEFAULT 0,
  advances DECIMAL(15,2) NOT NULL DEFAULT 0,
  deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'BROUILLON',
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rh_payroll_employee_period (employee_id, period_month),
  KEY idx_rh_payroll_period (period_month),
  CONSTRAINT fk_rh_payroll_employee FOREIGN KEY (employee_id) REFERENCES rh_employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO rh_employees
  (matricule, first_name, last_name, department, position, joined_at, contract_type, salary, status)
VALUES
  ('HDA-0001', 'Mamy', 'Rakoto', 'Réception', 'Responsable réception', '2021-03-12', 'CDI', 1850000, 'ACTIF'),
  ('HDA-0002', 'Lova', 'Razanakoto', 'Restauration', 'Chef de rang', '2022-06-05', 'CDI', 1250000, 'ACTIF'),
  ('HDA-0003', 'Sarah', 'Andrianina', 'Administration', 'Assistante RH', '2023-09-18', 'CDD', 1100000, 'EN_CONGE'),
  ('HDA-0004', 'Tiana', 'Raveloson', 'Casino', 'Croupier', '2020-01-21', 'CDI', 1450000, 'ACTIF'),
  ('HDA-0005', 'Hery', 'Ratsimba', 'Maintenance', 'Technicien', '2024-11-02', 'CDD', 980000, 'ABSENT');

INSERT IGNORE INTO rh_leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status)
SELECT id, 'Congé annuel', '2026-09-14', '2026-09-16', 3, 'Repos annuel', 'EN_ATTENTE'
FROM rh_employees WHERE matricule = 'HDA-0003';
