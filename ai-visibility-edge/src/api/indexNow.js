import { probeDomain } from '../diagnose/probe.js';
import { submitIndexNow, suggestIndexNowKey, buildIndexNowKeyFile } from '../indexing/indexNow.js';
import { resolveTenantByDomain } from './questions.js';
import { loadEdgeConfig, saveEdgeConfig } from '../config/tenantEdge.js';

export async function submitDomainIndexNow(env, domain, options = {}) {
  if (!env.DB) return { error: 'db_not_bound' };

  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const tenant = await resolveTenantByDomain(env.DB, normalized);
  if (!tenant) return { error: 'unknown_domain', domain: normalized };

  const edgeConfig = await loadEdgeConfig(env, normalized);
  let key = options.key ?? edgeConfig?.indexnow_key ?? null;

  if (!key && env.CACHE) {
    key = suggestIndexNowKey(normalized);
    const updated = {
      ...(edgeConfig ?? { domain: normalized, edge: { enabled: false } }),
      indexnow_key: key,
      indexnow_key_file: buildIndexNowKeyFile(key),
    };
    await saveEdgeConfig(env, normalized, updated);
  }

  if (!key) return { error: 'indexnow_key_missing', hint: 'KV binding required to store key' };

  const probe = options.urls?.length
    ? null
    : await probeDomain(normalized, { brand: tenant.name ?? undefined });
  const urlList =
    options.urls ??
    [probe?.raw_json?.final_url ?? `https://${normalized}/`].filter(Boolean);

  const result = await submitIndexNow({
    host: normalized,
    key,
    urlList,
    keyLocation: `https://${normalized}/${key}.txt`,
  });

  return {
    domain: normalized,
    tenant_id: tenant.id,
    key_location: `https://${normalized}/${key}.txt`,
    key_file_content: buildIndexNowKeyFile(key),
    ...result,
  };
}
