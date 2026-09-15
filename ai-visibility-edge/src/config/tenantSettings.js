/** Per-tenant overrides with Worker env fallback. */
export async function loadTenantRow(db, domain) {
  const normalized = String(domain ?? '')
    .replace(/^www\./, '')
    .toLowerCase()
    .split('/')[0];
  if (!normalized) return null;
  return db
    .prepare(
      `SELECT id, name, apex_host, plan, status, data_consent, locale, market_country,
              auto_optimizer, auto_edge_activate, economy_mode, cron_enabled,
              edge_enabled, edge_status, cf_hostname_id
       FROM tenants WHERE apex_host = ?`,
    )
    .bind(normalized)
    .first();
}

function envFlag(env, key, defaultOn = true) {
  const v = env?.[key];
  if (v === '0' || v === 'false') return false;
  if (v === '1' || v === 'true') return true;
  return defaultOn;
}

function tenantFlag(row, column, envFallback) {
  if (row?.[column] === 0) return false;
  if (row?.[column] === 1) return true;
  return envFallback;
}

export function resolveTenantSettings(tenantRow, env) {
  return {
    locale: tenantRow?.locale ?? 'bg',
    market_country: tenantRow?.market_country ?? 'BG',
    auto_optimizer: tenantFlag(tenantRow, 'auto_optimizer', envFlag(env, 'AUTO_OPTIMIZER', true)),
    auto_edge_activate: tenantFlag(tenantRow, 'auto_edge_activate', envFlag(env, 'AUTO_EDGE_ACTIVATE', true)),
    economy_mode: tenantFlag(tenantRow, 'economy_mode', envFlag(env, 'ECONOMY_MODE', true)),
    cron_enabled: tenantRow?.cron_enabled !== 0,
    data_consent: Boolean(tenantRow?.data_consent),
    plan: tenantRow?.plan ?? 'trial',
    status: tenantRow?.status ?? 'staging',
  };
}

export async function resolveTenantSettingsByDomain(db, domain, env) {
  const row = await loadTenantRow(db, domain);
  if (!row) return { error: 'unknown_domain', domain };
  return { tenant: row, settings: resolveTenantSettings(row, env) };
}

/** Active tenants eligible for cron measure (consent + not suspended). */
export function tenantEligibleForCron(tenantRow) {
  if (!tenantRow) return false;
  if (tenantRow.status === 'suspended' || tenantRow.status === 'archived') return false;
  if (!tenantRow.data_consent) return false;
  if (tenantRow.cron_enabled === 0) return false;
  return true;
}
