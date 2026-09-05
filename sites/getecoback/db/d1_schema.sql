-- Reconstructed schema of the D1 database `ecoback-events` (binding EVENTS in wrangler.jsonc).
-- Reference only — never applied automatically; the live tables were created by hand
-- (ua_class arrived via a manual ALTER on 2026-08-23) and this file mirrors the DDL read
-- from sqlite_master on 2026-09-04 so the INSERT column lists in src/worker.js can be checked
-- against something in the repo.

CREATE TABLE IF NOT EXISTS ev (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL DEFAULT (datetime('now')),
  day      TEXT NOT NULL,          -- YYYY-MM-DD, written by the Worker
  name     TEXT NOT NULL,          -- must be in EV_NAMES (src/worker.js); check_events.py ties pages to it
  page     TEXT,                   -- path only; CI probes use /__ci_healthcheck
  ref      TEXT,                   -- referrer host only
  meta     TEXT,                   -- JSON, <= 200 chars
  country  TEXT,                   -- cf-ipcountry
  ua_class TEXT                    -- 'human' | 'bot' | 'ci' (NULL before 2026-08-23); added by manual ALTER
);
CREATE INDEX IF NOT EXISTS idx_ev_day  ON ev(day);
CREATE INDEX IF NOT EXISTS idx_ev_name ON ev(name);

-- Fact-check alert opt-ins (/api/sub2). email is the primary key, so the Worker's
-- INSERT OR IGNORE is idempotent — the deploy self-check's ci@getecoback.invalid row
-- stays a single row. Ledger discipline: exclude rows whose page starts with /__ci.
CREATE TABLE IF NOT EXISTS subs (
  email        TEXT PRIMARY KEY,
  created      TEXT NOT NULL DEFAULT (datetime('now')),
  page         TEXT,
  country      TEXT,
  consent_text TEXT,
  status       TEXT DEFAULT 'stored'
);
