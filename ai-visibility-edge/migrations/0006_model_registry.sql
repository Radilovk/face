INSERT OR IGNORE INTO platform_config (key, value, verified_at, expires_at)
VALUES (
  'model_registry',
  '{"updated":"2026-08-28","gemini":{"citations":"gemini-3.6-flash","advisor":"gemini-3.6-flash","deprecated":["gemini-2.0-flash"]},"openai":{"citations":"gpt-4.1-mini"},"perplexity":{"citations":"sonar"}}',
  datetime('now'),
  datetime('now', '+90 days')
);
