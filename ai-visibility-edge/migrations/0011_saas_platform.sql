-- SaaS platform: tag pilot seed tenants, default vertical for greenfield clients
ALTER TABLE tenants ADD COLUMN is_pilot INTEGER NOT NULL DEFAULT 0;

UPDATE tenants SET is_pilot = 1
WHERE id IN (
  'tenant-daotslabna',
  'tenant-biocode',
  'tenant-life-protocols',
  'tenant-biocode-peptides'
);

INSERT OR IGNORE INTO verticals (id, name) VALUES ('general', 'General');

INSERT OR IGNORE INTO platform_config (key, value, verified_at, expires_at)
VALUES (
  'saas_defaults',
  '{"default_vertical_id":"general","default_locale":"en","default_market":"US","data_consent_on_register":true}',
  datetime('now'),
  datetime('now', '+365 days')
);
