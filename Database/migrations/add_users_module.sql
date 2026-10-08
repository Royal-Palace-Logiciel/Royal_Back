-- Stocke les modules accessibles par utilisateur sous forme de tableau JSON.
-- Exemple : ["hebergement", "restaurant"]
ALTER TABLE `users`
  ADD COLUMN `module` TEXT NULL AFTER `role`;
