INSERT OR IGNORE INTO platform_config (key, value, verified_at, expires_at)
VALUES (
  'verify_thresholds',
  '{"semantic_threshold":0.35,"weak_overlap_min":0.15}',
  datetime('now'),
  datetime('now', '+90 days')
);
