# AGI Capital Radar

Requested outcome: a registered-user Silicon Valley AI funding/startup monitor,
connected to the existing AGI homepage, with continuous collection, evaluated
forecasts and owner Telegram summaries. Implemented within the existing AGI
Worker and domain to reuse the fleet account, private D1 and release pipeline.

## Access and discovery

- Public entry and methodology: `/capital-radar-about`; both homepages and tool
  hubs link to the monitor. Free registration is the offer; no paid entitlement,
  checkout, marketing subscription or investment return is promised.
- Registered dashboard: `/capital-radar`; the Worker checks a live, host-bound
  fleet account session on every dashboard/API request. Existing workspace keys
  cannot substitute for a fleet registration.
- The static shell is `capital-radar/account.html` so the existing explicit
  private-account GA4 exemption applies. It contains no collected data. All its
  aliases are gated; responses are private/no-store/noindex. Snapshots, model
  internals and notification checkpoints stay in D1, never public Git/artifacts.
- Only the public methodology belongs in sitemap, search and agent mirrors.
  Existing weekly/manual IndexNow handles eligible public changes after a
  successful deployment. An accepted IndexNow receipt is not indexing.
- Public measurement reuses the existing AGI GA4 property and privacy controls.
  Account entry is registration intent, not completed registration or revenue.
  Private monitoring pages deliberately have no third-party analytics.

## Evidence and learning

The bounded publisher feeds produce **article leads**, not verified funding
rounds. Source dates and original URLs remain attached. Regional keyword matches
are provisional evidence; a Bay Area reference does not prove company domicile.
Unconfirmed geography stays separate. No funding total or valuation is invented.

Forecasts target covered-source daily lead counts. They require at least 56
consecutive complete observation days; failed collection never becomes a zero
day. The small deterministic neural network is compared with a trailing-average
baseline using chronological validation. Promotion requires at least 5% lower
MAE. Forecast ranges describe historical errors, not calibrated guarantees.
New data can lead to retaining the baseline rather than promoting a neural model.

## Operation

`agi-capital-radar.yml` runs daily at 06:35 UTC (14:35 Beijing time); GitHub
schedules can be delayed. Manual dry-run defaults to true. The workflow does not
commit snapshots, upload data artifacts or trigger a deployment per collection.

The runner derives a scoped credential from the existing AGI membership secret
via the existing deployment helper. It uses `/api/capital-radar/runner` to read
and save state. Telegram uses the complete `TELEGRAM_BOT_TOKEN` +
`TELEGRAM_CHAT_ID` pair, or the existing owner's complete `TRADER_TG_TOKEN` +
`TRADER_TG_CHAT` pair; pairs are never mixed. No credential or recipient appears
in browser code, source or public workflow logs.

Telegram delivery is independently reported: configuration, attempted delivery,
successful API receipt and uncertain delivery are distinct. This release does
not claim a delivered message before a real Telegram receipt exists. Historical
sampling must accumulate before any production forecast can be evaluated.

Validation commands:

```sh
python3 tools/capital-radar/test_radar.py
node sites/agiscorecard/tools/capital-radar/test.mjs
node sites/agiscorecard/tools/capital-radar/verify-live.mjs
```

The first two use synthetic fixtures. The last checks live anonymous privacy
boundaries and public entry points without creating an account or sending alerts.
Real sign-in, runtime source health and Telegram receipts require separate checks.

Product review after 28 days: measure public entry visits and account-entry
intent, source availability and relevant lead quality; investigate actual
registered usage separately from clicks. Do not infer paid demand, verified
registrations, trading outcomes or revenue from these measurements.
