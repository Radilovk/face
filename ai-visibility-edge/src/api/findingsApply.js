/**
 * Execute automated fix for a specific finding.
 */
import { activateEdgeOptimization } from './edge.js';
import { reprocessRuns } from '../citations/reprocess.js';
import { runAutonomousOptimizer } from '../optimizer/execute.js';
import { buildOptimizerContext } from '../optimizer/context.js';
import { generateSmartContent } from '../optimizer/content.js';
import { generateDisplacementQuestions } from '../optimizer/displacementQuestions.js';
import { saveContentDraft, saveOptimizerRun } from '../optimizer/store.js';
import { resolveTenantByDomain } from './questions.js';
import { resolveAutomationSpec } from '../diagnose/findingsAutomation.js';
import { buildMetaDescription, buildSitemapXml, buildTitleFix } from '../apply/generate.js';
import { invalidateAdvisorContext } from '../advisor/context.js';

export async function applyFindingFix(env, domain, findingId, options = {}) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const spec = resolveAutomationSpec(findingId) ?? { action: options.action, mode: 'auto' };
  const action = options.action ?? spec?.action;

  if (!action) {
    if (options.manual_input) {
      await saveManualConfirmation(env, normalized, findingId, options.manual_input);
    }
    return {
      domain: normalized,
      finding_id: findingId,
      status: 'manual_only',
      message: 'Тази слабост изисква ръчна поправка — попълнете формата.',
      manual_input: options.manual_input ?? null,
    };
  }

  const tenant = env.DB ? await resolveTenantByDomain(env.DB, normalized) : null;
  if (!tenant && action !== 'activate_edge') {
    return { error: 'unknown_domain', domain: normalized };
  }

  try {
    let result;
    switch (action) {
      case 'activate_edge':
        result = await activateEdgeOptimization(env, normalized);
        break;

      case 'reprocess':
        if (!tenant) return { error: 'unknown_domain' };
        result = await reprocessRuns(env, { tenantId: tenant.id, limit: options.limit ?? 200 });
        await invalidateAdvisorContext(env, normalized);
        break;

      case 'generate_sitemap_artifact': {
        const ctx = await buildOptimizerContext(env, normalized).catch(() => ({}));
        const probeUrl = ctx.probe?.raw_json?.final_url ?? `https://${normalized}/`;
        const artifact = buildSitemapXml({ domain: normalized, urls: [probeUrl] });
        await saveContentDraft(env, normalized, {
          finding_id: findingId,
          title: 'sitemap.xml',
          artifact,
          method: 'template',
        });
        result = { title: 'sitemap.xml', artifact, saved: true, finding_id: findingId };
        break;
      }

      case 'generate_meta_artifact': {
        const ctx = await buildOptimizerContext(env, normalized);
        if (ctx.error) return ctx;
        const brand = ctx.tenant?.name ?? normalized;
        const vertical = ctx.tenant?.vertical_name ?? '';
        const isTitle = findingId === 'title_brand_mismatch';
        const artifact = isTitle
          ? buildTitleFix({ domain: normalized, brand, vertical })
          : buildMetaDescription({ domain: normalized, brand, vertical });
        await saveContentDraft(env, normalized, {
          finding_id: findingId,
          title: isTitle ? '<title>' : 'meta description',
          artifact,
          method: 'template',
        });
        result = { title: isTitle ? '<title>' : 'meta description', artifact, saved: true, finding_id: findingId };
        break;
      }

      case 'generate_content': {
        const ctx = await buildOptimizerContext(env, normalized);
        if (ctx.error) return ctx;
        const content = await generateSmartContent(env, ctx, {
          intent: spec?.intent ?? options.intent ?? 'homepage_faq',
        });
        await saveContentDraft(env, normalized, {
          finding_id: findingId,
          title: content.title,
          artifact: content.artifact,
          method: content.method,
        });
        result = { ...content, saved: true, finding_id: findingId };
        break;
      }

      case 'displacement_optimize': {
        const ctx = await buildOptimizerContext(env, normalized);
        if (ctx.error) return ctx;
        const qResult = await generateDisplacementQuestions(env, ctx).catch(() => null);
        const content = await generateSmartContent(env, ctx, { intent: 'displacement' });
        await saveContentDraft(env, normalized, {
          finding_id: findingId,
          title: content.title,
          artifact: content.artifact,
          method: content.method,
        });
        result = {
          displacement_questions: qResult,
          content_draft: content,
          message: 'Генерирани въпроси + content draft',
        };
        break;
      }

      case 'remeasure':
      case 'run_auto_optimizer':
        result = await runAutonomousOptimizer(env, normalized, {
          max_actions: options.max_actions ?? 6,
          actions: options.actions,
        });
        break;

      default:
        return { error: 'unknown_action', action, finding_id: findingId };
    }

    if (spec?.follow_up === 'remeasure' && action === 'activate_edge') {
      await runAutonomousOptimizer(env, normalized, {
        max_actions: 2,
        actions: ['remeasure'],
      }).catch(() => null);
    }

    if (options.manual_input && env.DB) {
      await saveManualConfirmation(env, normalized, findingId, options.manual_input).catch(() => null);
    }

    return {
      domain: normalized,
      finding_id: findingId,
      action,
      status: 'ok',
      result,
      manual_input: options.manual_input ?? null,
      finished_at: new Date().toISOString(),
    };
  } catch (err) {
    return {
      domain: normalized,
      finding_id: findingId,
      action,
      status: 'error',
      error: err.message,
    };
  }
}

async function saveManualConfirmation(env, domain, findingId, manualInput) {
  await saveOptimizerRun(env, domain, {
    type: 'manual_confirmation',
    finding_id: findingId,
    ...manualInput,
    saved_at: new Date().toISOString(),
  });
}

export async function saveFindingManualOnly(env, domain, findingId, manualInput) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  await saveManualConfirmation(env, normalized, findingId, manualInput ?? {});
  return {
    domain: normalized,
    finding_id: findingId,
    status: 'manual_saved',
    manual_input: manualInput ?? {},
    finished_at: new Date().toISOString(),
  };
}
