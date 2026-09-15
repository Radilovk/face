import { isProduction } from '../config/production.js';

/**
 * Protect mutating / costly endpoints.
 * Local dev: open when ADMIN_TOKEN unset.
 * Production (ENVIRONMENT=production): always requires ADMIN_TOKEN.
 */
export function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) {
    if (isProduction(env)) {
      return json(
        {
          error: 'auth_not_configured',
          hint: 'Задайте ADMIN_TOKEN secret в Worker — production не работи без auth.',
        },
        503,
      );
    }
    return null;
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (token !== env.ADMIN_TOKEN) {
    return json(
      {
        error: 'unauthorized',
        hint: 'Authorization: Bearer <ADMIN_TOKEN>',
      },
      401,
    );
  }
  return null;
}

/** Gate costly read endpoints in production (probe, measure). */
export function requireAdminIfProduction(request, env) {
  if (!isProduction(env)) return null;
  return requireAdmin(request, env);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
