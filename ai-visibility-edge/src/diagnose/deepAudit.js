/**
 * Deep site research — sitemap, internal links, multi-page audit, agent-native smoke.
 * Extends homepage probe with evidence-backed page inventory.
 */
import { fetchProbePage } from './resolveLanding.js';
import { extractTitle, extractFirstH1, extractJsonLdTypes, extractMetaDescription } from './siteBrief.js';
import { runAgentNativeSmoke } from './smoke.js';
import { isOriginAgentNativeReady, agentNativeScore } from './originReady.js';

const PROBE_UA = 'AIVisibilityBot/1.0 (+https://ai-visibility-edge/deep-audit)';

const PAGE_TYPE_PATTERNS = [
  { type: 'faq', patterns: [/faq/i, /questions/i, /help/i] },
  { type: 'pricing', patterns: [/pricing/i, /price/i, /plans/i, /tarif/i] },
  { type: 'about', patterns: [/about/i, /za-nas/i, /company/i] },
  { type: 'products', patterns: [/product/i, /shop/i, /catalog/i, /store/i] },
  { type: 'blog', patterns: [/blog/i, /news/i, /article/i] },
  { type: 'contact', patterns: [/contact/i, /kontakt/i] },
];

const RECOMMENDED_PAGE_TYPES = ['faq', 'pricing', 'about', 'products'];

/**
 * @param {string} domain
 * @param {object} probe — homepage probeDomain result
 * @param {{ fetch?: typeof fetch, pageLimit?: number, includeSmoke?: boolean, brand?: string, vertical?: string }} [options]
 */
export async function runDeepAudit(domain, probe, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const host = String(domain).toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
  const origin = `https://${host}`;
  const pageLimit = options.pageLimit ?? 12;
  const started = Date.now();

  const [sitemapUrls, smoke] = await Promise.all([
    discoverUrls(fetchImpl, host, probe, pageLimit * 3),
    options.includeSmoke !== false ? runAgentNativeSmoke(host, { fetch: fetchImpl }).catch(() => null) : null,
  ]);

  const prioritized = prioritizeUrls(sitemapUrls, origin, pageLimit);
  const pages = [];

  for (const url of prioritized) {
    if (url === origin + '/' || url === origin) continue;
    const audit = await auditPage(fetchImpl, url);
    pages.push(audit);
  }

  const homepageAudit = await auditPage(fetchImpl, probe?.raw_json?.final_url ?? origin + '/');
  if (!pages.some((p) => p.path === '/' || p.path === '')) {
    pages.unshift({ ...homepageAudit, path: '/', page_type: 'homepage', priority: 0 });
  }

  const pageTypes = new Set(pages.map((p) => p.page_type).filter(Boolean));
  const missingPageTypes = RECOMMENDED_PAGE_TYPES.filter((t) => !pageTypes.has(t));
  const aggregate = aggregatePageSignals(pages, probe);
  const agentScore = agentNativeScore(probe);
  const originReady = isOriginAgentNativeReady(probe);

  return {
    domain: host,
    depth: 'deep',
    pages_fetched: pages.length,
    pages,
    sitemap_urls_found: sitemapUrls.length,
    missing_page_types: missingPageTypes,
    aggregate,
    agent_native: {
      score: agentScore,
      max: 7,
      origin_ready: originReady,
      smoke_level: smoke?.level ?? null,
      smoke_label: smoke?.level_label ?? null,
      smoke_ok: smoke?.ok ?? null,
      smoke_checks: smoke?.checks ?? [],
    },
    duration_ms: Date.now() - started,
    audited_at: new Date().toISOString(),
  };
}

async function discoverUrls(fetchImpl, host, probe, cap) {
  const origin = `https://${host}`;
  const urls = new Set([origin + '/']);

  const fromSitemap = await parseSitemapUrls(fetchImpl, host, cap);
  for (const u of fromSitemap) urls.add(normalizeUrl(u, origin));

  const html = probe?.raw_json?.html ?? '';
  if (html) {
    for (const u of extractInternalLinks(html, origin)) urls.add(u);
  } else {
    try {
      const home = await fetchImpl(origin + '/', { headers: { 'User-Agent': PROBE_UA } });
      if (home.ok) {
        const body = await home.text();
        for (const u of extractInternalLinks(body, origin)) urls.add(u);
      }
    } catch { /* optional */ }
  }

  return [...urls].slice(0, cap);
}

async function parseSitemapUrls(fetchImpl, host, cap) {
  const urls = [];
  const seen = new Set();
  const queue = [`https://${host}/sitemap.xml`];

  while (queue.length && urls.length < cap) {
    const sitemapUrl = queue.shift();
    if (seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);

    try {
      const res = await fetchImpl(sitemapUrl, { headers: { 'User-Agent': PROBE_UA } });
      if (!res.ok) continue;
      const xml = await res.text();

      for (const m of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        const loc = m[1].trim();
        if (loc.includes('sitemap') && loc.endsWith('.xml')) {
          queue.push(loc);
        } else if (sameHost(loc, host)) {
          urls.push(loc);
        }
      }
    } catch { /* skip */ }
  }

  return urls.slice(0, cap);
}

function extractInternalLinks(html, origin) {
  const host = new URL(origin).host;
  const out = new Set();
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const href = m[1].trim();
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      const abs = new URL(href, origin);
      if (abs.host.replace(/^www\./, '') === host.replace(/^www\./, '')) {
        out.add(abs.origin + abs.pathname.replace(/\/$/, '') || abs.origin + '/');
      }
    } catch { /* skip */ }
  }
  return [...out];
}

export function prioritizeUrls(urls, origin, limit) {
  const host = new URL(origin).host;
  const scored = urls.map((url) => {
    let path = '/';
    try {
      path = new URL(url).pathname || '/';
    } catch { /* keep / */ }
    const pageType = detectPageType(path);
    let score = 10;
    if (pageType === 'faq') score = 100;
    else if (pageType === 'pricing') score = 95;
    else if (pageType === 'about') score = 90;
    else if (pageType === 'products') score = 85;
    else if (pageType === 'homepage' || path === '/') score = 80;
    else if (pageType === 'blog') score = 60;
    else if (path.split('/').filter(Boolean).length <= 2) score = 50;
    return { url: normalizeUrl(url, origin), path, page_type: pageType, priority: score };
  });

  scored.sort((a, b) => b.priority - a.priority);
  const picked = [];
  const seenPath = new Set();
  for (const item of scored) {
    const key = item.path.toLowerCase();
    if (seenPath.has(key)) continue;
    seenPath.add(key);
    picked.push(item.url);
    if (picked.length >= limit) break;
  }
  if (!picked.includes(origin + '/') && !picked.includes(origin)) picked.unshift(origin + '/');
  return picked.slice(0, limit);
}

export function detectPageType(path) {
  for (const { type, patterns } of PAGE_TYPE_PATTERNS) {
    if (patterns.some((re) => re.test(path))) return type;
  }
  if (path === '/' || path === '') return 'homepage';
  return 'other';
}

async function auditPage(fetchImpl, url) {
  try {
    const page = await fetchProbePage(url, async (u) =>
      fetchImpl(u, { headers: { 'User-Agent': PROBE_UA }, redirect: 'follow' }),
    );
    const html = page.html ?? '';
    const path = safePath(url);
    return {
      url: page.finalUrl ?? url,
      path,
      page_type: detectPageType(path),
      http_status: page.status ?? 0,
      ok: page.ok,
      title: extractTitle(html),
      h1: extractFirstH1(html),
      meta_description: extractMetaDescription(html),
      text_chars: (page.text ?? '').length,
      jsonld_blocks: (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) ?? []).length,
      jsonld_types: extractJsonLdTypes(html),
      noindex: /noindex/i.test(html),
      redirect_hops: page.redirect_chain?.length ?? 1,
    };
  } catch (e) {
    return {
      url,
      path: safePath(url),
      page_type: detectPageType(safePath(url)),
      ok: false,
      error: String(e.message ?? e),
    };
  }
}

function aggregatePageSignals(pages, probe) {
  const okPages = pages.filter((p) => p.ok);
  const totalText = okPages.reduce((n, p) => n + (p.text_chars ?? 0), 0);
  const withJsonLd = okPages.filter((p) => (p.jsonld_blocks ?? 0) > 0).length;
  const withH1 = okPages.filter((p) => p.h1).length;
  const noindexPages = okPages.filter((p) => p.noindex).map((p) => p.path);

  return {
    pages_ok: okPages.length,
    total_text_chars: totalText,
    avg_text_chars: okPages.length ? Math.round(totalText / okPages.length) : 0,
    pages_with_jsonld: withJsonLd,
    pages_with_h1: withH1,
    noindex_pages: noindexPages,
    homepage_text_chars: probe?.html_text_chars ?? okPages.find((p) => p.page_type === 'homepage')?.text_chars ?? 0,
    rich_site: totalText >= 2000 || withJsonLd >= 2 || isOriginAgentNativeReady(probe),
  };
}

function sameHost(url, host) {
  try {
    return new URL(url).host.replace(/^www\./, '') === host.replace(/^www\./, '');
  } catch {
    return false;
  }
}

function normalizeUrl(url, origin) {
  try {
    const u = new URL(url, origin);
    return u.origin + (u.pathname.replace(/\/$/, '') || '/');
  } catch {
    return url;
  }
}

function safePath(url) {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return '/';
  }
}
