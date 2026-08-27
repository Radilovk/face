#!/usr/bin/env node
/** Local/CI helper — reprocess via wrangler d1 + fetch to deployed worker, or dry log */
console.log('Use POST /api/citations/reprocess on deployed worker, or cron after runs.');
console.log('For local D1 testing, import runs first: npm run db:import-baseline -- --local');
