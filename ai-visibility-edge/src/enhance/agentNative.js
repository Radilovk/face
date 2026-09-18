/**
 * Agent-Native pack — discovery surfaces for AI agents (isitagentready / Level 5 pattern).
 * Same responses for all clients; path-based + Accept negotiation (no UA cloaking).
 */
import { buildLlmsTxt } from './llms.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };

/**
 * @param {{ domain: string, brand: string, vertical?: string, probe?: object }} input
 */
export function buildAgentNativePack(input = {}) {
  const { domain, brand, vertical, probe } = input;
  const host = normalizeHost(domain);
  const base = `https://${host}`;

  return {
    ai_catalog: buildAiCatalog({ domain: host, brand, vertical, base }),
    auth_md: buildAuthMd({ domain: host, brand, base }),
    api_catalog: buildApiCatalogLinkset({ domain: host, brand, base }),
    oauth_protected_resource: buildOAuthProtectedResource({ domain: host, base }),
    oauth_authorization_server: buildOAuthAuthorizationServer({ domain: host, base }),
    agent_skills_index: buildAgentSkillsIndex({ domain: host, brand, base }),
    llms_full_txt: buildLlmsFull({ domain: host, brand, vertical, base, probe }),
    homepage_markdown: buildHomepageMarkdown({ domain: host, brand, vertical, base, probe }),
  };
}

/** ARD — /.well-known/ai-catalog.json (displayName + CORS required by scanners). */
export function buildAiCatalog({ domain, brand, vertical, base }) {
  const v = vertical ?? 'business';
  const urn = `urn:air:${domain}:site`;
  return {
    specVersion: '1.0',
    host: { displayName: brand },
    entries: [
      {
        identifier: urn,
        displayName: brand,
        type: 'website',
        url: `${base}/`,
        representativeQueries: [
          `What is ${brand}?`,
          `Best ${v} in Bulgaria`,
          `${brand} official site`,
        ],
      },
      {
        identifier: `${urn}:catalog`,
        displayName: `${brand} API catalog`,
        type: 'api-catalog',
        url: `${base}/.well-known/api-catalog`,
        representativeQueries: [`${brand} API discovery`],
      },
      {
        identifier: `${urn}:auth`,
        displayName: `${brand} auth.md`,
        type: 'auth',
        url: `${base}/auth.md`,
        representativeQueries: [`How to authenticate with ${brand}`],
      },
    ],
  };
}

/** RFC 9727-style linkset for machine-readable API discovery. */
export function buildApiCatalogLinkset({ domain, brand, base }) {
  return {
    linkset: [
      {
        anchor: `${base}/`,
        rel: 'api-catalog',
        href: `${base}/.well-known/api-catalog`,
        type: 'application/linkset+json',
      },
      {
        anchor: `${base}/`,
        rel: 'ai-catalog',
        href: `${base}/.well-known/ai-catalog.json`,
        type: 'application/json',
      },
      {
        anchor: `${base}/`,
        rel: 'agent-skills',
        href: `${base}/.well-known/agent-skills.json`,
        type: 'application/json',
      },
      {
        anchor: `${base}/`,
        rel: 'llms-txt',
        href: `${base}/llms.txt`,
        type: 'text/plain',
      },
      {
        anchor: `${base}/`,
        rel: 'auth',
        href: `${base}/auth.md`,
        type: 'text/markdown',
      },
    ],
    meta: { domain, brand, generated_by: 'AI Visibility Edge' },
  };
}

/** /auth.md — H1 must contain "auth.md" for agent-ready scanners. */
export function buildAuthMd({ domain, brand, base }) {
  return `# auth.md — ${brand} agent access

> Machine-readable authentication and discovery notes for AI agents visiting **${domain}**.

## Public read access

Most catalog and marketing pages are **anonymous-readable**. No bearer token is required for:

- \`${base}/\` — homepage
- \`${base}/llms.txt\` — curated page map
- \`${base}/.well-known/ai-catalog.json\` — ARD manifest
- \`${base}/.well-known/api-catalog\` — API linkset

## Authenticated flows (when applicable)

If your agent needs write or account APIs, use OAuth discovery:

- Protected resource metadata: \`${base}/.well-known/oauth-protected-resource\`
- Authorization server: \`${base}/.well-known/oauth-authorization-server\`
- Agent skills index (register_uri): \`${base}/.well-known/agent-skills.json\`

## Anonymous agent identity

\`\`\`json
{
  "identity_types_supported": ["anonymous", "bearer"],
  "claim_uri": "${base}/auth.md",
  "credential_types_supported": ["none", "bearer"]
}
\`\`\`

## Contact

Official site: ${base}/  
Brand: ${brand}
`;
}

export function buildOAuthProtectedResource({ domain, base }) {
  return {
    resource: `${base}/`,
    authorization_servers: [`${base}/.well-known/oauth-authorization-server`],
    scopes_supported: ['read:public', 'read:catalog'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${base}/auth.md`,
  };
}

export function buildOAuthAuthorizationServer({ domain, base }) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/auth.md`,
    token_endpoint: `${base}/.well-known/agent-skills.json`,
    registration_endpoint: `${base}/.well-known/agent-skills.json`,
    scopes_supported: ['read:public'],
    agent_auth: {
      skill: `${base}/auth.md`,
      register_uri: `${base}/.well-known/agent-skills.json`,
    },
    identity_types_supported: ['anonymous', 'bearer'],
    claim_uri: `${base}/auth.md`,
    credential_types_supported: ['none', 'bearer'],
  };
}

export function buildAgentSkillsIndex({ domain, brand, base }) {
  return {
    specVersion: '1.0',
    domain,
    displayName: `${brand} Agent Skills`,
    skills: [
      {
        id: 'discover-site',
        name: 'Discover site catalog',
        description: `Read ARD and llms.txt for ${brand}`,
        url: `${base}/.well-known/ai-catalog.json`,
      },
      {
        id: 'read-auth',
        name: 'Read auth.md',
        description: 'Authentication and anonymous access policy',
        url: `${base}/auth.md`,
      },
    ],
    register_uri: `${base}/.well-known/agent-skills.json`,
  };
}

export function buildLlmsFull({ domain, brand, vertical, base, probe }) {
  const short = buildLlmsTxt({ domain, brand, vertical });
  const title = probe?.raw_json?.title ?? brand;
  const sample = probe?.raw_json?.text_sample ?? '';
  return (
    short +
    '\n## Full page extract (probe snapshot)\n\n' +
    `Title: ${title}\n\n` +
    (sample ? `${sample.slice(0, 4000)}\n` : '')
  );
}

export function buildHomepageMarkdown({ domain, brand, vertical, base, probe }) {
  const title = probe?.raw_json?.title ?? brand;
  const meta = probe?.raw_json?.meta_description ?? '';
  const h1 = probe?.raw_json?.h1 ?? brand;
  const text = probe?.raw_json?.text_sample ?? '';
  const v = vertical ?? 'услуги';

  return `# ${h1 || brand}

> ${meta || `${brand} — ${v} (${domain})`}

${text.slice(0, 6000)}

---

- Canonical: ${base}/
- llms.txt: ${base}/llms.txt
- ARD: ${base}/.well-known/ai-catalog.json
- auth.md: ${base}/auth.md
`;
}

/** Well-known + auth paths served by Edge when agent_native is enabled. */
export const AGENT_NATIVE_PATHS = {
  '/.well-known/ai-catalog.json': 'ai_catalog',
  '/.well-known/api-catalog': 'api_catalog',
  '/.well-known/oauth-protected-resource': 'oauth_protected_resource',
  '/.well-known/oauth-authorization-server': 'oauth_authorization_server',
  '/.well-known/agent-skills.json': 'agent_skills_index',
  '/auth.md': 'auth_md',
};

export function wantsMarkdownResponse(request) {
  const accept = request.headers.get('Accept') ?? '';
  return accept.toLowerCase().includes('text/markdown');
}

export function jsonResponse(data, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-AIV-Agent-Native': '1',
      ...CORS,
      ...extraHeaders,
    },
  });
}

export function markdownResponse(body, { source = 'edge', vary = false } = {}) {
  const headers = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=600',
    'X-AIV-Markdown-Source': source,
    'X-AIV-Agent-Native': '1',
  };
  if (vary) headers.Vary = 'Accept';
  return new Response(body, { status: 200, headers });
}

export function plainResponse(body, contentType = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-AIV-Agent-Native': '1',
    },
  });
}

/**
 * Serve agent-native artifact for path, or null to continue pipeline.
 * @returns {Response|null}
 */
export function serveAgentNativePath(pathname, edgeConfig) {
  if (!edgeConfig?.edge?.agent_native) return null;

  const key = AGENT_NATIVE_PATHS[pathname];
  if (!key) return null;

  const value = edgeConfig[key];
  if (value == null) return null;

  if (key === 'auth_md') return markdownResponse(String(value), { source: 'edge-config' });
  if (typeof value === 'string') return plainResponse(value);
  return jsonResponse(value);
}

export function discoveryLinkHeaderValue(base) {
  const b = base.replace(/\/$/, '');
  return [
    `<${b}/.well-known/api-catalog>; rel="api-catalog"`,
    `<${b}/.well-known/ai-catalog.json>; rel="ai-catalog"`,
    `<${b}/llms.txt>; rel="llms-txt"`,
    `<${b}/auth.md>; rel="auth"`,
    `<${b}/.well-known/agent-skills.json>; rel="agent-skills"`,
  ].join(', ');
}

export function parseContentSignal(robotsText) {
  if (!robotsText) return null;
  const m = robotsText.match(/^Content-Signal:\s*(.+)$/im);
  return m ? m[1].trim() : null;
}

export function contentSignalOk(signal) {
  if (!signal) return false;
  const lower = signal.toLowerCase();
  return lower.includes('search=yes') && lower.includes('ai-input=yes');
}

export function hasAgentmap(robotsText) {
  if (!robotsText) return false;
  return /Agentmap:\s*(?:https?:\/\/[^\s]+|\/?\.well-known\/ai-catalog\.json)/i.test(robotsText);
}

function normalizeHost(domain) {
  return String(domain ?? '')
    .replace(/^www\./, '')
    .replace(/^https?:\/\//, '')
    .split('/')[0];
}
