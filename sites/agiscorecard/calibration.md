# Calibration: We Score Our Own Predictions in Public

_Last updated: September 26, 2026 · Updated as verdicts change_

**Answer:** We score our own predictions in public — and the sample is still small. This page inventories every probability-shaped claim the AGI Scorecard network makes, states how many of them can actually be Brier-scored today ( 0), and pre-commits to publishing a Brier score and calibration curve once scored probability calls reach n≥20. We would rather show a small honest n than a big fake curve.

## FAQ

**What is a Brier score?**

A measure of probability-forecast accuracy: the mean squared difference between stated probabilities and outcomes (0 = perfect, 0.25 = coin-flip guessing on binary events). We publish ours once scored probability calls reach n≥20.

**Why not publish a calibration curve now?**

Because the Brier-eligible sample is 0: the 8 scored calls were graded hit/miss without a structured probability, and the 6 probability-bearing calls have not resolved. Publishing a curve from that would be theater. The raw ledger is public and timestamped, so nothing is hidden in the meantime.

**Who grades the calls?**

Outcomes are graded against pre-registered falsification conditions written before the outcome, with dated multi-source verification, and misses stay published with their lesson. The grading rules are public in the eight-layer method, including the red-team layer.

**How do I check that a record was not backdated?**

Versions of data.json, index-history.json, the consensus board and the odds history stamped since 2026-09-26 carry an OpenTimestamps proof under /ots/ (the manifest lists each proof's status: pending until the calendar's transaction is in a Bitcoin block). Verify with the free client against the entry whose sha256 matches your download. That proves when those bytes existed, not that they are correct; earlier history rests on the public git log.

---
Canonical page: https://agiscorecard.com/calibration
Machine-readable verdicts: https://agiscorecard.com/data.json (CC BY 4.0)
This Markdown mirror is generated from the page; the HTML page is canonical.
