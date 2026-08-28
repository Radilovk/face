import assert from 'node:assert/strict';
import { extractClientRedirect } from '../src/diagnose/resolveLanding.js';
import { buildApplyPlan } from '../src/apply/generate.js';

export function testExtractClientRedirectMeta() {
  const html = `<meta http-equiv="refresh" content="0; url=frontend/landing.html">`;
  const url = extractClientRedirect(html, 'https://ai-kasy.online/');
  assert(url.includes('landing.html'));
}

export function testExtractClientRedirectLocationReplace() {
  const html = `<script>location.replace('frontend/landing.html' + location.search);</script>`;
  const url = extractClientRedirect(html, 'https://example.com/');
  assert(url.includes('frontend/landing.html'));
}

export function testBuildApplyPlanJsonLd() {
  const plan = buildApplyPlan({
    probe: { domain: 'test.com', html_text_chars: 50, jsonld_blocks: 0, robots_ai_policy: 'none' },
    tenant: { apex_host: 'test.com', name: 'Test App', vertical_name: 'SaaS' },
    strategy: { top_issues: [] },
  });
  assert(plan.fixes.some((f) => f.id === 'jsonld'));
  assert(plan.fixes.some((f) => f.id === 'homepage_content'));
  assert(plan.fixes.find((f) => f.id === 'jsonld').artifact.includes('SoftwareApplication'));
}

export function testBuildApplyPlanRedirectHint() {
  const plan = buildApplyPlan({
    probe: {
      domain: 'test.com',
      html_text_chars: 39,
      jsonld_blocks: 0,
      robots_ai_policy: 'none',
      raw_json: {
        redirect_chain: [
          { url: 'https://test.com/', text_chars: 39 },
          { url: 'https://test.com/landing', text_chars: 2000 },
        ],
      },
    },
    tenant: { apex_host: 'test.com', name: 'Test' },
    strategy: { top_issues: [] },
  });
  assert(plan.fixes.some((f) => f.id === 'root_redirect'));
}
