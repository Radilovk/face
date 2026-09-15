# Ръководство за администратори: AI видимост на сайт (GitHub + Cloudflare)

**За кого е:** администратори на сайт, изграден в **GitHub**, с домейн през **Cloudflare DNS/routing** и бекенд на **Cloudflare** (Pages, Workers или Pages + Worker).

**Цел:** сайтът да бъде **откриваем, четим и цитируем** от ChatGPT, Google Gemini, Perplexity и Claude — не класическо SEO, а **AI търсене (AEO/GEO)**.

**Време за технически основа:** 2–4 часа (ръчен път) или 30–60 минути (с AI Visibility Edge).

---

## Съдържание

1. [Как работи (30 секунди)](#1-как-работи-30-секунди)
2. [Вашата инфраструктура](#2-вашата-инфраструктура)
3. [Два пътя — изберете един](#3-два-пътя--изберете-един)
4. [Път A — Ръчно в GitHub repo (препоръчително за пълен контрол)](#4-път-a--ръчно-в-github-repo)
5. [Път B — AI Visibility Edge (автоматизация без CMS)](#5-път-b--ai-visibility-edge)
6. [Cloudflare — задължителни настройки](#6-cloudflare--задължителни-настройки)
7. [Съдържание — какво пишете на страниците](#7-съдържание--какво-пишете-на-страниците)
8. [IndexNow — по-бързо в Bing корпуса](#8-indexnow--по-бързо-в-bing-корпуса)
9. [Проверка след внедряване](#9-проверка-след-внедряване)
10. [Чести грешки](#10-чести-грешки)
11. [Чеклист за пускане](#11-чеклист-за-пускане)

---

## 1. Как работи (30 секунди)

AI моделите **не четат целия ви сайт**. Те:

1. **Обхождат** страниците (crawl) — ако `robots.txt` или WAF ги блокират → **нулева видимост**
2. **Извличат текст** от HTML — ако съдържанието е само в JavaScript → **празна страница**
3. **Цитират пасажи** — кратки, самостоятелни абзаци с факти, цени, марка
4. **Избират източник** при реален въпрос — конкурент с по-ясен отговор печели

Вашата задача: **отворете вратата** (техника) + **напишете отговори** (съдържание).

---

## 2. Вашата инфраструктура

Типична схема:

```
GitHub repo  →  push  →  Cloudflare Pages (или Worker)  →  Cloudflare DNS  →  вашият-домейн.com
```

| Компонент | Роля | Къде се променя |
|-----------|------|-----------------|
| GitHub | HTML, CSS, JS, `robots.txt`, `sitemap.xml`, `llms.txt` | Commit + merge |
| Cloudflare Pages | Хоства статичните файли | Build settings, `_headers`, `_redirects` |
| Cloudflare Worker | API, SSR, edge proxy (опционално) | `wrangler.toml`, Worker код |
| Cloudflare DNS | Домейн → Pages/Worker | DNS записи, Custom Hostnames |
| Cloudflare Security | WAF, Bot Fight Mode | Security → Bots / WAF |

**Важно:** Промените в GitHub стават live след deploy (обикновено 1–3 минути при Cloudflare Pages).

---

## 3. Два пътя — изберете един

| | Път A — Ръчно (GitHub) | Път B — AI Visibility Edge |
|--|------------------------|----------------------------|
| **Контрол** | Пълен — файловете са в repo | Технически слой през Worker proxy |
| **Промени** | Commit в GitHub | CNAME + dashboard „Приложи Edge“ |
| **Подходящо за** | Статични сайти, Jekyll, Hugo, Next static export | Бърз старт без CMS достъп |
| **Съдържание** | Вие пишете HTML | Edge **не** пише marketing copy |

Можете да комбинирате: **съдържание в GitHub** + **Edge за robots/llms/schema**.

---

## 4. Път A — Ръчно в GitHub repo

### Стъпка 1 — `public/robots.txt` (КРИТИЧНО)

Създайте файл `public/robots.txt` (или `static/robots.txt` — зависи от framework). При Cloudflare Pages той трябва да е в **output директорията** (често `public/` или root).

**Копирайте и сменете `ВАШИЯ-ДОМЕЙН.com`:**

```txt
# AI search optimized — 2026
User-agent: *
Allow: /

# Search / retrieval crawlers — ЗАДЪЛЖИТЕЛНИ за цитиране в ChatGPT, Perplexity, Claude
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Training crawlers — отделно решение (Allow = участие в обучение)
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: CCBot
Disallow: /

Sitemap: https://ВАШИЯ-ДОМЕЙН.com/sitemap.xml
```

**Защо разделение:** `OAI-SearchBot` ≠ `GPTBot`. Първият цитира в ChatGPT Search; вторият е за обучение. Блокирането на search bots = **никога в AI отговори**.

---

### Стъпка 2 — `sitemap.xml`

Създайте `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ВАШИЯ-ДОМЕЙН.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ВАШИЯ-ДОМЕЙН.com/услуги</loc>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://ВАШИЯ-ДОМЕЙН.com/цени</loc>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://ВАШИЯ-ДОМЕЙН.com/faq</loc>
    <changefreq>monthly</changefreq>
  </url>
</urlset>
```

Добавете **всеки важен URL** — продукти, статии, контакти. При повече от 50 URL помислете за динамичен sitemap (Worker или build script).

---

### Стъпка 3 — `llms.txt`

Създайте `public/llms.txt` — курирана карта за AI агенти:

```markdown
# Име на марката
> Кратко описание: какво предлагате, за кого, регион (България).

## Основни страници
- [Начало](https://ВАШИЯ-ДОМЕЙН.com/): Представяне, ключови ползи, контакти
- [Услуги/Продукти](https://ВАШИЯ-ДОМЕЙН.com/products): Каталог с цени
- [FAQ](https://ВАШИЯ-ДОМЕЙН.com/faq): Често задавани въпроси
- [Контакти](https://ВАШИЯ-ДОМЕЙН.com/contact): Адрес, телефон, имейл

## За AI модели
- Марка: Име на марката
- Домейн: ВАШИЯ-ДОМЕЙН.com
- Регион: BG
- Canonical: https://ВАШИЯ-ДОМЕЙН.com/
```

---

### Стъпка 4 — HTML `<head>` на всяка страница

В `index.html` или layout template добавете:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <html lang="bg">

  <!-- SEO + AI snippet -->
  <title>Марка — основна услуга | ВАШИЯ-ДОМЕЙН.com</title>
  <meta name="description" content="Марка (домейн) — услуга в България. Цени от X лв. Официален сайт.">
  <link rel="canonical" href="https://ВАШИЯ-ДОМЕЙН.com/">

  <!-- НЕ използвайте noindex или max-snippet:0 — блокира AI цитиране -->
  <meta name="robots" content="index, follow, max-snippet:-1">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ВАШИЯ-ДОМЕЙН.com/">
  <meta property="og:title" content="Марка — основна услуга">
  <meta property="og:description" content="Кратко описание с факти и цена.">
  <meta property="og:image" content="https://ВАШИЯ-ДОМЕЙН.com/assets/og-banner.jpg">

  <!-- JSON-LD — вижте Стъпка 5 -->
</head>
```

---

### Стъпка 5 — JSON-LD (structured data)

Поставете в `<head>` **едно** schema блок, съответстващо на бизнеса:

**Общ бизнес / услуги (Organization):**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Име на марката",
  "url": "https://ВАШИЯ-ДОМЕЙН.com/",
  "description": "Кратко описание с конкретни факти.",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "BG"
  }
}
</script>
```

**E-commerce (Product + Offer):**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Име на продукт",
  "url": "https://ВАШИЯ-ДОМЕЙН.com/product",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "BGN",
    "price": "29.99",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

**FAQ страница (най-ефективно за AI цитиране):**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Колко струва услугата X?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Услугата X при Марка струва 49 лв/месец. Включва A, B и C."
      }
    },
    {
      "@type": "Question",
      "name": "За кого е подходяща услугата X?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Подходяща е за малки фирми в България, които..."
      }
    }
  ]
}
</script>
```

**Правило:** Всичко в schema трябва да **съвпада** с видимия текст на страницата.

---

### Стъпка 6 — Видим HTML текст (не само JavaScript)

AI crawlers често **не изпълняват JavaScript**. Основното съдържание трябва да е в **първоначалния HTML**:

| ✅ Правилно | ❌ Грешно |
|-------------|-----------|
| `<h1>`, `<p>` с текст в HTML | Празен `<div id="app">` + React/Vue render |
| Цени в HTML: `49 лв/месец` | Цени само в JS cart |
| SSR или static export (Next.js `output: 'export'`) | SPA без prerender |
| Минимум **500 символа** видим текст на homepage | Само hero image + бутон |

**При Cloudflare Pages + React/Vue:** използвайте **prerender** или **SSG** за ключовите страници.

---

### Стъпка 7 — Commit и deploy

```bash
git add public/robots.txt public/sitemap.xml public/llms.txt
git add index.html   # или layout файловете
git commit -m "feat: AI search optimization — robots, sitemap, llms, schema"
git push origin main
```

Cloudflare Pages автоматично build-ва и deploy-ва. Проверете в **Cloudflare Dashboard → Pages → Deployments**.

---

## 5. Път B — AI Visibility Edge

Ако ползвате платформата **AI Visibility Edge**, техническият слой се прилага **без CMS промени**:

### 5.1 Регистрация на домейн

1. Dashboard → **+ Сайт** → въведете apex домейн (`example.com`)
2. **Probe** → виждате findings (robots, llms, schema, съдържание)
3. **„Приложи Edge“** → записва конфигурация

### 5.2 DNS (Cloudflare)

В **Cloudflare DNS** за домейна:

| Тип | Име | Стойност | Proxy |
|-----|-----|----------|-------|
| CNAME | `@` или `www` | `ai-visibility-edge.radilov-k.workers.dev` (или ваш Worker host) | Proxied (orange cloud) |

Или **Custom Hostname** в Cloudflare for SaaS / Worker routes — според setup на екипа.

### 5.3 Какво Edge прави автоматично

След активен CNAME:

| URL | Действие |
|-----|----------|
| `/robots.txt` | Пълен 2026 AI crawler allowlist |
| `/llms.txt` | Генерирана навигационна карта |
| `/{indexnow-key}.txt` | IndexNow верификация (при IndexNow) |
| Всички HTML страници | JSON-LD + canonical injection в `<head>` |

**Edge НЕ заменя:** marketing copy, цени, FAQ текст — това остава в GitHub repo.

### 5.4 API за IndexNow

```bash
curl -X POST "https://ai-visibility-edge.radilov-k.workers.dev/api/indexnow/ВАШИЯ-ДОМЕЙН.com" \
  -H "Authorization: Bearer ВАШ_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

Пуснете след всеки значим deploy с нови URL.

---

## 6. Cloudflare — задължителни настройки

### 6.1 Bot Fight Mode — ИЗКЛЮЧЕТЕ за AI bots

**Security → Bots → Bot Fight Mode**

Ако е включен, Cloudflare може да връща **403** на `GPTBot`, `OAI-SearchBot` и др. — **въпреки правилен robots.txt**.

**Препоръка:** Изключете Bot Fight Mode или добавете изключение за verified bots.

### 6.2 WAF custom rules

Проверете **Security → WAF → Custom rules** — няма ли правило, блокиращо User-Agent съдържащ `bot`.

### 6.3 SSL/TLS

**SSL/TLS → Full (strict)** — задължително за коректен crawl.

### 6.4 `_headers` файл (Cloudflare Pages)

Създайте `public/_headers` за кеш и snippet control:

```
/*
  X-Robots-Tag: index, follow, max-snippet:-1
  X-Content-Type-Options: nosniff

/robots.txt
  Cache-Control: public, max-age=3600

/sitemap.xml
  Cache-Control: public, max-age=3600

/llms.txt
  Cache-Control: public, max-age=3600
```

### 6.5 `_redirects` — внимание с root redirect

Избягвайте root URL, който redirect-ва към `/app` **без HTML текст** на root. AI crawlers често спират на root.

```
# Лошо: празен stub
/  /app/index.html  302

# По-добре: реална homepage на /
/  /index.html  200
```

---

## 7. Съдържание — какво пишете на страниците

Техниката отваря вратата. **Съдържанието** определя дали AI ще ви цитира.

### 7.1 Homepage — шаблон за копиране

```html
<section>
  <h1>Марка — основна услуга в България</h1>
  <p>
    Марка (ВАШИЯ-ДОМЕЙН.com) предлага [услуга/продукт] за [целева аудитория].
    Цените започват от 49 лв/месец. Доставка в цяла България.
  </p>
  <p>
    Ключови ползи: [полза 1 с число], [полза 2], [полза 3].
    Официален сайт: https://ВАШИЯ-ДОМЕЙН.com/
  </p>
</section>
```

**Правила за пасажи:**
- Всяка секция е **самостоятелна** — разбира се без контекст от други страници
- Избягвайте „Това предлага…“ → пишете „**Марка** предлага…“
- **Числа и цени** в plain text, не само в schema

### 7.2 FAQ страница (най-висок ROI)

Създайте `/faq` с 5–10 въпроса, които клиентите реално задават в ChatGPT:

- „Колко струва…?“
- „Каква е разликата между…?“
- „Доставяте ли в…?“
- „Имате ли [сертификат/лиценз]?“

Всеки отговор: **2–4 изречения, пълни факти, с марката в текста**.

### 7.3 Entity консистентност

Еднакво име, описание и домейн в:
- HTML текст
- JSON-LD
- `meta description`
- Google Business Profile
- LinkedIn / Facebook

Противоречия → AI не е сигурен „кой сте“ → по-малко цитиране.

---

## 8. IndexNow — по-бързо в Bing корпуса

Bing е източник за ChatGPT Search. IndexNow уведомява за нови/променени URL.

### Ръчен setup (GitHub + Cloudflare)

1. Генерирайте ключ: `a1b2c3d4e5f6g7h8i9j0` (произволен UUID)
2. Създайте `public/a1b2c3d4e5f6g7h8i9j0.txt` със съдържание **само ключа**:
   ```
   a1b2c3d4e5f6g7h8i9j0
   ```
3. След всеки deploy, POST към IndexNow:

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "ВАШИЯ-ДОМЕЙН.com",
    "key": "a1b2c3d4e5f6g7h8i9j0",
    "keyLocation": "https://ВАШИЯ-ДОМЕЙН.com/a1b2c3d4e5f6g7h8i9j0.txt",
    "urlList": [
      "https://ВАШИЯ-ДОМЕЙН.com/",
      "https://ВАШИЯ-ДОМЕЙН.com/faq"
    ]
  }'
```

Добавете IndexNow POST в **GitHub Action** след успешен Cloudflare deploy.

---

## 9. Проверка след внедряване

### 9.1 Бързи URL тестове (в браузър или curl)

```bash
# robots.txt — трябва 200 и OAI-SearchBot Allow
curl -sI https://ВАШИЯ-ДОМЕЙН.com/robots.txt

# sitemap
curl -sI https://ВАШИЯ-ДОМЕЙН.com/sitemap.xml

# llms.txt
curl -sI https://ВАШИЯ-ДОМЕЙН.com/llms.txt

# homepage — видим текст (не празен body)
curl -s https://ВАШИЯ-ДОМЕЙН.com/ | wc -c
```

### 9.2 Чеклист „готово ли е“

| Проверка | Очакван резултат |
|----------|------------------|
| `robots.txt` → 200 | Съдържа `OAI-SearchBot`, `PerplexityBot`, `Sitemap:` |
| `sitemap.xml` → 200 | Валиден XML с ключови URL |
| `llms.txt` → 200 | Markdown с линкове |
| Homepage HTML | ≥500 символа видим текст, H1 с марка |
| JSON-LD | Organization/Product/FAQPage в `<head>` |
| `canonical` | Един URL, без дублиране www/non-www |
| `meta robots` | **Няма** `noindex` или `nosnippet` |
| Cloudflare Bot Fight | Изключен или изключение за AI bots |
| Bing Webmaster Tools | Домейн регистриран (опционално, препоръчително) |

### 9.3 AI Visibility Edge probe (ако ползвате платформата)

```
GET /api/diagnose/probe?domain=ВАШИЯ-ДОМЕЙН.com
```

Проверете: `robots_ai_policy`, `signals.llms_txt_ok`, `signals.missing_search_crawlers`, `html_text_chars`.

---

## 10. Чести грешки

| Грешка | Последица | Поправка |
|--------|-----------|----------|
| Bot Fight Mode блокира ботове | 403, нулева AI видимост | Изключете или whitelist |
| SPA без SSR | Празна страница за AI | Static export / prerender |
| `noindex` в staging, забравен в prod | Не се индексира | Премахнете meta robots noindex |
| Блокиране на `GPTBot` без да се Allow-не `OAI-SearchBot` | Няма ChatGPT цитати | Добавете search crawlers |
| Schema с фалшиви цени | Misattribution, загуба на доверие | Съвпадайте с видимия текст |
| Root redirect без текст | AI не стига до съдържание | Реален HTML на `/` |
| Само изображения, без текст | Нищо за цитиране | Alt text + параграфи |

---

## 11. Чеклист за пускане

Отбелязвайте при deploy:

### Фаза 1 — Техника (ден 1)

- [ ] `public/robots.txt` с 2026 search crawlers
- [ ] `public/sitemap.xml` с всички важни URL
- [ ] `public/llms.txt`
- [ ] `<link rel="canonical">` на всяка страница
- [ ] JSON-LD в `<head>`
- [ ] `meta robots` без noindex/nosnippet
- [ ] Cloudflare Bot Fight Mode проверен
- [ ] `_headers` файл (опционално)
- [ ] Commit → push → deploy успешен

### Фаза 2 — Съдържание (седмица 1)

- [ ] Homepage ≥500 символа, H1 с марка
- [ ] FAQ страница с 5+ въпроса
- [ ] Цени в plain HTML (лв/€)
- [ ] Entity консистентност (също име навсякъде)

### Фаза 3 — Индексиране (седмица 1–2)

- [ ] IndexNow key файл + POST след deploy
- [ ] Bing Webmaster Tools — домейн добавен
- [ ] Google Search Console — sitemap подаден

### Фаза 4 — Мониторинг (постоянно)

- [ ] Probe / findings без critical issues
- [ ] AI-SOV измерване (ако ползвате AIV платформата)
- [ ] Обновяване на llms.txt и sitemap при нови страници

---

## Резюме в едно изречение

**Отворете вратата за AI crawlers (robots + Cloudflare), сложете картата (sitemap + llms.txt), дайте структура (schema + canonical), и напишете самостоятелни отговори с факти и цени в HTML — не в JavaScript.**

---

*Документът е съвместим с AI Visibility Edge v1.1+. При въпроси: probe през dashboard или `GET /api/diagnose/probe?domain=...`*
