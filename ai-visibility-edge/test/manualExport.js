import assert from 'node:assert/strict';
import { buildManualExportText, manualExportFilename } from '../src/diagnose/manualExport.js';
import { manualExportResponse } from '../src/api/manualExport.js';
import { buildSiteFindings } from '../src/diagnose/findings.js';

const thinProbe = {
  domain: 'shop.bg',
  http_status: 503,
  html_text_chars: 280,
  jsonld_blocks: 0,
  has_canonical: 0,
  price_tokens: 0,
  robots_ai_policy: 'allow',
  blocked_bots: [],
  signals: { noindex: false, brand_mentions: 0, js_shell_suspect: false, sitemap_ok: false },
  raw_json: { final_url: 'https://shop.bg/', title: 'Welcome', text_sample: 'text' },
};

export function testManualExportTextContainsTasks() {
  const pack = buildSiteFindings({
    probe: thinProbe,
    brand: 'ShopBG',
    tenant: { apex_host: 'shop.bg', name: 'ShopBG' },
    edgeActive: false,
  });
  const text = buildManualExportText({
    domain: 'shop.bg',
    brand: 'ShopBG',
    verdict: { headline: 'Сайтът не е готов', summary: 'HTTP 503' },
    findings: pack.findings,
    findings_summary: '2 критични проблема',
  });
  assert(text.includes('РЪЧНИ ПРЕПОРЪКИ'));
  assert(text.includes('shop.bg'));
  assert(text.includes('ДЕТАЙЛНИ ЗАДАЧИ'));
  assert(text.includes('Hosting') || text.includes('хостинг') || text.includes('503'));
}

export function testManualExportFilenameSafe() {
  const name = manualExportFilename('www.Shop-BG.com');
  assert(name.startsWith('aiv-rachni-preporuki-'));
  assert(name.endsWith('.txt'));
  assert(!name.includes('www.'));
  assert(name.includes('shop-bg.com'));
}

export function testManualExportResponseHeaders() {
  const res = manualExportResponse({
    domain: 'shop.bg',
    filename: 'aiv-rachni-preporuki-shop.bg.txt',
    text: 'hello',
  });
  assert.equal(res.status, 200);
  assert(res.headers.get('Content-Type')?.includes('text/plain'));
  assert(res.headers.get('Content-Disposition')?.includes('attachment'));
}

export function testManualExportResponse404() {
  const res = manualExportResponse({ error: 'not_found', status: 404 });
  assert.equal(res.status, 404);
}
