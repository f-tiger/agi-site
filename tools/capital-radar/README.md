# AGI Capital Radar

Registered AGI fleet accounts can use `https://agiscorecard.com/capital-radar`.
The existing host-bound account session protects the HTML and JSON at the Worker,
including direct asset aliases. This feature grants no paid membership and does
not subscribe visitors to marketing. Owner notifications use the existing
SunWatch Telegram channel; registered visitors are not added to its recipients.

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
and pending notification messages privately; the registered-user API strips
internals. Collection and notification delivery are separate operations.

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

## Runtime credentials and SunWatch delivery

Use existing `CLOUDFLARE_API_TOKEN` and optional `ADS_WATCH_SECRET` in Actions.
`run.mjs` derives the same AGI membership subkey as the deployment helper, then
scopes it with SHA256 and `:capital-radar-runner:v1`. The parent Cloudflare key
is removed from the collector environment and is never sent to the website.

The collector does **not** send Telegram requests or need Telegram secrets.
Existing bot credentials and the owner's recipient stay in the SunWatch Worker
in `f-tiger/sunPredition`. The collection workflow has no Telegram secret
bindings, and its Node launcher removes unrelated notification secrets from the
child environment if a local caller happened to supply them. Public logs contain
only bounded counts and fixed status codes, never notification bodies or secrets.

The collector writes a private `internal.notificationOutbox` with `id`, `message`,
`status: pending`, and `createdAt` alongside its snapshot. The ID is the first 24
hex characters of SHA256(message). The private API stores the outbox idempotently
in a separate D1 queue. SunWatch's existing automation reads only that protected
owner queue, sends through the already connected owner channel, then acknowledges
the exact message ID. The shared relay credential stays at the service boundary;
it is not a bot credential and does not grant public access to the dashboard.

The first relay message confirms the actual current state, including retained
article count, source availability and prediction readiness. Retained articles
are explicitly not labelled newly discovered. Subsequent messages require a core
signal: a newly observed Bay Area financing candidate; the first ready forecast;
a change in the seven-day forecast total of both at least 25% and at least five
mentions relative to the last notified forecast; or a selected-method change.
Ordinary AI articles and model-version/timestamp churn remain silent.

The collector creates at most one message per UTC day, accounting for an existing
receipt that day. An unacknowledged message is preserved unchanged through new
collection runs, source failures and new forecasts. New Bay Area financing
candidates discovered meanwhile are deferred until the pending message is
acknowledged and the daily cap allows another. The admin GET marks an outbox
`sent` only for the same ID's confirmed receipt; the collector then clears that
acknowledged outbox. The forecast-change comparison baseline advances only after
that matching acknowledgement, never on queue creation. Pending messages expire
after 72 hours in the backend: an `expired` receipt clears the stale outbox and
does not count as sent or advance the forecast baseline. Source records and
private training state continue updating
while delivery retries remain pending. SunWatch owns durable retries and receipts;
there is no exactly-once guarantee across a Telegram success and a subsequent
storage failure. The dashboard distinguishes relay configuration, pending state
and an actual `lastSentAt` receipt. It never treats a queued message as delivered.

## Verification and manual operation

```sh
python3 -m unittest discover -s tools/capital-radar -p 'test_*.py'
node tools/capital-radar/test-contract.mjs
node tools/capital-radar/run.mjs --dry-run
```

Dry run reads public feeds and optionally existing private state, but writes no
data and sends no Telegram messages. The manual workflow input defaults to dry
run. Set `dry_run=false` to perform the authorized collection/save/queue cycle;
this does not itself call Telegram. Failures print only fixed diagnostic codes;
inspect the private dashboard
for source health. Initial network verification observed all three feeds respond
successfully; this is not a guarantee of future publisher availability. The
relay change must be deployed at both services and exercised before claiming
SunWatch delivery. A successful collector run proves persistence, not delivery.

The dashboard and member API are private/noindex and excluded from third-party
analytics. Their private records must not appear in sitemaps, public JSON,
IndexNow submissions, crawler mirrors, Git history, or public test artifacts.
Public homepage entry measurement remains separate from registered usage.
