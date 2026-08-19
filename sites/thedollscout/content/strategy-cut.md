# The cut: same-model cross-distributor price transparency

Internal (`content/` is never published). Written 2026-08-04.

Owner's instruction: insight into demand, find the sub-niche inside the big
track, then cut precisely — either go for a high-traffic category or a
one-of-a-kind category.

**Answer: neither of the two obvious options. There is a third, and it is the
only one that is both high-intent and winnable from zero authority.**

---

## Why the two obvious cuts both fail

**"Go for the traffic" — the head terms.** `best sex doll`, `sex doll price`.
Held by innerbody.com: a mainstream health property with a medical review
board, hands-on purchases, dated updates and domain authority accumulated over
years. Vendor blogs hold the rest. We would be queuing behind an institution
with a page they update quarterly. **Unwinnable from 11 days old and zero
backlinks.** Volume you cannot reach is not volume.

**"Go for the unique" — the evidence standard alone.** We already own this
(shipped 2026-08-02). But "a doll guide that sources everything" is a *reason to
trust an answer*, not a question anybody types into Google. It converts and
defends; it does not attract. A category defined by its rigour has, by
definition, no search volume of its own.

---

## The demand insight the winner accidentally documented

innerbody's own page structure gives the market away. Their recommendation list
is split by role, and they stop to explain it:

> "Some of the companies in the above list are sex doll **distributors** (e.g.,
> Better Love Doll, SexDollPartner, Rosemary Doll), while others are
> **manufacturers** (e.g., FanReal, WM Doll) whose dolls you can buy through
> those distributors."

They needed a footnote because buyers are confused, and the confusion is
structural, not incidental:

- Roughly ten factories (WM, Irontech, Zelex, Starpery, FunWest, Piper…) make
  nearly everything in the category.
- Factories mostly **do not sell direct**. Dozens of distributors resell the
  identical model.
- So **the same physical doll is listed at materially different prices by
  different shops**, and the buyer cannot see it.

Their single most useful asset on that page is a cross-distributor price table
for the same model. That is the shape of the demand.

## The gap, confirmed by a search engine failing to fill it

Searching for a same-model cross-distributor comparison returned only vendor
product pages, and the engine's own summary concluded:

> "The search results were **limited for direct price comparisons across
> multiple distributors for the exact same model**. To find the cheapest option
> … I'd recommend comparing these two sites directly."

Spread observed in that one spot check: a WM Doll 156 cm at **$1,499–1,599**
at one distributor versus **$1,699** at another — roughly 13% on a four-figure
purchase. Nobody publishes the comparison.

## Why nobody has built it — and why that is the moat

Not difficulty. **Incentive.**

- **Distributors cannot** publish it: it would show when they are not cheapest.
- **Affiliate sites will not** publish it: they earn from one shop, and an
  honest table would route the reader to a competitor's shop on price.

We are an affiliate too. The difference is that we already publish criticism of
our own vendor with the conflict disclosed first, and we already publish the
dataset behind our claims. **A table that sometimes says "our vendor is not the
cheapest for this model" is the most expensive sentence a competitor could
copy, and the cheapest one for us to write** — it is the position we already
took.

## The cut

**Same-model, cross-distributor price transparency for the ~10 factories that
actually make these dolls.**

| Test | Verdict |
|---|---|
| Real search demand | Yes — model-level queries (`WM doll 156cm price`, `[model] cheapest`) are typed by people holding a card |
| Head not yet fixed | Yes — results are vendor pages only; no independent resource exists |
| Winnable without authority | Yes — this is a data problem, not a reputation problem. A correct table beats an authoritative essay |
| We have unique raw material | Yes — the scraper, the dataset pipeline, the published-limitations habit |
| Defensible | Yes — blocked by everyone else's incentives, not their capability |
| Volume | Long tail, but each query is one buyer at the decision moment |

**This is a sub-niche of the high-traffic track (selection/price) that behaves
like a unique category (nobody occupies it).** That is the precise cut: not
choosing between the owner's two options, but finding where they overlap.

## Non-negotiables for the build

1. **Publish it even when we lose.** If a distributor we earn nothing from is
   cheapest for a model, the table says so, in the same type size. The moment
   we suppress one row, the whole site is worth nothing.
2. **Prices are dated and drift.** Every figure carries its recording date;
   bands and rank order are the durable claim, exact numbers are a snapshot.
3. **Compare like with like or not at all.** Distributors bundle different free
   upgrades (standing feet, gel breasts, EVO skeleton). A price table that
   ignores inclusions is misleading, so inclusions get a column — or the row is
   marked not-comparable.
4. **Adult-form only**, as everywhere else. Height guard stays in the scraper.
5. **Vendor vetting still gates recommendation.** Cheapest is not the same as
   safe; a low price at an unvetted shop gets the price shown and the vetting
   status shown next to it.

## Build order

1. Generalise `fetch-specs.mjs` to multiple distributors (vendor registry with
   per-site selectors) — the scraper already handles one.
2. Match listings to factory model across distributors (brand + height + cup +
   head code from titles). **Unmatched rows stay unmatched** rather than being
   guessed into a comparison.
3. Publish `/compare/[factory]-[model].html` per matched model, plus the raw
   rows into `/data/`.
4. Only then consider volume. One correct comparison page beats fifty guessed
   ones, and a wrong price is the one error this positioning cannot survive.
