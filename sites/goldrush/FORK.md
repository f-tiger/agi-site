# Fork this ledger — 10 minutes to your own

The AI Gold Rush Ledger is MIT-licensed and designed to be copied. The durable
invention of the web3 era was not tokens — it was fork culture. Keep the method,
change the niche.

## What you get
- A single-page evidence ledger (`site/index.html`) + machine-readable `site/ledger.json` (CC BY 4.0)
- A Cloudflare Worker (`worker.js`) that serves the site and counts pageviews +
  whitelisted events server-side into your own D1 (works for JS-off readers and AI crawlers)
- A deploy pipeline (copy `.github/workflows/deploy-goldrush.yml` from the monorepo root)
- The Evolution Protocol (`EVOLUTION.md`) — the editorial loop that keeps it alive
- The governance template (`OWNER-CONTROL.md`) — kill switch included

## Steps
1. Copy the `sites/goldrush/` directory into your own repo (or fork the monorepo).
2. Create a Cloudflare D1 database; put its id in `wrangler.jsonc` (`d1_databases`),
   and create the table:
   `CREATE TABLE ev (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT, ts TEXT, name TEXT, label TEXT, value INTEGER, path TEXT, ref TEXT, ua_class TEXT, country TEXT);`
3. Change `name` and `routes` in `wrangler.jsonc` to your own worker name and domain
   (or delete `routes` to use the free workers.dev URL).
4. Rewrite `site/ledger.json` and the table in `site/index.html` for YOUR niche —
   crypto claims, health claims, local scams, whatever you can source honestly.
5. `npx wrangler deploy` (or wire the GitHub Action with `CLOUDFLARE_API_TOKEN`
   and `CLOUDFLARE_ACCOUNT_ID` secrets).

## The three rules that make it worth forking
If you keep nothing else, keep these — they are the product:
1. **Every claim gets an evidence tier** (verified / reported / self-reported),
   a **dated verdict**, and a **written flip condition**.
2. **Misses stay on the ledger.** The day you delete a wrong call, the whole
   thing becomes another hype site.
3. **No payment ever changes a verdict**, and no tokens, ever.

## Attribution
MIT means you owe nothing. A link back ("method from goldrush.agiscorecard.com")
is appreciated and helps every fork's credibility — the more honest ledgers exist,
the more each one is believed.
