SET NAMES utf8mb4;

ALTER TABLE reservations
  ADD COLUMN montant_paye DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN montant_encaisse DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN montant_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN montant_gratuit DECIMAL(15,2) NOT NULL DEFAULT 0;

CREATE INDEX idx_reservations_dates ON reservations (room_id, date_arrivee, date_depart);
