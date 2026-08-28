# Setup — secrets и deploy

## GitHub Secrets (за Actions)

| Secret | Има? | Workflow |
|--------|------|----------|
| `CF_ACCOUNT_ID` | ✅ | baseline-collect, deploy |
| `CF_API_TOKEN` | ✅ | baseline-collect, deploy |
| `KV_NAMESPACE_ID` | ✅ (face KV) | baseline-collect, deploy |
| `OPENAI_API_KEY` | **GitHub + Worker** | baseline-collect, citations cron |
| `GEMINI_API_KEY` | **GitHub + Worker** | baseline-collect, citations cron |
| `GEMINI_MODEL` | optional | default `gemini-3.7-flash` (GA 2026-08). **Не** `gemini-2.0-*` — shutdown |
| `ADMIN_TOKEN` | **Worker + GitHub** | POST endpoints, dashboard mutations |
| `AIV_WORKER_URL` | optional GitHub | baseline reprocess fallback |
| `D1_DATABASE_ID` | **GitHub** | `b5d03061-7656-4c76-b7c6-699d711d07e4` (в wrangler.toml) |

### D1 база `aiv`

**Database ID:** `b5d03061-7656-4c76-b7c6-699d711d07e4` (в `wrangler.toml`)

Опционално в GitHub Secrets със същата стойност: `D1_DATABASE_ID`

```bash
npx wrangler d1 migrations apply aiv --remote
```

След baseline collect — import автоматично в CI.

### Reprocess (runs → observations)

След като има `runs` в D1:

```bash
curl -X POST https://<worker>/api/citations/reprocess \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Или автоматично след **cron citations** (понеделник 03:00 UTC).

### API endpoints

| Endpoint | Описание |
|----------|----------|
| `/api/runs/stats` | Брой runs по model |
| `/api/observations/stats` | Класове + misattributions |
| `/api/sov?domain=&vertical_id=&model=` | AI-SOV snapshot |
| `/api/cache-index?domain=&vertical_id=&model=&window_hours=72` | Cache age distribution (median, p25, p75, coverage) |
| `/api/drift/status` | Config/run/bot drift alerts (Block 6.3) |
| `/api/onboarding/{domain}` | CNAME / Custom Hostname checklist |
| `/api/citations/reprocess` | POST — verify + classify |

## Cloudflare Worker secrets

| Secret | Роля |
|--------|------|
| `OPENAI_API_KEY` | Runtime citations |
| `GEMINI_API_KEY` | Runtime citations |
| `GEMINI_MODEL` | Override (default `gemini-3.7-flash`) |
| `OPENAI_MODEL` | Override (default `gpt-4.1-mini`) |
| `ADMIN_TOKEN` | POST /api/* mutations |
| `FACE_ADVICE_KV` | Binding name в face worker |

### AI model IDs (2026-08-28)

| Provider | Purpose | Model ID | Notes |
|----------|---------|----------|-------|
| Google | Citations + advisor | `gemini-3.7-flash` | GA 2026-08, google_search grounding |
| Google | Previous GA | `gemini-3.6-flash` | valid fallback via `GEMINI_MODEL` |
| Google | High-volume | `gemini-3.5-flash-lite` | optional via `GEMINI_MODEL` |
| OpenAI | Citations | `gpt-4.1-mini` | Responses API + web_search |
| Perplexity | Citations | `sonar` | optional |

`gemini-2.0-flash` и family — **shutdown** (Google changelog 2026-06). Registry: `src/config/models.js`, API: `GET /api/models/status`.

AIV използва **същия KV namespace** чрез `KV_NAMESPACE_ID` в GitHub — binding `CACHE` в `wrangler.toml`.

## Baseline collect (GitHub Action)

**Workflow:** `.github/workflows/aiv-baseline-collect.yml`

### Ръчно пускане

1. GitHub → **Actions** → **aiv-baseline-collect** → **Run workflow**
2. Параметри:
   - `limit`: `5` (пилот) или `20` (пълен)
   - `model`: `all` | `openai` | `gemini`

### Автоматично

- **Понеделник 06:00 UTC** — седмичен snapshot (limit 20, all models)

### Какво прави

1. `npm run baseline:collect` → raw JSON
2. `npm run baseline:upload-kv` → KV keys:
   ```
   aiv/baseline/2026-08-27/openai/q001
   aiv/baseline/2026-08-27/gemini/q001
   aiv/baseline/2026-08-27/manifest
   ```
3. Artifact backup (90 дни) в GitHub Actions

### Локално (алтернатива)

```bash
export OPENAI_API_KEY=...
export GEMINI_API_KEY=...
export CF_ACCOUNT_ID=...
export CF_API_TOKEN=...
export KV_NAMESPACE_ID=...
npm run baseline:collect -- --limit 5
npm run baseline:seed-fixtures -- --limit 5   # без API keys — fixture pilot
npm run baseline:close -- --pilot             # затваря Block 0.1 MVP gate
npm run baseline:upload-kv
```

## D1 (за deploy)

```bash
npx wrangler d1 create aiv
# database_id → wrangler.toml (замени local-d1-placeholder)
npx wrangler d1 migrations apply aiv --remote
```

Deploy: Actions → **aiv-deploy** (manual) след D1.

## Perplexity (по-късно)

Добави `PERPLEXITY_API_KEY` в GitHub + Cloudflare; разшири `baseline-collect.js`.
