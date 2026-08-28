UPDATE platform_config
SET
  value = '{"updated":"2026-08-28","gemini":{"citations":"gemini-3.7-flash","advisor":"gemini-3.7-flash","previous":"gemini-3.6-flash","deprecated":["gemini-2.0-flash"]},"openai":{"citations":"gpt-4.1-mini"},"perplexity":{"citations":"sonar"}}',
  verified_at = datetime('now'),
  expires_at = datetime('now', '+90 days')
WHERE key = 'model_registry';
