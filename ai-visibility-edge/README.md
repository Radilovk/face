# AI Visibility Edge

Платформа за измерване, диагностика и подобрение на AI видимост.

## Tenant домейни (baseline 2026-08-27)

| Домейн | Фокус |
|--------|--------|
| [daotslabna.com](https://daotslabna.com) | Отслабване, добавки |
| [biocode-bg.com](https://biocode-bg.com) | Протеини, витамини, каталог BG |
| [life-protocols.com](https://life-protocols.com) | Протоколи здраве / дълголетие |
| [biocode-peptides.com](https://biocode-peptides.com) | Research пептиди |

**Canary tenant:** `biocode-bg.com`

## Бърз старт

```bash
cd ai-visibility-edge
npm install
npm test
npm run dev          # /health → 200
npm run db:migrate:local
```

## Baseline (Блок 0.1)

20 въпроса в `baseline/2026-08-27/questions.json`. Събиране:

```bash
export OPENAI_API_KEY=...
export GEMINI_API_KEY=...
npm run baseline:collect
npm run baseline:collect -- --limit 5   # пилот, ~$1-3
```

## Secrets

| Къде | Име | Статус |
|------|-----|--------|
| GitHub | `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `KV_NAMESPACE_ID` | ✓ |
| Cloudflare Worker | `OPENAI_API_KEY`, `GEMINI_API_KEY`, `FACE_ADVICE_KV` | ✓ |
| Липсва | `PERPLEXITY_API_KEY` | за пълен 3× модел |
| Липсва | D1 `database_id` в wrangler.toml | при remote deploy |

## Документация

| Документ | Роля |
|----------|------|
| [СТРАТЕГИЯ](docs/СТРАТЕГИЯ.md) | Пълен план |
| [MASTER](docs/MASTER.md) | Източник на истина |
| [Обяснение за всеки](docs/обяснение-за-всеки.md) | Нетехнически |
| [baseline/README.md](baseline/README.md) | Базова линия |

