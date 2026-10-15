# Jarvis v23 release follow-through — 2026-10-15

## Three optimization rounds

1. Finish the already-tested portable action-progress change in PR #174 before adding features. Keep its frozen twelve bilingual serialization cases and yesterday's real-model quality failure; neither can be relabeled as customer success.
2. Recheck latest main `b2a7efe7`, production v22, maintenance and actual deployment steps. The earlier `Worker secret missing` hold is resolved by subsequent successful normal deployments 38495281324 and 38531398829. Run 38532340614 uploaded successfully but failed the public-source check with `source_http_429`; it is not a pre-upload secret failure. Latest inspected maintenance 38652221300 passed the Jarvis step. No customer records or secrets were inspected.
3. Merge current main into the existing PR without rollback, strengthen API-to-export run-isolation coverage, run full existing CI, then release through the unchanged guarded workflow. No bypass marker, permission change, new cron or quota reset. If 429 recurs, preserve the failed verification rather than retrying until green.

## Fresh primary evidence and counterevidence

Read 2026-10-15: [LangGraph fault tolerance](https://docs.langchain.com/oss/javascript/langgraph/fault-tolerance) separates retries, timeouts and recovery handling. Retries are opt-in; cancellation and insufficient-quota cases are not ordinary retry targets. [RFC 6585 section 4](https://www.rfc-editor.org/rfc/rfc6585#section-4) defines 429 as rate limiting and permits Retry-After guidance. Engineering inference: distinguish source throttling from deployment/authentication failures; retain saved results rather than re-run model work to make a health check pass.

Counterevidence: retry policies can recover transient errors; refusing all retries can reduce availability. However, neither source proves that retrying within Jarvis's tiny shared budget improves task quality, and a static Markdown snapshot is not an executable recovery checkpoint. No new runtime retry policy is introduced in this iteration.

## Falsifiable experiment and two adversarial self-checks

- Retain the frozen twelve EN/ZH export-state contracts: known tried/completed/blocked states versus unknown/prototype/null; no arbitrary receipt text, memory, old results or invalid timestamps.
- Add an API/SQLite integration check: save completed for run 1, export; advance the synthetic row to run 2, export again. Old completion must disappear, new actions must be unmarked, task/model counts must remain unchanged, deletion must remove receipts. This manipulates local fixtures only, never production tasks or counters.
- Self-check 1: authentication/ownership and current-run filtering precede export; private memories/keys and unrelated receipt fields remain excluded. Self-report is not independently verified completion.
- Self-check 2: export has no inference, tool or write side effect; pause, uncertain interrupted inference and expiry protections remain covered. Browser CI must verify persisted completed status after reload and an actual download in both languages.

## Candidate comparison and measurement boundaries

Deterministic serialization is exact for these known fields and uses zero model calls. Smaller models, the existing 8B model and stronger-model candidates have no measured advantage for this operation; no cross-model benchmark was run. This turn deliberately makes no real AI task and consumes zero new inference tokens. Provider latency and semantic completion/citation accuracy are not remeasured; yesterday's 965-token task remains an overall quality failure despite a correct arithmetic finding. Customer task counts, retention, feedback aggregates and revenue remain unknown.

The product stays a free bounded pilot: one guest task, then free registration; global 12/24h, per-IP 3 and hard task ceiling 2 are unchanged. Public model binding is configuration evidence, not quality or availability proof. SEO/GEO/bilingual FAQ and Markdown, fixed analytics events/privacy exclusions, home entries/countdown/poll/mentor, and weekly/manual-only IndexNow remain release gates. No new MCP or skill is created, so registration is not applicable.

Pre-release local tests on the integrated tree are recorded in the PR; CI and production receipts must be checked separately. A successful upload alone is not a fully verified release. Follow the final PR #174 receipt for actual deployment outcome.
