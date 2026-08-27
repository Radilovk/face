CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  apex_host TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'staging',
  data_consent INTEGER NOT NULL DEFAULT 0,
  is_canary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tenant_hosts (
  hostname TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  is_canonical INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE verticals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_control INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE watched_domains (
  domain TEXT PRIMARY KEY,
  vertical_id TEXT NOT NULL REFERENCES verticals(id),
  role TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id),
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  vertical_id TEXT NOT NULL REFERENCES verticals(id),
  tenant_id TEXT REFERENCES tenants(id),
  text TEXT NOT NULL,
  qtype TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  intent TEXT,
  volume INTEGER,
  sourced_at TEXT
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  model TEXT NOT NULL,
  run_at TEXT NOT NULL,
  repetition INTEGER NOT NULL,
  raw_response TEXT NOT NULL,
  answer_text TEXT,
  subquestions_detected TEXT
);

CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  domain TEXT NOT NULL,
  url TEXT,
  canonical_url TEXT,
  class TEXT NOT NULL,
  numeric_match INTEGER,
  semantic_score REAL,
  content_version TEXT,
  cache_age_hours REAL,
  verified_at TEXT,
  bot_verified INTEGER,
  cited_passage TEXT,
  passage_offset INTEGER,
  heading_context TEXT
);

CREATE TABLE diagnostics (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  probed_at TEXT NOT NULL,
  http_status INTEGER,
  html_text_chars INTEGER,
  jsonld_blocks INTEGER,
  robots_ai_policy TEXT,
  blocked_bots TEXT,
  has_canonical INTEGER,
  price_tokens INTEGER,
  score REAL,
  raw_json TEXT
);

CREATE TABLE content_versions (
  hash TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE misattributions (
  id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL REFERENCES observations(id),
  domain TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  model TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  severity TEXT
);

CREATE TABLE sov_scores (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  vertical_id TEXT NOT NULL REFERENCES verticals(id),
  model TEXT NOT NULL,
  period TEXT NOT NULL,
  frequency REAL NOT NULL,
  position REAL NOT NULL,
  integrity REAL NOT NULL,
  sov REAL NOT NULL,
  observations_count INTEGER NOT NULL,
  formula_version TEXT NOT NULL
);

CREATE TABLE platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_obs_domain ON observations(domain);
CREATE INDEX idx_diag_score ON diagnostics(score DESC);
CREATE INDEX idx_sov ON sov_scores(vertical_id, period, sov DESC);
CREATE INDEX idx_watched ON watched_domains(vertical_id, role);
