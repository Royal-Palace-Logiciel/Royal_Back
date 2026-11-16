SET NAMES utf8mb4;

INSERT INTO stock_locations (id, nom)
SELECT 5, 'Hôtel'
WHERE NOT EXISTS (SELECT 1 FROM stock_locations WHERE id = 5);

UPDATE stays s
JOIN reservations r ON r.id = s.reservation_id
SET s.checkout_at = COALESCE(s.checkout_at, NOW())
WHERE s.checkout_at IS NULL
  AND UPPER(COALESCE(r.statut, '')) IN ('TERMINEE', 'ANNULEE');

INSERT INTO stays (reservation_id, checkin_at)
SELECT r.id, COALESCE(r.updated_at, r.created_at, NOW())
FROM reservations r
LEFT JOIN stays s ON s.reservation_id = r.id AND s.checkout_at IS NULL
WHERE UPPER(COALESCE(r.statut, '')) IN ('EN_COURS', 'CHECKED_IN')
  AND s.id IS NULL;

UPDATE rooms rm
JOIN reservations r ON r.room_id = rm.id
JOIN stays s ON s.reservation_id = r.id AND s.checkout_at IS NULL
SET rm.statut = 'OCCUPEE'
WHERE UPPER(COALESCE(r.statut, '')) IN ('EN_COURS', 'CHECKED_IN');

UPDATE rooms rm
LEFT JOIN (
  SELECT DISTINCT r.room_id
  FROM reservations r
  JOIN stays s ON s.reservation_id = r.id AND s.checkout_at IS NULL
  WHERE UPPER(COALESCE(r.statut, '')) IN ('EN_COURS', 'CHECKED_IN')
) active ON active.room_id = rm.id
SET rm.statut = 'LIBRE'
WHERE active.room_id IS NULL
  AND rm.statut = 'OCCUPEE';

SET @hotel_missing_columns := (
  SELECT GROUP_CONCAT(definition SEPARATOR ', ')
  FROM (
    SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'zone') = 0, 'ADD COLUMN zone VARCHAR(100) DEFAULT NULL', NULL) definition
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'quantite') = 0, 'ADD COLUMN quantite INT UNSIGNED NOT NULL DEFAULT 1', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'is_consumable') = 0, 'ADD COLUMN is_consumable TINYINT(1) NOT NULL DEFAULT 0', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'product_id') = 0, 'ADD COLUMN product_id BIGINT UNSIGNED DEFAULT NULL', NULL)
  ) missing
  WHERE definition IS NOT NULL
);
SET @hotel_missing_columns := IF(@hotel_missing_columns IS NULL, 'SELECT 1', CONCAT('ALTER TABLE equipments ', @hotel_missing_columns));
PREPARE hotel_equipment_columns_stmt FROM @hotel_missing_columns;
EXECUTE hotel_equipment_columns_stmt;
DEALLOCATE PREPARE hotel_equipment_columns_stmt;

SET @hotel_stock_movement_columns := (
  SELECT GROUP_CONCAT(definition SEPARATOR ', ')
  FROM (
    SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'stock_after') = 0, 'ADD COLUMN stock_after DECIMAL(15,2) NULL', NULL) definition
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'motif') = 0, 'ADD COLUMN motif VARCHAR(255) DEFAULT NULL', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'user_id') = 0, 'ADD COLUMN user_id BIGINT UNSIGNED DEFAULT NULL', NULL)
  ) missing
  WHERE definition IS NOT NULL
);
SET @hotel_stock_movement_columns := IF(@hotel_stock_movement_columns IS NULL, 'SELECT 1', CONCAT('ALTER TABLE stock_movements ', @hotel_stock_movement_columns));
PREPARE hotel_stock_movement_columns_stmt FROM @hotel_stock_movement_columns;
EXECUTE hotel_stock_movement_columns_stmt;
DEALLOCATE PREPARE hotel_stock_movement_columns_stmt;

SET @hotel_room_equipment_columns := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_equipments' AND COLUMN_NAME = 'zone') = 0,
    'ALTER TABLE room_equipments ADD COLUMN zone VARCHAR(100) DEFAULT NULL',
    'SELECT 1'
  )
);
PREPARE hotel_room_equipment_columns_stmt FROM @hotel_room_equipment_columns;
EXECUTE hotel_room_equipment_columns_stmt;
DEALLOCATE PREPARE hotel_room_equipment_columns_stmt;

SET @hotel_maintenance_columns := (
  SELECT GROUP_CONCAT(definition SEPARATOR ', ')
  FROM (
    SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'location') = 0, 'ADD COLUMN location VARCHAR(100) DEFAULT NULL', NULL) definition
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'equipment_label') = 0, 'ADD COLUMN equipment_label VARCHAR(150) DEFAULT NULL', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'worker_id') = 0, 'ADD COLUMN worker_id BIGINT UNSIGNED DEFAULT NULL', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'execution_date') = 0, 'ADD COLUMN execution_date DATETIME DEFAULT NULL', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'finish_date') = 0, 'ADD COLUMN finish_date DATETIME DEFAULT NULL', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'materials_cost') = 0, 'ADD COLUMN materials_cost DECIMAL(14,2) NOT NULL DEFAULT 0', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'labor_cost') = 0, 'ADD COLUMN labor_cost DECIMAL(14,2) NOT NULL DEFAULT 0', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'total_cost') = 0, 'ADD COLUMN total_cost DECIMAL(14,2) NOT NULL DEFAULT 0', NULL)
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'materials_used') = 0, 'ADD COLUMN materials_used JSON DEFAULT NULL', NULL)
  ) missing
  WHERE definition IS NOT NULL
);
SET @hotel_maintenance_columns := IF(@hotel_maintenance_columns IS NULL, 'SELECT 1', CONCAT('ALTER TABLE room_maintenance ', @hotel_maintenance_columns));
PREPARE hotel_maintenance_columns_stmt FROM @hotel_maintenance_columns;
EXECUTE hotel_maintenance_columns_stmt;
DEALLOCATE PREPARE hotel_maintenance_columns_stmt;

SET @hotel_housekeeping_columns := (
  SELECT GROUP_CONCAT(definition SEPARATOR ', ')
  FROM (
    SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'housekeeping_tasks' AND COLUMN_NAME = 'products_used') = 0, 'ADD COLUMN products_used JSON DEFAULT NULL', NULL) definition
    UNION ALL SELECT IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'housekeeping_tasks' AND COLUMN_NAME = 'exceptional_details') = 0, 'ADD COLUMN exceptional_details TEXT DEFAULT NULL', NULL)
  ) missing
  WHERE definition IS NOT NULL
);
SET @hotel_housekeeping_columns := IF(@hotel_housekeeping_columns IS NULL, 'SELECT 1', CONCAT('ALTER TABLE housekeeping_tasks ', @hotel_housekeeping_columns));
PREPARE hotel_housekeeping_columns_stmt FROM @hotel_housekeeping_columns;
EXECUTE hotel_housekeeping_columns_stmt;
DEALLOCATE PREPARE hotel_housekeeping_columns_stmt;

SET @has_users_module := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'module'
);
SET @add_users_module_sql := IF(
  @has_users_module = 0,
  'ALTER TABLE users ADD COLUMN module TEXT NULL AFTER role',
  'SELECT 1'
);
PREPARE add_users_module_stmt FROM @add_users_module_sql;
EXECUTE add_users_module_stmt;
DEALLOCATE PREPARE add_users_module_stmt;

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','manager','receptioniste','caisse','caissier','water','housekeeping','hotesse','stock_manager') NOT NULL DEFAULT 'admin';

CREATE TABLE IF NOT EXISTS maintenance_workers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) DEFAULT NULL,
  telephone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  specialite VARCHAR(150) DEFAULT NULL,
  date_debut DATE DEFAULT NULL,
  date_fin DATE DEFAULT NULL,
  statut VARCHAR(30) NOT NULL DEFAULT 'ACTIF',
  photo_url VARCHAR(500) DEFAULT NULL,
  id_photo_url VARCHAR(500) DEFAULT NULL,
  contract_url VARCHAR(500) DEFAULT NULL,
  quote_url VARCHAR(500) DEFAULT NULL,
  time_slot VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_cashiers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  statut ENUM('OUVERTE','FERMEE','ACTIF','INACTIF') NOT NULL DEFAULT 'ACTIF',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_tables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero VARCHAR(50) NOT NULL,
  capacite INT UNSIGNED NOT NULL DEFAULT 4,
  statut VARCHAR(30) NOT NULL DEFAULT 'LIBRE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bar_tables_numero (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cashier_id BIGINT UNSIGNED DEFAULT NULL,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  ouverture_at DATETIME DEFAULT NULL,
  fermeture_at DATETIME DEFAULT NULL,
  fond_initial DECIMAL(14,2) NOT NULL DEFAULT 0,
  fond_final DECIMAL(14,2) DEFAULT NULL,
  ecart DECIMAL(14,2) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_bar_sessions_cashier (cashier_id),
  KEY idx_bar_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_name VARCHAR(150) DEFAULT NULL,
  table_id BIGINT UNSIGNED DEFAULT NULL,
  nombre_personnes INT UNSIGNED NOT NULL DEFAULT 1,
  moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
  observation TEXT DEFAULT NULL,
  hotel_reservation_id BIGINT UNSIGNED DEFAULT NULL,
  room_id BIGINT UNSIGNED DEFAULT NULL,
  room_guest_name VARCHAR(255) DEFAULT NULL,
  room_account_paid TINYINT(1) NOT NULL DEFAULT 0,
  statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  montant_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cloture_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_bar_orders_table (table_id),
  KEY idx_bar_orders_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  nom VARCHAR(150) DEFAULT NULL,
  quantite INT NOT NULL DEFAULT 1,
  prix DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bar_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED DEFAULT NULL,
  order_id BIGINT UNSIGNED DEFAULT NULL,
  type_transaction VARCHAR(40) NOT NULL DEFAULT 'ENTREE',
  montant DECIMAL(14,2) NOT NULL DEFAULT 0,
  moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
  reference VARCHAR(150) DEFAULT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bar_transactions_session (session_id),
  KEY idx_bar_transactions_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_equipments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(150) NOT NULL,
  categorie VARCHAR(100) NOT NULL DEFAULT 'Divers',
  description TEXT DEFAULT NULL,
  quantite INT UNSIGNED NOT NULL DEFAULT 1,
  etat ENUM('EN_SERVICE','A_REPARER','HORS_SERVICE') NOT NULL DEFAULT 'EN_SERVICE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bar_daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_date DATE NOT NULL,
  personnel JSON NOT NULL,
  `manual` JSON NOT NULL,
  metrics JSON NOT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bar_daily_reports_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  matricule VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  photo_url VARCHAR(500) DEFAULT NULL,
  birth_date DATE DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  identification_number VARCHAR(100) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  position VARCHAR(150) DEFAULT NULL,
  joined_at DATE DEFAULT NULL,
  contract_type VARCHAR(30) NOT NULL DEFAULT 'CDI',
  contract_end_date DATE DEFAULT NULL,
  qualification VARCHAR(255) DEFAULT NULL,
  cnaps_number VARCHAR(100) DEFAULT NULL,
  dependents INT NOT NULL DEFAULT 0,
  salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  prime DECIMAL(14,2) NOT NULL DEFAULT 0,
  pourboire DECIMAL(14,2) NOT NULL DEFAULT 0,
  cnaps DECIMAL(14,2) NOT NULL DEFAULT 0,
  ostie DECIMAL(14,2) NOT NULL DEFAULT 0,
  irsa DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIF',
  departure_date DATE DEFAULT NULL,
  departure_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rh_employees_matricule (matricule),
  KEY idx_rh_employees_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_evaluations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  period VARCHAR(30) NOT NULL,
  reviewer_id BIGINT UNSIGNED DEFAULT NULL,
  score DECIMAL(5,2) DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  evaluation_date DATE DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'BROUILLON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rh_evaluations_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_leave_balances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  annual_accrued DECIMAL(8,2) NOT NULL DEFAULT 0,
  annual_used DECIMAL(8,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rh_leave_balances_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_leave_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'ANNUEL',
  reason TEXT DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  approved_by BIGINT UNSIGNED DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rh_leave_requests_employee (employee_id),
  KEY idx_rh_leave_requests_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIME DEFAULT NULL,
  check_out TIME DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PRESENT',
  note TEXT DEFAULT NULL,
  photo_url VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rh_attendance_employee_date (employee_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_face_descriptors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  descriptor JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rh_face_descriptors_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_payroll (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  period VARCHAR(20) NOT NULL,
  salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  prime DECIMAL(14,2) NOT NULL DEFAULT 0,
  pourboire DECIMAL(14,2) NOT NULL DEFAULT 0,
  cnaps DECIMAL(14,2) NOT NULL DEFAULT 0,
  ostie DECIMAL(14,2) NOT NULL DEFAULT 0,
  irsa DECIMAL(14,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'BROUILLON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rh_payroll_employee_period (employee_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @rh_employee_face_consent := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_employees' AND COLUMN_NAME = 'face_consent_at') = 0,
  'ALTER TABLE rh_employees ADD COLUMN face_consent_at DATETIME DEFAULT NULL',
  'SELECT 1'
);
PREPARE rh_employee_face_consent_stmt FROM @rh_employee_face_consent;
EXECUTE rh_employee_face_consent_stmt;
DEALLOCATE PREPARE rh_employee_face_consent_stmt;

SET @rh_leave_columns := CONCAT(
  'ALTER TABLE rh_leave_requests ',
  CONCAT_WS(', ',
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_leave_requests' AND COLUMN_NAME = 'leave_type') = 0, 'ADD COLUMN leave_type VARCHAR(50) DEFAULT NULL AFTER employee_id', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_leave_requests' AND COLUMN_NAME = 'days') = 0, 'ADD COLUMN days DECIMAL(8,2) DEFAULT NULL AFTER end_date', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_leave_requests' AND COLUMN_NAME = 'reviewed_by') = 0, 'ADD COLUMN reviewed_by BIGINT UNSIGNED DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_leave_requests' AND COLUMN_NAME = 'reviewed_at') = 0, 'ADD COLUMN reviewed_at DATETIME DEFAULT NULL', NULL)
  )
);
SET @rh_leave_columns := IF(@rh_leave_columns = 'ALTER TABLE rh_leave_requests ', 'SELECT 1', @rh_leave_columns);
PREPARE rh_leave_columns_stmt FROM @rh_leave_columns;
EXECUTE rh_leave_columns_stmt;
DEALLOCATE PREPARE rh_leave_columns_stmt;

UPDATE rh_leave_requests
   SET leave_type = COALESCE(leave_type, type),
       days = COALESCE(days, DATEDIFF(end_date, start_date) + 1)
 WHERE leave_type IS NULL OR days IS NULL;

SET @rh_attendance_columns := CONCAT(
  'ALTER TABLE rh_attendance ',
  CONCAT_WS(', ',
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_attendance' AND COLUMN_NAME = 'check_in_method') = 0, 'ADD COLUMN check_in_method VARCHAR(30) DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_attendance' AND COLUMN_NAME = 'check_out_method') = 0, 'ADD COLUMN check_out_method VARCHAR(30) DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_attendance' AND COLUMN_NAME = 'check_in_photo') = 0, 'ADD COLUMN check_in_photo VARCHAR(500) DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_attendance' AND COLUMN_NAME = 'check_out_photo') = 0, 'ADD COLUMN check_out_photo VARCHAR(500) DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_attendance' AND COLUMN_NAME = 'notes') = 0, 'ADD COLUMN notes TEXT DEFAULT NULL', NULL)
  )
);
SET @rh_attendance_columns := IF(@rh_attendance_columns = 'ALTER TABLE rh_attendance ', 'SELECT 1', @rh_attendance_columns);
PREPARE rh_attendance_columns_stmt FROM @rh_attendance_columns;
EXECUTE rh_attendance_columns_stmt;
DEALLOCATE PREPARE rh_attendance_columns_stmt;

SET @rh_face_columns := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_face_descriptors' AND COLUMN_NAME = 'created_by') = 0,
  'ALTER TABLE rh_face_descriptors ADD COLUMN created_by BIGINT UNSIGNED DEFAULT NULL',
  'SELECT 1'
);
PREPARE rh_face_columns_stmt FROM @rh_face_columns;
EXECUTE rh_face_columns_stmt;
DEALLOCATE PREPARE rh_face_columns_stmt;

SET @rh_payroll_columns := CONCAT(
  'ALTER TABLE rh_payroll ',
  CONCAT_WS(', ',
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'period_month') = 0, 'ADD COLUMN period_month CHAR(7) DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'base_salary') = 0, 'ADD COLUMN base_salary DECIMAL(14,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'bonuses') = 0, 'ADD COLUMN bonuses DECIMAL(14,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'deductions') = 0, 'ADD COLUMN deductions DECIMAL(14,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'absence_deductions') = 0, 'ADD COLUMN absence_deductions DECIMAL(14,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'presence_days') = 0, 'ADD COLUMN presence_days DECIMAL(8,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'advances') = 0, 'ADD COLUMN advances DECIMAL(14,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'allowances') = 0, 'ADD COLUMN allowances DECIMAL(14,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'deduction_amount') = 0, 'ADD COLUMN deduction_amount DECIMAL(14,2) NOT NULL DEFAULT 0', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'deduction_frequency') = 0, 'ADD COLUMN deduction_frequency VARCHAR(30) DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'deduction_reason') = 0, 'ADD COLUMN deduction_reason VARCHAR(255) DEFAULT NULL', NULL),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rh_payroll' AND COLUMN_NAME = 'overtime_amount') = 0, 'ADD COLUMN overtime_amount DECIMAL(14,2) NOT NULL DEFAULT 0', NULL)
  )
);
SET @rh_payroll_columns := IF(@rh_payroll_columns = 'ALTER TABLE rh_payroll ', 'SELECT 1', @rh_payroll_columns);
PREPARE rh_payroll_columns_stmt FROM @rh_payroll_columns;
EXECUTE rh_payroll_columns_stmt;
DEALLOCATE PREPARE rh_payroll_columns_stmt;

UPDATE rh_payroll
   SET period_month = COALESCE(period_month, period),
       base_salary = CASE WHEN base_salary = 0 THEN salary ELSE base_salary END,
       bonuses = CASE WHEN bonuses = 0 THEN prime ELSE bonuses END
 WHERE period_month IS NULL;
