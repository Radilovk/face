-- Seed: 4 tenant домейна + вертикали (baseline 2026-08-27)

INSERT INTO verticals (id, name) VALUES
  ('weight-loss-supplements-bg', 'Добавки за отслабване BG'),
  ('sports-nutrition-supplements-bg', 'Спортни добавки BG'),
  ('longevity-protocols-bg', 'Протоколи дълголетие BG'),
  ('peptides-research-bg', 'Research пептиди BG');

INSERT INTO tenants (id, name, apex_host, plan, status, is_canary) VALUES
  ('tenant-daotslabna', 'Да отслабна', 'daotslabna.com', 'trial', 'staging', 0),
  ('tenant-biocode', 'BIOCODE Nutrition', 'biocode-bg.com', 'trial', 'staging', 1),
  ('tenant-life-protocols', 'Life Protocols', 'life-protocols.com', 'trial', 'staging', 0),
  ('tenant-biocode-peptides', 'BIOCODE Peptides', 'biocode-peptides.com', 'trial', 'staging', 0);

INSERT INTO tenant_hosts (hostname, tenant_id, is_canonical) VALUES
  ('daotslabna.com', 'tenant-daotslabna', 1),
  ('www.daotslabna.com', 'tenant-daotslabna', 0),
  ('biocode-bg.com', 'tenant-biocode', 1),
  ('www.biocode-bg.com', 'tenant-biocode', 0),
  ('life-protocols.com', 'tenant-life-protocols', 1),
  ('www.life-protocols.com', 'tenant-life-protocols', 0),
  ('biocode-peptides.com', 'tenant-biocode-peptides', 1),
  ('www.biocode-peptides.com', 'tenant-biocode-peptides', 0);

INSERT INTO watched_domains (domain, vertical_id, role, tenant_id) VALUES
  ('daotslabna.com', 'weight-loss-supplements-bg', 'tenant', 'tenant-daotslabna'),
  ('biocode-bg.com', 'sports-nutrition-supplements-bg', 'tenant', 'tenant-biocode'),
  ('life-protocols.com', 'longevity-protocols-bg', 'tenant', 'tenant-life-protocols'),
  ('biocode-peptides.com', 'peptides-research-bg', 'tenant', 'tenant-biocode-peptides'),
  ('zdrave.net', 'weight-loss-supplements-bg', 'competitor', NULL),
  ('myprotein.bg', 'sports-nutrition-supplements-bg', 'competitor', NULL),
  ('hollandandbarrett.bg', 'longevity-protocols-bg', 'competitor', NULL),
  ('wikipedia.org', 'weight-loss-supplements-bg', 'control', NULL),
  ('examine.com', 'sports-nutrition-supplements-bg', 'control', NULL),
  ('pubmed.ncbi.nlm.nih.gov', 'longevity-protocols-bg', 'control', NULL),
  ('ncbi.nlm.nih.gov', 'peptides-research-bg', 'control', NULL);
