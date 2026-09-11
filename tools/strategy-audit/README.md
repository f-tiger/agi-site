# Backtest Reality Check

A single dependency-free Python file that grades a track record instead of producing one.

```
python3 audit.py --equity curve.csv --trials 200 --target 1.0
python3 audit.py --returns daily.csv --periods-per-year 252 --json out.json
python3 audit.py --selftest        # ~35 assertions, offline, no network
```

Browser version: <https://agiscorecard.com/backtest-audit> (runs locally, nothing uploaded).

## Why this rather than another predictor

Three rounds of research in this repo (`docs/auto-trading-platform-2026-09.md`,
`docs/stock-model-100pct-2026-09.md`, `docs/stock-ai-algorithms-2026-09.md`) all landed in
the same place. Predicting returns is crowded, licensed and low-signal: the best published
monthly out-of-sample R² is 0.26–0.40 %, and the one long-running real-money AI equity fund
trailed its index by roughly 4.9 points a year over eight and a half years. Measuring whether
a track record means anything is none of those things. It is arithmetic, it is not regulated
advice, and every backtesting platform sells the opposite service.

## What it computes

| Output | What it is |
|---|---|
| Probabilistic Sharpe ratio | P(true Sharpe > benchmark) given sample length, skew and kurtosis |
| Deflated Sharpe ratio | The same probability after subtracting the height that `--trials` alone would produce |
| Expected best-by-luck Sharpe | What the best of N no-edge trials looks like, so you can see what you are clearing |
| Minimum track record length | Observations needed before the Sharpe is separable from luck |
| Target feasibility | Required Sharpe for a return target, and the ceiling `exp(S²/2) − 1` that no leverage passes |
| Cost haircut | Sharpe before and after turnover pays a spread |

Method: Bailey & López de Prado's PSR/DSR/MinTRL, plus the Kelly-ceiling arithmetic this repo
already publishes on `/ai-trading-ledger`. The expected maximum across N trials uses the
standard `(1−γ)Φ⁻¹(1−1/N) + γΦ⁻¹(1−1/(Ne))` approximation with γ the Euler-Mascheroni constant.

## Assumptions worth knowing

- **Trial spread.** DSR needs the standard deviation of Sharpe ratios across the variants you
  tried. Most people do not have it, so the default is the null value `1/√n`, and the report
  labels which one it used. Pass `--trial-sharpe-sd` if you measured it.
- **Sample conventions.** Kurtosis is Pearson (3.0 for a normal, not 0.0). PSR uses `√(n−1)`.
- **Implausible input.** An annualised Sharpe above 10 is treated as a units error rather than
  a result, and the report stops there. Pasting an equity curve into the returns field is the
  usual cause, and the parity test covers it because it used to crash.

## Two implementations, one set of numbers

The browser version lives inside `sites/agiscorecard/backtest-audit.html`.
`test_parity.mjs` extracts that JavaScript **from the published page**, runs it and the Python
against one deterministic fixture, and compares 129 fields across 7 cases. It runs on every
agiscorecard deploy. Tolerance is 2e-6, set by the browser's Abramowitz & Stegun error
function against Python's `math.erf`.

```
node test_parity.mjs
```

## What this is not

It never recommends a security, makes no forecast, and takes no position on whether anyone
should invest in anything. A recommendation about a financial instrument is a regulated
activity in every jurisdiction this project operates in; a statistic about a dataset is not.
That distinction is the reason the tool is shaped this way, and it is not negotiable in
future changes: no signal output, no "buy" verdict, no broker connection.
