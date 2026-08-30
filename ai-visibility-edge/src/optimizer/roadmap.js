/**
 * Unified optimization roadmap — one ordered list: done / waiting / manual + why.
 */
import { HUMAN_GATES } from './plan.js';

const STATUS = {
  done: { label: 'Готово', icon: '✅', css: 'roadmap-done' },
  current: { label: 'Текуща', icon: '▶️', css: 'roadmap-current' },
  waiting_auto: { label: 'Чака системата', icon: '⏳', css: 'roadmap-auto' },
  waiting_manual: { label: 'Ваш ход', icon: '👤', css: 'roadmap-manual' },
  blocked: { label: 'Заключена', icon: '🔒', css: 'roadmap-blocked' },
};

const OWNER_LABEL = {
  system: 'Системата (автоматично)',
  human: 'Вие (ръчно)',
  both: 'Системата + вие',
};

function step(id, fields) {
  const st = STATUS[fields.status] ?? STATUS.blocked;
  return {
    id,
    order: fields.order,
    title: fields.title,
    status: fields.status,
    status_label: st.label,
    status_icon: st.icon,
    status_css: st.css,
    owner: fields.owner,
    owner_label: OWNER_LABEL[fields.owner] ?? fields.owner,
    summary: fields.summary,
    why_waiting: fields.why_waiting ?? null,
    instructions: fields.instructions ?? [],
    action_hint: fields.action_hint ?? null,
  };
}

/**
 * @param {object} ctx — optimizer context (tenant, stats, probe, edge, displacement)
 * @param {object} [extras]
 * @param {string} [extras.worker_host]
 * @param {object} [extras.latest_run]
 * @param {object[]} [extras.content_drafts]
 */
export function buildOptimizationRoadmap(ctx, extras = {}) {
  if (ctx.error) return { error: ctx.error, domain: ctx.domain };

  const stats = ctx.stats ?? {};
  const edge = ctx.edge ?? {};
  const probe = ctx.probe ?? {};
  const domain = ctx.domain;
  const workerHost = extras.worker_host ?? 'ai-visibility-edge.radilov-k.workers.dev';
  const thinContent = (probe.html_text_chars ?? 0) < 500;
  const hasDraft = (extras.content_drafts ?? []).length > 0;
  const edgeFixes = edge.fixes ?? [];

  const registered = Boolean(ctx.tenant);
  const hasAudit = Boolean(probe.domain);
  const hasQuestions = stats.questionCount >= 5;
  const hasRuns = stats.runCount > 0;
  const hasObs = stats.obsCount > 0;
  const pendingReprocess = stats.pendingReprocess > 0;
  const edgeKvReady = edgeFixes.length > 0 || edge.edge_active || ctx.tenant?.edge_enabled;
  const edgeLive = Boolean(edge.edge_active);
  const cnameNeeded = edge.status === 'pending_cname' || (ctx.tenant?.edge_enabled && !edge.edge_active);

  const steps = [];

  steps.push(
    step('register', {
      order: 1,
      title: 'Добавяне на сайта',
      status: registered ? 'done' : 'current',
      owner: 'human',
      summary: registered
        ? `${domain} е регистриран в системата.`
        : 'Въведете домейн, марка и ниша в формата „+ Сайт“.',
      instructions: registered
        ? []
        : [
            'Натиснете „+ Сайт“ горе вдясно.',
            'Попълнете домейн (без https://), марка и вертикал.',
            'Натиснете „Добави“ или „Добави + анализ“.',
          ],
      action_hint: registered ? null : 'add_site',
    }),
  );

  steps.push(
    step('audit', {
      order: 2,
      title: 'Технически преглед на сайта',
      status: !registered ? 'blocked' : hasAudit ? 'done' : 'waiting_auto',
      owner: 'system',
      summary: hasAudit
        ? `Одит ${ctx.strategy?.score ?? '—'}/100. ${extras.findings_summary ?? formatTopFindings(extras.findings)}`
        : 'Проверяваме robots.txt, структурирани данни, текст и пренасочвания.',
      why_waiting: hasAudit ? null : 'Още не е пуснат одит — натиснете „1. Анализ“ или „Auto-оптимизация“.',
      instructions: hasAudit ? [] : ['Натиснете „🚀 1. Анализ“ или „🤖 Auto-оптимизация“.'],
      action_hint: hasAudit ? null : 'run_analysis',
    }),
  );

  steps.push(
    step('questions', {
      order: 3,
      title: 'Въпроси към AI моделите',
      status: !registered ? 'blocked' : hasQuestions ? 'done' : hasAudit ? 'waiting_auto' : 'blocked',
      owner: 'both',
      summary: hasQuestions
        ? `${stats.questionCount} български въпроса — готови за измерване.`
        : `Има ${stats.questionCount} въпроса — нужни са поне 5.`,
      why_waiting: hasQuestions
        ? null
        : 'Системата генерира въпроси по вашата ниша; може да добавите и ръчно.',
      instructions: hasQuestions
        ? ['При нужда: „❓ Въпроси за AI“ → „Авто-генерирай“ или „+ Ръчно“.']
        : ['Натиснете Auto-оптимизация или „✨ Авто-генерирай“ в секцията с въпроси.'],
      action_hint: hasQuestions ? null : 'generate_questions',
    }),
  );

  steps.push(
    step('measure', {
      order: 4,
      title: 'AI измерване (отговори от ChatGPT / Gemini)',
      status: !registered ? 'blocked' : hasRuns ? 'done' : hasQuestions ? 'waiting_auto' : 'blocked',
      owner: 'system',
      summary: hasRuns
        ? `${stats.runCount} записани AI отговора.`
        : 'Питаме моделите с вашите въпроси и записваме отговорите.',
      why_waiting: hasRuns ? null : 'Нужни са въпроси и старт на pipeline (Анализ или Auto).',
      instructions: hasRuns ? [] : ['Натиснете „🚀 1. Анализ“ или „🤖 Auto-оптимизация“.'],
      action_hint: hasRuns ? null : 'run_analysis',
    }),
  );

  steps.push(
    step('verify', {
      order: 5,
      title: 'Проверка дали AI наистина ви цитира',
      status: !hasRuns
        ? 'blocked'
        : pendingReprocess
          ? 'waiting_auto'
          : hasObs
            ? 'done'
            : 'waiting_auto',
      owner: 'system',
      summary: hasObs
        ? `${stats.obsCount} проверени цитати от ${stats.runCount} отговора.`
        : pendingReprocess
          ? `${pendingReprocess} отговора чакат проверка.`
          : 'Обработката на цитатите не е пусната.',
      why_waiting: pendingReprocess
        ? 'Има непроверени отговори — SOV и конкуренцията са непълни.'
        : hasObs
          ? null
          : 'След измерване системата verify-ва URL-ите в отговорите.',
      instructions: pendingReprocess
        ? ['Натиснете „↻ Reprocess“ или Auto-оптимизация.']
        : hasObs
          ? []
          : ['Изчакайте края на анализа или натиснете Reprocess.'],
      action_hint: pendingReprocess ? 'reprocess' : null,
    }),
  );

  steps.push(
    step('edge_config', {
      order: 6,
      title: 'Автоматични технически поправки (Edge Worker)',
      status: !hasAudit
        ? 'blocked'
        : edgeLive
          ? 'done'
          : edgeKvReady && edgeFixes.length > 0
            ? 'waiting_auto'
            : edgeFixes.length === 0 && hasAudit
              ? 'done'
              : 'waiting_auto',
      owner: 'system',
      summary: edgeLive
        ? 'Edge Worker е активен — JSON-LD, robots и canonical се подават автоматично.'
        : edgeFixes.length > 0
          ? `Открити ${edgeFixes.length} поправки: ${edgeFixes.map((f) => f.id ?? f.title ?? 'fix').join(', ')}.`
          : 'Няма критични технически поправки за Edge.',
      why_waiting:
        edgeLive || edgeFixes.length === 0
          ? null
          : 'Конфигурацията се записва в Cloudflare KV — натиснете „2. Приложи Edge“ или Auto.',
      instructions:
        edgeLive || edgeFixes.length === 0
          ? []
          : ['Натиснете „⚡ 2. Приложи Edge“ или „🤖 Auto-оптимизация“.'],
      action_hint: edgeLive || edgeFixes.length === 0 ? null : 'activate_edge',
    }),
  );

  steps.push(
    step('cname', {
      order: 7,
      title: 'Насочване на домейна (CNAME) — единствената DNS стъпка',
      status: !edgeKvReady && !ctx.tenant?.edge_enabled
        ? 'blocked'
        : edgeLive
          ? 'done'
          : cnameNeeded
            ? 'waiting_manual'
            : 'blocked',
      owner: 'human',
      summary: edgeLive
        ? 'Трафикът минава през Worker — поправките са live.'
        : `Без CNAME Edge поправките не се виждат от посетители и AI ботове.`,
      why_waiting: edgeLive
        ? null
        : 'Само вие имате достъп до DNS — системата не може да смени записите вместо вас.',
      instructions: edgeLive
        ? []
        : [
            `1. Отворете DNS панела при registrar или Cloudflare.`,
            `2. Създайте CNAME: име = ${domain}, стойност = ${workerHost}`,
            `3. Изчакайте SSL (обикновено 5–30 мин).`,
            `4. Натиснете „↻ Обнови“ тук — статусът трябва да стане активен.`,
          ],
      action_hint: edgeLive ? null : 'cname_dns',
    }),
  );

  const contentNeeded = thinContent || hasDraft;
  steps.push(
    step('content', {
      order: 8,
      title: 'Текст на сайта (ако е тънко съдържание)',
      status: !hasAudit
        ? 'blocked'
        : !contentNeeded
          ? 'done'
          : hasDraft && !thinContent
            ? 'waiting_manual'
            : thinContent
              ? 'waiting_manual'
              : 'done',
      owner: 'human',
      summary: !contentNeeded
        ? 'Сайтът има достатъчно четим текст — не е нужен CMS draft.'
        : hasDraft
          ? 'Има AI draft — трябва да го публикувате в сайта си.'
          : 'Сайтът има малко текст — AI трудно може да ви цитира.',
      why_waiting: !contentNeeded
        ? null
        : 'Маркетинговият текст живее във вашия CMS — системата не публикува вместо вас.',
      instructions: !contentNeeded
        ? []
        : [
            '1. Отворете „Content drafts“ в секцията Auto-оптимизация.',
            '2. Копирайте HTML текста.',
            '3. Поставете го в CMS (начална страница или FAQ) — проверете факти и цени.',
            '4. Публикувайте и пуснете „🚀 1. Анализ“ отново.',
          ],
      action_hint: contentNeeded ? 'publish_cms' : null,
    }),
  );

  steps.push(
    step('remeasure', {
      order: 9,
      title: 'Повторно измерване след промени',
      status: !edgeLive && !hasObs
        ? 'blocked'
        : edgeLive && hasObs
          ? stats.runCount >= 10
            ? 'done'
            : 'waiting_auto'
          : 'blocked',
      owner: 'system',
      summary:
        edgeLive && hasObs
          ? 'След CNAME и Edge — пускаме нови AI отговори за сравнение.'
          : 'Активира се след live Edge и първо измерване.',
      why_waiting:
        edgeLive && hasObs && stats.runCount < 10
          ? 'Нужно е remeasure за да видите ефект от оптимизацията.'
          : null,
      instructions:
        edgeLive && hasObs ? ['Натиснете Auto-оптимизация или изчакайте седмичния cron.'] : [],
      action_hint: edgeLive && hasObs ? 'run_auto_optimizer' : null,
    }),
  );

  steps.push(
    step('monitor', {
      order: 10,
      title: 'Мониторинг и тренд',
      status: stats.runCount >= 10 && hasObs ? 'done' : hasObs ? 'current' : 'blocked',
      owner: 'system',
      summary:
        stats.runCount >= 10
          ? 'Имате достатъчно данни за SOV тренд и baseline сравнение.'
          : 'След 10+ отговора се вижда дали AI ви препоръчва стабилно.',
      why_waiting: null,
      instructions: ['Преглеждайте dashboard седмично — cron допълва данните автоматично.'],
    }),
  );

  const current = steps.find((s) => s.status === 'current' || s.status === 'waiting_manual') ?? steps.find((s) => s.status === 'waiting_auto');
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const manualPending = steps.filter((s) => s.status === 'waiting_manual');

  const honesty_note =
    manualPending.length === 0
      ? 'Системата може да свърши всички текущи стъпки автоматично — натиснете „Auto-оптимизация“.'
      : `${manualPending.length} стъпки изискват ваше действие (${manualPending.map((s) => s.title.split('(')[0].trim()).join(', ')}). Останалото е автоматично.`;

  return {
    domain,
    summary: `${doneCount}/${steps.length} стъпки готови` + (current ? ` · сега: ${current.title}` : ''),
    honesty_note,
    current_step_id: current?.id ?? null,
    steps,
    generated_at: new Date().toISOString(),
  };
}

function formatTopFindings(findings) {
  if (!findings?.length) return '';
  const top = findings.filter((f) => f.severity === 'critical' || f.severity === 'warning').slice(0, 2);
  if (!top.length) return '';
  return top.map((f) => f.title).join('; ') + '.';
}

export function humanGateInstructions(gateId, ctx = {}) {
  const gate = HUMAN_GATES[gateId];
  if (!gate) return { title: gateId, why: '', instructions: [] };

  if (gateId === 'dns_cname') {
    return {
      title: gate.title,
      why: gate.why,
      instructions: [
        `CNAME ${ctx.domain ?? 'вашият-домейн.com'} → ${ctx.worker_host ?? 'worker-host'}`,
        'Изчакайте SSL validation.',
        'Обновете dashboard.',
      ],
    };
  }
  if (gateId === 'cms_publish') {
    return {
      title: gate.title,
      why: gate.why,
      instructions: [
        'Копирайте draft от „Content drafts“.',
        'Публикувайте в CMS след проверка на факти.',
        'Пуснете повторен анализ.',
      ],
    };
  }
  return { title: gate.title, why: gate.why, instructions: [gate.why] };
}
