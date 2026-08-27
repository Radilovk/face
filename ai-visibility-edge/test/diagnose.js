import assert from 'node:assert/strict';
import { passageAutonomy, computeDiagnosticScore } from '../src/diagnose/score.js';
import { extractMentionedDomains } from '../src/diagnose/displacement.js';
import { renderReport } from '../src/report/template.js';
import { parseModelResponse } from '../src/citations/extract.js';

export function testPassageAutonomy() {
  const bad = passageAutonomy(
    'Това е добър продукт за отслабване с множество положителни отзиви от клиенти в България през последната година.\n\nТой помага за контрол на апетита и поддържа енергия през целия ден без странични ефекти.\n\nMyProtein предлага whey протеин на цена 49.99 € с бърза доставка до офис на куриер.',
  );
  assert(bad.anaphora_starts >= 1);
  assert(bad.score <= 100);

  const good = passageAutonomy(
    'BIOCODE biocode-bg.com предлага whey протеин Isolate на цена 59.99 € с доставка в България.',
  );
  assert(good.score >= 40);
}

export function testComputeDiagnosticScore() {
  const probe = {
    http_status: 200,
    html_text_chars: 1200,
    jsonld_blocks: 2,
    has_canonical: 1,
    price_tokens: 3,
    robots_ai_policy: 'allow',
  };
  const passage = { score: 80 };
  const score = computeDiagnosticScore(probe, passage);
  assert(score >= 60);
}

export function testDisplacementExtract() {
  const fixture = {
    model: 'perplexity',
    raw_response: JSON.stringify({
      choices: [{ message: { content: 'Препоръчвам myprotein.bg и zdrave.net за добавки.' } }],
      citations: ['https://myprotein.bg/'],
    }),
    answer_text: '',
  };

  const mentioned = extractMentionedDomains(fixture, new Set(['myprotein.bg', 'zdrave.net']));
  assert(mentioned.has('myprotein.bg'));
  assert(mentioned.has('zdrave.net'));
  assert(!mentioned.has('biocode-bg.com'));
}

export function testPerplexityAdapter() {
  const raw = {
    choices: [{ message: { content: 'Вижте https://biocode-bg.com/catalog' } }],
    citations: ['https://biocode-bg.com/catalog'],
  };
  const parsed = parseModelResponse('perplexity', raw);
  assert.equal(parsed.model, 'perplexity');
  assert(parsed.citations.length >= 1);
  assert(parsed.citations[0].url.includes('biocode'));
}

export function testReportTemplate() {
  const html = renderReport({
    domain: 'biocode-bg.com',
    diagnostic_score: 72,
    probe: { http_status: 200, html_text_chars: 5000, jsonld_blocks: 1, has_canonical: 1, robots_ai_policy: 'allow', price_tokens: 5 },
    passage: { score: 65, paragraphs: 8, anaphora_starts: 1 },
    displacement: {
      displaced_count: 2,
      total_runs: 10,
      displacement_rate: 0.2,
      events: [
        {
          model: 'openai',
          question_id: 'q006',
          competitors_mentioned: ['myprotein.bg'],
          summary: 'Моделът изброява myprotein.bg — biocode-bg.com липсва',
        },
      ],
    },
  });

  assert(html.includes('biocode-bg.com'));
  assert(html.includes('Извличане'));
  assert(html.includes('displacement') || html.includes('Изместване'));
}
