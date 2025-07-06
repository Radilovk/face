# Face Analysis

Small demo that analyzes a selfie with help from OpenAI and Cloudflare Workers.

## Prerequisites

- **Node.js** v18 or later – required only for the helper scripts.
- **Cloudflare account** with a Workers and KV namespace created.

## Structure

- `index.html` – form for uploading a photo and answering questions
- `loading.html` – temporary page while the worker processes the image
- `results.html` – shows the analysis
- `css/` – styles
- `js/` – front‑end logic
- `src/worker.js` – Cloudflare Worker
- `assets/` – optional icons

## Deployment

1. Edit `wrangler.toml` and replace the KV namespace IDs with the ones from your Cloudflare dashboard.
2. Seed the KV with advice texts:
   ```bash
   export CF_API_TOKEN=YOUR_TOKEN
   export CF_ACCOUNT_ID=YOUR_ACCOUNT_ID
   export KV_NAMESPACE_ID=YOUR_NAMESPACE_ID
   node scripts/seed_kv.js
   ```
3. Publish the worker:
   ```bash
   wrangler publish
   ```
   Ensure `CF_API_TOKEN` is available in the environment.

## Privacy

Uploaded images are sent to your Cloudflare Worker and forwarded to OpenAI for analysis. The demo does not store the images after the request completes, but keep in mind they transit through these services.
