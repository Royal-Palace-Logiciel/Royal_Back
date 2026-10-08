    -- Migration: Add etage column to rooms table
    -- Date: 2026-08-11
    -- Description: Add floor/etage field to rooms table to support multi-floor hotel management

    ALTER TABLE `rooms` 
    ADD COLUMN `etage` INT(11) DEFAULT 0 AFTER `statut`;

    -- Update existing rooms to have default floor values
    UPDATE `rooms` SET `etage` = 1 WHERE `id` = 1;