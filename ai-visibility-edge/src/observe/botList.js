/**
 * Known AI crawler User-Agent patterns (Block 4.5).
 * @see docs/СТРАТЕГИЯ.md §4.4–4.5
 */
export const KNOWN_BOTS = [
  {
    id: 'gptbot',
    patterns: [/GPTBot/i],
    /** OpenAI / major cloud egress — conservative allowlist */
    asns: [20473, 396982, 15169, 16509],
  },
  {
    id: 'google-extended',
    patterns: [/Google-Extended/i],
    asns: [15169, 396982],
  },
  {
    id: 'anthropic-ai',
    patterns: [/anthropic-ai/i, /ClaudeBot/i],
    asns: [16509, 14618],
  },
  {
    id: 'perplexitybot',
    patterns: [/PerplexityBot/i],
    asns: [209242, 396982],
  },
  {
    id: 'bytespider',
    patterns: [/Bytespider/i],
    asns: [396986, 137697],
  },
  {
    id: 'ccbot',
    patterns: [/CCBot/i],
    asns: [13335, 209242],
  },
];

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
