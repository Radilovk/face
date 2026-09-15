-- Production multi-tenant: locale, automation flags, indexes
ALTER TABLE tenants ADD COLUMN locale TEXT NOT NULL DEFAULT 'bg';
ALTER TABLE tenants ADD COLUMN market_country TEXT NOT NULL DEFAULT 'BG';
ALTER TABLE tenants ADD COLUMN auto_optimizer INTEGER;
ALTER TABLE tenants ADD COLUMN auto_edge_activate INTEGER;
ALTER TABLE tenants ADD COLUMN economy_mode INTEGER;
ALTER TABLE tenants ADD COLUMN cron_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tenants ADD COLUMN cf_hostname_id TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_tenant ON questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_runs_question ON runs(question_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_domain ON diagnostics(domain, probed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
