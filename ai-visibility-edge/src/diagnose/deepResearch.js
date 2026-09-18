/**
 * Deep research report — executive summary, strengths, gaps, priority strategy.
 * Synthesizes multi-page audit into plain-language operator guidance.
 */
import { isOriginAgentNativeReady } from './originReady.js';

const MATURITY_LABELS = {
  advanced: 'Напреднал (Agent-Native)',
  moderate: 'Среден — основите са налице',
  basic: 'Базов — нужни подобрения',
  critical: 'Критичен — блокери за AI видимост',
};

/**
 * @param {object} deepAudit — runDeepAudit() result
 * @param {object} [probe] — homepage probe
 * @param {object} [options]
 * @param {string} [options.brand]
 * @param {object} [options.strategy] — optional buildStrategy output for SOV/displacement context
 */
export function buildDeepResearchReport(deepAudit, probe = null, options = {}) {
  if (!deepAudit) {
    return {
      depth: 'none',
      executive_summary: 'Няма дълбок одит — стартирайте пълен анализ.',
      site_maturity: 'unknown',
      maturity_label: 'Няма данни',
      strengths: [],
      gaps: [],
      strategy: { immediate: [], short_term: [], long_term: [] },
      page_inventory: null,
      agent_native: null,
      confidence: 'low',
      generated_at: new Date().toISOString(),
    };
  }

  const brand = options.brand ?? probe?.domain ?? deepAudit.domain;
  const aggregate = deepAudit.aggregate ?? {};
  const agent = deepAudit.agent_native ?? {};
  const pages = deepAudit.pages ?? [];
  const originReady = agent.origin_ready ?? isOriginAgentNativeReady(probe);

  const strengths = collectStrengths(deepAudit, probe, originReady);
  const gaps = collectGaps(deepAudit, probe, originReady);
  const maturity = resolveMaturity(deepAudit, probe, originReady, gaps);
  const strategy = buildPriorityStrategy(gaps, deepAudit, probe, options.strategy);
  const executive_summary = buildExecutiveSummary({
    brand,
    maturity,
    deepAudit,
    originReady,
    agent,
    gaps,
    strengths,
    strategy,
    options,
  });

  const pageTypes = {};
  for (const p of pages) {
    const t = p.page_type ?? 'other';
    pageTypes[t] = (pageTypes[t] ?? 0) + 1;
  }

  const confidence =
    deepAudit.pages_fetched >= 8 ? 'high' : deepAudit.pages_fetched >= 4 ? 'medium' : 'low';

  return {
    depth: 'deep',
    executive_summary,
    site_maturity: maturity,
    maturity_label: MATURITY_LABELS[maturity] ?? maturity,
    strengths,
    gaps,
    strategy,
    page_inventory: {
      pages_fetched: deepAudit.pages_fetched ?? pages.length,
      sitemap_urls_found: deepAudit.sitemap_urls_found ?? 0,
      by_type: pageTypes,
      missing_types: deepAudit.missing_page_types ?? [],
      aggregate,
    },
    agent_native: agent,
    confidence,
    audited_at: deepAudit.audited_at ?? null,
    duration_ms: deepAudit.duration_ms ?? null,
    generated_at: new Date().toISOString(),
  };
}

function collectStrengths(deepAudit, probe, originReady) {
  const out = [];
  const agg = deepAudit.aggregate ?? {};
  const agent = deepAudit.agent_native ?? {};

  if (originReady) {
    out.push({
      id: 'origin_agent_native',
      title: 'Origin е Agent-Native готов',
      detail: 'Сайтът вече обслужва ai-catalog, llms.txt, auth.md и не блокира GPTBot — не е нужен AIV Edge за техническата основа.',
      evidence: `Agent-Native score ${agent.score ?? '?'}/${agent.max ?? 7}`,
    });
  }

  if (agent.smoke_level != null && agent.smoke_level >= 4) {
    out.push({
      id: 'smoke_level',
      title: `Live smoke: ${agent.smoke_label ?? 'Level ' + agent.smoke_level}`,
      detail: 'Реални HTTP проверки потвърждават Level 4–5 поведение на origin.',
      evidence: `${agent.smoke_checks?.filter((c) => c.pass).length ?? 0} checks passed`,
    });
  }

  if ((agg.pages_with_jsonld ?? 0) >= 2) {
    out.push({
      id: 'jsonld_coverage',
      title: 'JSON-LD на множество страници',
      detail: `${agg.pages_with_jsonld} страници с structured data — AI може да извлича факти и типове.`,
      evidence: `total ${agg.total_text_chars ?? 0} chars across ${agg.pages_ok ?? 0} pages`,
    });
  } else if ((probe?.jsonld_blocks ?? 0) > 0) {
    out.push({
      id: 'homepage_jsonld',
      title: 'Structured data на началната страница',
      detail: 'JSON-LD на homepage дава базов контекст за AI моделите.',
      evidence: `${probe.jsonld_blocks} blocks`,
    });
  }

  if ((agg.total_text_chars ?? 0) >= 3000 || agg.rich_site) {
    out.push({
      id: 'rich_content',
      title: 'Богато текстово съдържание',
      detail: `Общо ${agg.total_text_chars ?? 0} символа на ${agg.pages_ok ?? deepAudit.pages_fetched} страници — достатъчно материал за цитиране.`,
      evidence: `avg ${agg.avg_text_chars ?? 0} chars/page`,
    });
  }

  if ((agg.pages_with_h1 ?? 0) >= Math.max(2, Math.floor((deepAudit.pages_fetched ?? 1) * 0.7))) {
    out.push({
      id: 'h1_structure',
      title: 'Ясна H1 структура',
      detail: 'Повечето ключови страници имат H1 — по-добро разбиране от crawlers.',
      evidence: `${agg.pages_with_h1}/${agg.pages_ok ?? deepAudit.pages_fetched} pages`,
    });
  }

  if (probe?.robots_ai_policy === 'ai_rules_present' || probe?.robots_ai_policy === 'allow') {
    out.push({
      id: 'robots_open',
      title: 'robots.txt позволява AI crawlers',
      detail: 'Няма site-wide блок за User-agent: * и има правила за AI ботове.',
      evidence: probe.robots_ai_policy,
    });
  }

  if ((deepAudit.sitemap_urls_found ?? 0) >= 5) {
    out.push({
      id: 'sitemap_rich',
      title: 'Богат sitemap',
      detail: `${deepAudit.sitemap_urls_found} URL-а в sitemap — добра откриваемост.`,
      evidence: 'sitemap.xml parsed',
    });
  }

  return out.slice(0, 8);
}

function collectGaps(deepAudit, probe, originReady) {
  const out = [];
  const agg = deepAudit.aggregate ?? {};
  const missing = deepAudit.missing_page_types ?? [];

  if (probe?.signals?.noindex || (agg.noindex_pages?.length ?? 0) > 0) {
    out.push({
      id: 'noindex_pages',
      title: 'Страници с noindex',
      detail: 'Част от ключовите страници са маркирани noindex — AI и търсачки ги пропускат.',
      priority: 'critical',
      evidence: (agg.noindex_pages ?? []).join(', ') || 'homepage',
    });
  }

  if (probe?.robots_ai_policy === 'disallow_all' && !originReady) {
    out.push({
      id: 'robots_block',
      title: 'robots.txt блокира crawlers',
      detail: 'User-agent: * Disallow: / — нулева AI видимост докато не се поправи.',
      priority: 'critical',
      evidence: 'disallow_all',
    });
  }

  if ((probe?.http_status ?? 200) >= 400 || (probe?.http_status ?? 200) < 200) {
    out.push({
      id: 'http_error',
      title: 'HTTP грешка на homepage',
      detail: `Статус ${probe.http_status} — AI не може да извлече съдържание.`,
      priority: 'critical',
      evidence: String(probe.http_status),
    });
  }

  for (const type of missing) {
    const labels = {
      faq: 'FAQ страница',
      pricing: 'Цени / pricing',
      about: 'За нас / about',
      products: 'Продукти / каталог',
    };
    out.push({
      id: `missing_${type}`,
      title: `Липсва ${labels[type] ?? type}`,
      detail: 'AI моделите често търсят този тип страница при препоръки — добавете я или линк от homepage.',
      priority: type === 'faq' || type === 'pricing' ? 'high' : 'medium',
      evidence: 'not in sitemap/links crawl',
    });
  }

  const thinPages = (deepAudit.pages ?? []).filter(
    (p) => p.ok && (p.text_chars ?? 0) < 150 && p.page_type !== 'homepage',
  );
  if (thinPages.length >= 2) {
    out.push({
      id: 'thin_inner_pages',
      title: 'Тънки вътрешни страници',
      detail: `${thinPages.length} страници с <150 символа — недостатъчно за AI цитиране.`,
      priority: 'high',
      evidence: thinPages.map((p) => p.path).slice(0, 4).join(', '),
    });
  }

  if (!originReady && (agg.pages_with_jsonld ?? 0) === 0 && (probe?.jsonld_blocks ?? 0) === 0) {
    out.push({
      id: 'no_jsonld',
      title: 'Няма JSON-LD',
      detail: 'Structured data липсва — добавете Organization/Product/FAQ schema.',
      priority: 'high',
      evidence: '0 blocks across crawl',
    });
  }

  if (!originReady && !probe?.signals?.ai_catalog_ok) {
    out.push({
      id: 'missing_ai_catalog',
      title: 'Липсва /.well-known/ai-catalog.json',
      detail: 'Agent-Native каталог помага на AI да открие API и ресурси.',
      priority: 'medium',
      evidence: 'well-known check failed',
    });
  }

  if (!originReady && probe?.signals?.gptbot_blocked) {
    out.push({
      id: 'gptbot_blocked',
      title: 'GPTBot е блокиран',
      detail: 'ChatGPT не може да индексира сайта — Allow GPTBot в robots.txt.',
      priority: 'high',
      evidence: 'GPTBot HEAD blocked',
    });
  }

  const pagesNoH1 = (deepAudit.pages ?? []).filter((p) => p.ok && !p.h1);
  if (pagesNoH1.length >= 3) {
    out.push({
      id: 'missing_h1',
      title: 'Страници без H1',
      detail: `${pagesNoH1.length} страници без H1 заглавие.`,
      priority: 'medium',
      evidence: pagesNoH1.map((p) => p.path).slice(0, 3).join(', '),
    });
  }

  if ((deepAudit.sitemap_urls_found ?? 0) === 0 && !probe?.signals?.sitemap_ok) {
    out.push({
      id: 'no_sitemap',
      title: 'Липсва или празен sitemap',
      detail: 'sitemap.xml не е намерен — crawlers виждат само homepage линкове.',
      priority: 'medium',
      evidence: '0 sitemap URLs',
    });
  }

  if (
    !originReady &&
    (agg.homepage_text_chars ?? probe?.html_text_chars ?? 0) < 400 &&
    !agg.rich_site
  ) {
    out.push({
      id: 'thin_homepage',
      title: 'Тънка начална страница',
      detail: 'Homepage има малко видим текст за AI — разширете описанието, ползи и цени.',
      priority: 'high',
      evidence: `${agg.homepage_text_chars ?? probe?.html_text_chars ?? 0} chars`,
    });
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  out.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
  return out.slice(0, 12);
}

function resolveMaturity(deepAudit, probe, originReady, gaps) {
  const critical = gaps.filter((g) => g.priority === 'critical');
  if (critical.length > 0) return 'critical';

  const agent = deepAudit.agent_native ?? {};
  if (originReady && (agent.smoke_level ?? 0) >= 4) return 'advanced';
  if (originReady || (deepAudit.aggregate?.rich_site && gaps.length <= 2)) return 'moderate';
  if ((probe?.jsonld_blocks ?? 0) > 0 && (probe?.html_text_chars ?? 0) >= 400) return 'basic';
  return gaps.some((g) => g.priority === 'high') ? 'basic' : 'moderate';
}

function buildPriorityStrategy(gaps, deepAudit, probe, strategy) {
  const immediate = [];
  const short_term = [];
  const long_term = [];
  const originReady = deepAudit.agent_native?.origin_ready ?? isOriginAgentNativeReady(probe);

  for (const gap of gaps.filter((g) => g.priority === 'critical')) {
    immediate.push({
      action: gap.id,
      title: gap.title,
      detail: gap.detail,
      owner: gap.id.includes('robots') || gap.id.includes('noindex') ? 'you' : 'system',
    });
  }

  for (const gap of gaps.filter((g) => g.priority === 'high')) {
    short_term.push({
      action: gap.id,
      title: gap.title,
      detail: gap.detail,
      owner: gap.id.startsWith('missing_') ? 'you' : 'system',
    });
  }

  for (const gap of gaps.filter((g) => g.priority === 'medium')) {
    long_term.push({
      action: gap.id,
      title: gap.title,
      detail: gap.detail,
      owner: 'you',
    });
  }

  if (originReady) {
    immediate.push({
      action: 'run_measurement',
      title: 'Пуснете AI измерване (SOV + displacement)',
      detail: 'Техническата основа е готова — фокус върху дали AI ви цитира спрямо конкурентите.',
      owner: 'system',
    });
    if (!immediate.some((s) => s.action === 'monitor_smoke')) {
      long_term.push({
        action: 'monitor_smoke',
        title: 'Периодичен Agent-Native smoke',
        detail: 'Поддържайте Level 4–5 след CMS/deploy промени.',
        owner: 'system',
      });
    }
  } else if ((strategy?.stats?.runCount ?? 0) === 0) {
    short_term.push({
      action: 'run_pipeline',
      title: 'Пълен pipeline след fixes',
      detail: 'Одит → въпроси → measure → стратегия с реални SOV данни.',
      owner: 'system',
    });
  }

  if ((deepAudit.missing_page_types ?? []).includes('faq')) {
    short_term.push({
      action: 'create_faq',
      title: 'Създайте FAQ страница',
      detail: 'Въпроси-ответи с марка и продукт — най-често цитиран формат от AI.',
      owner: 'you',
    });
  }

  const dispRate = strategy?.displacement?.displacement_rate ?? strategy?.displacement_rate;
  if (dispRate != null && dispRate >= 0.2) {
    short_term.push({
      action: 'refine_questions_displacement',
      title: 'Нови въпроси за конкурентно изместване',
      detail: `Displacement ${Math.round(dispRate * 100)}% — генерирайте comparative въпроси.`,
      owner: 'system',
    });
  }

  return {
    immediate: dedupeSteps(immediate).slice(0, 5),
    short_term: dedupeSteps(short_term).slice(0, 6),
    long_term: dedupeSteps(long_term).slice(0, 5),
  };
}

function dedupeSteps(steps) {
  const seen = new Set();
  return steps.filter((s) => {
    if (seen.has(s.action)) return false;
    seen.add(s.action);
    return true;
  });
}

function buildExecutiveSummary(ctx) {
  const {
    brand,
    maturity,
    deepAudit,
    originReady,
    agent,
    gaps,
    strengths,
    strategy,
  } = ctx;

  const pages = deepAudit.pages_fetched ?? 0;
  const crit = gaps.filter((g) => g.priority === 'critical').length;

  if (crit > 0) {
    const top = gaps.find((g) => g.priority === 'critical');
    return `${brand}: дълбок одит на ${pages} страници откри ${crit} критичен проблем. Първо: ${top?.title ?? 'поправете блокерите'}. След това ${strategy.immediate.length + strategy.short_term.length} стъпки в плана.`;
  }

  if (originReady) {
    return `${brand} е Agent-Native готов (${agent.smoke_label ?? 'Level ' + (agent.smoke_level ?? '?')}). Одитнахме ${pages} страници и ${deepAudit.sitemap_urls_found ?? 0} URL от sitemap. ${strengths.length} силни страни; фокус: AI измерване и мониторинг, не Edge прокси.`;
  }

  if (maturity === 'moderate' || maturity === 'advanced') {
    return `${brand}: ${pages} страници, ${strengths.length} силни страни и ${gaps.length} области за подобрение. ${MATURITY_LABELS[maturity]}. Приоритет: ${strategy.immediate[0]?.title ?? strategy.short_term[0]?.title ?? 'пълен pipeline'}.`;
  }

  return `${brand}: дълбок одит (${pages} стр., confidence ${deepAudit.pages_fetched >= 8 ? 'висока' : 'средна'}). ${gaps.length} gaps, ${strengths.length} strengths. Започнете с: ${strategy.immediate[0]?.title ?? strategy.short_term[0]?.title ?? 'технически одит'}.`;
}

/**
 * Load cached deep audit from latest diagnostic row.
 */
export async function loadLatestDeepAudit(db, domain) {
  if (!db || !domain) return null;
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const row = await db
    .prepare(`SELECT raw_json, probed_at FROM diagnostics WHERE domain = ? ORDER BY probed_at DESC LIMIT 1`)
    .bind(normalized)
    .first();
  if (!row?.raw_json) return null;
  try {
    const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json;
    if (!raw?.deep_audit) return null;
    return { ...raw.deep_audit, cached_at: row.probed_at };
  } catch {
    return null;
  }
}
