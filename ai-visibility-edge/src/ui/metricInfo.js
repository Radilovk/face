/**
 * Metric / index explanations for dashboard info buttons.
 */

export const METRIC_CATALOG = {
  diagnostic_score: {
    title: 'Диагностичен score (0–100)',
    icon: '🎯',
    what:
      'Комбинирана оценка от probe одита: robots достъп за AI, JSON-LD, обем четим HTML текст, canonical/redirect, price signals.',
    why:
      'Показва дали сайтът е технически „четим“ от AI crawlers. Нисък score = поправки преди да очаквате цитиране.',
    unit: 'точки',
  },
  runs: {
    title: 'Runs — AI отговори',
    icon: '📊',
    what:
      'Брой записани raw отговори от OpenAI/Gemini (Perplexity опционално) на вашите BG въпроси. Всеки run = един модел × един въпрос.',
    why:
      'Без runs няма observations, SOV или история. Това е суровият актив — baseline и трендове се градят от тук.',
    unit: 'броя',
  },
  observations: {
    title: 'Observations — верифицирани цитати',
    icon: '🔍',
    what:
      'Reprocess извлича URL цитати от AI отговорите и ги verify-ва (passage match, класификация: grounded / weak / misattributed).',
    why:
      'Отделя реално цитиране от AI „халюцинации“. SOV и displacement се смятат от observations, не от runs.',
    unit: 'броя',
  },
  sov: {
    title: 'SOV — Share of Voice',
    icon: '📈',
    what:
      'Доля от measurement sessions, в които вашият домейн е цитиран в периода (ISO седмица). Формула: runs_with_citation / sessions, cap 100%.',
    why:
      'Отговаря на „AI препоръчва ли нас или конкурентите?“. Стабилен тренд иска 4+ седмици данни.',
    unit: '%',
  },
  pending_reprocess: {
    title: 'Чака reprocess',
    icon: '⏳',
    what:
      'Runs с raw отговор, но без observations — още не са verify-нати и класифицирани.',
    why:
      'Докато pending > 0, SOV и displacement са непълни. Reprocess е без LLM cost (само HTTP verify).',
    unit: 'броя',
  },
  cache_median: {
    title: 'Cache age — median (часове)',
    icon: '⏱',
    what:
      'Median на възрастта на кешираното съдържание (bot hit ↔ observation correlate или dateModified от цитирана страница).',
    why:
      'AI моделите често ползват cached/indexed версии. По-стар cache = по-бавно отразяване на вашите промени.',
    unit: 'часа',
  },
  cache_p25: {
    title: 'Cache age — P25',
    icon: '📉',
    what: '25-ти перцентил на cache age — 25% от observations са по-„свежи“ от тази стойност.',
    why: 'Показва „добрата“ част от индекса — полезно при смес от свежи и остарели страници.',
    unit: 'часа',
  },
  cache_p75: {
    title: 'Cache age — P75',
    icon: '📈',
    what: '75-ти перцентил — 75% от observations са по-„стари“ от тази стойност.',
    why: 'Висок P75 = значителна част от AI вижда остаряло съдържание.',
    unit: 'часа',
  },
  cache_coverage: {
    title: 'Cache index покритие',
    icon: '🗂',
    what:
      'Доля observations с изчислен cache age в 72h прозореца (bot log correlate или dateModified).',
    why:
      'Под 50% = индексът е ориентир, не пълен. Нужни verified bot hits или dateModified в HTML.',
    unit: '%',
  },
  bot_verified: {
    title: 'Bot hits — verified',
    icon: '🤖',
    what:
      'Verified посещения от известни AI/crawler bots (GPTBot, Google-Extended и др.) през Edge bot log (7 дни).',
    why:
      'Доказва реален crawl на tenant трафик след CNAME. Корелира с cache-index за вашия домейн.',
    unit: 'броя',
  },
  bot_fake: {
    title: 'Bot hits — unverified',
    icon: '⚠️',
    what:
      'Заявки с bot User-Agent, но без Cloudflare bot verification flag — вероятно spoofed.',
    why:
      'Не се броят за cache correlate. Високо число = шум в логовете, не реален AI crawl.',
    unit: 'броя',
  },
  pillar_visibility: {
    title: 'Пиляр: Видимост',
    icon: '👁',
    what: 'Robots.txt политика, HTTP достъп, блокирани AI bots, техническа „отвореност“ към crawlers.',
    why: 'Ако AI не може да чете сайта, няма какво да цитира — първи слой преди content и SOV.',
    unit: 'статус',
  },
  pillar_content: {
    title: 'Пиляр: Съдържание',
    icon: '📝',
    what: 'Обем и автономност на HTML текст (passage autonomy), thin content, ценови сигнали.',
    why: 'AI цитира самостоятелни пасажи с марка/факти — не JS widget или празен root redirect.',
    unit: 'статус',
  },
  pillar_citation: {
    title: 'Пиляр: AI цитиране',
    icon: '🤖',
    what: 'Реални runs, observations, SOV и дали домейнът се появява в AI отговори.',
    why: 'Измерва резултата от оптимизацията — не само технически одит, а реална AI видимост.',
    unit: 'статус',
  },
  pillar_competition: {
    title: 'Пиляр: Конкуренция',
    icon: '⚔️',
    what: 'Displacement — AI изброява конкуренти от вертикала, но не и вашия домейн.',
    why: 'Директен сигнал за изгубена видимост в category queries — приоритет за content и measure.',
    unit: 'статус',
  },
  displacement_rate: {
    title: 'Displacement rate',
    icon: '⚠️',
    what:
      'Доля runs, в които конкуренти са споменати, а tenant домейнът липсва (при tracked competitors).',
    why:
      'Най-директният KPI за „изместване“ — клиентът пита за категорията, AI дава други марки.',
    unit: '%',
  },
  baseline_gate: {
    title: 'Baseline (Блок 0.1)',
    icon: '📦',
    what:
      'Исторически snapshot на AI отговори (20×2+ модела) в KV/D1 — референция за delta и SOV тренд.',
    why:
      'Без baseline не може да се докаже промяна след оптимизация. Седмичен collect пази версионирана история.',
    unit: 'статус',
  },
  drift: {
    title: 'Drift детектори',
    icon: '🔔',
    what:
      'Автоматични аларми: stale runs, adapter schema drift, config expiry, bot log аномалии.',
    why:
      'Хваща „тихо разваляне“ — изключен cron, променен API формат, липса на measurement.',
    unit: 'аларми',
  },
  edge_status: {
    title: 'Edge оптимизация',
    icon: '⚡',
    what:
      'Cloudflare Worker proxy: auto JSON-LD, robots.txt, canonical — без CMS промени след CNAME.',
    why:
      'Технически fixes live за всички посетители и bots. Различно от marketing copy (CMS).',
    unit: 'статус',
  },
  optimizer: {
    title: 'Автономна оптимизация',
    icon: '🤖',
    what:
      'Gemini + правила изпълняват pipeline, edge activate, content drafts. Човек само при DNS/CMS.',
    why:
      'Минимизира ръчни стъпки — един бутон за measure → fix → draft цикъл.',
    unit: 'режим',
  },
  questions: {
    title: 'Въпроси за измерване',
    icon: '❓',
    what:
      'Curated BG въпроси (manual/auto/Gemini site-aware) — какво питаме AI моделите за вашата ниша.',
    why:
      'Качеството на въпросите определя релевантността на SOV. Лош въпрос = безполезен run.',
    unit: 'броя',
  },
};

export function interpretMetricNow(id, ctx = {}) {
  const m = METRIC_CATALOG[id];
  if (!m) return 'Няма описание за този индекс.';

  function n(v) {
    if (v == null || Number.isNaN(Number(v))) return null;
    return Number(v);
  }

  switch (id) {
    case 'diagnostic_score': {
      const s = n(ctx.value);
      if (s == null) return 'Още няма одит — пуснете анализ.';
      if (s >= 75) return `${s}/100 — добър технически фундамент; фокус върху measure и content.`;
      if (s >= 50) return `${s}/100 — среден; има конкретни probe fixes (robots, JSON-LD, текст).`;
      return `${s}/100 — критични блокери; AI вероятно не може да чете/цитира сайта.`;
    }
    case 'runs': {
      const v = n(ctx.value);
      if (!v) return '0 runs — пуснете анализ или Auto-оптимизация за първи AI snapshot.';
      if (v < 10) return `${v} runs — пилот; достатъчно за тест, малко за SOV тренд.`;
      if (v < 40) return `${v} runs — добър старт; продължете седмичния cron.`;
      return `${v} runs — солидна база за SOV, displacement и cache-index.`;
    }
    case 'observations': {
      const v = n(ctx.value);
      const runs = n(ctx.runs);
      if (!v) return runs ? 'Runs има, но липсват observations — натиснете Reprocess.' : 'Няма verify-нати цитати.';
      return `${v} observations — ${runs ? Math.round((v / runs) * 100) : '—'}% от runs са класифицирани.`;
    }
    case 'sov': {
      const v = n(ctx.value);
      if (v == null) return 'SOV изисква observations + vertical — нужни са повече runs.';
      if (v === 0) return '0% — домейнът не се цитира в текущия период; проверете displacement и content.';
      if (v < 15) return `${v.toFixed(1)}% — слабо присъствие; конкуренти вероятно доминират.`;
      if (v < 40) return `${v.toFixed(1)}% — умерена видимост; оптимизацията има ефект.`;
      return `${v.toFixed(1)}% — силно AI присъствие в вертикала за този период.`;
    }
    case 'pending_reprocess': {
      const v = n(ctx.value);
      if (!v) return '0 — всички runs са обработени; SOV е актуален.';
      return `${v} runs чакат verify — SOV/displacement са занижени докато не пуснете Reprocess.`;
    }
    case 'cache_median': {
      const v = n(ctx.value);
      if (v == null) return 'Няма correlate данни — нужни bot hits или dateModified в HTML.';
      if (v < 24) return `Median ${v.toFixed(1)}h — относително свеж AI cache.`;
      if (v < 72) return `Median ${v.toFixed(1)}h — умерено остаряване; промените се отразяват за 1–3 дни.`;
      return `Median ${v.toFixed(1)}h — стар cache; AI може да цитира outdated версия.`;
    }
    case 'cache_p25':
    case 'cache_p75': {
      const v = n(ctx.value);
      if (v == null) return 'Изчислява се след cache-index correlate.';
      return `${v.toFixed(1)} часа — перцентил в 72h прозореца на observations.`;
    }
    case 'cache_coverage': {
      const v = n(ctx.value);
      if (v == null) return 'Няма покритие — insufficient bot/dateModified signals.';
      if (v < 30) return `${Math.round(v)}% — ниско; cache-index е ориентир, не пълен.`;
      if (v < 70) return `${Math.round(v)}% — частично; добавете Edge bot log (CNAME).`;
      return `${Math.round(v)}% — добро покритие за cache age анализ.`;
    }
    case 'bot_verified': {
      const v = n(ctx.value);
      if (!v) return '0 verified hits — CNAME + Edge bot log или изчакайте crawl.';
      return `${v} verified bot visits (7d) — реален AI/crawler трафик към tenant.`;
    }
    case 'bot_fake': {
      const v = n(ctx.value);
      if (!v) return '0 — няма spoofed bot UA шум.';
      return `${v} unverified — вероятно fake bots; не влияят на cache-index.`;
    }
    case 'pillar_visibility':
    case 'pillar_content':
    case 'pillar_citation':
    case 'pillar_competition':
      return ctx.status
        ? `Сега: ${ctx.status}${ctx.action ? ' → ' + ctx.action : ''}`
        : 'Заредете стратегия за актуален статус на пилара.';
    case 'displacement_rate': {
      const v = n(ctx.value);
      if (v == null) return 'Нужни са runs + tracked competitors във vertical.';
      if (v >= 0.4) return `${Math.round(v * 100)}% displacement — често изброяват конкуренти без вас.`;
      if (v >= 0.15) return `${Math.round(v * 100)}% — периодично изместване; content + measure приоритет.`;
      return `${Math.round(v * 100)}% — ниско изместване в текущите данни.`;
    }
    case 'baseline_gate':
      return ctx.message ?? 'Baseline gate — вижте banner за pilot/closed статус.';
    case 'drift':
      return ctx.message ?? (ctx.critical ? 'Critical drift — проверете алармите.' : 'Системата е стабилна.');
    case 'edge_status':
      return ctx.message ?? 'Edge — вижте panel за fixes и CNAME стъпки.';
    case 'optimizer':
      return ctx.message ?? 'Auto-оптимизация — вижте plan и human gates.';
    case 'questions': {
      const v = n(ctx.value);
      if (!v) return 'Няма въпроси — Auto-генерирай или пуснете анализ.';
      if (v < 5) return `${v} въпроса — минимум 5 за стабилен tenant measure.`;
      return `${v} въпроса — OK за pipeline measure.`;
    }
    default:
      return m.what;
  }
}

const PILLAR_METRIC_IDS = {
  visibility: 'pillar_visibility',
  content: 'pillar_content',
  citation: 'pillar_citation',
  competition: 'pillar_competition',
};

export function pillarMetricId(pillarId) {
  return PILLAR_METRIC_IDS[pillarId] ?? 'pillar_visibility';
}

/** Strip esbuild keepNames helpers so injected script runs in the browser. */
export function sanitizeMetricClientFn(source) {
  return source
    .replace(/^export function interpretMetricNow/, 'function interpretMetricNow')
    .replace(/\/\* @__PURE__ \*\/ __name\(([^,]+),\s*"[^"]+"\)/g, '$1')
    .replace(/__name\([^)]+\);\s*/g, '');
}

export function buildMetricInfoClientScript() {
  const fnBody = sanitizeMetricClientFn(interpretMetricNow.toString());
  return `const METRIC_CATALOG = ${JSON.stringify(METRIC_CATALOG)};\n${fnBody}\nconst PILLAR_METRIC_IDS = ${JSON.stringify(PILLAR_METRIC_IDS)};`;
}
