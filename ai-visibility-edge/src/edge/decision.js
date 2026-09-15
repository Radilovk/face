import { buildRobotsTxt } from '../config/aiCrawlers.js';
import { buildLlmsTxt } from '../enhance/llms.js';
import { pickSchemaType } from '../schema/pickType.js';

/**
 * After analysis → clear edge optimization decision (Block 4).
 * Optimization = Cloudflare Worker proxy, NOT CMS edits.
 */
export function buildEdgeDecision(input = {}) {
  const { probe, strategy, tenant, edgeActive = false } = input;
  const domain = tenant?.apex_host ?? tenant?.domain ?? probe?.domain ?? '';
  const brand = tenant?.name ?? domain;

  const fixes = [];
  const blockers = [];

  if ((probe?.jsonld_blocks ?? 0) === 0) {
    fixes.push({
      id: 'inject_jsonld',
      layer: 'edge',
      title: 'Инжектиране на JSON-LD',
      detail: 'HTMLRewriter добавя Organization/SoftwareApplication в <head> — еднакво за всички посетители.',
    });
  }

  if (probe?.robots_ai_policy === 'disallow_all') {
    fixes.push({
      id: 'robots_allow',
      layer: 'edge',
      title: 'robots.txt — Allow AI bots',
      detail: 'Edge Worker обслужва robots.txt без CMS промяна.',
    });
  } else if (
    probe?.robots_ai_policy === 'none' ||
    probe?.robots_ai_policy === 'fetch_error' ||
    (probe?.signals?.missing_search_crawlers?.length ?? 0) > 0
  ) {
    fixes.push({
      id: 'robots_serve',
      layer: 'edge',
      title: 'robots.txt от Edge',
      detail: 'OAI-SearchBot, PerplexityBot, Claude-SearchBot, Googlebot + training bots — Allow.',
    });
  }

  if (!probe?.signals?.llms_txt_ok) {
    fixes.push({
      id: 'serve_llms_txt',
      layer: 'edge',
      title: 'llms.txt от Edge',
      detail: 'Курирана карта на ключовите страници за AI агенти.',
    });
  }

  const chain = probe?.raw_json?.redirect_chain ?? probe?.redirect_chain ?? [];
  const landingChars = probe?.html_text_chars ?? 0;
  const landingHasSchema = (probe?.jsonld_blocks ?? 0) > 0;
  if (chain.length > 1 && (landingChars < 500 || !landingHasSchema)) {
    fixes.push({
      id: 'canonical_root',
      layer: 'edge',
      title: 'Canonical + видим текст на root',
      detail: `Root е redirect stub → landing: ${chain[chain.length - 1]?.url ?? '—'}. Edge може да инжектира meta/canonical — опционално, не е задължително ако landing е пълна.`,
    });
  }

  if ((probe?.html_text_chars ?? 0) < 500) {
    blockers.push({
      id: 'thin_content',
      title: 'Малко HTML текст',
      detail: 'Edge не пише marketing copy — само технически слой (schema, robots). Съдържание: отделен content pipeline.',
    });
  }

  const edgeConfig = buildEdgeConfigPayload({ domain, brand, probe, tenant, fixes });

  let verdict;
  let status;

  if (edgeActive) {
    verdict = {
      level: 'ok',
      headline: 'Edge оптимизация е активна',
      summary: `Трафикът минава през Worker. Приложени: ${fixes.map((f) => f.title).join(', ') || 'мониторинг'}.`,
    };
    status = 'active';
  } else if (fixes.length === 0) {
    verdict = {
      level: 'ok',
      headline: 'Няма pending edge fixes',
      summary: 'Продължете измерване и мониторинг. Edge не е нужен за технически проблеми в момента.',
    };
    status = 'measurement_only';
  } else {
    verdict = {
      level: blockers.some((b) => b.id === 'thin_content') ? 'warning' : 'info',
      headline: `Edge решение: ${fixes.length} автоматични поправки`,
      summary:
        'След CNAME към Worker системата прилага поправки прозрачно — без редакция в CMS. Същото HTML за хора и AI.',
    };
    status = 'pending_cname';
  }

  return {
    domain,
    brand,
    status,
    edge_active: edgeActive,
    verdict,
    fixes,
    blockers,
    edge_config: edgeConfig,
    prerequisites: edgeActive
      ? []
      : [
          {
            id: 'cname',
            title: 'CNAME / Custom Hostname',
            detail: `Насочете ${domain} към Cloudflare Worker (Custom Hostname). Без това Edge не е в трафика.`,
          },
          {
            id: 'activate',
            title: 'Активирай в dashboard',
            detail: '„Приложи Edge“ записва конфигурацията — live след CNAME + deploy.',
          },
        ],
    pipeline_next: edgeActive ? 'remeasure' : fixes.length ? 'activate_edge' : 'monitor',
    generated_at: new Date().toISOString(),
  };
}

function buildEdgeConfigPayload({ domain, brand, probe, tenant, fixes }) {
  const fixIds = new Set(fixes.map((f) => f.id));

  return {
    domain,
    edge: {
      enabled: true,
      robots_mode: fixIds.has('robots_allow') || fixIds.has('robots_serve') ? 'serve' : 'passthrough',
      llms_mode: fixIds.has('serve_llms_txt') ? 'serve' : 'passthrough',
      inject_jsonld: fixIds.has('inject_jsonld'),
      inject_canonical: fixIds.has('canonical_root'),
      origin_url: probe?.raw_json?.final_url
        ? new URL(probe.raw_json.final_url).origin
        : `https://${domain}`,
    },
    brand,
    vertical: tenant?.vertical_name ?? null,
    robots_txt: buildRobotsTxt(domain),
    llms_txt: fixIds.has('serve_llms_txt')
      ? buildLlmsTxt({ domain, brand, vertical: tenant?.vertical_name })
      : null,
    jsonld: fixIds.has('inject_jsonld')
      ? {
          '@context': 'https://schema.org',
          ...pickSchemaType(tenant?.vertical_name, brand, domain, { probe }),
        }
      : null,
  };
}
