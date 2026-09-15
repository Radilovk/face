/** Production guards — fail closed when ENVIRONMENT=production. */
export function isProduction(env) {
  const v = String(env?.ENVIRONMENT ?? env?.NODE_ENV ?? '').toLowerCase();
  return v === 'production' || env?.PRODUCTION === '1' || env?.PRODUCTION === 'true';
}

export function productionConfigIssues(env) {
  const issues = [];
  if (!isProduction(env)) return issues;
  if (!env?.ADMIN_TOKEN) issues.push('ADMIN_TOKEN');
  if (!env?.WORKER_PUBLIC_HOST?.trim()) issues.push('WORKER_PUBLIC_HOST');
  if (!env?.CACHE) issues.push('KV (CACHE binding)');
  return issues;
}
