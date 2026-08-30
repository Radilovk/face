/**
 * Plain-language optimization strategy — verdict, pillars, timed action plan.
 * Turns probe/displacement/SOV into what the operator should do next.
 */

import { buildRecommendations } from './recommendations.js';
import { buildSiteFindings, buildScoreBreakdown, findingsToRecommendations } from './findings.js';
import { loadObservationQuality } from './observationQuality.js';
import { probeDomain } from './probe.js';
import { passageAutonomy, computeDiagnosticScore } from './score.js';
import { analyzeDisplacement } from './displacement.js';
import { computeSov, currentPeriod } from '../index/sov.js';
import { loadEdgeConfig } from '../config/tenantEdge.js';

export const PILLARS = [
  { id: 'visibility', label: 'Видимост', icon: '👁' },
  { id: 'content', label: 'Съдържание', icon: '📝' },
  { id: 'citation', label: 'AI цитиране', icon: '🤖' },
  { id: 'competition', label: 'Конкуренция', icon: '⚔️' },
];

/**
 * @param {object} input
 * @param {object} [input.probe]
 * @param {object} [input.passage]
 * @param {number} [input.diagnostic_score]
 * @param {object} [input.displacement]
 * @param {object} [input.sov]
 * @param {object} [input.tenant]
 * @param {boolean} [input.registered]
 * @param {number} [input.questionCount]
 * @param {number} [input.runCount]
 */
export function buildStrategy(input = {}) {
  const {
    probe,
    passage,
    diagnostic_score,
    displacement,
    sov,
    tenant,
    registered = false,
    questionCount = 0,
    runCount = 0,
    edgeActive = false,
    edgeStatus = 'measurement_only',
    observationQuality = null,
    worker_host,
  } = input;

  const brand = tenant?.name ?? null;
  const findingsPack = buildSiteFindings({
    probe,
    passage,
    brand,
    displacement,
    sov,
    observationQuality,
    tenant,
    edgeActive,
    worker_host,
  });

  const recommendations = findingsToRecommendations(findingsPack.findings);
  const scoreBreakdown = buildScoreBreakdown(probe, passage, findingsPack.findings);

  const verdict = buildVerdict(probe, passage, diagnostic_score, displacement, sov, runCount, findingsPack);
  const pillars = buildPillars(probe, passage, displacement, sov, runCount);
  const plan = buildActionPlan(probe, recommendations, displacement, sov, {
    registered,
    questionCount,
    runCount,
    domain: tenant?.apex_host ?? probe?.domain,
    brand: tenant?.name,
    edgeActive,
    edgeStatus,
  });
  const pipeline = buildPipelineGuide({
    registered,
    probe,
    questionCount,
    runCount,
    displacement,
    recommendations,
    edgeActive,
  });

  return {
    domain: tenant?.apex_host ?? probe?.domain ?? null,
    brand: tenant?.name ?? null,
    registered,
    score: diagnostic_score ?? null,
    edge_active: edgeActive,
    edge_status: edgeStatus,
    verdict,
    pillars,
    plan,
    pipeline,
    findings: findingsPack.findings,
    findings_summary: findingsPack.summary,
    findings_categories: findingsPack.categories,
    score_breakdown: scoreBreakdown,
    top_issues: findingsPack.findings.filter((f) => f.severity !== 'ok').slice(0, 8),
    recommendations,
    generated_at: new Date().toISOString(),
  };
}

function buildVerdict(probe, passage, score, displacement, sov, runCount, findingsPack = null) {
  if (!probe) {
    return {
      level: 'unknown',
      headline: 'Няма данни за сайта',
      summary: 'Добавете домейн и стартирайте анализ.',
    };
  }

  if (probe.signals?.noindex) {
    return {
      level: 'critical',
      headline: 'Страницата е маркирана noindex',
      summary: 'Индексаторите и AI може да пропуснат сайта. Премахнете noindex от meta robots или HTTP headers.',
    };
  }

  if (probe.signals?.js_shell_suspect) {
    return {
      level: 'critical',
      headline: 'Сайтът е празен за ботове (JavaScript shell)',
      summary: `HTML е голям, но текстът е само ${probe.html_text_chars ?? 0} символа — AI вижда празна страница. Нужен SSR или static HTML с марка и факти.`,
    };
  }

  if (probe.robots_ai_policy === 'disallow_all') {
    return {
      level: 'critical',
      headline: 'AI ботовете не могат да четат сайта',
      summary: 'robots.txt блокира всички crawlers — нулева видимост в ChatGPT, Gemini и др. Първо поправете robots.txt.',
    };
  }

  if ((probe.http_status ?? 0) < 200 || (probe.http_status ?? 0) >= 400) {
    return {
      level: 'critical',
      headline: 'Сайтът не отговаря коректно',
      summary: `HTTP ${probe.http_status ?? 'грешка'} — AI не може да извлече съдържание. Проверете hosting и SSL.`,
    };
  }

  const chars = probe.html_text_chars ?? 0;
  if (chars < 200) {
    return {
      level: 'critical',
      headline: 'Landing страницата е почти празна за AI',
      summary: `Само ${chars} символа текст — моделите няма какво да цитират. Добавете описание на продукта, ползи и цени.`,
    };
  }

  if (runCount === 0) {
    return {
      level: 'warning',
      headline: score != null && score < 60 ? 'Технически проблеми — още няма AI измерване' : 'Сайтът е достъпен, но още не е измерен в AI',
      summary:
        score != null && score < 60
          ? `Оценка ${score}/100. Поправете съдържанието и стартирайте измерване, за да видите дали AI ви препоръчва.`
          : 'Стартирайте пълен анализ — системата ще зададе въпроси на OpenAI/Gemini и ще покаже дали ви цитират.',
    };
  }

  const dispRate = displacement?.displacement_rate ?? 0;
  if (dispRate >= 0.25) {
    return {
      level: 'critical',
      headline: 'Конкурентите ви изместват в AI отговорите',
      summary: `В ${Math.round(dispRate * 100)}% от случаите AI изброява други марки, а вас липсвате. Фокус: по-богато съдържание + structured data.`,
    };
  }

  const sovShare = sov?.share ?? sov?.sov ?? null;
  if (sovShare != null && sovShare < 0.05 && (sov?.total_observations ?? 0) > 5) {
    return {
      level: 'warning',
      headline: 'Нисък дял от AI препоръките',
      summary: `SOV ~${Math.round(sovShare * 1000) / 10}% — конкурентите доминират. Продължете оптимизацията по плана по-долу.`,
    };
  }

  if (score != null && score >= 70 && dispRate < 0.1) {
    return {
      level: 'ok',
      headline: 'Добра основа — продължете мониторинга',
      summary: `Оценка ${score}/100. Сайтът е четим за AI. Натрупвайте данни седмици, за да следите тренд.`,
    };
  }

  const findingSummary = findingsPack?.summary;
  return {
    level: score != null && score < 50 ? 'warning' : 'info',
    headline: score != null ? `Оценка ${score}/100 — ${findingsPack?.findings?.filter((f) => f.severity === 'critical').length ?? 0} критични слабости` : 'Анализът е готов',
    summary: findingSummary ?? 'Вижте „Открити слабости“ за прецизни поправки с доказателства.',
  };
}

function buildPillars(probe, passage, displacement, sov, runCount) {
  const visibility = pillarVisibility(probe);
  const content = pillarContent(probe, passage);
  const citation = pillarCitation(runCount, displacement, sov);
  const competition = pillarCompetition(displacement, sov);

  return [visibility, content, citation, competition];
}

function pillarVisibility(probe) {
  if (!probe) return status('visibility', 'unknown', 'Няма probe', '—');
  if (probe.robots_ai_policy === 'disallow_all') {
    return status('visibility', 'critical', 'robots.txt блокира ботовете', 'Премахнете Disallow: /');
  }
  if ((probe.http_status ?? 0) < 200 || (probe.http_status ?? 0) >= 400) {
    return status('visibility', 'critical', `HTTP ${probe.http_status}`, 'Поправете достъпността');
  }
  const blocked = probe.blocked_bots?.length ?? 0;
  if (blocked > 0) {
    return status('visibility', 'warning', `Блокирани: ${probe.blocked_bots.slice(0, 2).join(', ')}`, 'Allow за AI bots');
  }
  return status('visibility', 'ok', 'Сайтът е достъпен за crawlers', 'HTTP OK, robots не блокира');
}

function pillarContent(probe, passage) {
  if (!probe) return status('content', 'unknown', '—', '—');
  const chars = probe.html_text_chars ?? 0;
  if (chars < 200) {
    return status('content', 'critical', `Само ${chars} символа текст`, 'Добавете описателни параграфи');
  }
  if (chars < 500) {
    return status('content', 'warning', `${chars} символа — малко`, 'Разширете homepage и FAQ');
  }
  const missing = [];
  if ((probe.jsonld_blocks ?? 0) === 0) missing.push('JSON-LD');
  if (!probe.has_canonical) missing.push('canonical');
  if ((probe.price_tokens ?? 0) === 0) missing.push('цени');
  if (missing.length >= 2) {
    return status('content', 'warning', `Липсват: ${missing.join(', ')}`, 'Structured data + цени в HTML');
  }
  if (missing.length === 1) {
    return status('content', 'warning', `Липсва ${missing[0]}`, 'Добавете за по-добро цитиране');
  }
  const pScore = passage?.score ?? 50;
  if (pScore < 50) {
    return status('content', 'warning', 'Пасажите не са самостоятелни', 'Пишете с марка и контекст, не „това/той“');
  }
  return status('content', 'ok', 'Достатъчно съдържание', `${chars} символа, schema OK`);
}

function pillarCitation(runCount, displacement, sov) {
  if (runCount === 0) {
    return status('citation', 'pending', 'Още няма AI измерване', 'Стартирайте pipeline');
  }
  const present = displacement?.tenant_present_count ?? 0;
  const total = displacement?.total_runs ?? runCount;
  if (present === 0 && total > 0) {
    return status('citation', 'critical', 'Не сте споменати в отговорите', 'Подобрете съдържание + FAQ');
  }
  const rate = displacement?.displacement_rate ?? 0;
  if (rate >= 0.2) {
    return status('citation', 'warning', `${Math.round(rate * 100)}% изместване`, 'Конкуренти се цитират вместо вас');
  }
  const obs = sov?.total_observations ?? 0;
  const cites = sov?.tenant_citations ?? 0;
  if (obs > 0 && cites > 0) {
    return status('citation', 'ok', `${cites} верифицирани цитата`, 'Продължете мониторинга');
  }
  return status('citation', 'info', `${total} AI отговора записани`, 'Reprocess за observations');
}

function pillarCompetition(displacement, sov) {
  const total = displacement?.total_runs ?? 0;
  if (total === 0) {
    return status('competition', 'pending', 'Нужни са данни от измерване', 'След pipeline');
  }
  const rate = displacement?.displacement_rate ?? 0;
  const competitors = new Set();
  for (const e of displacement?.events ?? []) {
    for (const c of e.competitors_mentioned ?? []) competitors.add(c);
  }
  const names = [...competitors].slice(0, 3).join(', ');
  if (rate >= 0.25) {
    return status('competition', 'critical', names ? `Изпреварват: ${names}` : 'Високо изместване', 'Целево съдържание срещу конкуренти');
  }
  if (rate >= 0.1) {
    return status('competition', 'warning', names || 'Частично изместване', 'Добавете уникални selling points');
  }
  const share = sov?.share ?? sov?.sov ?? null;
  if (share != null && share >= 0.1) {
    return status('competition', 'ok', `SOV ~${Math.round(share * 1000) / 10}%`, 'Добра позиция в вертикала');
  }
  return status('competition', 'info', 'Няма силно изместване', 'Натрупайте повече runs');
}

function status(id, level, statusText, action) {
  const meta = PILLARS.find((p) => p.id === id) ?? { label: id, icon: '•' };
  return { id, label: meta.label, icon: meta.icon, level, status: statusText, action };
}

function buildActionPlan(probe, recommendations, displacement, sov, ctx) {
  const thisWeek = [];
  const thisMonth = [];
  let step = 1;

  if (!ctx.registered) {
    thisWeek.push(action(step++, 'register', 'Регистрирайте сайта в системата', 'high', 'you', '30 сек'));
  }

  if (ctx.runCount === 0) {
    thisWeek.push(action(step++, 'measure', 'Стартирайте пълен анализ (одит → въпроси → AI измерване)', 'high', 'system', '2–3 мин'));
  }

  if (!ctx.edgeActive && probe && hasEdgeFixableIssues(probe)) {
    thisWeek.unshift(
      action(
        step++,
        'activate_edge',
        'Приложете Edge оптимизация (Worker proxy)',
        'high',
        'system',
        'Dashboard → „2. Приложи Edge“ → CNAME. Без CMS промени — robots + JSON-LD автоматично.',
      ),
    );
  }

  for (const rec of recommendations.filter((r) => r.severity === 'critical' || r.severity === 'warning')) {
    const when = rec.layer === 'content' || rec.id === 'thin_content' ? 'this_week' : 'this_week';
    const item = action(step++, rec.id, rec.title, rec.severity === 'critical' ? 'high' : 'medium', rec.owner, rec.action);
    if (when === 'this_week') thisWeek.push(item);
    else thisMonth.push(item);
  }

  if (probe && (probe.html_text_chars ?? 0) < 500) {
    const exists = thisWeek.some((a) => a.id === 'thin_content');
    if (!exists) {
      thisWeek.unshift(
        action(
          step++,
          'expand_homepage',
          'Разширете началната страница',
          'high',
          'you',
          '3–5 параграфа: какво прави продуктът, за кого е, ключови ползи, цени. AI цитира самостоятелни пасажи с марка и контекст.',
        ),
      );
    }
  }

  if (probe && (probe.jsonld_blocks ?? 0) === 0 && !ctx.edgeActive) {
    const exists = thisWeek.some((a) => a.id === 'add_jsonld' || a.id === 'activate_edge');
    if (!exists) {
      thisWeek.push(
        action(
          step++,
          'add_jsonld',
          'JSON-LD — през Edge Worker (не CMS)',
          'medium',
          'system',
          '„Приложи Edge“ инжектира Organization/SoftwareApplication schema автоматично.',
        ),
      );
    }
  }

  if (ctx.questionCount < 5 && ctx.registered) {
    thisWeek.push(
      action(step++, 'questions', 'Прегледайте автоматичните въпроси (редактирайте при нужда)', 'medium', 'you', 'Въпросите симулират реални BG заявки към AI.'),
    );
  }

  if (ctx.runCount > 0 && (displacement?.displacement_rate ?? 0) >= 0.15) {
    thisMonth.push(
      action(
        step++,
        'compete_content',
        'Създайте страници срещу конкурентите',
        'high',
        'you',
        'FAQ и сравнения: „защо [марка] vs X“ — AI често изброява конкуренти при category въпроси.',
      ),
    );
  }

  thisMonth.push(
    action(step++, 'faq_page', 'Страница FAQ с конкретни въпроси и отговори', 'medium', 'you', 'Всяка Q&A двойка е потенциален пасаж за цитиране.'),
  );

  if (ctx.runCount > 0) {
    thisMonth.push(
      action(step++, 'remeasure', 'Повторете измерване след промените (2–4 седмици)', 'medium', 'system', 'Сравнете SOV и displacement преди/след.'),
    );
  }

  thisMonth.push(
    action(step++, 'monitor', 'Седмичен мониторинг (автоматичен cron)', 'low', 'system', 'Тренд в AI-SOV — не еднократен snapshot.'),
  );

  return { this_week: dedupeActions(thisWeek), this_month: dedupeActions(thisMonth) };
}

function action(step, id, title, priority, owner, detail) {
  return { step, id, title, priority, owner, detail };
}

function dedupeActions(list) {
  const seen = new Set();
  return list.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

function hasEdgeFixableIssues(probe) {
  if (!probe) return false;
  if (probe.robots_ai_policy === 'disallow_all') return true;
  if ((probe.jsonld_blocks ?? 0) === 0) return true;
  if (probe.robots_ai_policy === 'none' || probe.robots_ai_policy === 'fetch_error') return true;
  const chain = probe.redirect_chain ?? probe.raw_json?.redirect_chain ?? [];
  return chain.length > 1;
}

function buildPipelineGuide(ctx) {
  const steps = [
    { id: 'register', label: '1. Сайт', done: ctx.registered },
    { id: 'audit', label: '2. Одит', done: Boolean(ctx.probe) },
    { id: 'questions', label: '3. Въпроси', done: (ctx.questionCount ?? 0) >= 5 },
    { id: 'measure', label: '4. Измерване', done: (ctx.runCount ?? 0) > 0 },
    { id: 'strategy', label: '5. Стратегия', done: (ctx.recommendations?.length ?? 0) > 0 },
    { id: 'edge', label: '6. Edge', done: Boolean(ctx.edgeActive) },
  ];

  const current = steps.find((s) => !s.done)?.id ?? 'monitor';
  const labels = {
    register: 'Добавете домейна',
    audit: 'Стартирайте одит',
    questions: 'Генерирайте въпроси',
    measure: 'Пуснете AI измерване',
    strategy: 'Прегледайте стратегията',
    edge: 'Приложете Edge оптимизация',
    monitor: 'Мониторинг',
  };

  return {
    steps,
    current,
    next_action: labels[current] ?? 'Стартирайте анализ',
  };
}

/**
 * Fetch full strategy for a domain (D1 tenant or probe-only).
 */
export async function fetchDomainStrategy(env, domain, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const normalized = domain.replace(/^www\./, '').toLowerCase();

  let tenant = null;
  let questionCount = 0;
  let runCount = 0;

  if (env.DB) {
    tenant = await env.DB.prepare(
      `SELECT t.id, t.apex_host, t.name, t.edge_enabled, t.edge_status, wd.vertical_id
       FROM tenants t
       JOIN watched_domains wd ON wd.tenant_id = t.id AND wd.role = 'tenant'
       WHERE t.apex_host = ?`,
    )
      .bind(normalized)
      .first();

    if (tenant) {
      const qc = await env.DB.prepare(
        `SELECT COUNT(*) as n FROM questions WHERE tenant_id = ?`,
      )
        .bind(tenant.id)
        .first();
      questionCount = qc?.n ?? 0;

      const rc = await env.DB.prepare(
        `SELECT COUNT(*) as n FROM runs r
         JOIN questions q ON q.id = r.question_id
         WHERE q.tenant_id = ?`,
      )
        .bind(tenant.id)
        .first();
      runCount = rc?.n ?? 0;
    }
  }

  const probeResult = await probeDomain(normalized, {
    fetch: fetchImpl,
    brand: tenant?.name ?? undefined,
  });
  const passage = passageAutonomy(
    probeResult.raw_json?.text_passage ?? probeResult.raw_json?.text_sample ?? '',
  );
  const diagnosticScore = computeDiagnosticScore(probeResult, passage);

  let observationQuality = null;
  if (env.DB && tenant?.id) {
    try {
      observationQuality = await loadObservationQuality(env.DB, tenant.id, normalized);
    } catch {
      /* optional */
    }
  }

  let edgeActive = false;
  let edgeStatus = tenant?.edge_status ?? 'measurement_only';
  if (tenant) {
    const edgeConfig = await loadEdgeConfig(env, tenant.apex_host);
    edgeActive = Boolean(edgeConfig?.edge?.enabled) && Boolean(tenant.edge_enabled);
    if (edgeActive) edgeStatus = 'active';
  }

  let displacement = null;
  let sov = null;

  if (env.DB && tenant?.vertical_id) {
    try {
      displacement = await analyzeDisplacement(env.DB, {
        domain: tenant.apex_host,
        verticalId: tenant.vertical_id,
      });
    } catch {
      /* optional */
    }
    try {
      sov = await computeSov(env.DB, {
        domain: tenant.apex_host,
        verticalId: tenant.vertical_id,
        period: currentPeriod(),
      });
    } catch {
      /* optional */
    }
  }

  const strategy = buildStrategy({
    probe: probeResult,
    passage,
    diagnostic_score: diagnosticScore,
    displacement,
    sov,
    tenant,
    registered: Boolean(tenant),
    questionCount,
    runCount,
    edgeActive,
    edgeStatus,
    observationQuality,
    worker_host: options.worker_host ?? env?.WORKER_PUBLIC_HOST,
  });

  return {
    ...strategy,
    displacement: displacement
      ? {
          displacement_rate: displacement.displacement_rate,
          displaced_count: displacement.displaced_count,
          total_runs: displacement.total_runs,
        }
      : null,
    sov_summary: sov ? { sov: sov.sov, period: sov.period } : null,
    probe: {
      domain: probeResult.domain,
      http_status: probeResult.http_status,
      html_text_chars: probeResult.html_text_chars,
      jsonld_blocks: probeResult.jsonld_blocks,
      robots_ai_policy: probeResult.robots_ai_policy,
      has_canonical: probeResult.has_canonical,
      price_tokens: probeResult.price_tokens,
      blocked_bots: probeResult.blocked_bots,
      final_url: probeResult.raw_json?.final_url,
      redirect_chain: probeResult.raw_json?.redirect_chain ?? [],
      title: probeResult.raw_json?.title,
      meta_description: probeResult.raw_json?.meta_description,
      h1: probeResult.raw_json?.h1,
      jsonld_types: probeResult.raw_json?.jsonld_types,
      raw_json: {
        text_sample: probeResult.raw_json?.text_sample,
        title: probeResult.raw_json?.title,
        meta_description: probeResult.raw_json?.meta_description,
        h1: probeResult.raw_json?.h1,
        jsonld_types: probeResult.raw_json?.jsonld_types,
        final_url: probeResult.raw_json?.final_url,
      },
    },
    stats: { questionCount, runCount },
  };
}
