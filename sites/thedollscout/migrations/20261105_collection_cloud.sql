-- Optional account backup. Uses the existing HITS / dollscout-events binding.
-- Also initialized idempotently by lib/collection-cloud.js after verified sign-in.
-- No data backfill, account enumeration, new binding or scheduled task.
CREATE TABLE IF NOT EXISTS collector_cloud_v1 (
  owner TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  payload TEXT,
  updated INTEGER NOT NULL
);
