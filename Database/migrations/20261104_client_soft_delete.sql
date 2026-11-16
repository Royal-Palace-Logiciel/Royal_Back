SET NAMES utf8mb4;

ALTER TABLE clients
  ADD COLUMN deleted_at DATETIME DEFAULT NULL,
  ADD COLUMN deleted_by BIGINT UNSIGNED DEFAULT NULL;

CREATE INDEX idx_clients_deleted_at ON clients (deleted_at);
