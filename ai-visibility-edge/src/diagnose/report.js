import { probeDomain, persistDiagnostic } from '../diagnose/probe.js';
import { passageAutonomy, computeDiagnosticScore } from '../diagnose/score.js';
import { analyzeDisplacement } from '../diagnose/displacement.js';
import { computeSov, currentPeriod } from '../index/sov.js';
import { renderReport } from '../report/template.js';

/**
 * Build full diagnostic report for a tenant domain.
 */
export async function buildDomainReport(env, domain, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const normalized = domain.replace(/^www\./, '').toLowerCase();

  const tenant = await env.DB.prepare(
    `SELECT t.id, t.apex_host, wd.vertical_id
     FROM tenants t
     JOIN watched_domains wd ON wd.tenant_id = t.id AND wd.role = 'tenant'
     WHERE t.apex_host = ? OR t.apex_host = ?`,
  )
    .bind(normalized, normalized.replace(/^www\./, ''))
    .first();

  if (!tenant) {
    return { error: 'unknown_domain', domain: normalized };
  }

  const probeResult = await probeDomain(tenant.apex_host, { fetch: fetchImpl });
  const passage = passageAutonomy(probeResult.raw_json?.text_sample ?? '');
  const diagnosticScore = computeDiagnosticScore(probeResult, passage);

  if (options.persist !== false && env.DB) {
    await persistDiagnostic(env.DB, probeResult, diagnosticScore);
  }

  let displacement = null;
  if (env.DB && tenant.vertical_id) {
    displacement = await analyzeDisplacement(env.DB, {
      domain: tenant.apex_host,
      verticalId: tenant.vertical_id,
      model: options.model ?? null,
    });
  }

  let sov = null;
  if (env.DB && tenant.vertical_id && options.includeSov !== false) {
    sov = await computeSov(env.DB, {
      domain: tenant.apex_host,
      verticalId: tenant.vertical_id,
      model: options.model ?? null,
      period: options.period ?? currentPeriod(),
    });
  }

  const payload = {
    domain: tenant.apex_host,
    vertical_id: tenant.vertical_id,
    generated_at: new Date().toISOString(),
    probe: probeResult,
    passage,
    diagnostic_score: diagnosticScore,
    displacement,
    sov,
  };

  return {
    ...payload,
    html: renderReport(payload),
  };
}
