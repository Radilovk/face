/** Register and list optimization sites (tenants) in D1. */

export function normalizeApexHost(input) {
  let host = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  return host;
}

export function slugId(prefix, value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${prefix}-${slug || 'site'}`;
}

export async function listVerticals(db) {
  const { results } = await db.prepare(`SELECT id, name FROM verticals ORDER BY name`).all();
  return results ?? [];
}

/**
 * Register a new site for AI visibility optimization.
 */
export async function registerSite(db, body) {
  const apex = normalizeApexHost(body.domain);
  if (!apex || !apex.includes('.')) {
    return { error: 'invalid_domain', hint: 'example.com' };
  }

  const name = String(body.name ?? apex).trim();
  if (!name) return { error: 'name_required' };

  const existing = await db.prepare(`SELECT id FROM tenants WHERE apex_host = ?`).bind(apex).first();
  if (existing) {
    return { error: 'domain_exists', domain: apex, tenant_id: existing.id };
  }

  let verticalId = body.vertical_id?.trim();
  let verticalName = body.vertical_name?.trim();

  if (!verticalId && verticalName) {
    verticalId = slugId('vertical', verticalName);
  }
  if (!verticalId) {
    return { error: 'vertical_required', hint: 'vertical_id or vertical_name' };
  }

  if (!verticalName) {
    const v = await db.prepare(`SELECT name FROM verticals WHERE id = ?`).bind(verticalId).first();
    verticalName = v?.name ?? verticalId;
  }

  await db.prepare(`INSERT OR IGNORE INTO verticals (id, name) VALUES (?, ?)`).bind(verticalId, verticalName).run();

  const tenantId = body.tenant_id?.trim() || slugId('tenant', apex.replace(/\./g, '-'));

  const locale = String(body.locale ?? 'bg').trim().slice(0, 8) || 'bg';
  const marketCountry = String(body.market_country ?? body.market ?? 'BG').trim().slice(0, 8) || 'BG';
  const dataConsent = body.data_consent === true || body.data_consent === 1 || body.data_consent === '1' ? 1 : 0;
  const activateNow = body.activate === true || body.status === 'active';

  await db
    .prepare(
      `INSERT INTO tenants (id, name, apex_host, plan, status, is_canary, data_consent, locale, market_country)
       VALUES (?, ?, ?, 'trial', ?, 0, ?, ?, ?)`,
    )
    .bind(tenantId, name, apex, activateNow ? 'active' : 'staging', dataConsent, locale, marketCountry)
    .run();

  await db
    .prepare(`INSERT OR IGNORE INTO tenant_hosts (hostname, tenant_id, is_canonical) VALUES (?, ?, 1)`)
    .bind(apex, tenantId)
    .run();

  await db
    .prepare(`INSERT OR IGNORE INTO tenant_hosts (hostname, tenant_id, is_canonical) VALUES (?, ?, 0)`)
    .bind(`www.${apex}`, tenantId)
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO watched_domains (domain, vertical_id, role, tenant_id)
       VALUES (?, ?, 'tenant', ?)`,
    )
    .bind(apex, verticalId, tenantId)
    .run();

  const competitors = parseCompetitors(body.competitors);
  for (const comp of competitors) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO watched_domains (domain, vertical_id, role, tenant_id)
         VALUES (?, ?, 'competitor', ?)`,
      )
      .bind(comp, verticalId, tenantId)
      .run();
  }

  return {
    ok: true,
    tenant_id: tenantId,
    domain: apex,
    name,
    vertical_id: verticalId,
    vertical_name: verticalName,
    locale,
    market_country: marketCountry,
    data_consent: Boolean(dataConsent),
    status: activateNow ? 'active' : 'staging',
    competitors_added: competitors.length,
    www: `www.${apex}`,
  };
}

/** Update tenant metadata (name, vertical, locale, automation flags, consent). */
export async function updateSite(db, domain, body) {
  const tenant = await db
    .prepare(`SELECT id, apex_host FROM tenants WHERE apex_host = ?`)
    .bind(normalizeApexHost(domain))
    .first();
  if (!tenant) return { error: 'unknown_domain', domain };

  const fields = [];
  const binds = [];

  if (body.name?.trim()) {
    fields.push('name = ?');
    binds.push(body.name.trim());
  }
  if (body.status && ['staging', 'active', 'suspended', 'archived'].includes(body.status)) {
    fields.push('status = ?');
    binds.push(body.status);
  }
  if (body.data_consent !== undefined) {
    fields.push('data_consent = ?');
    binds.push(body.data_consent ? 1 : 0);
  }
  if (body.locale) {
    fields.push('locale = ?');
    binds.push(String(body.locale).slice(0, 8));
  }
  if (body.market_country ?? body.market) {
    fields.push('market_country = ?');
    binds.push(String(body.market_country ?? body.market).slice(0, 8));
  }
  if (body.auto_optimizer !== undefined) {
    fields.push('auto_optimizer = ?');
    binds.push(body.auto_optimizer ? 1 : 0);
  }
  if (body.auto_edge_activate !== undefined) {
    fields.push('auto_edge_activate = ?');
    binds.push(body.auto_edge_activate ? 1 : 0);
  }
  if (body.cron_enabled !== undefined) {
    fields.push('cron_enabled = ?');
    binds.push(body.cron_enabled ? 1 : 0);
  }

  if (!fields.length) return { error: 'no_fields', domain: tenant.apex_host };

  binds.push(tenant.id);
  await db.prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`).bind(...binds).run();

  return { ok: true, domain: tenant.apex_host, tenant_id: tenant.id, updated: fields.length };
}

export async function fetchSite(db, domain) {
  const apex = normalizeApexHost(domain);
  const row = await db
    .prepare(
      `SELECT t.id, t.name, t.apex_host, t.plan, t.status, t.data_consent, t.locale, t.market_country,
              t.auto_optimizer, t.auto_edge_activate, t.economy_mode, t.cron_enabled,
              t.edge_enabled, t.edge_status, t.cf_hostname_id, t.created_at,
              wd.vertical_id, v.name AS vertical_name
       FROM tenants t
       LEFT JOIN watched_domains wd ON wd.tenant_id = t.id AND wd.role = 'tenant'
       LEFT JOIN verticals v ON v.id = wd.vertical_id
       WHERE t.apex_host = ?`,
    )
    .bind(apex)
    .first();
  if (!row) return { error: 'unknown_domain', domain: apex };
  return { site: row };
}

function parseCompetitors(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(normalizeApexHost).filter(Boolean);
  }
  return String(raw)
    .split(/[,;\n]/)
    .map((s) => normalizeApexHost(s))
    .filter(Boolean);
}
