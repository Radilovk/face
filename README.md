# Face Analysis

Small demo that analyzes a selfie with help from OpenAI and Cloudflare Workers.

## Prerequisites

- **Node.js** v18 or later – required only for the helper scripts since they rely on the built‑in `fetch` API. On older Node versions install `node-fetch` and import it in `scripts/seed_kv.js`.
- **Cloudflare account** with a Workers and KV namespace created.

## Structure

- `index.html` – form for uploading a photo and answering questions
- `loading.html` – temporary page while the worker processes the image
- `results.html` – shows the analysis
- `css/` – styles
- `js/` – front‑end logic
- `src/worker.js` – Cloudflare Worker
- `assets/` – images and icons

## Файл `data/products.json`

Каталогът с продукти е описан в `data/products.json`. Файлът съдържа масив
`categories`, в който всяка категория има следните ключове:

```json
{
  "id": "anti-aging",
  "title": "Anti-Aging & Клетъчна Регенерация",
  "image": "URL на изображението",
  "alt": "Алтернативен текст",
  "products": [
    {
      "name": "Epitalon",
      "tagline": "Ключът към удължаване на теломерите",
      "effects": [{ "label": "Активиране на Теломераза", "score": "9.5", "width": "95%" }],
      "description": "Кратко описание на продукта",
      "research": { "source": "Журнал", "url": "https://example.com" },
      "variants": [{ "title": "Epitalon 20 mg", "note": "прах", "link": "https://..." }]
    }
  ]
}
```

Този формат се използва както от предната част на сайта, така и от Cloudflare
Worker-а за предоставяне на каталога чрез API.

## Конфигурация

- **OPENAI_API_KEY** – приватен ключ за достъп до OpenAI. Подавайте го като секрет чрез:
  ```bash
  wrangler secret put OPENAI_API_KEY
  ```
- **FACE_ADVICE_KV** – конфигурационно име на KV namespace, съдържащ текстовете с препоръки. В `wrangler.toml` подменете `id` и `preview_id` със своите стойности.
- Адрес на Worker – в `loading.html` има константа `workerUrl`. За локални тестове или продукция я подменете с вашия URL.

### Публикуване на Worker-а

```bash
wrangler publish
# или с допълнителни опции
wrangler publish --name face-analysis-worker
```

## API

Cloudflare Worker-ът предоставя следните крайни точки:

- `POST /` – изпраща снимка и отговори за анализ.
- `GET /products` – връща каталога от `PRODUCTS_KV`.
- `PUT /products` – записва подадения JSON в `PRODUCTS_KV`.

Пример за ъплоуд на продукти:

```bash
curl -X PUT "https://<your-worker>.workers.dev/products" \
  --data-binary @data/products.json
```

Не забравяйте да активирате CORS в Worker-а за домейна, от който зареждате страниците.

## Административна страница

`admin.html` предоставя базов интерфейс за добавяне на категории и продукти.
При зареждане страницата се опитва да прочете `/products` от Worker-а.
Ако отговор няма, се използват данните от `localStorage` или `data/products.json`.
След редакция натиснете **"Запази промените"**, за да изпратите PUT заявка
към `/products` и да съхраните каталога в `PRODUCTS_KV`.

## Deployment

1. Install the dependencies:
   ```bash
   npm install
   ```
2. Edit `wrangler.toml` and replace the KV namespace IDs with the ones from your Cloudflare dashboard.
3. Seed the KV with advice texts:
   ```bash
   export CF_API_TOKEN=YOUR_TOKEN
   export CF_ACCOUNT_ID=YOUR_ACCOUNT_ID
   export KV_NAMESPACE_ID=YOUR_NAMESPACE_ID
   node scripts/seed_kv.js
   ```
4. Upload the initial products data:
   ```bash
   export KV_NAMESPACE_ID=YOUR_PRODUCTS_NAMESPACE_ID
   node scripts/seed_products.js
   ```
5. Publish the worker:
   ```bash
   wrangler publish
   ```
   Ensure `CF_API_TOKEN` is available in the environment.

## Privacy

Uploaded images are sent to your Cloudflare Worker and forwarded to OpenAI for analysis. The demo does not store the images after the request completes, but keep in mind they transit through these services.

## Идеи за подобрение

- Добавяне на базова автентикация за `admin.html`.
- Валидация на данните преди запис в `PRODUCTS_KV`.
- Автоматично изграждане на статичните страници чрез GitHub Actions.
