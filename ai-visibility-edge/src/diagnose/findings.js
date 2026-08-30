/**
 * Evidence-backed site weakness findings — probe + measurement + displacement.
 */

import { passageAutonomy } from './score.js';
import { enrichFindingsWithAutomation } from './findingsAutomation.js';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, ok: 3 };

/**
 * @param {object} input
 */
export function buildSiteFindings(input = {}) {
  const {
    probe,
    passage,
    brand,
    displacement,
    sov,
    observationQuality,
    cacheIndex,
    botHits,
    tenant,
    edgeActive = false,
  } = input;

  const findings = [];

  if (probe) {
    findings.push(...probeFindings(probe, passage, brand, edgeActive));
  }

  if (observationQuality?.total_observations > 0) {
    findings.push(...observationFindings(observationQuality));
  }

  if (displacement?.total_runs > 0) {
    findings.push(...displacementFindings(displacement, brand));
  }

  if (sov?.total_observations > 0) {
    findings.push(...sovFindings(sov));
  }

  if (cacheIndex?.cache_age_hours?.median != null) {
    findings.push(...cacheFindings(cacheIndex, botHits));
  }

  if (tenant && !edgeActive && probe && needsEdgeFromProbe(probe)) {
    findings.push(
      finding({
        id: 'edge_activate',
        category: 'technical',
        severity: 'info',
        title: 'Технически поправки през Edge Worker',
        impact: 'Robots, JSON-LD и canonical могат да се приложат без CMS — след CNAME.',
        evidence: {
          robots: probe.robots_ai_policy,
          jsonld_blocks: probe.jsonld_blocks,
          redirect_hops: probe.raw_json?.redirect_chain?.length ?? 1,
        },
        fix: {
          owner: 'system',
          steps: ['Натиснете „2. Приложи Edge“', 'Настройте CNAME (стъпка 7 в плана)', 'Обновете dashboard'],
        },
      }),
    );
  }

  if (tenant?.canary && !edgeActive) {
    findings.push(
      finding({
        id: 'edge_canary_pending',
        category: 'technical',
        severity: 'info',
        title: 'Edge Optimizer — активирайте CNAME',
        impact: `${tenant.apex_host ?? tenant.domain ?? 'Домейнът'} е маркиран за edge поправки.`,
        evidence: { canary: true },
        fix: {
          owner: 'system',
          steps: ['Dashboard → „2. Приложи Edge“ → CNAME → Worker'],
        },
      }),
    );
  }

  return {
    findings: enrichFindingsWithAutomation(sortFindings(findings), {
      probe,
      brand,
      tenant,
      edgeActive,
      worker_host: input.worker_host,
    }),
    summary: summarizeFindings(findings),
    categories: countByCategory(findings),
  };
}

function probeFindings(probe, passage, brand, edgeActive) {
  const out = [];
  const url = probe.raw_json?.final_url ?? `https://${probe.domain}/`;
  const chars = probe.html_text_chars ?? 0;
  const signals = probe.signals ?? {};
  const title = probe.raw_json?.title ?? null;
  const h1 = probe.raw_json?.h1 ?? null;
  const meta = probe.raw_json?.meta_description ?? null;

  if (probe.robots_ai_policy === 'disallow_all') {
    out.push(
      finding({
        id: 'robots_disallow_all',
        category: 'visibility',
        severity: 'critical',
        title: 'robots.txt блокира всички ботове',
        impact: 'AI crawlers не могат да четат сайта — нулева видимост независимо от съдържанието.',
        evidence: { url, robots_ai_policy: 'disallow_all', measured: 'User-agent: * + Disallow: /' },
        fix: {
          owner: edgeActive ? 'edge' : 'system',
          steps: edgeActive
            ? ['Edge вече може да обслужва robots.txt — потвърдете CNAME']
            : ['„2. Приложи Edge“ → CNAME → Allow за GPTBot/Google-Extended'],
        },
      }),
    );
  }

  const blocked = (probe.blocked_bots ?? []).filter(Boolean);
  if (blocked.length > 0 && probe.robots_ai_policy !== 'disallow_all') {
    out.push(
      finding({
        id: 'robots_blocks_ai_bots',
        category: 'visibility',
        severity: 'warning',
        title: `Блокирани AI ботове: ${blocked.slice(0, 4).join(', ')}`,
        impact: 'Блокираният bot няма достъп — няма да цитира съдържанието ви.',
        evidence: { blocked_bots: blocked, url: `https://${probe.domain}/robots.txt` },
        fix: {
          owner: 'you',
          steps: [
            'Отворете robots.txt',
            `Allow / за: ${blocked.slice(0, 3).join(', ')}`,
            'Или активирайте Edge managed robots.txt',
          ],
        },
      }),
    );
  }

  if (signals.noindex) {
    out.push(
      finding({
        id: 'meta_noindex',
        category: 'visibility',
        severity: 'critical',
        title: 'Страницата е с noindex',
        impact: 'Индексаторите и AI може да пропуснат страницата, дори при отворен robots.txt.',
        evidence: { url, noindex: true, title, h1 },
        fix: {
          owner: 'you',
          steps: [
            'Премахнете meta robots noindex или X-Robots-Tag: noindex',
            'Проверете CMS SEO настройки и staging middleware',
          ],
        },
      }),
    );
  }

  if ((probe.http_status ?? 0) < 200 || (probe.http_status ?? 0) >= 400) {
    out.push(
      finding({
        id: 'http_error',
        category: 'visibility',
        severity: 'critical',
        title: `HTTP ${probe.http_status || 'грешка'} на началната страница`,
        impact: 'Недостъпен сайт не може да бъде цитиран.',
        evidence: { url, http_status: probe.http_status },
        fix: { owner: 'you', steps: ['Проверете hosting, SSL certificate и redirects'] },
      }),
    );
  }

  if (signals.js_shell_suspect) {
    out.push(
      finding({
        id: 'js_shell',
        category: 'content',
        severity: 'critical',
        title: 'Страницата изглежда празна за ботове (JS shell)',
        impact: `HTML ~${signals.html_bytes} bytes, но само ${chars} символа текст — AI вижда празна страница.`,
        evidence: { url, html_bytes: signals.html_bytes, text_chars: chars, title, h1 },
        fix: {
          owner: 'you',
          steps: [
            'Добавете server-side rendered текст (SSR) или static HTML fallback',
            'Марка, продукти и цени трябва да са в HTML, не само в JavaScript',
          ],
        },
      }),
    );
  }

  if (chars < 200) {
    out.push(
      finding({
        id: 'thin_content_critical',
        category: 'content',
        severity: 'critical',
        title: `Критично малко текст: ${chars} символа`,
        impact: 'AI няма достатъчен материал за цитиране на homepage.',
        evidence: {
          url,
          text_chars: chars,
          sample: probe.raw_json?.text_sample?.slice(0, 150) ?? '',
          title,
          h1,
        },
        fix: {
          owner: 'you',
          steps: [
            `Добавете 3–5 параграфа с марката „${brand ?? probe.domain}“`,
            'Включете продукти/услуги и цени в лв или €',
            'Избягвайте „Добре дошли“ без контекст',
          ],
        },
      }),
    );
  } else if (chars < 500) {
    out.push(
      finding({
        id: 'thin_content',
        category: 'content',
        severity: 'warning',
        title: `Малко текст на homepage: ${chars} символа (препоръка ≥500)`,
        impact: 'Под прага — по-малко шанс AI да цитира конкретни факти.',
        evidence: { url, text_chars: chars, threshold: 500, title, h1 },
        fix: {
          owner: 'you',
          steps: ['Разширете началната страница с FAQ блок', 'Добавете цени и USP в plain HTML'],
        },
      }),
    );
  }

  if (brand && signals.brand_mentions === 0 && chars > 100) {
    out.push(
      finding({
        id: 'brand_absent',
        category: 'content',
        severity: 'warning',
        title: `Марката „${brand}“ липсва в видимия текст`,
        impact: 'AI моделите не ви свързват с текста на страницата.',
        evidence: { url, brand, text_chars: chars, title, h1 },
        fix: {
          owner: 'you',
          steps: [
            `Споменете „${brand}“ в първия параграф и H1`,
            'Добавете Organization schema с name и url',
          ],
        },
      }),
    );
  }

  if (brand && title && !titleMatchesBrand(title, brand)) {
    out.push(
      finding({
        id: 'title_brand_mismatch',
        category: 'content',
        severity: 'info',
        title: 'Заглавието не съдържа ясно марката',
        impact: 'AI може да обърка идентичността на сайта.',
        evidence: { title, brand, h1, url },
        fix: { owner: 'you', steps: [`<title> да включва „${brand}“ + основна услуга/ниша`] },
      }),
    );
  }

  if (!meta || meta.length < 40) {
    out.push(
      finding({
        id: 'weak_meta_description',
        category: 'content',
        severity: 'info',
        title: meta ? 'Кратко meta description' : 'Липсва meta description',
        impact: 'AI snippet-ите и търсачките имат малко контекст за страницата.',
        evidence: { meta_description: meta ?? '(липсва)', length: meta?.length ?? 0, url },
        fix: {
          owner: 'you',
          steps: ['120–160 символа: марка + какво предлагате + за кого + регион (BG)'],
        },
      }),
    );
  }

  if ((probe.jsonld_blocks ?? 0) === 0) {
    out.push(
      finding({
        id: 'missing_jsonld',
        category: 'technical',
        severity: 'warning',
        title: 'Липсва structured data (JSON-LD)',
        impact: 'Моделите разчитат на schema за продукт, организация и цени.',
        evidence: { url, jsonld_blocks: 0, jsonld_types: probe.raw_json?.jsonld_types ?? [] },
        fix: {
          owner: edgeActive ? 'edge' : 'you',
          steps: edgeActive
            ? ['Edge ще инжектира schema след CNAME']
            : ['Добавете Organization/Product/LocalBusiness JSON-LD', 'Или активирайте Edge'],
        },
      }),
    );
  } else {
    const types = probe.raw_json?.jsonld_types ?? [];
    if (types.length > 0 && !hasUsefulSchema(types)) {
      out.push(
        finding({
          id: 'weak_jsonld_types',
          category: 'technical',
          severity: 'info',
          title: `JSON-LD типове без Organization/Product: ${types.join(', ')}`,
          impact: 'Има schema, но не помага за марка/оферта.',
          evidence: { jsonld_types: types, url },
          fix: { owner: 'you', steps: ['Добавете Organization или Product с name, url, description, offers'] },
        }),
      );
    }
  }

  if (!probe.has_canonical) {
    out.push(
      finding({
        id: 'missing_canonical',
        category: 'technical',
        severity: 'info',
        title: 'Липсва canonical URL',
        impact: 'AI може да цитира грешна версия при дублирани URL-и.',
        evidence: { url, redirect_chain: probe.raw_json?.redirect_chain ?? [] },
        fix: { owner: edgeActive ? 'edge' : 'you', steps: ['<link rel="canonical" href="..."> на финалния URL'] },
      }),
    );
  }

  if ((probe.price_tokens ?? 0) === 0 && chars >= 200) {
    out.push(
      finding({
        id: 'no_prices',
        category: 'content',
        severity: 'info',
        title: 'Няма видими цени в HTML текста',
        impact: 'AI рядко цитира конкретни оферти без цена в plain text.',
        evidence: { url, price_tokens: 0, text_chars: chars },
        fix: { owner: 'you', steps: ['Показвайте цени в лв/€ в HTML — не само в JS/cart widget'] },
      }),
    );
  }

  const pResult = passage ?? (probe.raw_json?.text_passage ? passageAutonomy(probe.raw_json.text_passage) : null);
  if (pResult && pResult.anaphora_starts > 0 && pResult.paragraphs > 0) {
    const bad = pResult.details?.filter((d) => d.anaphora_start)?.slice(0, 2) ?? [];
    out.push(
      finding({
        id: 'anaphora_paragraphs',
        category: 'content',
        severity: 'warning',
        title: `${pResult.anaphora_starts} параграфа започват с „това/той/затова“`,
        impact: 'AI цитира самостоятелни пасажи — анонимни изречения се пропускат.',
        evidence: {
          autonomy_score: pResult.score,
          samples: bad.map((d) => d.preview),
        },
        fix: {
          owner: 'you',
          steps: [
            'Преформулирайте: „[Марка] предлага…“ вместо „Това предлага…“',
            'Всяка секция да е разбираема без контекст от страницата',
          ],
        },
      }),
    );
  }

  if (signals.sitemap_ok === false) {
    out.push(
      finding({
        id: 'missing_sitemap',
        category: 'technical',
        severity: 'info',
        title: 'Липсва или недостъпен sitemap.xml',
        impact: 'Crawlers откриват по-бавно важни страници (FAQ, продукти).',
        evidence: { url: `https://${probe.domain}/sitemap.xml`, sitemap_ok: false },
        fix: { owner: 'you', steps: ['Публикувайте /sitemap.xml с ключови URL-и', 'Добавете в robots.txt'] },
      }),
    );
  }

  return out;
}

function observationFindings(oq) {
  const out = [];
  const total = oq.total_observations;

  if (oq.misattributed_count > 0) {
    const rate = Math.round(oq.misattribution_rate * 100);
    out.push(
      finding({
        id: 'misattributed_citations',
        category: 'citation',
        severity: rate >= 20 ? 'critical' : 'warning',
        title: `${oq.misattributed_count} грешно приписани цитата (${rate}%)`,
        impact: 'AI споменава вас, но с грешен URL, цена или контекст — вреди на доверието.',
        evidence: {
          misattributed: oq.misattributed_count,
          total,
          samples: oq.negative_samples?.filter((s) => s.class === 'MISATTRIBUTED').slice(0, 2),
        },
        fix: {
          owner: 'you',
          steps: [
            'Сверете цени и URL-и на цитираните страници с реалния сайт',
            'Добавете ясни canonical и structured data',
            'Пуснете повторен анализ след CMS промени',
          ],
        },
      }),
    );
  }

  if (oq.fabricated_count > 0) {
    out.push(
      finding({
        id: 'fabricated_urls',
        category: 'citation',
        severity: 'warning',
        title: `${oq.fabricated_count} измислени URL-и от AI`,
        impact: 'Моделът „измисля“ страници, които не съществуват — не е реална видимост.',
        evidence: {
          fabricated: oq.fabricated_count,
          samples: oq.negative_samples?.filter((s) => s.class === 'FABRICATED_URL').slice(0, 2),
        },
        fix: {
          owner: 'you',
          steps: [
            'Създайте липсващите страници или пренасочете 404',
            'Подобрете вътрешното linking към реални URL-и',
          ],
        },
      }),
    );
  }

  for (const m of oq.by_model ?? []) {
    if (m.runs_with_obs >= 3 && m.grounded === 0) {
      out.push(
        finding({
          id: `model_gap_${m.model}`,
          category: 'citation',
          severity: 'warning',
          title: `${m.model}: 0 проверени цитата при ${m.runs_with_obs} observations`,
          impact: 'Този модел не ви цитира с верифицируем източник.',
          evidence: { model: m.model, grounded: m.grounded, misattributed: m.misattributed },
          fix: {
            owner: 'you',
            steps: [
              'Добавете факти в plain HTML (не само marketing fluff)',
              `Сравнете отговорите на ${m.model} в секцията с въпроси`,
            ],
          },
        }),
      );
    }
  }

  if (oq.stale_cache?.count > 0 && oq.stale_cache.avg_age_hours > 72) {
    out.push(
      finding({
        id: 'stale_ai_cache',
        category: 'citation',
        severity: 'info',
        title: `Остарял AI кеш: ${oq.stale_cache.count} цитата с avg ${oq.stale_cache.avg_age_hours}ч`,
        impact: 'AI може да цитира стара версия на цени и текст.',
        evidence: oq.stale_cache,
        fix: { owner: 'system', steps: ['Публикувайте промени', 'Изчакайте re-crawl или форсирайте measure след Edge'] },
      }),
    );
  }

  return out;
}

function displacementFindings(displacement, brand) {
  const out = [];
  const rate = displacement.displacement_rate ?? 0;

  if (rate >= 0.15) {
    const topEvents = (displacement.events ?? []).slice(0, 3);
    out.push(
      finding({
        id: 'high_displacement',
        category: 'competition',
        severity: rate >= 0.3 ? 'critical' : 'warning',
        title: `Изместване ${Math.round(rate * 100)}% — конкуренти без вас`,
        impact: `${displacement.displaced_count}/${displacement.total_runs} пъти AI дава други марки вместо ${brand ?? displacement.domain}.`,
        evidence: {
          displaced_count: displacement.displaced_count,
          total_runs: displacement.total_runs,
          examples: topEvents.map((e) => ({
            question: e.question_text?.slice(0, 80),
            model: e.model,
            competitors: e.competitors_mentioned,
          })),
        },
        fix: {
          owner: 'you',
          steps: [
            'Прочетете примерните въпроси по-горе — добавете съдържание за тези intent-и',
            'Подобрете JSON-LD и FAQ за категорийни заявки',
            'Пуснете Auto-оптимизация за displacement въпроси',
          ],
        },
      }),
    );
  }

  if (displacement.by_model) {
    for (const [model, stats] of Object.entries(displacement.by_model)) {
      if (stats.total >= 3 && stats.rate >= 0.5) {
        out.push(
          finding({
            id: `displacement_${model}`,
            category: 'competition',
            severity: 'warning',
            title: `${model}: ${Math.round(stats.rate * 100)}% изместване`,
            impact: 'Този модел системно предпочита конкуренти.',
            evidence: stats,
            fix: { owner: 'you', steps: ['Анализирайте raw отговори за този модел', 'Добавете уникални факти, които моделът може да verify-не'] },
          }),
        );
      }
    }
  }

  return out;
}

function sovFindings(sov) {
  const share = sov.share ?? sov.sov ?? 0;
  const pct = typeof share === 'number' && share <= 1 ? share * 100 : share;
  if (pct < 5 && (sov.total_observations ?? 0) >= 5) {
    return [
      finding({
        id: 'low_sov',
        category: 'competition',
        severity: 'warning',
        title: `Нисък дял в AI: ${Math.round(pct * 10) / 10}%`,
        impact: `${sov.tenant_citations ?? 0} ваши цитата от ${sov.total_observations} проверени.`,
        evidence: { sov_pct: pct, tenant_citations: sov.tenant_citations, total: sov.total_observations },
        fix: { owner: 'you', steps: ['Фокус върху слабостите от одита', 'Повторете измерване след 2–4 седмици'] },
      }),
    ];
  }
  return [];
}

function cacheFindings(cacheIndex, botHits) {
  const median = cacheIndex.cache_age_hours?.median;
  if (median != null && median > 96) {
    return [
      finding({
        id: 'high_cache_age',
        category: 'citation',
        severity: 'warning',
        title: `Стар AI кеш: median ${Math.round(median)} часа`,
        impact: 'Промените в сайта се отразяват бавно в AI отговори.',
        evidence: {
          median_hours: median,
          coverage: cacheIndex.coverage,
          bot_verified: botHits?.verified_hits ?? 0,
        },
        fix: {
          owner: 'both',
          steps: [
            'Активирайте Edge bot log (CNAME)',
            'Добавете dateModified в HTML или sitemap lastmod',
          ],
        },
      }),
    ];
  }
  return [];
}

function finding(fields) {
  return {
    ...fields,
    fix: fields.fix ?? { owner: 'you', steps: [] },
    evidence: fields.evidence ?? {},
  };
}

function sortFindings(items) {
  return [...items].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
}

function summarizeFindings(findings) {
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const warning = findings.filter((f) => f.severity === 'warning').length;
  if (findings.length === 0) return 'Не са открити значими слабости — продължете измерване.';
  if (critical > 0) return `${critical} критични + ${warning} предупреждения — поправете преди да очаквате AI цитиране.`;
  if (warning > 0) return `${warning} области за подобрение + ${findings.length - warning} допълнителни сигнала.`;
  return `${findings.length} препоръки за оптимизация.`;
}

function countByCategory(findings) {
  const c = {};
  for (const f of findings) c[f.category] = (c[f.category] ?? 0) + 1;
  return c;
}

function titleMatchesBrand(title, brand) {
  const t = title.toLowerCase();
  const b = brand.toLowerCase();
  return t.includes(b) || b.split(/\s+/).some((w) => w.length > 3 && t.includes(w));
}

function hasUsefulSchema(types) {
  const useful = /Organization|Product|LocalBusiness|Store|WebSite|FAQPage|Brand/i;
  return types.some((t) => useful.test(t));
}

function needsEdgeFromProbe(probe) {
  if (probe.robots_ai_policy === 'disallow_all') return true;
  if ((probe.jsonld_blocks ?? 0) === 0) return true;
  if (probe.robots_ai_policy === 'none' || probe.robots_ai_policy === 'fetch_error') return true;
  return (probe.raw_json?.redirect_chain?.length ?? 1) > 1;
}

/** Map findings to legacy recommendation shape for API compat */
export function findingsToRecommendations(findings) {
  return findings.map((f) => ({
    id: f.id,
    severity: f.severity,
    owner: f.fix.owner === 'edge' ? 'edge' : f.fix.owner === 'system' ? 'system' : 'you',
    layer: mapFindingLayer(f),
    title: f.title,
    what: f.impact,
    why: f.impact,
    action: f.fix.steps.join(' → '),
    evidence: f.evidence,
  }));
}

function mapFindingLayer(f) {
  if (f.id.startsWith('edge_') || f.id.includes('robots') || f.id === 'missing_jsonld') return 'edge';
  if (f.category === 'visibility' || f.category === 'technical') return 'edge';
  if (f.category === 'content') return 'on_site';
  if (f.category === 'citation' || f.category === 'competition') return 'content';
  return f.category;
}

export function buildScoreBreakdown(probe, passage, findings) {
  const categories = {
    visibility: 0,
    content: 0,
    technical: 0,
    citation: 0,
  };
  for (const f of findings) {
    if (f.severity === 'critical') categories[f.category] = (categories[f.category] ?? 0) + 3;
    else if (f.severity === 'warning') categories[f.category] = (categories[f.category] ?? 0) + 2;
    else if (f.severity === 'info') categories[f.category] = (categories[f.category] ?? 0) + 1;
  }
  return {
    probe_score_inputs: {
      http_ok: (probe?.http_status ?? 0) >= 200 && (probe?.http_status ?? 0) < 400,
      text_chars: probe?.html_text_chars ?? 0,
      jsonld: probe?.jsonld_blocks ?? 0,
      passage_score: passage?.score ?? null,
    },
    issue_weight_by_category: categories,
    critical_count: findings.filter((f) => f.severity === 'critical').length,
  };
}
