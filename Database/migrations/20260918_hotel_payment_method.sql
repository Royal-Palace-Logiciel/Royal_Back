SET @reservation_payment_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reservations'
    AND COLUMN_NAME = 'moyen_paiement'
);
SET @reservation_payment_sql = IF(@reservation_payment_exists = 0,
  'ALTER TABLE reservations ADD COLUMN moyen_paiement VARCHAR(30) NOT NULL DEFAULT ''ESPECES'' AFTER pdj_inclus',
  'SELECT 1'
);
PREPARE reservation_payment_statement FROM @reservation_payment_sql;
EXECUTE reservation_payment_statement;
DEALLOCATE PREPARE reservation_payment_statement;

SET @transaction_payment_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'financial_transactions'
    AND COLUMN_NAME = 'moyen_paiement'
);
SET @transaction_payment_sql = IF(@transaction_payment_exists = 0,
  'ALTER TABLE financial_transactions ADD COLUMN moyen_paiement VARCHAR(30) NOT NULL DEFAULT ''ESPECES'' AFTER montant',
  'SELECT 1'
);
PREPARE transaction_payment_statement FROM @transaction_payment_sql;
EXECUTE transaction_payment_statement;
DEALLOCATE PREPARE transaction_payment_statement;