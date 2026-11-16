SET NAMES utf8mb4;

ALTER TABLE reservations
  ADD COLUMN moyen_paiement VARCHAR(30) DEFAULT NULL;

ALTER TABLE financial_transactions
  ADD COLUMN moyen_paiement VARCHAR(30) DEFAULT NULL AFTER montant;

CREATE TABLE reservation_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NOT NULL,
  montant DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_encaisse DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_gratuit DECIMAL(15,2) NOT NULL DEFAULT 0,
  moyen_paiement VARCHAR(30) DEFAULT NULL,
  statut VARCHAR(30) NOT NULL DEFAULT 'ENREGISTRE',
  details LONGTEXT DEFAULT NULL,
  ref_flux_global VARCHAR(100) DEFAULT NULL,
  idempotency_key VARCHAR(100) DEFAULT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reservation_payment_idempotency (reservation_id, idempotency_key),
  KEY idx_reservation_payments_reservation (reservation_id),
  CONSTRAINT fk_reservation_payment_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
