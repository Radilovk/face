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
  } else if (probe?.robots_ai_policy === 'none' || probe?.robots_ai_policy === 'fetch_error') {
    fixes.push({
      id: 'robots_serve',
      layer: 'edge',
      title: 'robots.txt от Edge',
      detail: 'GPTBot, Google-Extended, PerplexityBot — Allow.',
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

function pickSchemaType(verticalName, brand, domain) {
  const v = (verticalName ?? '').toLowerCase();
  if (/shop|e-?commerce|store|retail|продукт|магазин/.test(v)) {
    return {
      '@type': 'Product',
      name: brand,
      url: `https://${domain}/`,
      description: `${brand} — продукти и оферти на https://${domain}/`,
      offers: { '@type': 'Offer', priceCurrency: 'BGN', availability: 'https://schema.org/InStock' },
    };
  }
  if (/clinic|medical|health|лечение|клиника|фарма/.test(v)) {
    return {
      '@type': 'LocalBusiness',
      name: brand,
      url: `https://${domain}/`,
      description: `${brand} — https://${domain}/`,
    };
  }
  if (/saas|software|app|platform/.test(v)) {
    return {
      '@type': 'SoftwareApplication',
      name: brand,
      url: `https://${domain}/`,
      applicationCategory: verticalName ?? 'BusinessApplication',
      description: `${brand} — https://${domain}/`,
    };
  }
  return {
    '@type': 'Organization',
    name: brand,
    url: `https://${domain}/`,
    description: `${brand} — https://${domain}/`,
  };
}

function buildEdgeConfigPayload({ domain, brand, probe, tenant, fixes }) {
  const fixIds = new Set(fixes.map((f) => f.id));

  return {
    domain,
    edge: {
      enabled: true,
      robots_mode: fixIds.has('robots_allow') || fixIds.has('robots_serve') ? 'serve' : 'passthrough',
      inject_jsonld: fixIds.has('inject_jsonld'),
      inject_canonical: fixIds.has('canonical_root'),
      origin_url: probe?.raw_json?.final_url
        ? new URL(probe.raw_json.final_url).origin
        : `https://${domain}`,
    },
    robots_txt: buildRobotsTxt(domain),
    jsonld: fixIds.has('inject_jsonld')
      ? {
          '@context': 'https://schema.org',
          ...pickSchemaType(tenant?.vertical_name, brand, domain),
        }
      : null,
  };
}

function buildRobotsTxt(domain) {
  return `# Managed by AI Visibility Edge — no CMS edits
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;
}
