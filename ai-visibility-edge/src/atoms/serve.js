/**
 * Повърхността: атомът като адресируем ресурс.
 *
 * Една и съща същност за всички — представянето се избира по `Accept`,
 * не по предположение кой е отсреща (вж. регистъра: никакъв branch по User-Agent).
 */

import { normalizeDomain } from './generate.js';

export const ATOM_PATH_PREFIX = '/a/';

/** JSON представяне — това, което агент би поискал. */
export function atomJson(atom, { base } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    url: base ? `${base}${ATOM_PATH_PREFIX}${atom.id}` : undefined,
    dateModified: atom.fact_date,
    mainEntity: {
      '@type': 'Question',
      name: atom.question_text,
      acceptedAnswer: {
        '@type': 'Answer',
        text: atom.answer_text,
        dateModified: atom.fact_date,
      },
    },
    identifier: atom.id,
    value: [atom.fact_value, atom.fact_unit].filter(Boolean).join(' '),
    provider: { '@type': 'Organization', url: `https://${normalizeDomain(atom.domain)}/` },
  };
}

/** Markdown — най-евтиният за парсване формат. */
export function atomMarkdown(atom) {
  const unit = atom.fact_unit ? ` ${atom.fact_unit}` : '';
  return [
    `# ${atom.question_text}`,
    '',
    atom.answer_text,
    '',
    `- Стойност: ${atom.fact_value}${unit}`,
    `- Към дата: ${atom.fact_date}`,
    atom.source_label ? `- Източник: ${atom.source_label}` : null,
    `- Идентификатор: ${atom.id}`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** HTML — видимо за човек, структурирано за машина. Едно и също съдържание. */
export function atomHtml(atom, { base, brand } = {}) {
  const jsonLd = JSON.stringify(atomJson(atom, { base }));
  const unit = atom.fact_unit ? ` ${esc(atom.fact_unit)}` : '';

  return `<!doctype html>
<html lang="bg"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(atom.question_text)}</title>
<link rel="canonical" href="${esc(base ?? '')}${ATOM_PATH_PREFIX}${esc(atom.id)}">
<meta name="content-version" content="${esc(atom.fact_date)}">
<script type="application/ld+json">${jsonLd}</script>
<style>
 body{font:16px/1.65 system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:2rem 1.25rem;color:#16191d}
 h1{font-size:1.3rem;line-height:1.3}
 .fact{font-size:1.5rem;font-weight:600;margin:.5rem 0}
 dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem .75rem;font-size:.9rem;color:#5b6670;margin-top:1.5rem}
 dt{font-weight:600}
</style></head><body>
<article>
  <h1>${esc(atom.question_text)}</h1>
  <p class="fact">${esc(atom.fact_value)}${unit}</p>
  <p>${esc(atom.answer_text)}</p>
  <dl>
    <dt>Към дата</dt><dd>${esc(atom.fact_date)}</dd>
    ${atom.source_label ? `<dt>Източник</dt><dd>${esc(atom.source_label)}</dd>` : ''}
    <dt>Публикувал</dt><dd>${esc(brand ?? normalizeDomain(atom.domain))}</dd>
  </dl>
</article>
</body></html>`;
}

/**
 * Избор на представяне по Accept. Без Accept → HTML.
 */
export function representationFor(request) {
  const accept = (request?.headers?.get('Accept') ?? '').toLowerCase();
  if (accept.includes('application/json') || accept.includes('application/ld+json')) return 'json';
  if (accept.includes('text/markdown')) return 'markdown';
  return 'html';
}

export function atomResponse(atom, request, { base, brand } = {}) {
  const kind = representationFor(request);
  const headers = { Vary: 'Accept', 'Cache-Control': 'public, max-age=300', 'X-AIV-Atom': atom.id };

  if (kind === 'json') {
    return new Response(JSON.stringify(atomJson(atom, { base }), null, 2), {
      headers: { ...headers, 'Content-Type': 'application/ld+json; charset=utf-8' },
    });
  }
  if (kind === 'markdown') {
    return new Response(atomMarkdown(atom), {
      headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }
  return new Response(atomHtml(atom, { base, brand }), {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Изброяване за llms.txt / ai-catalog — атом, който не е в директория,
 * съществува само за този, който вече знае адреса му.
 */
export function buildAtomIndexLines(atoms, base) {
  return (atoms ?? [])
    .filter((a) => a.status === 'published')
    .map((a) => `- [${a.question_text}](${base}${ATOM_PATH_PREFIX}${a.id}): ${a.fact_value}${a.fact_unit ? ' ' + a.fact_unit : ''} към ${a.fact_date}`);
}

export function buildAtomCatalog(atoms, base) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'Проверими твърдения',
    dataset: (atoms ?? [])
      .filter((a) => a.status === 'published')
      .map((a) => ({
        '@type': 'Dataset',
        identifier: a.id,
        name: a.question_text,
        url: `${base}${ATOM_PATH_PREFIX}${a.id}`,
        dateModified: a.fact_date,
      })),
  };
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
