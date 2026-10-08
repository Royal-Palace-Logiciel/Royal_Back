ALTER TABLE paf_sessions
  ADD COLUMN active_marker TINYINT GENERATED ALWAYS AS (IF(statut = 'OUVERTE', 1, NULL)) STORED;

ALTER TABLE paf_sessions
  ADD UNIQUE KEY uq_paf_sessions_active_marker (active_marker);
