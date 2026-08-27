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

20 въпроса в `baseline/2026-08-27/questions.json`.

### GitHub Action (препоръчително)

1. Добави в GitHub Secrets: `OPENAI_API_KEY`, `GEMINI_API_KEY` (копие от Cloudflare)
2. Actions → **aiv-baseline-collect** → Run workflow (`limit: 5` за пилот)
3. Резултат в **KV** (`aiv/baseline/...`) + artifact

Виж [docs/SETUP.md](docs/SETUP.md).

### Локално

```bash
npm run baseline:collect -- --limit 5
npm run baseline:upload-kv
```

## Документация

| Документ | Роля |
|----------|------|
| [СТРАТЕГИЯ](docs/СТРАТЕГИЯ.md) | Пълен план |
| [MASTER](docs/MASTER.md) | Източник на истина |
| [Обяснение за всеки](docs/обяснение-за-всеки.md) | Нетехнически |
| [baseline/README.md](baseline/README.md) | Базова линия |

