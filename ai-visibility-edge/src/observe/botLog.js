import { verifyBotRequest } from './verify.js';

/**
 * Log verified AI bot hits — no IP, cookies, or query strings (Block 4.5).
 */
export function scheduleBotLog(request, env, ctx, tenantConfig) {
  if (!env?.DB || !ctx?.waitUntil || !tenantConfig?.tenantId) return;

  const verification = verifyBotRequest(request);
  if (!verification) return;

  const pathOnly = new URL(request.url).pathname;

  ctx.waitUntil(
    persistBotHit(env.DB, {
      tenantId: tenantConfig.tenantId,
      botId: verification.bot_id,
      path: pathOnly,
      verified: verification.verified ? 1 : 0,
      verifyFlag: verification.flag,
    }).catch((err) => console.error('[botLog]', err.message)),
  );
}

async function persistBotHit(db, hit) {
  await db
    .prepare(
      `INSERT INTO bot_hits (id, tenant_id, bot_id, path, verified, verify_flag, hit_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(crypto.randomUUID(), hit.tenantId, hit.botId, hit.path, hit.verified, hit.verifyFlag)
    .run();
}

/** Aggregate for dashboard / Block 5 prep. */
export async function fetchBotHitStats(db, tenantId, { days = 7 } = {}) {
  if (!db || !tenantId) return { error: 'missing_db_or_tenant' };

  const rows = await db
    .prepare(
      `SELECT bot_id, verified, verify_flag, COUNT(*) AS hits
       FROM bot_hits
       WHERE tenant_id = ?
         AND hit_at >= datetime('now', ?)
       GROUP BY bot_id, verified, verify_flag
       ORDER BY hits DESC`,
    )
    .bind(tenantId, `-${days} days`)
    .all();

  const verifiedTotal = (rows.results ?? [])
    .filter((r) => r.verified === 1)
    .reduce((sum, r) => sum + r.hits, 0);
  const unverifiedTotal = (rows.results ?? [])
    .filter((r) => r.verified !== 1)
    .reduce((sum, r) => sum + r.hits, 0);

  return {
    tenant_id: tenantId,
    window_days: days,
    verified_hits: verifiedTotal,
    unverified_hits: unverifiedTotal,
    by_bot: rows.results ?? [],
  };
}
