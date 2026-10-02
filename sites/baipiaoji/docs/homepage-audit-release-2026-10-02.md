# Homepage audit follow-through — 2026-10-02

## Goal and boundaries

Three refinement passes: (1) make source-backed free-tier discovery the homepage's primary task; (2) preserve local BPJ tools, existing account gates, the English metadata experiment and private data boundaries; (3) accept only tested bilingual navigation, search, consent-controlled measurement and verified deployment. No new paid offering, outbound campaign or scheduled job.

The intended reader is choosing an AI tool before committing time or money. Free value is the public limits directory and local PDF/image tools. Existing account and paid cloud-project terms remain separate. Clicks are not completed work, payments or revenue.

## Changes

- Shorter bilingual mobile hero, directory as primary action, explicitly labeled BPJ toolbox as secondary action. Move the common directory ahead of longer task lanes; retain the existing English limits section.
- Search ranks the whole index, prioritizes exact tool names/slugs and removes duplicate canonical destinations. Third-party profiles are distinguished from BPJ tools. Preserve directory trailing slashes.
- Grok, Kimi, GitHub Models and GLM profiles link to relevant comparisons, their official-source section and recorded allowance changes.
- Homepages use the existing consent-created isolated GA4 frame. `home_view` fires once per page after consent; `home_click` records each link action with fixed `home_block`, `home_destination`, `site_edition` labels. Queries, fragments and search input never enter these events. Existing non-home business-event deduplication remains unchanged.
- D1's existing home clicks continue independently. Fixed directory anchors now have their own `tool-directory` label; historical `homepage` records are not reassigned. Reach cache version advances. D1 counts and consented GA4 counts are different populations; no combined CTR is claimed.
- Push IndexNow notification reads only the current build's substantive-change list, verifies canonical live destinations and reports HTTP acceptance, not indexing. CSS/script churn does not qualify all pages.

## Adversarial checks

1. A smaller hero does not prove more demand or conversion. Exact-name searches must still surface tools even after many body matches; PDF duplicates must not consume result slots. The English metadata experiment remains frozen.
2. Repeated real clicks must not be deduplicated, pre-consent clicks must not replay after consent, withdrawal must stop Google collection, and QA/DNT/GPC/automation must remain excluded. Browser tests intercept every request rather than sending fake production events. A successful deployment does not establish email/Google provider availability or payment readiness.

## Validation and interpretation

Run the existing build, canonical/link/schema, account/workerd, studio, commerce, D1 budget/privacy and browser gates, plus `test-search-results.mjs` and `test-homepage-consent-browser.mjs` after GA4 coverage. The latter covers repeat clicks, consent withdrawal/regrant, private query exclusion and zh/en responsive layouts. The build updates sitemap and Markdown discovery mirrors.

Measure future complete windows from this release boundary. `home_view` is a recorded consented page visit, `home_click` is an action (repeat actions can exceed views). Use sessions containing a click for a session click rate, not raw clicks divided by visits. Task result/download and verified paid-order evidence remain separate. New custom parameters require GA4 custom-dimension registration before standard parameter reports; D1 retains the public aggregate breakdown meanwhile.

Account provider setup continues through the existing optional deployment configuration: `GOOGLE_CLIENT_ID`, or `RESEND_API_KEY` plus `ACCOUNT_MAIL_FROM`. Missing values are not invented, logged or replaced with empty settings. Production availability must be checked after deployment; local fixture tests alone are not evidence that a provider is enabled.
