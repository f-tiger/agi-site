# GitHub / MCP daily catalogue expansion

Owner request: expose GitHub projects on the homepage and have the website expand both catalogues daily without an assistant session.

## Three prompt refinements

1. Outcome: visible project cards and task search on the bilingual homepage, plus site-owned daily discovery for GitHub and MCP.
2. Constraints: reuse the existing daily Actions workflow and deployment; no model calls, new paid services, installation execution, invented cost claims or paid organic ranking. Editorial entries keep their reviewed content.
3. Acceptance: real source discovery, durable data commits, published additions, working homepage search, resumable MCP pagination, duplicate suppression, visible failure status, local/CI gates and production verification. A schedule declaration alone does not count as a successful run.

## Runtime

`.github/workflows/deploy-baipiaoji.yml` runs at `30 0 * * *` UTC (08:30 Asia/Shanghai; Actions may queue). The existing manual dispatch also runs discovery. A release containing `[deploy] [catalog-sync]` exercises the same discovery/commit/build/deploy path once. Ordinary release pushes do not crawl. Discovery commits omit `[deploy]`, avoiding recursive deployments. Running jobs are no longer cancelled by a later push.

`scripts/catalog-sync.mjs` owns both lanes. The job token is passed only to constructed GitHub API requests; publisher URLs receive no credentials. It never executes a repository, installs a server, calls an LLM or incurs an API subscription. Public HTTPS destinations, DNS answers and every redirect are checked; DNS is pinned for each request. Requests, retries, bodies and redirect depth are bounded.

GitHub rotates six of 24 task/topic queries per run and three result pages across cycles. Initial admission: at least 500 stars, a push within 180 days, a public non-fork, non-archived repository, description, and reachable README with substantive text. Known collection/course/tutorial names are excluded. This is a discovery heuristic, not a quality or safety rating. Maximum 12 new admissions and six existing automatic record checks per run. An unreviewed queue is capped at 600; the published catalogue has no fixed item cap. Failed candidates rotate behind unattempted ones. Archived/unavailable automatic repositories leave the active view while their history remains.

Automatic records live in `data/github-discovery.json`; the 80 reviewed project records remain in `data/github-tools.json`. The build merges them into the page, search and JSON. Automatic cards say that type, devices, costs and setup require review. Stars are dated snapshots. Generated IDs allow measured actions without accepting arbitrary event payloads or logging search queries.

MCP uses the official registry's v0.1 API. Up to 12 pages per run, a durable cursor, and a scan-start watermark allow an initial full sweep to continue across days. After completing a sweep, `updated_since` uses a one-day overlap. An error cannot advance the cursor past the failed request or advance the watermark. New candidates merge into the pending pool rather than replacing it; already-listed namespaces/repositories do not consume the admission budget. Up to 60 admission attempts and 40 existing-record URL checks per run. Attempts rotate independently of successful-check dates, so blocked URLs cannot starve other records. Source URLs must answer 2xx before admission. Registry deletion/deprecation retires the matching registry record; a mere HTTP error does not assert deletion. A public repository alone is not license evidence, so automated registry pricing is `unstated`, including correction of older registry records that inferred otherwise.

`data/catalog-sync-state.json` holds crawler progress; `data/catalog-sync-status.json` holds run summaries and the last 14 results. `/catalog-sync.json`, the homepage and both directory hubs expose attempts, additions, last success and workflow links. A degraded run preserves valid existing data, publishes its failure status where possible, and makes the final workflow gate fail. Git persistence failures also fail the final gate. Publishing a snapshot does not guarantee that a future scheduled run will execute; readers can inspect the dated status and Actions.

## Adversarial checks (two self-review rounds)

Round 1: buried homepage links, false open-source/free claims, false green runs, partial registry replacement, duplicate repositories, private/credential-bearing URLs. Resolved with real cards, separate evidence labels, outcome gates, merge/resume, within-batch reservations, validated pinned HTTPS and host-scoped credentials.

Round 2: repeated cursors, failed candidates starving queues, cancelled daily jobs, archived repository churn, dynamic analytics IDs drifting from listings, false recency after network failure, one-new-project homepage layout, and mobile action visibility. Resolved with cursor guards, attempt-based rotation, serialized runs, active/history separation, generated ID contract, retained success dates, editorial fallbacks and responsive browser tests.

Tests: `node scripts/test-catalog-sync.mjs --dist`, existing GitHub/browser/homepage-consent and MCP gates, plus the deployment workflow's existing regression suite. Fixture success is distinct from an actual production sync; the release receipt records the latter.

## Distribution, business and measurement

Home/navigation/search/hub/JSON/MCP discovery surfaces share the same data. Existing canonical, sitemap, Markdown mirror, llms and IndexNow mechanisms remain responsible for discovery. Do not create thin individual SEO pages for automatic candidates. Free project search and source links remain free; existing vendor/sponsorship entry points retain their prices and availability, without selling editorial ranking or implying payment integration changes. Measure existing consent-aware homepage destination clicks and allowlisted catalogue actions; additions, clicks, installs and revenue are different quantities.

Primary API references:

- https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/official-registry-api.md
- https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/registry-aggregators.mdx
- https://docs.github.com/en/rest/search/search
