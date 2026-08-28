#!/usr/bin/env node
/**
 * POST /api/citations/reprocess on deployed Worker (after baseline D1 import).
 * Usage: WORKER_URL=... ADMIN_TOKEN=... npm run baseline:reprocess
 */
const url = (process.env.WORKER_URL || process.env.WORKER_PUBLIC_HOST || 'https://ai-visibility-edge.radilov-k.workers.dev').replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN;

if (!token) {
  console.warn('skip reprocess: ADMIN_TOKEN not set');
  process.exit(0);
}

const res = await fetch(`${url}/api/citations/reprocess`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('reprocess failed', res.status, body);
  process.exit(1);
}

console.log('reprocess ok:', JSON.stringify(body));
