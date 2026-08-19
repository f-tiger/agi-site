# Welcome sequence — ready to load

Not live. `newsletterAction` in `js/config.js` is unset, so the capture form
currently tells visitors the list isn't open rather than swallowing addresses.
Connect a provider (Buttondown and MailerLite both allow adult-adjacent
editorial content; check current terms before signing up), paste the form
endpoint into `newsletterAction`, and load these five emails as an automation.

## Sender rules — not optional in this category

These come straight from what readers are anxious about, and getting them wrong
loses the subscriber permanently rather than just losing an open.

- **From name: `DollScout`.** Nothing descriptive of the category.
- **Subject lines must survive a shoulder-glance at a lock screen.** Every
  subject below is written to be meaningless to anyone but the recipient. No
  product words, no emoji, nothing that reads as adult content in a preview.
- **No image tracking pixels.** We tell readers on the privacy page that we
  don't track them; an open-tracking pixel would make that false. Measure with
  click-through only, and say so in the footer.
- **One-click unsubscribe in every email**, honoured immediately.
- **Never sell or share the list.** Stated in email 1 and meant.

## The sequence

Five emails over sixteen days. Every one delivers something before it asks for
anything. Nothing here says "buy" — the affiliate link appears twice in total,
both times attached to a decision the reader has already been walked through.

---

### Email 1 — immediately on signup

**Subject:** The checklist you asked for
**Preheader:** Plus the one number most people get wrong.

Here's the checklist: [link to /checklist.html]

It's free, it's printable, and it has no affiliate links on it deliberately —
you're meant to be able to carry it into a negotiation with any vendor,
including ones we'd earn from.

One thing worth knowing before you read it. The most expensive mistake in this
category isn't picking the wrong shop. It's underestimating weight. A full-size
doll is 55–100+ lb of dead weight you'll lift, reposition, carry to clean and
move in and out of storage — repeatedly, for years. Material doesn't change
that. Size does.

If that number gives you pause, the checklist's first section is the one to
read twice.

What this list is: occasional emails when a new counterfeit ring surfaces, or
when an import rule changes in a way that costs buyers money. Not a newsletter.
Not a sales sequence. We don't share your address with anyone, and unsubscribing
is one click.

---

### Email 2 — day 2

**Subject:** Why the best price is the warning sign
**Preheader:** This one is counterintuitive and it catches most fraud.

Doll factories set minimum pricing for their authorised resellers. Legitimate
vendors have room for about 10–15% off list — that's it.

So when a shop advertises 50% or 70% off, the arithmetic only works one of two
ways: they're not selling the doll they say they're selling, or they're not
selling a doll at all.

This is why "shop around for the best price" is bad advice here specifically.
The offer that looks best is the one most likely to take your money.

Four checks catch most fraudulent shops:

1. Pricing within ~15% of list
2. PayPal or a credit card accepted — not wire, crypto or gift cards only
3. A written factory-photo policy before you pay
4. Brand authorisation the factory itself will confirm

The full ten-point version scores a shop for you in about two minutes:
[link to /scam-check.html]

---

### Email 3 — day 5

**Subject:** A rule changed and most guides haven't noticed
**Preheader:** If you're buying into the US, this is the one that surprises people.

If you've read that US imports under $800 arrive duty-free, that advice is
describing a rule that stopped applying on 29 August 2025.

The de minimis exemption was suspended for all countries under Executive Order
14324, and interim final rules in June 2026 made the suspension indefinite for
everything not arriving by post. A doll shipped to a US buyer now needs a
customs entry at any value, and usually picks up a carrier brokerage fee too.

Germany abolished its €150 threshold on 1 July 2026. New Zealand added a
per-consignment levy in April 2026.

What we won't do is quote you a duty rate. The tariff classification for
full-size dolls is genuinely unsettled, and every specific percentage you'll
read online is a guess wearing a suit. What you can do instead is ask one
question before you pay:

**"Is this price DDP or DDU?"**

DDP means duties are already covered and the checkout number is the number. DDU
means the carrier bills you before release. A vendor who can't answer that
clearly has told you something useful about how they operate.

Full breakdown, with sources: [link to /guides/import-costs-2026.html]
Your own numbers: [link to /cost-calculator.html]

---

### Email 4 — day 9

**Subject:** The step that prevents the most common complaint
**Preheader:** It takes one sentence in an email, before you pay.

The single most repeated complaint in this entire category is some version of
"the doll that arrived looks nothing like the pictures."

There is one habit that prevents almost all of it: **factory photos**.

Before dispatch, the vendor sends you photographs of *your specific doll* —
face, body, skin tone, the options you chose — and ships only after you approve
them. Approving is your last easy exit from the transaction, so you compare them
against your order sheet properly, while your payment dispute window is fresh.

Get the policy in writing before you pay, not after. The sentence to send is:

> "Before dispatch, please send photos of my actual doll and hold shipment until
> I confirm. Can you confirm that's your policy?"

A legitimate vendor answers yes in one line. Anything evasive is your answer.

If it does go wrong anyway: film the unboxing continuously before you open
anything, document everything in writing, and use a PayPal dispute (180 days) or
a card chargeback. Never trade a good review for a partial refund — that's a
known play here, and it costs you your leverage.

---

### Email 5 — day 16

**Subject:** Which one is actually right for you
**Preheader:** Sixty seconds, six questions, no signup.

Everything so far has been about not getting burned. This one's about not buying
the wrong thing, which is the more common regret.

Six questions, in the order that matters — weight tolerance first, looks last:
[link to /quiz.html]

It'll put you in one of four places:

- **Torso** ($150–$700, 5–30 lb) — if weight, storage or budget make a full doll
  a burden. The cheapest honest way to find out whether you enjoy ownership.
- **Compact** ($600–$1,300, 50–60 lb) — full form at a weight you can actually
  handle.
- **Full-size TPE** ($800–$1,800) — softest, cheapest per inch, real monthly
  upkeep. Only if you'll genuinely do it.
- **Full-size silicone** ($1,800–$3,500) — easiest to keep clean, longest life,
  costs more up front and less to own.

When you're ready to look at actual listings, this goes to the one vendor
currently on our vetted list — it passed all ten checks, and we earn a
commission if you buy, which is disclosed on every page it appears:
[affiliate link to vendor]

Run the ten checks on them anyway. That's what the list is for.

That's the sequence. From here you'll only hear from us when something changes
that costs buyers money.

---

## What to measure

Click-through only — no open tracking, for the reason above. The events already
exist in GA4: `email_submitted` fires on signup, and clicks land on pages that
fire `affiliate_click` with `location: article`. Tag the links with UTMs
(`utm_source=email&utm_medium=lifecycle&utm_campaign=welcome&utm_content=e3`)
so the sequence separates cleanly from organic in reporting.

The number that matters is not open rate. It is whether email 3 and email 5
produce affiliate clicks at a higher rate than organic traffic does — if a
warmed list doesn't outperform a cold visitor, the sequence is decoration.
