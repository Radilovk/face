import { buildCacheIndex } from '../cache/index.js';

export async function fetchCacheIndex(env, url) {
  if (!env.DB) return { error: 'db_not_bound' };

  const domain = url.searchParams.get('domain');
  const verticalId = url.searchParams.get('vertical_id');
  const model = url.searchParams.get('model');
  const windowHours = parseInt(url.searchParams.get('window_hours') ?? '72', 10);

  const result = await buildCacheIndex(env.DB, {
    domain,
    verticalId,
    model: model || null,
    windowHours: Number.isFinite(windowHours) ? windowHours : 72,
  });

  return result;
}
