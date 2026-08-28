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

  await db
    .prepare(
      `INSERT INTO tenants (id, name, apex_host, plan, status, is_canary)
       VALUES (?, ?, ?, 'trial', 'staging', 0)`,
    )
    .bind(tenantId, name, apex)
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
         VALUES (?, ?, 'competitor', NULL)`,
      )
      .bind(comp, verticalId)
      .run();
  }

  return {
    ok: true,
    tenant_id: tenantId,
    domain: apex,
    name,
    vertical_id: verticalId,
    vertical_name: verticalName,
    competitors_added: competitors.length,
    www: `www.${apex}`,
  };
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
