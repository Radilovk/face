# Setup — secrets и deploy

## GitHub Secrets (за Actions)

| Secret | Има? | Workflow |
|--------|------|----------|
| `CF_ACCOUNT_ID` | ✅ | baseline-collect, deploy |
| `CF_API_TOKEN` | ✅ | baseline-collect, deploy |
| `KV_NAMESPACE_ID` | ✅ (face KV) | baseline-collect, deploy |
| `OPENAI_API_KEY` | **GitHub + Worker** | baseline-collect, citations cron |
| `GEMINI_API_KEY` | **GitHub + Worker** | baseline-collect, citations cron |
| `D1_DATABASE_ID` | **GitHub** (нов) | D1 migrations + import runs |

### Създай D1 (еднократно)

```bash
cd ai-visibility-edge
npx wrangler d1 create aiv
# Копирай database_id → GitHub Secret: D1_DATABASE_ID
# Обнови wrangler.toml или rely on CI sed patch
npx wrangler d1 migrations apply aiv --remote
```

След `D1_DATABASE_ID` в GitHub:
- **aiv-deploy** — миграции + secrets + deploy
- **aiv-baseline-collect** — import runs в D1 автоматично

## Cloudflare Worker secrets

| Secret | Роля |
|--------|------|
| `OPENAI_API_KEY` | Runtime citations |
| `GEMINI_API_KEY` | Runtime citations |
| `FACE_ADVICE_KV` | Binding name в face worker |

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
