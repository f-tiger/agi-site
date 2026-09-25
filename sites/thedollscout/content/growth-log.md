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

## 2026-08-25 — The eco lesson, applied: wedge pages had no purchase surface

Fleet cross-learning round (owner: "tds站点学习eco并提升转化"). eco's most
expensive CRO discovery this month was pages whose own text argues for a
purchase carrying zero purchase surface (the fensterabdichtung case). Audit
here found the same defect class at larger scale: **payment-protection and all
12 importing/* pages — the safety wedge itself — had zero affiliate anchors.**
The D1 truth (28d, ev='' human line): the wedge is where real readers land
(scam-check 3 / payment-protection 3 / importing cluster 6 / data 1), and
affiliate_click has been 0 since instrumentation. Traffic can't click what
isn't there.

Shipped: the scam-check house pattern (context-matched reason + data-yd baked
anchor + "run the checklist on us too" caveat) on 14 pages — 12 importing/*
("the vendor is half your customs outcome"), payment-protection ("start from a
vendor that keeps your dispute route open" — reuses the page's own credit-
card/PayPal advice), /data/ ("comparing specs to buy?"). Every claim in the
blocks is already established on-site (brand authorization / factory-photo
policy / buyer-protected payment); nothing new asserted. bake-affiliate-links
verified 55 anchors, 0 rewritten (byte-exact to house pattern).

**Judgement line (2026-09-22, 28d):** first `ev='affiliate_click'` row from
any hooked wedge page → the wedge→vendor handoff works, keep. Zero clicks
while wedge pv grows → the handoff copy is wrong, rework ONCE; zero clicks
because wedge pv stays ~0 → not a conversion problem, defer to the 10-01
wedge line. Compliance unchanged: 18+ gate, disclosure in every block,
rel="sponsored nofollow noopener", adult-form-only pledge untouched.

## 2026-08-25 (breakthrough round) — attacking the blocks where they are weakest

Owner: "有没有其他办法，你突破思考执行". The three blocks all bite hardest on
Google — so this round activates the non-Google lanes:

1. **IndexNow push live** (`scripts/indexnow-push.mjs` + weekly
   `tds-indexnow.yml`, delta-only, ~1 min/month): Bing/Yandex/Naver/Seznam
   share one endpoint. Yandex is already our most frequent crawler (34/28d)
   and filters this niche least; Naver serves the /importing/south-korea
   audience. The key file existed since launch — there was just no push. First
   full registration via workflow_dispatch MODE=all.
2. **Grok welcomed by name** (robots.txt GrokBot + xAI-Bot): the one
   mainstream assistant that answers adult-product questions without a
   category refusal — for this site, the most valuable reader on the roster.
3. **Vendor-backlink outreach kit** (MARKETING.md): domain age is the only
   block with a shortcut — a resource link from yourdoll.com's FAQ. Draft
   ready; owner sends.

Judgement (28d, 09-22): Bing/Yandex referred humans in D1 (ref contains
bing/yandex/naver) — today's count is 0 bing / 0 yandex. ANY nonzero = the
lane opened; still zero after two weekly delta pushes → IndexNow stays (free)
but stop expecting discovery wins from it and say so.

## 2026-08-25 (competitor-strengths round) — port what the winners do RIGHT

Owner: "其他方案呢？另外站点产品参考其他同类型网站学习优势". Fresh WebSearch on
top of the 08-17 gap table, this time cataloguing STRENGTHS to port:
- dollvendoraudit: per-vendor systematic audits, measurable criteria, explicit
  affiliate-independence statement → ported as our vendor-check page template.
- scamadviser/scam-detector (generic, rank freely for "is X legit"): the
  query family is NOT SafeSearch-choked and IS assistant-answerable — but the
  generic players have zero vertical knowledge. That intersection is ours.
- Trustpilot: freshness via dated citations (we cite, we don't host reviews).

Shipped pilot: **/vendors/lovedollshops-check** ("Is Lovedollshops legit?") —
public-record-only table (Scam Detector 52.5 "Questionable", Scamadviser
legit-with-caveats + hidden WHOIS, mixed review pattern), every line sourced
and dated, "unverified by us" stated where true, corrections invitation,
self-verify funnel (scam-check → factory-photos → payment-protection), vetted-
vendor block. FAQ 4=4 visible==LD. Inbound from scam-check (the AI-crawl
magnet). **Excluded kaydora deliberately**: search shows it sells reborn
baby-form dolls — childlike-appearance red line, we do not cover it even
negatively.

Judgement (28d): the page earns any of — a search/assistant referral, an
affiliate_click, or an AI-crawler fetch streak ≥ scam-check's — → template a
second vendor from the complaint-heavy list. Zero everything → vendor pages
don't earn their keep; stop at one.

## 2026-08-25 (homepage/tools/GEO round) — owner: 痛点关键词+工具强化+yourdoll爆品挂首页+GEO

Audit-first result: most of the directive was already built and healthy —
hot-picks strip live on the homepage (weekly scrape of the vendor's own
popularity-sorted listing, refreshed 08-24, affiliate ref applied at render,
honest "their ranking not ours" copy), and all three tools already carry
WebApplication JSON-LD. The real gaps found and fixed:

1. **Hot picks were JS-only — invisible to every crawler, AI engine and
   no-JS visitor** (same defect class bake-affiliate-links fixed for plain
   anchors). New `scripts/bake-hot-picks.mjs` bakes the 8 vendor products
   into index.html statically (markers, idempotent; price strings sanitised
   of WooCommerce "Original price was:" artifacts; refs baked identically to
   the JS path); js/main.js now no-ops when the strip is server-baked.
   Wired into deploy after bake-affiliate-links.
2. Tool LD completeness per fleet convention: quiz +isAccessibleForFree
   +featureList; cost-calculator +featureList (price-check already full).
3. Pain-keyword state: wedge titles already carry query phrasing
   (scam-check/height-weight are the AI-crawl magnets as-is). The one
   genuinely uncovered pain query family — "doll arrived, doesn't match the
   photos, 72-hour action plan" (SNAD) — stays the TOP queued content seed;
   not shipped today (fourth tds change of the day would be churn).
4. GEO push: IndexNow delta dispatched after deploy so Bing/Yandex/Naver see
   today's 16 changed pages promptly.

Judgement (28d): baked strip = crawlers can now cite actual products; watch
whether vendor-product queries ever appear in AI-crawler fetches. Tools:
watch quiz/cost-calculator fetch counts vs before.

## 2026-08-29 (eco-playbook round) — owner: "太慢了，学习eco站点起量，抓住热点"

Context, first-party: 11 days of D1 since the beacon went live — ~6 real
human pv/day, 2 Google referrals total, affiliate_click 0. The pipeline is
alive; the traffic isn't. Owner directive: port eco's ramp mechanics, catch
trends. Three changes, all shipped today:

1. **Fast-response page rule ported from eco** (CLAUDE.md new section):
   rising word v≥200 + in niche + lands in the safety wedge → page the same
   day; vendor-name + legit/reviews intent uses the lovedollshops-check
   template (our Faktencheck isomorph); 14-day per-word cooldown; 1 page/day
   max; baby-form/reborn = never, even negatively. Judgement: each page 28d
   ≥1 search/assistant referral OR ≥1 affiliate_click OR AI-fetch streak ≥
   scam-check; 3 consecutive zero pages → rule goes back to the shop.
2. **Rising seed fixed on data** (tools/fleet_trends_rising.py): "silicone
   doll" provably surfaces only ashton drake / reborn baby-doll queries
   (v 28700/18550 — out of niche, red-line adjacent). Swapped for "rosemary
   doll", the vendor name that "sex doll" related-queries surfaced by itself
   — vendor seeds rise as "<vendor> reviews/legit", exactly what the wedge's
   vendor-check template converts. Quota-neutral (swap, not add).
   Today's signals, for the record: lars and the real girl v=7450
   (film — informational, logged, no page), realbotix v=130 (below line),
   rosemary doll v=40 (vendor intent, below line — the seed swap exists to
   measure this family properly).
3. **SNAD wedge page shipped** — /guides/doll-not-as-described ("arrived,
   doesn't match the photos: the 72-hour plan"). Queued as the TOP uncovered
   pain-query family since 08-25; consumer-protection shaped (SafeSearch-safe,
   assistant-answerable), which is where this site's only Google click and
   all its AI-crawl attention already live. Zero new facts: payment windows
   cite /data/ (FOS ~120d from receipt, S75 £100–£30k), arrival evidence
   defers to After You Order, variance judgement defers to factory-photos;
   the 72h frame is explicitly labelled editorial-not-legal on the page.
   Links no vendor at all, same as the other wedge pages. Cross-linked from
   after-you-order + guides index; sitemap/llms/search-index rebuild in CI.

Judgement (28d, 09-26): the SNAD page earns a search/assistant referral or
an AI-crawler fetch streak ≥ factory-photos' → keep deepening the
post-purchase wedge; zero everything → the wedge thesis takes the hit, log
it against the 2026-10-01 wedge line honestly.

## 2026-08-30 (THE PIVOT) — owner: "重大决策：下架掉这个站点，风险太大，更换为卖labubu的站点"

The adult-doll site is retired, in full, by owner decision. Archive = git
history + the old private repo. This entry is the hinge between the two
sites sharing this log; everything above it belongs to the retired site.

What was decided (owner, same session): reuse the domain and all infra
(Pages project, D1, GA4, IndexNow key, US Associates listing of 2026-08-28
— the deciding argument for domain reuse), affiliate-guide model, zero
inventory. What shipped same-day:

- Takedown: every adult page, dataset, generator script and 9 of 11 tds
  workflows removed; age gate, RTA Rating headers and adult meta gone;
  deploy self-check now ASSERTS old pages 404 and a build gate fails the
  deploy if any retired-site marker reappears in publishable files.
- New site v1: / + /fake-check (flagship: 8-point real-vs-fake, every check
  with named dated source; the retired site's evidence-standard DNA applied
  to the category where fakes literally earned their own name) +
  /where-to-buy (official channel ladder per Pop Mart's own advice via ABC
  News; Amazon storefront + brand-search affiliate links, Ad-labelled;
  no hard-coded prices — price-floor logic instead).
- Sources actually verified via WebSearch (sandbox egress blocks the source
  domains themselves — noted in CLAUDE.md; multi-source points only).
- Trend inputs re-seeded: trends-us wordlist + rising seeds (labubu / fake
  labubu / pop mart); old trend data reset with a dated note.
- Analytics continuity: same D1, same ev taxonomy; rows before 2026-08-30
  are the old site's — never compare across the hinge.

Honest risk, pre-registered in CLAUDE.md: six weeks of 18+ history on this
domain (RTA headers, adult meta). All removed + IndexNow re-pushed, but
SafeSearch-classification residue has an unknown half-life. Judgement line
2026-10-29: 28d human pv ≥ 3× the old site's ~6/day, or ≥1 affiliate_click,
or ≥5 search/assistant referrals → pivot holds; all missed → escalate the
domain-history hypothesis to owner with a fresh-domain proposal.

## 2026-08-30 (round 2) — owner: "联盟id用我的德国和美国id，分别做多语言"

Dual-tag, dual-market build on day one of the new site:

- /de/ German pages shipped as full pairs of the three EN pages (hreflang
  language groups, x-default=EN — eco's verified model). German pages carry
  amazon.de links with getecoback-21; EN pages keep amazon.com with
  ecoback0d-20. Both official POPMART storefronts verified to exist via
  WebSearch before linking (amazon.com and amazon.de each have one).
- New build gate: a .de link carrying the US tag (or .com carrying the DE
  tag) fails the deploy — a crossed tag earns exactly nothing, so it is a
  build error, not a style issue.
- No invented EUR prices: DE pages cite the sourced US retail range and
  point at popmart.com/de live listings for euros.
- Deploy self-check extended to assert the three /de/ pages 200 + zero
  redirects.
- PRE-REGISTERED SUSPENSION ITEM (report every round until cleared): the
  DE PartnerNet Websites list must include thedollscout.com — same lesson
  as the eco/US listing of 08-28; unlisted sites risk commission
  invalidation. DE links are live per owner's explicit instruction, but DE
  revenue counts as unconfirmed until the listing is done (~1 owner-minute).
- D1 attribution needs no change: affiliate_click stores the target
  hostname, so .com vs .de clicks separate cleanly in the ledger.

## 2026-08-30 (round 3) — owner: "是不是有门禁，都解掉" + "参照eco站点再优化"

THE GATE FINDING, for the fleet's permanent record: the deploy pipeline had
been RED since 08-22 — runs #13-#20 all failed in seconds at the
build-data-page anchor gate (a hand edit broke a generator anchor). Every
GEO/SEO/IndexNow improvement committed 08-25..08-27 (the IndexNow push
mechanism's sitemap targets, the vendor-check page, hot-picks baking) NEVER
reached production; the weekly IndexNow job was meanwhile submitting URLs
that 404'd live. "We did everything and got no traffic" was literally true —
the work was landing in a frozen deployment. Lesson: a red deploy is a
silent gate unless something screams; the pivot's rewritten pipeline has no
generator chain left to rot, and the fleet should treat "last successful
deploy date" as a first-class health metric.

Other gates settled: adult classification signals (RTA header / adult meta /
age gate) died with the takedown; run #21 deployed the new site (all 6 pages
+ robots + sitemap 200, zero redirects), and the one red — /scam-check still
200 — was edge-cache latency, confirmed by dispatch run #22 going fully
green including the retired-pages-404 assertions.

eco-port optimization round (this commit):
- /data/ surface: labubu-fake-signals.json (CC-BY, per-signal sources,
  limitations) + /data/ index with Dataset JSON-LD. Grounds: the old site's
  ONLY Google click landed on /data/, and eco's dataset surfaces are its
  AI-crawl magnets.
- fake-check EN+DE: one Ad-labelled "skip the checklist" exit block
  (official storefront, marketplace-correct tags; popmart.com linked
  unmonetized beside it) — eco's lesson that a wedge page with zero anchors
  gives a convinced reader nothing to act on. Footer disclosure updated to
  match reality.
- Next: IndexNow MODE=all full registration of the new URL set right after
  this deploys.

## 2026-08-30 (round 3 addendum) — owner completed the GSC step

Owner's screenshot: sitemap.xml resubmitted in Google Search Console,
status Success, last read 2026-08-30 (same day), 7 pages discovered = the
new site's complete URL set (3 EN + 3 DE + /data/). With IndexNow MODE=all
already accepted by Bing/Yandex/Naver/Seznam, every discovery lane is now
formally re-opened on the new content. What remains outside our hands:
Google's SafeSearch reclassification latency (unknowable, pre-registered),
and the DE PartnerNet Websites listing (suspension item, unchanged).
Measurement cadence: D1 weekly reads against the 2026-10-29 judgement line;
GSC coverage/impressions are owner-side screenshots when convenient.

## 2026-08-30 (round 3 close-out) — owner: "已经提交站点地图和bing、联盟已加"

All three owner-side items cleared in one day: GSC sitemap (read same-day,
7/7 pages discovered), Bing WMT sitemap submitted, and thedollscout.com
added to the DE PartnerNet Websites list — the suspension item is RESOLVED,
DE-side commission attribution is now confirmed on both marketplaces.
Nothing is pending on the owner. The machine loop from here: daily trends
fetch on the labubu seeds (first data next runner cycle), weekly IndexNow
delta, daily D1 snapshot, judgement line 2026-10-29.

## 2026-08-30 (round 4) — owner: "首页缺少图文、youtube等内容，太简陋了，还缺少吸引人的工具。真假不应该是最核心痛点，应该是流行和稀有程度"

Repositioning + enrichment, shipped same-session:

1. CORE PAIN POINT MOVED: rarity/popularity now leads, authenticity
   supports (the bridge is real: the rarer, the more faked). New flagship
   /rarity + /de/rarity — reported secret odds per series format (1:72
   six-figure, 1:144 twelve-figure, 1:120–1:168 collabs, 1:720 glow;
   sources: Tech-Insider, GlobalTill, Popboxss, all 2026), with the
   explicit rule that the box's printed odds outrank every table.
2. THE TOOL: Secret Pull Calculator — printed odds + N boxes → P(≥1
   secret), plus boxes-for-50%/90%. Pure client math, honest independent-
   draw caveat vs sealed-case allocation. The "85% in 12 boxes" claim
   floating in sources is NOT repeated (independent math says 15.5% at
   1:72×12; we publish the math, not the folklore). New D1 event odds_calc
   (whitelisted server-side), fired on first USER interaction only — never
   on render (eco's CI-pollution lesson, client-side edition).
3. HOMEPAGE ENRICHED (EN+DE): original inline-SVG hero (own artwork, no
   Pop Mart imagery — trademark rule), icon cards, official-series card
   strip linking popmart.com listings, and two REAL YouTube unboxing
   embeds (IDs from live search results, never invented) in
   youtube-nocookie privacy mode with a privacy-page disclosure.
4. Judgement lines: odds_calc ≥5 real interactions in 28d (by 09-27) →
   tool earns expansion (per-series presets); 0 → tool stays but stops
   getting rounds. Rarity page joins the standard page line (referral or
   AI-fetch streak by 09-27).

## 2026-08-30 (round 5) — owner: "增强图文吸引力，工具凸显" + mid-round "现在的风格是不是太重了，不适合labubu的年轻人？"

Full visual re-anchor, and the owner's mid-round correction changed its
direction: the first pass toward dark neon was scrapped in place because
the observation was right — every dark theme on this domain is inherited
gravity from the adult site, and Labubu's audience is young, pastel,
sticker-culture. New anchor (per the frontend-design skill discipline):
LO-FI — paper-yellow surface, zine/scrapbook energy, rotated sticker
cards with tape corners, colliding system fonts, riso misregistration
reserved for REAL numbers only ("1:72" as a crooked sticker; the
calculator result). No webfonts added; system stack IS the anchor.

Tool prominence: the Secret Pull Calculator now sits front-and-center on
BOTH homepages as a taped clipboard panel, plus a single-hue labeled bar
row ("boxes for a 50% shot": 50 / 83 / 100 / 117 / 499 — derived math,
recorded 2026-08-30) on homepages and rarity pages. Calculator extracted
to shared js/odds-calc.js consumed by all four pages — the per-page copy
risk (eco's injector lesson) is gone; odds_calc still fires on first user
interaction only. Judgement lines unchanged from round 4.

## 2026-08-30 (round 6) — owner: "labubu官网风格同频"

Third and final visual anchor of the day: SWISS-COMMERCE LIGHT — pure
white surface, one sans family, hairline rules, generous whitespace, a
single deliberate red (#e4002b), left-aligned type, and huge tabular
numerals as composition elements. This is the official store's register
(white / black type / red accent / rounded product cards) matched in
VIBE only: no Pop Mart logo shapes, no mascot artwork, the not-affiliated
line stays on every page — impersonation is the red line 同频 must never
cross. The Lo-Fi zine pass (round 5) lasted one round; the trajectory
(inherited-dark → paper-zine → swiss-light) is recorded in CLAUDE.md with
a "stop oscillating" note. Tool stays front-and-center: red-top-border
card, red glowing result; bars now single-hue red. All shared components
(odds-calc.js, hreflang, tags, gates) untouched — this round is a pure
token-layer restyle plus SVG recolor, zero content or contract changes.

## 2026-08-30 (round 7) — owner: "先优化prompt再执行：调用技能做好seo，geo流量优化，做厚网站，另外mcp等也增强"

Ran prompt-optimizer first (site rule), then executed against the
optimized prompt. Four workstreams, all shipped in one deploy:

1. **做厚 (site depth)**: two new content page pairs. /how-blind-boxes-work
   (+/de/) — the mechanics page: series structure, what printed odds mean
   across N boxes, sealed-case caveat, four buying formats, the traps;
   FAQ LD with 4 Q&As matching visible text. /glossary (+/de/) — ten
   plain-language definitions (blind box, series, regular, secret/chase,
   printed odds, case, glow/ultra, vinyl plush pendant, Lafufu, seller of
   record); DefinedTermSet LD. Both cross-link the evidence pages and
   link no store. Site: 5→7 content pages per language, 9→13 sitemap URLs.

2. **GEO**: llms-full.txt now generated at deploy (build-llms-full.mjs,
   12 pages, ~60KB, exit-0-always per the freeze lesson) and llms.txt
   rewritten to the rarity-first framing with both datasets + MCP listed.
   Second CC-BY dataset published: data/rarity-odds.json (format odds +
   boxesFor50pct derivations); /data/ index now carries two Dataset LD
   nodes. og:image existed on zero pages this morning — now all 12 pages
   carry the self-drawn Swiss og.png (1200×630) + twitter:card.

3. **MCP 增强**: /mcp rebuilt for the Labubu site — 3 read-only tools
   (labubu_rarity_odds, labubu_fake_signals, secret_pull_probability),
   answers read from the published /data JSON at request time (no third
   source of truth), recording dates + limitations travel with every
   answer, no affiliate links in tool output, /.well-known/mcp.json
   discovery doc. Collision fixed: '/mcp' and '/llms-full.txt' removed
   from the middleware's retired-410 list — both are live paths again.

4. **Deploy hardening**: self-check grows from 11 to 19 URLs (new pages,
   both llms files, og.png, rarity dataset, mcp.json discovery) plus an
   MCP smoke test (initialize must return protocolVersion; the calculator
   tool must return ~15% for 1:72×12 — deterministic math, so a wrong
   answer is a real failure). IndexNow EXTRA now includes /llms-full.txt.

Judgement lines (pre-registered): (a) new pages join the standard page
line — first search/assistant referral or AI-crawler fetch streak by
09-27 or they stop getting rounds; (b) MCP: first non-CI tools/call by
09-27 → note it and keep; zero by then → endpoint stays (costs nothing,
no schedule) but gets no further investment; (c) llms-full.txt fetches
by named AI bots appear in the D1 bot log — if the bot table shows GPTBot/
ClaudeBot/PerplexityBot reading it within 28d, GEO surfaces get the next
round; if only Googlebot ever touches it, GEO investment pauses.

## 2026-08-30 (round 8) — owner: "站点tds需要再丰富并进化，现在太简单了，包括调研labubu群体心理画像，再看推荐内容"

Research first, pages second. WebSearch multi-source audience profile
written to content/audience-profile.md (permanent topic-selection input):
core buyer = women 25-34 (~60% female; Chain Store Age / DemandSage);
Gen Z is the TikTok discovery layer, not the committed-buyer layer
(UserTesting survey); parents are a distinct segment with their own
query ecosystem. Motivations: variable-ratio dopamine loop, secret
chase + set completion, bag-charm status signaling (celebrity
provenance), inner-child/ugly-cute appeal, community membership.
Serviceable pains: buyer's guilt and overspend (Guardian reporting;
China state-media warnings via NBC), fake anxiety, beginner confusion,
parent age/safety worry. Explicitly rejected angles recorded in the
profile: investment/appreciation content (site rule 4) and
quit-addiction framing (we do budget math, not diagnosis).

Two page pairs shipped from the profile:
1. /start + /de/start — the beginner/parent page: three-decision
   structure (format → series → channel), formats table, first-buy
   checklist, straight-talk parents section (official age listings are
   the authority; counterfeits bypass the safety chain; agree the box
   count before the store). Highest buyer intent on the site; one
   Ad-labelled storefront line per marketplace, tags marketplace-correct.
2. /psychology + /de/psychology — the differentiation page: the
   variable-reward mechanics sourced (Mental Floss, Rowan Center, Young
   Post), the wanting explained without judgment (CBS, FASHION,
   Refinery29, NBC), the two lies of the loop, and the CHASE-COST
   REALITY tool (js/cost-calc.js, shared EN/DE): user enters their local
   box price (we never print prices), gets expected cost of pulling a
   secret (N boxes at 1:N, geometric) vs a 50% chance. New D1 event
   cost_calc, first-user-interaction only, whitelisted in ev.js.
   No affiliate links on the psychology page at all — trust is its yield.

Surfaces updated: homepage cards (4-card second grid now), sitemap
13→17 URLs, urls.txt, llms.txt, llms-full PAGES 12→16, self-check
19→23 URLs, #series anchors on both homepages.

Judgement lines (pre-registered, 28d by 09-27): (a) /start joins the
standard page line — first search/assistant referral or AI-fetch streak,
plus it is the page most likely to earn the site's first affiliate_click
(highest intent); if /start gets human pv but zero storefront clicks,
the storefront line placement gets ONE revision, not a redesign.
(b) cost_calc ≥3 real uses → psychology page earns expansion (per-series
presets); 0 uses AND 0 AI fetches → the tool stays but the page stops
getting rounds. (c) Profile is falsifiable: if D1 referrals show a
decisively different audience shape (e.g. male-skewed search terms,
zero parent-query landings), audience-profile.md gets revised from
data, not defended.

## 2026-08-30 (round 9) — owner: "站点快速再扩展，对比同类型网站要有独特性" + mid-round "支持中文，和海外卖的最好区域语言，增加搜索型号的工具？"

Competitor scan first (content/competitive-gaps.md): the whole category —
labubu.directory, labubucollector.com, labubusuperfans.com, the Fandom
wiki, e-commerce blog listicles — is static directories and checklists.
Nobody has an interactive verdict tool, an odds-first axis, open data, an
honest budget angle, or language pairs. Recorded as the site's lane with
an explicit "don't compete on catalogs" rule (no image rights, endless
churn, 63-series incumbents).

Shipped against those gaps, all tools with shared JS + per-language
strings baked in HTML:
1. /checker + /de/checker — the 8-signal dataset as an interactive
   wizard: pass/fail/unsure per check, failing checks listed BY NAME,
   three honest verdicts (red flags / inconclusive / "no red flags
   found — not a guarantee"). No scoring: fake precision would be
   fabrication by arithmetic. Event checker_use.
2. /finder + /de/finder — three answers (use/vibe/chase) → one current
   official series, linked to Pop Mart's own listings; chase=secret
   routes through the chase-cost calculator first. Event finder_use.
3. /lookup + /de/lookup — the owner's "型号搜索" ask: instant filter
   over a curated per-entry-sourced identity index (Labubu 9-teeth/no
   tail vs Zimomo larger/spiked-tail vs Mokoko pink/heart-nose — the
   verified separators; Big Into Energy's Love/Happiness/Loyalty/
   Serenity/Hope/Luck + secret ID; formats; terms). Entries state only
   what named sources support; empty result says "not in our index ≠
   doesn't exist". Event lookup_use.
4. /zh/ + /th/ — single-page editions (hero + shared calculator with
   localized strings + math-in-three-sentences + condensed 8 checks +
   channel rule). Thai chosen as "海外卖得最好" by evidence: Thailand is
   Pop Mart's top overseas market (SEA = 41% of international revenue
   H1'24; world's largest store at ICONSIAM Bangkok — kr-asia, Caixin,
   Nation Thailand). Monetization mapping: zh → amazon.com storefront
   (US-listed site, compliance follows the Associates site list, not
   page language); th → zero affiliate links, stated on-page.

Surfaces: homepages get a tools row + zh/th nav links + 4-language
hreflang on the homepage group; sitemap 17→27, urls.txt, llms.txt tools
+ languages sections, llms-full PAGES 16→24, self-check 23→33 URLs.

Judgement lines (28d, by 09-27): (a) tools — first non-CI checker_use /
finder_use / lookup_use each noted; if all three stay at zero while the
pages get human pv, the tools row placement gets one revision; if the
pages get no pv at all, it's a discovery problem, not a tool problem —
don't touch the tools. (b) /zh/ and /th/ — each language's human pv and
referral source tracked separately; a language crossing DE-region pv
triggers the full-pair upgrade per CLAUDE.md; both flat at zero by 09-27
→ record that language packs without language-market discovery lanes
don't self-start, and stop adding languages. (c) competitive-gaps.md is
the standing filter: any proposed page that lands in none of the 5 gaps
gets rejected in triage, and that rejection is logged, not debated.

## 2026-08-30 (round 10) — owner: "调用geo等手段多轮深度优化"

Deep GEO pass, audit-first. The audit came back better than assumed —
every core page pair already carries a first-screen answer callout and
FAQ LD (the round-7 work held) — so this round fixed the three real
gaps instead of re-plowing:

1. **Extractability**: /glossary and /de/glossary DefinedTermSet LD now
   enumerates all 10 terms as individual DefinedTerm entities (name +
   description matching the visible text) — the extraction unit for
   "what is a lafufu / printed odds / chase" definition queries, in
   both languages.
2. **Machine-readable**: third CC-BY dataset data/labubu-glossary.json
   (10 terms, aliases, per-term evidence links, limitations); /data/
   carries a third Dataset LD node and its card. MCP v2.1.0 adds the
   fourth tool define_labubu_term(term) — exact-then-substring match
   over term+aliases, unknown terms answered honestly with the
   available list, definitions read from the published JSON at request
   time (no third source of truth). Discovery doc updated; deploy smoke
   now also asserts define_labubu_term('lafufu') mentions counterfeit.
3. **Crawler paths**: robots.txt now names the full ai-seo-skill bot
   roster — added OAI-SearchBot, ChatGPT-User, Claude-User,
   Claude-SearchBot, Google-Extended (GPTBot/ClaudeBot/PerplexityBot/
   GrokBot/xAI-Bot were already named). Self-check +1 URL
   (/data/labubu-glossary.json → 34); llms.txt lists the third dataset
   and fourth tool; llms-full rebuilt.

Judgement lines: these surfaces share the round-7 GEO lines (named AI
bots reading llms-full/datasets in the D1 bot log by 09-27 gates the
next GEO round). New sub-line: if the MCP log shows define_labubu_term
as the first externally-called tool, that's evidence assistants want
definitions over numbers — the next dataset should be the character
identity index (lookup entries), not more odds math.

## 2026-08-30 (round 11) — owner: "调用geo等手段多轮深度优化"

Ran a 157-agent, nine-lens audit (structured data, extractability, crawl
mechanics, agent files, i18n, internal linking, E-E-A-T, no-JS readability,
query gaps) with three adversarial verifiers per finding and a completeness
critic. 45 findings survived, 4 were refuted. The important result is not
the count — it is that **five of the confirmed findings were live bugs this
session shipped, and three of them were silent**.

### Silent breakage found (all mine, all shipping green)
1. **scripts/indexnow.mjs referenced an undefined `urls`** and threw on every
   deploy SINCE THE PIVOT. The step carries continue-on-error, so a crashing
   IndexNow push looked exactly like a working one in a green run. Not one URL
   of the new site was ever pushed to Bing/Yandex/Naver/Seznam. Repaired, plus
   ::error:: annotations so a non-blocking step still shouts, plus the machine
   surfaces (llms.txt, llms-full.txt, mcp.json, 3 datasets) added to the push.
   **Rule: a step allowed to fail must be made loud, or it is not a step.**
2. **The weekly IndexNow job was a permanent no-op from 2026-09-08.** It ran
   MODE=delta against sitemap lastmods that are static, and printed the empty
   result as "the normal quiet outcome" — self-camouflaging. Weekly now runs
   MODE=all (27 URLs/week is nothing); delta warns if it submits zero.
3. **functions/_middleware.js isContentPath() never matched extensionless
   paths**, so 20 of 25 published pages could not produce an ev='bot' row.
   CORRECTION TO THIS SESSION'S OWN REPORT: earlier today I read the D1 bot
   log and reported "every AI crawler stopped at the three entry points".
   That was a measurement artefact — those were the only paths the logger
   could see. The part that stands is narrower and still real: llms.txt,
   llms-full.txt and the /data/*.json files DO have extensions, were
   loggable, and were fetched zero times.

### Self-rule violations found (the rule existed; nothing enforced it)
4. **16 of 48 FAQ Q&A pairs existed only inside JSON-LD** — every one on
   /start and /psychology, EN and DE, written in round 8. Then round 10's
   DefinedTerm entities repeated the same mistake: 18 of 20 descriptions were
   paraphrases, not the visible sentence. All 68 entries now match visible
   text verbatim, and **scripts/check-structured-data.mjs is a blocking deploy
   gate** — entity-decoded, quote/dash-folded, whitespace-stripped comparison,
   because a gate that cries wolf gets disabled and a disabled gate is how
   this got in. Pattern worth keeping: *a rule written in CLAUDE.md with no
   executable check is a wish.*
5. **`.card { display: block }` silently defeated `el.hidden`** (class
   selector beats the UA stylesheet), so the Model Lookup filter shipped two
   rounds ago never hid anything and could show "no match" above 12 visible
   cards. One `[hidden]{display:none!important}` line fixes it.

### GEO substance shipped this round
- llms-full.txt now **keeps every link URL inline** (the site's whole
  "named, dated source" promise previously arrived as unlinked prose in the
  one file engines read whole), **strips conditional UI states** (the checker
  had all three mutually exclusive verdicts in the DOM at once — quotable as
  a self-contradiction), and its header facts are **computed from
  .well-known/mcp.json and data/** instead of typed (the typed header was
  republishing "3 tools / EN then DE" long after 4 tools and 4 languages).
  Affiliate tags are stripped from it, matching the MCP no-affiliate rule.
- **Discovery**: nothing on the site pointed at /llms.txt. Every page now
  carries `<link rel="alternate" type="text/plain">` for both llms files and
  robots.txt names all five machine surfaces.
- **Linking**: not one of the 8 evidence pages linked any of the 3 tools.
  All 14 EN+DE evidence pages now do; the two "related links" slots wasted on
  `/` are gone.
- Third dataset + 4th MCP tool wired into the self-check; ItemList on the
  8-point check; WebApplication on the four calculator pages; Article image;
  distinct @id per Dataset; nested `<a>` inside `<a>` removed from all three
  dataset cards; CORS on the datasets; legal pages into sitemap/urls;
  /finder's recommendations now ship visible (were 100% `hidden` = invisible
  to crawlers); unsourced "sixty-plus series" replaced with honest wording;
  12 source names per lookup page turned into real links.

### Ledger (2026-08-30, CI excluded)
human_pv 33 | bot 29 | **affiliate_click 1 — the site's first**, from the EN
homepage, US, outbound to amazon.com. One click, not a sale: it proves the
funnel is wired end to end, nothing about conversion. It does satisfy one of
the three pre-registered 60-day conditions on day zero.
Crawlers seen: YandexBot 15, Googlebot 5, Bingbot 4, OAI-SearchBot 3,
GPTBot 1, ChatGPT-User 1 (a live user-triggered fetch through ChatGPT).
ClaudeBot and PerplexityBot: not yet.

### Judgement lines
(a) IndexNow: the next deploy's log must show a 200/202 with 31 URLs. If it
does not, the lane is broken at the endpoint, not the script.
(b) Bot log: with extensionless paths now recorded, the 7-day bot table
should show content pages, not just entry points. If it still shows only
entry points by 09-06, crawlers really are bouncing and the problem is
authority, not instrumentation — that would be the first evidence for it.
(c) llms.txt/llms-full/dataset fetches by a named AI bot by 09-27 gates the
next GEO round, unchanged from round 7.

## Round 12 — 2026-08-31 · 定时任务按重做后的站点重建

Owner:「tds的定时任务重做，因为站点重做了」+「旧的取消」。

**取消**:Routine「DollScout growth loop (every 2 days)」(`0 1 */2 * *`) 已删除。
它整条 prompt 写的还是成人站,护栏里明写「绝不削弱 18+ 闸门、联盟披露与
childlike-appearance 拒绝项」——对一个卖 Labubu 的站,这条护栏本身就是错的方向。
它还依赖两个 pivot 时删掉的文件(`GROWTH-LOOP.md` 是它「先读这个,它覆盖一切」的
剧本,`scripts/seo-audit.mjs` 是它第 2 步的技术底线)。最后一次运行 08-31T01:04
跑了 10 分钟、报「SUCCEEDED」、对 `sites/thedollscout/` **一个字节都没改**。

**新建**:「DollScout(Labubu 站)增长循环 · 每 2 天」,`10 7 */2 * *`,每次开新会话。
写进 prompt 的现实:monorepo 路径与部署模型、CLAUDE.md 作为剧本、5 缺口准入过滤与
「不卷图鉴/不做转售炒价」、双 tag 分市场与 `/th/` 零联盟、阻断闸门
`check-structured-data.mjs`、以及三条预登记判定线的日历(09-06 / 09-27 / 10-29)。
关键约束:**它触发的会话没有 MCP 连接器**——读 D1 只能靠仓库里的快照,验线上只能
`curl` 实探,Actions 日志读不到;prompt 要求它把读不到的项明写成「本轮未验证」,
不许当绿灯。

**顺手挖出第四个静默故障**(和 08-30 那三个同族):`tds-traffic` 的 D1 快照导出把
stderr 送进 `/dev/null`,失败时打印「d1 snapshot skipped (no D1 access on token)」
——**那句话是猜的**,真正的错误被丢掉了。后果:08-19→08-30 连续 12 天全绿,
`content/d1-snapshot.json` 一次都没落过库,而它正是新 Routine 读真实数字的唯一通路。
本轮改为直连 D1 REST API(database id 取自 wrangler.toml,不再耦合 wrangler 配置)、
打印真实 API 错误(长串 sed 打码)、失败与「查到 0 行」两种情况分别发 `::warning::`。

**其余三条 tds workflow 复核结果:无需改动。** deploy(run #33 全绿)、
tds-indexnow(08-30 已修成 MODE=all)、fleet-trends(仍在写两个 tds 趋势文件)。
另记一条环境事实:公开仓 schedule 实测延迟 5–12 小时(08-28 那次 06:00 的任务
18:22 才跑),**任何跨 workflow 的时序假设都不成立**,下游必须自查数据新鲜度。

### Ledger (2026-08-31 01:20 UTC 现查 D1,CI 已剔)
08-30:真人 pv **84** | bot **101** | affiliate_click **1**
08-29:真人 pv 10 | bot 18 ‖ 08-28:真人 pv 13 | bot 9 ‖ 08-31 至今:bot 3
08-30 的 84 次真人 pv 里含当天大规模自测流量,**不要当成读者增长读**;
下一轮用 d1-snapshot 按路径拆开后再判。

### Judgement line (d) —— 当天就跑出了答案,负面,已定位
不等 09-02,直接 workflow_dispatch 跑了一次(run #17)。快照**仍然没落库**,但这次
失败是**可读**的,这正是本次改动的全部意义:

```
##[warning]d1 snapshot FAILED (HTTP 403) …
{"success":false,"errors":[{"code":7403,"message":"The given account is not valid
 or is not authorized to access this service"}]}
```

定位:**同一个 `CLOUDFLARE_API_TOKEN` 每天都在成功跑 `wrangler pages deploy`**,
所以 `CLOUDFLARE_ACCOUNT_ID` 是对的、token 本身是有效的——缺的就是 **D1 的读权限**。
旧代码那句「no D1 access on token」这回**碰巧猜对了**,但它当时没有任何证据,
而且顺手把真错误删了;十二天里没人能分辨它是猜对还是猜错——这才是它的罪名。

**⚠️ owner 待办(约 1 分钟,不挡站点运行,但挡整个增长循环的眼睛)**:
Cloudflare 后台 → API Tokens → 编辑部署所用的那个 token → 加上
**Account · D1 · Read** → Save。加完后 tds-traffic 的下一次运行就会开始提交
`content/d1-snapshot.json`,新 Routine 也就有真实读者数字可读了。
**在此之前,新 Routine 每轮都必须把「D1 快照不可读」当作机制故障报出来,不许绕过。**
(本会话的 Cloudflare MCP 走的是另一套凭据,能读 D1——所以上面那份 08-30 台账是
真实数字;但定时会话没有 MCP,它读不到。)

### 追加(同日,owner 追问「Cloudflare 我不是一直在用吗」)—— 推断已升级为证据
合理的追问,而且上面那条结论当时确实是推出来的。403/7403 至少有两个成因:token 缺
D1 权限,或 `CLOUDFLARE_ACCOUNT_ID` 指向的账号与 token 所属账号不是同一个。给失败分支
加了只打结论不打 ID 的诊断(公开仓),run #18 给出定论:

```
{"token_valid":true,"status":"active","errors":[]}
accounts this token can list: 1
CLOUDFLARE_ACCOUNT_ID is one of them: yes
```

**token 有效、账号对得上 → 7403 就是纯粹缺 Account · D1 · Read 这一项。**
为什么「一直在用 Cloudflare」和这个不冲突:三条路走的是三套凭据——①站点自己写 D1 走
`wrangler.toml` 的 **binding**,运行时直连,根本不经过 API token(所以埋点一直正常);
②会话读 D1 走 Cloudflare 连接器(另一套 OAuth 凭据);③GitHub Actions 走这个按项勾选的
API token,当初只勾了 Pages 编辑。**Cloudflare 的 token 是最小权限模型,不是「登录了就都能用」。**

**同族缺陷已在 bpj 侧一并修掉**:`deploy-baipiaoji.yml` 的 D1 快照步骤是一模一样的
`2>/dev/null` + 「snapshot skipped (no D1 access)」猜测,`sites/baipiaoji/data/traffic-snapshot.json`
同样一个提交都没有。已改为同样的直连 REST API + 真错误 + `::warning::`。
全舰队扫描确认只有这两处,没有第三处。

### 再追加(owner:「你换成舰队 agi 我配置的 cloudflare 的啊」)—— 凭据已穷举,结论完整
owner 指出本仓有多个 Cloudflare token secret,而我只试了一个就下了「要去加权限」的结论。
对的,那个结论只对那一个 token 成立。而且这条纪律仓里早就有:`scripts/cf-analytics.mjs`
的注释写明它为什么三个全试——历史事故正是「换了 token、重跑拿到字节相同的旧错误」的
假阴性。我在 D1 这条路上把同一个坑又踩了一遍。

改为逐个试之后,**当场又踩出第二个假阴性**:zone token 那一行报的是
`/accounts/null/d1/...` 的 404——`jq -r` 对空结果打印的是字符串 `"null"` 而不是空串,
所以「反查不到就退回 secret」永不触发,那个 token 看起来「已经试过」其实压根没测到 D1。
修掉 `// empty` + 显式滤 `"null"` 后重跑,三个 secret 的真实读数(run #21):

| secret | 结果 |
|---|---|
| `CLOUDFLARE_API_TOKEN_ZONE` | HTTP 403 · 7403 |
| `CLOUDFLARE_API_TOKEN` | HTTP 403 · 7403 |
| `CF_API_TOKEN` | 未设置 |

**本仓现有的每一个 Cloudflare 凭据都读不了 D1**,所以 owner 那一步动作仍然需要,只是
现在是穷举后的结论而不是单点推断。方法论教训记两条:①「我只试了手边那一个」在有多个
凭据时不构成结论;②**打印出来的失败也可能是假的**——`accounts/null` 那一行长得和真失败
一模一样,只有把 URL 也打出来才看得见。可读的失败仍然可能是错的失败。

### Judgement line (e)
**2026-09-02**:若 owner 已加权限,`content/d1-snapshot.json` 必须出现在仓库里;
若尚未加,新 Routine 的汇报里必须仍然带着这条待办,不许因为「站点看起来正常」而
把它悄悄降级。


## Round 13 — 2026-08-31 · 参考 eco 移植程序化出页(/odds/ 集群,12 页)

Owner:「参考 eco 快速扩展流量」。先读 eco 实际在做什么,而不是照抄印象。

**eco 的真实打法**(sites/getecoback):206 页里 131 个 guide,其中 40 页由三个
`gen_*.py` 从 JSON 数据脊生成(qm 系列 = 房间面积 × 品类);`build_*.py` 管 sitemap/
hreflang/互链/llms;`check_*.py` 是闸门。它的上量队列里写得很清楚:**「纯模板 pSEO
(无独立数据点)」是判死项**,每页硬门 ≥3 个独立数据点。它的差异化名场面是
GModG——**纠正一个被广泛复述的错日期**。

**不能照抄的那一半,如实说**:eco 的另一半是「rising 词 → 当天出页」。tds 的
`content/trends-rising.json` 08-30 重置后 runner 还没回填,`trends-us.json` 连续两天
`matched: []`(当日热搜面被体育/节日占满,舰队早已记录这个结构问题)。**没有 rising
信号就没有快反,这一轮只移植结构那一半**,不假装有需求信号。

**需求门的证据(WebSearch,多源)**:「多少盒能开出隐藏款」是真实查询族,已有 8 个竞品页
在做。**但整个 niche 在传错数字**——检索结果里同时出现「整箱 12 盒平均出一只隐藏」与
「12 盒有 85% 概率」。实算(1:72,独立抽取):**期望 0.167 只、概率 15.5%**。
两个说法都错,而且互相矛盾。这就是本轮的差异化支点,且是本站零编造基因最强的题材。

**出的东西**:
- `scripts/gen-odds-pages.mjs` —— 本站第一个生成器。概率**读已发布的
  data/rarity-odds.json**,不重新声明(同 MCP 的「不做第三个真相源」)。
- `/odds/` 集群 EN+DE 各 6 页(hub + 1/6/12/24/72 盒),每页 5 个独立数据点 +
  该盒数证伪的那条流传说法。**不点名任何竞品**;**零联盟链接**(决策页答案常是
  「别买了」,挂购买按钮会和 /psychology 自相矛盾,变现交给 /where-to-buy)。
- `data/pull-math.json` —— 第 4 个 CC-BY 数据集(缺口 3),完全由 rarity-odds.json 算出。
- 站点页数 **25 → 37**,llms-full 从 ~180KB 到 201KB。
- 入链:从 rarity/psychology/how-blind-boxes-work/index/start 的 EN+DE 共 10 页指入。

**三道防孤儿闸门**:生成器 wiring guard(URL 必须在 sitemap+urls.txt+llms-full 里)、
部署前的「重跑生成器且 diff 必须为空」、12 个 URL 进部署后自检。

**顺手修的第五个覆盖漏洞**:`check-structured-data.mjs` 的 walker 只递归 `de/`,
所以 `zh/` `th/` `legal/` `data/` **从来没被这个阻断闸门检查过**。修好后 68 → 92 条,
全部 0 影子内容(包括第一次被检查的那几页)。**闸门看不见的页,闸门就管不住。**

### 本轮预登记判定线
- **(f) 2026-09-30(30 天)**:/odds/ 12 页在 D1 里合计真人 pv ≥ 12(即平均每页 ≥1),
  或出现任一 AI 引荐/搜索引荐落在 /odds/ → 程序化出页这条路成立,按同样模式扩下一个
  数据脊;**合计 pv < 12 → 判负**,不再加盒数,把结论写成「本站的瓶颈不在页数」并停止
  铺量,转而做 rising 快反(届时 rising 数据应已回填)。
- **(g) 2026-10-15**:Bing/IndexNow 侧 12 页收录率 <30% → 问题在收录不在内容,先修收录
  再谈扩量(口径承 eco 的 45 天收录线)。

## 到期判定线结算 — 2026-09-11(owner:「这个站点一直没有流量」)

三条预登记线到期,按规矩先交答案,再谈别的。

### (b) 2026-09-06 爬虫是否只碰入口页 —— **判负预期落空,结论是「当初确实是测量假象」**
7 天爬虫表(09-04 起,剔 CI):

| 爬虫 | 抓取 | 不同路径 | 非入口页 |
|---|---|---|---|
| Googlebot | 83 | 36 | 54 |
| ClaudeBot | 59 | 44 | 40 |
| Meta-ExternalAgent | 53 | 39 | 51 |
| Amazonbot | 42 | 28 | 37 |
| Applebot | 38 | 36 | 33 |
| OAI-SearchBot | 25 | 15 | 16 |
| Bingbot | 22 | 5 | 7 |
| GPTBot | 19 | 7 | 8 |
| YandexBot | 38 | 6 | 3 |

**爬取深度完全正常,发现通路不是瓶颈。** 08-30 那句「爬虫只碰入口页」确实是
`isContentPath()` 不匹配无扩展名路径造成的假象——修好后立刻看见真相。

### (c) 2026-09-27 具名 AI 爬虫是否读机器面 —— **提前 16 天达标**
GPTBot 抓全了 4 个数据集 + llms.txt + llms-full.txt + /mcp;ClaudeBot 抓 3 个数据集 +
llms-full;Meta-ExternalAgent、Amazonbot 同类;Bingbot 抓了 /mcp 与 /.well-known/mcp.json。
**GEO 机器面这条路是目前唯一在真实运转的通路。**

### 真人台账(09-01→09-09 干净窗口,剔 08-30/08-31/09-10 的自测尖峰)
33 次真人 pv / 9 天 = **3.7/天**,其中 24 次(73%)停在首页,只覆盖 9 个路径。
**工具事件 12 天累计 1 条**——就是 08-30 自测窗口里那次 affiliate_click;
odds_calc / cost_calc / checker_use / finder_use / lookup_use **至今 0**。
(白名单与 js/odds-calc.js 的发射逻辑都复核过,代码没问题;是真没人点。)

### 引荐来源(09-01→09-11)——**本轮最有诊断力的一张表**
| 来源 | 真人 |
|---|---|
| bing.com | 5 |
| duckduckgo.com | 1 |
| **google.com** | **0** |
| 直接/无引荐 | 71(含自测日) |

**Google 每天来爬 36 个路径,11 天送 0 次引荐;Bing 爬得少得多却送了 5 次。**
这是「域名 18+ 历史包袱」假设的第一份证据,**但 12 天对 Google 本来也太新,现在
还不能定论**——分辨「没被收录」与「收录了不排」需要 GSC 曝光数,而 GSC 凭据一直
没配。**这是本站目前最大的盲区,也是最便宜的一步。**

### 一条不归因的信号
ChatGPT-User 累计 115 次,**全部打 `/`**,跨 19 天,起点 2026-08-22(早于转型 8 天)。
单一路径 + 高频 + 长周期,形状不像真实用户提问(那会打到各种路径)。仓里没有任何
workflow 会产生它。**归因不明,不许当需求读。**

### 自查:我造的一个缺陷
08-31 我生成的 /odds/ 12 页,H1/title 里一个 "Labubu" 都没有(「One box.」
「A full case of twelve.」)——搜 labubu secret odds 的人在结果里看到的是一句没有
实体的腔调。另一会话 09-04 修了(commit 0128162,21 页)。**修好才 6 天,Google 的
重爬与重评估窗口还没走完**,这一条会污染「域名包袱」的判读,记下来别混淆。

### 判定线 (f) 中期读数(复核日仍是 09-30)
/odds/ 集群 09-01 起真人 pv **5**(需 ≥12),bot 64。不提前判。

### 对我自己那条 60 天线的修正
预登记的三选一里,「search/assistant 引荐 ≥5」**已经达标**(bing 5 + ddg 1 = 6)。
但 3.7 pv/天不是生意。**诚实结论:这条线我当初定得太松,达标不构成「转向成立」。**
10-29 复核时以 28 天窗真人 pv 为准,不拿这个 6 去交差。

### 2026-09-14(总任务首轮,偶数日 tds 块)
- 机制体检:`check-structured-data.mjs` **92 条 FAQ/DefinedTerm,0 条不可见**;`build-llms-full.mjs`
  正常产出 37 页 205,569 字节(非降级)。autopilot 收据 09-13 本站 ok。线上 curl 实探与
  IndexNow/部署自检:本轮未验证(总任务在常驻会话跑,线上域被代理挡;部署自检以 Actions 为准)。
- `content/d1-snapshot.json` **仍不存在**(自 09-02)。机制故障,不是没数据;需 owner 给 deploy
  token 加 `Account · D1 · Read`。
- demand 09-13 gaps 13 条;top `monster hunter pop mart` v=25,850 指到 fake-check(match 0.5),
  `crumbl labubu ube dot cake` v=24,900。**本轮不出页**:前者是 Pop Mart 的另一 IP 联名,不在
  Labubu/The Monsters 稀有度定位内;后者是联名甜品热点,与 competitive-gaps 五个缺口都不对应。
- 本轮零新页;llms-full.txt 随构建更新一并提交。

### 2026-09-25：TDS Document Scout 转型上线

- Owner 明确要求跨行业重新定位并落地，已把首页转为专业 PDF 预检与批量交付工具。第一版 `c98f744bfa5915aead3976fb160423de78c9b4b9`，线上修正版 `e54ba5a20f6df83137225fb1de0e469c97dc67f9`，方法版本 `2026-09-25.2`。
- 两次部署均成功；最终 run：https://github.com/f-tiger/agi-site/actions/runs/36095700670 。33 个中英德页面、PDF 依赖资产、原会员与收藏品 URL、退役路径、IndexNow 提交和统计回读全部通过部署闸门。提交成功不等于搜索已收录。
- 12 项文档测试 + 8 项收藏品测试 + 11 项共享工具测试 + 8 项会员隔离测试通过；137 条 FAQ/DefinedTerm 可见内容匹配通过。修正了 PDF.js 6 的 MarkInfo Map 返回值，以及「两页都修改并插入一页」的错误位置配对；实际示例现在为 changed 1→1、added →2、changed 2→3。
- 真实浏览器：英文首页真实示例、自选三页文件的标题/语言/页数、中文分页提取、英文版本比较、德语手机批量审查均运行成功。390px 预览中中文页面 clientWidth=scrollWidth=375（预览滚动条占 15px），无横向溢出。未使用用户私人文件。
- 导出：JSON/CSV 序列化与安全性由测试覆盖；线上生成 `blob:` 本地保存链接且无站点脚本错误。当前云浏览器没有返回 download 完成事件，因此本轮未核验最终下载文件的字节。保留原生可见「保存报告」链接；不把按钮出现或链接生成写成下载完成。后续在能返回本地下载的浏览器验收此一步，不重复添加付费或上传功能。
- 新计量基线（`content/document-metrics.json`，2026-09-25T04:47:04Z）：tool_views=0，真实动作 events={}，doc_ci=2 单独排除。网页 QA 全用 ?ci=1；不把示例与发布检查算作用户增长。crawler_fetches 只是按日的机器人请求，首页可含当天转型前请求，也未核验每个调用来源，不能据此宣称已获取搜索流量。
- 每日记录复用原 tds-traffic 工作流；趋势种子替换，配额和 cron 数不变。`tds-documents-1023` 已登记 10-23 的 100 工具页访问 / 20 完整处理 / 5 导出学习门槛。新任务与旧 Labubu 60 天线分开读取；当前没有买家或收入验证。
- 基线补记：为核验交付链接，最后打开了一次无 `?ci=1` 的正式 `/zh/` 入口，产生 1 次 `doc_view`；这是已知发布验证访问，不是自然用户。已保留原始记录并更新快照，不删除数据。文档完成/导出动作仍为 0。09-25 仍在窗口内时，观察访问增量需扣除这 1 次基线；到 10-23 的 28 天窗口从 09-26 起，该访问会自然出窗。后续浏览器操作继续使用 CI 参数。
- 浏览器原生 `downloadMedia` 对报告保存链接返回完成；没有暴露下载文件路径，故仍维持上面的「未核验最终字节」结论。

## 2026-09-25 — unified document UI, discovery and safe sharing (edition 2026-09-25.3)

Owner requested unified frontend styling, SEO/GEO improvements and sharing. Deployed code: `5bad31f16947fc19dad7e0223d76a4429790da08`. All deployment gates passed: https://github.com/f-tiger/agi-site/actions/runs/36097273753 (job 107952064870).

- All 33 document pages share navigation, mobile tool tabs, balanced localized headings, page-sharing controls and publisher/citation treatment. Tool pages now show use case, output and limitations, with related guide links.
- Added localized intent titles, social metadata, Article/breadcrumb data, 33 linked plain-text versions and a 12-entry localized capability index. These reuse the visible claims and do not advertise a hosted PDF API. Sitemap home dates now reflect the content update; daily builds do not manufacture new dates. Full scope and sources: `docs/document-experience-2026-09-25.md`.
- User-triggered page sharing uses a fixed `via=share` source marker. Result sharing previews only aggregate counts, limitations and the public tool URL; file identifiers, titles, text, failure strings and notes are excluded. Native sharing is capability-gated; copy/selectable text remain available. Sample results are labelled and do not create real summary-share events.
- Validation: 14 document tests; local and production checks on all 33 pages, text versions, capabilities and assets; 137 FAQ/DefinedTerm entries matched visible text. Browser QA used `?ci=1`: Chinese desktop/home/link-copy/sample/summary-copy; 390px Chinese home; German batch sample and summary-copy; English comparison sample and summary preview (2 changed pages plus 1 insertion). Chinese iframe measured 375/375 CSS pixels with no horizontal overflow. German and English mobile surfaces inspected visually/through DOM. Browser-copy success UI and the exact preview payload were checked; the cloud browser has no native share target, so external delivery was not exercised. Logged browser errors were extension-origin, not site-origin.
- Measurement after release at 2026-09-25T05:10:33Z: `tool_views=2`, `events={doc_view:2}`, excluded `doc_ci=3`; no completion/export/share demand yet. The previous known launch QA view is still in that total. The second view has no proven acquisition attribution; do not call it organic growth. New events are `doc_share`, `doc_summary_share`, `doc_share_visit`; copies/native handoffs are not verified message delivery or unique people.
