/** Worker admin/API host — not a customer tenant apex. */
export function parsePlatformHosts(env) {
  const raw = String(env?.PLATFORM_HOSTS ?? '').trim();
  const fromEnv = raw
    ? raw.split(/[,;\s]+/).map((h) => h.trim().toLowerCase()).filter(Boolean)
    : [];
  return new Set([...fromEnv, 'localhost', '127.0.0.1']);
}

export function isPlatformHost(hostname, env = null) {
  const host = String(hostname ?? '').toLowerCase();
  if (!host) return true;
  const extra = env ? parsePlatformHosts(env) : parsePlatformHosts({});
  if (extra.has(host)) return true;
  return host.endsWith('.workers.dev');
}
