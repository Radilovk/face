import {
  extractDomain,
  extractCanonical,
} from '../citations/verify.js';
import { fetchProbePage } from './resolveLanding.js';
import {
  extractTitle,
  extractMetaDescription,
  extractFirstH1,
  extractJsonLdTypes,
} from './siteBrief.js';

const PROBE_UA = 'AIVisibilityBot/1.0 (+https://ai-visibility-edge/probe)';

const AI_BOTS = ['gptbot', 'google-extended', 'anthropic-ai', 'perplexitybot', 'claudebot', 'ccbot'];

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
  const title = extractTitle(html);
  const meta = extractMetaDescription(html);
  const h1 = extractFirstH1(html);
  const jsonldTypes = extractJsonLdTypes(html);
  const noindex = detectNoindex(html);
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const sitemapOk = await checkSitemap(fetchImpl, host);
  const brand = options.brand ?? null;
  const brandMentions = brand ? countBrandMentions(text, brand) : 0;

  const signals = {
    noindex,
    h1_count: h1Count,
    brand_mentions: brandMentions,
    brand_in_first_500: brand ? countBrandMentions(text.slice(0, 500), brand) > 0 : null,
    meta_description_len: meta?.length ?? 0,
    title_len: title?.length ?? 0,
    sitemap_ok: sitemapOk,
    jsonld_types: jsonldTypes,
    js_shell_suspect: html.length > 8000 && text.length < 300,
    html_bytes: html.length,
  };

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
    signals,
    raw_json: {
      final_url: page.finalUrl ?? homepage,
      text_sample: text.slice(0, 800),
      text_passage: text.slice(0, 12000),
      redirect_chain: page.redirect_chain ?? [],
      title,
      meta_description: meta,
      h1,
      jsonld_types: jsonldTypes,
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
    const uaLower = ua.toLowerCase();
    const isAiBot = AI_BOTS.some((b) => uaLower.includes(b)) || uaLower.includes('bot');
    if (!isAiBot) continue;
    if (isFullSiteDisallow(block)) bots.push(ua);
  }
  return bots;
}

function isFullSiteDisallow(block) {
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*disallow:\s*(.+)\s*$/i);
    if (!m) continue;
    const path = m[1].trim();
    if (path === '/' || path === '/*') return true;
  }
  return false;
}

function detectNoindex(html) {
  if (!html) return false;
  const lower = html.toLowerCase();
  if (/name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(lower)) return true;
  if (/content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(lower)) return true;
  return false;
}

export function countBrandMentions(text, brand) {
  if (!text || !brand) return 0;
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  return (text.match(re) ?? []).length;
}

async function checkSitemap(fetchImpl, host) {
  try {
    const res = await fetchImpl(`https://${host}/sitemap.xml`, {
      headers: { 'User-Agent': PROBE_UA },
      method: 'GET',
    });
    if (!res.ok) return false;
    const body = (await res.text()).slice(0, 500);
    return body.includes('<urlset') || body.includes('<sitemapindex');
  } catch {
    return false;
  }
}

export function countPriceTokens(text) {
  if (!text) return 0;
  const patterns = [
    /\d+[.,]?\d*\s*(€|лв|лв\.|BGN|EUR|USD|\$)/gi,
    /(€|\$|USD|EUR|BGN)\s*\d+[.,]?\d*/gi,
    /\d+[.,]?\d*\s*\/\s*(mo|month|мес|year|yr|год)/gi,
    /(?:free|безплатно)\s*[—–-]?\s*(€|\$)?\s*0\b/gi,
  ];
  const seen = new Set();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      seen.add(m[0].toLowerCase());
    }
  }
  return seen.size;
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export { detectNoindex as detectNoindexSignals };
