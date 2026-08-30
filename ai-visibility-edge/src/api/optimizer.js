import {
  getOptimizationPlan,
  runAutonomousOptimizer,
} from '../optimizer/execute.js';
import { loadOptimizerRun, listContentDrafts } from '../optimizer/store.js';
import { buildOptimizationRoadmap } from '../optimizer/roadmap.js';
import { buildOptimizerContext } from '../optimizer/context.js';

export async function fetchOptimizerPlan(env, domain) {
  return getOptimizationPlan(env, domain);
}

export async function runOptimizer(env, domain, options = {}) {
  if (env.AUTO_OPTIMIZER === '0' || env.AUTO_OPTIMIZER === 'false') {
    return {
      error: 'optimizer_disabled',
      hint: 'Set AUTO_OPTIMIZER=1 in Worker vars to enable autonomous optimization.',
    };
  }
  return runAutonomousOptimizer(env, domain, options);
}

export async function fetchOptimizerStatus(env, domain) {
  const ctx = await buildOptimizerContext(env, domain).catch(() => ({ error: 'context_failed', domain }));
  const workerHost = env.WORKER_PUBLIC_HOST ?? 'ai-visibility-edge.radilov-k.workers.dev';

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
      });

  return {
    domain: domain.replace(/^www\./, '').toLowerCase(),
    latest_run: latest,
    content_drafts: drafts,
    current_plan: plan?.error ? null : plan,
    roadmap,
    enabled: env.AUTO_OPTIMIZER !== '0' && env.AUTO_OPTIMIZER !== 'false',
    generated_at: new Date().toISOString(),
  };
}
