-- Optional explicit initialization for the existing HITS database.
-- Run this file alone after the shared free-account schema is present.
-- The runtime uses the same idempotent definitions. This migration creates
-- storage only. It does not infer historic sources or insert accounts or events.

CREATE TABLE IF NOT EXISTS free_account_signup_claims (
  claim_hash TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  expires INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS free_account_signup_claims_expires
  ON free_account_signup_claims(expires);

CREATE TABLE IF NOT EXISTS free_account_signup_sources (
  account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bpj_trade_quote_workbench_use (
  account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE,
  first_day TEXT NOT NULL,
  repeat_day TEXT CHECK (repeat_day IS NULL OR repeat_day > first_day)
) WITHOUT ROWID;
