import { buildOptimizerContext } from '../optimizer/context.js';
import { resolveWorkerPublicHost } from '../config/workerHost.js';
import { runAgentNativeSmoke } from '../diagnose/smoke.js';
import { refineClientPathWithAi } from '../advisor/pathDecision.js';
import { buildClientPlaybook } from '../onboarding/playbook.js';

/** GET /api/playbook/{domain} — AI-routed client optimization playbook. */
export async function fetchClientPlaybook(env, domain, options = {}) {
  const ctx = await buildOptimizerContext(env, domain);
  if (ctx.error) return ctx;

  if (ctx.tenant && ctx.tenant.is_pilot === undefined && env.DB) {
    const row = await env.DB.prepare(`SELECT is_pilot FROM tenants WHERE id = ?`)
      .bind(ctx.tenant.id)
      .first();
    ctx.tenant.is_pilot = Boolean(row?.is_pilot);
  }

  let smoke = null;
  if (options.include_smoke !== false) {
    smoke = await runAgentNativeSmoke(ctx.domain).catch(() => null);
  }

  const pathDetection = await refineClientPathWithAi(env, ctx, {
    smoke,
    skip_ai: options.skip_ai === true,
  });

  const workerHost = resolveWorkerPublicHost(env);
  const playbook = buildClientPlaybook(pathDetection, ctx, {
    worker_host: workerHost,
    smoke,
    ai_rationale: pathDetection.ai_rationale,
    ai_source: pathDetection.ai_source,
  });

  return {
    ...playbook,
    path_detection: pathDetection,
    smoke,
    worker_host: workerHost,
  };
}
