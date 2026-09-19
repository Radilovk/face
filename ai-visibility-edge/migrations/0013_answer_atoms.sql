-- Атоми: атомарни проверими твърдения, публикувани на адрес, който машина
-- може да вземе, и проследими обратно до конкретното цитиране.
--
-- Единицата на състезанието не е страницата, а пасажът, който отговаря.

CREATE TABLE answer_atoms (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  tenant_id TEXT,
  question_id TEXT,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,

  -- първичното число: това, което само клиентът притежава
  fact_value TEXT NOT NULL,
  fact_unit TEXT,
  fact_date TEXT NOT NULL,
  source_label TEXT,

  -- нормализиран кортеж за обратна атрибуция
  fingerprint TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft',
  uniqueness TEXT NOT NULL DEFAULT 'unchecked',
  published_at TEXT,
  updated_at TEXT NOT NULL,
  atom_version TEXT NOT NULL
);

-- Едно твърдение на въпрос за домейн — нови версии заместват, не се трупат.
CREATE UNIQUE INDEX idx_atom_domain_question ON answer_atoms(domain, question_id);
CREATE INDEX idx_atom_fingerprint ON answer_atoms(fingerprint);
CREATE INDEX idx_atom_status ON answer_atoms(domain, status);

-- Цитиране на конкретен атом, доказано чрез отпечатък в цитирания пасаж.
CREATE TABLE atom_citations (
  id TEXT PRIMARY KEY,
  atom_id TEXT NOT NULL REFERENCES answer_atoms(id),
  observation_id TEXT REFERENCES observations(id),
  run_id TEXT,
  model TEXT NOT NULL,
  domain TEXT NOT NULL,
  match_method TEXT NOT NULL,
  cited_passage TEXT,
  cited_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_atom_citation_dedupe ON atom_citations(atom_id, observation_id);
CREATE INDEX idx_atom_citation_atom ON atom_citations(atom_id, cited_at DESC);
