# Site-specific membership entrances — 2026-09-19

Owner requested that each of the four sites have its own membership entrance to avoid an unexplained jump to a different brand/domain. This is a presentation and navigation change, not a split of accounts, rights or payment rails.

## Published routes

| Site | Local membership entrances |
| --- | --- |
| BPJ | https://baipiaoji.com/members · /en/members · /de/members · /it/members |
| AGI Scorecard | https://agiscorecard.com/members · /zh/members |
| EcoBack | https://getecoback.com/members.html · /en/members.html · /it/members.html |
| The Doll Scout | https://thedollscout.com/members · /de/members |

All tool and workbench membership links first use their own site's domain. Discovery blocks on existing home/context pages also include the local entry. Each introduction uses its site's name and accent color, localized plan terms, relevant tools, and explicit shared-membership wording. Canonicals, reciprocal language links and sitemap entries use the local domain.

Payment and cloud management remain at BPJ. The local page clearly names BPJ and baipiaoji.com before the user chooses to continue. The portal retains the source brand, language-aware return link and link to the site's membership introduction. Existing members use the same access key without buying again. Prices, quotas, billing logic and wallet configuration were not changed.

## Data and navigation controls

- Source sites and product IDs are allowlisted against the existing catalog; arbitrary return URLs and mismatched site/product pairs are ignored.
- No access key or tool payload is placed in a URL.
- Cloud-save opens the local introduction first. Only after the user continues does the original tool send its snapshot to that exact popup window on the exact BPJ origin.
- The original tool tab must remain open for this transfer. The listener is removed on popup close, successful transfer, or after 30 minutes.
- Upload still requires a separate Save action in the portal.
- Static introductions and their checkout links remain usable without JavaScript; preserving a specific tool's context requires JavaScript.
- All four deploy workflows now watch shared membership files to keep plan copy aligned.

## Verification

- Seven sibling-site language entries verified in browser tests, including mobile width, own-domain language navigation, explicit checkout handoff and retained source context after portal language changes.
- Four-language member login/save/export and cross-site restoration passed with the existing local paid fixture; SQL and puzzle restore paths passed.
- Hostile source/return parameters and a mismatched site/product pair produced only allowlisted return links.
- All 51 localized tool browser flows and four standalone embeds passed.
- Static site verification passed on all four sites. Production verification checks local membership links, canonical/hreflang/sitemap entries and assets.
- Production BPJ membership verification passed: four languages, assets, checkout readiness and unauthorized protected endpoint rejection. No production payment or paid grant was created.

## Deployment notes

Implementation: 0cc9447faffad288e717707dcf90f395406a2e35.

The first BPJ deployment was blocked by an existing flaky test that assumed the first concurrent request would receive the first amount suffix. Fix 39b0bc64ea52776f2a3e8905451dd1feb40f09e6 checks the entire expected allocation set and every amount conversion without relying on completion order; 18 Web3 tests passed. Production payment code was not changed.

The first TDS live check caught a briefly stale workbench page immediately after deployment. The same strict verifier passed on subsequent read-only production verification. Fix 01124cd141040502f4732eab620f27216408f694 adds the same bounded strict-verification retry already used by AGI; persistent mismatches still fail.

Deployment runs:
- AGI: https://github.com/f-tiger/agi-site/actions/runs/35453696977
- EcoBack: https://github.com/f-tiger/agi-site/actions/runs/35453696940
- BPJ (after test fix): https://github.com/f-tiger/agi-site/actions/runs/35453797339
- TDS (after retry fix): https://github.com/f-tiger/agi-site/actions/runs/35453884554

This change does not establish improved conversion or revenue; those require actual user and payment evidence.
