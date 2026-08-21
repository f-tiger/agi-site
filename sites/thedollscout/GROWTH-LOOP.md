# The growth loop

A scheduled Claude session runs against this repository every two days. This
file is the playbook it follows. The trigger prompt is deliberately short and
points here, so the logic is version-controlled and reviewable rather than
buried in a scheduler.

**Goal: first affiliate sale within 180 days of 2026-07-26 — by 2027-01-22.**

---

## STRATEGY PIVOT (2026-08-19, owner-authorized: "站点的内容、形式、定位都可以变化,目标是营收")

Deep-research verdict (105-agent verified run, fleet doc `docs/fleet-deep-dive-2026-08.md`
in the repo root; sibling-traffic comparison corrected 2026-08-20 — the whole fleet
sits on the same 5-17 humans/day infant curve, so age-peers prove little either way).
What stands is the economics: this niche's order value is hundreds to thousands of
dollars and AI engines already cite the site daily, so conversion per visitor — not
traffic — is the lever. The pivot:

**From "content site waiting for traffic" to "high-ticket affiliate decision pages
fed by AI citations."** The pages AI engines already cite daily (scam-check,
height-weight, the datasets) must carry the purchase decision on the first screen:
comparison table, vendor verdicts with affiliate deep links, and the scam-check
tool — because an AI-referred visitor converts at 2–23x an organic one (Ahrefs
first-party data) and this niche's order value is hundreds to thousands of dollars.
Waiting for generic traffic is the one strategy the data rules out.

Site-owned trigger (2026-08-20): fleet-trends.yml commits
content/trends-us.json daily (US trending searches x niche keyword map). Read
it each run; a niche term trending = demand spike = prioritize freshness +
conversion hooks on the matching cited page that day. ok:false three days
running goes in the report. Most days it matches nothing — that is the trigger
working, not failing.

Factory-photo spec: RESOLVED 2026-08-21 by upgrading the existing
`guides/factory-photos.html` in place (four-photo request list + copy-paste
message) — a new page would have been a near-duplicate. Decision line (60 days,
≥10 AI crawls or top-5 landing) now attaches to that page; details in
`content/prd-factory-photo-checklist.md`.

What this changes for each run: prioritize conversion-hook work on CITED pages over
new search-surface pages. What it does NOT change: every guardrail in section 4
(sourcing, no fabricated social proof, 18+ gate, childlike-appearance refusal,
affiliate disclosure) and the D1 two-line measurement discipline. First checkpoint:
D1 `affiliate_click` ≥1 within 28 days of the first hooked page shipping.

## 1. The target ladder

"Get a sale" is not actionable. This is:

| Link in the chain | What it takes | How to check |
|---|---|---|
| First sale | ~50–200 affiliate clicks, cumulative | Vendor affiliate dashboard (owner only) |
| 50–200 affiliate clicks | ~4,000–6,000 cumulative sessions at a 3–5% click-out rate | GA4 `affiliate_click` count |
| 4,000–6,000 sessions over 180 days | ~25–35 sessions/day average | GA4 sessions |
| Any sessions at all | Pages indexed, and something linking to them | GSC coverage; referral traffic in GA4 |

High-ticket affiliate conversion runs roughly 0.5–2%, which is where the
50–200 figure comes from. Treat it as an order of magnitude, not a promise.

**The diagnostic value of the ladder is that it localises failure.** Traffic
but no clicks is a page problem. Clicks but no sale is a vendor or intent
problem. No traffic is a discovery problem. Each has a different fix, and
guessing which one you have is how effort gets wasted.

## 2. Which phase are you in?

Read `content/growth-log.md` first — it records what previous runs did and
what phase they judged the site to be in. Then decide from evidence, not from
the previous run's guess:

### Phase A — Pre-traffic (expected weeks 0–8)

**Signal:** fewer than ~50 sessions in the trailing 14 days, or no GA4 data.

A new domain with no backlinks does not rank, no matter how clean the
technical work is. GA4-driven optimisation in this phase is fabrication —
there is nothing to optimise against.

**Do in this phase:**
- Expand search surface. New pages targeting real query intents are the only
  thing that compounds here. Additive work, never rewrites.
- Deepen GEO. Answer-first structure, self-contained quotable statements,
  schema coverage. AI citation does not require domain authority the way
  Google ranking does, which makes it the faster channel from a standing start.
- Verify the technical floor still holds (`node scripts/seo-audit.mjs`).
- Check the facts that decay: import rules, vendor programme terms, prices
  quoted on the site.

**Do NOT in this phase:** rewrite headlines "to improve conversion", reorder
CTAs, or A/B anything. There is no data. Changing things without data destroys
the baseline you will need later.

### Phase B — Early traffic (roughly 50–500 sessions / 14 days)

**Signal:** GA4 shows real sessions and at least a few `affiliate_click`s, or
GSC shows impressions.

Now the data says something. Read it before acting:
- Which landing pages get sessions, and which of those produce
  `affiliate_click`? Rate matters, not volume. A page with a tenth of the
  traffic and five times the click-out rate is the one to build around.
- `affiliate_click.location` — does the vendor bestsellers strip earn its
  place at the top of the home page, or does the editorial content earn?
- Which tool completes most often (`quiz_completed`, `scamcheck_scored`,
  `calculator_used`, `checklist_printed`)? That is the real hook; give it more
  entry points.
- GSC queries with impressions but no clicks: the page ranks and the snippet
  fails. That is a title and description problem, and it is the cheapest win
  available at this stage.

### Phase C — Optimisation (500+ sessions / 14 days)

Conversion work becomes legitimate. Change one thing at a time, record it in
the log with the date, and compare the following period. Without that
discipline the loop is just churn wearing a lab coat.

## 3. What each run does

1. **Read state.** `content/growth-log.md`, then this file.
2. **Pull data — three sources, and they answer different questions.** All
   three are refreshed daily by `.github/workflows/traffic.yml` and committed
   to `content/`, so read the files first; run the scripts only for fresher
   numbers than the last commit.
   - `content/traffic.json` — edge-measured by Cloudflare, no credentials
     needed. It counts requests before any browser or network can suppress
     them, so **a zero here means genuinely nobody arrived**. It includes
     crawlers, which on a new site is most of it, so read it as a floor rather
     than as humans. `byIpType.clean` is the *ceiling* on human requests.
   - `content/gsc.json` (`scripts/gsc-report.mjs`) — **the leading indicator.**
     Impressions show which queries the site surfaces for before anyone
     clicks; a query gaining impressions is the earliest actionable signal
     this loop gets, and content decisions should key off it. Window ends 3
     days back on purpose — fresher GSC rows are provisional.
   - `content/ga4.json` (`scripts/ga4-report.mjs`) — behaviour and events, but
     only from visitors whose browser and network can reach Google. If either
     script reports missing credentials, say so in the log; do not invent
     numbers, and do not describe the data as unavailable by nature when it is
     unavailable by configuration.

   When the two disagree — edge traffic present, GA4 empty — the difference is
   blocking, not absence. Trust the edge number for "is anyone here" and GA4
   only for "what did they do".
3. **Run the technical audit.** `npm i -D playwright && node scripts/seo-audit.mjs`.
   Fix anything it flags. This is the floor, not the work.
4. **Decide the phase** from the evidence above.
5. **Do the highest-leverage thing for that phase.** One or two substantial
   items, finished properly. Not six half-finished ones.
6. **Verify.** Audit clean, no broken links, browser-check anything
   interactive.
7. **Append to the log** (format below). Commit and push. The deploy workflow
   handles the rest.

### What the scheduled session does and does not have

It runs headless, so **no MCP connectors are available** — there are no
`mcp__github__*` tools. Do not go looking for them. Plain `git` works
normally (push over the session's git proxy), and the deploy workflow runs
itself on push, so nothing is lost; you simply cannot query the Actions API to
watch the deploy finish. If you need to confirm a deploy, check that the push
succeeded and move on.

Playwright is not installed by default. `npm i -D playwright` when you need it;
chromium is already on disk at `/opt/pw-browsers/chromium`, so pass it as
`executablePath` rather than downloading a browser. `package.json` and the
lockfile are gitignored, so the install leaves nothing behind.

## 4. Guardrails — these override any optimisation goal

The site's only asset is that it can be trusted. An automated loop is exactly
the mechanism that would erode that quietly, so:

- **Never post to Reddit, forums or any community.** Not once, not "carefully".
  It is spam, it gets the domain blacklisted, and it contradicts the site's
  entire position. Community participation is the owner's job, as a human.
- **Never publish a legal, safety or factual claim that could not be sourced.**
  Say "we could not confirm" and move on. Several pages were deliberately
  withheld on these grounds; do not quietly reverse those decisions.
- **Never fabricate proof.** No invented testimonials, review counts, user
  numbers, or "trusted by" claims. There are no customers yet and the site
  says so.
- **Never remove or weaken** the 18+ gate, the affiliate disclosure, the
  `rel="sponsored nofollow noopener"` on affiliate links, or the childlike-
  appearance refusal.
- **Never make the site claim something the code does not do.** The newsletter
  form once said "you're on the list" while discarding the address; that class
  of bug is the worst thing that can happen here.
- **Prefer doing nothing to doing something pointless.** A run that reads the
  data, finds no warranted change, and logs "no action, here is why" is a
  successful run. Churn is a real cost: it destroys baselines and burns the
  owner's review attention.

## 5. Log format

Append to `content/growth-log.md`, newest at the bottom:

```markdown
## Run YYYY-MM-DD

**Data:** sessions (14d), affiliate_click (14d), top landing page, or
"GA4 credentials not configured".
**Phase:** A / B / C, and the evidence for it.
**Did:** what changed, and why that was the highest-leverage thing.
**Did not:** anything considered and rejected, with the reason.
**Blocked on owner:** anything only the owner can do, or "nothing".
```

Keep entries short. The log is read at the start of every future run, so
bloat there is a compounding cost.

## 6. Standing items only the owner can clear

Re-state these in the log each run until done, because the loop cannot do them
and they gate everything downstream:

- **GA4 credentials** for `scripts/ga4-report.mjs` (see that file's header).
  Until this exists the loop is flying on on-site evidence alone.
- **GA4 custom dimensions** registered: `location`, `vendor`, `result`, `band`,
  `material`, `region`, `network`. Unregistered parameters are invisible in
  reporting and registration is not retroactive.
- **Email provider** connected via `newsletterAction` in `js/config.js`. The
  five-email sequence is written and waiting in `content/email-sequence.md`.
- **Community participation.** Three to five genuine, link-free answers a week
  in owner communities. This is the single highest-leverage input to the whole
  model and it is the one thing that must not be automated.
- **A second vetted vendor.** One cash-commission vendor is a single point of
  failure between the site and all of its revenue.
