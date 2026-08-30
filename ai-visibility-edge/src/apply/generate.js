/**
 * Generate apply-ready artifacts from probe + strategy (Block 4 manual path until edge live).
 */

export function buildApplyPlan(input = {}) {
  const { probe, strategy, tenant, edgeActive = false } = input;
  const domain = tenant?.apex_host ?? tenant?.domain ?? probe?.domain ?? '';
  const brand = tenant?.name ?? domain;
  const fixes = [];

  if ((probe?.jsonld_blocks ?? 0) === 0) {
    fixes.push({
      id: 'jsonld',
      type: edgeActive ? 'edge' : 'manual',
      priority: 'high',
      title: 'JSON-LD structured data',
      instructions: edgeActive
        ? 'Edge ще инжектира след deploy.'
        : 'Копирайте и поставете в <head> на главната страница.',
      artifact: buildJsonLd({ domain, brand, vertical: tenant?.vertical_name }),
      artifact_format: 'html',
    });
  }

  const chars = probe?.html_text_chars ?? 0;
  if (chars < 500) {
    fixes.push({
      id: 'homepage_content',
      type: 'manual',
      priority: 'high',
      title: 'Текст за AI цитиране (homepage)',
      instructions:
        'Добавете като видим HTML на страницата, която probe чете (виж final_url). Не само в JS widget.',
      artifact: buildHomepageCopy({ domain, brand, vertical: tenant?.vertical_name }),
      artifact_format: 'html',
    });
  }

  const chain = probe?.raw_json?.redirect_chain ?? [];
  if (chain.length > 1 && chars < 300) {
    fixes.push({
      id: 'root_redirect',
      type: 'manual',
      priority: 'medium',
      title: 'Root URL е redirect stub',
      instructions:
        'AI crawlers често не изпълняват JS redirect. Сложете реален текст или SSR на началния URL.',
      artifact: `Root: ${chain[0]?.url ?? domain}\nLanding: ${chain[chain.length - 1]?.url ?? '—'}`,
      artifact_format: 'text',
    });
  }

  if (probe?.robots_ai_policy === 'disallow_all') {
    fixes.push({
      id: 'robots',
      type: edgeActive ? 'edge' : 'manual',
      priority: 'critical',
      title: 'robots.txt блокира ботовете',
      instructions: 'Премахнете Disallow: / или активирайте Edge robots merge.',
      artifact: buildRobotsAllow(),
      artifact_format: 'text',
    });
  }

  for (const rec of strategy?.top_issues ?? []) {
    if (fixes.some((f) => f.id === rec.id)) continue;
    if (rec.severity === 'ok') continue;
    fixes.push({
      id: rec.id,
      type: rec.layer === 'edge' ? 'edge' : 'manual',
      priority: rec.severity === 'critical' ? 'critical' : 'medium',
      title: rec.title,
      instructions: rec.action,
      artifact: rec.what ?? rec.action,
      artifact_format: 'text',
    });
  }

  const manualCount = fixes.filter((f) => f.type === 'manual').length;
  const edgeCount = fixes.filter((f) => f.type === 'edge').length;

  return {
    domain,
    brand,
    mode: edgeActive ? 'edge' : 'manual',
    edge_available: edgeActive,
    cname_hint: edgeActive
      ? null
      : 'За автоматично apply на robots/JSON-LD: CNAME домейна → Worker (Edge Optimizer).',
    summary:
      fixes.length === 0
        ? 'Няма pending поправки — продължете мониторинга.'
        : `${fixes.length} поправки: ${manualCount} ръчни, ${edgeCount} edge (когато е активен).`,
    fixes,
    generated_at: new Date().toISOString(),
  };
}

export function buildJsonLd({ domain, brand, vertical }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: brand,
    url: `https://${domain}/`,
    applicationCategory: vertical ?? 'BusinessApplication',
    operatingSystem: 'Web',
    description: `${brand} — официален сайт на https://${domain}/`,
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

export function buildHomepageCopy({ domain, brand, vertical }) {
  const v = vertical ?? 'услуги';
  return `<section aria-label="About ${brand}">
  <h1>${brand}</h1>
  <p>${brand} (${domain}) предлага ${v}. Този параграф е самостоятелен — AI моделите могат да го цитират без контекст от други страници.</p>
  <p>Ключови ползи: [опишете 2–3 конкретни ползи с числа или факти, ако има]. Посетете https://${domain}/ за повече информация.</p>
  <p>За кого е: [целева аудитория в 1–2 изречения].</p>
</section>`;
}

export function buildRobotsAllow() {
  return `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /`;
}

export function buildMetaDescription({ domain, brand, vertical }) {
  const v = vertical ?? 'услуги и продукти';
  const text = `${brand} (${domain}) — ${v} в България. Официален сайт с информация, цени и доставка. Посетете https://${domain}/`;
  return `<meta name="description" content="${text.slice(0, 160)}">`;
}

export function buildTitleFix({ domain, brand, vertical }) {
  const v = vertical ?? 'официален сайт';
  return `<title>${brand} — ${v} | ${domain}</title>`;
}

export function buildSitemapXml({ domain, urls = [] }) {
  const locs = urls.length ? urls : [`https://${domain}/`];
  const body = locs
    .map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
