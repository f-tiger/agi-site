# TDS: put the buying decision before the product exit

The previous release made comparison controls reachable. The next problem was
the order of the buying journey: homepage visitors saw mixed products before
task-specific guides, and guide readers saw merchant exits before measurement
advice. A production browser audit at 390px measured the English homepage guide
section at y=2895 and display measurement section at y=3391; Chinese equivalents
were y=2762 and y=3264. These are layout observations, not abandonment statistics.

## Product decision

Keep TDS focused on collectors choosing display, storage/carrying, plush display
or gifts. Its useful free result is a better-informed shortlist, including the
decision to keep an existing setup. Existing disclosed affiliate exits remain
the available commercial mechanism; checkout, attributable revenue and growth
are not established by this release.

Reuse the existing task navigation on the homepage before product cards. Each
guide now begins with a short, specific check: usable space rather than exterior
dimensions; storage versus carrying versus shipping; full plush pose; or the
recipient's known collection and fit. Detailed measurements and no-purchase
advice are in a native disclosure before the products, with a clear label.
Comparison and the existing fit/budget tool remain direct links. Visitors can
compare without filling in a form or opening every detail.

This avoids moving a long wall of instructions above the products. The original
measurement and no-buy text remains intact, keyboard accessible, and usable
without JavaScript. The visible guidance and useful links are also included in
the plain-text mirrors. Page-modification dates change; product-source check
dates remain 2026-11-07 because this is not a new specification verification.

## Review and failure handling

`gstack-codex-auto` controls the session workflow. CEO-style premise and value
review is one phase, followed by engineering/design reconciliation, implementation,
two adversarial self-reviews, QA, repair and release verification. No separate
model CLI, login or background execution is involved.

- Product: the benefit is earlier task and constraint selection; adding products
  or paid plans without demand evidence does not solve the observed problem.
- Engineering and data: reuse one localized generator and existing native HTML
  behavior. No new service, storage format, input or tracking event is needed.
- UX: preserve direct product access, keyboard operation, no-JS links, responsive
  comparison controls and current black/white/red styling.
- Source and market safety: keep US/DE destinations, the unsupported German
  NIUBEE exclusion, affiliate disclosures and outside-versus-inside limits.
- Failure paths: JavaScript disabled still permits all routing and disclosure;
  existing corrupt/blocked storage and clipboard cases remain in shortlist QA.
  No link should target a missing guide, comparison section or tool.
- Performance and privacy: the new behavior uses static HTML/CSS. Existing
  comparison and merchant events keep their bounded schemas and QA/opt-out rules;
  no measurements or collection contents are sent by this change.
- Rollout: one task-scoped PR through the current-main deployment guard, final
  GA4 coverage, native build checks, production verification and IndexNow.

Self-review 1 challenges the product assumption: easier navigation is not proof
of demand or revenue. Existing USD100/month and traffic objectives retain their
definitions and unknown results. Self-review 2 challenges the implementation:
collapsed content must remain discoverable and accessible; no-JS paths, local
tools, translated controls and narrow screens must be exercised, not merely read.

The first implementation's browser evidence puts the 390px homepage task links
at y=446 (EN/DE) and y=383 (ZH). The display-guide checklist summaries are at
y=799 (EN/DE) and y=617 (ZH), with task-specific advice above them. These measure
the new entry points, not the hidden expanded text or business outcomes. The
source browser suite passed 60 journeys, including all four guide types without
JavaScript; the original-source regression fixture fails the new task-order
assertion while the current source passes it.

## Verification

From repository root:

```sh
node sites/thedollscout/scripts/collecting/shopping-tests.mjs
node sites/thedollscout/scripts/collecting/shopping-shortlist-tests.mjs
node sites/thedollscout/scripts/collecting/build.mjs
node sites/thedollscout/scripts/collecting/verify.mjs
node sites/thedollscout/scripts/collecting/shopping-browser.mjs --artifacts /tmp/tds-journey-qa
node sites/thedollscout/scripts/collecting/shopping-shortlist-browser.mjs --artifacts /tmp/tds-shortlist-qa
```

The shopping browser suite covers all three languages at 320/390/1440px, the
homepage and four guide types, native disclosure by keyboard, comparison anchor
targets and existing tool destinations. It also covers the homepage and every
guide with JavaScript disabled. The shortlist suite retains storage/share and
market boundary coverage. Both intercept local files and block production/API
requests. Final release-directory checks use `--out sites/thedollscout/dist`.

Follow the existing workflow's assembly and generator order, then GA4 coverage
with `--write` and without it, followed by routing generation/checks and coverage.
Verify generator repeatability, canonical/hreflang, sitemap, structured content
and AI text. The release PR records final test and production receipts.

## Measurement and distribution

This improves existing owned entry points and the already-approved campaign's
landing page. It creates no new post, ad spend or schedule. Keep the existing
shopping observation window and review date; record this release's actual date
when examining later behavior. Compare explicit shopping/merchant actions by
their existing definitions, not as person-level conversion rates. Merchant
statements and independent attribution are still needed for revenue. IndexNow
acceptance is separate from indexing, ranking and AI citation.
