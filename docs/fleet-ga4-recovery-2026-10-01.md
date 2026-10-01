# Fleet GA4 recovery — 2026-10-01

Owner requested completing the repair after TDS PR #49 and the first fleet audit.
This closes the AGI/ECO gaps recorded in `tds-ga4-recovery-2026-10-01.md` and extends
coverage to generated workbench pages on all four existing GA4 domains.

## Diagnosis and scope

The first live samples understated the affected surface: translated pages and
the shared workbench generator also omitted Google tags. A `gtag` function or a
Google preconnect hint alone did not prove collection. Full build output was
checked, including BPJ's generated `/tools/` pages, not just committed HTML.

| Domain | Existing stream | Newly covered HTML outputs in the local full build |
|---|---|---:|
| agiscorecard.com | G-FZXLMBB5QB | 66 |
| getecoback.com | G-E2V0Q9SJ9V | 42 |
| baipiaoji.com | G-H79D948F4Z | 8 |
| thedollscout.com | G-2SEHFY33H8 | 8 |

These are 124 HTML outputs, including aliases, not 124 users or necessarily 124
distinct canonical URLs. Coverage manifests contain the precise inventory; later
generators can add pages, and the same gate covers them automatically. TDS's 93
document pages repaired in #49 retain their existing consent loader. BPJ's main
directory/agent/studio pages retain their working tags. The 27 other hostname
entries from the previous fleet audit use different first-party instrumentation;
absence of a configured GA4 property is not treated as a broken GA4 installation.

## Repair

All four deployment workflows run one final installer/checker after the last
generator. It supplies each missing public page with its own site's consent
loader, rejects duplicate loaders and wrong property IDs, and publishes an
auditable coverage manifest. Existing loaders and first-party events remain.
After deployment, a live check compares the four analytics asset bytes/version
and every repaired canonical URL, rather than checking only the homepage.

The new loader requires affirmative consent and supports decline, withdrawal,
regrant and cross-tab updates. It respects DNT/GPC and excludes preview hosts,
automation, embeds and QA URLs. Six language versions cover the affected pages.
Google executes in an empty same-origin frame so automatic form, download and
history measurement does not watch the application's document. Only build-time
public metadata is passed to it. AGI explicitly exempts that frame from its edge
pageview and legacy script injection. Account portals, client quotes, embedded
widgets and probes remain deliberate exceptions, with reasons in the manifest.

## Validation and limits

- Six coverage tests check real script detection, wrong properties, duplicates,
  missing assets, idempotency and narrow exceptions. An edge-worker test proves
  the internal frame creates no extra D1 pageview or injected form/event script.
- Real Chromium and the actual Google tag generate exactly one intercepted
  pageview for each site's property. Synthetic query/fragment secrets, dynamic
  titles, input text, form names, download names, event labels and history changes
  do not enter the observed Google requests. Withdrawal removes GA cookies;
  regrant does not duplicate the view, and QA paths generate no Google requests.
- Existing AGI validation, hreflang, breadcrumbs and analytics sanitiser/D1 tests
  pass. ECO event allowlists and retired-page/product guards pass. Offline BPJ
  distribution, canonical and agent checks are run separately from its unrelated
  external provider health crawler. Existing document/workbench tests remain in
  the deployment workflows.
- Browser collect requests are fulfilled locally, never sent to production. This
  proves frontend request generation, not GA4 backend acceptance or display.
  The connected analytics account still lacks GA4 read scope. No missing history
  is reconstructed, and consent-based GA4 totals must not be equated with D1 events.

Optimization: round one preserved the all-site repair goal; round two separated
existing-property regressions from intentional independent counters; round three
made full-build/live coverage the acceptance gate. Two adversarial self-checks
challenged false positives/double-counting and input disclosure/QA contamination.
These were self-checks, not independent reviewers.
