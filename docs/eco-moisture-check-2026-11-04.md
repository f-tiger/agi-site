# ECO: ventilation decision before shopping

## Evidence and decision

2026-11-04: public demand sample https://www.reddit.com/r/wohnen/comments/1wt3nbk/luftentfeuchter/ describes humidity rebounding after airing, repeated airing burden and running-cost concerns. This is a community anecdote, not a paid customer or quantified market. https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426 supplies consumer guidance, not endorsement of our tool.

Target: German households deciding whether ventilation can remove moisture before buying a dehumidifier. Free value: four explicit measurements, qualified drying-potential result, local records, CSV, deletion. No login needed, no cloud sync or paid feature promised. Existing affiliate comparisons remain downstream. Orders and commissions are unverified.

## Implementation

Two existing canonical guides: /guide/luftfeuchtigkeit-senken.html and /guide/richtig-lueften-im-winter.html. The final German build_structure layer installs the tool before models and removes early quickpick/toppick/sticky blocks on these routes. Existing titles, canonical and language alternatives retained; normal MD/index/sitemap generation and existing IndexNow release policy apply. No new schedules, endpoints, dependencies in production or per-keystroke network calls.

Magnus vapour-pressure comparison at equal pressure. Five RH percentage points is an operational uncertainty margin, not mould safety. No prediction of final indoor humidity, ventilation time, building diagnosis or savings. Damage overrides other advice. Relative humidity <40% discourages additional dehumidification, not necessary ventilation for air quality. Negative outdoor temperatures use the stated over-water approximation. Hardware accuracy is unknown.

Local storage: last 30 records, no room names/address; explicit save/delete/export. Example cannot be saved. Values never enter telemetry. Empty inputs remain required; no-JS form hidden and readable guidance retained. Fixed events eco_moisture_example/check/save/export use exact two-route allowlists. Shared GA4 channel respects opt-out, QA, DNT/GPC and bot exclusions; D1 rejects metadata fields. Download event means initiated, not verified saved file. No new identifiers or cross-site people counts.

## Review and measurement

Three brief refinements: answer household question; preserve nonpurchase and uncertainty; ship on existing intent pages with measurable actions. Self-review 1 rejected immediate device recommendation from high humidity alone. Self-review 2 added no-JS guard, unsupported-storage handling, example separation and wetter-outside/damage branches.

Observe first 14 complete UTC dates after verified deployment, with processing delay. Compare own check/save/export actions separately from examples and affiliate clicks. GA4 backend receipt currently inaccessible due Windsor account cap; do not claim verified GA4 receipt. Lack of exposure is not lack of demand. No outbound promotional messages authorized or sent. Existing navigation/search and shareable canonical pages are the distribution surface. Revenue requires affiliate statement evidence.
