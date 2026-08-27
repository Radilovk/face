import { isEdgeEnabled } from './tenantEdge.js';

const moduleCache = new Map();

export function getCachedConfig(hostname) {
  const entry = moduleCache.get(hostname);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    moduleCache.delete(hostname);
    return null;
  }
  return entry.config;
}

export function setCachedConfig(hostname, config, ttlSeconds = 300) {
  moduleCache.set(hostname, {
    config,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function clearConfigCache() {
  moduleCache.clear();
}

export async function loadTenantConfig(request, env) {
  const hostname = new URL(request.url).hostname;
  const cached = getCachedConfig(hostname);
  if (cached) return cached;

  const cacheKey = new Request(`https://internal/config/${hostname}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) {
    const config = await hit.json();
    setCachedConfig(hostname, config);
    return config;
  }

  if (!env.DB) return null;

  const row = await env.DB.prepare(
    `SELECT t.* FROM tenant_hosts h
     JOIN tenants t ON t.id = h.tenant_id
     WHERE h.hostname = ? AND t.status IN ('staging', 'active')
     LIMIT 1`,
  )
    .bind(hostname)
    .first();

  if (!row) return null;

  const config = {
    tenantId: row.id,
    name: row.name,
    apexHost: row.apex_host,
    plan: row.plan,
    status: row.status,
    isCanary: Boolean(row.is_canary),
    edgeEnabled: isEdgeEnabled(hostname),
  };

  setCachedConfig(hostname, config);
  await cache.put(
    cacheKey,
    new Response(JSON.stringify(config), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=300`,
      },
    }),
  );

  return config;
}
