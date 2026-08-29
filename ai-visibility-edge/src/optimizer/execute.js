/**
 * Autonomous optimization executor — runs safe actions, surfaces human gates.
 */
import { runSitePipeline } from '../api/pipelineRun.js';
import { activateEdgeOptimization } from '../api/edge.js';
import { generateAndSaveQuestions } from '../api/questions.js';
import { runCitationBatchForTenant } from '../citations/runner.js';
import { reprocessRuns } from '../citations/reprocess.js';
import { invalidateAdvisorContext } from '../advisor/context.js';
import { buildOptimizationPlan } from './plan.js';
import { buildOptimizerContext } from './context.js';
import { generateSmartContent } from './content.js';
import { generateDisplacementQuestions } from './displacementQuestions.js';
import { saveOptimizerRun, saveContentDraft } from './store.js';

export async function getOptimizationPlan(env, domain) {
  const ctx = await buildOptimizerContext(env, domain);
  if (ctx.error) return ctx;
  return buildOptimizationPlan(ctx, env);
}

export async function runAutonomousOptimizer(env, domain, options = {}) {
  const started = new Date().toISOString();
  const ctx = await buildOptimizerContext(env, domain);
  if (ctx.error) return ctx;

  const plan = buildOptimizationPlan(ctx, env);
  if (plan.error) return plan;

  const maxActions = options.max_actions ?? 8;
  const dryRun = Boolean(options.dry_run);
  const executed = [];
  const skipped = [];
  const errors = [];
  const artifacts = [];

  const actionsToRun = (options.actions?.length
    ? plan.auto_actions.filter((a) => options.actions.includes(a.action))
    : plan.auto_actions
  ).slice(0, maxActions);

  if (dryRun) {
    return {
      domain: ctx.domain,
      dry_run: true,
      plan,
      would_execute: actionsToRun,
      human_gates: plan.human_gates,
    };
  }

  for (const step of actionsToRun) {
    try {
      const result = await executeAction(env, ctx, step.action, options);
      executed.push({ action: step.action, reason: step.reason, result });
      await refreshContextAfterAction(env, ctx, step.action, result);
    } catch (err) {
      errors.push({ action: step.action, error: err.message });
      if (options.stop_on_error) break;
    }
  }

  if (executed.some((e) => e.action !== 'generate_content')) {
    await invalidateAdvisorContext(env, ctx.domain);
  }

  const payload = {
    domain: ctx.domain,
    started_at: started,
    finished_at: new Date().toISOString(),
    plan: {
      headline: plan.headline,
      insights: plan.insights,
      automation_level: plan.automation_level,
    },
    executed,
    skipped,
    errors,
    human_gates: plan.human_gates,
    artifacts,
    next_step:
      plan.human_gates[0]?.gate === 'dns_cname'
        ? 'cname'
        : plan.human_gates[0]?.gate === 'cms_publish'
          ? 'publish_content'
          : executed.length ? 'review_results' : 'monitor',
  };

  await saveOptimizerRun(env, ctx.domain, payload);
  return payload;
}

async function executeAction(env, ctx, action, options) {
  const tenantId = ctx.tenant.id;
  const domain = ctx.domain;

  switch (action) {
    case 'run_pipeline':
      return runSitePipeline(env, domain, {
        audit: true,
        generate_questions: true,
        measure: options.measure !== false,
        reprocess: true,
        recommendations: true,
        edge: true,
        question_limit: options.question_limit ?? 5,
        repetitions: options.repetitions ?? 1,
        replace_questions: ctx.stats.questionCount > 0 && ctx.stats.questionCount < 3,
      });

    case 'generate_questions':
      return generateAndSaveQuestions(env.DB, {
        domain,
        brand: ctx.tenant.name,
        verticalLabel: ctx.tenant.vertical_name,
        replaceAuto: ctx.stats.questionCount >= 5,
        env,
        useSiteContext: true,
      });

    case 'refine_questions_displacement': {
      const { drafts, method, model } = await generateDisplacementQuestions(env, ctx);
      if (!drafts.length) return { skipped: true, reason: 'no_drafts', method };
      const saved = [];
      for (const d of drafts) {
        const id = `q-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          `INSERT INTO questions (id, vertical_id, tenant_id, text, qtype, source, intent)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(id, ctx.tenant.vertical_id, tenantId, d.text, d.qtype, d.source ?? 'auto', d.intent ?? d.qtype)
          .run();
        saved.push({ id, ...d });
      }
      return { generated: saved.length, method, model, questions: saved };
    }

    case 'activate_edge':
      return activateEdgeOptimization(env, domain);

    case 'generate_content': {
      const content = await generateSmartContent(env, ctx);
      const draft = await saveContentDraft(env, domain, {
        type: 'homepage_html',
        title: content.title,
        artifact: content.artifact,
        artifact_format: content.artifact_format,
        method: content.method,
        model: content.model ?? null,
        gate: 'cms_publish',
      });
      return { draft, content_method: content.method };
    }

    case 'reprocess':
      return reprocessRuns(env, { limit: 50, tenantId });

    case 'remeasure':
      return runCitationBatchForTenant(env, tenantId, {
        questionLimit: options.question_limit ?? 5,
        repetitions: 1,
        reprocess: true,
      });

    default:
      throw new Error(`Unknown optimizer action: ${action}`);
  }
}

async function refreshContextAfterAction(env, ctx, action, result) {
  if (action === 'run_pipeline' || action === 'remeasure') {
    const rc = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM runs r JOIN questions q ON q.id = r.question_id WHERE q.tenant_id = ?`,
    )
      .bind(ctx.tenant.id)
      .first();
    ctx.stats.runCount = rc?.n ?? ctx.stats.runCount;
  }
  if (action === 'activate_edge' && result?.edge_status) {
    ctx.tenant.edge_enabled = true;
    ctx.tenant.edge_status = result.edge_status;
  }
}
