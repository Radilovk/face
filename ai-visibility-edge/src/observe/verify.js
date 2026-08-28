import { matchKnownBot } from './botList.js';

/**
 * Verify bot identity from UA + Cloudflare signals (Block 4.4).
 * flag `v` = verified (cache-index eligible); `u` = unverified (excluded).
 *
 * @returns {{ bot_id: string, verified: boolean, flag: 'v'|'u', method: string } | null}
 */
export function verifyBotRequest(request) {
  const ua = request.headers.get('User-Agent') ?? '';
  const bot = matchKnownBot(ua);
  if (!bot) return null;

  const cf = request.cf ?? {};

  if (cf.botManagement?.verifiedBot === true) {
    return { bot_id: bot.id, verified: true, flag: 'v', method: 'cf_verified' };
  }

  const asn = cf.asn;
  if (asn && bot.asns.includes(asn)) {
    return { bot_id: bot.id, verified: true, flag: 'v', method: 'asn' };
  }

  return { bot_id: bot.id, verified: false, flag: 'u', method: 'ua_only' };
}
