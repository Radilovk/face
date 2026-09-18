/**
 * Unified client playbook — steps per deployment path (daotslabna-level + AIV measure).
 */
import { CLIENT_PATHS } from './clientPath.js';
import { buildManualGuide, guideToInstructionLines } from '../diagnose/manualGuides.js';

const AUTO = 'system';
const HUMAN = 'human';
const BOTH = 'both';

/**
 * @param {object} pathDetection — from detectClientPath
 * @param {object} ctx — optimizer context
 * @param {object} [extras]
 */
export function buildClientPlaybook(pathDetection, ctx, extras = {}) {
  if (pathDetection.error) return pathDetection;

  const pathId = pathDetection.path_id;
  const domain = ctx.domain;
  const workerHost = extras.worker_host ?? 'ai-visibility-edge.example.workers.dev';
  const brand = ctx.tenant?.name ?? domain;
  const stats = ctx.stats ?? {};
  const edge = ctx.edge ?? {};
  const smoke = extras.smoke ?? null;

  const phases = [
    phaseBaseline(ctx, stats),
    phaseTechnical(pathId, ctx, pathDetection, { domain, workerHost, brand, edge, smoke }),
    phaseBusiness(ctx, stats, edge, smoke),
  ];

  const allSteps = phases.flatMap((p) => p.steps);
  const done = allSteps.filter((s) => s.status === 'done').length;
  const current = allSteps.find((s) => s.status === 'current' || s.status === 'waiting_manual') ??
    allSteps.find((s) => s.status === 'waiting_auto');

  return {
    domain,
    path: pathDetection.path,
    path_id: pathId,
    confidence: pathDetection.confidence,
    ai_rationale: extras.ai_rationale ?? null,
    ai_source: extras.ai_source ?? 'rules',
    target_level: pathDetection.path?.target_level ?? 5,
    summary: `${pathDetection.path.label} · ${done}/${allSteps.length} стъпки · ${current ? 'сега: ' + current.title : 'готов'}`,
    phases,
    steps: allSteps,
    auto_actions: autoActionsForPath(pathId, pathDetection, ctx),
    current_step_id: current?.id ?? null,
    generated_at: new Date().toISOString(),
  };
}

function phaseBaseline(ctx, stats) {
  const hasRuns = stats.runCount > 0;
  const hasObs = stats.obsCount > 0;
  return {
    id: 'baseline',
    title: '1. Baseline — дали AI ви цитира',
    steps: [
      pbStep('pb_register', 1, 'Регистрация', 'done', HUMAN, `${ctx.domain} в системата.`),
      pbStep('pb_audit', 2, 'Технически одит + strategy', hasRuns ? 'done' : 'current', AUTO,
        hasRuns ? 'Pipeline е пускан.' : 'Натиснете „🚀 Стартирай“ или „Авто-оптимизация“.',
        hasRuns ? null : 'run_analysis'),
      pbStep('pb_measure', 3, 'AI измерване (SOV baseline)', hasObs ? 'done' : hasRuns ? 'waiting_auto' : 'blocked', AUTO,
        hasObs ? `${stats.obsCount} цитати от ${stats.runCount} runs.` : 'Питаме ChatGPT/Gemini по нишата.',
        hasObs ? null : 'run_analysis'),
    ],
  };
}

function phaseTechnical(pathId, ctx, detection, { domain, workerHost, brand, edge, smoke }) {
  const steps = [];
  const edgeLive = Boolean(edge.edge_active);
  const gptBlocked = detection.signals.gptbot_blocked;
  const cfOk = detection.capabilities.cf_aeo_auto;
  const smokePass = smoke?.ok === true;
  const smokeLevel = smoke?.level ?? 0;

  if (pathId === 'pilot_worker') {
    steps.push(
      pbStep('pb_pilot_sync', 4, 'Pilot Worker live (client repo)', edgeLive || smokeLevel >= 4 ? 'done' : 'waiting_manual', HUMAN,
        'Data plane: run_worker_first + hostname routing — deploy от client GitHub.',
        'site_deploy'),
      pbStep('pb_cf_aeo', 5, 'Cloudflare AEO (Bot Fight, WAF)', gptBlocked && !cfOk ? 'waiting_manual' : smokePass || !gptBlocked ? 'done' : 'waiting_auto', cfOk ? AUTO : HUMAN,
        cfOk ? 'API: Bot Fight OFF, WAF skip, DNS-AID.' : 'Ръчно в CF Dashboard или CF_API_TOKEN.',
        cfOk ? 'apply_cf_aeo' : 'cloudflare_aeo'),
      pbStep('pb_smoke', 6, 'Agent-Native smoke (Level 5)', smokePass ? 'done' : 'waiting_auto', AUTO,
        smokePass ? smoke.level_label : '8 live checks — GPTBot, ARD, llms, markdown.',
        'run_smoke'),
    );
  } else if (pathId === 'edge_proxy') {
    steps.push(
      pbStep('pb_edge', 4, 'Edge KV config (robots, llms, ARD inject)', edge.edge_active || ctx.tenant?.edge_enabled ? 'done' : 'waiting_auto', AUTO,
        edge.fixes?.length ? `${edge.fixes.length} fixes готови за KV.` : 'Edge activate.',
        'activate_edge'),
      pbStep('pb_cname', 5, 'CNAME към AIV Worker', edgeLive ? 'done' : 'waiting_manual', HUMAN,
        edgeLive ? 'Трафик минава през Worker.' : `CNAME ${domain} → ${workerHost}`,
        'cname_dns'),
      pbStep('pb_cf_aeo', 6, 'Cloudflare AEO', !gptBlocked || smokePass ? 'done' : cfOk ? 'waiting_auto' : 'waiting_manual', cfOk ? AUTO : HUMAN,
        'Bot Fight / managed robots OFF за AI crawlers.',
        cfOk ? 'apply_cf_aeo' : 'cloudflare_aeo'),
      pbStep('pb_smoke', 7, 'Smoke → Level 5', smokePass ? 'done' : edgeLive ? 'waiting_auto' : 'blocked', AUTO,
        smokePass ? smoke.level_label : 'След CNAME + CF AEO.',
        'run_smoke'),
    );
  } else if (pathId === 'origin_ready') {
    steps.push(
      pbStep('pb_cf_aeo', 4, 'CF security (ако GPTBot блокиран)', !gptBlocked ? 'done' : cfOk ? 'waiting_auto' : 'waiting_manual', cfOk ? AUTO : HUMAN,
        !gptBlocked ? 'Origin достъпен за bots.' : '403 fix — CF AEO.',
        cfOk ? 'apply_cf_aeo' : 'cloudflare_aeo'),
      pbStep('pb_smoke', 5, 'Verify Level 4–5', smokePass || smokeLevel >= 4 ? 'done' : 'waiting_auto', AUTO,
        smoke?.level_label ?? 'Потвърждаваме discovery на live URL.',
        'run_smoke'),
    );
  } else if (pathId === 'content_first') {
    steps.push(
      pbStep('pb_content', 4, 'CMS — публикуване на текст', 'waiting_manual', HUMAN,
        'Thin content — AI draft → WordPress/Shopify.',
        'publish_cms'),
      pbStep('pb_reaudit', 5, 'Повторен одит след CMS', 'blocked', AUTO,
        'След publish — re-probe и re-path.',
        'run_analysis'),
    );
  } else {
    steps.push(
      pbStep('pb_monitor_tech', 4, 'Технически мониторинг (без live edge)', 'current', AUTO,
        'Findings + drift — без задължителен CNAME.',
        null),
    );
  }

  return { id: 'technical', title: '2. Technical — daotslabna-level readiness', steps };
}

function phaseBusiness(ctx, stats, edge, smoke) {
  const edgeLive = Boolean(edge.edge_active);
  const hasObs = stats.obsCount > 0;
  const remeasureReady = hasObs && (edgeLive || smoke?.level >= 4);
  return {
    id: 'business',
    title: '3. Business — AIV power (SOV, displacement, drift)',
    steps: [
      pbStep('pb_remeasure', 8, 'Remeasure след технически слой', remeasureReady && stats.runCount >= 8 ? 'done' : remeasureReady ? 'waiting_auto' : 'blocked', AUTO,
        'Сравняваме SOV преди/след Level 5.',
        'run_auto_optimizer'),
      pbStep('pb_displacement', 9, 'Displacement & конкуренти', stats.runCount >= 5 ? 'done' : 'waiting_auto', AUTO,
        ctx.displacement?.displacement_rate != null
          ? `Displacement ${Math.round((ctx.displacement.displacement_rate ?? 0) * 100)}%.`
          : 'Анализ кой ви замества в AI отговори.',
        null),
      pbStep('pb_drift', 10, 'Drift & седмичен cron', stats.runCount >= 10 ? 'done' : 'current', AUTO,
        'Автоматичен monitor — robots, citations, drift alerts.',
        null),
    ],
  };
}

function pbStep(id, order, title, status, owner, summary, action_hint) {
  return { id, order, title, status, owner, summary, action_hint, phase_order: order };
}

function autoActionsForPath(pathId, detection, ctx) {
  const actions = ['run_pipeline'];
  if (pathId === 'content_first') {
    actions.push('generate_content');
    return actions;
  }
  if (pathId === 'measure_only') {
    if (ctx.stats?.runCount > 0) actions.push('remeasure');
    return actions;
  }
  actions.push('activate_edge');
  if (detection.capabilities.cf_aeo_auto) actions.push('apply_cf_aeo');
  actions.push('run_smoke');
  if (ctx.stats?.obsCount > 0) actions.push('remeasure');
  return actions;
}

export function playbookStepGuides(stepId, ctx, workerHost) {
  if (stepId === 'pb_cname') {
    return guideToInstructionLines(buildManualGuide('cname', { domain: ctx.domain, workerHost }));
  }
  if (stepId === 'pb_cf_aeo') {
    return guideToInstructionLines(buildManualGuide('cloudflare_aeo', { domain: ctx.domain }));
  }
  if (stepId === 'pb_content') {
    return guideToInstructionLines(
      buildManualGuide('cms_publish', { domain: ctx.domain, brand: ctx.tenant?.name, artifactType: 'homepage' }),
    );
  }
  return [];
}
