import {
  INFO_MODULES,
  USER_CHECKLIST,
  fetchTenantRecommendations,
} from '../diagnose/recommendations.js';
import { listSitesFromDb } from '../api/pipeline.js';
import { resolveBaselineId, baselineManifestKey } from '../config/baseline.js';

export { INFO_MODULES, USER_CHECKLIST };

export const GITHUB_ACTIONS = {
  repo: 'https://github.com/Radilovk/face/actions',
  baseline: 'https://github.com/Radilovk/face/actions/workflows/aiv-baseline-collect.yml',
  deploy: 'https://github.com/Radilovk/face/actions/workflows/aiv-deploy.yml',
  tests: 'https://github.com/Radilovk/face/actions/workflows/aiv-test.yml',
};

export async function fetchDashboardSummary(env) {
  const baselineId = await resolveBaselineId(env);
  const summary = {
    generated_at: new Date().toISOString(),
    health: {
      ok: true,
      db: Boolean(env.DB),
      kv: Boolean(env.CACHE),
      baseline_id: baselineId,
    },
    baseline: null,
    runs: null,
    observations: null,
    tenants: [],
  };

  summary.baseline = await readBaselineStatus(env);

  if (env.DB) {
    try {
      summary.tenants = await listSitesFromDb(env);
    } catch {
      summary.tenants = [];
    }
    try {
      const { results } = await env.DB.prepare(
        `SELECT model, COUNT(*) as count FROM runs GROUP BY model`,
      ).all();
      const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM runs`).first();
      summary.runs = { total: total?.n ?? 0, by_model: results ?? [] };
    } catch (err) {
      summary.runs = { error: err.message };
    }

    try {
      const { results } = await env.DB.prepare(
        `SELECT class, COUNT(*) as count FROM observations GROUP BY class ORDER BY count DESC`,
      ).all();
      const mis = await env.DB.prepare(`SELECT COUNT(*) as n FROM misattributions`).first();
      summary.observations = {
        by_class: results ?? [],
        misattributions: mis?.n ?? 0,
      };
    } catch (err) {
      summary.observations = { error: err.message };
    }
  }

  return summary;
}

export async function fetchDashboardRecommendations(env, options = {}) {
  const domain = options.domain ?? null;

  if (!env.DB) {
    return { error: 'db_not_bound', hint: 'Сайтовете се добавят през dashboard → + Сайт' };
  }

  const sites = await listSitesFromDb(env);
  const targets = domain
    ? sites.filter((s) => s.domain === domain.replace(/^www\./, '').toLowerCase())
    : sites;

  if (domain && targets.length === 0) {
    return {
      error: 'unknown_domain',
      domain,
      hint: 'Добавете домейна през dashboard (+ Сайт), не през seed или CLI.',
    };
  }

  const tenants = [];
  for (const site of targets) {
    tenants.push(
      await fetchTenantRecommendations(
        env,
        {
          domain: site.domain,
          name: site.name,
          vertical_id: site.vertical_id,
          canary: Boolean(site.is_canary),
        },
        options,
      ),
    );
  }

  return {
    generated_at: new Date().toISOString(),
    tenants,
  };
}

async function readBaselineStatus(env) {
  const baselineId = await resolveBaselineId(env);
  const key = baselineManifestKey(baselineId);

  if (env.CACHE) {
    const manifest = await env.CACHE.get(key, 'json');
    if (manifest) {
      return { source: 'kv', baseline_id: baselineId, ...manifest };
    }
  }

  return {
    source: 'default',
    baseline_id: baselineId,
    status: 'questions_ready',
    hint: 'Пусни aiv-baseline-collect в GitHub Actions',
  };
}
