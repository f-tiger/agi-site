# AGI Capital Radar

Registered AGI fleet accounts can use `https://agiscorecard.com/capital-radar`.
The existing host-bound account session protects the HTML and JSON at the Worker,
including direct asset aliases. This feature grants no paid membership and does
not subscribe visitors to marketing. The owner alone receives the automation's
Telegram digest.

## What the data means

The collector reads bounded public RSS feeds from TechCrunch AI, Crunchbase News,
and VentureBeat. It requires AI and financing/startup language, keeps publisher
links and publication/discovery timestamps, deduplicates canonical URLs, and
rejects off-host links, XML entities, stale/future timestamps, and oversized
responses. A Bay Area label means the feed text explicitly mentioned a listed
Bay Area location; it is not verification of a company's headquarters. Articles
without location evidence remain `unconfirmed` and must not be presented as
confirmed Silicon Valley companies. These feeds are a limited observed sample,
not complete market coverage.

Records are **candidate article mentions, not confirmed financing transactions**.
Multiple publishers can report one transaction. No funding amounts, valuations,
investors, or future deal announcements are inferred. Dates from old RSS entries
are preserved, not rewritten as fresh publication dates. The first collection
day is excluded from training because it imports a feed archive.

## Continuous collection and controlled retraining

`.github/workflows/agi-capital-radar.yml` runs daily at 06:35 UTC, with one serial
runner. GitHub schedules can be delayed. It reads/writes the private D1 snapshot
through `/api/capital-radar/runner`; data is never committed to this public repo
or uploaded as a public Actions artifact. The runner stores coverage, seen IDs,
and notification claims privately; the registered-user API strips internals.

A complete daily observation requires a successful fetch from all three feeds.
Missing days break training continuity; they never become measured zeroes. The
target is daily newly discovered qualified article mentions. Forecasts require
at least 56 contiguous completed observation days, at least 20 mentions, and
three distinct observed counts. Historical dates in feed entries do not create
historical coverage. Failed feeds retain the previous event records and show
their failure. A persist failure stops notifications.

The candidate is a real, deterministic neural network: seven log-count lags,
six tanh hidden units, and one output, trained locally by SGD. Fourteen expanding
one-step validation folds fit both normalization and weights only to past data.
It becomes the selected model only when its MAE is at least 5% better than the
seven-day moving-mean baseline. Otherwise the baseline remains selected. Every
new complete day repeats the evaluation; no model rewrites application code or
loosens its own gate. An error range based on the past 90th-percentile absolute
error widens by square root of horizon. It is not a calibrated probability, a
funding forecast, an investment-return forecast, or a proven predictive edge.

## Runtime credentials and Telegram

Use existing `CLOUDFLARE_API_TOKEN` and optional `ADS_WATCH_SECRET` in Actions.
`run.mjs` derives the same AGI membership subkey as the deployment helper, then
scopes it with SHA256 and `:capital-radar-runner:v1`. The parent Cloudflare key
is removed from the collector environment and is never sent to the website.

Telegram uses the complete `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` pair. If that
pair is absent, the complete existing owner-private `TRADER_TG_TOKEN` +
`TRADER_TG_CHAT` pair is used. Pairs are never mixed. No credentials, recipient
identifiers, request bodies, or source headlines are printed in public logs.

At most one digest per UTC day reports new mentions and/or a changed available
forecast, with sources and the protected site link. A private send claim is
persisted before sending, then Telegram's successful API response is recorded.
Timeout/ambiguous failure becomes `delivery_unknown`, makes the run fail, and
is not automatically resent that day; this favors avoiding duplicate messages
over exactly-once delivery claims. A missing credential pair is visibly
`not_configured`: data still saves, then the job fails to surface the gap.
The dashboard distinguishes configuration from an actual `lastSentAt` receipt.

## Verification and manual operation

```sh
python3 -m unittest discover -s tools/capital-radar -p 'test_*.py'
node tools/capital-radar/test-contract.mjs
node tools/capital-radar/run.mjs --dry-run
```

Dry run reads public feeds and optionally existing private state, but writes no
data and sends no Telegram messages. The manual workflow input defaults to dry
run. Set `dry_run=false` to perform the authorized collection/save/notification
cycle. Failures print only fixed diagnostic codes; inspect the private dashboard
for source health. Initial network verification observed all three feeds respond
successfully; this is not a guarantee of future publisher availability. The
workflow must be deployed and run before claiming an active schedule, populated
production database, or delivered Telegram notification.

The dashboard and member API are private/noindex and excluded from third-party
analytics. Their private records must not appear in sitemaps, public JSON,
IndexNow submissions, crawler mirrors, Git history, or public test artifacts.
Public homepage entry measurement remains separate from registered usage.
