/**
 * Cloudflare zone settings for AI/AEO — Bot Fight, managed robots, DNS-AID, cache purge.
 * Port of pilot apply-cloudflare-aeo pattern for AIV SaaS operator API.
 */
import { cfRequest } from './api.js';
import { AI_SEARCH_CRAWLERS } from '../config/aiCrawlers.js';

const AEO_ZONE_SETTINGS = [
  { id: 'bot_fight_mode', value: 'off', label: 'Bot Fight Mode OFF' },
  { id: 'cf_robots_variant', value: 'off', label: 'Bot Preference Sync OFF' },
  { id: 'is_robots_txt_managed', value: false, label: 'Managed robots.txt OFF' },
  { id: 'ai_bots_protection', value: 'disabled', label: 'AI bots protection disabled' },
];

const AEO_PURGE_PATHS = ['/robots.txt', '/sitemap.xml', '/llms.txt', '/.well-known/ai-catalog.json'];

const DNS_AID_RECORDS = [
  { name: '_index._agents', alpn: 'h2,h3', port: 443 },
  { name: '_mcp._agents', alpn: 'h2,h3', port: 443 },
  { name: '_a2a._agents', alpn: 'a2a', port: 443, mandatory: 'alpn,port' },
];

/**
 * Apply AEO-related Cloudflare zone settings for a tenant domain.
 * @param {object} env
 * @param {{ zoneId: string, domain: string, skipWaf?: boolean, skipDnsAid?: boolean, skipPurge?: boolean }} opts
 */
export async function applyCloudflareAeo(env, opts) {
  const zoneId = opts.zoneId;
  const domain = String(opts.domain ?? '')
    .toLowerCase()
    .replace(/^www\./, '');
  if (!zoneId) return { error: 'zone_id_required' };
  if (!domain) return { error: 'domain_required' };

  const actions = [];

  for (const setting of AEO_ZONE_SETTINGS) {
    const res = await patchZoneSetting(env, zoneId, setting.id, setting.value);
    actions.push({
      action: setting.id,
      label: setting.label,
      ok: Boolean(res.ok),
      skipped: Boolean(res.skipped),
      error: res.error ?? null,
      messages: res.messages ?? null,
    });
  }

  if (!opts.skipWaf) {
    const waf = await ensureWafAiCrawlerSkip(env, zoneId);
    actions.push({ action: 'waf_ai_skip', label: 'WAF skip for AI crawlers', ...waf });
  }

  if (!opts.skipDnsAid) {
    const dns = await applyDnsAidRecords(env, zoneId, domain);
    actions.push({ action: 'dns_aid', label: 'DNS-AID SVCB records', ...dns });
  }

  if (!opts.skipPurge) {
    const purge = await purgeAeoPaths(env, zoneId, domain);
    actions.push({ action: 'cache_purge', label: 'Purge AEO paths', ...purge });
  }

  const applied = actions.filter((a) => a.ok).length;
  const failed = actions.filter((a) => !a.ok && !a.skipped).length;

  return {
    ok: failed === 0,
    domain,
    zone_id: zoneId,
    actions,
    applied,
    failed,
    message:
      failed === 0
        ? `Cloudflare AEO настройки приложени за ${domain} (${applied} действия).`
        : `Частичен успех за ${domain}: ${applied} OK, ${failed} грешки — вижте actions.`,
    manual_remaining: ['dnssec_registrar'],
  };
}

export async function patchZoneSetting(env, zoneId, settingId, value) {
  const res = await cfRequest(env, `/zones/${zoneId}/settings/${settingId}`, {
    method: 'PATCH',
    body: { value },
  });
  if (res.ok) return { ok: true };

  const messages = res.messages ?? [];
  const notFound = res.status === 404 || messages.some((m) => /not found|unknown setting/i.test(m.message ?? ''));
  if (notFound) return { ok: false, skipped: true, error: 'setting_not_available', messages };

  return { ok: false, error: res.error ?? 'patch_failed', messages };
}

/** WAF custom ruleset skip for AI search crawler user-agents. */
export async function ensureWafAiCrawlerSkip(env, zoneId) {
  const tokens = AI_SEARCH_CRAWLERS.map((c) => c.token);
  const expression = tokens.map((t) => `(http.user_agent contains "${t}")`).join(' or ');

  const list = await cfRequest(env, `/zones/${zoneId}/rulesets`);
  if (list.error) return { ok: false, error: list.error, messages: list.messages };

  const existing = (list.result ?? []).find(
    (r) => r.name === 'AIV: allow AI search crawlers' && r.phase === 'http_request_firewall_custom',
  );

  const ruleBody = {
    name: 'AIV: allow AI search crawlers',
    description: 'Skip WAF/SBFM for AI search crawlers (AIV AEO pack)',
    kind: 'zone',
    phase: 'http_request_firewall_custom',
    rules: [
      {
        action: 'skip',
        action_parameters: {
          phases: ['http_request_sbfm', 'http_ratelimit', 'http_request_firewall_managed'],
        },
        expression,
        description: 'Allow OAI-SearchBot, PerplexityBot, Claude-SearchBot, etc.',
        enabled: true,
      },
    ],
  };

  if (existing?.id) {
    const upd = await cfRequest(env, `/zones/${zoneId}/rulesets/${existing.id}`, {
      method: 'PUT',
      body: ruleBody,
    });
    if (upd.ok) return { ok: true, updated: true, ruleset_id: existing.id };
    return { ok: false, error: upd.error, messages: upd.messages };
  }

  const created = await cfRequest(env, `/zones/${zoneId}/rulesets`, {
    method: 'POST',
    body: ruleBody,
  });
  if (created.ok) return { ok: true, created: true, ruleset_id: created.result?.id };
  return { ok: false, error: created.error, messages: created.messages, hint: 'manual_waf_skip' };
}

/** DNS-AID SVCB records for agent discovery at DNS layer. */
export async function applyDnsAidRecords(env, zoneId, domain) {
  const records = [];
  for (const spec of DNS_AID_RECORDS) {
    const res = await upsertSvcbRecord(env, zoneId, spec);
    records.push({ name: spec.name, ...res });
  }
  const ok = records.every((r) => r.ok || r.skipped);
  return { ok, records };
}

async function upsertSvcbRecord(env, zoneId, spec) {
  const list = await cfRequest(
    env,
    `/zones/${zoneId}/dns_records?type=SVCB&name=${encodeURIComponent(spec.name)}`,
  );
  if (list.error) return { ok: false, error: list.error };

  const data = buildSvcbData(spec);
  const existing = (list.result ?? [])[0];

  if (existing?.id) {
    const upd = await cfRequest(env, `/zones/${zoneId}/dns_records/${existing.id}`, {
      method: 'PATCH',
      body: { type: 'SVCB', name: spec.name, data, ttl: 3600 },
    });
    if (upd.ok) return { ok: true, updated: true };
    return { ok: false, error: upd.error, messages: upd.messages };
  }

  const created = await cfRequest(env, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: { type: 'SVCB', name: spec.name, data, ttl: 3600 },
  });
  if (created.ok) return { ok: true, created: true };
  if (created.status === 403 || created.status === 400) {
    return { ok: false, skipped: true, error: 'svcb_not_supported', messages: created.messages };
  }
  return { ok: false, error: created.error, messages: created.messages };
}

function buildSvcbData(spec) {
  const params = { alpn: spec.alpn, port: String(spec.port) };
  if (spec.mandatory) params.mandatory = spec.mandatory;
  return {
    priority: 1,
    target: '.',
    params,
  };
}

export async function purgeAeoPaths(env, zoneId, domain, extraPaths = []) {
  const host = String(domain ?? '')
    .toLowerCase()
    .replace(/^www\./, '');
  const paths = [...AEO_PURGE_PATHS, ...extraPaths];
  const base = host ? `https://${host}` : null;
  const files = base ? paths.map((p) => `${base}${p}`) : null;

  if (files) {
    const res = await cfRequest(env, `/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      body: { files },
    });
    if (res.ok) return { ok: true, paths, mode: 'files' };
  }

  const byPrefix = await cfRequest(env, `/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: { prefixes: paths },
  });
  if (byPrefix.ok) return { ok: true, paths, mode: 'prefix' };
  return { ok: false, error: 'purge_failed', messages: byPrefix.messages };
}
