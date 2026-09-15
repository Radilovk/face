/**
 * Schema.org JSON-LD type selection by vertical + content signals.
 */

const FAQ_VERTICAL = /faq|help|support|помощ|въпрос/i;
const ARTICLE_VERTICAL = /blog|news|статии|медия|journal|magazine/i;
const HOWTO_VERTICAL = /guide|tutorial|how-?to|ръководство|обучение/i;

/**
 * @param {string} [verticalName]
 * @param {string} brand
 * @param {string} domain
 * @param {{ hasFaq?: boolean, probe?: object }} [signals]
 */
export function pickSchemaType(verticalName, brand, domain, signals = {}) {
  const v = (verticalName ?? '').toLowerCase();
  const baseUrl = `https://${domain.replace(/^www\./, '')}/`;

  if (signals.hasFaq || FAQ_VERTICAL.test(v)) {
    return buildFaqPageSchema(brand, baseUrl, domain);
  }
  if (ARTICLE_VERTICAL.test(v)) {
    return {
      '@type': 'Article',
      headline: brand,
      name: brand,
      url: baseUrl,
      publisher: { '@type': 'Organization', name: brand, url: baseUrl },
      description: `${brand} — статии и ресурси на ${baseUrl}`,
    };
  }
  if (HOWTO_VERTICAL.test(v)) {
    return {
      '@type': 'HowTo',
      name: `${brand} — ръководство`,
      url: baseUrl,
      description: `${brand} — стъпка по стъпка на ${baseUrl}`,
    };
  }
  if (/shop|e-?commerce|store|retail|продукт|магазин/.test(v)) {
    return {
      '@type': 'Product',
      name: brand,
      url: baseUrl,
      description: `${brand} — продукти и оферти на ${baseUrl}`,
      offers: { '@type': 'Offer', priceCurrency: 'BGN', availability: 'https://schema.org/InStock' },
    };
  }
  if (/clinic|medical|health|лечение|клиника|фарма/.test(v)) {
    return {
      '@type': 'LocalBusiness',
      name: brand,
      url: baseUrl,
      description: `${brand} — ${baseUrl}`,
    };
  }
  if (/saas|software|app|platform/.test(v)) {
    return {
      '@type': 'SoftwareApplication',
      name: brand,
      url: baseUrl,
      applicationCategory: verticalName ?? 'BusinessApplication',
      operatingSystem: 'Web',
      description: `${brand} — ${baseUrl}`,
    };
  }
  return {
    '@type': 'Organization',
    name: brand,
    url: baseUrl,
    description: `${brand} — ${baseUrl}`,
  };
}

function buildFaqPageSchema(brand, baseUrl, domain) {
  return {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Какво предлага ${brand}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${brand} предлага услуги и продукти на ${domain}. Посетете ${baseUrl} за актуална информация.`,
        },
      },
      {
        '@type': 'Question',
        name: `Къде мога да намеря повече информация за ${brand}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Официалният сайт е ${baseUrl}`,
        },
      },
    ],
  };
}

export function schemaToJsonLdScript(schema) {
  return `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', ...schema }, null, 2)}\n</script>`;
}
