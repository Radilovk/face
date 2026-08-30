/**
 * Automated fix proposals for each finding type.
 * mode: auto = one click | semi_auto = auto artifact + optional manual publish | manual = form only
 */
import { buildHomepageCopy, buildJsonLd, buildRobotsAllow, buildMetaDescription, buildTitleFix, buildSitemapXml } from '../apply/generate.js';

/** @typedef {'auto'|'semi_auto'|'manual'} AutomationMode */

/**
 * @param {object[]} findings
 * @param {object} ctx — probe, brand, tenant, edgeActive, worker_host
 */
export function enrichFindingsWithAutomation(findings, ctx = {}) {
  const brand = ctx.brand ?? ctx.tenant?.name ?? ctx.probe?.domain ?? '';
  const domain = ctx.tenant?.apex_host ?? ctx.tenant?.domain ?? ctx.probe?.domain ?? '';
  const vertical = ctx.tenant?.vertical_name ?? '';
  const edgeActive = Boolean(ctx.edgeActive);
  const workerHost = ctx.worker_host ?? 'ai-visibility-edge.radilov-k.workers.dev';

  return findings.map((f) => {
    const spec = AUTOMATION_SPECS[f.id] ?? inferAutomation(f, ctx);
    const automation = buildAutomationBlock(f, spec, { brand, domain, vertical, edgeActive, workerHost, probe: ctx.probe });
    return { ...f, automation };
  });
}

const AUTOMATION_SPECS = {
  robots_disallow_all: {
    mode: 'auto',
    action: 'activate_edge',
    label: 'Приложи Edge robots.txt автоматично',
    note: 'След това CNAME (единствената DNS стъпка).',
    manual_gate: 'cname',
  },
  robots_blocks_ai_bots: {
    mode: 'auto',
    action: 'activate_edge',
    label: 'Allow AI ботове през Edge',
    manual_gate: 'cname',
  },
  missing_jsonld: {
    mode: 'semi_auto',
    action: 'activate_edge',
    label: 'Edge JSON-LD + robots автоматично',
    artifact_type: 'jsonld',
    manual_gate: 'cname',
  },
  weak_jsonld_types: {
    mode: 'semi_auto',
    action: 'activate_edge',
    label: 'Edge schema по вертикала',
    artifact_type: 'jsonld',
    manual_gate: 'cname',
  },
  missing_canonical: {
    mode: 'auto',
    action: 'activate_edge',
    label: 'Edge canonical автоматично',
    manual_gate: 'cname',
  },
  missing_sitemap: {
    mode: 'semi_auto',
    action: 'generate_sitemap_artifact',
    label: 'Генерирай sitemap.xml draft',
    artifact_type: 'sitemap',
    manual_gate: 'cms_upload',
  },
  thin_content_critical: {
    mode: 'semi_auto',
    action: 'generate_content',
    label: 'Генерирай HTML текст (AI)',
    artifact_type: 'homepage',
    manual_gate: 'cms_publish',
  },
  thin_content: {
    mode: 'semi_auto',
    action: 'generate_content',
    label: 'Генерирай HTML текст (AI)',
    artifact_type: 'homepage',
    manual_gate: 'cms_publish',
  },
  brand_absent: {
    mode: 'semi_auto',
    action: 'generate_content',
    label: 'Генерирай текст с марката',
    artifact_type: 'homepage',
    intent: 'brand_focus',
    manual_gate: 'cms_publish',
  },
  title_brand_mismatch: {
    mode: 'semi_auto',
    action: 'generate_meta_artifact',
    label: 'Генерирай <title> draft',
    artifact_type: 'title',
    manual_gate: 'cms_meta',
  },
  weak_meta_description: {
    mode: 'semi_auto',
    action: 'generate_meta_artifact',
    label: 'Генерирай meta description',
    artifact_type: 'meta',
    manual_gate: 'cms_meta',
  },
  no_prices: {
    mode: 'semi_auto',
    action: 'generate_content',
    label: 'Генерирай блок с цени',
    artifact_type: 'homepage',
    intent: 'prices',
    manual_gate: 'cms_publish',
  },
  anaphora_paragraphs: {
    mode: 'semi_auto',
    action: 'generate_content',
    label: 'Преформулирай пасажи (AI)',
    artifact_type: 'homepage',
    intent: 'autonomy',
    manual_gate: 'cms_publish',
  },
  js_shell: {
    mode: 'semi_auto',
    action: 'generate_content',
    label: 'Генерирай SSR-ready HTML draft',
    artifact_type: 'homepage',
    intent: 'ssr_fallback',
    manual_gate: 'cms_ssr',
  },
  meta_noindex: {
    mode: 'semi_auto',
    action: 'activate_edge',
    label: 'Edge: Allow index + robots fix',
    note: 'Премахнете noindex в CMS ако Edge не е на CNAME.',
    manual_gate: 'cms_noindex',
  },
  http_error: {
    mode: 'manual',
    action: null,
    label: 'Hosting проверка',
    manual_gate: 'hosting',
  },
  misattributed_citations: {
    mode: 'auto',
    action: 'reprocess',
    label: 'Reprocess + verify цитати',
  },
  fabricated_urls: {
    mode: 'auto',
    action: 'reprocess',
    label: 'Reprocess observations',
  },
  stale_ai_cache: {
    mode: 'auto',
    action: 'remeasure',
    label: 'Повторно AI измерване',
  },
  high_cache_age: {
    mode: 'semi_auto',
    action: 'activate_edge',
    label: 'Edge bot log + remeasure',
    manual_gate: 'cname',
    follow_up: 'remeasure',
  },
  high_displacement: {
    mode: 'auto',
    action: 'displacement_optimize',
    label: 'Auto: нови въпроси + content draft',
  },
  low_sov: {
    mode: 'auto',
    action: 'run_auto_optimizer',
    label: 'Auto-оптимизация (measure + fixes)',
  },
  edge_activate: {
    mode: 'auto',
    action: 'activate_edge',
    label: 'Приложи Edge конфигурация',
    manual_gate: 'cname',
  },
  edge_canary_pending: {
    mode: 'semi_auto',
    action: 'activate_edge',
    label: 'Активирай Edge + CNAME инструкции',
    manual_gate: 'cname',
  },
};

function inferAutomation(f, ctx) {
  if (f.id.startsWith('model_gap_')) {
    return { mode: 'auto', action: 'run_auto_optimizer', label: 'Auto-оптимизация за модел' };
  }
  if (f.id.startsWith('displacement_')) {
    return { mode: 'auto', action: 'displacement_optimize', label: 'Оптимизация срещу изместване' };
  }
  if (f.fix?.owner === 'system' || f.fix?.owner === 'edge') {
    return { mode: 'auto', action: 'activate_edge', label: 'Системна поправка', manual_gate: 'cname' };
  }
  return { mode: 'semi_auto', action: 'generate_content', label: 'Генерирай draft', manual_gate: 'cms_publish' };
}

function buildAutomationBlock(finding, spec, ctx) {
  const { brand, domain, vertical, edgeActive, workerHost, probe } = ctx;
  const artifact = spec.artifact_type
    ? buildArtifact(spec.artifact_type, { brand, domain, vertical, probe, finding })
    : null;

  // CNAME gate only when Edge not live; other CMS gates always when semi_auto
  let manual_form = null;
  if (spec.manual_gate === 'cname' && !edgeActive) {
    manual_form = buildManualForm('cname', { domain, workerHost, brand });
  } else if (spec.manual_gate && spec.manual_gate !== 'cname') {
    manual_form = buildManualForm(spec.manual_gate, { domain, workerHost, brand });
  }

  const mode = spec.mode === 'auto' && spec.manual_gate === 'cname' && !edgeActive ? 'semi_auto' : spec.mode;

  return {
    mode,
    action: spec.action,
    label: spec.label ?? 'Приложи автоматично',
    note: spec.note ?? null,
    intent: spec.intent ?? null,
    follow_up: spec.follow_up ?? null,
    artifact,
    manual_gate: spec.manual_gate ?? null,
    manual_form,
    can_apply_now: mode === 'auto' || mode === 'semi_auto',
    edge_active: edgeActive,
  };
}

function buildArtifact(type, ctx) {
  const { brand, domain, vertical, probe, finding } = ctx;
  switch (type) {
    case 'jsonld':
      return {
        format: 'html',
        title: 'JSON-LD snippet',
        content: buildJsonLd({ domain, brand, vertical }),
      };
    case 'homepage':
      return {
        format: 'html',
        title: 'Homepage секция за AI',
        content: buildHomepageCopy({ domain, brand, vertical }),
      };
    case 'meta':
      return {
        format: 'html',
        title: 'Meta description',
        content: buildMetaDescription({ domain, brand, vertical }),
      };
    case 'title':
      return {
        format: 'html',
        title: '<title> tag',
        content: buildTitleFix({ domain, brand, vertical }),
      };
    case 'sitemap':
      return {
        format: 'xml',
        title: 'sitemap.xml',
        content: buildSitemapXml({ domain, urls: [probe?.raw_json?.final_url ?? `https://${domain}/`] }),
      };
    case 'robots':
      return {
        format: 'text',
        title: 'robots.txt',
        content: buildRobotsAllow(),
      };
    default:
      return null;
  }
}

function buildManualForm(gateId, ctx) {
  const { domain, workerHost, brand } = ctx;
  switch (gateId) {
    case 'cname':
      return {
        id: 'cname',
        title: 'DNS — единствената задължителна ръчна стъпка',
        fields: [
          { id: 'cname_confirmed', type: 'checkbox', label: `CNAME ${domain} → ${workerHost} е направен` },
          { id: 'ssl_ready', type: 'checkbox', label: 'SSL validation е готов (Custom Hostname active)' },
        ],
        hint: `Тип: CNAME · Име: ${domain} · Стойност: ${workerHost}`,
      };
    case 'cms_publish':
      return {
        id: 'cms_publish',
        title: 'Публикуване в CMS (след auto draft)',
        fields: [
          { id: 'published_url', type: 'text', label: 'URL на страницата след publish', placeholder: `https://${domain}/` },
          { id: 'published_at', type: 'text', label: 'Дата на publish (опционално)', placeholder: '2026-08-30' },
          { id: 'notes', type: 'textarea', label: 'Бележки (опционално)', placeholder: 'Промених homepage секцията…' },
        ],
      };
    case 'cms_meta':
      return {
        id: 'cms_meta',
        title: 'Meta/title в CMS',
        fields: [
          { id: 'applied', type: 'checkbox', label: 'Копирах draft в CMS SEO полетата' },
          { id: 'notes', type: 'textarea', label: 'Бележки', placeholder: '' },
        ],
      };
    case 'cms_noindex':
      return {
        id: 'cms_noindex',
        title: 'Премахване на noindex',
        fields: [
          { id: 'noindex_removed', type: 'checkbox', label: 'Премахнах meta robots noindex / X-Robots-Tag' },
          { id: 'where', type: 'text', label: 'Къде (CMS plugin / theme / Cloudflare)', placeholder: 'Yoast SEO / theme header' },
        ],
      };
    case 'cms_ssr':
      return {
        id: 'cms_ssr',
        title: 'SSR / static HTML fallback',
        fields: [
          { id: 'ssr_enabled', type: 'checkbox', label: 'SSR или static HTML fallback е активен' },
          { id: 'published_url', type: 'text', label: 'URL за проверка', placeholder: `https://${domain}/` },
        ],
      };
    case 'cms_upload':
      return {
        id: 'cms_upload',
        title: 'Качване на sitemap',
        fields: [
          { id: 'sitemap_live', type: 'checkbox', label: 'sitemap.xml е достъпен на /sitemap.xml' },
        ],
      };
    case 'hosting':
      return {
        id: 'hosting',
        title: 'Hosting / SSL (не може да се автоматизира от системата)',
        fields: [
          { id: 'http_status_now', type: 'text', label: 'Текущ HTTP status след поправка', placeholder: '200' },
          { id: 'hosting_provider', type: 'text', label: 'Hosting / CDN', placeholder: 'Cloudflare, SiteGround…' },
          { id: 'notes', type: 'textarea', label: 'Какво оправихте', placeholder: '' },
        ],
      };
    default:
      return {
        id: gateId,
        title: 'Ръчна стъпка',
        fields: [{ id: 'done', type: 'checkbox', label: 'Маркирай като направено' }],
      };
  }
}

export function getAutomationSpec(findingId) {
  return resolveAutomationSpec(findingId);
}

/** Resolve spec for static or inferred finding ids (model_gap_*, displacement_*). */
export function resolveAutomationSpec(findingId, ctx = {}) {
  if (AUTOMATION_SPECS[findingId]) return AUTOMATION_SPECS[findingId];
  return inferAutomation({ id: findingId }, ctx);
}
