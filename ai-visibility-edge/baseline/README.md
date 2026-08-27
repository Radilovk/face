# Baseline — базова линия за AI видимост

Историческият запис за **делта измерване**. Не се създава със задна дата.

## Структура

```
baseline/
  YYYY-MM-DD/
    manifest.json      # статус на сбора
    questions.json     # 20 въпроса
    domains.json       # 4 tenant домейна + competitors + control
    openai/            # пълен raw JSON (след collect)
    gemini/
    perplexity/
```

## Текущ snapshot

**`2026-08-27`** — 20 въпроса за:

| Домейн | Вертикал |
|--------|----------|
| daotslabna.com | Отслабване / добавки |
| biocode-bg.com | Спортни добавки / протеини |
| life-protocols.com | Дълголетие / протоколи |
| biocode-peptides.com | Research пептиди |

## Събиране на отговори

```bash
cd ai-visibility-edge
npm install
# OpenAI + Gemini от Cloudflare secrets при deploy;
# локално: export OPENAI_API_KEY=... GEMINI_API_KEY=...
npm run baseline:collect
```

Скриптът записва `openai/{question_id}.json` и `gemini/{question_id}.json` с **пълен** API отговор.

## Perplexity

Добави `PERPLEXITY_API_KEY` в Cloudflare secrets, после:

```bash
npm run baseline:collect -- --model perplexity
```
