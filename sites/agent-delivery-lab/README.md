# Agent Delivery Lab

Independent free beta at https://verify.agiscorecard.com/ for x402 v2 exact EVM payment-shape inspection, declared JSON response checks and captured payment-term comparisons. No wallet, payment, live endpoint proxy or hosted monitoring.

```sh
npm test  # build + 25 meaningful engine/CLI/worker tests; no npm dependencies
npm run build
```

See `../../docs/agent-delivery-lab-validation-2026-09-19.md` for revalidation, evidence, limitations and the 30-day decision gate. `public/guide.html` documents the rule format and the downloadable local runner.

Release uses `.github/workflows/deploy-agent-delivery-lab.yml`. Branches validate; main checks existing hostname ownership, binds the fleet D1 database with an isolated feedback table, deploys an independent Worker, then requires deployed commit and asset hashes plus a QA feedback round trip. No new scheduled job. The existing fleet bet checker handles the experiment's decision deadline.

Feedback rows are anonymous submissions, not verified users or conversions. Keep QA separate. Never add raw inputs, arbitrary free text, wallet connections or claims of settlement verification without re-evaluating the product boundary.
