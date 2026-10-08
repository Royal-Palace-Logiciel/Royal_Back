-- Migration: Add Hébergement and Hotel locations to stock_locations
-- Date: 2025-01-13
-- Description: Adds Hébergement and Hotel as stock locations to enable proper stock tracking

-- First ensure AUTO_INCREMENT starts at 1 to avoid conflicts
ALTER TABLE `stock_locations` AUTO_INCREMENT = 1;

-- Insert the Hébergement location (for accommodation stock)
INSERT INTO `stock_locations` (`id`, `nom`) VALUES
(1, 'Hébergement');

-- Insert the Hotel location (for minibar management)
INSERT INTO `stock_locations` (`id`, `nom`) VALUES
(5, 'Hotel');

-- Add constraint if not exists (may need to be adjusted based on existing constraints)
-- This ensures that stock movements can reference these locations