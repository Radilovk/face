import { isProduction } from './production.js';

/** Public Worker hostname for CNAME / Custom Hostname instructions. */
export function resolveWorkerPublicHost(env) {
  const host = String(env?.WORKER_PUBLIC_HOST ?? '').trim().toLowerCase();
  if (host) return host;
  if (isProduction(env)) {
    return null;
  }
  return 'localhost';
}
