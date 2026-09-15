# AI Visibility — SaaS платформа (оператор)

## Модел

**Един Worker → хиляди клиентски домейни.**

| Роля | Какво е | Пример |
|------|---------|--------|
| **Оператор (ти)** | Dashboard + API на `*.workers.dev` | Управление |
| **Tenant (клиент)** | Чужд бизнес домейн + HTML hosting | `client-shop.com` |

Pilot seed tenants (`is_pilot=1`) са dev данни — **не се показват** в `/api/sites` по подразбиране.

## Onboarding на нов клиент (1 API call)

```bash
curl -X POST https://YOUR-WORKER/api/sites \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "client-shop.com",
    "name": "Client Shop",
    "vertical_name": "E-commerce",
    "locale": "en",
    "market_country": "US",
    "run_analysis": true
  }'
```

Системата автоматично:
1. Създава tenant в D1
2. Генерира въпроси (Gemini или template)
3. Пуска pipeline (одит → measure → strategy)

## Optional: Custom Hostname (Edge live)

```bash
curl -X POST https://YOUR-WORKER/api/hostnames/client-shop.com/provision \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Изисква `SAAS_ZONE_ID` + `CF_API_TOKEN` на Worker (веднъж, platform level).

## API

| Endpoint | Описание |
|----------|----------|
| `GET /api/platform/info` | Tenant stats, architecture, onboarding flow |
| `GET /api/sites` | Client list (`?include_pilot=1` за seed) |
| `POST /api/sites` | Register + optional `run_analysis: true` |
| `PATCH /api/sites/{domain}` | Update status, locale, cron flags |
| `POST /api/pipeline/{domain}/run` | Full AI analysis |

## Secrets (platform — веднъж)

| Secret | Scope |
|--------|-------|
| `CF_API_TOKEN` | Platform |
| `SAAS_ZONE_ID` | Platform |
| `ADMIN_TOKEN` | Platform |
| `AIV_WORKER_URL` | Platform |

Клиент **не** получава secrets.
