INSERT OR IGNORE INTO platform_config (key, value, verified_at, expires_at)
VALUES (
  'adapter_schema_registry',
  '{"updated":"2026-08-28","models":{"openai":{"fixture":"openai-2026-08","min_citations":1},"gemini":{"fixture":"gemini-2026-08","min_citations":1},"perplexity":{"fixture":"perplexity-2026-08","min_citations":1}}}',
  datetime('now'),
  datetime('now', '+180 days')
);
