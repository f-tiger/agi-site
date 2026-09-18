CREATE TABLE IF NOT EXISTS jobs (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, input TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'awaiting_payment', created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, session_id TEXT UNIQUE, payment_intent TEXT UNIQUE,
 amount_paid INTEGER, paid_at INTEGER, refund_id TEXT, refund_state TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0, lease_token TEXT,
 reserved_usd REAL NOT NULL DEFAULT 0, observed_usd REAL NOT NULL DEFAULT 0,
 cost_unknown_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS items (
 job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, idx INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 output TEXT, issue TEXT, PRIMARY KEY(job_id,idx)
);
CREATE INDEX IF NOT EXISTS jobs_expiry ON jobs(expires_at);
CREATE INDEX IF NOT EXISTS jobs_payment ON jobs(payment_intent);
CREATE TABLE IF NOT EXISTS rate_limits(bucket TEXT PRIMARY KEY,n INTEGER NOT NULL,expires_at INTEGER NOT NULL);
