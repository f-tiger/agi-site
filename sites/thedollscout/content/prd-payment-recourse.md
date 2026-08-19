# PRD — Payment recourse checker

Internal. `content/` is excluded from the published site.

Status: **approved to build on verified sources.** Every fact below was read
first-hand from a retrieved page in `content/sources/`, not from a search
snippet. The first attempt at this research produced a plausible-sounding
quotation that turned out not to exist on the page it was attributed to; that
is why this document names its source per claim.

---

## 1. The need

> *"I paid a deposit to an overseas vendor for a made-to-order doll. It arrived
> wrong / never arrived / they have gone quiet. Who do I actually complain to,
> and what am I entitled to?"*

Ranked #1 of the two findings that survived adversarial verification.

**Why nobody serves it.** Doll buying guides — including ours until now — treat
dispute risk as a *vendor-selection* problem: pick a vetted seller and you are
fine. That advice ends at the moment of payment, which is the exact moment the
question starts. Community threads fill the gap with contradictory chargeback
advice, and they contradict each other for a structural reason: chargeback is a
card-scheme process, not a legal right, so there is no single correct answer to
quote.

**Why this category specifically.** Four traits stack badly and all four are
normal here: made-to-order production, 4–12 week lead times, an overseas
supplier, and deposit-then-balance payment. By the time anything is visibly
wrong, ordinary chargeback windows may be close to expiry.

## 2. Verified facts the tool may assert

**From the statute** — `sources/www-legislation-gov-uk-ukpga-1974-39-section-75.md`,
page states it is up to date for changes in force on or before 29 July 2026:

- s.75(1): where the debtor under a debtor-creditor-supplier agreement has a
  claim against the supplier for **misrepresentation or breach of contract**,
  they have a **like claim against the creditor**, who is **jointly and
  severally liable**.
- s.75(3)(b): does not apply "so far as the claim relates to any **single item**
  to which the supplier has attached a **cash price not exceeding £100 or more
  than £30,000**".
- s.75(3)(a): non-commercial agreements excluded.

**From the Financial Ombudsman Service** —
`sources/www-financial-ombudsman-org-uk-...md`, page dated "Last updated:
9 July 2026":

- Applies if paid **some or all** by credit card, point-of-sale loan, or certain
  catalogue accounts, **and** cash price is **more than £100 but not more than
  £30,000**.
- **"it's the cash price of the goods or services that matters, not what you
  paid on your credit card or loan – for example, Section 75 applies even if you
  only made part of the payment using credit"** ← this is the load-bearing
  sentence for a deposit-paid doll.
- Over £30,000 → s.75a may still apply.
- **Does not apply**: debit card, charge card, overdraft or general-purpose bank
  loan, cash, credit card cheque, **bank transfer**.
- Requires a debtor-creditor-supplier agreement, and FOS says whether one exists
  "isn't always straightforward".
- Chargeback: **"usually around 120 days"**, running from the date goods were
  expected but not provided, or from the date defective/not-as-described goods
  were received. Limits vary.
- **"A bank or lender doesn't have to raise a chargeback."** Five commonly valid
  reasons listed; the tool reuses them as the "what went wrong" options so that
  a user's answer maps onto language their bank recognises.
- Evidence list (receipts, contracts, marketing materials/screenshots,
  correspondence, photos/video, independent assessments).

## 3. What the tool must NOT claim

- **Any non-UK statutory equivalent.** Nothing was verified for US, EU, CA, AU.
  Non-UK users get the chargeback path and an explicit "we could not verify".
- **That s.75 reaches overseas suppliers.** This rests on *OFT v Lloyds TSB*
  [2007] UKHL 48, which we did not retrieve. Widely repeated, plausibly correct,
  **labelled unconfirmed on the page.**
- **That PayPal or a third-party processor defeats the claim.** FOS says only
  that the DCS chain must exist and is "not always straightforward". Stating the
  stronger version as fact would be inventing law.
- Any height or size "safe harbour" for legality — the CPS guidance we retrieved
  contains no such threshold, so vendor and forum claims of that shape stay
  unrepeated.

## 4. Form

**Interactive checker + written explanation**, on one page. The eligibility
logic is genuinely branchy and it is exactly where buyers get it wrong — that is
tool-shaped, not article-shaped, and tools are this site's only real moat.

Inputs: payment method · cash price of the doll itself · country · what went
wrong · when it was expected. Output: whether s.75 appears to apply and why,
the chargeback window with days remaining, the evidence list, and the
unverified items named as unverified.

**No affiliate link anywhere on the page.** A visitor arriving here has already
been hurt by a vendor; monetising that moment would discredit the one thing this
site sells, which is not being that.

**Nothing is sent anywhere.** Amounts and dates stay in the browser; the
analytics event carries the outcome bucket only.

## 5. Success measure

Not traffic. Whether the page can survive being read by someone who works in
consumer credit. Secondary: it targets a real gap ("chargeback sex doll",
"deposit not refunded made to order") and is a natural citation for the forum
answers that currently contradict each other.
