# Fleet evolution loop — 2026-09-20

## Optimized execution brief

Extend the existing daily `fleet-autopilot` run so the public `f-tiger/agi-site` repository can keep the fleet moving without a Codex or Claude session. Read only committed trend, demand, health, AI-referral, reach and membership aggregates; produce a dated fleet report and per-site machine-readable manifests; deploy a site when its measured manifest or existing safe data output changes. Keep copy, pricing, membership rights, payments, customer data and third-party outreach outside the autonomous write path.

## What is autonomous

- `tools/fleet/membership_snapshot.mjs` checks the four independent membership APIs and stores readiness plus aggregate order/member counters. It never writes a payment, activates a member, reads a token, or stores customer data.
- `tools/fleet/evolution.py` ranks opportunity signals, membership health, data freshness, hot pages, underserved demand and AI-referral gaps. Missing or stale inputs remain `unknown` and become an observation or alert.
- The job writes `data/fleet-evolution/latest.json`, `latest.md`, a 30-day history and `sites/*/data/fleet-evolution.json` manifests. The manifests are static, machine-readable evidence for the sites and AI crawlers; they do not claim that queued work was completed.
- The existing autopilot remains responsible for content-hash lastmod correction, demand queues and delta-only IndexNow. A push carrying a changed site file uses the existing `[deploy]` gate so that the relevant site publishes without waiting for a later session.

## Decision boundary

The loop can refresh measurements, queues, manifests and deployments. It cannot invent article text, assert search volume, change a price, open a paid offer, grant or revoke membership, export PII, or send outreach. `queue` actions are evidence-backed work items for the judgement layer; `alert` actions are health failures; `observe` actions are incomplete or stale data.

## Acceptance criteria

1. The workflow still has one daily schedule; no new cron is added.
2. A membership endpoint failure is visible in the report without blocking the other sites.
3. A missing source is represented as `null`/`unknown`, never as zero.
4. Site manifests contain only aggregate counters and derived queues; no token, wallet, order id, support text or raw community post is committed.
5. The decision engine is deterministic and its invariant test passes before writes.
6. Site deployment is triggered only when a site-scoped file really changed; a quiet day produces no site deploy.

## Operating cost

The snapshot adds four bounded same-origin GETs and four aggregate POSTs to the already scheduled run, plus local JSON processing. It adds no provider, no extra schedule and no external write. The existing public repository Actions budget remains the cost ceiling.
