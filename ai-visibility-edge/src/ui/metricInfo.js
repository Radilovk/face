/**
 * Metric explanations for dashboard ⓘ buttons — plain Bulgarian, no jargon.
 */

export const METRIC_CATALOG = {
  diagnostic_score: {
    title: 'Техническа оценка (0–100)',
    icon: '🎯',
    what:
      'Колко добре е подготвен сайтът технически: дали AI ботовете могат да го четат, има ли описание на бизнеса, достатъчно ли е текстът на страницата.',
    why:
      'Ниска оценка означава, че AI може изобщо да не ви „вижда“, дори да имате добър продукт.',
    unit: 'точки',
  },
  runs: {
    title: 'AI отговори',
    icon: '📊',
    what:
      'Колко пъти сме задали въпроси на ChatGPT и Gemini и записали отговорите им за вашия сайт.',
    why:
      'Без отговори няма как да знаем дали AI ви препоръчва или пропуска.',
    unit: 'броя',
  },
  observations: {
    title: 'Проверени цитати',
    icon: '🔍',
    what:
      'Отговори, в които AI наистина е споменал ваш сайт или страница — проверени автоматично, не на доверие.',
    why:
      'Различаваме реално споменаване от измислено — само проверените влизат в статистиката.',
    unit: 'броя',
  },
  sov: {
    title: 'Дял от гласа в AI',
    icon: '📈',
    what:
      'В колко процента от въпросите AI ви споменава (спрямо всички измервания за периода).',
    why:
      'Отговаря на въпроса: „Когато някой пита AI за вашата ниша, дава ли ви или само конкурентите?“',
    unit: '%',
  },
  pending_reprocess: {
    title: 'Чака проверка',
    icon: '⏳',
    what:
      'AI отговори, които още не са прегледани за реални цитати към ваш сайт.',
    why:
      'Докато има необработени — процентите за цитиране и конкуренция са занижени.',
    unit: 'броя',
  },
  cache_median: {
    title: 'Средна възраст на кеша (часове)',
    icon: '⏱',
    what:
      'Колко „стара“ е версията на сайта, която AI вероятно ползва (средна стойност в часове).',
    why:
      'Ако кешът е стар, промените ви в сайта се отразяват в AI със закъснение.',
    unit: 'часа',
  },
  cache_p25: {
    title: 'Най-свежите 25% страници',
    icon: '📉',
    what: 'Четири от всеки 100 цитата са по-свежи от тази стойност (в часове).',
    why: 'Показва най-добрата част от индекса — полезно ако имате и стари, и нови страници.',
    unit: 'часа',
  },
  cache_p75: {
    title: 'По-старите 75% страници',
    icon: '📈',
    what: 'Три четвърти от цитатите са по-стари от тази стойност (в часове).',
    why: 'Висока стойност = голяма част от AI вижда остаряла информация.',
    unit: 'часа',
  },
  cache_coverage: {
    title: 'Покритие на кеш индекса',
    icon: '🗂',
    what: 'Колко процента от цитатите имат изчислена „възраст на кеша“ (последните 3 дни).',
    why: 'Под 50% — цифрите са ориентир; нужни са bot логове или дата на промяна в HTML.',
    unit: '%',
  },
  bot_verified: {
    title: 'Посещения от AI ботове (потвърдени)',
    icon: '🤖',
    what:
      'Реални посещения от известни AI/crawler ботове (GPTBot и др.) през последните 7 дни.',
    why:
      'Доказва, че ботовете наистина стигат до сайта след насочване през Edge.',
    unit: 'броя',
  },
  bot_fake: {
    title: 'Съмнителни bot посещения',
    icon: '⚠️',
    what:
      'Заявки, които твърдят, че са ботове, но не минават проверка — вероятно фалшиви.',
    why: 'Не се броят в статистиката — само шум в логовете.',
    unit: 'броя',
  },
  pillar_visibility: {
    title: 'Видимост за AI',
    icon: '👁',
    what: 'Дали AI ботовете имат право и техническа възможност да четат сайта.',
    why: 'Първа стъпка — без нея няма смисъл от съдържание и измерване.',
    unit: 'статус',
  },
  pillar_content: {
    title: 'Съдържание на сайта',
    icon: '📝',
    what: 'Дали има достатъчно текст, факти и цени, които AI може да цитира.',
    why: 'AI цитира ясни пасажи с марка и факти — не празни или скрити в JS страници.',
    unit: 'статус',
  },
  pillar_citation: {
    title: 'Реално AI цитиране',
    icon: '🤖',
    what: 'Дали AI моделите вече ви споменават в отговорите си.',
    why: 'Показва реалния резултат — не само технически одит, а дали AI ви препоръчва.',
    unit: 'статус',
  },
  pillar_competition: {
    title: 'Конкуренция в AI',
    icon: '⚔️',
    what: 'Дали AI дава конкурентите, но пропуска вас при въпроси за категорията.',
    why: 'Директен сигнал, че губите видимост спрямо другите в нишата.',
    unit: 'статус',
  },
  displacement_rate: {
    title: 'Изместване от конкуренти',
    icon: '⚠️',
    what:
      'Колко често AI споменава конкуренти, но не и вас (при проследявани конкуренти).',
    why:
      'Когато клиент пита „коя марка да избера“, AI дава други — вие липсвате.',
    unit: '%',
  },
  baseline_gate: {
    title: 'Начална референция (baseline)',
    icon: '📦',
    what:
      'Запазен „снимка“ на AI отговорите в началото — за сравнение след оптимизация.',
    why:
      'Без референция не може да се докаже, че нещо се е подобрило след промените.',
    unit: 'статус',
  },
  drift: {
    title: 'Системни аларми',
    icon: '🔔',
    what:
      'Автоматични предупреждения: спряло измерване, променен API, изтекла конфигурация.',
    why: 'Хваща проблеми, преди да загубите данни или да спре оптимизацията.',
    unit: 'аларми',
  },
  edge_status: {
    title: 'Edge оптимизация (Worker)',
    icon: '⚡',
    what:
      'Автоматични технически поправки през Cloudflare Worker: описание на бизнеса, robots, canonical.',
    why:
      'Работи без промени в CMS — но изисква CNAME насочване на домейна.',
    unit: 'статус',
  },
  optimizer: {
    title: 'Auto-оптимизация',
    icon: '🤖',
    what:
      'Един бутон пуска одит, въпроси, измерване и Edge конфиг. Част от стъпките (DNS, CMS текст) са ваши — вижте „План на оптимизация“.',
    why:
      'Спестява ръчно кликане; ясно показва какво системата прави и какво остава на вас.',
    unit: 'режим',
  },
  questions: {
    title: 'Въпроси за измерване',
    icon: '❓',
    what:
      'Български въпроси, с които питаме AI — какво би попитал клиент за вашата ниша.',
    why: 'Лоши или общи въпроси дават безполезни отговори и подвеждащи проценти.',
    unit: 'броя',
  },
};

export function interpretMetricNow(id, ctx = {}) {
  const m = METRIC_CATALOG[id];
  if (!m) return 'Няма описание за този показател.';

  function n(v) {
    if (v == null || Number.isNaN(Number(v))) return null;
    return Number(v);
  }

  switch (id) {
    case 'diagnostic_score': {
      const s = n(ctx.value);
      if (s == null) return 'Още няма одит — натиснете „1. Анализ“.';
      if (s >= 75) return `${s}/100 — добре технически; фокус върху измерване и текст.`;
      if (s >= 50) return `${s}/100 — има какво да се оправи (robots, описание, текст).`;
      return `${s}/100 — сериозни блокери; AI вероятно не може да прочете сайта.`;
    }
    case 'runs': {
      const v = n(ctx.value);
      if (!v) return '0 отговора — пуснете анализ или Auto-оптимизация.';
      if (v < 10) return `${v} отговора — достатъчно за тест, малко за тренд.`;
      if (v < 40) return `${v} отговора — добър старт; продължете с измервания.`;
      return `${v} отговора — солидна база за статистика.`;
    }
    case 'observations': {
      const v = n(ctx.value);
      const runs = n(ctx.runs);
      if (!v) return runs ? 'Има отговори, но още не са проверени — натиснете Reprocess.' : 'Няма проверени цитати.';
      return `${v} проверени цитати (${runs ? Math.round((v / runs) * 100) : '—'}% от отговорите).`;
    }
    case 'sov': {
      const v = n(ctx.value);
      if (v == null) return 'Нужни са повече проверени цитати за процент.';
      if (v === 0) return '0% — AI не ви споменава; проверете конкуренцията и текста на сайта.';
      if (v < 15) return `${v.toFixed(1)}% — слабо присъствие; конкурентите вероятно доминират.`;
      if (v < 40) return `${v.toFixed(1)}% — умерено; оптимизацията работи.`;
      return `${v.toFixed(1)}% — силно присъствие в AI за този период.`;
    }
    case 'pending_reprocess': {
      const v = n(ctx.value);
      if (!v) return 'Всички отговори са проверени.';
      return `${v} чакат проверка — процентите са непълни до Reprocess.`;
    }
    case 'cache_median': {
      const v = n(ctx.value);
      if (v == null) return 'Няма данни — нужни bot посещения или дата на промяна в HTML.';
      if (v < 24) return `Средно ${v.toFixed(1)} ч — относително свежо.`;
      if (v < 72) return `Средно ${v.toFixed(1)} ч — промените се виждат след 1–3 дни.`;
      return `Средно ${v.toFixed(1)} ч — стар кеш; AI може да цитира остаряла версия.`;
    }
    case 'cache_p25':
    case 'cache_p75': {
      const v = n(ctx.value);
      if (v == null) return 'Ще се изчисли след повече данни.';
      return `${v.toFixed(1)} часа (прозорец 72 ч).`;
    }
    case 'cache_coverage': {
      const v = n(ctx.value);
      if (v == null) return 'Няма достатъчно сигнали за изчисление.';
      if (v < 30) return `${Math.round(v)}% — ориентир, не пълна картина.`;
      if (v < 70) return `${Math.round(v)}% — частично; добавете CNAME за bot логове.`;
      return `${Math.round(v)}% — добро покритие.`;
    }
    case 'bot_verified': {
      const v = n(ctx.value);
      if (!v) return '0 — настройте CNAME и изчакайте bot crawl.';
      return `${v} потвърдени посещения (7 дни).`;
    }
    case 'bot_fake': {
      const v = n(ctx.value);
      if (!v) return 'Няма съмнителен шум.';
      return `${v} непотвърдени — не влияят на статистиката.`;
    }
    case 'pillar_visibility':
    case 'pillar_content':
    case 'pillar_citation':
    case 'pillar_competition':
      return ctx.status
        ? `Сега: ${ctx.status}${ctx.action ? '. Следва: ' + ctx.action : ''}`
        : 'Заредете сайт за актуален статус.';
    case 'displacement_rate': {
      const v = n(ctx.value);
      if (v == null) return 'Нужни са измервания и проследявани конкуренти.';
      if (v >= 0.4) return `${Math.round(v * 100)}% — често дават конкуренти без вас.`;
      if (v >= 0.15) return `${Math.round(v * 100)}% — периодично изместване; подобрете текст и измерване.`;
      return `${Math.round(v * 100)}% — ниско изместване в текущите данни.`;
    }
    case 'baseline_gate':
      return ctx.message ?? 'Вижте banner-а за статус на baseline.';
    case 'drift':
      return ctx.message ?? (ctx.critical ? 'Има критични аларми — проверете.' : 'Системата е стабилна.');
    case 'edge_status':
      return ctx.message ?? 'Вижте Edge панела и плана на оптимизация.';
    case 'optimizer':
      return ctx.message ?? 'Вижте „План на оптимизация“ за текущи стъпки.';
    case 'questions': {
      const v = n(ctx.value);
      if (!v) return 'Няма въпроси — генерирайте или пуснете анализ.';
      if (v < 5) return `${v} въпроса — нужни са поне 5.`;
      return `${v} въпроса — готови за измерване.`;
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
