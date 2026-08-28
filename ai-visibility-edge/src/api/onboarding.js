import { resolveTenantByDomain } from './questions.js';
import { getEdgeDecision } from './edge.js';

/**
 * CNAME / Custom Hostname onboarding checklist (Block 6.2).
 */
export async function fetchOnboardingStatus(env, domain) {
  if (!env.DB) return { error: 'db_not_bound' };

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) {
    return { error: 'unknown_domain', domain, hint: 'Добавете сайта през dashboard (+ Сайт).' };
  }

  const workerHost = env.WORKER_PUBLIC_HOST ?? 'ai-visibility-edge.radilov-k.workers.dev';
  const edge = await getEdgeDecision(env, tenant.apex_host);

  const steps = [
    {
      id: 'register',
      title: 'Сайт регистриран',
      done: true,
      detail: `${tenant.apex_host} · ${tenant.status}`,
    },
    {
      id: 'measure',
      title: 'Първо измерване (Layer 1)',
      done: (edge.strategy?.stats?.runCount ?? 0) > 0,
      detail: edge.strategy?.stats?.runCount
        ? `${edge.strategy.stats.runCount} runs`
        : 'Стартирайте „1. Анализ“',
    },
    {
      id: 'edge_config',
      title: 'Edge конфигурация (KV)',
      done: Boolean(edge.edge_active) || edge.edge_status_db === 'pending_cname',
      detail: edge.edge_active ? 'Активна' : 'Натиснете „2. Приложи Edge“',
    },
    {
      id: 'cname',
      title: 'CNAME / Custom Hostname',
      done: edge.edge_active,
      detail: edge.edge_active
        ? 'Трафикът минава през Worker'
        : `CNAME ${tenant.apex_host} → ${workerHost}`,
    },
    {
      id: 'ssl',
      title: 'SSL (Cloudflare for SaaS)',
      done: edge.edge_active && tenant.status === 'active',
      detail: edge.edge_active
        ? 'Custom Hostname active'
        : 'Активира се след CNAME + SSL validation',
    },
  ];

  const ready = steps.every((s) => s.done);

  return {
    domain: tenant.apex_host,
    tenant_id: tenant.id,
    worker_host: workerHost,
    edge_status: tenant.edge_status ?? 'measurement_only',
    ready_for_clients: ready,
    steps,
    dns: {
      type: 'CNAME',
      name: tenant.apex_host,
      target: workerHost,
      note: 'Custom Hostname в Cloudflare for SaaS — не пълен DNS transfer.',
    },
    generated_at: new Date().toISOString(),
  };
}
