/**
 * AI crawler tokens for robots.txt, bot logging, and probe diagnostics.
 * Search crawlers → citation/retrieval. Training crawlers → corpus opt-out (separate decision).
 */

/** @typedef {{ id: string, token: string, category: 'search' | 'training', asns?: number[] }} AiCrawler */

export const AI_SEARCH_CRAWLERS = [
  { id: 'oai-searchbot', token: 'OAI-SearchBot', category: 'search', asns: [20473, 396982, 15169, 16509] },
  { id: 'chatgpt-user', token: 'ChatGPT-User', category: 'search', asns: [20473, 396982, 15169, 16509] },
  { id: 'perplexitybot', token: 'PerplexityBot', category: 'search', asns: [209242, 396982] },
  { id: 'claude-searchbot', token: 'Claude-SearchBot', category: 'search', asns: [16509, 14618] },
  { id: 'googlebot', token: 'Googlebot', category: 'search', asns: [15169, 396982] },
  { id: 'bingbot', token: 'Bingbot', category: 'search', asns: [8075, 8068] },
];

export const AI_TRAINING_CRAWLERS = [
  { id: 'gptbot', token: 'GPTBot', category: 'training', asns: [20473, 396982, 15169, 16509] },
  { id: 'google-extended', token: 'Google-Extended', category: 'training', asns: [15169, 396982] },
  { id: 'anthropic-ai', token: 'anthropic-ai', category: 'training', asns: [16509, 14618] },
  { id: 'claudebot', token: 'ClaudeBot', category: 'training', asns: [16509, 14618] },
  { id: 'ccbot', token: 'CCBot', category: 'training', asns: [13335, 209242] },
];

export const ALL_AI_CRAWLERS = [...AI_SEARCH_CRAWLERS, ...AI_TRAINING_CRAWLERS];

/** Lowercase tokens for robots.txt probe matching */
export const AI_BOT_TOKENS = ALL_AI_CRAWLERS.map((c) => c.token.toLowerCase());

/** Search crawler tokens that must be allowed for AI citation */
export const REQUIRED_SEARCH_TOKENS = AI_SEARCH_CRAWLERS.map((c) => c.token);

/**
 * @param {string} domain
 * @param {{ allowTraining?: boolean, agentNative?: boolean, aiTrain?: boolean }} [options]
 */
export function buildRobotsTxt(domain, options = {}) {
  const allowTraining = options.allowTraining ?? true;
  const agentNative = options.agentNative ?? true;
  const aiTrain = options.aiTrain ?? false;
  const host = domain.replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
  const lines = [
    '# Managed by AI Visibility Edge — optimized for AI search citation',
  ];

  if (agentNative) {
    lines.push(
      'Content-Signal: search=yes, ai-input=yes, ai-train=' + (aiTrain ? 'yes' : 'no'),
      'Agentmap: /.well-known/ai-catalog.json',
      '',
    );
  }

  lines.push(
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /checkout/',
    '',
    '# Search / retrieval crawlers (required for AI citations)',
  );

  for (const bot of AI_SEARCH_CRAWLERS) {
    lines.push(`User-agent: ${bot.token}`, 'Allow: /', '');
  }

  lines.push('# Training crawlers (separate from search indexing)');
  const training = allowTraining ? AI_TRAINING_CRAWLERS : [];
  for (const bot of training) {
    lines.push(`User-agent: ${bot.token}`, 'Allow: /', '');
  }
  if (!allowTraining) {
    for (const bot of AI_TRAINING_CRAWLERS) {
      lines.push(`User-agent: ${bot.token}`, 'Disallow: /', '');
    }
  }

  lines.push(`Sitemap: https://${host}/sitemap.xml`);
  return lines.join('\n').trim() + '\n';
}

/** @returns {string[]} tokens missing explicit Allow in robots.txt */
export function findMissingSearchCrawlers(robotsText) {
  if (!robotsText) return REQUIRED_SEARCH_TOKENS;
  const lower = robotsText.toLowerCase();
  const missing = [];
  for (const token of REQUIRED_SEARCH_TOKENS) {
    const tokenLower = token.toLowerCase();
    if (!lower.includes(tokenLower)) {
      missing.push(token);
      continue;
    }
    const block = extractUserAgentBlock(lower, tokenLower);
    if (block && isFullSiteDisallow(block)) missing.push(token);
  }
  return missing;
}

function extractUserAgentBlock(text, tokenLower) {
  const blocks = text.split(/\n(?=user-agent:)/i);
  for (const block of blocks) {
    const ua = block.match(/^user-agent:\s*(.+)/im)?.[1]?.trim().toLowerCase();
    if (ua && (ua === tokenLower || ua.includes(tokenLower))) return block;
  }
  return null;
}

function isFullSiteDisallow(block) {
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*disallow:\s*(.+)\s*$/i);
    if (!m) continue;
    const path = m[1].trim();
    if (path === '/' || path === '/*') return true;
  }
  return false;
}
