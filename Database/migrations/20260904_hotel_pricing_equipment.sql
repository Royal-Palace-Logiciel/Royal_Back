ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS montant_brut BIGINT NULL,
  ADD COLUMN IF NOT EXISTS remise_pourcentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_remise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_validee_par BIGINT NULL,
  ADD COLUMN IF NOT EXISTS remise_validee_at DATETIME NULL;

ALTER TABLE room_types
  ADD COLUMN IF NOT EXISTS prix_base BIGINT NOT NULL DEFAULT 0;

ALTER TABLE room_equipments
  ADD COLUMN IF NOT EXISTS zone ENUM('CHAMBRE','SALLE_DE_BAIN') NOT NULL DEFAULT 'CHAMBRE';

ALTER TABLE equipments
  ADD COLUMN IF NOT EXISTS zone ENUM('CHAMBRE','SALLE_DE_BAIN') NOT NULL DEFAULT 'CHAMBRE';

UPDATE rooms SET room_type_id = NULL;
DELETE FROM room_types;
INSERT INTO room_types (nom, description, prix_base) VALUES
  ('Double Standard', 'Chambre double standard', 185000),
  ('Double Deluxe', 'Chambre double deluxe', 250000),
  ('Triple', 'Chambre triple', 300000),
  ('Familiale', 'Chambre familiale', 350000),
  ('Suite Deluxe', 'Suite deluxe', 450000),
  ('Communicante', 'Chambres communicantes', 400000);

UPDATE rooms
SET room_type_id = (SELECT id FROM room_types WHERE nom = 'Double Standard' LIMIT 1)
WHERE room_type_id IS NULL;

ALTER TABLE housekeeping_tasks
  MODIFY COLUMN type_tache ENUM('CHAMBRE','ESCALIER_RAMPE','DECORATIONS','MUR','PLAFOND','SOL_MOQUETTE','MEUBLES','COULOIR','TERASSE','TOILETTES') NOT NULL;
UPDATE housekeeping_tasks SET type_tache = 'CHAMBRE' WHERE type_tache IN ('NETTOYAGE','DESINFECTION','CHANGEMENT_DRAPS','CONTROLE');
