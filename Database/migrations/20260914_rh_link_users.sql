-- Relie chaque fiche RH à un compte utilisateur (gestion d'accès).
-- Colonne nullable : les fiches RH existantes (ou celles sans compte, ex. personnel
-- sans accès informatique) continuent de fonctionner sans aucune modification.
ALTER TABLE rh_employees
  ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id,
  ADD UNIQUE KEY uq_rh_employees_user (user_id),
  ADD CONSTRAINT fk_rh_employees_user FOREIGN KEY (user_id) REFERENCES users(id_admin) ON DELETE SET NULL;
