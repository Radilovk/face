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

### Структура на `data/products.json`

Файлът съдържа каталога с продукти и е организиран по категории:

```json
{
  "categories": [
    {
      "id": "anti-aging",
      "title": "Anti-Aging & Клетъчна Регенерация",
      "image": "url",
      "alt": "описание",
      "products": [
        {
          "name": "Epitalon",
          "tagline": "кратко резюме",
          "effects": [
            {"label": "Ефект", "score": "9", "width": "90%"}
          ],
          "description": "Пълен текст",
          "research": {"source": "източник", "url": "линк"},
          "variants": [
            {"title": "Форма", "note": "бележка", "link": "линк"}
          ]
        }
      ]
    }
  ]
}
```

Всяка категория има `id`, видим `title`, изображение и масив от продукти. Продуктите описват ефекти, източник на изследване и различни налични форми.

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
4. Optionally seed the KV with the product catalog:
   ```bash
   npm run seed:products
   ```
5. Publish the worker:
   ```bash
   wrangler publish
   ```
   Ensure `CF_API_TOKEN` is available in the environment.

## Privacy

Uploaded images are sent to your Cloudflare Worker and forwarded to OpenAI for analysis. The demo does not store the images after the request completes, but keep in mind they transit through these services.

## Административен панел

Файлът `admin.html` позволява локално редактиране на каталога с продукти.

1. Отворете `admin.html` в браузър.
2. Добавете категории и продукти чрез формите.
3. Натиснете **Запази**, за да съхраните промените в `localStorage`.
4. За да ги запишете във файла, копирайте съдържанието на `localStorage` ключа `products` обратно в `data/products.json`.

Панелът е предназначен само за локална подготовка на данните и не комуникира с Worker-а.

## Cloudflare Worker API

Публикуваният Worker приема POST заявка с изображение и отговори от формата:

```json
{
  "image": "data:image/png;base64,....",
  "answers": { "sleep": "good", ... }
}
```

Отговорът е JSON с анализ и препоръки. Примерно извикване с `curl`:

```bash
curl -X POST $WORKER_URL \
     -H 'Content-Type: application/json' \
     -d @payload.json
```

Адресът на Worker-а се задава в `loading.html` чрез константата `workerUrl`.
