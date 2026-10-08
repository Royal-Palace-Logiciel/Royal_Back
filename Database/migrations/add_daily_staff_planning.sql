CREATE TABLE IF NOT EXISTS daily_staff_planning (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  planning_date DATE NOT NULL,
  category VARCHAR(80) NOT NULL,
  assignments JSON NOT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  updated_by BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_daily_staff_planning_date_category (planning_date, category),
  KEY idx_daily_staff_planning_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
