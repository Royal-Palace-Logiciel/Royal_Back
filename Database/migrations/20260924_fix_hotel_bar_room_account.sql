-- Migration: hotel room account and bar charge linkage
-- Idempotent fix for reservation names and room-account charges.

SET @bar_hotel_reservation_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bar_orders'
    AND COLUMN_NAME = 'hotel_reservation_id'
);
SET @bar_hotel_reservation_sql = IF(
  @bar_hotel_reservation_exists = 0,
  'ALTER TABLE bar_orders ADD COLUMN hotel_reservation_id BIGINT UNSIGNED NULL AFTER observation',
  'SELECT 1'
);
PREPARE bar_hotel_reservation_statement FROM @bar_hotel_reservation_sql;
EXECUTE bar_hotel_reservation_statement;
DEALLOCATE PREPARE bar_hotel_reservation_statement;

SET @bar_room_id_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bar_orders'
    AND COLUMN_NAME = 'room_id'
);
SET @bar_room_id_sql = IF(
  @bar_room_id_exists = 0,
  'ALTER TABLE bar_orders ADD COLUMN room_id BIGINT UNSIGNED NULL AFTER hotel_reservation_id',
  'SELECT 1'
);
PREPARE bar_room_id_statement FROM @bar_room_id_sql;
EXECUTE bar_room_id_statement;
DEALLOCATE PREPARE bar_room_id_statement;

SET @bar_room_guest_name_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bar_orders'
    AND COLUMN_NAME = 'room_guest_name'
);
SET @bar_room_guest_name_sql = IF(
  @bar_room_guest_name_exists = 0,
  'ALTER TABLE bar_orders ADD COLUMN room_guest_name VARCHAR(255) NULL AFTER room_id',
  'SELECT 1'
);
PREPARE bar_room_guest_name_statement FROM @bar_room_guest_name_sql;
EXECUTE bar_room_guest_name_statement;
DEALLOCATE PREPARE bar_room_guest_name_statement;

SET @bar_room_account_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bar_orders'
    AND COLUMN_NAME = 'room_account_paid'
);
SET @bar_room_account_sql = IF(
  @bar_room_account_exists = 0,
  'ALTER TABLE bar_orders ADD COLUMN room_account_paid BOOLEAN NOT NULL DEFAULT FALSE AFTER room_guest_name',
  'SELECT 1'
);
PREPARE bar_room_account_statement FROM @bar_room_account_sql;
EXECUTE bar_room_account_statement;
DEALLOCATE PREPARE bar_room_account_statement;

SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bar_orders'
    AND INDEX_NAME = 'idx_bar_orders_hotel_room'
);
SET @idx_sql = IF(
  @idx_exists = 0,
  'ALTER TABLE bar_orders ADD INDEX idx_bar_orders_hotel_room (hotel_reservation_id, room_id, room_account_paid)',
  'SELECT 1'
);
PREPARE idx_statement FROM @idx_sql;
EXECUTE idx_statement;
DEALLOCATE PREPARE idx_statement;

-- Backfill room account data when a bar order has a chamber label and a reservation is linked.
UPDATE bar_orders bo
LEFT JOIN reservations r ON r.id = bo.hotel_reservation_id
SET bo.room_guest_name = COALESCE(bo.room_guest_name, bo.client_name),
    bo.room_id = COALESCE(bo.room_id, r.room_id),
    bo.room_account_paid = CASE WHEN bo.observation = 'CHAMBRE' THEN 0 ELSE bo.room_account_paid END
WHERE bo.observation = 'CHAMBRE' OR bo.hotel_reservation_id IS NOT NULL;

CREATE OR REPLACE VIEW vw_room_account_summary AS
SELECT
  r.id AS reservation_id,
  r.client_id,
  r.room_id,
  room.numero AS room_number,
  CONCAT(COALESCE(c.prenom, ''), ' ', COALESCE(c.nom, '')) AS hotel_client,
  r.statut AS reservation_status,
  COALESCE(r.montant_total, 0) AS reservation_amount,
  COALESCE(SUM(bo.montant_total), 0) AS bar_amount,
  COALESCE(r.montant_total, 0) + COALESCE(SUM(bo.montant_total), 0) AS total_to_pay,
  MAX(bo.created_at) AS last_bar_purchase_at
FROM reservations r
LEFT JOIN clients c ON c.id = r.client_id
LEFT JOIN rooms room ON room.id = r.room_id
LEFT JOIN bar_orders bo
  ON bo.hotel_reservation_id = r.id
  AND bo.room_account_paid = 0
WHERE r.statut IN ('CONFIRMEE', 'CHECKED_IN', 'EN_COURS', 'TERMINEE')
GROUP BY r.id, r.client_id, r.room_id, room.numero, c.prenom, c.nom, r.statut, r.montant_total;
