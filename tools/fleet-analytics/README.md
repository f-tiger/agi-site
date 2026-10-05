# Fleet GA4 release contract

Owner requirement (2026-10-03): every new website, subdomain, public page and tool
ships with pageviews and meaningful fixed actions, including scheduled expansion.
Analytics is part of release acceptance alongside SEO, GEO and applicable IndexNow.

`registry.json` is the explicit hostname/property/build-root mapping. The four
main sites retain their own properties. The 27 registered AGI subdomains share
AGI's existing property and preserve their hostname. Historical hosts outside
these build roots are not covered by this release contract.

After **all** generators, run:

```sh
python3 tools/fleet-analytics/coverage.py --site eco --write
python3 tools/fleet-analytics/coverage.py --site eco
node tools/fleet-analytics/verify-live.mjs eco
```

The final installer removes known legacy Google entrypoints while retaining
first-party callbacks, then installs exactly one default-on channel. Every generated
public HTML page is checked for canonical host, property, assets and duplicate
loaders. Each deploy workflow executes the installer and rejects a main revision
change before publication. The live gate checks every hostname/shared asset and
up to a representative spread of routes; use `--all` for exhaustive live checks.
`coverage.json` describes full build coverage and explicit exclusions.

Google runs in an empty same-origin document, created automatically unless opted out. The
parent sends build-time public URL/title, referrer origin, fixed actions and
registered campaign tags. URL queries, fragments, forms, file contents, filenames,
search terms, prices and arbitrary event parameters are excluded. Host-only,
prefixed cookies keep subsite analytics separate. Existing explicit refusals are
preserved; new visitors see no popup. A footer toggle enables opt-out. Withdrawal removes the frame and
its cookies. Old templates use the same choice as new tools. QA, probes, browser
automation, DNT and GPC remain excluded. No-transform excludes injected Cloudflare
beacons from the isolated frame; workers also bypass first-party PV collection
for analytics assets. Strict tool CSP remains separate from the frame's policy.

One capture listener owns eligible Amazon affiliate clicks; legacy affiliate
callbacks stay available to first-party counters but cannot double-send GA4.
Known fixed legacy actions bridge only while enabled; pre-consent queues are not
replayed. New tools should dispatch the strict `fleet:business` contract and add
meaningful completion/export events to `business.mjs`. Examples must have separate
events. Do not mark simulated checkout, signup intent or affiliate clicks as sales.
Register new public campaign identifiers in `campaign.mjs` before distributing links.

Private membership/account portals, purchase delivery, customer quote documents,
embeds, probes and error pages are explicit exclusions. Do not broaden an
exclusion just to silence a build failure. Dynamic private/reader-specific pages
retain their existing first-party handling and need a separate privacy review
before GA enrollment.

```sh
python3 tools/fleet-analytics/test_coverage.py
python3 tools/fleet-analytics/check-registry.py
node --test tools/fleet-analytics/business.test.mjs tools/fleet-analytics/integrity.test.mjs tools/fleet-analytics/test-worker.mjs
```

Browser checks use the pinned Playwright dependency and intercept all Google
collection requests, including real-tag mode (`REAL_GTAG_DIR`). Synthetic tests
never enter production. `browser-test.mjs --site agi --out sites/agiscorecard`
checks refusal, withdrawal, one pageview, private-data exclusion and tool events.
Frontend success is **not** GA4 backend receipt. Read genuine events separately;
GA4 remains subject to opt-outs and blocking, not a census, and tool actions are not revenue.
