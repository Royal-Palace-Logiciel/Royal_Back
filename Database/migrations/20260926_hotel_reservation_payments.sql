-- Historique des encaissements d'une reservation Hotel.
-- Une reservation deja payee peut recevoir des rectifications (blanchisserie, transfert,
-- excursion...) : seule la difference (montant_total - montant_paye) est encaissee
-- ensuite, et chaque encaissement garde sa propre ligne ici et dans financial_transactions.
-- A executer APRES 20260925_hotel_reservation_transfers_excursions.sql.

CREATE TABLE IF NOT EXISTS reservation_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reservation_id BIGINT UNSIGNED NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  moyen_paiement VARCHAR(30) NULL,
  details TEXT NULL COMMENT 'Instantane JSON de ce qui etait facture au moment du paiement',
  ref_flux_global VARCHAR(64) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reservation_payments_reservation (reservation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @paid_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'montant_paye');
SET @paid_sql = IF(@paid_exists = 0, 'ALTER TABLE reservations ADD COLUMN montant_paye DECIMAL(12,2) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE paid_statement FROM @paid_sql;
EXECUTE paid_statement;
DEALLOCATE PREPARE paid_statement;

-- Reprise de l'existant : les reservations deja encaissees (une ligne financial_transactions
-- par reservation) deviennent un premier paiement dans l'historique.
INSERT INTO reservation_payments (reservation_id, montant, moyen_paiement, details, ref_flux_global, created_at)
SELECT r.id, ft.montant, COALESCE(ft.moyen_paiement, r.moyen_paiement),
       JSON_OBJECT(
         'montant_total', r.montant_total,
         'laundry_price', IF(r.laundry_included, r.laundry_price, 0),
         'services_extras', COALESCE(r.services_extras, '[]')
       ),
       ft.ref_flux_global, ft.created_at
  FROM reservations r
  JOIN financial_transactions ft
    ON ft.ref_flux_global IN (CONCAT('HOTEL-RESERVATION-', r.id), CONCAT('HEBERGEMENT-RESERVATION-', r.id))
 WHERE NOT EXISTS (SELECT 1 FROM reservation_payments p WHERE p.reservation_id = r.id);

UPDATE reservations r
   SET r.montant_paye = (SELECT COALESCE(SUM(p.montant), 0) FROM reservation_payments p WHERE p.reservation_id = r.id)
 WHERE r.montant_paye = 0;
