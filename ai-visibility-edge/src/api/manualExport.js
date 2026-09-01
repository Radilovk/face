/**
 * GET /api/strategy/:domain/manual-export — plain-text admin checklist download.
 */
import { fetchDomainStrategy } from '../diagnose/strategy.js';
import { getApplyPlan } from './apply.js';
import { fetchOnboardingStatus } from './onboarding.js';
import { buildManualExportText, manualExportFilename } from '../diagnose/manualExport.js';
import { fetchOptimizerStatus } from './optimizer.js';

export async function fetchManualExport(env, domain) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const strategy = await fetchDomainStrategy(env, normalized);
  if (strategy.error) {
    return { error: strategy.error, domain: normalized, status: 404 };
  }

  const [applyPlan, onboarding, optimizer] = await Promise.all([
    getApplyPlan(env, normalized).catch(() => null),
    fetchOnboardingStatus(env, normalized).catch(() => null),
    fetchOptimizerStatus(env, normalized).catch(() => null),
  ]);

  const text = buildManualExportText({
    domain: strategy.domain ?? normalized,
    brand: strategy.brand,
    verdict: strategy.verdict,
    findings_summary: strategy.findings_summary,
    findings: strategy.findings,
    manual_tasks: strategy.manual_tasks,
    applyPlan: applyPlan?.error ? null : applyPlan,
    onboarding: onboarding?.error ? null : onboarding,
    roadmap: optimizer?.roadmap ?? null,
    generated_at: strategy.generated_at,
  });

  return {
    domain: normalized,
    filename: manualExportFilename(normalized),
    text,
  };
}

export function manualExportResponse(exportPack) {
  if (exportPack.error) {
    return new Response(JSON.stringify(exportPack), {
      status: exportPack.status ?? 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(exportPack.text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportPack.filename}"`,
    },
  });
}
