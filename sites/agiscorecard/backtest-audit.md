# Backtest Reality Check

_Free tool. Runs in your browser; nothing is uploaded._

**Answer:** Every backtesting platform helps you *make* a backtest. This one asks whether the one you made survives the multiple-testing problem. Paste an equity curve or a column of returns, say how many variants you tried before keeping this one, and get four numbers: the deflated Sharpe ratio, the minimum track record length, the highest annual return your Sharpe permits at *any* leverage, and what turnover costs do to it.

---
Canonical page: https://agiscorecard.com/backtest-audit
Source (standard library, no dependencies): `tools/strategy-audit/audit.py` in https://github.com/f-tiger/agi-site
This Markdown mirror is generated from the page; the HTML page is canonical.

## What the four numbers mean

**Deflated Sharpe ratio.** A Sharpe ratio does not know how many times you looked. Test 200 variants with no real edge and the best one still shows a respectable Sharpe, at a height that is predictable rather than mysterious: roughly the expected maximum of that many draws. The deflated Sharpe ratio of Bailey and López de Prado subtracts that height first, then asks whether anything is left, and widens the error bars when returns are negatively skewed or fat-tailed. Above 0.95 the record survives the correction; below it, the record is not distinguishable from the best of that many coin flips.

**Minimum track record length.** How many observations you would need before the measured Sharpe is separable from luck at all. A common and uncomfortable result: the record in hand is shorter than the record it would take to know.

**The ceiling.** Compound growth at leverage L is `L·mu − L²·sigma²/2`. That is a downward parabola: it peaks at the Kelly leverage and falls again above it, so the best annual return any leverage can reach is `exp(S²/2) − 1` and depends on the Sharpe ratio alone. A 100 % target needs a Sharpe of at least 1.177 at full Kelly, about 1.360 at half. At a Sharpe of 1.0 the ceiling is 64.9 %; at 0.6 it is 19.7 %.

**The cost haircut.** The edge that survives the first three tests still has to pay a spread on every rebalance. This is where a monthly-turnover strategy with a thin edge stops being one.

## Worked example: the S&P 500 itself

Fourteen months of SPY has an annualised Sharpe of 1.63, high enough that 4x leverage would compound at 100 % a year. Its deflated Sharpe, if you had arrived at it by trying 200 things, is **0.16**. The index is not overfitted, of course — but that is the point. A number that looks like an edge and a number that is one are separated by the question the deflated Sharpe asks, and almost no backtest report asks it.

## Command line

```
python3 audit.py --equity curve.csv --trials 200 --target 1.0
python3 audit.py --returns daily.csv --periods-per-year 252 --json out.json
python3 audit.py --selftest
```

The browser version and the Python version are held to the same numbers by a parity test that extracts the page's JavaScript and runs both on one fixture, on every deploy.

## What this is not

It never recommends a security, makes no forecast, and takes no position on whether you should invest in anything. A recommendation about a financial instrument is a regulated activity; a statistic about a dataset is not, and that line is the reason this tool is shaped the way it is. Educational information only.
