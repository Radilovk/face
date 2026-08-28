ALTER TABLE tenants ADD COLUMN edge_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN edge_status TEXT NOT NULL DEFAULT 'measurement_only';
