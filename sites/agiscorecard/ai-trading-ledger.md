# AI Trading Ledger: six bots, one pre-registered public track record

Source: https://agiscorecard.com/ai-trading-ledger · Pre-registered 2026-09-05 · Paper only · Read date 2027-03-08 · Not investment advice

**Status:** six arms start with the same $10,000 of paper money on 2026-09-08 and are recomputed every trading day from the same adjusted closes by a public GitHub workflow — no human, no discretion, no edits after the fact. Machine-readable ledger: https://agiscorecard.com/paper-ledger.json (CC BY 4.0).

| Arm | Rule |
|---|---|
| SPY hold | Buy SPY at the first close, hold (benchmark). |
| QQQ hold | Buy QQQ at the first close, hold. |
| AGI basket | NVDA, AMD, TSM, AVGO, MU, MSFT, GOOGL, AMZN, AAPL, META equal weight, rebalanced first trading day of each month. |
| Tracker mix | Basket weight = Thesis Tracker score ÷ 100 (62.5% at start), remainder SPY, monthly. |
| 200-day rule | Faber (2007): hold SPY when above its 200-day average at month-end, else cash; executed next close. |
| LLM agent | Weekly long-only weights from a language model; not started until an API key exists — never backfilled. |

Shared assumptions: adjusted closes, 5 bp per side, signals at close T executed at close T+1, fetch failures keep last value and are flagged, never invented.

## Pre-registered judgement
- Read date 2027-03-08: every arm's return, max drawdown and excess vs SPY published as they stand.
- Nothing here flips the parent verdict at /do-ai-trading-agents-work; six months in one regime is method, not skill.
- This ledger will never become a signal service, a subscription, or a broker connection.

## FAQ
**Is the AI trading ledger investment advice or a signal service?**
No. It is a paper-trading experiment with rules fixed before the start date. No security is recommended, nothing is executed for anyone, no real money is involved, and positions are shown only after the paper execution date. Nothing on this page is a recommendation to buy or sell anything.

**Why publish a paper ledger at all?**
Because /do-ai-trading-agents-work holds vendors to a standard — positions timestamped before outcomes, every result graded, misses never deleted, methodology fixed in advance — and the only honest way to demand that standard is to meet it ourselves. The ledger is the demonstration, not a product.

**What happens if one arm beats the S&P 500?**
Nothing automatic. The pre-registered read date is 2027-03-08 (six months). On that date every arm's return, maximum drawdown and excess versus SPY are published as they are. Six months of paper results in one market regime is not evidence of skill, and the page will say so.
