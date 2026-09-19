-- Optional explicit migration. Runtime uses identical idempotent statements.
CREATE TABLE IF NOT EXISTS bpj_ad_checkout (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, pitch TEXT NOT NULL,
 cat TEXT NOT NULL, lang TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>0), currency TEXT NOT NULL,
 days INTEGER NOT NULL CHECK(days>0), livemode INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'creating',
 session TEXT UNIQUE, intent TEXT UNIQUE, created INTEGER NOT NULL, paid_at INTEGER,
 slot INTEGER CHECK(slot BETWEEN 1 AND 3), starts_at INTEGER, ends_at INTEGER, total_cents INTEGER, tax_cents INTEGER
);

CREATE INDEX IF NOT EXISTS bpj_ad_delivery ON bpj_ad_checkout(cat,state,slot,ends_at);

CREATE TABLE IF NOT EXISTS bpj_ad_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS bpj_ad_reversals (intent TEXT PRIMARY KEY, reason TEXT NOT NULL, created INTEGER NOT NULL);
