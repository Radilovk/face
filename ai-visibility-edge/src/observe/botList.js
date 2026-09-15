/**
 * Known AI crawler User-Agent patterns (Block 4.5).
 * @see docs/СТРАТЕГИЯ.md §4.4–4.5
 */
import { ALL_AI_CRAWLERS } from '../config/aiCrawlers.js';

export const KNOWN_BOTS = ALL_AI_CRAWLERS.map((c) => ({
  id: c.id,
  patterns: [new RegExp(c.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')],
  asns: c.asns ?? [],
}));

/** @returns {{ id: string, asns: number[] } | null} */
export function matchKnownBot(userAgent) {
  const ua = String(userAgent ?? '');
  if (!ua) return null;

  for (const bot of KNOWN_BOTS) {
    if (bot.patterns.some((re) => re.test(ua))) {
      return { id: bot.id, asns: bot.asns ?? [] };
    }
  }
  return null;
}
