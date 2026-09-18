/** Platform-level metadata for multi-tenant SaaS operators. */

export async function fetchPlatformInfo(env) {
  const workerHost = env.WORKER_PUBLIC_HOST ?? null;
  let tenantStats = { total: 0, active: 0, pilot: 0, staging: 0 };

  if (env.DB) {
    const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM tenants`).first();
    const active = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM tenants WHERE status = 'active' AND is_pilot = 0`,
    ).first();
    const pilot = await env.DB.prepare(`SELECT COUNT(*) as n FROM tenants WHERE is_pilot = 1`).first();
    const staging = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM tenants WHERE status = 'staging' AND is_pilot = 0`,
    ).first();
    tenantStats = {
      total: total?.n ?? 0,
      active: active?.n ?? 0,
      pilot: pilot?.n ?? 0,
      staging: staging?.n ?? 0,
    };
  }

  let saasDefaults = null;
  if (env.DB) {
    const row = await env.DB.prepare(`SELECT value FROM platform_config WHERE key = 'saas_defaults'`).first();
    if (row?.value) {
      try {
        saasDefaults = JSON.parse(row.value);
      } catch {
        saasDefaults = null;
      }
    }
  }

  return {
    ok: true,
    product: 'ai-visibility-edge',
    model: 'multi_tenant_saas',
    architecture: {
      one_worker: true,
      tenants_in_d1: true,
      custom_hostnames_per_tenant: true,
      operator_dashboard: workerHost ? `https://${workerHost}/dashboard` : '/dashboard',
    },
    tenants: tenantStats,
    saas_defaults: saasDefaults,
    onboarding_flow: [
      'POST /api/sites { domain, name, vertical_name?, locale?, run_analysis?: true }',
      'POST /api/pipeline/{domain}/run — or run_analysis on register',
      'POST /api/edge/{domain}/activate — KV edge config + optional CF AEO + smoke',
      'POST /api/cloudflare/{domain}/apply-aeo — Bot Fight, WAF skip, DNS-AID',
      'GET /api/edge/{domain}/smoke — live Agent-Native checks',
      'GET /api/playbook/{domain} — AI-routed path + Level 5 playbook',
      'POST /api/hostnames/{domain}/provision — optional Custom Hostname',
    ],
    generated_at: new Date().toISOString(),
  };
}
