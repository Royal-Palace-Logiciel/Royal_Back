-- Ajoute le rôle opérationnel Croupier, limité au module Casino par l'application.
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'manager', 'receptioniste', 'caisse', 'water', 'housekeeping', 'croupier') NOT NULL DEFAULT 'admin';
