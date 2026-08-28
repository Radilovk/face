import {
  INFO_MODULES,
  USER_CHECKLIST,
  fetchTenantRecommendations,
} from '../diagnose/recommendations.js';

export { INFO_MODULES, USER_CHECKLIST };

/** Fallback tenant list when D1 unavailable (mirrors seed). */
export const TENANTS = [
  {
    domain: 'daotslabna.com',
    name: 'Да отслабна',
    vertical_id: 'weight-loss-supplements-bg',
    vertical: 'Добавки за отслабване',
    canary: false,
  },
  {
    domain: 'biocode-bg.com',
    name: 'BIOCODE Nutrition',
    vertical_id: 'sports-nutrition-supplements-bg',
    vertical: 'Спортни добавки',
    canary: false,
  },
  {
    domain: 'life-protocols.com',
    name: 'Life Protocols',
    vertical_id: 'longevity-protocols-bg',
    vertical: 'Дълголетие / biohacking',
    canary: false,
  },
  {
    domain: 'biocode-peptides.com',
    name: 'BIOCODE Peptides',
    vertical_id: 'peptides-research-bg',
    vertical: 'Research пептиди',
    canary: false,
  },
];

export const GITHUB_ACTIONS = {
  repo: 'https://github.com/Radilovk/face/actions',
  baseline: 'https://github.com/Radilovk/face/actions/workflows/aiv-baseline-collect.yml',
  deploy: 'https://github.com/Radilovk/face/actions/workflows/aiv-deploy.yml',
  tests: 'https://github.com/Radilovk/face/actions/workflows/aiv-test.yml',
};

export async function fetchDashboardSummary(env) {
  const summary = {
    generated_at: new Date().toISOString(),
    health: {
      ok: true,
      db: Boolean(env.DB),
      kv: Boolean(env.CACHE),
      baseline_id: env.BASELINE_ID ?? '2026-08-27',
    },
    baseline: null,
    runs: null,
    observations: null,
    tenants: TENANTS,
  };

  summary.baseline = await readBaselineStatus(env);

  if (env.DB) {
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
  const targets = domain ? TENANTS.filter((t) => t.domain === domain) : TENANTS;

  if (domain && targets.length === 0) {
    return { error: 'unknown_domain', domain };
  }

  const tenants = [];
  for (const tenant of targets) {
    tenants.push(await fetchTenantRecommendations(env, tenant, options));
  }

  return {
    generated_at: new Date().toISOString(),
    tenants,
  };
}

async function readBaselineStatus(env) {
  const baselineId = env.BASELINE_ID ?? '2026-08-27';
  const key = `aiv/baseline/${baselineId}/manifest`;

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
