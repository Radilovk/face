/** Baseline snapshot id resolution (audit C1 — versioned weekly runs). */

export const CANONICAL_BASELINE_ID = '2026-08-27';

/** Prefer KV latest pointer; fall back to wrangler BASELINE_ID. */
export async function resolveBaselineId(env) {
  if (env.CACHE) {
    const latest = await env.CACHE.get('aiv/baseline/latest');
    if (latest?.trim()) return latest.trim();
  }
  return env.BASELINE_ID ?? CANONICAL_BASELINE_ID;
}

export function baselineManifestKey(baselineId) {
  return `aiv/baseline/${baselineId}/manifest`;
}
