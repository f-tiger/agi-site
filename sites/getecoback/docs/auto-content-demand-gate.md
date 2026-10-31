# Automatic model-page demand gate

The executor may create a new model URL only when its verified product facts
match a fresh, same-country related-query signal for that exact brand and model.
The signal validator retains its seven-day freshness window and rejects failed,
polluted, future, non-positive and autocomplete-only snapshots. Relative growth
is not search volume, a sales forecast or evidence of model popularity.

Catalogue discovery alone stays a candidate. Brand-only and category-only growth
also stay candidates with `next_action: review_existing_guide`; they do not
authorize one new URL for every model. Rejected candidates have
`status: awaiting_model_demand_evidence` in the private selection receipt and do
not alter the page, state, publication ledger or dates. Country evidence never
transfers between DE and GB. With the current single-market snapshot, another
market must wait for its own valid evidence; the executor must not manufacture it.

Existing automatically managed pages can still receive substantive, verified
fact corrections without new demand. They retain their URL and publication date
and report `existing_page_verified_fact_update`. Unchanged specifications, prices,
footer churn and refreshed collection dates do not refresh content dates.

The existing source, editorial-conflict, near-model, distinct-fact, path, render
and daily-rate gates still apply. This change does not start a scheduler, change
the daily limit, activate Growth Loop or publish a candidate by itself.

Offline verification:

```sh
python3 -m unittest discover -s sites/getecoback/tools -p 'test_auto_content*.py'
```

The transaction tests use explicitly mocked validated demand; the demand-gate
tests read synthetic snapshots in temporary directories through the real
validator. No tests fetch live sources, generate production pages, click
merchant redirects or send live analytics.
