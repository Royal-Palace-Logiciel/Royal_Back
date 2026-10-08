-- Migration: support du compte chambre + historique bar hôtel
-- Ce script est idempotent et peut être relancé sans erreur.

-- 1) Garantir la compatibilité du statut de réservation côté hôtel
SET @column_type = (
  SELECT COLUMN_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reservations'
    AND COLUMN_NAME = 'statut'
  LIMIT 1
);

SET @has_checked_in = IF(@column_type LIKE '%CHECKED_IN%', 1, 0);
SET @update_status_sql = IF(
  @has_checked_in = 0,
  'ALTER TABLE reservations MODIFY COLUMN statut ENUM("EN_ATTENTE", "CONFIRMEE", "CHECKED_IN", "EN_COURS", "ANNULEE", "TERMINEE", "NO_SHOW") NOT NULL DEFAULT "CONFIRMEE"',
  'SELECT 1'
);
PREPARE update_status_statement FROM @update_status_sql;
EXECUTE update_status_statement;
DEALLOCATE PREPARE update_status_statement;

-- 2) Lier les commandes bar à une réservation hôtel / chambre
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

-- 3) Index de recherche pour l’historique chambre
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

-- 4) Helper view pour le reporting chambre : réservation hôtel + achats bar + total à payer
CREATE OR REPLACE VIEW vw_room_account_summary AS
SELECT
  r.id AS reservation_id,
  r.client_id,
  r.room_id,
  room.numero AS room_number,
  CONCAT(COALESCE(c.prenom, ''), ' ', COALESCE(c.nom, '') ) AS hotel_client,
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

-- 5) Conserver les coûts bar liés à la chambre pour des rapports de comptabilité hôtel
-- Cela permet de calculer les achats bar comme élément à la charge du compte chambre.
-- Le code applicatif peut ensuite associer les commandes bar à une réservation via hotel_reservation_id.
