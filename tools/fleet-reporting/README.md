# Fleet reporting coverage

This inventory extends the analytics release registry into a reporting catalogue.
It records **52 site identities**, **6 separate alias/preview records**, **8 historical
GA4 properties**, and **23 unique public aggregate URLs configured for 31 sites**.
Those are configuration counts, not proof that all sources return usable data.
SunWatch and the external experimental sites remain visible even without an
aggregate endpoint. There is no claim of exhaustive Cloudflare/DNS asset discovery.

`manifest.json` is generated from local Worker route configurations,
`tools/fleet-analytics/registry.json`, the fleet account allowlist and a reviewed
external source catalogue. External route/canonical files were read from public
GitHub sources on 2026-10-11. Every site retains its source evidence. The generator
does not fetch live sites or depend on temporary session files. New local routes
and allowlisted hosts are included automatically with unknown mappings and
uncovered status until their measurement evidence is supplied.

Run from the repository root:

```sh
python tools/fleet-reporting/build_manifest.py
python tools/fleet-reporting/build_manifest.py --check
python -m unittest discover -s tools/fleet-reporting -p 'test_*.py'
```

The GA4 release registry stays unchanged: this reporting catalogue must not make
unrelated site deployments or imply that account allowlisting installs analytics.
`registry_configured_not_backend_verified` and
`source_configured_not_backend_verified` describe instrumentation evidence, not
backend receipt. AIChain's legacy Netlify hostname and Zaoqi's observed Pages
hostname have their own mapping evidence. Compass is not assigned AIChain's
property merely because the two hosts are related. `agentfront` and `x402` have
overlapping external source claims; each hostname appears only once.

For each report:

1. Read this public manifest and report all site rows, including failures and gaps.
   Read Windsor `get_connectors` and `get_fields` before querying; the current
   connection list overrides the historical property list. Retain newly observed,
   unmapped hostnames rather than silently filtering them out.
2. Query GA4 by property **and hostname**, verifying property timezones. ListingLift
   also requires its `/smarterFuture/launch/ai-realtor/` page-path boundary because
   `f-tiger.github.io` hosts unrelated projects. Keep aliases/previews separate;
   never copy property totals or alias users to a canonical site's row.
3. Fetch each unique aggregate URL at most once per run with the collector's
   explicit probe User-Agent. The 15 existing endpoints are `legacy-approved`;
   the 8 added endpoints require the deployed `read-only-aggregate` contract.
   Respect the one-hour cache and record generation time, fetch time and cache age.
   Do not use redirects, cache-busting, business events or synthetic conversions.
4. Web3's hub exposes all 11 hosts through **two requests**, `/api/growth` and
   `/api/stats`. Split every applicable row by the manifest's exact `site` mapping
   (`web3.agiscorecard.com` maps to `hub`). Do not give all-hub totals to each child.
   A missing group is unknown unless a successful source explicitly establishes a
   complete sparse daily window. Missing database/table responses are unknown.
5. Keep UTC daily business rows, property-timezone GA4 days, today-to-date data and
   rolling totals distinct. Rolling snapshot differences are not daily additions.
   Events, demo tasks, own-input tasks, self-reported feedback, QA, downloads,
   registered accounts and confirmed payments are different measures. `human`
   and `other` caller classes do not establish independent external people.

The collector is manually invoked and writes only private output outside Git
worktrees. It does not install or modify scheduled tasks. A report should lead
with measured changes, show the full GA4 coverage table and the sources with true
daily business rows, then list rolling totals and explicit missing coverage.
Source configuration contains no private traffic counts, account contents or
credentials. Keep snapshot/coverage JSON, raw connector results and dated report
baselines in a private output directory, never in this public repository.

After publication, the durable inventory is
<https://raw.githubusercontent.com/f-tiger/agi-site/main/tools/fleet-reporting/manifest.json>.
If it is unavailable, disclose the coverage limitation; the old 31-host registry
alone does not establish full fleet coverage.
