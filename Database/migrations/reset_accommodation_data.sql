-- Migration: Reset Accommodation Data and Cash Register
-- Date: 2026-08-21
-- Description: Deletes all accommodation-related data and resets cash register to 0

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete accommodation-related financial transactions
DELETE FROM financial_transactions WHERE UPPER(module) = 'HEBERGEMENT';

-- Delete stays (linked to reservations)
DELETE FROM stays WHERE reservation_id IS NOT NULL;

-- Delete reservation guests
DELETE FROM reservation_guests WHERE reservation_id IS NOT NULL;

-- Delete reservations
DELETE FROM reservations;

-- Delete accommodation stock
DELETE FROM hebergement_stock WHERE product_id IS NOT NULL;
DELETE FROM hebergement_products;

-- Delete room status history
DELETE FROM room_status_history;

-- Delete room maintenance records
DELETE FROM room_maintenance;

-- Delete housekeeping tasks
DELETE FROM housekeeping_tasks;

-- Delete room minibar items
DELETE FROM room_minibar;

-- Delete minibar consumptions
DELETE FROM minibar_consumptions;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Reset auto-increment values for accommodation tables
ALTER TABLE reservations AUTO_INCREMENT = 1;
ALTER TABLE reservation_guests AUTO_INCREMENT = 1;
ALTER TABLE stays AUTO_INCREMENT = 1;
ALTER TABLE hebergement_products AUTO_INCREMENT = 1;
ALTER TABLE hebergement_stock AUTO_INCREMENT = 1;
ALTER TABLE room_status_history AUTO_INCREMENT = 1;
ALTER TABLE room_maintenance AUTO_INCREMENT = 1;
ALTER TABLE housekeeping_tasks AUTO_INCREMENT = 1;
ALTER TABLE room_minibar AUTO_INCREMENT = 1;
ALTER TABLE minibar_consumptions AUTO_INCREMENT = 1;
ALTER TABLE financial_transactions AUTO_INCREMENT = 1;

-- Note: This script does NOT delete:
-- - Rooms and room types (these are hotel infrastructure)
-- - Clients (these may be used in other modules)
-- - Users and staff
-- - Other modules' data (restaurant, bar, casino, etc.)
-- Only accommodation-specific operational data is removed