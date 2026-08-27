# Setup — secrets и deploy

## Какво вече имате

| Secret | Къде | За проекта |
|--------|------|------------|
| `CF_ACCOUNT_ID` | GitHub | Deploy |
| `CF_API_TOKEN` | GitHub | Deploy |
| `KV_NAMESPACE_ID` | GitHub | `CACHE` binding в production |
| `OPENAI_API_KEY` | Cloudflare (face worker) | Baseline + citations |
| `GEMINI_API_KEY` | Cloudflare (face worker) | Baseline + citations |
| `FACE_ADVICE_KV` | Cloudflare | **Стар face worker** — не е AIV CACHE |

## Следващи стъпки за deploy на `ai-visibility-edge`

### 1. D1 база (еднократно)

```bash
cd ai-visibility-edge
npx wrangler d1 create aiv
# Копирай database_id в wrangler.toml
npx wrangler d1 migrations apply aiv --remote
```

### 2. KV за AIV (ако `KV_NAMESPACE_ID` е за face)

Ако GitHub `KV_NAMESPACE_ID` е за face проекта, създай отделен namespace:

```bash
npx wrangler kv namespace create CACHE
# id → wrangler.toml [[kv_namespaces]]
```

### 3. Secrets на **новия** worker

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
# по-късно:
npx wrangler secret put PERPLEXITY_API_KEY
npx wrangler secret put ADMIN_TOKEN
```

### 4. Deploy

```bash
CF_ACCOUNT_ID=... npx wrangler deploy
```

GitHub Actions deploy workflow — Блок 6.

## Baseline collect (локално)

```bash
export OPENAI_API_KEY=sk-...
export GEMINI_API_KEY=...
npm run baseline:collect -- --limit 5   # пилот
npm run baseline:collect                # всички 20
```

Raw JSON → `baseline/2026-08-27/{openai,gemini}/`. Commit в git (или остави gitignored и backup в R2).

## Липсва за пълен 3× модел

- `PERPLEXITY_API_KEY` — Cloudflare secret или local env

## Bing / GSC (безплатно, ръчно)

Регистрирай 4-те домейна в Bing Webmaster Tools и Google Search Console — Блок 0.3.
