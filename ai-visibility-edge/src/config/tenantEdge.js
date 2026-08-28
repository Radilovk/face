/**
 * Edge config: KV (runtime, per UI site) + optional bundled git defaults.
 */
const KV_PREFIX = 'aiv/edge/config/';

export async function loadEdgeConfig(env, hostname) {
  const host = normalizeHost(hostname);
  if (!host) return null;

  if (env.CACHE) {
    const kv = await env.CACHE.get(`${KV_PREFIX}${host}`, 'json');
    if (kv) return kv;
  }

  return loadBundledConfig(host);
}

export async function saveEdgeConfig(env, domain, config) {
  const host = normalizeHost(domain);
  if (!env.CACHE) return { error: 'kv_not_bound' };

  const payload = {
    ...config,
    domain: host,
    updated_at: new Date().toISOString(),
  };

  await env.CACHE.put(`${KV_PREFIX}${host}`, JSON.stringify(payload));
  await env.CACHE.put(`${KV_PREFIX}www.${host}`, JSON.stringify({ ...payload, domain: `www.${host}` }));

  return { ok: true, domain: host, config: payload };
}

export async function isEdgeEnabled(env, hostname) {
  const cfg = await loadEdgeConfig(env, hostname);
  return Boolean(cfg?.edge?.enabled);
}

function normalizeHost(hostname) {
  return String(hostname ?? '')
    .toLowerCase()
    .replace(/^www\./, '');
}

/** Bundled git configs — optional seed; UI sites use KV. */
function loadBundledConfig(host) {
  return null;
}

export { KV_PREFIX };
