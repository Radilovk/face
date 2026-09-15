/**
 * llms.txt — curated Markdown map for AI agents (complements robots.txt).
 */

/**
 * @param {{ domain: string, brand: string, vertical?: string, pages?: { url: string, title: string, description?: string }[] }} input
 */
export function buildLlmsTxt(input = {}) {
  const { domain, brand, vertical, pages = [] } = input;
  const host = domain.replace(/^www\./, '');
  const base = `https://${host}`;
  const v = vertical ?? 'услуги и продукти';

  const lines = [
    `# ${brand}`,
    `> ${brand} (${host}) — ${v}. Официален сайт за AI търсене и цитиране.`,
    '',
    '## Основни страници',
    `- [Начало](${base}/): ${brand} — кратко представяне, ключови ползи и контакти`,
  ];

  if (pages.length > 0) {
    for (const p of pages.slice(0, 12)) {
      const desc = p.description ? `: ${p.description}` : '';
      lines.push(`- [${p.title}](${p.url})${desc}`);
    }
  } else {
    lines.push(`- [FAQ](${base}/faq): Често задавани въпроси (ако съществува)`);
    lines.push(`- [Продукти/Услуги](${base}/products): Каталог и цени (ако съществува)`);
    lines.push(`- [Контакти](${base}/contact): Локация и връзка (ако съществува)`);
  }

  lines.push(
    '',
    '## За AI модели',
    `- Марка: ${brand}`,
    `- Домейн: ${host}`,
    `- Регион: България (BG)`,
    `- Canonical: ${base}/`,
    '',
    '## Optional',
    `- [Пълна документация](${base}/llms-full.txt)`,
  );

  return lines.join('\n').trim() + '\n';
}

export function renderLlmsTxt(edgeConfig) {
  if (edgeConfig?.llms_txt) return edgeConfig.llms_txt.trim() + '\n';
  if (edgeConfig?.domain && edgeConfig?.brand) {
    return buildLlmsTxt({
      domain: edgeConfig.domain,
      brand: edgeConfig.brand,
      vertical: edgeConfig.vertical,
      pages: edgeConfig.llms_pages,
    });
  }
  return null;
}

export function llmsResponse(body, { source = 'edge' } = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-AIV-Llms-Source': source,
    },
  });
}

export async function handleLlmsRequest(request, edgeConfig, fetchOrigin) {
  const mode = edgeConfig?.edge?.llms_mode ?? 'serve';
  if (mode === 'passthrough') return fetchOrigin(request);

  const managed = renderLlmsTxt(edgeConfig);
  if (!managed) return fetchOrigin(request);

  return llmsResponse(managed, { source: 'edge-config' });
}
