# Delivery preference

For website launches and material product improvements, complete the product, live verification, marketing design, authorized marketing actions and measurement. Deployment alone does not complete the task.

Define the intended buyer, concrete free and paid value, actual payment readiness and evidence required to improve the offer. Use existing channels and reporting where appropriate. Distinguish tests, scheduled posts, published posts, visits, checkout intent and verified revenue. Record remaining uncertainties honestly.

This preference does not authorize new advertising spend, domain purchases, recurring expenses or unsolicited messages to people. Continue following the repository and site-specific instructions.

# Mandatory GA4 on future releases (owner instruction, 2026-10-03)

Every new website, subdomain, public page and tool must ship with working GA4
pageview measurement and the meaningful actions needed to assess its growth.
This includes pages added by scheduled generators. Analytics is a release
requirement alongside SEO, GEO and applicable IndexNow checks.

Register each hostname and its approved existing property in
`tools/fleet-analytics/registry.json`. After ALL page generators, run
`coverage.py --site SITE --write`, then the same command without `--write`.
Run `verify-live.mjs SITE` after deployment. Missing, duplicate or wrong-property
tags block release. New tools must wire fixed actions such as actual completion,
export, affiliate click or signup; examples and clicks are not revenue.

Use the shared opt-in channel, preserve refusal/withdrawal across templates,
keep first-party counts separate, and never send customer inputs or files.
Private account, purchase-delivery and customer-document exceptions must be
explicitly documented. Do not remove these privacy exclusions to pass a gate.
Frontend tests are not proof of GA4 backend receipt; verify receipt separately
with genuine traffic, and report missing access or processing lag honestly.

# Fleet account integration (2026-10-04)

All new canonical fleet sites must support the shared Google registration entry. Follow `tools/fleet-account/README.md`: explicit hub consent, exact host allowlist, per-host sessions and private account routes. Include the shared module in deployment path filters and run account security/live checks. Registration does not grant paid access or subscribe users to marketing.
