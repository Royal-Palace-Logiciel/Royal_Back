ALTER TABLE paf_clotures
  ADD COLUMN total_initial DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER date_cloture,
  ADD COLUMN total_final DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER total_initial;

UPDATE paf_clotures
SET total_final = total_montant
WHERE total_final = 0 AND total_montant <> 0;
