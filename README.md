# agi-site — one public monorepo, N sites

Public monorepo for the site fleet (owner decision 2026-08-19). Public repos get
free GitHub Actions minutes, which ends the account-wide 2,000 min/month problem
that froze every private-repo schedule on 2026-08-18.

| Site | Directory | Deploys to | Status |
|---|---|---|---|
| agiscorecard.com | `sites/agiscorecard/` | Cloudflare Worker `agiscorecard` | **live from this repo** (2026-08-19, deploy green) |
| baipiaoji.com | `sites/baipiaoji/` | Cloudflare Pages `aiyangmao` | **live from this repo** (2026-08-19, deploy green) |
| getecoback.com | `sites/getecoback/` | Cloudflare Worker | **live from this repo** (2026-08-19, deploy green) |
| thedollscout.com | `sites/thedollscout/` | Cloudflare Pages `dollscout` | **live from this repo** (2026-08-19, deploy green) |

Each site keeps its own `CLAUDE.md`, tooling and conventions inside its
directory. Root workflows are path-filtered: a commit only deploys the site it
touches. History note: each site was imported as a fresh snapshot; pre-import
history lives in the original private repos (`f-tiger/agiscorecard`,
`f-tiger/aitools`, `f-tiger/rearchfuture`, `f-tiger/sexweb`), which are archives
now — do not push site content there.

Privacy rule for this PUBLIC repo: no owner personal archive
(owner-identity*/owner-trajectory*), no subscriber addresses, no tokens/keys.
See `CLAUDE.md`.

## Owner TODO (one-time, optional but recommended)

1. Cloudflare dashboard → Workers `agiscorecard` → disconnect the old git
   integration to `f-tiger/agiscorecard` (that repo is archived; a stray push
   there would roll the site back). Until then: simply never push there.
2. Extra repo secrets to unlock the three still-commented schedules:
   - `tds-crawl-log.yml` / `tds-traffic.yml`: `CLOUDFLARE_API_TOKEN_ZONE`,
     `CF_API_TOKEN`, `GA4_PROPERTY_ID_TDS`, `GA4_SERVICE_ACCOUNT_JSON`
   - `bpj-growth-loop.yml`: `GA4_PROPERTY_ID_BPJ`, `GA4_SERVICE_ACCOUNT_JSON`
   - optional senders: `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (tds grow notify),
     `RESEND_API_KEY`/`SUPABASE_SERVICE_KEY` (eco heat-alert real sends),
     `MCP_REGISTRY_PRIVATE_KEY` (tds registry proof)
   Copy the values from the old private repos' Settings → Secrets (names unchanged).
