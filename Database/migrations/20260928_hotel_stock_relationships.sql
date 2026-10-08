ALTER TABLE housekeeping_tasks ADD COLUMN products_used JSON NULL;

ALTER TABLE room_maintenance ADD COLUMN materials_used JSON NULL;
