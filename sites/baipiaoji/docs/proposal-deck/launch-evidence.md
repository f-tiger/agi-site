# ProposalDeck release evidence

2026-10-01 implementation. Target: https://baipiaoji.com/studio/proposal-deck and /en/studio/proposal-deck.

The public offering is a browser delivery workbench for an existing AI workflow. It does not call a hosted model. Free: full editor, native PPTX, notes and local backups. Paid: existing BPJ membership cloud projects/history, with runtime readiness gating. No new plan, price, order or production entitlement was created during development.

## Local evidence

- Both languages tested in Chromium at 1440 px and 390 px, including mobile overflow checks and inspected screenshots.
- Browser downloads are real Office Open XML ZIP files. Tests inspect native table XML, chart parts, speaker notes and source text.
- Exported Chinese proposal and review decks opened successfully in LibreOffice and were rendered to PDF for visual inspection. Native text, schedules and charts were legible. PowerPoint/WPS-specific font differences remain possible; inspect before client delivery.
- Schema/size checks reject malformed imports without replacing the current project. Preview escapes hostile markup. Text and table pagination preserve content.
- Real member handler with synthetic SQLite accounts: manual login, save, second revision, restore, origin/sender/nonce checks and edits after handoff. Acknowledging an older snapshot does not claim that newer edits are saved.
- QA uses __ci=1 and emits no demand events. Existing member isolation tests pass. No real payment was tested or claimed.
- Full dist checks: 2,359 HTML pages, zero broken links, invalid structured data, language leaks, placeholders, raw Markdown, contradictions or hreflang failures; canonical route checks passed. The feature map has 48 entries.
- Existing studio, work-plan, video business, revenue-workbench and membership checks pass. Analytics coverage check reports zero remaining repairs after instrumentation.

## Production evidence source

The repository's [Daily update & deploy workflow](https://github.com/f-tiger/agi-site/actions/workflows/deploy-baipiaoji.yml) runs the new unit/browser tests before deployment and `verify-deck-live.mjs` afterwards. The live verifier compares shipped asset hashes to the release, checks both languages, homepage/studio/search/discovery entries, native export library/attribution availability, member catalog and public checkout readiness. Its JSON log is the authoritative deployment evidence; local checks alone do not establish that production is live.

## Distribution and measurement

Owned-channel placement: homepage product entry, studio feature row, site search, discover/MCP page map, bilingual guide and three fictional examples. All are part of the deployed build. No external post, personal message, advertising buy or recurring task was created.

Existing first-party `calc` event paths begin `/studio/proposal-deck/`. Actions distinguish new projects, examples, AI brief copies/imports, PPTX exports, notes, backups, local saves, member opens, cloud handoffs, acknowledged saves and restores. The suffix is `demo` or `own`; `own` means edited content, not a verified human/client. QA suppresses events. Client text, files, AI brief and names are never placed in event paths.

Membership checkout attribution uses product `bpj-proposal-deck` in the existing order-source table. A checkout click or quote is not payment; an acknowledged save is not a new subscriber. Real revenue requires a separately verified paid order. The present release establishes instrumentation and a working tested path, not demand or revenue.

Remaining uncertainty: repeat use and willingness to pay, especially because Gamma and existing templates offer strong free alternatives. See product-marketing.md for explicit future evidence gates. Do not claim success from stars, synthetic accounts, downloads or a successful deployment.
