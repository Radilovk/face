import { probeDomain } from '../diagnose/probe.js';
import { fetchDomainStrategy } from '../diagnose/strategy.js';
import { buildEdgeDecision } from '../edge/decision.js';
import { loadEdgeConfig, saveEdgeConfig } from '../config/tenantEdge.js';
import { resolveTenantByDomain } from './questions.js';

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
    worker_host: env.WORKER_PUBLIC_HOST ?? 'ai-visibility-edge.radilov-k.workers.dev',
  };
}

/** Apply edge optimization: analysis → decision → KV config (live when CNAME active). */
export async function activateEdgeOptimization(env, domain) {
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

  return {
    ok: true,
    domain: decision.domain,
    status: 'pending_cname',
    verdict: decision.verdict,
    fixes_applied: decision.fixes.map((f) => f.id),
    edge_config_saved: true,
    next_steps: decision.prerequisites,
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
