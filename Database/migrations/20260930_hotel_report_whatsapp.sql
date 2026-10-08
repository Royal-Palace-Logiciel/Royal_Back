-- Envoi du rapport de nuitee sur WhatsApp (API officielle Meta, 1 a 1).
--
-- Deux tables :
--   * les destinataires, geres depuis l onglet Rapport de l hotel ;
--   * le journal des envois, qui porte la logique "seulement si ca a change,
--     et au plus une fois toutes les 10 minutes" : chaque envoi enregistre
--     l empreinte du texte expedie, comparee a l empreinte courante au tour
--     suivant. Sans ce journal, un redemarrage du serveur renverrait un rapport
--     deja parti.

CREATE TABLE IF NOT EXISTS hotel_report_whatsapp_recipients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(32) NOT NULL COMMENT 'Format international sans +, ex. 261340000000',
  nom VARCHAR(190) NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hotel_report_whatsapp_numero (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_report_whatsapp_sends (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL,
  content_hash CHAR(64) NOT NULL COMMENT 'SHA-256 du texte expedie : sert a ne pas renvoyer un rapport inchange',
  statut VARCHAR(20) NOT NULL DEFAULT 'ENVOYE' COMMENT 'ENVOYE, PARTIEL ou ECHEC',
  destinataires TEXT NULL COMMENT 'JSON : un resultat par numero',
  erreur TEXT NULL,
  declencheur VARCHAR(20) NOT NULL DEFAULT 'AUTO' COMMENT 'AUTO ou MANUEL',
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hotel_report_whatsapp_sends_date (report_date, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
