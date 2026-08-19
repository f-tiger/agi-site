# Product Marketing Context

**Document version:** v4
**Last updated:** 2026-07-26

Foundation context for every marketing skill in `.claude/skills/`. Read this
before asking the user questions — most answers are already here.

## Product Overview

**One-liner:** The buyer-protection guide the doll industry doesn't want you to read.

**What it does:** DollScout (thedollscout.com) is an independent editorial guide
for people about to spend $1,000–$3,500 on an adult doll — a purchase where the
buyer has almost no reliable signal and a real chance of being defrauded. It
publishes its vetting criteria, applies them in public, prints criticism of the
vendors it earns from, and gives away four free tools that answer the questions
shops avoid: a 10-point scam check, a 60-second finder that asks about weight
before looks, a true-cost-of-ownership calculator, and a printable pre-purchase
checklist with no email wall.

**Product category:** Buyer's guide / product-research site. Customers do not
search for "buyer's guide" — they search for `is [shop] legit`, `tpe vs
silicone`, `import sex doll to [country]`, `sex doll scam`. That is the shelf.

**Product type:** Static content site (no accounts, no backend, no product
inventory). Zero build, deployed from git to Cloudflare Pages.

**Business model:** Disclosed affiliate commission. No paid placements, no
sponsored reviews, no email selling.
- **YourDoll** — cash-commission affiliate programme, param `?ref=Edison Thomas`,
  applied site-wide at runtime by `js/config.js` + `js/main.js`. Primary revenue.
- **Amazon Associates** — tag `ecoback0d-20`, accessories only (care supplies,
  storage, repair kits). Low value per click, high intent, useful for coverage.
- Every affiliate link carries `rel="sponsored nofollow noopener"`.

## Target Audience

**Target customer:** Adults 18+, majority US, then UK/EU/AU/CA. Considering a
first purchase or replacing a doll that disappointed them. Overwhelmingly
researching privately, often over weeks, with nobody to ask.

**Decision-makers:** One person. There is no buying committee, no budget
approval, and — critically — **no one they can consult without embarrassment.**
That isolation is the reason an anonymous, authoritative guide has value at all.

**Primary use case:** "I am about to send $2,000 to a website I have no way of
verifying. Tell me whether I am about to be robbed, and whether I am buying the
right thing."

**Jobs to be done:**
1. *Don't let me get scammed.* Verify the shop before I pay.
2. *Don't let me buy the wrong thing.* Match the product to my actual life —
   weight, space, upkeep, budget — not to the photo I fell for.
3. *Don't let me be surprised.* Total cost, customs, discretion, what arrives.

**Buyer segments** (these are the four outputs of the 60-Second Finder, and the
most useful segmentation we have):

| Segment | Constraint that decides it | Typical spend | Notes |
|---|---|---|---|
| Torso buyer | Weight, storage or budget makes a full doll a burden | $150–$700 | Lowest-risk entry; highest upgrade potential |
| Compact buyer | Wants full form, was honest about lifting | $600–$1,300 | Underserved — shops push flagships |
| Full-size TPE | Has strength and space, will do the upkeep | $800–$1,800 | Highest care-accessory attach rate |
| Full-size silicone | Budget allows, will not do a monthly routine | $1,800–$3,500 | Highest commission per conversion |

## Problems & Pain Points

**Core problem:** The category's defining failure is **broken trust**, not lack
of product. Buyers are spending four figures with no reliable signal.

**Why every existing source falls short:**
- Counterfeit shops resell shadow-factory copies using stolen catalogue photos.
- Review platforms are contaminated — paid five-star walls, and vendors who fix
  defects only in exchange for a rating change ("review extortion").
- Forum "approved vendor" lists are funded by the vendors they approve.
- Affiliate blogs rank whoever pays most, with no disclosed methodology.
- The shops themselves never surface weight, total cost, or upkeep burden,
  because those are the three facts most likely to stop a sale.

**What it costs them:** $1,000–$3,500 at risk per transaction, plus weeks of
lead time, plus a dispute process they must run alone. The most common bad
outcome is not total loss — it is a doll that arrives, is nothing like the
photos, and cannot be returned.

**Emotional tension:** Isolation. They cannot ask a friend, cannot read a review
they trust, and cannot admit the purchase to anyone who might sanity-check it.
Underneath the scam fear sits a quieter one: *am I about to make an expensive
decision I will regret and cannot undo?*

**Ranked pain points** (by frequency in owner communities):
1. Fear of being scammed — counterfeits, non-delivery, "doesn't match photos"
2. Not knowing who to trust — and distrusting the existing trusted-vendor lists
3. Price opacity — same doll at wildly different prices; **a huge discount is
   actually a counterfeit signal**, which is counterintuitive and load-bearing
4. **Weight** — the single biggest post-purchase regret. Almost no shop shows it
5. Material confusion — TPE vs silicone and what upkeep each really demands
6. Shipping and privacy — discretion, customs, card statement, damage
7. Hidden total cost — duties, care supplies, storage, repairs

## Competitive Landscape

**Direct — affiliate review blogs and "best sex doll sites 2026" listicles.**
Fall short because the ranking is the product being sold. No published criteria,
no disclosed relationships, no criticism of anyone they earn from. A reader who
has been burned once can smell this, which is exactly the reader we want.

**Secondary — forums and subreddits (The Doll Forum, r/SexDolls).** Genuinely
the best information in the category, and our most important non-competitor:
their approved-vendor lists are vendor-funded, the good answers are buried in
thousand-post threads, and nothing is organised for someone arriving cold with
one question. We do not compete with the community — we compete with the *effort
of reading it*, and the community is where our tools get cited.

**Indirect — going straight to a vendor's own site.** Fast, and how most buyers
do it. Falls short because every fact presented is presented by the seller. The
counterfeit shop and the legitimate one look identical at this stage; that is
the entire problem.

**Indirect — not buying at all.** A real competitor. Anxiety and cost opacity
push a meaningful share of researchers into indefinite deferral. Our tools
resolve that anxiety, which converts deferral into purchase.

## Differentiation

**Key differentiators (nobody else has these):**
- **Scam-Check** — interactive 10-point vendor checklist with a scored verdict.
  Signature counterintuitive hook: *a 50%+ discount is itself the scam signal.*
- **60-Second Finder** — asks about weight tolerance **before** looks.
- **True Cost Calculator** — the only total-cost-of-ownership model in the niche.
- **Import rules for 11 countries** — including the correction that the US $800
  de minimis allowance was abolished in August 2025 and indefinitely extended in
  June 2026, which most competing guides still get wrong.
- **Free printable checklist, ungated** — no email wall, and deliberately no
  affiliate links on the printable version.
- **Published vetting methodology** and criticism of our own recommended vendor.

**How we do it differently:** We publish the criteria first, then apply them in
public, and we name what we could not verify. We refused to publish brand pages
because we could not establish which of four "official" WM Doll domains is
genuine — sending readers to a possible typosquat is the exact harm this site
exists to prevent. We refused four more country pages because only retailer-SEO
sources were obtainable and publishing criminal-law claims on that basis is not
acceptable. Those refusals are recorded publicly.

**Why that's better:** In a market where every signal is purchased, the only
credible signal is one that costs the sender something. Criticising the vendor
you earn from, and publishing what you could not confirm, are expensive signals.
They cannot be cheaply imitated by a competitor whose ranking is for sale.

## Objections

| Objection | Response |
|---|---|
| "You're just another affiliate site." | Correct, and we say so on every page and in the footer. The difference is testable: our criteria are published, our commissions are disclosed, and we print criticism of the vendor we earn from. Check the ten points against us. |
| "How do I know the recommendation isn't bought?" | A vendor that fails vetting stays failed at any commission — stated on the methodology page. We also give away the checklist that lets you replace us entirely. If our advice were for sale, handing you the tool to check our work would be irrational. |
| "You only list one vendor — that's not much of a guide." | Deliberate. We would rather recommend one vendor we actually checked than rank twelve we haven't. The list is short because vetting is expensive, and it will grow at the speed we can verify, not the speed we can monetise. |
| "Why should I trust a site I've never heard of?" | Don't. Use the free tools without clicking anything, and take the printable checklist — it has no affiliate links on it precisely so you can carry it into a negotiation with someone else. |

**Anti-personas:**
- **Anyone seeking childlike products.** Hard refusal, no exceptions, at any
  commercial cost. We refuse to review, link to, or earn from them, and we drop
  and report vendors that stock them. This overrides everything else here.
- **Bargain hunters chasing 70%-off listings.** We tell them the discount is the
  scam. Some leave. That is the correct outcome — they are the population most
  likely to be defrauded and then blame the guide that warned them.
- **Explicit-content seekers.** No explicit imagery, ever. Wrong site.

## Switching Dynamics

**Push:** They found a shop with prices that seem too good, or they read three
"top 10" lists that contradict each other, or they have already been burned and
are not doing that again.

**Pull:** A scored verdict on the specific shop they are looking at, right now,
in two minutes, without giving anyone an email address.

**Habit:** Defaulting to Google's top result and assuming rank equals legitimacy
— which in this category is close to inverted, because the legitimate operators
cannot buy ads and the aggressive ones optimise hardest.

**Anxiety:** "Is this site also getting paid to say this?" The whole trust
architecture — published criteria, disclosed commissions, self-criticism,
ungated tools — exists to answer that one question before it is asked.

## Customer Language

**How they describe the problem (verbatim patterns from owner communities):**
- "is [shop] legit"
- "the doll doesn't look like the pictures"
- "am I getting scammed"
- "which vendors are actually authorized"
- "how heavy is it really"
- "will customs open it"

**Sourced verbatims from published reviews (collected 2026-07-27).** Reddit is
closed to our crawler, so these come from Trustpilot and comparable review
platforms — a narrower but attributable sample:
- *"the photos of the website appear highly manipulated since the actual doll
  is not even close"* — the listing-vs-reality gap, stated plainly.
- *"the worst thing about it all was the behavior of your company after
  receiving complaints"* — **the complaint is about the response, not the
  defect.** Defects are expected; abandonment is what buyers actually resent.
- Vendors advertising domestic dispatch to imply no customs while shipping from
  China; tax collected at checkout and never remitted, so the carrier bills a
  second time; flat "restocking" fees (~$150 reported) on made-to-order items
  never built; several hundred dollars of unrequested air freight added.

**What this changed on the site:** four post-payment traps added to the
Scam-Check, each with the question that defuses it before payment. These were
invisible from a product page, which is why a checklist built only from
listing-inspection missed them.

**Words to use:** vetted, verified, factory photos, authorized reseller,
counterfeit, buyer-protected payment, chargeback, total cost, weight, discreet.

**Words to avoid:** "hot", "sexy", "babe", any urgency theatre, fake scarcity,
countdown timers, exclamation marks, "amazing deal", "limited time". These are
the exact vocabulary of the shops we are warning people about — using them makes
us read as one of them.

**Glossary:**

| Term | Meaning |
|---|---|
| TPE | Thermoplastic elastomer. Softer, cheaper, porous, needs cleaning + powdering + oiling |
| Platinum silicone | Non-porous, firmer, best detail, longest life, minimal upkeep |
| Torso | Partial body (no legs, sometimes no arms). 5–30 lb, drawer-storable |
| Factory photos | Photos of *your specific doll* before dispatch, shipped only on approval |
| DDP / DDU | Delivered Duty Paid (seller covered import charges) vs Unpaid (you settle on arrival) |
| De minimis | Duty-free import allowance. US $800 allowance suspended Aug 2025 |
| Review extortion | Vendor fixes a defect only in exchange for changing a bad rating |

## Brand Voice

**Tone:** Plain, specific, unhurried. Concrete numbers over adjectives.

**Style:** Direct. We name what we could not verify. We criticise vendors we earn
from. We correct ourselves in public. No urgency theatre, no fake scarcity, no
exclamation marks. British-neutral spelling in prose.

**Personality:** Candid · precise · protective · unimpressed · accountable.

## Proof Points

**Be honest with downstream skills: there are no customer proof points yet.**
The site launched recently, has no traffic history, no testimonials, no
commission data, and no named customers. **Do not fabricate any.** Inventing
social proof on a site whose entire proposition is verifiable honesty would
destroy the only asset it has.

What can be cited today, because it is checkable:

| Theme | Proof |
|---|---|
| We publish our criteria | The 10 vetting criteria on `/trust.html`, identical to the checklist we give away |
| We tell you what we couldn't verify | Brand pages withheld over unverifiable WM Doll domains; four country pages withheld for lack of government-grade sources |
| We're ahead of the field on facts | US de minimis abolition (Aug 2025, extended June 2026) and Germany's €150 threshold (July 2026), sourced to the Federal Register and Zoll, while competing guides still say "under $800 is duty-free" |
| We don't gate what we promise | Printable checklist is free, ungated, and carries no affiliate links |
| We publish criticism of the vendor we earn from | `/picks.html` carries our own vendor's divergent ratings (Trustpilot ~4.0/214, Knoji 2.8/54, BBB unaccredited with complaints recorded unanswered), the recurring complaint themes, and which of our own criteria that partly fails — with links so the reader checks rather than trusts us |
| We publish numbers nobody else does | Height-to-weight chart from 33 real listings, method and exclusions disclosed |
| We don't sell your attention | Cookieless analytics, no ad pixels, no consent banner because there is nothing to consent to |

## Goals

**Business goal:** Sustained affiliate revenue — recurring monthly commission,
not a launch spike.

**Key conversion action:** `affiliate_click` (GA4). This is the only event that
maps to revenue. Secondary: `email_submitted` (owned audience),
`quiz_completed` / `scamcheck_scored` / `calculator_used` (intent signals that
precede a click).

**Current metrics:** GA4 (`G-2SEHFY33H8`) went live 2026-07-26 with eight
events. No meaningful data yet. Search Console was verified 2026-07-26, so
Google discovery is open — the structural block on organic is cleared, and the
site is now waiting on crawl and index rather than on permission.

**The four things sustained revenue actually depends on** (ranked by how badly
each is currently blocking):

1. **Traffic.** Paid search and paid social are closed to this category
   (Google restricts, Meta/TikTok prohibit). Growth is SEO + genuine community
   participation + email. Search Console is verified and the sitemap is clean,
   so discovery is no longer blocked — but a new domain with no backlinks
   ranks slowly regardless. **The binding constraint is now external
   credibility: citations and links from places the community already trusts.**
   That is earned by people, not by automation, and it is why the tools were
   built to be quotable.
2. **Owned audience.** The email list is the only asset no platform can take
   away. `newsletterAction` is unset, so no provider is connected yet.
3. **Vendor concentration.** One cash-commission vendor is a single point of
   failure: a programme change, a payout dispute or a vetting failure takes
   revenue to zero. A second vetted vendor is a revenue-continuity requirement,
   not a growth nicety.
4. **Conversion.** Now measurable for the first time. `affiliate_click.location`
   distinguishes whether the vendor bestsellers strip or the editorial content
   earns — that answers where to invest next.

**Constraint that shapes everything:** ads being closed to this category is an
advantage, not a handicap. Competitors cannot buy past us either, and the
differentiators here — tools, published methodology, verifiable honesty — are
precisely what organic and community channels reward.

## Changelog

*Newest first. One line per revision: what changed and why.*

- v4 (2026-07-27) — Added sourced buyer verbatims from published reviews and
  four post-payment fraud patterns they revealed; recorded that the top
  complaint is post-complaint abandonment rather than the defect itself. Added
  two proof points that now exist (published vendor criticism, the weight
  dataset). No positioning change — the research confirmed the positioning and
  supplied evidence it previously lacked.
- v3 (2026-07-26) — Search Console verified; Goals updated to record that the
  binding constraint moved from Google discovery to earning external citations
  and links. No positioning change.
- v2 (2026-07-26) — Moved to canonical `.agents/` path and expanded from the
  original 6-section brief to the full structure: added personas as buyer
  segments, competitive landscape (incl. "not buying at all" as a real
  competitor), objections and anti-personas, JTBD four forces, customer
  verbatims and glossary, and honest proof points. Rewrote Goals around what
  sustained revenue is actually blocked on, and recorded that no customer proof
  points exist yet so downstream skills do not invent them.
- v1 (2026-07) — Initial context at `.claude/product-marketing.md`: positioning,
  ranked pain points, monetisation, channel constraints, hard red lines.


## Positioning (sharpened 2026-08-02, monopoly-niche analysis)

**Category claim: the evidence-standard doll guide.** Every number sourced, or
marked unverified. The intersection nobody occupies: doll buying × verification
methodology, powered by recorded datasets (prices, weights) and statute-read
payment rights.

Why this is defensible: dollvendoraudit scores vendors (0–100, method mixes AI
inference); innerbody has authority and hands-on testing; neither publishes a
dataset, neither states an evidence standard, and neither can adopt one without
first deleting their own unsourced claims. The claim is cheap for us (we
already live it) and expensive for everyone else — the definition of a moat.

Expression: notice-bar sitewide ("Evidence-standard buyer's guide. Every number
sourced — or marked unverified."), Organization schema description, trust.html
standard callout, llms.txt preamble. Entry surface remains selection-first
(2026-08-02 relaunch); the evidence standard is the WHY-trust layer, not the door.

## Category (designed 2026-08-04, category-designer)

**Category name: doll purchase intelligence.**

**The shift.** Old category: *doll review site* — pick the best doll. That frame
is broken by the market's own structure: roughly ten factories make nearly
everything, they rarely sell direct, and dozens of distributors resell the
identical model. **The doll is the same wherever you buy it. What differs is the
price, the recourse, and whether the shop is real.**

**POV.** "Reviewing dolls answers a question the market already settled — the
factories decided that. The open questions are what you pay, what you can do
when it goes wrong, and who you are actually buying from. DollScout is doll
purchase intelligence: we audit the transaction, not the product."

**New buying criteria** (where we win by construction, and incumbents cannot
follow without changing their business model):
1. **Is this same model cheaper elsewhere?** — cross-distributor price
   transparency. Distributors cannot publish it; affiliates will not.
2. **What recourse survives after payment?** — statute-read, not forum advice.
3. **Can I check your claims?** — the dataset is published, CC BY.
4. **What do you earn, and from whom?** — conflict disclosed before the verdict.

Criterion that stops mattering: "which doll is best". Ten factories already
answered it; the shops are reselling the same catalogue.

**Lightning strike.** The same WM Doll 156 cm listed at **$1,499–1,599 at one
distributor and $1,699 at another** — an identical physical product, ~13% apart,
and no independent resource shows it. A search engine asked to compare them
concluded the comparison does not exist.

**Comparison reframe.** "DollScout vs [review site]" → "That compares a price
and recourse service to a product-opinion site. The doll is the same at both
shops. The question is not which doll — it is what you pay and what you can do
if it arrives wrong."

**Objection: "Isn't this just another affiliate review site?"** → Every other
affiliate earns from one shop and therefore cannot publish a table showing a
different shop is cheaper. We publish it, including the rows where we lose the
sale. That is not a claim about our character; it is a structural difference
readers can check against the published dataset.

**Truthfulness check (required before this framing ships anywhere):** the
factory-consolidation premise is observed, not assumed — innerbody documents
the manufacturer/distributor split, and the price spread was observed directly.
If a future check shows distributors materially differentiate the physical
product (different QC tiers, exclusive moulds), this framing weakens and must
be revised rather than defended.
