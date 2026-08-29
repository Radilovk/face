import {
  getOptimizationPlan,
  runAutonomousOptimizer,
} from '../optimizer/execute.js';
import { loadOptimizerRun, listContentDrafts } from '../optimizer/store.js';

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
  const [latest, drafts, plan] = await Promise.all([
    loadOptimizerRun(env, domain),
    listContentDrafts(env, domain),
    getOptimizationPlan(env, domain).catch(() => null),
  ]);

  return {
    domain: domain.replace(/^www\./, '').toLowerCase(),
    latest_run: latest,
    content_drafts: drafts,
    current_plan: plan?.error ? null : plan,
    enabled: env.AUTO_OPTIMIZER !== '0' && env.AUTO_OPTIMIZER !== 'false',
    generated_at: new Date().toISOString(),
  };
}
