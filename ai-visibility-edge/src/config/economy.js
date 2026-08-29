/**
 * Economy mode — lower recurring LLM cost (cron rotation, dedup, model filter).
 * Enable with ECONOMY_MODE=1 in wrangler vars / Worker secrets.
 */

const ALL_MODELS = ['openai', 'gemini', 'perplexity'];

export function economyEnabled(env) {
  const v = env?.ECONOMY_MODE;
  return v === '1' || v === 'true' || v === true;
}

/** Comma-separated MEASURE_MODELS / CRON_MEASURE_MODELS → model ids. */
export function parseMeasureModelsList(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const tokens = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0 || tokens.includes('all')) return null;

  const mapped = tokens.flatMap((t) => {
    if (t === 'gemini' || t === 'gemini_only') return ['gemini'];
    if (t === 'openai' || t === 'openai_only') return ['openai'];
    if (t === 'perplexity') return ['perplexity'];
    if (ALL_MODELS.includes(t)) return [t];
    return [];
  });

  return mapped.length ? [...new Set(mapped)] : null;
}

/**
 * Models for a measure/citation call.
 * @param {'cron'|'pipeline'|'default'} purpose
 */
export function resolveMeasureModels(env, purpose = 'default') {
  const raw =
    purpose === 'cron'
      ? env.CRON_MEASURE_MODELS ?? env.MEASURE_MODELS
      : env.MEASURE_MODELS;

  let list = parseMeasureModelsList(raw);
  if (!list && purpose === 'cron' && economyEnabled(env)) {
    list = ['gemini'];
  }
  if (!list) return null;

  return list.filter((m) => hasProviderKey(env, m));
}

export function hasProviderKey(env, model) {
  if (model === 'openai') return Boolean(env.OPENAI_API_KEY);
  if (model === 'gemini') return Boolean(env.GEMINI_API_KEY);
  if (model === 'perplexity') return Boolean(env.PERPLEXITY_API_KEY);
  return false;
}

export function cronRepetitions(env) {
  const configured = env.CRON_REPETITIONS;
  if (configured != null && configured !== '') return Math.max(1, Number(configured) || 1);
  return economyEnabled(env) ? 1 : 3;
}

export function cronQuestionsPerTenant(env) {
  const configured = env.CRON_QUESTIONS_PER_TENANT;
  if (configured != null && configured !== '') return Math.max(1, Number(configured) || 5);
  return economyEnabled(env) ? 5 : Number.MAX_SAFE_INTEGER;
}

/** Skip re-asking same question+model within N days (0 = off). */
export function measureDedupDays(env, purpose = 'default') {
  const configured = env.MEASURE_DEDUP_DAYS;
  if (configured != null && configured !== '') return Math.max(0, Number(configured) || 0);
  if (purpose === 'cron' && economyEnabled(env)) return 7;
  return 0;
}

export function advisorContextTtlSec(env) {
  const configured = env.ADVISOR_CONTEXT_TTL_SEC;
  if (configured != null && configured !== '') return Math.max(0, Number(configured) || 0);
  return economyEnabled(env) ? 900 : 0;
}

/** ISO week index for rotating question slices (stable across years). */
export function isoWeekIndex(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return d.getUTCFullYear() * 100 + week;
}

/** Pick `count` questions with weekly rotation over tenant question list. */
export function pickRotatingQuestions(questions, count, weekIndex) {
  const list = [...questions].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const n = list.length;
  if (n === 0 || count <= 0) return [];
  const take = Math.min(count, n);
  const start = (weekIndex * take) % n;
  const picked = [];
  for (let i = 0; i < take; i++) {
    picked.push(list[(start + i) % n]);
  }
  return picked;
}

export function getEconomyStatus(env) {
  return {
    enabled: economyEnabled(env),
    measure_models: resolveMeasureModels(env, 'default') ?? 'all_configured',
    cron_measure_models: resolveMeasureModels(env, 'cron') ?? 'all_configured',
    cron_repetitions: cronRepetitions(env),
    cron_questions_per_tenant: cronQuestionsPerTenant(env),
    measure_dedup_days_cron: measureDedupDays(env, 'cron'),
    advisor_context_ttl_sec: advisorContextTtlSec(env),
  };
}
