import {
  getOptimizationPlan,
  runAutonomousOptimizer,
} from '../optimizer/execute.js';
import { loadOptimizerRun, listContentDrafts } from '../optimizer/store.js';
import { buildOptimizationRoadmap } from '../optimizer/roadmap.js';
import { buildOptimizerContext } from '../optimizer/context.js';
import { resolveTenantSettingsByDomain } from '../config/tenantSettings.js';
import { resolveWorkerPublicHost } from '../config/workerHost.js';

export async function fetchOptimizerPlan(env, domain) {
  return getOptimizationPlan(env, domain);
}

export async function runOptimizer(env, domain, options = {}) {
  const resolved = env.DB ? await resolveTenantSettingsByDomain(env.DB, domain, env) : null;
  const settings = resolved?.settings;
  const enabled = settings ? settings.auto_optimizer : env.AUTO_OPTIMIZER !== '0' && env.AUTO_OPTIMIZER !== 'false';
  if (!enabled) {
    return {
      error: 'optimizer_disabled',
      hint: 'Активирайте AUTO_OPTIMIZER или auto_optimizer за tenant.',
    };
  }
  return runAutonomousOptimizer(env, domain, options);
}

export async function fetchOptimizerStatus(env, domain) {
  const ctx = await buildOptimizerContext(env, domain).catch(() => ({ error: 'context_failed', domain }));
  const workerHost = resolveWorkerPublicHost(env) ?? 'localhost';
  const resolved = env.DB ? await resolveTenantSettingsByDomain(env.DB, domain, env) : null;

  const [latest, drafts, plan] = await Promise.all([
    loadOptimizerRun(env, domain),
    listContentDrafts(env, domain),
    ctx.error ? null : getOptimizationPlan(env, domain).catch(() => null),
  ]);

  const roadmap = ctx.error
    ? null
    : buildOptimizationRoadmap(ctx, {
        worker_host: workerHost,
        latest_run: latest,
        content_drafts: drafts,
        findings: ctx.strategy?.findings ?? plan?.findings,
        findings_summary: ctx.strategy?.findings_summary,
      });

  return {
    domain: domain.replace(/^www\./, '').toLowerCase(),
    latest_run: latest,
    content_drafts: drafts,
    current_plan: plan?.error ? null : plan,
    roadmap,
    enabled: resolved?.settings?.auto_optimizer ?? (env.AUTO_OPTIMIZER !== '0' && env.AUTO_OPTIMIZER !== 'false'),
    generated_at: new Date().toISOString(),
  };
}
