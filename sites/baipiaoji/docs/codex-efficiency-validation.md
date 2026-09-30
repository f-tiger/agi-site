# Codex Efficiency validation — 2026-09-30

Implementation v1.0.0. No real funds transferred, no buyer cohort, no paired model-quality/savings experiment.

- 21 targeted suites: real SQLite constraints/transactions, mocked finalized-chain RPC, synthetic session logs, CLI install/uninstall. Includes price/receipt isolation, trial, idempotency after history pruning, parallel final-quota requests, project cap, queued renewals, expiry, device revocation, wrong-account/cross-origin/mixed-auth rejection, verified outgoing refund and failure rollback.
- Four deliberate source mutations caught: quota removal, project-limit off-by-one, refund revocation removal, expired-device acceptance. Originals restored after each test.
- 37 existing BPJ push-path scripts passed, including member/account/commerce, Studio, schema/cache and built discovery checks. The two account suites also passed actual local workerd/D1 runtime checks.
- All nine existing push-path browser suites also passed with the local fallback engine.
- EN/ZH desktop and 390px mobile product browser tests passed with actual endpoint/SQLite and fixture identity/RPC: login wall, device approval/revocation, failed checkout and retry, exact amount display, order-help request, history download, no horizontal overflow or page errors. Screenshots visually inspected. Local fallback engine Chromium 143.0.4; CI uses the repository-pinned Playwright engine. Default Chromium download was corrupt in this workspace; no browser security checks were disabled for the successful product run.
- Built dist: 2,351 pages; broken links, JSON-LD errors, Chinese leakage, placeholders, raw Markdown, contradictions, English JSON errors, stale counts, hollow pages and hreflang errors all zero. Canonical route check passed.
- A separate fresh-thread Skill exercise with two ambiguous concurrent projects asked for project/session selection and preserved release safety checks. It did not read credentials or run diagnostics. One behavioral exercise is not a trigger-accuracy benchmark.

Source-level privacy checks and CI/live deployment results are recorded in the release completion below. The operator must still validate a real local-client install/trial and payment/refund readiness before enabling checkout. Unit tests do not justify claiming customer value, guaranteed savings, 90% trigger accuracy, renewal or revenue.
