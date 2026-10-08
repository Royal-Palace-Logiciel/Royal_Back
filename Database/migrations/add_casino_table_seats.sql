-- Places numerotees et regles de changement de place.
-- Les valeurs par defaut preservent le comportement des tables existantes.

ALTER TABLE casino_tables_jeu
    ADD COLUMN IF NOT EXISTS type_partie ENUM('JEU_SIMPLE','TOURNOI') NOT NULL DEFAULT 'JEU_SIMPLE' AFTER type_jeu,
    ADD COLUMN IF NOT EXISTS nombre_places INT UNSIGNED NOT NULL DEFAULT 8 AFTER type_partie,
    ADD COLUMN IF NOT EXISTS duree_jeu_simple_minutes INT UNSIGNED NOT NULL DEFAULT 120 AFTER nombre_places;

CREATE TABLE IF NOT EXISTS casino_table_visits (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_jeu_id BIGINT UNSIGNED NOT NULL,
    client_id BIGINT UNSIGNED DEFAULT NULL,
    client_libre VARCHAR(150) DEFAULT NULL,
    entree_at DATETIME NOT NULL,
    sortie_at DATETIME DEFAULT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    numero_place INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    KEY idx_table_visits_active (table_jeu_id, numero_place, sortie_at),
    CONSTRAINT fk_table_visits_table FOREIGN KEY (table_jeu_id) REFERENCES casino_tables_jeu (id),
    CONSTRAINT fk_table_visits_client FOREIGN KEY (client_id) REFERENCES clients (id),
    CONSTRAINT fk_table_visits_user FOREIGN KEY (created_by) REFERENCES users (id_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
