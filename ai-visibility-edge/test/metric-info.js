import assert from 'node:assert/strict';
import {
  METRIC_CATALOG,
  interpretMetricNow,
  buildMetricInfoClientScript,
  sanitizeMetricClientFn,
  pillarMetricId,
} from '../src/ui/metricInfo.js';

export function testMetricCatalogComplete() {
  const required = [
    'runs',
    'observations',
    'sov',
    'pending_reprocess',
    'cache_median',
    'diagnostic_score',
    'pillar_visibility',
    'displacement_rate',
    'baseline_gate',
    'drift',
    'edge_status',
    'optimizer',
  ];
  for (const id of required) {
    assert(METRIC_CATALOG[id], id);
    assert(METRIC_CATALOG[id].what);
    assert(METRIC_CATALOG[id].why);
  }
}

export function testInterpretMetricNowRuns() {
  assert(interpretMetricNow('runs', { value: 0 }).includes('0 runs'));
  assert(interpretMetricNow('runs', { value: 25 }).includes('25 runs'));
}

export function testInterpretMetricSov() {
  assert(interpretMetricNow('sov', { value: 0 }).includes('0%'));
  assert(interpretMetricNow('sov', { value: 35 }).includes('35.0%'));
}

export function testInterpretMetricPending() {
  assert(interpretMetricNow('pending_reprocess', { value: 0 }).includes('0'));
  assert(interpretMetricNow('pending_reprocess', { value: 3 }).includes('3 runs'));
}

export function testMetricInfoClientScript() {
  const js = buildMetricInfoClientScript();
  assert(js.includes('METRIC_CATALOG'));
  assert(js.includes('function interpretMetricNow'));
  assert(!js.includes('__name'), 'client script must not contain esbuild __name helpers');
}

export function testSanitizeMetricClientFn() {
  const bundled =
    'export function interpretMetricNow(id){const n=/* @__PURE__ */ __name((v)=>v,"n"); function n(v){return v;} __name(n,"n");}';
  const clean = sanitizeMetricClientFn(bundled);
  assert(clean.startsWith('function interpretMetricNow'));
  assert(!clean.includes('__name'));
  assert(clean.includes('function n(v){return v;}'));
}

export function testPillarMetricId() {
  assert.equal(pillarMetricId('visibility'), 'pillar_visibility');
  assert.equal(pillarMetricId('content'), 'pillar_content');
}
