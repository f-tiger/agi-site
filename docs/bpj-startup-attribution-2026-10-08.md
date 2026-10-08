# BPJ startup MCP checkout entry attribution

## Scope

Preserve the fixed `bpj-startup-research` entry marker from the Chinese and English startup MCP calls to action through membership checkout. This is a user-controllable entry label, not proof of purchase motivation, a unique person, payment or profit.

- A valid same-site `tool` remains the preferred source.
- The new entry label is accepted only by BPJ checkout. It is not a workspace product and does not grant cloud storage access.
- Same-nonce retries and reuse of an unexpired pending order retain the first stored source, including an empty source. Missing historical source rows are not backfilled.
- Unknown URL source values are omitted by the client. Nonempty unknown checkout-body sources still fail with `bad_source` before nonce lookup.
- Language links preserve only this fixed BPJ source and its MCP anchor. BPJ QA exclusion survives that navigation.
- No prices, quotas, payment/authentication/key behavior, schema, schedules, catalog entitlements or analytics are changed. Private member/key pages remain analytics-free. BPJ client asset versions are bumped.

The existing aggregate report still does not expose a separate MCP order count. This change stores future first-entry evidence only. No live database query, migration or historical rewrite is part of this patch.

## Offline checks

From the repository root, with Node 24:

```sh
node sites/baipiaoji/scripts/test-membership.mjs
node sites/baipiaoji/scripts/test-account-member.mjs
node tools/member-studio/test-isolation.mjs
node --experimental-vm-modules tools/member-studio/test-attribution-ui.mjs
node tools/member-studio/test-attribution-browser.mjs
```

The first four checks passed: 24 membership cases, 11 account/member bridge cases, 8 four-site isolation groups and 16 executed-client-module fixtures. Tests use in-memory SQLite, mocked chain responses, synthetic identities and closed-network page fixtures. They do not establish live payment or MCP entitlement delivery.

The browser script has 17 scenarios: bilingual CTA navigation, bearer and account checkout, language switching, tool priority, rejected/unknown URL markers and all four sites. On the implementation host, Chromium cannot start because its process socket is denied (`socket() failed: Operation not permitted`); therefore browser rendering/navigation is **not yet verified**. The executed-module fixture is not reported as a browser pass. `WORKBENCH_CHROMIUM` and `WORKBENCH_PLAYWRIGHT` can select an already installed local browser/runtime; no new service or credential is required.

## Release boundary

This draft does not deploy. Shared membership paths match the BPJ, AGI, ECO and TDS main-branch release filters. The applicable pull-request workflows are `check-autopilot.yml` (routing and generated sitemap inputs) and `check-eco-energy.yml` (four-site membership isolation/failure tests plus ECO browser, language and privacy regressions). Neither executes the new BPJ attribution browser script. Existing deploy workflows also run broader membership browser tests as part of release.

Before merge, review all four sites' shared-membership regression and the applicable release path. Existing configuration sync is not by itself evidence of a new permission or payment change. The previously rejected BPJ D1 metadata request and TDS D1 request must not be retried. No D1 permission expansion, alternate credentials, CI bypass or workflow rewrite is authorized by this patch.

SEO/GEO: only an existing CTA target changes; page content, canonical routes, language annotations, public evidence, MCP manifest and registration remain unchanged. Any IndexNow notification belongs to the existing successful-deployment path for the changed canonical landing pages, not to a new submission job. No indexing or conversion improvement is claimed.
