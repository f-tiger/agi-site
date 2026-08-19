# agi-site — one public monorepo, N sites

Public monorepo for the site fleet (owner decision 2026-08-19). Public repos get
free GitHub Actions minutes, which ends the account-wide 2,000 min/month problem
that froze every private-repo schedule on 2026-08-18.

| Site | Directory | Deploys to | Status |
|---|---|---|---|
| agiscorecard.com | `sites/agiscorecard/` | Cloudflare Worker `agiscorecard` | **live from this repo** |
| baipiaoji.com | `sites/baipiaoji/` | Cloudflare (see its CLAUDE.md) | importing |
| getecoback.com | `sites/getecoback/` | Cloudflare Worker | importing |
| thedollscout.com | `sites/thedollscout/` | Cloudflare Pages | importing |

Each site keeps its own `CLAUDE.md`, tooling and conventions inside its
directory. Root workflows are path-filtered: a commit only deploys the site it
touches. History note: each site was imported as a fresh snapshot; pre-import
history lives in the original private repos (`f-tiger/agiscorecard`,
`f-tiger/aitools`, `f-tiger/rearchfuture`, `f-tiger/sexweb`), which are archives
now — do not push site content there.

Privacy rule for this PUBLIC repo: no owner personal archive
(owner-identity*/owner-trajectory*), no subscriber addresses, no tokens/keys.
See `CLAUDE.md`.
