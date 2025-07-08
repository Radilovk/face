# Настройка на Cloudflare Worker

Това ръководство описва как да използвате `worker.js` като бекенд за приложението.

## 1. Инсталиране на Wrangler

Wrangler е CLI инструмент за разгръщане на Cloudflare Workers.
```bash
npm install -g wrangler
```

## 2. Конфигурация

Създайте `wrangler.toml` в директорията на worker-а и посочете името и акаунта си:
```toml
name = "analyse-worker"
account_id = "YOUR_ACCOUNT_ID"
compatibility_date = "2024-05-01"
```

## 3. Разгръщане

```bash
wrangler publish worker.js
```

След разгръщане API-то ще е достъпно на даден URL (напр. `https://analyse-worker.your-account.workers.dev`).

## 4. Локално тестване

```bash
wrangler dev worker.js
```

## 5. Свързване с Frontend

В `js/main.js` заменете URL адреса при `fetch` с този на вашия Worker.

