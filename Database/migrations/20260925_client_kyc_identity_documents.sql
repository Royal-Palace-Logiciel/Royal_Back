-- Photos / scans de la piece d'identite (CIN, passeport...) attaches a la fiche KYC client.
-- Stocke un tableau JSON d'URLs relatives (/uploads/...).
SET @kyc_docs_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_kyc' AND COLUMN_NAME = 'documents_identite_urls');
SET @kyc_docs_sql = IF(@kyc_docs_exists = 0, 'ALTER TABLE client_kyc ADD COLUMN documents_identite_urls TEXT NULL AFTER doc_autre', 'SELECT 1');
PREPARE kyc_docs_statement FROM @kyc_docs_sql;
EXECUTE kyc_docs_statement;
DEALLOCATE PREPARE kyc_docs_statement;
