# BPJ homepage and autonomous catalogue expansion

Owner requested visible GitHub projects on the homepage and daily, website-owned expansion of GitHub and MCP listings without an assistant session.

## Delivered and observed

- Homepage: six real project cards, a dedicated task/project search form, topic links and GitHub/MCP shortcuts. GitHub projects are the first content section after the hero, before the general directory. Desktop and mobile navigation include GitHub. Both languages are supported.
- Existing site Actions schedule (`30 0 * * *` UTC, planned 08:30 Asia/Shanghai) now discovers, validates, deduplicates, commits and publishes both catalogues. Runs may queue on GitHub. No additional assistant task, paid API, model call or package execution is required.
- First real source sync: GitHub discovered 131 eligible candidates and admitted 12, increasing 80 → 92. MCP fetched 12 registry pages (1,200 entries), admitted 55 and rechecked 40 existing records, increasing 1,272 → 1,327. Five MCP candidates were rejected. Both discovery lanes completed successfully and committed their outputs.
- Persisted progress: 119 GitHub candidates, next query index 6; 456 MCP candidates and a nonempty registry cursor. The initial full scan remains in progress under a daily page budget. The watermark advances only when that scan completes; subsequent reads use the official incremental API.
- Automatic GitHub listings retain separate provenance and unreviewed setup/cost labels. GitHub topic metadata supplies broad categories without claiming an installation test. Registry-backed MCP entries no longer infer an open-source license merely from a public repository: 1,025 such records now have unstated pricing.

The source sync ran in [37026946102](https://github.com/f-tiger/agi-site/actions/runs/37026946102), producing data commit `17129b0`. Its discovery and commit steps succeeded; its later deployment gate caught a navigation-order regression. A second deployment caught a shared button selector regression. Both were fixed in product code, preserving the existing tests and adding checks for the new destination clicks. Neither failed deployment was represented as a successful site launch.

Production code release: `6a9da1526bbc59969235c79d2fcb376fcf5103db`. Deployment workflow: [37029261318](https://github.com/f-tiger/agi-site/actions/runs/37029261318). The final workflow completed successfully at 2026-10-02 15:57 UTC (87 configured steps, with conditional steps skipped as configured). Cloudflare deployment completed at 15:50 UTC. Final production self-tests all passed.

## Verification

- Three prompt refinements and two adversarial self-review rounds, documented in `sites/baipiaoji/docs/catalog-daily-automation-2026-10-02.md`.
- 62 existing local non-live gates passed. Twenty catalogue fixture/build assertions passed, covering API failure, cursor resumption, deduplication, unsafe URLs/DNS, truthful evidence labels, archive handling, website-only MCP records, namespace collisions, mixed-topic queues, fair old-record rotation and published status parity.
- Affected browser checks passed: full GitHub search/filters/deep links; homepage search and card links; zh/en clicks and consent; 390/1024/1440px shared navigation and dark form contrast; general catalogue; and 36 distribution checks. Requests were intercepted and self-test traffic excluded.
- Production verification fetched 15 endpoints in both languages. The homepage has six cards and its project section precedes the general directory. Both GitHub JSON files have 92 unique project IDs, all present as rendered cards and in global search anchors; 80 editorial + 12 automatic. Both Agent/MCP JSON files contain 1,327 records. Published update status exactly matches committed source data.
- The public MCP `resources/read` response for `baipiaoji://agents` returns 1,327 records. Four live assets (`github-tools.js`, `github-tools.css`, `github-tools-core.mjs`, `site-shell.css`) match the tested local build byte for byte.

Public entry points:

- https://baipiaoji.com/
- https://baipiaoji.com/github-tools/
- https://baipiaoji.com/en/github-tools/
- https://baipiaoji.com/agents/
- https://baipiaoji.com/catalog-sync.json

## Operational and commercial boundaries

Daily runs have bounded discovery/admission/recheck budgets; a successful run may have no qualifying additions. Failed requests retain prior evidence dates and valid records, preserve progress, publish a degraded status where possible, and fail the final workflow gate. Persisting refreshed data is also gated. Public status describes source synchronization separately from the later deployment stage.

New automatic entries have sources and dated URL/README checks, not security, performance, licensing or usability certifications. Existing free search and clearly separated vendor/sponsorship entry points remain available. New destination clicks are measured through the existing privacy-aware event path; no search text is sent. Catalogue additions are not visits, installs, search indexing or revenue, and no traffic or revenue increase is claimed by this release.


## Search submission receipt

IndexNow accepted 18 batches with HTTP 200: 17 × 100 URLs + 22 URLs = 1,722 canonical pages. Before submission the workflow checked the deployed URL and matching canonical for each page; the larger batch reflects this release’s shared navigation change. This is an acceptance receipt, not proof that any search engine indexed or ranked the pages. Existing sitemap, llms, bilingual JSON and the existing MCP discovery resources remain in place.

Final CI job: `110911666710`. Live endpoint parity and the public MCP resource were checked after deployment; no traffic or payment outcome was inferred from these probes.
