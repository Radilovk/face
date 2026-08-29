/**
 * KV persistence for optimizer runs and content drafts.
 */

export function optimizerRunKey(domain) {
  return `aiv/optimizer/${normalizeDomain(domain)}/latest`;
}

export function optimizerDraftKey(domain, draftId) {
  return `aiv/optimizer/${normalizeDomain(domain)}/drafts/${draftId}`;
}

export async function saveOptimizerRun(env, domain, payload) {
  if (!env.CACHE) return null;
  const key = optimizerRunKey(domain);
  await env.CACHE.put(key, JSON.stringify(payload), { expirationTtl: 60 * 60 * 24 * 30 });
  return key;
}

export async function loadOptimizerRun(env, domain) {
  if (!env.CACHE) return null;
  return env.CACHE.get(optimizerRunKey(domain), 'json');
}

export async function saveContentDraft(env, domain, draft) {
  if (!env.CACHE) return null;
  const id = draft.id ?? crypto.randomUUID();
  const record = { ...draft, id, saved_at: new Date().toISOString() };
  await env.CACHE.put(optimizerDraftKey(domain, id), JSON.stringify(record), {
    expirationTtl: 60 * 60 * 24 * 90,
  });
  return record;
}

export async function listContentDrafts(env, domain) {
  if (!env.CACHE?.list) return [];
  const prefix = `aiv/optimizer/${normalizeDomain(domain)}/drafts/`;
  const listed = await env.CACHE.list({ prefix, limit: 20 });
  const drafts = [];
  for (const key of listed.keys ?? []) {
    const item = await env.CACHE.get(key.name, 'json');
    if (item) drafts.push(item);
  }
  return drafts.sort((a, b) => String(b.saved_at).localeCompare(String(a.saved_at)));
}

function normalizeDomain(domain) {
  return domain.replace(/^www\./, '').toLowerCase().split('/')[0];
}
