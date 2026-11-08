# TDS comparison usability

Collectors could select products far below the only comparison button and then
had to scroll back to find it. Removing a selected chip rebuilt its focused DOM
node; clearing hid the focused button. Both could leave keyboard users on body.

The existing six-option shortlist now has a compact comparison action that stays
visible while browsing its section after the first selection. One selection
explains that another is needed. The three-item limit is also explained next to
the action. Short viewports (480 CSS pixels high or less) keep the action in normal
flow so it cannot occupy most of the screen. Empty lists have no sticky action.

The comparison has an Edit selected options button. It returns to the selection
and focuses a chip. Removing a chip focuses the next chip, or the previous last
chip; clearing focuses the selection container. All controls and instructions
are localized in English, German and Chinese.

Product facts, source-check dates, market eligibility, merchant destinations,
max-three storage format, sharing IDs and no-JavaScript links keep their existing
contracts. This change does not introduce prices, rankings, product images or a
payment flow. It keeps the existing explicit comparison event and does not add
events for scrolling, editing or restoring selections. QA excludes business
measurement. Browser checks cannot establish GA4 backend receipt or revenue.

## Workflow and verification

Implemented with the installed `gstack-codex-auto` current-session skill:
product/engineering/design planning and challenge, implementation, documentation,
browser QA and two adversarial self-reviews. These are self-reviews by the same
assistant, not independent audits or a separate authenticated CLI process.

The original browser suite passed on the starting revision. A new real-browser
assertion that the compare button is visible after selecting a lower product
failed on the old implementation. It remains in the suite as a regression check.

Reproduce from repository root:

```sh
npm ci --prefix tools/revenue-studio --ignore-scripts
node sites/thedollscout/scripts/collecting/build.mjs
node --test sites/thedollscout/scripts/collecting/shopping-shortlist-tests.mjs sites/thedollscout/scripts/collecting/shopping-tests.mjs sites/thedollscout/scripts/collecting/shopping-growth-tests.mjs sites/thedollscout/scripts/collecting/affiliate-tests.mjs
node sites/thedollscout/scripts/collecting/shopping-shortlist-browser.mjs --artifacts /tmp/tds-comparison-ux
node sites/thedollscout/scripts/collecting/verify.mjs
```

For release-directory verification, assemble `sites/thedollscout/dist` with
`scripts/assemble-dist.sh`, then run the shared workbench, document and collector
generators in the order in `.github/workflows/deploy-thedollscout.yml`. Run GA4
coverage with `--site tds --out sites/thedollscout/dist --write`, then without
`--write`, after those generators. Pass `--out sites/thedollscout/dist` to the
browser script. The current cloud image lacks rsync and system-install privileges;
local staging copied with the same exclusions, while exact rsync assembly must
pass in the official deployment workflow.

The browser script uses installed Chromium, intercepts the generated local site
and blocks outside/API requests. It covers 320/390/1440-pixel widths, all three
languages, a short landscape viewport, real clipboard success and failure,
blocked/corrupt storage, cross-guide and cross-market sharing, and no-JS exits.

SEO/GEO contracts retain canonical/hreflang, sitemap, structured data and plain
text discovery. Affiliate URLs remain excluded from AI text. Deployment uses the
existing TDS workflow, GA4 coverage after final generation, live checks and
IndexNow submission; do not add a schedule. New comparisons remain part of the
existing shopping experiment, not evidence of increased conversion or revenue.

## Adversarial self-reviews

1. Interaction and responsive layout: inspected real browser screenshots in
   addition to passing assertions. Found the long German selected-count label
   crowded the button at 320px. Replaced the dock count with `2 / 3`, constrained
   its grid columns and added non-overlap/fit assertions. The fully localized
   selection count remains in the selection panel. Verified keyboard return,
   removing first/last/only chips, clearing, and short-viewport fallback.
2. Persistence, measurement and release boundaries: checked invalid/oversized
   fragments, cross-market exclusions, blocked storage and clipboard rejection
   against the existing tests. Confirmed only explicit Compare invokes the event
   helper, no new remote requests or data fields, merchant links remain available
   without JS, and generator rebuild leaves an identical diff. Analytics injection
   is confined to the release directory. Account routing generation precedes its
   check. Source facts, dates, AI-text mirrors and merchant links are unchanged.

Validation: 15 existing collector/shopping test files passed; 171 collector pages,
93 document pages and 8 workbench pages passed their build checks. Structured
content: 182 visible FAQ/DefinedTerm entries, zero mismatches. Final release GA4
coverage: 314 public pages with five explicit exceptions. Browser results and
production deployment receipts are recorded in the release PR; browser evidence
is not a conversion claim.
