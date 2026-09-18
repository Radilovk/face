/**
 * Live agent-native smoke checks — isitagentready-style contract against tenant domain.
 */
import { contentSignalOk, hasAgentmap } from '../enhance/agentNative.js';

const SEARCH_BOT_UAS = ['GPTBot', 'OAI-SearchBot', 'PerplexityBot'];

export const SMOKE_CHECKS = [
  { id: 'gptbot_homepage', label: 'GPTBot homepage (не 403)' },
  { id: 'robots_txt', label: 'robots.txt без CF managed prefix' },
  { id: 'robots_content_signal', label: 'Content-Signal + Agentmap' },
  { id: 'ai_catalog', label: 'ARD ai-catalog.json' },
  { id: 'auth_md', label: 'auth.md' },
  { id: 'api_catalog', label: 'api-catalog linkset' },
  { id: 'llms_txt', label: 'llms.txt' },
  { id: 'markdown_negotiation', label: 'Accept: text/markdown на /' },
];

/**
 * @param {string} domain
 * @param {{ fetch?: typeof fetch, userAgent?: string }} [options]
 */
export async function runAgentNativeSmoke(domain, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const host = String(domain).toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
  const base = `https://${host}`;
  const ua = options.userAgent ?? SEARCH_BOT_UAS[0];

  const checks = [
    await checkGptbotHomepage(fetchImpl, base, ua),
    ...(await checkRobotsPair(fetchImpl, base)),
    await checkAiCatalog(fetchImpl, base),
    await checkAuthMd(fetchImpl, base),
    await checkApiCatalog(fetchImpl, base),
    await checkLlms(fetchImpl, base),
    await checkMarkdownNegotiation(fetchImpl, base),
  ];

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass).length;
  const level = scoreLevel(checks);

  return {
    domain: host,
    ok: failed === 0,
    passed,
    failed,
    total: checks.length,
    level,
    level_label: levelLabel(level),
    checks,
    checked_at: new Date().toISOString(),
  };
}

async function checkGptbotHomepage(fetchImpl, base, ua) {
  try {
    const res = await fetchImpl(base + '/', {
      method: 'HEAD',
      headers: { 'User-Agent': ua },
      redirect: 'follow',
    });
    const pass = res.status !== 403 && res.status !== 401;
    return {
      id: 'gptbot_homepage',
      pass,
      status: res.status,
      detail: pass ? `${ua} → ${res.status}` : `${ua} блокиран (${res.status}) — Bot Fight / WAF?`,
    };
  } catch (e) {
    return { id: 'gptbot_homepage', pass: false, detail: String(e.message ?? e) };
  }
}

async function checkRobotsPair(fetchImpl, base) {
  try {
    const res = await fetchImpl(base + '/robots.txt', { headers: { 'User-Agent': 'AIV-Smoke/1.0' } });
    if (!res.ok) {
      return [
        { id: 'robots_txt', pass: false, status: res.status, detail: 'robots.txt липсва' },
        { id: 'robots_content_signal', pass: false, detail: '—' },
      ];
    }
    const text = await res.text();
    const managed = /# BEGIN Cloudflare Managed content/i.test(text);
    const signalOk = contentSignalOk(parseContentSignal(text));
    const agentmapOk = hasAgentmap(text);

    return [
      {
        id: 'robots_txt',
        pass: !managed,
        status: res.status,
        detail: managed ? 'CF Managed robots — изключете Bot Preference Sync' : 'OK',
      },
      {
        id: 'robots_content_signal',
        pass: signalOk && agentmapOk,
        detail: signalOk && agentmapOk ? 'Content-Signal + Agentmap OK' : 'Липсва Content-Signal или Agentmap',
      },
    ];
  } catch (e) {
    const msg = String(e.message ?? e);
    return [
      { id: 'robots_txt', pass: false, detail: msg },
      { id: 'robots_content_signal', pass: false, detail: msg },
    ];
  }
}

async function checkAiCatalog(fetchImpl, base) {
  return checkJson(fetchImpl, base + '/.well-known/ai-catalog.json', 'ai_catalog', (data) =>
    Boolean(data?.host?.displayName && Array.isArray(data?.entries) && data.entries.length > 0),
  );
}

async function checkAuthMd(fetchImpl, base) {
  try {
    const res = await fetchImpl(base + '/auth.md', { headers: { 'User-Agent': 'AIV-Smoke/1.0' } });
    if (!res.ok) return { id: 'auth_md', pass: false, status: res.status, detail: 'auth.md липсва' };
    const text = await res.text();
    const pass = /^#\s+auth\.md/im.test(text) || text.toLowerCase().includes('auth.md');
    return { id: 'auth_md', pass, status: res.status, detail: pass ? 'auth.md OK' : 'auth.md без очакван H1' };
  } catch (e) {
    return { id: 'auth_md', pass: false, detail: String(e.message ?? e) };
  }
}

async function checkApiCatalog(fetchImpl, base) {
  return checkJson(fetchImpl, base + '/.well-known/api-catalog', 'api_catalog', (data) =>
    Boolean(Array.isArray(data?.linkset) && data.linkset.length > 0),
  );
}

async function checkLlms(fetchImpl, base) {
  try {
    const res = await fetchImpl(base + '/llms.txt', { headers: { 'User-Agent': 'AIV-Smoke/1.0' } });
    return {
      id: 'llms_txt',
      pass: res.ok,
      status: res.status,
      detail: res.ok ? 'llms.txt OK' : 'llms.txt липсва',
    };
  } catch (e) {
    return { id: 'llms_txt', pass: false, detail: String(e.message ?? e) };
  }
}

async function checkMarkdownNegotiation(fetchImpl, base) {
  try {
    const res = await fetchImpl(base + '/', {
      headers: { Accept: 'text/markdown', 'User-Agent': 'AIV-Smoke/1.0' },
      redirect: 'follow',
    });
    const ct = res.headers.get('content-type') ?? '';
    const pass = res.ok && ct.includes('text/markdown');
    return {
      id: 'markdown_negotiation',
      pass,
      status: res.status,
      detail: pass ? 'Markdown negotiation OK' : `Очакван text/markdown, получен ${ct || res.status}`,
    };
  } catch (e) {
    return { id: 'markdown_negotiation', pass: false, detail: String(e.message ?? e) };
  }
}

async function checkJson(fetchImpl, url, id, validate) {
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': 'AIV-Smoke/1.0', Accept: 'application/json' } });
    if (!res.ok) return { id, pass: false, status: res.status, detail: `${id} HTTP ${res.status}` };
    const data = await res.json();
    const pass = validate(data);
    return { id, pass, status: res.status, detail: pass ? `${id} OK` : `${id} invalid payload` };
  } catch (e) {
    return { id, pass: false, detail: String(e.message ?? e) };
  }
}

function parseContentSignal(robotsText) {
  if (!robotsText) return null;
  const m = robotsText.match(/^Content-Signal:\s*(.+)$/im);
  return m ? m[1].trim() : null;
}

function scoreLevel(checks) {
  const core = ['gptbot_homepage', 'robots_txt', 'ai_catalog', 'llms_txt'];
  const corePass = core.every((id) => checks.find((c) => c.id === id)?.pass);
  const allPass = checks.every((c) => c.pass);
  if (allPass) return 5;
  if (corePass && checks.filter((c) => c.pass).length >= 6) return 4;
  if (corePass) return 3;
  return checks.filter((c) => c.pass).length >= 3 ? 2 : 1;
}

function levelLabel(level) {
  const labels = {
    5: 'Agent-Native (Level 5)',
    4: 'Advanced (Level 4)',
    3: 'AEO Ready (Level 3)',
    2: 'Partial',
    1: 'Needs work',
  };
  return labels[level] ?? 'Unknown';
}
