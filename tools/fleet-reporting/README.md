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
   Use the **Google official Admin/Data APIs**, via `report.py`, or Google's own
   read-only Analytics MCP. Discover accessible properties, then verify the eight
   fleet properties individually. Retain inaccessible fleet properties and newly
   observed unmapped hostnames. Accessible non-fleet properties are listed as
   discovery metadata but are not queried without a fleet mapping. Windsor and
   other third-party subscriptions are no longer reporting dependencies.
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

## Google direct reader (2026-11-06 migration)

Website tags already send to Google. Replacing a reporting vendor does **not**
require a second gtag, a new property, an API key in HTML, or new pageviews.
Keep existing measurement IDs, historical data, explicit opt-outs and private
route exclusions. Do not install a second tag to fix missing API authorization.

In a private execution environment, install the official authentication library:

```sh
python3 -m venv /tmp/fleet-google-venv
/tmp/fleet-google-venv/bin/pip install -r tools/fleet-reporting/requirements-google.txt
/tmp/fleet-google-venv/bin/python tools/fleet-reporting/report.py \
  --output /tmp/fleet-private-report --cache-dir /tmp/fleet-private-cache
```

Outputs: `ga4.json` (full property/hostname/date evidence and API metadata),
`ga4-report.md` (Chinese comparison base tables), and the existing D1
`snapshot.json` / `coverage.json`. Interpret the actual UTC D1 business fields
separately in the private ChatGPT report; the GA4 base table is not a complete
business report. `--ga4-only` reuses an earlier D1 read without more endpoint GETs.
Exit 2 means GA4 is incomplete, **after saving** the failure/partial report and
continuing D1. Always deliver the available report even when the exit code is 2.
No reports, credentials, snapshots or account summaries may enter this public repo,
public CI logs, public Actions artifacts or the website. The private output guard
rejects every Git worktree. No new cron is installed by these commands.

Authentication accepts existing Google Application Default Credentials (ADC),
`GOOGLE_APPLICATION_CREDENTIALS` selecting an authorized private credential file,
or the existing `GA4_SERVICE_ACCOUNT_JSON` supplied securely to the private runtime.
The SDK handles credential refresh; values and raw authentication errors are never
printed. Do not paste credentials into chat or commit them. Do not put a newly
authorized key into this public repository's legacy reporting jobs: some legacy
jobs publish their output. Configure the private daily report environment only.

The one-time owner action is Google authorization, with the Analytics Admin and
Data APIs enabled in the selected project and **Viewer** access to all eight
properties in the manifest. The OAuth analytics scope is only
`https://www.googleapis.com/auth/analytics.readonly`. No Editor permission,
Measurement Protocol secret, paid upgrade or write tool is needed. API enablement
and account grants are owner configuration steps, not actions this reader runs.

The same authorization can serve Google's official `analytics-mcp` server in a
compatible MCP client (local stdio; it is not automatically a hosted ChatGPT app):

```json
{
  "mcpServers": {
    "google-analytics": {
      "command": "uvx",
      "args": ["--from", "analytics-mcp", "google-analytics-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/private/credentials.json",
        "GOOGLE_CLOUD_PROJECT": "YOUR_EXISTING_GOOGLE_PROJECT"
      }
    }
  }
}
```

This is a configuration example, not an installed or connected server. Use only
read tools (`get_account_summaries`, `get_property_details`, `run_report`);
never enable `--allow-write`. The deterministic API reader is the default for
unattended reports; MCP is an optional interactive interface to the same APIs.

The reader queries each property's actual timezone; a failed timezone lookup
blocks only that property. It retrieves 14 ended dates plus today separately,
and two whole seven-day reports so active users are not summed across dates.
Core metrics and event counts use different queries to avoid event fan-out.
Missing rows remain unknown. ListingLift adds its explicit page-path prefix.
Pagination is bounded and incomplete/changed responses are failures, not totals.
Sampling, thresholding, other-row loss, currency and quota metadata are retained.
API fetch time is not Google's data-generation time; processing delay remains.

Audit the current public tag configuration without executing JavaScript:

```sh
python tools/fleet-reporting/audit_tags.py --output /tmp/fleet-private-tag-audit.json
python -m unittest discover -s tools/fleet-reporting -p 'test_*.py'
```

This checks all canonical URLs and the deployed coverage manifests of registered
sites with an explicit probe UA. Redirects are recorded, not followed. External
script loaders need a source check when HTML alone cannot establish a tag. Static
success and mocked tests are not Google backend receipt; verify genuine existing
traffic once read authorization is configured. No synthetic registrations,
orders, affiliate clicks, pageviews or production conversion probes are allowed.

References: [Google Analytics MCP](https://developers.google.com/analytics/devguides/MCP),
[Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport),
[Admin property lookup](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/get).
