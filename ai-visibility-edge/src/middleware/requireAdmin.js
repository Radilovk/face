/**
 * Protect mutating / costly endpoints when ADMIN_TOKEN is configured.
 * If ADMIN_TOKEN is unset (local dev), requests are allowed.
 */
export function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return null;

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (token !== env.ADMIN_TOKEN) {
    return json(
      {
        error: 'unauthorized',
        hint: 'Set Authorization: Bearer <ADMIN_TOKEN> for this endpoint.',
      },
      401,
    );
  }
  return null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
