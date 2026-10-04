# BPJ registration growth

Owner objective: exceed ten real registered users; continue authorized execution without routine confirmation. Operational threshold is at least eleven surviving non-test accounts; this is not proof of eleven unique people or paying customers. Email-verified totals are separate. Never create non-QA accounts to satisfy the goal or count newsletter/member rows as registrations.

Three refinement rounds: (1) define registrations and threshold, (2) use existing traffic and free owned surfaces without new spend or unsolicited outreach, (3) require functional bilingual signup-to-save journeys, current lifetime totals, deployment and live checks.

Curated tool pages offer a specific free benefit: save the selected tool to a free account, sync up to forty tools, review recorded changes and export sourced quota sheets. Preserve the selected tool through the account URL. Validate against the public catalog. A URL does not mutate favorites: authenticated users explicitly save, including after registration/recovery; existing browser favorites are never silently imported.

`conversion_stages.accounts.total_non_test` counts existing `qa=0` accounts including today; `total_currently_email_verified` is a separate subset. Existing window metrics retain complete-UTC-day meaning. Missing tables return unavailable, not a fabricated zero. Existing hourly reach cache is reused. Public endpoint contains aggregate counts only; do not place operational account/traffic snapshots in this public repository.

Public tool signup clicks use a fixed first-party event path and a consent-gated GA4 `account_entry` action scoped to BPJ tool routes. Clicks are neither registrations nor unique users. Account pages retain analytics exclusion, noindex, no-store and no-referrer protections. QA, webdriver, DNT and GPC clicks are excluded. No email, identifier, arbitrary URL or query is forwarded.

Self-review round one: challenge the assumption that more content automatically creates users; make the existing high-intent tool journey useful before adding distribution. No promised acquisition outcome. Round two: test QA exclusions, lifetime versus date-window counts, invalid tool input, explicit mutation, recovery, cross-device login and mobile layout. Preserve evidence links, canonical/hreflang, source dates, current SEO/GEO and IndexNow release gates.

Validation: SQLite account lifecycle and conversion tests, bilingual Playwright registration/save/recovery flows, reach-cache regression, output/canonical checks and fixed analytics allowlist tests. After release check actual CTA, account readiness, metric shape, existing live QA cleanup and consent coverage. Do not claim Google OAuth success from configuration readiness. Continue existing daily automation; prioritize a demonstrated bottleneck, avoid speculative code churn, report actual results and remaining uncertainty.
