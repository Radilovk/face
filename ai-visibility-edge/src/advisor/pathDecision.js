/**
 * AI refinement of client path — Gemini validates/adjusts rule-based detection.
 */
import { geminiChat, geminiConfigured } from './geminiClient.js';
import { CLIENT_PATHS, detectClientPath } from '../onboarding/clientPath.js';

const PATH_IDS = Object.keys(CLIENT_PATHS);

const SYSTEM = `You are an AI Visibility platform routing advisor for operators.
Given rule-based path detection and site context, confirm or adjust the deployment path.

Valid path_id values: ${PATH_IDS.join(', ')}

Respond ONLY with JSON (no markdown):
{
  "path_id": "<one of valid ids>",
  "confidence": 0.0-1.0,
  "rationale": "2-4 sentences in Bulgarian — why this path for THIS client",
  "priority_actions": ["max 5 short action ids: run_analysis, activate_edge, apply_cf_aeo, run_smoke, cname_dns, publish_cms, remeasure"],
  "warnings": ["optional risks"]
}`;

/**
 * @param {object} env
 * @param {object} ctx — optimizer context
 * @param {object} [options]
 */
export async function refineClientPathWithAi(env, ctx, options = {}) {
  const smoke = options.smoke ?? null;
  const rulePath = detectClientPath(ctx, env, smoke);

  if (rulePath.error) return rulePath;
  if (!geminiConfigured(env) || options.skip_ai) {
    return {
      ...rulePath,
      ai_source: 'rules',
      ai_rationale: rulePath.reasons.join(' '),
      priority_actions: [],
      warnings: [],
    };
  }

  try {
    const payload = {
      rule_detection: rulePath,
      domain: ctx.domain,
      tenant: ctx.tenant,
      stats: ctx.stats,
      probe_summary: {
        html_text_chars: ctx.probe?.html_text_chars,
        signals: ctx.probe?.signals ?? ctx.strategy?.probe?.signals,
        score: ctx.strategy?.score,
      },
      edge: {
        status: ctx.edge?.status,
        edge_active: ctx.edge?.edge_active,
        fixes: (ctx.edge?.fixes ?? []).map((f) => f.id),
      },
      displacement_rate: ctx.displacement?.displacement_rate,
      smoke_level: smoke?.level,
    };

    const { text } = await geminiChat({
      apiKey: env.GEMINI_API_KEY,
      model: options.model,
      systemInstruction: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    });

    const parsed = parseJsonResponse(text);
    if (!parsed?.path_id || !CLIENT_PATHS[parsed.path_id]) {
      return fallback(rulePath, 'ai_parse_failed');
    }

    return {
      ...rulePath,
      path_id: parsed.path_id,
      path: CLIENT_PATHS[parsed.path_id],
      confidence: parsed.confidence ?? rulePath.confidence,
      ai_source: 'gemini',
      ai_rationale: parsed.rationale ?? rulePath.reasons.join(' '),
      priority_actions: parsed.priority_actions ?? [],
      warnings: parsed.warnings ?? [],
      rule_path_id: rulePath.path_id,
    };
  } catch (err) {
    return fallback(rulePath, err.message);
  }
}

function fallback(rulePath, reason) {
  return {
    ...rulePath,
    ai_source: 'rules',
    ai_rationale: rulePath.reasons.join(' '),
    priority_actions: [],
    warnings: [`AI refinement skipped: ${reason}`],
  };
}

function parseJsonResponse(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('no JSON in response');
  }
}
