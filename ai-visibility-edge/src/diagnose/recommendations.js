/**
 * Actionable recommendations from probe, displacement, and SOV data.
 * Separates what the user fixes on-site vs what the edge layer can do (Block 4).
 */

import { buildSiteFindings, findingsToRecommendations } from './findings.js';

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
  const pack = buildSiteFindings(input);
  return findingsToRecommendations(pack.findings);
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
