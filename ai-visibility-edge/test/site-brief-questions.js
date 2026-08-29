import assert from 'node:assert/strict';
import { buildSiteBrief, extractTitle, extractFirstH1 } from '../src/diagnose/siteBrief.js';
import { parseQuestionsBlock } from '../src/questions/generateSmart.js';
import { generateQuestionDraftsSmart } from '../src/questions/generateSmart.js';

const SAMPLE_HTML = `<!DOCTYPE html><html><head>
<title>BIOCODE — добавки България</title>
<meta name="description" content="Магазин за хранителни добавки и пептиди с доставка в BG">
</head><body><h1>Пептиди и добавки</h1>
<script type="application/ld+json">{"@type":"Store","name":"BIOCODE"}</script>
<p>Цени от 29 лв. Продукти за отслабване и възстановяване.</p></body></html>`;

export function testExtractTitleAndH1() {
  assert.equal(extractTitle(SAMPLE_HTML), 'BIOCODE — добавки България');
  assert.equal(extractFirstH1(SAMPLE_HTML), 'Пептиди и добавки');
}

export function testBuildSiteBrief() {
  const brief = buildSiteBrief({
    probe: {
      domain: 'biocode-bg.com',
      jsonld_blocks: 1,
      html_text_chars: 1200,
      robots_ai_policy: 'allow',
      price_tokens: 2,
      raw_json: { html: SAMPLE_HTML, text_sample: 'Цени от 29 лв' },
    },
    brand: 'BIOCODE',
    verticalLabel: 'добавки',
  });

  assert.equal(brief.brand, 'BIOCODE');
  assert.equal(brief.title, 'BIOCODE — добавки България');
  assert(brief.jsonld_types.includes('Store'));
  assert(brief.diagnostic_signals.includes('has_prices'));
}

export function testParseQuestionsBlock() {
  const text = 'Ето:\n```questions\n[{"text":"Къде да купя пептиди в BG?","qtype":"product","intent":"product"}]\n```';
  const qs = parseQuestionsBlock(text);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].qtype, 'product');
}

export async function testGenerateQuestionDraftsSmartFallback() {
  const result = await generateQuestionDraftsSmart({
    domain: 'example.com',
    brand: 'Example',
    verticalLabel: 'SaaS',
    probe: null,
    env: null,
  });
  assert.equal(result.method, 'template');
  assert.equal(result.drafts.length, 5);
}

export function testParseQuestionsBlockInvalid() {
  assert.equal(parseQuestionsBlock('no block').length, 0);
}
