SET NAMES utf8mb4;

ALTER TABLE reservations
  ADD COLUMN origine_reservation ENUM('TELEPHONE', 'DESK', 'MAIL') NOT NULL DEFAULT 'DESK',
  ADD COLUMN facture_statut ENUM('PROFORMA', 'FINALE', 'CREDIT') NOT NULL DEFAULT 'PROFORMA';

CREATE TABLE hotel_invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NOT NULL,
  invoice_type ENUM('PROFORMA', 'FINALE') NOT NULL,
  numero VARCHAR(50) NOT NULL,
  montant_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_paye DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  statut ENUM('BROUILLON', 'EMISE', 'PAYEE', 'CREDIT') NOT NULL DEFAULT 'BROUILLON',
  editable TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  issued_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_invoice_number (numero),
  KEY idx_hotel_invoice_reservation (reservation_id),
  CONSTRAINT fk_hotel_invoice_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hotel_invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantite DECIMAL(15,2) NOT NULL DEFAULT 1,
  prix_unitaire DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant DECIMAL(15,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_hotel_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_hotel_invoice_item_invoice
    FOREIGN KEY (invoice_id) REFERENCES hotel_invoices (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
