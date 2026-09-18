/**
 * Detect client deployment archetype — rule-based path for playbook routing.
 * Refined optionally by Gemini in pathDecision.js.
 */

export const CLIENT_PATHS = {
  pilot_worker: {
    id: 'pilot_worker',
    label: 'Pilot Worker (daotslabna-level)',
    tagline: 'Client Cloudflare Worker + run_worker_first — AIV е control plane.',
    data_plane: 'client_worker',
    target_level: 5,
  },
  edge_proxy: {
    id: 'edge_proxy',
    label: 'AIV Edge proxy',
    tagline: 'Origin hosting + CNAME към platform Worker — edge inject без client repo.',
    data_plane: 'aiv_edge',
    target_level: 5,
  },
  origin_ready: {
    id: 'origin_ready',
    label: 'Origin вече Agent-Native',
    tagline: 'Discovery surfaces на origin — фокус: measure, CF security, SOV.',
    data_plane: 'client_origin',
    target_level: 5,
  },
  content_first: {
    id: 'content_first',
    label: 'Content-first',
    tagline: 'Thin content — първо CMS, после технически слой.',
    data_plane: 'mixed',
    target_level: 4,
  },
  measure_only: {
    id: 'measure_only',
    label: 'Measure & strategize',
    tagline: 'Без live edge — diagnosis, SOV, plan; минимални DNS промени.',
    data_plane: 'none',
    target_level: 3,
  },
};

/**
 * @param {object} ctx — optimizer context
 * @param {object} [env]
 * @param {object} [smoke] — optional smoke result
 */
export function detectClientPath(ctx, env = {}, smoke = null) {
  if (ctx.error) return { error: ctx.error, domain: ctx.domain };

  const probe = ctx.probe ?? {};
  const signals = probe.signals ?? ctx.strategy?.probe?.signals ?? {};
  const tenant = ctx.tenant ?? {};
  const edge = ctx.edge ?? {};
  const domain = ctx.domain;

  const thinContent = (probe.html_text_chars ?? 0) < 500;
  const agentSignals =
    (signals.ai_catalog_ok ? 1 : 0) +
    (signals.auth_md_ok ? 1 : 0) +
    (signals.api_catalog_ok ? 1 : 0) +
    (signals.llms_txt_ok ? 1 : 0) +
    (signals.content_signal_ok && signals.agentmap_ok ? 1 : 0);

  const gptbotBlocked = Boolean(signals.gptbot_blocked);
  const edgeFixes = edge.fixes ?? [];
  const edgeLive = Boolean(edge.edge_active);
  const smokeLevel = smoke?.level ?? null;

  const reasons = [];
  let pathId;

  if (Boolean(tenant.is_pilot)) {
    pathId = 'pilot_worker';
    reasons.push('Tenant е маркиран като pilot (is_pilot=1).');
    reasons.push('Очаква се client Worker (port) като data plane.');
  } else if (thinContent && agentSignals < 3) {
    pathId = 'content_first';
    reasons.push(`Thin content (${probe.html_text_chars ?? 0} chars) — CMS преди deep edge.`);
  } else if (agentSignals >= 4 && !gptbotBlocked && (smokeLevel >= 4 || edgeLive)) {
    pathId = 'origin_ready';
    reasons.push(`Origin вече има ${agentSignals}/5 agent-native signals.`);
    if (smokeLevel) reasons.push(`Smoke level ${smokeLevel}.`);
  } else if (agentSignals >= 4 && !gptbotBlocked && edgeFixes.length === 0) {
    pathId = 'origin_ready';
    reasons.push('Discovery на origin — без pending edge fixes.');
  } else if (edgeFixes.length > 0 || gptbotBlocked || agentSignals < 3) {
    pathId = 'edge_proxy';
    if (gptbotBlocked) reasons.push('GPTBot блокиран (403) — нужен CF AEO + edge.');
    if (edgeFixes.length) reasons.push(`${edgeFixes.length} edge fix(es): ${edgeFixes.map((f) => f.id).join(', ')}.`);
    if (agentSignals < 3) reasons.push(`Agent-native gaps (${agentSignals}/5 на origin).`);
  } else {
    pathId = 'measure_only';
    reasons.push('Няма критични edge fixes — достатъчно measure + strategy.');
  }

  const path = CLIENT_PATHS[pathId];
  const cfToken = Boolean(env.CF_API_TOKEN ?? env.CLOUDFLARE_API_TOKEN);
  const canAutoCf = cfToken;

  return {
    domain,
    path_id: pathId,
    path,
    confidence: scoreConfidence(pathId, reasons, ctx),
    reasons,
    signals: {
      thin_content: thinContent,
      agent_native_score: agentSignals,
      gptbot_blocked: gptbotBlocked,
      edge_fixes: edgeFixes.length,
      edge_live: edgeLive,
      smoke_level: smokeLevel,
      is_pilot: Boolean(tenant.is_pilot),
    },
    capabilities: {
      cf_aeo_auto: canAutoCf,
      edge_kv: Boolean(env.CACHE),
      gemini_advisor: Boolean(env.GEMINI_API_KEY),
      custom_hostname: Boolean(cfToken && (env.SAAS_ZONE_ID ?? env.CF_SAAS_ZONE_ID)),
    },
    generated_at: new Date().toISOString(),
  };
}

function scoreConfidence(pathId, reasons, ctx) {
  let score = 0.55;
  if (ctx.tenant?.is_pilot && pathId === 'pilot_worker') score = 0.95;
  if (reasons.length >= 2) score += 0.1;
  if (ctx.stats?.runCount > 0) score += 0.05;
  return Math.min(0.98, Math.round(score * 100) / 100);
}
