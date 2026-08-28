import {
  extractDomain,
  extractCanonical,
} from '../citations/verify.js';
import { fetchProbePage } from './resolveLanding.js';

const PROBE_UA = 'AIVisibilityBot/1.0 (+https://ai-visibility-edge/probe)';

/**
 * HTTP probe for a single domain — extraction layer diagnostics.
 */
export async function probeDomain(domain, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const host = domain.replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
  const homepage = `https://${host}/`;

  const page = await fetchProbePage(homepage, async (url) =>
    fetchImpl(url, { headers: { 'User-Agent': PROBE_UA }, redirect: 'follow' }),
  );

  let robotsPolicy = 'unknown';
  let blockedBots = [];
  try {
    const robotsRes = await fetchImpl(`https://${host}/robots.txt`, {
      headers: { 'User-Agent': PROBE_UA },
    });
    if (robotsRes.ok) {
      const robotsText = await robotsRes.text();
      robotsPolicy = summarizeRobots(robotsText);
      blockedBots = extractBlockedBots(robotsText);
    } else if (robotsRes.status === 404) {
      robotsPolicy = 'none';
    }
  } catch {
    robotsPolicy = 'fetch_error';
  }

  const html = page.html ?? '';
  const text = page.text ?? '';
  const jsonldBlocks = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) ?? []).length;
  const canonical = page.canonical ?? extractCanonical(html, page.finalUrl ?? homepage);
  const priceTokens = countPriceTokens(text);

  return {
    domain: host,
    probed_at: new Date().toISOString(),
    http_status: page.status ?? (page.ok ? 200 : 0),
    html_text_chars: text.length,
    jsonld_blocks: jsonldBlocks,
    robots_ai_policy: robotsPolicy,
    blocked_bots: blockedBots,
    has_canonical: canonical ? 1 : 0,
    price_tokens: priceTokens,
    raw_json: {
      final_url: page.finalUrl ?? homepage,
      text_sample: text.slice(0, 500),
      redirect_chain: page.redirect_chain ?? [],
    },
  };
}

/**
 * Batch probe with jitter (ms) between requests.
 */
export async function probeBatch(domains, options = {}) {
  const jitterMin = options.jitterMin ?? 200;
  const jitterMax = options.jitterMax ?? 800;
  const fetchImpl = options.fetch ?? fetch;
  const results = [];

  for (const domain of domains) {
    results.push(await probeDomain(domain, { fetch: fetchImpl }));
    if (domains.indexOf(domain) < domains.length - 1) {
      await sleep(randomBetween(jitterMin, jitterMax));
    }
  }

  return results;
}

export async function persistDiagnostic(db, probeResult, score = null) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO diagnostics (
        id, domain, probed_at, http_status, html_text_chars, jsonld_blocks,
        robots_ai_policy, blocked_bots, has_canonical, price_tokens, score, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      probeResult.domain,
      probeResult.probed_at,
      probeResult.http_status,
      probeResult.html_text_chars,
      probeResult.jsonld_blocks,
      probeResult.robots_ai_policy,
      JSON.stringify(probeResult.blocked_bots ?? []),
      probeResult.has_canonical,
      probeResult.price_tokens,
      score,
      JSON.stringify(probeResult.raw_json ?? {}),
    )
    .run();

  return { id, ...probeResult, score };
}

function summarizeRobots(text) {
  const lower = text.toLowerCase();
  if (lower.includes('disallow: /') && !lower.includes('user-agent: *')) return 'partial';
  if (/user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/m.test(lower)) return 'disallow_all';
  if (lower.includes('gptbot') || lower.includes('google-extended') || lower.includes('anthropic')) {
    return 'ai_rules_present';
  }
  return 'allow';
}

function extractBlockedBots(text) {
  const bots = [];
  const blocks = text.split(/\n(?=User-agent:)/i);
  for (const block of blocks) {
    const ua = block.match(/^User-agent:\s*(.+)/im)?.[1]?.trim();
    if (!ua) continue;
    if (/disallow:\s*\//im.test(block)) bots.push(ua);
  }
  return bots;
}

function countPriceTokens(text) {
  const matches = text.match(/\d+[.,]?\d*\s*(€|лв|лв\.|BGN|EUR|USD|\$)/gi) ?? [];
  return matches.length;
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export { extractDomain };
