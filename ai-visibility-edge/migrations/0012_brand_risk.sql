-- Радар за информационни аномалии: рискови твърдения, приписани на марка.
-- Работи за ЧУЖДИ домейни — не изисква нищо от наблюдаваната марка.

CREATE TABLE brand_risk_findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  domain TEXT NOT NULL,
  model TEXT NOT NULL,
  question_id TEXT,
  risk_class TEXT NOT NULL,
  severity TEXT NOT NULL,
  evidence TEXT NOT NULL,
  sentence TEXT NOT NULL,
  sentence_index INTEGER,
  detected_at TEXT NOT NULL,
  risk_version TEXT NOT NULL
);

CREATE INDEX idx_risk_domain ON brand_risk_findings(domain, detected_at DESC);
CREATE INDEX idx_risk_class ON brand_risk_findings(domain, risk_class);
CREATE UNIQUE INDEX idx_risk_dedupe ON brand_risk_findings(run_id, sentence_index, risk_class);
