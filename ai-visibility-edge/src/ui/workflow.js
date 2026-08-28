/** Automation pipeline steps — UI + status mapping. */

export const PIPELINE_STEPS = [
  {
    id: 'register',
    title: '1. Регистрация',
    short: 'Добави домейн',
    auto: false,
    manual: true,
    desc: 'Въведете домейн, марка и вертикал. Системата го записва в D1.',
  },
  {
    id: 'audit',
    title: '2. Одит (Probe)',
    short: 'Технически одит',
    auto: true,
    manual: true,
    desc: 'robots.txt, JSON-LD, canonical, текст, цени — автоматичен HTTP probe.',
  },
  {
    id: 'questions',
    title: '3. Въпроси',
    short: 'BG въпроси',
    auto: true,
    manual: true,
    desc: 'Автоматично генериране по шаблон + ръчно добавяне/редакция.',
  },
  {
    id: 'measure',
    title: '4. Измерване',
    short: 'AI runs',
    auto: true,
    manual: true,
    desc: 'OpenAI/Gemini отговори → D1 runs. Cron или ръчен reprocess trigger.',
  },
  {
    id: 'analyze',
    title: '5. Анализ',
    short: 'Verify + SOV',
    auto: true,
    manual: false,
    desc: 'Reprocess → observations, displacement, препоръки.',
  },
  {
    id: 'actions',
    title: '6. Приложи',
    short: 'Apply',
    auto: true,
    manual: true,
    desc: 'Генерира JSON-LD, текст и robots — копирайте в сайта или Edge deploy.',
  },
  {
    id: 'monitor',
    title: '7. Мониторинг',
    short: 'Тренд',
    auto: true,
    manual: false,
    desc: 'Седмичен cron, SOV тренд, delta спрямо baseline.',
  },
];

export function stepStatus(stepId, ctx) {
  switch (stepId) {
    case 'register':
      return ctx.tenant ? 'done' : 'pending';
    case 'audit':
      if (!ctx.tenant) return 'locked';
      return ctx.probe ? 'done' : 'ready';
    case 'questions':
      if (!ctx.tenant) return 'locked';
      return (ctx.questionCount ?? 0) >= 5 ? 'done' : (ctx.questionCount ? 'ready' : 'pending');
    case 'measure':
      if (!ctx.tenant) return 'locked';
      return (ctx.runCount ?? 0) > 0 ? 'done' : 'ready';
    case 'analyze':
      if (!ctx.tenant) return 'locked';
      return (ctx.obsCount ?? 0) > 0 ? 'done' : 'ready';
    case 'actions':
      if (!ctx.tenant) return 'locked';
      return (ctx.applyFixCount ?? 0) > 0 ? 'ready' : 'pending';
    case 'monitor':
      if (!ctx.tenant) return 'locked';
      return (ctx.runCount ?? 0) >= 10 ? 'done' : 'pending';
    default:
      return 'pending';
  }
}
