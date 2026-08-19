# Growth log

Appended to by the scheduled growth loop, newest at the bottom. Read this
first — every run starts with no memory of the previous one, and this file is
the only thing preventing run N from redoing run 1's work.

Format and rules: `GROWTH-LOOP.md`.

---

## Run 2026-07-26 (seed entry, written by hand when the loop was set up)

**Data:** GA4 (`G-2SEHFY33H8`) went live today. No credentials configured for
`scripts/ga4-report.mjs`, so no programmatic data. No meaningful traffic
expected yet regardless — the property is hours old.

**Phase:** A (pre-traffic). Domain registered days ago, Search Console verified
today, zero backlinks. Nothing to optimise against.

**Did (in the sessions leading up to this):**
- Cookieless GA4 with eight events, including `affiliate_click` bucketed by
  page position — the only event that maps to revenue.
- Affiliate links added to all six guides, the Scam-Check and the checklist.
  Those pages previously carried none, so every organic visitor landed on a
  dead end.
- Full technical SEO pass: 28 over-long titles rewritten, internal links
  rebalanced (`import-costs-2026` from 2 inbound to 17; Asian country pages
  from 1 to 4–6), crawlable content added to the two flagship tools (quiz 97 →
  743 words, calculator 181 → 774).
- GEO: `robots.txt` explicitly welcomes AI crawlers, generated `llms.txt`,
  schema dates added site-wide, `faq.html` published (14 questions, 1,736
  words), FAQPage schema on the quiz.
- Fixed: sitemap was submitting a marketing-skill template file to Google at
  priority 1.0, and the deploy was publishing `MARKETING.md` and `ANALYTICS.md`
  to the live site.
- Fixed: the newsletter form told visitors "you're on the list" while
  discarding the address. It now says the list is not open.

**Did not:** any conversion optimisation. There is no data, and changing pages
now would destroy the baseline needed to read the first real numbers.

**Blocked on owner:**
- GA4 credentials for `scripts/ga4-report.mjs` (setup in that file's header)
- GA4 custom dimensions registered — not retroactive, do it before data accrues
- URL Inspection → Request Indexing on `/`, `/scam-check.html`, `/faq.html`,
  `/guides/import-costs-2026.html`
- Email provider connected (`newsletterAction`); sequence written and waiting
- Community participation — 3–5 genuine link-free answers a week
- A second vetted vendor

---

## Run 2026-07-27 (hand-written — measurement debugging, not a loop run)

**Data:** GA4 is now recording. Confirmed by the owner.

**What was wrong:** the property showed "no data received" since launch, and it
was a defect in the shipped configuration, not an absence of visitors.
`analytics_storage` was set to `denied` in the consent defaults, which puts GA4
into consent mode — hits are sent as cookieless modelling pings that never
reach the standard reports, and modelling only produces numbers above traffic
thresholds this site is nowhere near. The property would have stayed empty
permanently regardless of how many people visited.

Setting it to `granted` fixed it. The no-cookie promise is unaffected:
`client_storage: 'none'` is what governs storage, and a browser check confirms
zero cookies are set. `js/analytics.js` and `ANALYTICS.md` both carry a warning
not to tighten it back, because `denied` genuinely reads like the safer choice
while silently costing all measurement.

**Also built while diagnosing:**
- `/ga-check.html` — an unlisted, noindex diagnostic that runs five checks in
  the visitor's own browser and names the cause. Useful whenever the property
  looks empty again, because it distinguishes "nobody came" from "hits blocked",
  which GA4 itself cannot.
- `scripts/cf-analytics.mjs` + `.github/workflows/traffic.yml` — edge-measured
  traffic from Cloudflare, immune to ad blockers and network-level blocking of
  Google, committed daily to `content/traffic.json` so this loop has a traffic
  number that does not depend on GA4 credentials. **Currently blocked**: the
  API token lacks `Zone → Analytics → Read`.
- Fixed a leak where `fetch-photos.yml` still carried the old rsync exclusions
  and would have republished the internal markdown every Monday. Both workflows
  now share `scripts/assemble-dist.sh`.

**Blocked on owner, in priority order:**
1. **GA4 custom dimensions** — `location`, `vendor`, `result`, `band`,
   `material`, `region`, `network`. **Not retroactive.** Every day these stay
   unregistered is a day of events whose breakdowns can never be recovered, and
   `location` is the one that decides whether the bestsellers strip or the
   editorial content earns. This is now the most time-sensitive item on the list.
2. Mark `affiliate_click`, `email_submitted`, `quiz_completed` as key events.
3. Add `Zone → Analytics → Read` to the Cloudflare API token so the edge
   traffic pipeline can run.
4. Email provider (`newsletterAction`); the sequence is written and waiting.
5. Community participation — still the highest-leverage input to the whole model.
6. A second vetted vendor.

## Run 2026-07-27 later (hand-written — content expansion, not a loop run)

**Data:** GA4 recording (confirmed by owner). Cloudflare edge pipeline still
blocked on the token permission. No meaningful traffic yet — Phase A holds.

**Did:**
- Published `/guides/torso-vs-full-size.html` (1,050 words, Article + FAQPage)
  and `/guides/glossary.html` (941 words, Article + DefinedTermSet). Chosen by
  content-strategy scoring, not instinct; both cross-linked from the hub, the
  FAQ, tpe-vs-silicone and scam-check. Site is now 32 pages.
- Built the height/weight data pipeline (`scripts/fetch-specs.mjs` +
  fetch-specs.yml, manual trigger). Run 1: 0 rows (scraper read an empty
  element). Run 2: 14 rows — data IS obtainable — and exposed three defects,
  all fixed: a safety hole where "Head #NN" in a title bypassed the sub-140cm
  guard, a commit step blind to untracked files (traffic.yml had it too), and
  decimal heights mis-parsed. Run 3 in progress across height bands.

**Do NOT redo:** the weight-table page itself is still unwritten, deliberately.
Gate: review content/doll-specs.json spread first; same-height rows differ 2×
(43lb vs 94lb at ~150cm) and until that is explained (cup size? shipping
weight?) publishing a table would be guesswork wearing a spreadsheet.

**Blocked on owner:** unchanged from previous entry — dimensions registration
is still the time-sensitive one.

## Run 2026-07-27 evening (hand-written — the weight chart shipped)

**Data pipeline:** run 4 landed 43 rows (34 full-body, 140–173cm across all
bands; 9 partial). Quality verdict: honest — repeated models returned identical
figures every time (63lb ×4, 73lb ×5, 111lb ×3), and the 2× same-height spread
is explained by build/cup, which became the page's actual finding. Run 3 had
collected the same data and lost it to a non-fast-forward push on an ephemeral
runner; all three bot workflows now rebase before pushing.

**Published `/guides/height-weight.html`** (953 words, Article + Dataset +
FAQPage, 3 tables): band ranges, deduped real listings, torso 5× range, method
and exclusions section. Headline finding, supported by the data: height barely
predicts weight — build does; a slim 151cm doll (43lb) was lighter than every
140cm doll found.

**Site-wide correction:** we had claimed "torsos: 5–30 lb" in seven files. The
data showed large 140cm-class torsos at 62–65lb and small ones starting at
13lb. All seven amended (visible text AND schema copies), and the chart page
says openly that we corrected our own number. Site is 33 pages.

**Known scraper debt (minor):** material detection returns "hybrid?" for
everything because page text mentions both materials in navigation; derive from
title if it ever matters. Not blocking.

**Blocked on owner:** unchanged — custom dimensions registration remains the
time-sensitive item.

## Run 2026-07-27 night (hand-written — customer research applied)

**Method:** WebSearch/WebFetch voice-of-customer pass. **Reddit is blocked to
our crawler** (403 by policy) — do not retry it; use Trustpilot, BBB and review
aggregators instead, which are reachable and attributable.

**Findings applied:**
1. **Published criticism of our own vendor** on `/picks.html` — ratings diverge
   sharply (Trustpilot ~4.0/214, Knoji 2.8/54, BBB unaccredited with complaints
   recorded unanswered; we could NOT load BBB directly and say so on the page).
   Recurring themes: listing photos overstating reality, arrival defects, and
   weak responsiveness after a complaint — which partly fails our own criterion
   6. Kept the listing, published the reasoning, linked the sources.
2. **Four post-payment traps added to the Scam-Check** — shipping-origin
   deception, duty collected but not remitted, restocking fees on unbuilt
   made-to-order items, unrequested freight upcharges. Each with the question
   that defuses it. These are invisible from a product page, which is why a
   listing-inspection checklist missed them.
3. **Quantified the maintenance burden** — ~15–30 min per use. The material
   decision rule asked for commitment without ever pricing it in minutes.

**Severe bug found and fixed:** `wireAffiliateLinks()` matched
`href*="yourdoll.com"` as a substring, so `trustpilot.com/review/yourdoll.com`
— our own "check it yourself" evidence link — was rewritten into a
commission-bearing link to the vendor's shop. Host comparison is now exact.
Any future evidence link naming a vendor would have been hijacked the same way.

**Blocked on owner:** unchanged; GA4 custom dimensions still the time-sensitive one.

## Run 2026-07-28 (hand-written — needs research, no GA4 data)

**Data: none.** GA4 credentials are still unset, so `scripts/ga4-report.mjs`
returns "not configured" — there was no GA4 analysis this round and none was
fabricated. Cloudflare edge is still blocked on the token's missing
`Zone → Analytics → Read`. Both remain owner-side.

**Installed 65 skills globally** (~/.claude/skills): Affitor/affiliate-skills
51, ZeroPointRepo/youtube-skills 12, mvanhorn/last30days 1. Reviewed before
installing; scan clean. **Global installs do not survive this container** —
project `.claude/skills/` is the persistent path if that matters later.
`last30days` cannot run here: its first-run wizard needs browser cookies and
yt-dlp, so it degrades to WebSearch-only. Do not retry it in this environment.

**Channel correction:** YouTube was previously lumped in with "ads banned".
Wrong — ads being banned bans *placement*, not *content*, and the niche has an
active reviewer ecosystem (AllYourDolls, DollLab, multiple unboxing playlists).
Built `/for-creators.html` so those creators can cite us: copy-paste YouTube
descriptions, forum replies, embeddable checklist, **no affiliate links in any
snippet and no attribution required** — verified by parsing each URL's query
params, not substring matching.

**Published `/guides/disposal.html`** (913 words, Article + FAQPage, zero
vendor links). Found by researching what buyers ask that we never answered: how
the ownership *ends*. Discarded dolls repeatedly trigger homicide
investigations — Warwickshire road closed 31 hours with a forensic pathologist;
Ohio coroner called; Texas and Japan cases — all from independent news
reporting, cited on the page. This answers the reversibility objection that
blocks purchases, and it finally explains an assertion the torso page had been
making without support.

**Do NOT redo:** the disposal page's unverifiable parts are marked as such —
no named vendor take-back programme was confirmed. If one is ever confirmed in
writing, add it there.

**Blocked on owner (ranked):** GA4 custom dimensions (still not retroactive),
GA4 service account, email provider, community participation, second vetted
vendor. **Cloudflare Zone→Analytics→Read is done** — see below.

### Cloudflare analytics — narrowed to one exact permission (2026-07-28, run 30378943660)

The owner rotated a token and the re-run failed with the byte-identical error,
which read as "the permission still isn't set". It was not that: the script
preferred `CLOUDFLARE_API_TOKEN_ZONE` and never read the rotated secret. It now
tries every token secret and prints the token id Cloudflare says each one is,
so that failure mode cannot recur. Both tokens have now been tested end to end:

| Secret | Token id | Zone visible | Analytics read |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN_ZONE` | `04b24a313b353edbc1c45d6e0bddf2fe` | yes | **no** |
| `CLOUDFLARE_API_TOKEN` | `dfa4e363b45bad059635c4923d84c4cd` | yes | **no** |

Both reach the zone and both are refused at the GraphQL step, so the only thing
missing is `com.cloudflare.api.account.zone.analytics.read` — the **Zone →
Analytics → Read** row. Editing an existing token's permissions does not change
its secret string, so the GitHub secret does not need re-pasting; only a
brand-new token would. The likely misstep is picking **Account → Account
Analytics → Read**, which is a different permission and will not satisfy this.

**RESOLVED same day.** The owner added Zone → Analytics → Read to
`CLOUDFLARE_API_TOKEN_ZONE` and the feed now works. `content/traffic.json` is
live and the daily 06:00 UTC job maintains it. **Cloudflare is no longer a
blocker — remove it from the ranked list.**

### First edge-measured numbers (2026-07-26 → 27, the zone's whole history)

| Date | Requests | Page views | Unique IPs |
|---|---|---|---|
| 2026-07-26 | 1,277 | 449 | 326 |
| 2026-07-27 | 4,145 | 478 | 322 |

**Do not read 322 as 322 people.** The breakdown says otherwise, and the
headline figure alone would have been read exactly that way — which is why the
query now asks for it:

- **27 Jul was a vulnerability scanner, not an audience.** 2,209 of 4,145
  requests (53%) were 404s and 3,879 (94%) came from IPs Cloudflare has no
  record of, concentrated in NL (1,613) — datacenter hosting, not readers.
  Requests tripled while **page views stayed flat (449 → 478)**. Nothing was
  being read; paths that never existed were being probed.
- **26 Jul carries the one genuinely good signal:** 545 requests (43%)
  classified `searchEngine`. Search engines are crawling the site. GSC
  verification and the IndexNow pushes are working — that was the open
  question and it is now answered.
- **Human traffic remains indeterminate and small.** It hides inside
  `noRecord`/`unknown` along with unclassified bots. The edge cannot separate
  them; GA4 can, and GA4 is now collecting. **Reconcile the two next run** —
  where the edge says "someone arrived" and GA4 says nothing, the difference is
  blocked or bot.

**Do not compare this to the 25–35 sessions/day target.** That ladder is in
human sessions; this is unique IPs including crawlers. They are different units
and putting them side by side would manufacture a success that has not happened.

**Note for later, not now:** the scanner noise inflates the baseline that
growth gets measured against. If it persists, Cloudflare Bot Fight Mode would
strip it — but it also risks blocking the AI crawlers `robots.txt` deliberately
invites, which is a channel this site is betting on. Not worth touching until
the noise is shown to be recurring rather than a one-off sweep.


### GA4 read directly, and it settles the traffic question (2026-07-28)

The owner pointed out GA4 was already reachable through the connected
Supermetrics MCP. It was — property `547130808` under `thedollscout`,
authenticated. No service account needed to *read* it in a session.

**GA4's entire recorded history, all dates:**

| Date | Sessions | Users | Views | Events | Engaged sessions |
|---|---|---|---|---|---|
| 2026-07-27 | 3 | 1 | 3 | 14 | **0** |

Nothing before, nothing on the 28th. And the detail identifies that one user:
pages were `/ga-check` ×2 and `/` ×1, source `(direct)/(none)`, and the events
include `self_check` ×2 — the event only the diagnostic page fires.

**That single user is our own test session. GA4 has never recorded a real
visitor.**

**Reconciled against the edge for the same day (27 Jul):**

| | Edge (Cloudflare) | GA4 |
|---|---|---|
| Page views | 478 | 3 |
| Visitors | 322 unique IPs | 1 user |

Of ~478 edge page views, GA4 saw 3, and all 3 were the self-test. Two
independent methods now agree, having failed differently: the edge said 94%
`noRecord` and 53% 404s; GA4 says almost nobody executes JavaScript. **Human
traffic is not "small and indeterminate" as recorded earlier in this file — it
is effectively zero, and that is now measured rather than assumed.** This is
the expected state for a site whose first crawl was two days ago. It is not a
problem to fix; it is the baseline the loop measures from.

**Corollary that matters for Phase A:** conversion optimisation still has
nothing to optimise. Do not touch headlines or CTAs. The binding constraint is
distribution, not the pages.

**What this does and does not unblock:**
- **Does:** GA4 analysis inside a session, from now on, with no credentials.
- **Does NOT:** the scheduled loop. It runs in GitHub Actions, which has no
  MCP connection — `scripts/ga4-report.mjs` still needs
  `GA4_SERVICE_ACCOUNT_JSON`. `GA4_PROPERTY_ID` is now known: **547130808**
  (the numeric property, not the `G-` measurement ID).
- **Custom dimensions still unverifiable from data** — the only events recorded
  are `page_view`/`scroll`/`self_check`. Nothing has fired `affiliate_click`
  yet, because nobody has been here to click. Registering them stays urgent
  precisely because it must happen *before* the first real visitor.

**Newly identified, higher value than anything else on the blocked list:
Google Search Console is NOT connected to Supermetrics** (`GW`,
NOT_AUTHENTICATED). GSC impressions are the only signal that leads traffic —
it shows which queries the site already surfaces for before anyone clicks. With
GA4 at zero, that is the one dataset that could inform content decisions now.
One-click authorisation; the login link was given to the owner.

### Brand-name collision — UNVERIFIED, owner should check in a browser (2026-07-28)

While checking whether the site is indexed yet, searches for our own brand
surfaced **`dollscout.com`** — our domain minus "the". Two claims appeared in
the result summaries, and **neither could be verified**: both scamadviser.com
and dollscout.com returned 403 to the fetcher here.

Claimed, unconfirmed: that Scamadviser gives `dollscout.com` a low trust score
and flags it as very young, and separately that "DollScout" is the name of a
Barbie-collector search tool.

Why it matters enough to record: this site's entire position is anti-scam. If
the near-identical domain really is flagged as a possible scam, then every
brand search for "DollScout" is polluted by it, and the confusion runs in the
worst possible direction for us. **Do not act on this and do not write about it
until it is confirmed in a normal browser** — repeating an unverified scam
accusation about a third party is exactly the behaviour this site criticises.

If confirmed, the response is defensive and cheap: make "thedollscout.com"
unambiguous in title tags and Organization schema so the brand entity resolves
to us. Renaming is not on the table over an unverified search snippet.

**Index status: still unknown.** The `site:` operator was ignored by the search
tool available here (it returned unrelated domains and Wikipedia), so that
query is NOT evidence of non-indexing. A brand query returned nothing of ours,
which is the expected state two days after first crawl. GSC remains the only
authoritative answer.

### GSC connected — the site IS indexed, and it ranks #14 for its own name (2026-07-28)

Second authorisation attempt landed; `sc-domain:thedollscout.com` is readable.
This answers the question the previous entry had to leave open.

| Date | Impressions | Clicks | Avg position | Query | Page |
|---|---|---|---|---|---|
| 2026-07-25 | 0 | 0 | — | — | — |
| 2026-07-26 | 0 | 0 | — | — | — |
| 2026-07-27 | 1 | 0 | 14 | **dollscout** | `/` (IT, mobile) |
| 2026-07-28 | 1 | 0 | 8 | (anonymised) | (RU, mobile) |

**The site is in Google's index and is being served in results.** Two
impressions is nothing in volume, but it is the difference between "not indexed
yet" and "indexed, no demand yet", and those two have completely different
responses. It is the latter. Position also moved 14 → 8 in a day.

**The one query we know is our own brand name, and we are #14 for it.** That
turns the earlier brand-collision note from speculation into a measured
problem — not the unverified scam allegation, which is still unverified, but
the plain fact that thirteen results outrank us for our own name.

**Fixed immediately (the cause was ours):** the homepage — the page Google
serves for that query — was the only page on the site carrying **no
Organization entity**. Ten other pages had one; the homepage had FAQPage alone.
It now emits Organization + WebSite + FAQPage in an `@graph`, with
`alternateName` covering "The Doll Scout" and "thedollscout.com". All JSON-LD
site-wide re-validated after the change.

That is the whole of what can be done from our side. Brand-term ranking is
mostly settled by external references to the name, which is the owner's
community work — no amount of markup substitutes for it.

**Newly found and worth one minute of the owner's time: GSC reports no
submitted sitemap at all** (the sitemaps report returns no rows). The site got
indexed by crawl anyway, but 35 pages are relying on discovery-by-luck when a
submitted sitemap would list them explicitly. Worth eyeballing in the GSC UI to
confirm the report is not simply unavailable for `sc-domain:` properties before
concluding it was never submitted.

**Do NOT redo:** GA4 and GSC are both readable in-session via Supermetrics now.
Query them directly; do not re-derive traffic from search snippets, and do not
use the `site:` operator through the WebSearch tool here — it is ignored and
returns unrelated domains.

## Run 2026-07-29 — deep research pass, and why it mostly failed

**Ran** a 104-agent research workflow to find unmet buyer needs the site does
not cover. **Yield: 2 substantive findings from 48 candidate claims.** The
reason matters more than the findings.

### The methodological failure (read this before running research again)

**Nothing was read first-hand.** This sandbox's network policy rejects CONNECT
to every external host — confirmed against control URLs, and re-confirmed by
hand afterwards (`legislation.gov.uk`, `pubmed`, `springer` all rejected;
`selective: false` in the proxy status). So 21 of 25 verified claims were
killed **for being unretrievable, not for being wrong.**

That is a dangerous failure mode, not merely an unproductive one. Search
snippets still arrive, they read exactly like quotations, and nothing stands
between a plausible paraphrase of a statute and a page asserting it as law.

**Killed for lack of retrieval, and each stronger than what survived:**
- Phthalates measured in sex toys above CPSC children's-toy limits, and no
  risk-assessment regime for the category at all
- HPV DNA still detectable on a toy 24h after cleaning with a commercial
  cleaner, and the authors' statement that no evidence-based cleaning protocol
  exists — this one bears directly on our own care-and-cleaning page
- UK legal exposure running through the **import** route rather than possession
- Korean customs seizing shipments under a general public-morals clause

**Built the fix rather than writing around it:** `scripts/fetch-sources.mjs` +
`fetch-sources.yml` retrieve queued URLs from a runner (runners have egress)
with a real browser, and commit each with a provenance header. Failed fetches
are committed too, flagged loudly — "we tried and got a 403" is a finding, and
dropping it would let the next reader assume the source was checked.
Queue: `content/source-queue.json`, 10 URLs, statute and primary research first.

### Finding 1 — payment recourse after the money has gone (rank 1)

*"I paid a deposit to an overseas vendor for a made-to-order doll, it arrived
wrong / never arrived / they have gone quiet. Who do I complain to?"*

UK s.75 Consumer Credit Act 1974 gives a claim against the **card issuer**, and
the threshold test runs on the **cash price** (over £100, not over £30,000) —
not the amount put on the card. So a deposit on a £1,800 doll is covered for
the full amount. Verified 3-0, but from search extraction only.

Why competitors do not serve it: doll guides treat dispute risk as a
*vendor-selection* problem and stop at "pick a good one". They never say what
recourse survives after payment. Community threads contradict each other
because chargeback is a card-scheme process, not a legal right.

**Qualifications that must ship with any published version:** s.75 needs an
unbroken debtor-creditor-supplier chain, and payment through an intermediary —
including the high-risk processors this category gets pushed onto because
mainstream acquirers refuse adult goods — can defeat it. Debit cards get
chargeback only. Threshold is per single item. That s.75 reaches overseas
suppliers rests on *OFT v Lloyds TSB* [2007] UKHL 48, **unconfirmed here**.
UK only; US/EU/CA/AU equivalents unverified.

### Finding 2 — nobody knows what happens after you buy (rank 2)

*"Is wanting this normal? What do owners regret? What if my partner finds out?"*

The honest answer is that nobody has published a reliable one. Hanson 2024
(peer-reviewed) enumerates six unresolved problems in the field, and owner
samples are recruited almost entirely from doll forums — so no probability-based
owner sample exists. **Calibration:** Hanson says the field is
*methodologically contested*, NOT that findings are unreliable or debunked.
Downstream language must respect that difference.

### DO NOT PUBLISH as fact (explicitly refuted or unconfirmed)

- The "~37% of owners report guilt/shame" figure — not found in the source
  thesis, only in later work citing it
- Any height or size "safe harbour" threshold for adult-form legality. The most
  cited comparative legal source supplies **no such threshold**, so vendor and
  forum claims of the form "over X cm is legal" are unconfirmed. We must not
  repeat them.
- Verbatim quotation of any source in `content/sources/` that came back flagged

### Next step, gated

Read the retrieved sources against the claims. Only then write the PRD and
build. Nothing ships on snippet evidence.

## Run 2026-07-29 later — the verification loop paid for itself

**Built last round, used this round.** `fetch-sources.mjs` retrieved on a runner
what the sandbox cannot reach. Three things came back that changed published
pages, and one of them was a correction to our own advice.

### 1. We were giving incomplete hygiene advice (CORRECTED)

`/guides/care-cleaning.html` framed TPE porosity **purely as a mould risk**.
Anderson et al. 2014 (*Sex Transm Infect*, PMID 24739872), abstract read
first-hand via Europe PMC after `sti.bmj.com` 403'd a browser:

| Material | HPV DNA before clean | Immediately after | **24h after** |
|---|---|---|---|
| Thermoplastic elastomer | 89% (8/9) | 56% (5/9) | **40% (2/5)** |
| Silicone | 67% (6/9) | 44% (4/9) | **none** |

Now on the page, **with its limits at the same volume as the finding**: n=12,
vibrators not dolls, DNA ≠ infectious virus (authors say "supports the potential
for"), one cleaner, 2014, and it concerns *shared* use.

**Practical scope deliberately kept narrow** — if you are the only user it
mostly is not your problem. It bites on shared use and **second-hand purchases**,
and there the authors supply the other half: no evidence-based cleaning protocol
existed at publication and we found none since. Any vendor claiming a method
sterilises TPE can now be asked what it is based on.

**Do NOT escalate this into a scare page.** Overstating is as much a failure as
understating, and the site's credibility depends on both.

### 2. Five country pages were showing readers literal `&lt;strong&gt;`

`content/importing.json` carries inline emphasis; `build-pages.mjs` escaped it.
**The US and UK pages — the two most important — were among the five.** Fixed
with an allowlist restoring six inline tags; `<script>`, event handlers and
attributes verified still inert.

### 3. Payment page upgraded from Citizens Advice

Verified additions: the deposit case in their own worked example (£250 oven,
£50 credit-card deposit + £200 cash → covered); the **single-item trap running
the other way** (£105 order of an £80 phone + £20 headphones + £5 delivery →
NOT covered, nothing over £100 — translated to a separately-priced wig or spare
head); the one-card-provider rule; and **PayPal's 180-day dispute window, which
this site had been asserting unsourced in the FAQ**.

The PayPal/s.75 question is now *sharper* rather than resolved: Citizens Advice
says you "can't usually use Section 75 if you didn't buy directly from the
trader" (eBay), but that is a **marketplace** rule, not a **payment-processor**
rule. Still labelled unconfirmed on the page. Do not collapse the distinction.

### Still unretrieved after two attempts

- **Phthalates paper** (`10.1007/s43591-023-00068-0`) — Europe PMC returns
  **0 hits** for that DOI, and Springer serves an 83-character shell. Not indexed
  there. Needs a different route entirely; do not keep retrying these two.
- Commons Library CBP-10328, and the gov.uk CCA reform collection (404 on both
  URLs tried). Low value now — s.75 was confirmed from the statute directly.

### Verified negative worth keeping

CPS "Obscene Publications" guidance, read in full: it confirms
**"Importing obscene articles, contrary to section 42 Customs Consolidation Act
1876"** as an offence, and that where obscenity is undefined "the ordinary
meaning will apply". It contains **zero occurrences of "doll"**. So the import
route exists in law, but this guidance does not address dolls at all — which is
exactly what `/importing/united-kingdom.html` already says. No change needed;
recorded so nobody re-researches it.

s.170 CEMA 1979 also now read verbatim (knowingly acquiring possession of goods
subject to an import prohibition, with intent to evade it). The UK page's hedge
that it "could not open every primary statute" is now partly overtaken — s.75
and s.170 have both been read.

## Run 2026-07-29 evening — competitor-spy pass; distribution kit built

**Trigger:** owner said it plainly — the site has no users. Correct. The
constraint is distribution, and in this category distribution has four legal
doors: search (working, slow), AI citations (seeded), creator citations, email
(blocked on provider). This run built door three into a copy-paste pack.

**Competitive finding that matters: `dollvendoraudit.com` is a direct
competitor with our exact positioning** — "independent reviews & scam alerts",
vendor scoring on verifiable criteria, affiliate-funded, scores-unaffected
claim. We are not first. What they lack today: statute-sourced payment
recourse, country import pages, measured weight data, published criticism of
their own vendor. That short list IS the moat; every future content decision
should widen it, not duplicate their vendor-scoring lane.

**Verified active citation targets** (all checked this year): AllYourDolls
(upload 22 Jun 2026), DollLab (brand ranking 10 Jun 2026), Rocky Mountain Toy
Review (licensed CA review site, 2025, no-pay-for-coverage policy),
usemenext.com and d-addicts.com (both run trusted-vendor articles). Scam
aggregators (Scamadviser/Scam-Detector/Trustpilot/Knoji) own the generic "is X
legit" head terms — unpitchable, auto-generated; our play against them is the
vendor-specific long tail.

**Built:** `content/outreach-kit.md` — per-target rationale + ready-to-send
drafts. Hard rules baked in: owner sends as a human, data offered / links never
requested, no incentives, one follow-up max, outcomes logged in the kit's
table. **The drafts offer the three assets nobody else has** (weight dataset,
de minimis correction, recourse checker), never "check out my site".

**Also:** `/for-creators.html` facts block extended with the two new citable
facts (HPV 24h TPE 40% vs silicone none, with limits; s.75
deposit-covers-cash-price). These are the video-ready numbers.

**Do NOT:** contact dollvendoraudit; automate any outreach; pitch aggregators.
**Blocked on owner (send order):** week 1 AllYourDolls + DollLab, week 2 Rocky
Mountain, week 3 the two blogs.

## Run 2026-07-30 — learned the money-page pattern, shipped ours with data

**Competitor mapping (search signals):** the "best sex dolls" head term is held
by innerbody.com — a mainstream health-review property with a methodology
block, medical review board and dated updates. Vendor blogs answer "how much
does a doll cost" with "$100–$10,000". Nobody answers with recorded listings.
whichsexdoll.com owns scam listicles; d-addicts does trusted-vendor roundups.
Pattern learned: money pages win on (a) freshness signals, (b) a visible
methodology, (c) cross-vendor price detail. Our version substitutes recorded
data for hands-on testing we cannot do.

**Published `/guides/what-a-doll-costs.html`** (691 words, Article + FAQPage,
band table). Headline finding from our own dataset: **zero of 33 full-size
dolls under $1,000** (floor $1,099, median $1,749, top $2,659). The advertised
"under-$500 full-size" band is empty at a vetted vendor — the data-shaped
version of the Scam-Check's counterfeit warning. Torso entry: $209–$379,
13–32 lb. Site is 38 pages.

**Data trap caught before it published:** a $129 "163cm/115lb doll" in the
dataset was a hoodie — accessory pages carry the spec table of the doll they
fit. It would have been the counter-example to our own finding. Excluded,
disclosed on the page, and fetch-specs.mjs now skips accessories (ACCESSORY
regex). **If the next scrape's row count drops slightly, that is why.**

**Affiliate links** per band via data-yd, browser-verified (ref param +
sponsored rel). This is a commercial page and says so plainly.

**Queued for the runner** (structure study, not citation): dollvendoraudit
homepage + sitemap, innerbody format, whichsexdoll scam coverage, and the Rocky
Mountain TPE article the outreach kit references — read it before the owner
sends that message.

**Do NOT:** quote innerbody's claims as facts (format study only); republish
the "$100–$10,000" framing; forget the price-recorded date is 2026-07-27 and
prices drift — bands are the durable claim, not exact figures.

## Run 2026-08-01 — competitor structure digested; vendor evidence file shipped

**Runner brought back the competitor structures.** dollvendoraudit.com fully
mapped: the entire site is ~65 "[vendor]-review" pages + an "Audit now"
submission box that captures the highest-intent visitor (someone about to buy
from vendor X). Their method: review aggregation, scam-tactic detection,
virtual-vs-real shop, AI About-Us analysis, 0–100 score with verdict labels.
**The structural lesson: per-vendor long-tail pages are the traffic engine in
this niche** — each obscure vendor name is a low-competition query typed by
someone holding a credit card.

**Our version shipped: `/vendors/yourdoll.html`** — the evidence file for the
one vendor we can already source, targeting "yourdoll review / is yourdoll
legit" (demand proven: six aggregators maintain pages for it). Differentiation
is structural, not cosmetic:
- **Conflict disclosed first**, in a warn callout: we earn from this vendor.
  Nobody else in the SERP for that query does this.
- **No 0–100 score, deliberately** — the page's finding is that the ratings
  disagree (Trustpilot ~4.0/214 vs Knoji 2.8/54), and a one-number verdict
  would launder that away. Stated on the page.
- Every fact reused from the already-verified picks/trust evidence; BBB line
  still marked as not-read-directly; vendor's "malicious reviews" rebuttal
  reported as unverifiable both ways.
- Browser-verified: the one affiliate link carries ref+sponsored; the three
  evidence links carry nofollow WITHOUT ref (the wireAffiliateLinks fix from
  last week is what makes this safe).

Linked from picks, scam-check. Site is 39 pages, audit clean.

**Expansion path (do NOT rush it):** more vendor files only where evidence can
be fetched first-hand (queue Trustpilot pages via the runner). Never publish a
vendor page whose claims cannot each carry a source. dollvendoraudit's 65 pages
took fabrication shortcuts we refuse; ours will be fewer and citable.

**GSC (28 Jul–1 Aug):** still 1–2 impressions/day; one US impression at
position 1 on 7-29 (query anonymised). Nothing actionable yet.

**⚠ Supermetrics trial expires 2026-08-02.** After that, in-session GA4/GSC
reads die. Owner options: subscribe, or (free) create the GA4 service account +
GSC API access so scripts/ga4-report.mjs takes over. The service-account item
on the blocked list just became the measurement-continuity item.

## Run 2026-08-01 later — free measurement route built end to end

**Trigger:** Supermetrics trial expires 2026-08-02, taking in-session GA4/GSC
reads with it. The free route is now fully built on the code side:

- `scripts/gsc-report.mjs` (new) — Search Console via service-account JWT,
  zero deps, same key as GA4. Writes `content/gsc.json` + markdown summary.
  **Window deliberately ends 3 days back** — fresher GSC rows are provisional
  and would make committed history rewrite itself.
- `scripts/ga4-report.mjs` — now also persists `content/ga4.json` (the loop
  reads files, not job summaries).
- `traffic.yml` — daily job now pulls edge + GA4 + GSC in one run; both new
  steps exit 0 with an explanation while credentials are absent, so the job
  summary doubles as the setup reminder.
- `GROWTH-LOOP.md` §data updated: three sources, GSC named the leading
  indicator (impressions precede clicks precede sessions).
- Failure paths tested: no-creds and bad-key both exit 0 with the cause named.

**Owner's remaining part (all of it): `content/setup-google-api.md`** — the
exact console clicks: service account + enable 2 APIs, add as GA4 Viewer, add
as GSC Restricted user, two GitHub secrets (`GA4_PROPERTY_ID=547130808`,
`GA4_SERVICE_ACCOUNT_JSON`), then Run workflow to verify. ~10 minutes total.

**Until those secrets exist**, the daily job keeps recording edge traffic and
printing "credentials not configured" for the other two — which is the correct
state to be visible, not hidden.

## Run 2026-08-01 night — permission-free discovery surface widened

**Context that reframed everything: the owner's other site (baipiaoji.com,
readable via the same GA4 account) does ~15 sessions/day — and its Google
organic is only ~1/day. 65% is DIRECT.** Its advantage is an off-search
audience, not SEO. This site structurally cannot copy that (nobody shares a
doll-buying guide in a group chat; community posting is a red line), which is
WHY the strategy is search + AI + creator citations. Recorded so nobody
"fixes" our SEO to chase a gap that is not an SEO gap.

**Shipped (all permission-free channels):**
- robots.txt: 2026 assistant-crawler roster added (meta-externalagent,
  Meta-ExternalFetcher, Amazonbot, cohere-ai, MistralAI-User, DuckAssistBot,
  LinerBot, YouBot), same allow-all-but-legal policy.
- llms.txt preamble: three newest checkable facts added (HPV material
  difference WITH limits, empty under-$1000 band, s.75 deposit rule) +
  payment-protection into Free tools + /vendors/ section.
- **llms-full.txt** (153 KB): all 39 pages' text in one fetch. Linked from
  llms.txt.
- **feed.xml** (Atom, 24 dated entries): dates come from each page's own
  JSON-LD; undated pages skipped rather than stamped with build time. Feed
  link in the homepage head. Rebuilt on every deploy.
- **archive.yml** (weekly + manual, first run triggered): Internet Archive
  SPN snapshots of the 9 key URLs. Purpose #1 is provenance — third-party
  timestamps on our dated findings (weight data, price bands, de minimis
  correction) prove priority the day someone bigger lifts them. Purpose #2 is
  a crawled, high-authority discovery surface.
- IndexNow audited, no defect: key file served, aggregator endpoint, URL list
  synced by build-sitemap on every deploy.

**Do NOT:** submit to Google's Indexing API (policy limits it to job postings
and broadcast events; abuse risks manual action). Do NOT re-ping IndexNow on a
schedule for unchanged URLs — spec-discouraged, deploy-time push is correct.

## Run 2026-08-02 — demand research → entry repositioned (owner-directed relaunch)

**Owner directive:** zero traffic; deep-research needs → positioning → relaunch.

**Demand evidence assembled** (Trends was unavailable — Supermetrics trial
expired mid-query, as predicted; evidence below is structural):
- **innerbody.com's winning page** (57KB, fetched first-hand): its spine is
  "Summary of recommendations" — best overall / best manufacturer / best
  customization / best off-the-rack (yourdoll holds that slot) — then a named
  staff pick with height/weight/price, cross-vendor same-model price tables,
  and an "AI sex dolls have arrived" section. **Scam content is three bullets
  under "Cost", not the frame.**
- dollvendoraudit: 65 pages of "[vendor] review" — selection-adjacent intent.
- Our GSC: brand impressions only.

**Conclusion: the positioning (trust/data) is right — it is the moat and
competitors validate it. The ENTRY was wrong: the homepage led with fear
("Don't Get Scammed Out of $2,000") at the minority query class, while the
majority intent is selection ("which / what does it cost / where").**

**Relaunch executed, URLs unchanged (10 days of indexing preserved):**
- Hero: "Which doll. What it really costs. Who's safe to buy from." —
  selection first, protection woven in. Second CTA now the price-data page
  (was Scam-Check; Scam-Check keeps nav + sections + all inbound links).
- New data strip above the fold: price bands / weight chart / payment rights.
- Title: "DollScout: Doll Buying Guide with Real Price Data" (50 chars,
  brand-first kept for the entity). Description + OG/Twitter to match.
- Browser-tested: renders, no JS errors, no mobile overflow; audit clean.

**Phase-A guardrail override, stated explicitly:** GROWTH-LOOP §4 froze
headline/CTA changes to protect the baseline. Overridden on two grounds: the
owner directed the relaunch, and the baseline being protected is ~zero — there
is nothing to contaminate. The new baseline starts today; do not judge the new
entry before ~4 weeks of GSC data.

**New content gap recorded (needs sourcing before writing): "AI sex dolls".**
innerbody has a dedicated section and a best-for pick; demand is visible. We
have zero coverage. An honest what-is-real-vs-hype page would fit the data
positioning — but only after first-hand sourcing via the runner queue.

**Do NOT:** re-litigate the niche (evidence says demand exists and the moat is
real); change URLs; judge the new entry surface on less than 4 weeks of data.

## Run 2026-08-02 later — monopoly-niche analysis → positioning sharpened

**Skill-run (monopoly-niche-finder) over first-hand competitor evidence.**
Intersections scored: recorded-data engine 82, statutory-rights proof 65,
**evidence-standard umbrella 83 (winner)**, AI dolls (out — innerbody occupies),
resale lifecycle 55 (parked).

**The claim nobody else can make: "Every number sourced — or marked
unverified."** dollvendoraudit scores vendors but mixes AI inference and
publishes no data; innerbody has authority but no dataset and no stated
standard. **Adopting our claim would force them to delete their own unsourced
content first** — that asymmetry is the moat.

**Shipped sitewide, URLs unchanged:**
- notice-bar on all 35 pages + both generators: "Evidence-standard buyer's
  guide. Every number sourced — or marked unverified. We sell nothing
  ourselves. 18+ only."
- Organization schema description on 12 pages + generator: evidence-standard
  phrasing with the three proof assets named.
- trust.html: the standard stated as identity, including the fact we have
  already self-corrected once (torso weights) — the claim is load-bearing
  because it is falsifiable.
- llms.txt preamble blockquote: same identity, for AI summarisers.
- .agents/product-marketing.md: positioning section appended with the full
  rationale, so downstream skills inherit it.

**Layering (do not confuse them):** entry surface = selection-first (what/cost/
where, changed 2026-08-02 morning); positioning = evidence standard (why trust
us, this run). The door sells the decision; the standard sells the answer.

**Audit clean. Do NOT:** invent composite scores to compete with
dollvendoraudit's 0-100 — refusing the fake precision IS the position; add any
unsourced number anywhere, since the notice-bar now promises otherwise on
every page. That promise is now enforceable by any reader.

## Run 2026-08-04 — ai-seo run: published the dataset itself

**Skill (ai-seo) identified two gaps we actually had.** The Princeton GEO study
it cites ranks "cite sources" (+40%) and "add statistics" (+37%) as the top two
citation drivers — we do both, but:

1. **No visible "last updated" dates** anywhere. Schema carries them; readers
   and extractors do not see them. (Partially addressed: /data/ leads with
   recorded + published dates. Remaining pages still to do.)
2. **The datasets existed only as HTML tables.** For a site positioned on
   "recorded data", that is the contradiction at the centre of the claim.

**Shipped: `/data/` — the dataset published in full.**
- `scripts/build-dataset.mjs` → `data/doll-specs.json` (self-documenting:
  fields, method, limitations embedded) + `data/doll-specs.csv`. 42 rows.
- `/data/index.html`: Dataset schema with `variableMeasured`, two
  `DataDownload` distributions, CC BY 4.0, `temporalCoverage`. Highest
  citability content type per the skill's table (original research ~12% of AI
  citations, and nobody else in this category publishes any).
- **The limitations section is the point**, not a disclaimer: vendor-stated
  figures, one vendor, prices drift, and NO material column because the scraper
  could not tell TPE from silicone reliably — publishing that column would have
  been a guess wearing a data label.
- Wired into deploy, sitemap (0.9), llms.txt (own "Open data" section), feed.
  5 inbound links; orphan warning cleared.

**Sandbox defect found and fixed:** `assemble-dist.sh` needs rsync, which this
sandbox lacks — so every local "is it published?" check has been silently
passing on an empty dist/. The script now fails loudly. Runners have rsync;
deploys were never affected. **Do not trust a local dist check that prints
nothing.**

### Age gate: measurement blind spot identified (NOT yet changed)

`js/analytics.js` boots only on `ds:age-verified` or an existing `ds_age_ok`.
**A first-time visitor who lands and leaves without clicking through the gate
generates zero GA4 events — not even a page_view.** So GA4 cannot distinguish
"nobody came" from "people came and bounced at the gate".

This is a documented promise, not an accident: `legal/privacy.html` says
"nothing loads at all until you pass the 18+ gate", and ANALYTICS.md repeats
it. **Changing it would break a published privacy promise, so it is an owner
decision, not a cleanup.** Options recorded, none taken:
(a) leave as-is and accept the blind spot — Cloudflare edge data covers arrival;
(b) fire page_view before the gate and amend the privacy page to match;
(c) keep the gate but make it dismissible rather than blocking.

**Do NOT** silently change analytics boot order — the privacy page would become
false, which is the one failure this site cannot afford.

## Run 2026-08-04 later — the precise cut (owner-directed strategy decision)

**Owner asked for a cut: chase the high-traffic category, or own a unique one.
The answer is a third option where the two overlap.**

**Both obvious cuts fail on inspection:**
- *Head terms* (`best sex doll`, `sex doll price`) — innerbody.com holds them
  with a medical review board, hands-on purchases and years of authority.
  Unwinnable from 11 days old with zero backlinks. Volume you cannot reach is
  not volume.
- *Evidence standard alone* — already ours, and it is a reason to trust an
  answer, not a question anyone types. It converts and defends; it cannot
  attract.

**The demand insight, from the winner's own page:** innerbody stops mid-list to
explain that some entries are **distributors** and others are
**manufacturers**. They needed that footnote because the confusion is
structural — ~10 factories make nearly everything, mostly do not sell direct,
and dozens of distributors resell the identical model. **The same physical doll
carries materially different prices at different shops, and buyers cannot see
it.** Their most useful asset on that page is a cross-distributor price table.

**The gap, confirmed by a search engine failing to fill it:** a same-model
comparison search returned only vendor product pages, and the engine's own
summary said comparisons across distributors for the exact model were "limited"
and recommended checking the sites manually. Observed spread in that spot
check: WM Doll 156cm at **$1,499–1,599 vs $1,699** — ~13% on a four-figure buy.

**Why nobody built it — incentive, not difficulty.** Distributors cannot (it
shows when they are not cheapest); affiliate sites will not (an honest table
routes readers to a shop they do not earn from). **We already publish criticism
of our own vendor and our own dataset, so the sentence that is most expensive
for a competitor to write is the cheapest one for us.**

**THE CUT: same-model cross-distributor price transparency.** A sub-niche of
the high-traffic track that behaves like an unoccupied category. Full rationale
and the five non-negotiables: `content/strategy-cut.md`.

**Shipped this run:** `scripts/vendors.mjs` — distributor registry with
per-site listing paths and product-link selectors, plus the factory-brand list
for cross-vendor model matching. **Second vendor deliberately `enabled: false`
until its selectors are proven on a real run** — a half-working scraper
produces confident wrong prices, and a wrong price is the one error this
positioning cannot survive.

**Non-negotiables now binding (from strategy-cut.md §Non-negotiables):**
publish rows where our own vendor loses, in the same type size; date every
price; capture bundled inclusions or mark the row not-comparable (Perfect Love
Dolls advertises free upgrades, so its rows are NOT comparable yet); adult-form
height guard stays; cheapest ≠ vetted, show both.

**Do NOT:** publish a comparison page before inclusions are captured; guess a
model match — unmatched rows stay unmatched; enable a vendor whose selectors
have not produced a verified run.

## Run 2026-08-04 night — category named, scraper generalised to a registry

**Category (category-designer): "doll purchase intelligence".** Full definition
in `.agents/product-marketing.md`.

The reframe follows from the verified market structure, not from wordplay:
~10 factories make nearly everything and rarely sell direct, so **the doll is
the same wherever you buy it — the variables are price, recourse and whether
the shop is real.** "Which doll is best" is a question the factories already
answered; the shops resell one catalogue.

New buying criteria (we win by construction; incumbents cannot follow without
changing their business model): is this same model cheaper elsewhere · what
recourse survives payment · can I check your claims · what do you earn and from
whom.

**Truthfulness gate recorded with it:** the factory-consolidation premise is
observed (innerbody documents the maker/distributor split; the price spread was
seen directly). If distributors turn out to materially differentiate the
physical product — QC tiers, exclusive moulds — **this framing weakens and must
be revised rather than defended.**

**Capability shipped: `fetch-specs.mjs` now runs off the vendor registry.**
- `VENDOR=<id>` selects a distributor; unknown or disabled ids exit 1 with the
  enabled list. Both guards tested locally.
- Vendor resolution moved **before** `chromium.launch()` — it was after, so the
  error message was unreachable.
- Every row is stamped with its `vendor` id; non-default vendors write
  `content/doll-specs-<vendor>.json`.
- `fetch-specs.yml` takes a `vendor` input.
- **Third instance of the same bug class caught:** the commit step staged only
  `content/doll-specs.json`, so every second-distributor run would have been
  silently discarded. Now globs `doll-specs*.json`. (Prior instances: `git diff`
  blind to untracked files; `fetch-photos.yml` stale rsync excludes.)

**Next, in order:** enable a second distributor only after a run proves its
selectors → capture bundled inclusions (Perfect Love Dolls advertises free
upgrades, so its rows stay NOT-comparable until then) → match models across
distributors on brand+height+cup+head code, leaving unmatched rows unmatched →
only then publish a comparison page.

**Do NOT** publish any cross-vendor price before inclusions are captured: a
price table that ignores what is bundled is misleading, and misleading is the
one failure this category claim cannot survive.

## Run 2026-08-06 — probe mode, and the freshness signal made visible

**Deadlock broken.** The rule "a distributor stays disabled until a run proves
its selectors" could never be satisfied, because only enabled distributors ran.
The second vendor could not be proven without first being trusted — the exact
inversion the rule existed to prevent.

`DRY_RUN=1 VENDOR=<id>` now runs a **disabled** vendor against real pages,
prints URL counts and a sample of parsed rows, and **exits before touching the
filesystem** — enforced in code, not promised in a comment. The workflow gained
a `dry_run` boolean and skips the commit step entirely for probes. The refusal
path teaches: asking for a disabled vendor without the flag prints the command
that works, and a zero-row probe says explicitly **not** to enable on that
basis, because an empty probe proves the selectors are wrong rather than the
shop empty.

**First probe running now:** `perfectlovedolls`, run 31073831618. Read the log
before changing anything — if it returns rows, enable the vendor and re-run
without DRY_RUN; if it returns nothing, fix `listings` / `productLinkSelector`
in `scripts/vendors.mjs` and probe again. **Do not enable on a failed probe.**

**Freshness signals made visible.** ai-seo ranked these near the top of what
gets a page cited; ours lived only in JSON-LD, where neither a reader nor an
extractor sees them. Six data-bearing pages now carry a dated byline rendered
from their own `dateModified`, so the visible date cannot drift from the
structured one.

**Two pages had no date in schema at all** — `payment-protection.html` and
`after-you-order.html`. For pages whose entire subject is deadlines, that was
the wrong omission. Both dated; feed went 25 → 27 entries. All JSON-LD
re-validated (0 invalid blocks).

**Still gated, unchanged:** no cross-vendor price publishes until bundled
inclusions are captured. Perfect Love Dolls advertises free upgrades (standing
feet, gel breasts, EVO skeleton), so even a successful probe does **not** make
its rows price-comparable — it only proves the selectors read the page.

---

## 2026-08-06 — The probe that proved the parser wrong twice over

Two runs of `perfectlovedolls` (31073831618, 31074484226). What they settled:

### 1. The price bug was real, and it was universal

Live raw text on every reachable page:

```
"Regular price $1,599.00 USD Sale price $1,499.00 USDSale"
```

**14 of 14 rows were discounted.** The old `.price` textContent read would have
taken the first number — the compare-at — on *every single row*, overstating a
competing distributor by $100–200 throughout. That error runs in the one
direction this site cannot afford: it makes the shop we earn commission from
look cheaper than it is. It was not a cosmetic label problem, which is what the
string `Regular price $1,499.00` made it look like.

Fixed by reading the node the theme marks as charged (`<ins>` in WooCommerce,
`.price-item--sale` in Dawn), scoped to the product so a "recently viewed" tile
cannot price the wrong doll. Now returns `1499 USD (was 1599)` on all 14.

Two traps found while fixing it, the same bug from opposite ends: **`innerText`
falls back to `textContent` on any node that is not rendered.** So a
`cloneNode(true)` copy silently returns the screen-reader labels, and a
`display:none` block silently returns the price the theme is hiding. Dawn emits
*both* price blocks on every product and hides one, so this was not theoretical
either.

`scripts/parse-product.mjs` now holds the page-side reader on its own, and
`scripts/test-parse-product.mjs` pins it against real theme markup from both
storefront engines, on sale and off. The scrape workflow runs the fixtures as a
gate — if they fail, no prices are collected at all. **The parser is tested
rather than trusted; that is the difference between the two runs.**

### 2. The bigger finding: the crawl was blocked, and the summary said "success"

35 of 48 pages had rendered *"Your connection needs to be verified before you
can proceed"* instead of a product. The run filed all 35 as parse failures and
then printed **"Selectors work for perfectlovedolls."**

Both halves were wrong, and the second was dangerous. The selectors were never
the problem — every page that actually rendered parsed correctly. But 27%
coverage means the 14 rows are **whichever pages the bot check happened to let
through**, not a sample of the catalogue. Prices from a self-selected 27% are
not comparable to prices from a full crawl of another vendor, however correct
each individual number is.

Challenges are now detected by name, waited out and retried, counted separately
from parse failures, and the crawl is paced at 2.5 s with a back-off after a
block. **Coverage is its own verdict:** below 80% the summary refuses the
vendor and says why, instead of reporting the rows it did get.

The general lesson, and it has now cost two runs: *a scraper's summary line is
a claim about the world, and it needs the same evidence standard as a page.*

### 3. Model matching exists, and it says zero

`scripts/match-models.mjs` — step 2 of the build order. Checked against real
titles rather than assumed:

| | yourdoll | perfectlovedolls |
|---|---|---|
| example | `156cm (5ft1) H-Cup Indigo, Head #233` | `WM Doll 156cm H Cup - Head 335` |
| height | ✅ | ✅ |
| cup | ✅ | ✅ |
| head code | ✅ | ✅ |
| **factory** | ❌ never stated | ✅ |

So the join key is **height + cup + head code**, with the factory carried as
corroboration that can *veto* a match but is never required. All three
identifiers or no key at all — two of three describes a body shape, not a
model. Contradicting factory names reject the match rather than average it.

Current state, honestly: **16 keyable models at one distributor, 0 comparable.**
Those two 156 cm H-cups above are the illustration — same height, same cup,
different heads, therefore different dolls. No comparison page can be published
from this, and the fix is more data, never a looser key.

### Gates still standing

1. **Coverage < 80% → vendor stays disabled.** New, and it is why
   `perfectlovedolls` is still `enabled: false` despite a clean parse.
2. **No cross-vendor price publishes until bundled inclusions are reviewed.**
   The capture now exists (`inclusionsClaimed`, stored as the term *plus the
   sentence it came from*, never as a boolean) — but capture is not review.
3. **Unmatched rows stay unmatched.**

### A finding we are deliberately not publishing yet

**14 of 14 reachable listings at the second distributor showed a "sale" price**
— every one, with a struck-through "Regular price" $100–200 above it. If that
holds over time, the reference price is one nobody is ever charged, and a
permanent discount presented as a limited one is exactly the buyer-protection
material this site exists for. It needs no cross-vendor comparison to be
useful, which makes it tempting.

It is not publishable today, for two reasons that are the same reason:

1. **One snapshot is not a pattern.** "Always on sale" is a claim about time,
   and we have one day. It needs the same price observed as a "sale" across
   several dated runs before the word "always" can appear anywhere.
2. **The snapshot covers 27% of the catalogue**, self-selected by whichever
   pages the bot check let through. Even the "14 of 14" is not a fact about
   the shop, only about the pages we saw.

Publishing it now would name a company in a deceptive-pricing accusation on
evidence we would reject from anyone else. **Re-check on the next two runs; if
it holds at 80%+ coverage, it is a page.** Until then it lives here.

---

## 2026-08-06 (later) — Two questions answered, one of them badly

### The site is fully crawlable. That hypothesis is now dead.

Every SEO and GEO decision here rested on an assumption nobody had tested,
because the editing sandbox has no egress: that the live host actually answers
a crawler with the page. `scripts/crawl-check.mjs` runs on a runner, which has
egress. Run 31084542347:

- **36 of 36 published URLs → 200**, with real HTML in the raw response body
  (checked for `<h1>`, `<title>`, `<main>`, and byte count — a 200 that needs
  JavaScript to say anything is not an indexable page)
- **6 of 6 crawlers get byte-identical content to Chrome** — Googlebot,
  Bingbot, GPTBot, ClaudeBot, PerplexityBot. No challenge, no cloaking, no
  crawler-only 403
- **Every discovery file live**: robots.txt, sitemap.xml, llms.txt,
  llms-full.txt, feed.xml, the dataset

The **age gate is not blocking indexing**: it is JS-injected, `body.gated` only
sets `overflow:hidden`, and the content ships in the served HTML. Verified in
source and confirmed by the byte-parity check.

So zero traffic is not a reachability problem, not a rendering problem, and not
an age-gate problem. It now runs weekly, so if that ever changes we find out in
a week instead of never.

### The brand name is a trust liability, and it needs an owner decision

Searching the brand turns up, on the first page:

1. **`dollscout.com`** (not ours — we are `thedollscout.com`) is an unrelated
   **Barbie collector search tool**.
2. **Scamadviser's page for `dollscout.com`** — "the trust score is low, the
   site might be a scam", flagged partly for domain age.

And **thedollscout.com itself does not appear at all**, even for its own brand
name plus distinctive site-only terms. Consistent with a new domain that Google
has not indexed yet; not proof of a penalty.

For a site whose entire position is *buyer protection and trust*, the branded
search result being a scam-warning page for a near-identical domain is a
problem no amount of on-page work fixes. **This is the owner's call, not ours**
— renaming is expensive and irreversible, and we should not make it silently.
Options, in rough order of cost:

- Keep the name, and get indexed hard enough to outrank the collision for
  "dollscout" + doll-buying intent. Cheapest, slowest, and never fully removes
  the adjacent scam warning.
- Keep the domain, change the display brand so the two stop colliding in text.
- New domain. Most expensive, cleanest.

### What this means for "more content"

Reachability is proven and the content set is already ~30 substantial pages.
The binding constraint is **indexing and external signals**, and neither is
fixed by writing page 37. The two things that would actually move it are both
owner actions we cannot and must not do for them: Search Console submission,
and being mentioned by humans in places humans read. Our job is to make the
site worth mentioning — which is the data work, not the page count.

---

## 2026-08-06 (later still) — Publishing what the tools know

The GEO work so far assumed the problem was markup. It was not. **An answer
engine cannot press a button.** Every tool here computed in JavaScript, so a
model reading the page saw a form and never an answer:

| Page | Table rows before | Where the knowledge lived |
|---|---|---|
| payment-protection.html | **0** | one inline `<script>` |
| cost-calculator.html | 2 | one inline `<script>` |

No amount of schema fixes that, because there was nothing on the page for the
schema to describe. So both tools now publish their conclusions:

- **`data/payment-recourse.json`** — 42 cells, every combination of payment
  method × price band × country, CC BY 4.0, with thresholds, limitations and
  open questions attached to the data rather than filed away from it. Rendered
  as a table on the page before any JavaScript runs.
- **`data/first-year-cost.json`** — the cost model plus five worked examples,
  spanning the decision rather than flattering it: torso +28% over sticker,
  median full-size TPE +28% (US) / +46% (EU/UK), flight-case case **+61%**.

Both declared as `Dataset` with a `DataDownload`, so an extractor can find the
machine-readable form.

### The rule that makes this safe

Two renderings of one rule set is fine. **Two rule sets that drift apart is
not** — and the published table is the more dangerous half, because it is the
half that gets quoted somewhere we cannot correct. So:

1. The tables are **generated on every deploy**, never hand-written.
2. `test-recourse-parity.mjs` and `test-cost-parity.mjs` drive **the page's own
   shipped script** through every published cell and scenario, and fail on any
   disagreement.
3. Both fail when **zero** cells are checked — a renamed form field would
   otherwise make every cell silently "agree".

Verified green on runs 31093128672 and 31093572732: 42/42 cells, 5/5 scenarios.

Two places where the published version deliberately refuses to be tidier than
the truth: the PayPal Section 75 question is printed as **unresolved** rather
than flattened to a clean "no", and the US duty **rate** gets its own callout
saying we will not invent one. *The table must never be more confident than the
tool.*

### Not done, and why

The other two tools (quiz, scam-check) have not had this treatment; scam-check
at least already exposes its ten steps via `HowTo`/`HowToStep`, so it is the
less urgent of the two.

**yourdoll still needs a re-scrape** with the current parser — its prices are
strings and its rows predate the inclusions capture. Until then the one
surviving cross-vendor match cannot be published, because we do not know
whether yourdoll bundles the upgrades Perfect Love Dolls gives away. That
re-scrape overwrites `content/doll-specs.json`, which backs the published
"33 listings / $1,099 floor / $1,749 median" claims — so it has to be done
together with rewriting those numbers and their recorded date, not casually.

---

## 2026-08-07 — The major optimisation: unblocking cross-vendor comparison

The differentiator in `strategy-cut.md` was blocked on data, not on writing.
This pass built everything between the data and a publishable comparison, and
then let the gates do their job.

**Snapshots.** A price is a claim about a date, and overwriting the file
destroyed the only record of what the previous claim rested on. Each run now
archives `content/snapshots/<vendor>-<date>.json` first and refuses to
overwrite a same-day record. The existing yourdoll data is archived under its
published recording date so the site's live figures stay traceable. *Fourth
instance of one bug class fixed in the same workflow: the commit step's path
pattern did not cover what the script writes, so the archive would have been
created on the runner and discarded with it.*

**Published prose is now checked against its evidence.**
`test-published-claims.mjs` verifies every number stated in sentences on the
pricing pages — "33 live listings", "the floor was $1,099", "zero under
$1,000" — against the dataset. Prose does not regenerate itself the way a
generated table does, so a re-scrape would have turned the most confident page
on the site into the least accurate one **while it still read perfectly**. A
failure names the sentence and says to rewrite the sentence, not the data.

**The comparison builder refuses by design.** Four gates, all required: same
model, same currency with real numbers, **inclusions known on both sides**,
recording dates within 21 days. The inclusions gate is the commercially
decisive one — if one distributor bundles standing feet, a gel bust and an
upgraded skeleton while the other bills for them, the cheaper sticker is the
dearer doll. Refused rows print their reasons; a silent drop is
indistinguishable from a suppressed one. Current state: 1 matched model, **0
publishable**, four reasons printed, nothing written.

*Caught in review:* the builder wrote a headless HTML fragment into the site
root, and `build-sitemap.mjs` walks every `.html` outside its skip list — so
the first qualifying row would have shipped a fragment as a real page and
pushed it to search engines. Now writes to `content/`.

### The finding we again declined to publish

| date | rows | discounted | coverage |
|---|---|---|---|
| 2026-08-06 | 30 | 28 | not recorded |
| 2026-08-07 | 28 | 27 | 90% |

And **26 of 26 listings present in both runs held the identical price *and*
identical struck-through price**. Nothing moved.

That is suggestive — and it is also precisely what an ordinary week-long
promotion looks like across 24 hours. "This shop's discount is permanent" is
an accusation of deceptive pricing on evidence we would reject from anyone
else. So the answer to a question about time became a series: the scrape now
runs weekly across both distributors, and `price-history.mjs` requires **four
distinct dates at 80%+ coverage** before the word "always" may appear.
Current verdict: 0 of 4. The 2026-08-06 rows are backfilled with
`coveragePct: null` — that build never measured coverage, and filling it in
would launder provenance. They count toward the record, not the claim.

---

## 2026-08-07 (later) — The research pointed inward

Four independent searches into what buyers actually ask. Every single SERP
returned the same two things: vendor blogs with commercial intent, and SEO
spam on **hijacked .edu domains** — stanford, umich, ucla, arizona and a
fortune.com subdomain all served pages like "5 Tips to Choose Amazon Sex
Dolls". Quora fills the rest.

The decisive observation was not a topic gap. It was this, repeated across
sites as fact:

> "A 2026 sexual wellness consumer survey found that 58% of people store
> their toys incorrectly."

**The survey is never named.** That is the category: numbers with no origin,
circulating until they sound true. It is exactly the gap this site claims to
occupy — which makes an unsourced number of *ours* worse than a competitor's.
Theirs is expected. Ours is the promise failing on the page that makes it.

So the site-wide optimisation was to audit ourselves. **We had eleven.**

The worst was on the home page: **"80% of the experience at 20% of the weight
and cost."** Nobody has measured 80% of an experience. A fabricated statistic
in our own shop window, directly beneath a banner reading *"every number
sourced — or marked unverified."* Also removed: "we read thousands of owner
posts" (nobody counted), "most buyers are done in under ten minutes" (we have
no timing data at all), and the Scam-Check's own credibility line — "built
from thousands of complaint threads" — on the flagship trust page.

Claims about competitors got the same treatment rather than a pass. "Most
guides", "most reviews of doll shops are written by affiliates": probably
true, never counted, now stated as patterns instead of majorities.

**`scripts/audit-claims.mjs`** scans per block, not per page — a citation in
the footer does not source a sentence forty paragraphs above it, and judging
per page passes almost everything. A claim survives only on an external link,
a link to our own published dataset, or an explicit marking as estimate or
unverified.

It carries canaries, for a reason worth keeping: once the first pass fixed
every hit, *"nothing is wrong"* and *"the patterns no longer match anything"*
became indistinguishable. It now proves it still catches four known-bad
sentences before it is allowed to report a clean site. Its own first version
had a real gap too — it flagged a vendor paragraph that already said "we
cannot verify", because the pattern only knew the past tense.

Runs on every push. Currently clean.

---

## 2026-08-08 — The positioning was never the problem. The missing layer was.

A rebuild was explicitly on the table. It should not happen, and the reason is
specific rather than defensive:

**Trust is a conversion asset, not a discovery asset.** Nobody types
"trustworthy doll guide" into a search box. That is exactly how this site can
be genuinely good and draw zero traffic — the two measure different things.
The site had a conversion layer and no discovery layer, and a rebuild would
have destroyed 36 audited, crawlable, honest pages while leaving the real
constraint untouched: no index presence, no entity-level pages, no external
signals. Only the middle one is ours to fix.

### The one query family worth building for

Three things true at once, all three evidenced this session:

| Test | Evidence |
|---|---|
| High intent, constantly asked | weight is the most reported source of first-buyer regret |
| Weak SERP | searches return marketplace listings and SEO spam on **hijacked .edu domains** — stanford, umich, ucla, arizona |
| Only we can answer | vendors overwhelmingly do not publish weight — which is why the scraper exists |

`/weight/` plus a page per height, generated from the dataset.

**The gate is the product, again.** A page exists only where the sample carries
it: **150cm (n=29)** and **160cm (n=15)** got pages; **140cm (n=3)** and
**165cm (n=4)** are listed on the hub with their real counts and no page.
Generating one per height regardless is the programmatic-SEO move that gets a
domain classified as spam — and it would be us publishing "typical weight"
figures with nothing behind them, which is the practice this whole site argues
against.

Each page leads with the answer, prints every row it derives from, states the
sample size and date in the byline, and says outright that one catalogue on one
date is not a market survey. The answer sentence is written once and reused
verbatim in the FAQ schema, so a reader and an extractor cannot be shown
different things.

### Two findings from our own checkers, while building this

1. **The claims auditor flagged the new generator's own copy** — an unsourced
   "most shops". The discovery layer was held to the same standard as the pages
   it was built to support, on its first run.
2. **That flag exposed a gap in the auditor itself.** It scanned from `<main>`,
   so meta descriptions and social titles — *the text a search result actually
   displays* — had never been audited at all. Fixed, and it immediately
   surfaced three more.

Sitemap 36 → 39. Nav, llms.txt and the deploy pipeline updated so new heights
appear the day the data supports them.

### Still the owner's, still blocking

Search Console submission, the brand collision, and human outreach. No amount
of page-building substitutes for any of the three.

---

## 2026-08-08 — The site now regrows itself

Every regeneration step already existed. **Nobody ran them together** — and an
audit of which scripts appear in any workflow found the two closest to the
actual differentiator, `build-compare` and `price-history`, **in no workflow at
all**. A pipeline that only runs when someone types the command is a checklist,
not automation.

`scripts/grow.mjs` + `.github/workflows/grow.yml`, weekly, three hours after
the scrape. Rebuilds dataset → entity pages → recourse matrix → cost examples →
model matches → comparison draft → sitemap → llms.txt → feed, then puts all
four gates in front of publication and **commits only if every one passes**.

### What is genuinely automatic now

- A new height crossing the sample threshold **grows its own page**. 165cm needs
  6 more listings, 140cm needs 7; when the weekly scrape reaches them, the pages
  appear without anyone deciding.
- A model becoming comparable across distributors **makes the comparison
  publishable on its own**, once its gate clears.
- Nav, sitemap, llms.txt, feed and IndexNow all follow automatically.

### What it refuses to pretend

The report prints three sections every run, and the third is the point:

> **needs a human, and cannot be automated away**
> · Search Console submission — until then this grows toward what we can
>   PROVE, not toward what people actually search for.
> · The brand collision — a rename is not ours to make.
> · Outreach — we never post to communities.

**"Evolves toward user needs" is not what this does, and saying it would be the
same unsourced claim we spent the previous pass deleting from the site.** It
evolves toward what the data can support. Growing toward *demand* requires
query data, which requires the owner's Google account. That gap is printed on
every single run rather than buried.

### On "expanding categories"

The mechanism is the generator-plus-threshold pattern, and a new category is a
small well-defined job. But **each category needs a reason to exist**. Inventing
categories to fill a template is the programmatic-SEO move that gets a domain
classified as spam — the same failure the per-height gate already refuses. So
the framework is ready and new categories still get argued for, not generated
because the shape fits.

First run: all generators and gates green, nothing new qualified. That is the
normal weekly result.

---

## 2026-08-08 (later) — Categories qualify themselves

Adding a category used to mean writing a generator, which made expansion depend
on someone deciding. The decision is now **three tests, run weekly**. All
automatic, and all able to refuse — because "generate a page family per column"
is exactly how a domain gets classified as programmatic spam.

| Test | What it stops |
|---|---|
| **Sample** | enough distinct values, each with enough rows |
| **Variance** | values that all say the same thing. If every value has the same median, a page per value repeats one number in different words. **A category that cannot surprise anyone does not earn a URL.** |
| **Distinctness** | a grouping that restates a live category. Height and weight-band partition these rows almost identically; shipping both is two page families saying one thing. **Measured, not judged** — if the live category predicts the candidate for >80% of rows, refused. |

On today's data:

```
height  → QUALIFIES (bespoke generator)   150cm n=29, 160cm n=15
factory → refused   0 values reach n=10 — only one distributor names the factory
cup     → refused   1 value reaches n=10, needs 2; C cup at n=8 is closest
```

Both promote themselves as the weekly scrape fills them in. Nobody writes a
generator for them.

**A published category that stops qualifying is reported and exits non-zero —
never silently deleted.** Published URLs are promises, and quietly removing
them trades one problem for a worse one.

### Tested in both directions

An automation nobody has watched *refuse* is the dangerous half, and the real
dataset currently exercises only the qualifying path. Synthetic fixtures now
prove a flat category and a duplicative one are both rejected, and that a
genuinely independent cut is **not** rejected by mistake.

### A real defect caught in the growth workflow

The commit step staged category directories by name — and `git add` on a
pathspec matching nothing **fails and then stages nothing at all**. Verified in
a scratch repo: `git add real missing` staged **0 files**, not 1. Listing a
category that had not qualified yet would have broken the commit for
everything else — *including the first category ever to qualify*, which is the
one moment the whole mechanism exists for. Now only existing directories are
staged.

---

## 2026-08-08 — Benchmarked against mature sites; three real gaps

**Search — none at all**, across 39 pages that now generate themselves. A
hand-maintained nav cannot track a site where a new height publishes its own
page.

Two result kinds, and the second is why it is worth building rather than
buying. Pages are ordinary hits. **ANSWERS come from the published dataset**,
so typing `150cm` returns *"57–79 lb across 29 recorded listings"* — the one
asset nobody else has, which a document-only search would have buried. A
height below the sample threshold still answers, links to the hub rather than
a page it did not earn, and says the sample is too small.

The box is **injected by script, never in the HTML**: one that renders and
does nothing when a script fails is worse than none, and a crawler has no use
for a widget it cannot operate. Index loads on first interaction — 27 KB
charged only to people who search.

**Skip link — zero pages had one.** Eight nav links before content, on every
page, tabbed through by every keyboard and screen-reader user. WCAG 2.4.1.

**Reduced motion — zero rules**, while three tools call `scrollIntoView` with
`behavior:"smooth"`. The CSS media query alone does **not** fix this: an
explicit `behavior:"smooth"` in JavaScript overrides `scroll-behavior`, so the
call sites are guarded too.

### The search test failed first, and the failure was worth reading

Four assertions failed while *"a query matching nothing says so"* passed.
That combination — **every content query empty, empty-state green** — is the
signature of an index that never loaded, not of bad ranking.

Cause was the harness, not the feature: `page.setContent()` leaves the page on
`about:blank`, where a root-relative `fetch("/search-index.json")` has nothing
to resolve against, so the route never matched. The document is now
intercepted too, giving the page a real URL, so the script's own relative
fetch is the thing under test. All 8 pass on 171b67c.

### A stale claim the search indexer surfaced

`/data/` read **"42 Doll Listings"** against a dataset of 54, dated
2026-07-27. The claims test had never covered that page. It does now,
including the recording date.

### What was deliberately NOT added

**Person schema for E-E-A-T.** There is no named author, and inventing one to
satisfy a checklist is precisely the fabrication the previous passes removed
from this site. Organization authorship is the honest form, and an E-E-A-T
score is not worth buying with a fake byline.

Still open, in rough order: table sort/filter on the 29-row samples, print
styles for the checklist page, and a table of contents on the long guides.

---

## 2026-08-08 — Trends, split into "fixed itself" and "needs you"

**The honest framing first**, because trend prediction is where this kind of
feature usually starts lying. There is no external market feed here and no
search query data. What exists is our own weekly snapshots. So the detector
reports **change in what we recorded**, states how many observations back each
signal, and refuses to extrapolate from two points — *a direction is not a
rate*.

It also refuses to compare against a snapshot whose coverage is unknown. The
early archives predate the coverage field, and a "price rose" measured against
a partial crawl is an artefact of what the bot check let through.

**On today's data that means nothing is comparable yet:**

```
perfectlovedolls 2026-08-06: coverage unrecorded — excluded
yourdoll         2026-07-27: coverage unrecorded — excluded
→ 1 usable snapshot per vendor, need 2 for a direction
```

The report says that, with the reason, instead of producing a confident number
from two mismatched crawls. Next week's scrape supplies the second one.

### The split is the design

| Bucket | What happens |
|---|---|
| **SELF-IMPROVING** | Acted on with no human. Falling coverage widens the crawl delay; recovering coverage eases it. |
| **OWNER ACTION** | Needs judgement, money, or an account we do not hold. |

**The genuinely emergent loop is the crawl pacing.** `detect-trends.mjs`
retunes it from observed coverage, and `fetch-specs.mjs` now *reads* that file
— so the scraper's politeness is derived from its own results rather than a
constant someone picked once. Bounded both ways: unbounded backoff eventually
never finishes a run, unbounded speed-up walks straight back into the bot check
that once cost a 27% crawl.

### Telegram carries only the second bucket

A notifier that reports everything it noticed trains its reader to ignore it,
and most of what this pipeline notices **it has already fixed**. When there are
no owner actions, **nothing is sent** — a weekly "all quiet" message is how a
channel gets muted.

Needs two repository secrets, which are the owner's to create:
`TELEGRAM_BOT_TOKEN` (@BotFather) and `TELEGRAM_CHAT_ID`. Without them the step
exits 0, prints what it *would* have sent, and prints the setup — loudly,
because a silently dead integration is one you keep believing in.

Plain text, no `parse_mode`: MarkdownV2 escaping is unforgiving and a rejected
message is a silent loss. Formatting does not justify a dropped alert.

Notification runs **after** the gates, never before. Asking someone to act on
numbers we just refused to publish would be worse than staying quiet.
