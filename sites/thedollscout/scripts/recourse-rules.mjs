/* The payment-recourse rules, as data.

   Why this file exists: an answer engine cannot run a calculator. Every tool
   on this site computes in JavaScript, so a model reading the page sees a
   form and never an answer — which is why a genuinely useful tool can go
   uncited forever. The fix is not to make the tool flashier. It is to publish
   what the tool KNOWS as text and as JSON, so the knowledge is extractable
   rather than merely executable.

   These rules mirror payment-protection.html branch for branch. That is a
   duplication hazard, and it is handled the only way duplication safely can
   be: scripts/test-recourse-parity.mjs drives the real page for every cell in
   the matrix and fails if a single verdict disagrees with this file. The
   table on the page cannot quietly stop matching the tool underneath it.

   Sources are the ones already verified for that page — the Consumer Credit
   Act 1974 s.75, and Financial Ombudsman Service guidance. Nothing new is
   claimed here; this is the same knowledge in a shape a machine can read. */

export const METHODS = [
  { id: "credit", label: "Credit card", note: "The only method that carries the statutory route." },
  { id: "pos", label: "Credit card via a payment page (Stripe, Shopify Payments)", note: "Treated as a credit-card payment for these purposes." },
  { id: "debit", label: "Debit card", note: "Outside Section 75 — the Financial Ombudsman lists debit cards explicitly." },
  { id: "charge", label: "Charge card", note: "Outside Section 75, per the Financial Ombudsman's list." },
  { id: "wallet", label: "PayPal or similar wallet balance", note: "Has its own dispute process — Citizens Advice states 180 days from payment, longer than a card chargeback." },
  { id: "transfer", label: "Bank transfer", note: "Neither statutory protection nor chargeback. The least recourse of any method." },
  { id: "crypto", label: "Cryptocurrency, cash or gift card", note: "No card scheme and no creditor. No recourse through either route." },
];

/* s.75(3)(b): the claim must relate to a single item with a cash price over
   £100 and not more than £30,000. */
export const S75_MIN = 100;
export const S75_MAX = 30000;
/* FOS states the chargeback window as "usually around 120 days" — an
   estimate, never presented here as a deadline. */
export const CHARGEBACK_DAYS = 120;

const CREDIT_LIKE = new Set(["credit", "pos"]);

export function decide({ country, method, price }) {
  const creditLike = CREDIT_LIKE.has(method);
  const inRange = price > S75_MIN && price <= S75_MAX;

  let s75, s75Headline;
  if (country !== "uk") {
    s75 = "n/a";
    s75Headline = "Section 75 — not applicable where you are";
  } else if (!creditLike) {
    s75 = "no";
    s75Headline = "Section 75 — does not appear to apply";
  } else if (!inRange) {
    s75 = "no";
    s75Headline = "Section 75 — outside the threshold";
  } else {
    s75 = "yes";
    s75Headline = "Section 75 — appears to apply";
  }

  const noScheme = method === "transfer" || method === "crypto";
  const chargeback = noScheme ? "no" : "discretionary";
  const chargebackHeadline = noScheme
    ? "Chargeback — not available"
    : "Chargeback — possible, but at your bank's discretion";

  return { s75, s75Headline, chargeback, chargebackHeadline };
}

/* Kept as its own field rather than folded into a verdict, because the table
   must never be more confident than the tool is. Whether Section 75 survives
   a payment routed through a wallet is genuinely unsettled, and the page says
   so; a matrix that printed a clean "no" here would be overstating it. */
export const OPEN_QUESTIONS = {
  wallet:
    "Whether Section 75 also survives when a card is used to fund a wallet payment is unresolved. " +
    "We could not confirm it either way, so ask your card issuer rather than assuming. " +
    "The wallet's own dispute process is the route we can point to with confidence.",
};

export const PRICE_BANDS = [
  { id: "under", label: `£100 or less`, sample: 80 },
  { id: "within", label: `Over £100, up to £30,000`, sample: 1749 },
  { id: "over", label: `Over £30,000`, sample: 31000 },
];
