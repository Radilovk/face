import { probeDomain } from '../diagnose/probe.js';
import { runDeepAudit } from '../diagnose/deepAudit.js';
import { buildDeepResearchReport, loadLatestDeepAudit } from '../diagnose/deepResearch.js';
import { persistDiagnostic } from '../diagnose/probe.js';
import { passageAutonomy, computeDiagnosticScore } from '../diagnose/score.js';
import { resolveTenantByDomain } from './questions.js';

/**
 * GET /api/diagnose/deep/{domain}
 * Multi-page deep research with executive summary and priority strategy.
 */
export async function fetchDeepResearch(env, domain, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const useCache = options.refresh !== true && options.force !== true;

  let tenant = null;
  if (env.DB) {
    tenant = await resolveTenantByDomain(env.DB, normalized);
  }

  if (useCache && env.DB && options.live !== true) {
    const cached = await loadLatestDeepAudit(env.DB, normalized);
    if (cached?.pages_fetched >= 3) {
      const probe = await probeDomain(normalized, {
        fetch: fetchImpl,
        brand: tenant?.name,
      });
      const report = buildDeepResearchReport(cached, probe, {
        brand: tenant?.name,
      });
      return {
        domain: normalized,
        brand: tenant?.name ?? null,
        source: 'cache',
        deep_audit: cached,
        research_report: report,
      };
    }
  }

  const probe = await probeDomain(normalized, {
    fetch: fetchImpl,
    brand: tenant?.name,
  });

  const deepAudit = await runDeepAudit(normalized, probe, {
    fetch: fetchImpl,
    pageLimit: options.page_limit ?? 12,
    includeSmoke: options.include_smoke !== false,
    brand: tenant?.name,
  });

  const passage = passageAutonomy(
    probe.raw_json?.text_passage ?? probe.raw_json?.text_sample ?? '',
  );
  const score = computeDiagnosticScore(probe, passage);

  if (env.DB) {
    await persistDiagnostic(env.DB, probe, score, { deep_audit: deepAudit });
  }

  const report = buildDeepResearchReport(deepAudit, probe, {
    brand: tenant?.name,
  });

  return {
    domain: normalized,
    brand: tenant?.name ?? null,
    source: 'live',
    diagnostic_score: score,
    deep_audit: deepAudit,
    research_report: report,
  };
}
