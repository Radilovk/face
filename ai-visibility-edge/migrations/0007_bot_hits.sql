CREATE TABLE bot_hits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  bot_id TEXT NOT NULL,
  path TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  verify_flag TEXT NOT NULL DEFAULT 'u',
  hit_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bot_hits_tenant_time ON bot_hits(tenant_id, hit_at DESC);
CREATE INDEX idx_bot_hits_verified ON bot_hits(tenant_id, verified, hit_at DESC);
