import { probeDomain } from '../diagnose/probe.js';
import { passageAutonomy, computeDiagnosticScore } from '../diagnose/score.js';
import { fetchDomainStrategy } from '../diagnose/strategy.js';
import { buildApplyPlan } from '../apply/generate.js';
import { resolveTenantByDomain } from './questions.js';

export async function getApplyPlan(env, domain, options = {}) {
  if (!env.DB) return { error: 'db_not_bound' };

  const tenant = await resolveTenantByDomain(env.DB, domain);
  if (!tenant) {
    return {
      error: 'unknown_domain',
      domain,
      hint: 'Добавете домейна през dashboard (+ Сайт).',
    };
  }

  const strategy = await fetchDomainStrategy(env, tenant.apex_host, options);
  const edgeActive = Boolean(options.edgeActive);

  const apply = buildApplyPlan({
    probe: {
      domain: tenant.apex_host,
      html_text_chars: strategy.probe?.html_text_chars,
      jsonld_blocks: strategy.probe?.jsonld_blocks,
      robots_ai_policy: strategy.probe?.robots_ai_policy,
      raw_json: {
        final_url: strategy.probe?.final_url,
        redirect_chain: strategy.probe?.redirect_chain ?? [],
      },
    },
    strategy,
    tenant: {
      apex_host: tenant.apex_host,
      name: tenant.name,
      vertical_name: tenant.vertical_name,
      is_canary: tenant.is_canary,
    },
    edgeActive,
  });

  return { ...apply, strategy_score: strategy.score, verdict: strategy.verdict };
}

/** Run apply prep: fresh probe + strategy + generated artifacts. */
export async function runApplyPrep(env, domain, options = {}) {
  const plan = await getApplyPlan(env, domain, options);
  if (plan.error) return plan;

  if (env.DB && options.persist_probe !== false) {
    const tenant = await resolveTenantByDomain(env.DB, domain.replace(/^www\./, ''));
    const probe = await probeDomain(domain.replace(/^www\./, ''), {
      brand: tenant?.name ?? undefined,
    });
    const passage = passageAutonomy(probe.raw_json?.text_sample ?? '');
    const score = computeDiagnosticScore(probe, passage);
    const { persistDiagnostic } = await import('../diagnose/probe.js');
    await persistDiagnostic(env.DB, probe, score);
    plan.probe_after = {
      html_text_chars: probe.html_text_chars,
      jsonld_blocks: probe.jsonld_blocks,
      final_url: probe.raw_json?.final_url,
      redirect_chain: probe.raw_json?.redirect_chain,
      score,
    };
  }

  plan.status = 'artifacts_ready';
  plan.next_step = plan.edge_available
    ? 'Deploy edge config (Блок 4)'
    : 'Копирайте artifacts в сайта → „Провери отново“ в dashboard';

  return plan;
}
