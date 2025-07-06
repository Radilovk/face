# Face Analysis

Small demo that analyzes a selfie with help from OpenAI and Cloudflare Workers.

## Structure

- `index.html` – form for uploading a photo and answering questions
- `loading.html` – temporary page while the worker processes the image
- `results.html` – shows the analysis
- `css/` – styles
- `js/` – front‑end logic
- `src/worker.js` – Cloudflare Worker
- `assets/` – optional icons

## Deployment

1. Fill `wrangler.toml` with your KV namespace IDs.
2. Run `wrangler publish` with `CF_API_TOKEN` available.

To populate the KV with advice texts, run `node scripts/seed_kv.js` with the environment variables `CF_API_TOKEN`, `CF_ACCOUNT_ID` and `KV_NAMESPACE_ID` set.

The seeding script requires **Node 18+** for the built-in `fetch` API. If you're on Node 16 or earlier, install [`node-fetch`](https://www.npmjs.com/package/node-fetch) and `require` it at the top of `seed_kv.js`.
Example for Node 16:

```js
const fetch = require('node-fetch');
```
