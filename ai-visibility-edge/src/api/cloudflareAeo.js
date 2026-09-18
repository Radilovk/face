import { resolveTenantByDomain } from './questions.js';
import { cloudflareTokenConfigured, findZoneByHostname } from '../cloudflare/api.js';
import { applyCloudflareAeo } from '../cloudflare/security.js';
import { runAgentNativeSmoke } from '../diagnose/smoke.js';

/**
 * Resolve Cloudflare zone for tenant apex (client zone, not SAAS_ZONE_ID).
 */
export async function resolveTenantZone(env, domain, body = {}) {
  if (body.zone_id) return { ok: true, zone_id: body.zone_id, source: 'request' };

  const lookup = await findZoneByHostname(env, domain);
  if (lookup.error) return lookup;
  return { ok: true, zone_id: lookup.zone.id, zone_name: lookup.zone.name, source: 'api_lookup' };
}

/** POST /api/cloudflare/{domain}/apply-aeo */
export async function applyTenantCloudflareAeo(env, domain, body = {}) {
  if (!cloudflareTokenConfigured(env)) {
    return {
      error: 'cloudflare_not_configured',
      hint: 'Задайте CF_API_TOKEN в Worker secrets (Account token с Zone:Edit).',
    };
  }

  const tenant = env.DB ? await resolveTenantByDomain(env.DB, domain) : null;
  if (env.DB && !tenant) return { error: 'unknown_domain', domain };

  const apex = tenant?.apex_host ?? domain;
  const zone = await resolveTenantZone(env, apex, body);
  if (zone.error) return zone;

  const result = await applyCloudflareAeo(env, {
    zoneId: zone.zone_id,
    domain: apex,
    skipWaf: body.skip_waf === true,
    skipDnsAid: body.skip_dns_aid === true,
    skipPurge: body.skip_purge === true,
  });

  let smoke = null;
  if (body.run_smoke !== false) {
    smoke = await runAgentNativeSmoke(apex);
  }

  return {
    ...result,
    tenant_id: tenant?.id,
    zone_source: zone.source,
    zone_name: zone.zone_name,
    smoke,
  };
}

/** GET /api/edge/{domain}/smoke */
export async function runTenantSmoke(env, domain) {
  const tenant = env.DB ? await resolveTenantByDomain(env.DB, domain) : null;
  if (env.DB && !tenant) return { error: 'unknown_domain', domain };
  const apex = tenant?.apex_host ?? domain;
  const smoke = await runAgentNativeSmoke(apex);
  return {
    ...smoke,
    tenant_id: tenant?.id,
    edge_enabled: Boolean(tenant?.edge_enabled),
    edge_status: tenant?.edge_status ?? 'measurement_only',
  };
}
