-- Retenue avec motif et fréquence, pourboire. À appliquer après 20260923_rh_evolutions.sql.
-- node Database/runMigration.js Database/migrations/20260924_rh_retenue_pourboire.sql
-- Attention : runMigration découpe le fichier sur les points-virgules, n'en mettez pas dans les commentaires.

-- Pourboire mensuel par défaut sur la fiche, repris dans la paie à la génération.
ALTER TABLE rh_employees
  ADD COLUMN pourboire DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER prime;

-- Retenue saisie : montant du mois (MENSUEL) ou montant par semaine (HEBDOMADAIRE,
-- multiplié par le nombre de semaines du mois). deductions reste le total déduit
-- (retenue saisie + absences calculées).
ALTER TABLE rh_payroll
  ADD COLUMN pourboire DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER bonuses,
  ADD COLUMN deduction_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER deductions,
  ADD COLUMN deduction_frequency ENUM('MENSUEL', 'HEBDOMADAIRE') NOT NULL DEFAULT 'MENSUEL' AFTER deduction_amount,
  ADD COLUMN deduction_reason VARCHAR(255) NULL AFTER deduction_frequency;

-- Lignes existantes : la retenue saisie est la part non liée aux absences.
UPDATE rh_payroll SET deduction_amount = GREATEST(0, deductions - absence_deductions);
