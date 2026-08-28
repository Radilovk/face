import assert from 'node:assert/strict';
import {
  stripTracking,
  extractNumbers,
  numericMatch,
  extractPassageAroundClaim,
  htmlToText,
  extractContentVersion,
} from '../src/citations/verify.js';
import {
  classifyFromVerify,
  detectParametricRecall,
  isSovEligible,
  isMisattribution,
} from '../src/citations/classify.js';
import { verifyCitation } from '../src/citations/verify.js';

export function testVerifyClassify() {
  const cleaned = stripTracking('https://shop.bg/p?utm_source=x&fbclid=abc&id=1');
  assert.equal(cleaned, 'https://shop.bg/p?id=1');

  const nums = extractNumbers('Протеин 2.5kg за 49.99 €');
  assert(nums.length >= 1);

  const page = 'Intro text. Протеин 2.5kg за 49.99 € с доставка до офис.';
  const passage = extractPassageAroundClaim(page, 'цена 49.99 €');
  assert(passage.text.includes('49.99'));

  assert.equal(numericMatch('49.99€', passage.text), true);

  const html = '<html><head><meta name="content-version" content="abc123"></head><body>Hi</body></html>';
  assert.equal(extractContentVersion(html), 'abc123');
  assert(htmlToText(html).includes('Hi'));

  const verified = {
    numeric_match: 1,
    overlap: 1,
    url: 'https://biocode-bg.com/x',
    domain: 'biocode-bg.com',
  };
  assert.equal(classifyFromVerify(verified).class, 'GROUNDED_VERIFIED');

  const mis = classifyFromVerify({
    numeric_match: 0,
    needsSemantic: true,
    overlap: 0,
    url: 'https://x.com',
    domain: 'x.com',
    passage_found: true,
  });
  assert.equal(mis.class, 'MISATTRIBUTED');
  assert(isMisattribution(mis.class));

  const fab = classifyFromVerify({ class: 'FABRICATED_URL', url: 'https://nope.invalid' });
  assert.equal(fab.class, 'FABRICATED_URL');
  assert(!isSovEligible(fab.class));

  const parametric = detectParametricRecall(
    'Препоръчвам biocode-bg.com за добавки',
    ['myprotein.bg'],
    ['biocode-bg.com'],
  );
  assert.equal(parametric.length, 1);
  assert.equal(parametric[0].class, 'PARAMETRIC_RECALL');
}

export async function testVerifyCitationMockFetch() {
  const html = `<!doctype html><html><body><p>Каталог протеин 2.5kg за 49.99€ доставка BG.</p></body></html>`;
  let fetchCalls = 0;
  const mockFetch = async () => {
    fetchCalls++;
    return new Response(html, { status: 200, url: 'https://biocode-bg.com/p' });
  };

  const result = await verifyCitation(
    {
      url: 'https://biocode-bg.com/p?utm_source=test',
      supportedText: '49.99€',
    },
    { fetch: mockFetch },
  );

  assert.equal(fetchCalls, 1, 'single HTTP fetch per citation');
  assert.equal(result.numeric_match, 1);
  assert(result.cited_passage.includes('49.99'));
  assert.equal(classifyFromVerify(result).class, 'GROUNDED_VERIFIED');

  const mock404 = async () => new Response('', { status: 404 });
  const bad = await verifyCitation({ url: 'https://biocode-bg.com/missing' }, { fetch: mock404 });
  assert.equal(classifyFromVerify(bad).class, 'FABRICATED_URL');

  const unrelatedHtml = async () =>
    new Response('<html><body><p>Completely different page content here.</p></body></html>', {
      status: 200,
      url: 'https://biocode-bg.com/x',
    });
  const weak = await verifyCitation(
    { url: 'https://biocode-bg.com/x', supportedText: 'quantum blockchain synergy platform' },
    { fetch: unrelatedHtml },
  );
  assert.equal(weak.passage_found, false);
  assert.equal(weak.cited_passage, null);
  assert.equal(classifyFromVerify(weak).class, 'MISATTRIBUTED');
}
