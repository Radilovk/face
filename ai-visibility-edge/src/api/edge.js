import { probeDomain } from '../diagnose/probe.js';
import { runAgentNativeSmoke } from '../diagnose/smoke.js';
import { fetchDomainStrategy } from '../diagnose/strategy.js';
import { buildEdgeDecision } from '../edge/decision.js';
import { loadEdgeConfig, saveEdgeConfig } from '../config/tenantEdge.js';
import { resolveTenantByDomain } from './questions.js';
import { resolveWorkerPublicHost } from '../config/workerHost.js';
import { cloudflareTokenConfigured } from '../cloudflare/api.js';
import { applyTenantCloudflareAeo } from './cloudflareAeo.js';
import { provisionTenantHostname } from './customHostnames.js';

export async function getEdgeDecision(env, domain) {
  if (!env.DB) return { error: 'db_not_bound' };

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) {
    return { error: 'unknown_domain', domain, hint: 'Добавете сайта през dashboard (+ Сайт).' };
  }

  const strategy = await fetchDomainStrategy(env, tenant.apex_host);
  const edgeConfig = await loadEdgeConfig(env, tenant.apex_host);
  const edgeActive = Boolean(edgeConfig?.edge?.enabled) && Boolean(tenant.edge_enabled);

  const probe = await probeDomain(tenant.apex_host, { brand: tenant.name ?? undefined });

  const decision = buildEdgeDecision({
    probe: {
      ...probe,
      redirect_chain: probe.raw_json?.redirect_chain,
    },
    strategy,
    tenant,
    edgeActive,
  });

  return {
    ...decision,
    tenant_id: tenant.id,
    edge_enabled_db: Boolean(tenant.edge_enabled),
    edge_status_db: tenant.edge_status ?? 'measurement_only',
    worker_host: resolveWorkerPublicHost(env),
  };
}

/** Apply edge optimization: analysis → decision → KV config (live when CNAME active). */
export async function activateEdgeOptimization(env, domain, body = {}) {
  const decision = await getEdgeDecision(env, domain);
  if (decision.error) return decision;

  if (!env.CACHE) {
    return { error: 'kv_not_bound', hint: 'KV binding липсва — edge config не може да се запише.' };
  }

  const saved = await saveEdgeConfig(env, decision.domain, decision.edge_config);
  if (saved.error) return saved;

  await env.DB.prepare(
    `UPDATE tenants SET edge_enabled = 1, edge_status = ?, status = 'active' WHERE id = ?`,
  )
    .bind('pending_cname', decision.tenant_id)
    .run();

  const followUp = {};

  if (body.provision_hostname !== false && cloudflareTokenConfigured(env)) {
    const host = await provisionTenantHostname(env, decision.domain);
    followUp.hostname = host.error ? { error: host.error, hint: host.hint } : { ok: true, status: host.status };
  }

  if (body.apply_cloudflare_aeo !== false && cloudflareTokenConfigured(env)) {
    const aeo = await applyTenantCloudflareAeo(env, decision.domain, {
      run_smoke: false,
      zone_id: body.zone_id,
    });
    followUp.cloudflare_aeo = aeo.error ? { error: aeo.error, hint: aeo.hint } : { ok: aeo.ok, applied: aeo.applied };
  }

  if (body.run_smoke !== false) {
    followUp.smoke = await runAgentNativeSmoke(decision.domain);
  }

  return {
    ok: true,
    domain: decision.domain,
    status: 'pending_cname',
    verdict: decision.verdict,
    fixes_applied: decision.fixes.map((f) => f.id),
    edge_config_saved: true,
    next_steps: decision.prerequisites,
    follow_up: followUp,
    message:
      'Edge конфигурацията е записана. След CNAME към Worker поправките се прилагат автоматично — без CMS.',
    saved_at: new Date().toISOString(),
  };
}

export async function getEdgeStatus(env, domain) {
  const cfg = await loadEdgeConfig(env, domain);
  const tenant = env.DB ? await resolveTenantByDomain(env.DB, domain) : null;
  return {
    domain,
    edge_config: cfg ? { enabled: cfg.edge?.enabled, inject_jsonld: cfg.edge?.inject_jsonld } : null,
    tenant_edge_enabled: Boolean(tenant?.edge_enabled),
    edge_status: tenant?.edge_status ?? 'measurement_only',
  };
}
