/**
 * Actionable recommendations from probe, displacement, and SOV data.
 * Separates what the user fixes on-site vs what the edge layer can do (Block 4).
 */

export const INFO_MODULES = [
  {
    id: 'measurement',
    title: 'Измерване (Runs)',
    icon: '📊',
    what: 'Системата задава реални BG въпроси на OpenAI и Gemini (Perplexity — опционално) и записва пълните отговори в D1.',
    why: 'Без raw данни няма индекс, SOV или доказуема история. Baseline от ден нула не може да се възстанови — това е основният актив.',
    status: 'active',
  },
  {
    id: 'verify_classify',
    title: 'Verify + Classify (Observations)',
    icon: '🔍',
    what: 'Reprocess проверява всеки цитат по пасаж: дали URL-ът съществува, дали текстът съвпада, и класифицира (direct / indirect / none).',
    why: 'AI може да „цитира“ несъществуващи или грешни източници. Verify отделя реална видимост от халюцинация.',
    status: 'active',
  },
  {
    id: 'sov',
    title: 'Share of Voice (SOV)',
    icon: '📈',
    what: 'Доля от observations, в които вашият домейн е цитиран спрямо конкурентите в същата вертикал.',
    why: 'Показва дали AI ви препоръчва или системно изброява други марки. Нужни са седмици данни за стабилен тренд.',
    status: 'active',
  },
  {
    id: 'displacement',
    title: 'Displacement (Изместване)',
    icon: '⚠️',
    what: 'Открива случаи, когато моделът изброява конкуренти, но вашият домейн липсва в отговора.',
    why: 'Това е най-директният сигнал за загубена видимост — клиентът пита за категорията, AI дава други марки.',
    status: 'active',
  },
  {
    id: 'probe',
    title: 'Probe (Техническа диагностика)',
    icon: '🩺',
    what: 'HTTP проверка на сайта: robots.txt, JSON-LD, canonical, обем текст, цени.',
    why: 'AI не може да цитира съдържание, което не може да прочете. robots disallow_all = нулева видимост независимо от маркетинг.',
    status: 'active',
  },
  {
    id: 'edge',
    title: 'Edge Optimizer (Блок 4)',
    icon: '⚡',
    what: 'Worker proxy + автоматични поправки (robots, JSON-LD) след CNAME.',
    why: 'Git → deploy → live. Подходящ за serverless сайтове (Worker origin).',
    status: 'active',
  },
];

export const USER_CHECKLIST = [
  {
    id: 'secrets',
    title: 'GitHub Secrets (еднократно)',
    owner: 'you',
    done_when: 'aiv-deploy минава зелено',
    items: [
      'CF_ACCOUNT_ID, CF_API_TOKEN, KV_NAMESPACE_ID',
      'OPENAI_API_KEY, GEMINI_API_KEY',
      'Опционално: PERPLEXITY_API_KEY, ADMIN_TOKEN',
    ],
  },
  {
    id: 'deploy',
    title: 'Deploy след merge',
    owner: 'you',
    done_when: 'Dashboard показва D1 „Свързана“',
    items: [
      'GitHub Actions → aiv-deploy → Run workflow на main',
      'Провери /health → db: true',
    ],
  },
  {
    id: 'baseline',
    title: 'Baseline collect (исторически актив)',
    owner: 'you',
    done_when: 'KV manifest + D1 import завършени',
    items: [
      'GitHub Actions → aiv-baseline-collect (import_only=false)',
      'Очаквано: ~40 runs, 500+ observations след reprocess',
    ],
  },
  {
    id: 'monitoring',
    title: 'Натрупване на данни (4+ седмици)',
    owner: 'system',
    done_when: 'SOV и displacement имат тренд',
    items: [
      'Cron: понеделник 03:00 UTC — автоматични runs',
      'Reprocess след всеки collect (бутон в dashboard)',
    ],
  },
  {
    id: 'onsite_fixes',
    title: 'On-site поправки (съдържание)',
    owner: 'you',
    done_when: 'Probe score > 70, достатъчно текст',
    items: [
      'Разширете homepage с описателни параграфи (марка, ползи, цени)',
      'Самостоятелни пасажи с марка + цена (не „това“, „той“)',
      'Технически слой (robots, JSON-LD) — през Edge Worker, не CMS',
    ],
  },
  {
    id: 'workflow',
    title: 'Автоматичен pipeline',
    owner: 'system',
    done_when: 'Всички стъпки зелени в таб Автоматизация',
    items: [
      'Изберете сайт → Pipeline показва статус',
      'Одит + въпроси + reprocess от бутоните',
      'Ръчна намеса: редакция на въпроси, одобрение на действия',
    ],
  },
];

/**
 * @param {object} input
 * @param {object} [input.probe]
 * @param {object} [input.displacement]
 * @param {object} [input.sov]
 * @param {object} [input.tenant]
 * @param {boolean} [input.edgeActive]
 */
export function buildRecommendations(input = {}) {
  const { probe, displacement, sov, tenant, edgeActive = false } = input;
  const items = [];

  if (probe) {
    if (probe.robots_ai_policy === 'disallow_all') {
      items.push(reco({
        id: 'robots_disallow_all',
        severity: 'critical',
        owner: edgeActive ? 'edge' : 'system',
        layer: 'edge',
        title: 'robots.txt блокира всички ботове',
        what: 'User-agent: * с Disallow: / — AI crawlers не могат да четат сайта.',
        why: 'Нулева AI видимост. Edge Worker може да обслужва robots.txt без CMS промяна.',
        action: edgeActive
          ? 'Edge обслужва robots.txt — активен след CNAME.'
          : 'Стартирайте анализ → „Приложи Edge“ → CNAME към Worker.',
      }));
    } else if (probe.robots_ai_policy === 'ai_rules_present') {
      const blocked = probe.blocked_bots ?? [];
      if (blocked.length > 0) {
        items.push(reco({
          id: 'robots_blocks_ai',
          severity: 'warning',
          owner: 'you',
          layer: 'on_site',
          title: `robots.txt блокира: ${blocked.slice(0, 3).join(', ')}`,
          what: 'Има специфични правила за AI ботове.',
          why: 'Блокираният bot няма достъп до съдържанието — няма да го цитира.',
          action: 'Преценете дали да Allow-нете GPTBot / Google-Extended / anthropic-ai.',
        }));
      }
    }

    if ((probe.http_status ?? 0) < 200 || (probe.http_status ?? 0) >= 400) {
      items.push(reco({
        id: 'http_error',
        severity: 'critical',
        owner: 'you',
        layer: 'on_site',
        title: `HTTP ${probe.http_status || 'грешка'} на началната страница`,
        what: 'Probe не получи валиден HTML отговор.',
        why: 'AI не може да цитира недостъпен сайт.',
        action: 'Проверете hosting, SSL и redirects.',
      }));
    }

    if ((probe.jsonld_blocks ?? 0) === 0) {
      items.push(reco({
        id: 'missing_jsonld',
        severity: 'warning',
        owner: edgeActive ? 'edge' : 'you',
        layer: edgeActive ? 'edge' : 'on_site',
        title: 'Липсва JSON-LD structured data',
        what: 'Няма <script type="application/ld+json"> блокове.',
        why: 'Structured data помага на моделите да извлекат продукт, цена и организация.',
        action: edgeActive
          ? 'Edge ще инжектира JSON-LD (Блок 4).'
          : 'Добавете Product/Organization schema в CMS или активирайте Edge Optimizer.',
      }));
    }

    if (!probe.has_canonical) {
      items.push(reco({
        id: 'missing_canonical',
        severity: 'info',
        owner: edgeActive ? 'edge' : 'system',
        layer: edgeActive ? 'edge' : 'on_site',
        title: 'Липсва canonical URL',
        what: 'HTML няма rel=canonical.',
        why: 'AI може да обърка дублирани URL-и и да цитира грешна страница.',
        action: edgeActive
          ? 'Edge инжектира canonical при redirect stub.'
          : 'Активирайте Edge или добавете <link rel="canonical"> в CMS.',
      }));
    }

    if ((probe.html_text_chars ?? 0) < 500) {
      items.push(reco({
        id: 'thin_content',
        severity: 'warning',
        owner: 'you',
        layer: 'on_site',
        title: 'Малко извличаем текст на homepage',
        what: `Само ${probe.html_text_chars ?? 0} символа текст.`,
        why: 'Thin content = по-малко материал за цитиране от AI.',
        action: 'Добавете описателни параграфи с марка, продукти и цени.',
      }));
    }

    if ((probe.price_tokens ?? 0) === 0) {
      items.push(reco({
        id: 'no_prices',
        severity: 'info',
        owner: 'you',
        layer: 'on_site',
        title: 'Няма видими цени в текста',
        what: 'Probe не намери €/лв токени.',
        why: 'Цените в plain text увеличават шанса AI да цитира конкретни оферти.',
        action: 'Показвайте цени в HTML (не само в JS widget).',
      }));
    }
  }

  if (displacement && displacement.total_runs > 0) {
    const rate = displacement.displacement_rate ?? 0;
    if (rate >= 0.15) {
      items.push(reco({
        id: 'high_displacement',
        severity: rate >= 0.3 ? 'critical' : 'warning',
        owner: 'you',
        layer: 'content',
        title: `Високо изместване (${Math.round(rate * 100)}%)`,
        what: `${displacement.displaced_count} от ${displacement.total_runs} runs — конкуренти изброени, вие липсвате.`,
        why: 'AI системно препоръчва други марки във вашата категория.',
        action: 'Подобрете on-site съдържание + JSON-LD; или активирайте Edge Optimizer (CNAME).',
      }));
    } else if (displacement.tenant_present_count > 0) {
      items.push(reco({
        id: 'displacement_ok',
        severity: 'ok',
        owner: 'system',
        layer: 'measurement',
        title: 'Присъствие в AI отговори',
        what: `${displacement.tenant_present_count} runs с вашия домейн.`,
        why: 'Позитивен сигнал — продължавайте мониторинга.',
        action: 'Натрупвайте данни 4+ седмици за SOV тренд.',
      }));
    }
  }

  if (sov && sov.total_observations > 0) {
    const share = sov.share ?? 0;
    if (share < 0.05) {
      items.push(reco({
        id: 'low_sov',
        severity: 'warning',
        owner: 'you',
        layer: 'content',
        title: `Нисък SOV (${Math.round(share * 1000) / 10}%)`,
        what: `${sov.tenant_citations ?? 0} цитата от ${sov.total_observations} observations.`,
        why: 'Конкурентите доминират в AI препоръките за вертикала.',
        action: 'Фокус върху verify-нати цитати + on-site поправки от probe.',
      }));
    }
  }

  if (tenant?.canary && !edgeActive) {
    const host = tenant.domain ?? tenant.apex_host ?? 'домейна';
    items.push(reco({
      id: 'edge_canary_pending',
      severity: 'info',
      owner: 'system',
      layer: 'edge',
      title: 'Edge Optimizer — активирайте CNAME',
      what: `${host} е маркиран за edge поправки.`,
      why: 'Edge поправка изисква CNAME — без него Worker не обслужва HTML на домейна.',
      action: `Dashboard → „Приложи Edge“ → CNAME ${host} → Worker + Custom Hostname.`,
    }));
  }

  if (!edgeActive && probe && needsEdgeFix(probe)) {
    items.push(reco({
      id: 'edge_activate',
      severity: 'info',
      owner: 'system',
      layer: 'edge',
      title: 'Приложете Edge оптимизация',
      what: 'Probe откри технически проблеми, които Edge Worker поправя автоматично.',
      why: 'Оптимизацията минава през наш Cloudflare proxy — не през CMS на клиента.',
      action: 'Dashboard → „2. Приложи Edge“ → CNAME към Worker.',
    }));
  }

  return sortBySeverity(items);
}

function needsEdgeFix(probe) {
  if (probe.robots_ai_policy === 'disallow_all') return true;
  if ((probe.jsonld_blocks ?? 0) === 0) return true;
  if (probe.robots_ai_policy === 'none' || probe.robots_ai_policy === 'fetch_error') return true;
  const chain = probe.redirect_chain ?? probe.raw_json?.redirect_chain ?? [];
  return chain.length > 1;
}

export async function fetchTenantRecommendations(env, tenant, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const domain = tenant.domain;

  let probe = null;
  let displacement = null;
  let sov = null;

  try {
    const { probeDomain } = await import('./probe.js');
    probe = await probeDomain(domain, { fetch: fetchImpl });
  } catch (err) {
    probe = { domain, error: err.message };
  }

  if (env.DB) {
    try {
      const { analyzeDisplacement } = await import('./displacement.js');
      displacement = await analyzeDisplacement(env.DB, {
        domain,
        verticalId: tenant.vertical_id,
      });
    } catch {
      /* optional */
    }

    try {
      const { computeSov, currentPeriod } = await import('../index/sov.js');
      sov = await computeSov(env.DB, {
        domain,
        verticalId: tenant.vertical_id,
        period: currentPeriod(),
      });
    } catch {
      /* optional */
    }
  }

  const recommendations = buildRecommendations({
    probe,
    displacement,
    sov,
    tenant,
    edgeActive: options.edgeActive ?? false,
  });

  return {
    domain,
    name: tenant.name,
    canary: tenant.canary,
    probe_summary: probe
      ? {
          score_hint: probe.robots_ai_policy,
          http_status: probe.http_status,
          jsonld_blocks: probe.jsonld_blocks,
          html_text_chars: probe.html_text_chars,
        }
      : null,
    displacement_rate: displacement?.displacement_rate ?? null,
    sov_share: sov?.share ?? null,
    recommendations,
  };
}

function reco(fields) {
  return fields;
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, ok: 3 };

function sortBySeverity(items) {
  return [...items].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );
}
