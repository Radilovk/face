/**
 * IndexNow — notify Bing/Yandex (and partners) of URL updates for faster corpus indexing.
 * @see https://www.indexnow.org/documentation
 */

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * @param {{ host: string, key: string, urlList: string[], keyLocation?: string }} params
 * @param {{ fetch?: typeof fetch }} [options]
 */
export async function submitIndexNow(params, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const host = params.host.replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
  const key = params.key?.trim();
  const urlList = (params.urlList ?? []).filter(Boolean).slice(0, 10_000);

  if (!host || !key) {
    return { ok: false, error: 'host_and_key_required' };
  }
  if (urlList.length === 0) {
    return { ok: false, error: 'url_list_empty' };
  }

  const payload = {
    host,
    key,
    keyLocation: params.keyLocation ?? `https://${host}/${key}.txt`,
    urlList,
  };

  try {
    const res = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return {
      ok: res.ok || res.status === 202,
      status: res.status,
      host,
      submitted: urlList.length,
      url_list: urlList,
      submitted_at: new Date().toISOString(),
    };
  } catch (err) {
    return { ok: false, error: err.message, host };
  }
}

/** Generate IndexNow key file content (place at /{key}.txt on origin). */
export function buildIndexNowKeyFile(key) {
  return String(key ?? '').trim();
}

/**
 * @param {string} domain
 * @param {string} [key] — defaults to deterministic placeholder; tenant should set real key in KV
 */
export function suggestIndexNowKey(domain, key) {
  if (key) return key;
  const host = domain.replace(/^www\./, '').split('.')[0];
  return `${host}-aiv-${crypto.randomUUID().slice(0, 8)}`;
}
