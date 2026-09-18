/**
 * Detailed human-step guides: WHERE to go, HOW to do it, WHAT to enter.
 * Used by dashboard, roadmap, onboarding, and .txt export.
 */

/**
 * @typedef {object} ManualGuideField
 * @property {string} label — UI label (e.g. "Type", "Name")
 * @property {string} value — exact value to paste
 * @property {string} [note] — optional clarification
 */

/**
 * @typedef {object} ManualGuide
 * @property {string} gate_id
 * @property {string} title
 * @property {string} where — panel / URL description
 * @property {string[]} steps — numbered how-to steps
 * @property {ManualGuideField[]} fields — exact values to enter
 * @property {string[]} after — what to do when finished
 */

/**
 * @param {string} gateId
 * @param {object} [ctx]
 * @param {string} [ctx.domain]
 * @param {string} [ctx.workerHost]
 * @param {string} [ctx.brand]
 * @param {string} [ctx.artifactType] — homepage|jsonld|meta|sitemap|llms|robots
 */
export function buildManualGuide(gateId, ctx = {}) {
  const domain = ctx.domain ?? 'вашият-домейн.com';
  const workerHost = ctx.workerHost ?? 'ai-visibility-edge.example.workers.dev';
  const brand = ctx.brand ?? domain;
  const artifact = ctx.artifactType ?? null;

  switch (gateId) {
    case 'cname':
      return cnameGuide(domain, workerHost);
    case 'cms_publish':
      return cmsPublishGuide(domain, brand, artifact);
    case 'cms_meta':
      return cmsMetaGuide(domain, brand, artifact);
    case 'cms_upload':
      return cmsUploadGuide(domain);
    case 'site_deploy':
      return siteDeployGuide(domain, artifact);
    case 'cms_noindex':
      return cmsNoindexGuide(domain);
    case 'cms_ssr':
      return cmsSsrGuide(domain);
    case 'hosting':
      return hostingGuide(domain);
    case 'strategic_review':
      return strategicReviewGuide(domain);
    case 'cloudflare_aeo':
      return cloudflareAeoGuide(domain);
    default:
      return genericGuide(gateId, domain);
  }
}

/** Flat instruction lines for roadmap / export. */
export function guideToInstructionLines(guide) {
  if (!guide) return [];
  const lines = [];
  if (guide.where) lines.push(`Къде: ${guide.where}`);
  for (const step of guide.steps ?? []) {
    lines.push(step);
  }
  for (const f of guide.fields ?? []) {
    const note = f.note ? ` (${f.note})` : '';
    lines.push(`Въведете „${f.label}“ = ${f.value}${note}`);
  }
  for (const a of guide.after ?? []) {
    lines.push(`След това: ${a}`);
  }
  return lines;
}

/** Plain-text block for .txt export. */
export function formatGuideForExport(guide, indent = '   ') {
  if (!guide) return '';
  const lines = [];
  lines.push(`${indent}КЪДЕ: ${guide.where}`);
  lines.push(`${indent}КАК:`);
  for (const step of guide.steps ?? []) {
    lines.push(`${indent}  ${step}`);
  }
  if (guide.fields?.length) {
    lines.push(`${indent}КАКВО ДА ВЪВЕДЕТЕ (копирайте точно):`);
    for (const f of guide.fields) {
      lines.push(`${indent}  • ${f.label}: ${f.value}${f.note ? ` — ${f.note}` : ''}`);
    }
  }
  if (guide.after?.length) {
    lines.push(`${indent}СЛЕД КАТО ПРИКЛЮЧИТЕ:`);
    for (const a of guide.after) {
      lines.push(`${indent}  • ${a}`);
    }
  }
  return lines.join('\n');
}

function cnameGuide(domain, workerHost) {
  return {
    gate_id: 'cname',
    title: 'CNAME към AI Visibility Worker',
    where:
      'DNS панелът при registrar-а (GoDaddy, SuperHosting, Namecheap…) ИЛИ Cloudflare → Websites → вашият домейн → DNS → Records. ' +
      'Нужен е достъп „DNS edit“ — системата няма вашите DNS credentials.',
    steps: [
      '1. Влезте в акаунта си при registrar или Cloudflare.',
      '2. Отворете DNS / DNS Management / DNS Records за домейна.',
      '3. Натиснете „Add record“ / „Добави запис“.',
      '4. Попълнете полетата по таблицата „Какво да въведете“ по-долу.',
      '5. Запазете записа (Save). Ако вече има A/AAAA запис за @ или www — изтрийте го или сменете на CNAME (само един запис за същото име).',
      '6. Изчакайте 5–30 мин за DNS propagation и SSL (Cloudflare for SaaS Custom Hostname).',
      '7. В dashboard натиснете „Обнови данни“ или презаредете страницата — Edge статусът трябва да стане active.',
    ],
    fields: [
      { label: 'Type / Тип', value: 'CNAME', note: 'не A, не AAAA' },
      { label: 'Name / Host / Име', value: domain, note: 'или @ ако панелът иска root (@ = apex)' },
      { label: 'Target / Points to / Стойност', value: workerHost, note: 'без https://, без наклонена черта накрая' },
      { label: 'TTL', value: 'Auto или 300', note: 'по подразбиране е OK' },
      { label: 'Proxy (само Cloudflare)', value: 'DNS only (сиво облаче)', note: 'не Proxied — иначе SSL може да се счупи' },
    ],
    after: [
      'Презаредете dashboard и проверете Edge & DNS → SSL active.',
      'Ако след 30 мин все още pending — проверете дали CNAME сочи точно към ' + workerHost + '.',
    ],
  };
}

function cmsPublishGuide(domain, brand, artifact) {
  const pageHint =
    artifact === 'homepage'
      ? 'начална страница (Homepage)'
      : artifact
        ? `страница за ${artifact}`
        : 'начална страница или FAQ';
  return {
    gate_id: 'cms_publish',
    title: 'Публикуване на AI текст в сайта',
    where:
      'Админ панелът на вашия CMS — WordPress (wp-admin), Shopify Admin, Webflow Designer, Wix Editor, ' +
      'OpenCart admin, или HTML editor на hosting-а. Логнете се с акаунт с права „Edit pages“ / „Publish“.',
    steps: [
      '1. Отворете dashboard → единния план → намерете задачата с draft текст (или „📥 Експорт .txt“).',
      '2. Натиснете „Копирай“ до textarea с draft-а.',
      `3. В CMS отворете ${pageHint} за ${brand} (${domain}).`,
      '4. Поставете текста в съдържанието: WordPress → Pages → Edit → блок „Paragraph“ / Classic Editor; ' +
        'Shopify → Online Store → Pages; Webflow → страница → Rich Text element.',
      '5. Задължително проверете: цени, телефони, адреси, медицински твърдения — AI може да греши.',
      '6. Натиснете Publish / Update / Save & Publish в CMS.',
      '7. Отворете публичния URL в браузър (incognito) и потвърдете, че текстът се вижда.',
      '8. В dashboard маркирайте „✓ Готово“ и въведете URL на страницата.',
    ],
    fields: [
      { label: 'URL след publish', value: `https://${domain}/`, note: `или https://www.${domain}/ ако ползвате www` },
      { label: 'Какво редактирахте', value: pageHint, note: 'за вашите бележки' },
    ],
    after: [
      'Натиснете „🚀 Стартирай“ / „Пълен анализ“ в dashboard за повторно AI измерване.',
    ],
  };
}

function cmsMetaGuide(domain, brand, artifact) {
  const fieldHint =
    artifact === 'title'
      ? '<title> tag'
      : artifact === 'meta'
        ? 'meta description'
        : 'SEO title + meta description';
  return {
    gate_id: 'cms_meta',
    title: 'SEO meta полета в CMS',
    where:
      'CMS SEO секция — WordPress: Yoast SEO / Rank Math под editor-а; Shopify: Online Store → Preferences → SEO; ' +
      'Webflow: Page Settings → SEO tab; Cloudflare / static: <head> в theme template или index.html.',
    steps: [
      '1. Копирайте draft-а от dashboard (title или meta description).',
      `2. Отворете SEO настройките на началната страница за ${domain}.`,
      `3. Поставете текста в полетата за ${fieldHint}.`,
      '4. WordPress Yoast: „SEO title“ и „Meta description“; Shopify: „Homepage title“ и „Description“.',
      '5. Запазете и publish-нете промяната.',
      '6. View Source на https://' + domain + ' — потвърдете <title> и meta name="description".',
    ],
    fields: [
      { label: 'SEO Title (пример)', value: `${brand} — официален сайт`, note: 'заменете с draft от dashboard' },
      { label: 'Meta Description (пример)', value: `Кратко описание на ${brand}…`, note: '150–160 символа' },
    ],
    after: ['Маркирайте „✓ Готово“ в dashboard.', 'Пуснете повторен анализ.'],
  };
}

function cmsUploadGuide(domain) {
  return {
    gate_id: 'cms_upload',
    title: 'Качване на sitemap.xml',
    where:
      'Root директорията на сайта — FTP/SFTP (FileZilla), cPanel File Manager, ' +
      'WordPress plugin (Yoast → XML Sitemap), или Cloudflare Pages / GitHub repo (public/ или static/).',
    steps: [
      '1. Копирайте sitemap.xml draft от dashboard.',
      '2. Качете файла в root на домейна (същата папка като index.html).',
      '3. Файлът трябва да е достъпен на https://' + domain + '/sitemap.xml (отворете в браузър).',
      '4. WordPress: Yoast генерира автоматично — сравнете URL-ите с нашия draft.',
      '5. Google Search Console → Sitemaps → submit https://' + domain + '/sitemap.xml (по желание).',
    ],
    fields: [
      { label: 'Име на файл', value: 'sitemap.xml', note: 'точно малки букви' },
      { label: 'Път на сървъра', value: '/public_html/sitemap.xml или /www/sitemap.xml', note: 'зависи от hosting' },
      { label: 'Публичен URL', value: `https://${domain}/sitemap.xml`, note: 'трябва да връща HTTP 200' },
    ],
    after: ['Маркирайте „sitemap.xml е live“ в dashboard.', 'IndexNow ще се пусне автоматично ако е конфигуриран.'],
  };
}

function siteDeployGuide(domain, artifact) {
  const fileHint =
    artifact === 'llms'
      ? 'llms.txt'
      : artifact === 'sitemap'
        ? 'sitemap.xml'
        : artifact === 'robots'
          ? 'robots.txt'
          : 'файл от draft';
  return {
    gate_id: 'site_deploy',
    title: 'Deploy на файл в repo / static hosting',
    where:
      'GitHub repo (commit + push), Cloudflare Pages, Netlify, Vercel, или FTP към static site. ' +
      'Нужен е достъп до source code — не CMS visual editor.',
    steps: [
      '1. Копирайте съдържанието от dashboard draft.',
      `2. Създайте или редактирайте ${fileHint} в root на проекта (public/, static/, или /).`,
      '3. Git: git add, commit, push — изчакайте CI/CD deploy.',
      '4. Cloudflare Pages: commit в main branch → automatic deploy.',
      '5. Проверете публичния URL: https://' + domain + '/' + fileHint,
      '6. В dashboard въведете URL и бележка (commit hash / PR номер).',
    ],
    fields: [
      { label: 'Файл', value: fileHint, note: 'в root на сайта' },
      { label: 'Публичен URL', value: `https://${domain}/${fileHint}`, note: 'HTTP 200' },
      { label: 'Deploy target (пример)', value: 'GitHub Pages / Cloudflare Pages', note: 'къде качихте' },
    ],
    after: ['Маркирайте „✓ Готово“.', 'Пуснете повторен анализ.'],
  };
}

function cmsNoindexGuide(domain) {
  return {
    gate_id: 'cms_noindex',
    title: 'Премахване на noindex',
    where:
      'CMS SEO plugin (Yoast → Advanced → „Allow search engines“), theme header.php, ' +
      'Cloudflare Transform Rules, или staging environment toggle.',
    steps: [
      '1. View Source на https://' + domain + ' — потърсете meta name="robots" content="noindex".',
      '2. WordPress Yoast: страница → Advanced → „Allow search engines to show this page“ = Yes.',
      '3. Shopify: Online Store → Preferences — проверете „Password protection“ (изключете на production).',
      '4. Cloudflare: Rules → проверете X-Robots-Tag header.',
      '5. Запазете и hard refresh (Ctrl+Shift+R).',
      '6. Потвърдете липсата на noindex в source.',
    ],
    fields: [
      { label: 'Търсете в HTML', value: 'noindex', note: 'трябва да изчезне' },
      { label: 'Правилна стойност след fix', value: 'index, follow (или липса на noindex meta)', note: '' },
    ],
    after: ['Маркирайте checkbox в dashboard.', 'Edge robots fix работи по-добре след премахване на CMS noindex.'],
  };
}

function cmsSsrGuide(domain) {
  return {
    gate_id: 'cms_ssr',
    title: 'SSR / static HTML fallback',
    where:
      'Codebase на frontend — Next.js (getServerSideProps), Nuxt (SSR mode), Astro, ' +
      'или static HTML fallback в public/index.html за SPA (React/Vue).',
    steps: [
      '1. AI crawlers не изпълняват JavaScript — нужен е видим HTML в първия response.',
      '2. Next.js: включете SSR за homepage или добавете generateStaticParams.',
      '3. SPA: prerender с react-snap / prerender.io или добавете <noscript> fallback блок.',
      '4. Deploy новата версия.',
      '5. curl -A "GPTBot" https://' + domain + ' — трябва да виждате текст, не празен <div id="root">.',
    ],
    fields: [
      { label: 'URL за тест', value: `https://${domain}/`, note: 'curl или View Source без JS' },
      { label: 'Минимум текст', value: '500+ символа видим HTML', note: 'за AI цитиране' },
    ],
    after: ['Маркирайте „SSR активен“.', 'Пуснете повторен одит.'],
  };
}

function hostingGuide(domain) {
  return {
    gate_id: 'hosting',
    title: 'Hosting / SSL / HTTP грешка',
    where:
      'Hosting control panel (cPanel, Plesk, Cloudflare Dashboard, AWS Console), ' +
      'SSL/TLS settings, или ticket към support на hosting provider.',
    steps: [
      '1. Отворете https://' + domain + ' в браузър — запишете HTTP status (503, 502, 521…).',
      '2. cPanel → SSL/TLS Status — активирайте Let\'s Encrypt ако SSL е изтекъл.',
      '3. Cloudflare: SSL/TLS → Full (strict); проверете Origin server дали работи.',
      '4. 503: проверете дали сървърът/PHP-FPM работи; restart на услугата.',
      '5. 521 (Cloudflare): origin server не отговаря — свържете се с hosting support.',
      '6. След fix: curl -I https://' + domain + ' трябва да показва HTTP/2 200.',
    ],
    fields: [
      { label: 'Очакван HTTP status', value: '200', note: 'след поправка' },
      { label: 'Hosting provider', value: '(попълнете)', note: 'SiteGround, SuperHosting, AWS…' },
      { label: 'Support ticket (пример)', value: 'Site returns 503 since [date]', note: 'ако не можете сами' },
    ],
    after: [
      'В dashboard въведете новия HTTP status.',
      'Натиснете „🚀 Стартирай“ за повторен одит.',
    ],
  };
}

function cloudflareAeoGuide(domain) {
  return {
    gate_id: 'cloudflare_aeo',
    title: 'Cloudflare Bot / WAF за AI crawlers',
    where:
      `Cloudflare Dashboard → ${domain} → Security → Bots / WAF, ` +
      'или dashboard → Edge & DNS → „CF AEO“ (автоматично с API token).',
    steps: [
      '1. Security → Bots → Bot Fight Mode → **OFF**.',
      '2. Security → Bots → Bot Preference Sync → **OFF** (managed robots.txt).',
      '3. AI Crawl Control → Search: **Allow**, Training: **Disallow**, Agent: **Allow**.',
      '4. Security → WAF → Custom rules → Skip за OAI-SearchBot, GPTBot, PerplexityBot, Claude-SearchBot.',
      '5. Или натиснете „CF AEO“ в dashboard (изисква CF_API_TOKEN с Zone:Edit).',
      '6. Проверка: curl -sI -A GPTBot https://' + domain + '/ → HTTP 200, не 403.',
    ],
    fields: [
      { label: 'Bot Fight Mode', value: 'OFF' },
      { label: 'Bot Preference Sync', value: 'OFF' },
      { label: 'AI bots protection', value: 'disabled' },
    ],
    after: [
      'Натиснете „Smoke test“ в dashboard.',
      'Пуснете „Пълен анализ“ за обновен probe.',
    ],
  };
}

function strategicReviewGuide(domain) {
  return {
    gate_id: 'strategic_review',
    title: 'Преглед на Edge config (чувствителна ниша)',
    where: 'Dashboard → Edge & DNS → „Приложи Edge“ + преглед на fixes list преди CNAME.',
    steps: [
      '1. Отворете Edge & DNS секцията в dashboard за ' + domain + '.',
      '2. Прочетете списъка с Edge fixes (robots, JSON-LD, canonical).',
      '3. Потвърдете, че промените са OK за вашата индустрия (medical, pharma, research).',
      '4. Натиснете „Приложи Edge“ ако одобрявате.',
      '5. След това следвайте CNAME инструкциите.',
    ],
    fields: [],
    after: ['След одобрение системата записва KV config автоматично.'],
  };
}

function genericGuide(gateId, domain) {
  return {
    gate_id: gateId,
    title: 'Ръчна стъпка',
    where: `Админ панел или codebase на ${domain}`,
    steps: ['1. Следвайте препоръката в dashboard.', '2. Маркирайте „✓ Готово“ след приключване.'],
    fields: [],
    after: ['Пуснете повторен анализ от dashboard.'],
  };
}
