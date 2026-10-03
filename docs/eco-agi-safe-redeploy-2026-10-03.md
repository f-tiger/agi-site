# ECO/AGI safe redeployment — 2026-10-03

The owner requested inspection before retrying, with rollback prevention as the acceptance criterion.

## Findings

- ECO run `37027495740` and AGI run `37027495674` deployed successfully but failed their live GA4 asset-version check. Their content/SEO gates passed; subsequent steps were partly skipped.
- Both old workflows fetched main only for push events, then deliberately continued with the original checkout if that fetch failed. Retrying them could therefore deploy historical source.
- At inspection, main was `302f6a630c580c7daeb6382b88b593f1199f2910`. AGI's paper ledger had changed after the old runs' `f2f1d41411b6e005fb7ed8b5f2baec0906bf3c83` commit. A newer GitHub SHA alone does not prove an old retry is safe.

## Bounded repair

The two workflows checkout main, then run `.github/scripts/deploy-main-guard.sh prepare`. Fetch/commit-resolution failures stop execution. The resulting SHA is recorded. Immediately before Wrangler, `check` fetches main again and requires both main and HEAD to equal that recorded SHA. It never resets generated content after validation. A main change during build stops that release; the next current-main run rebuilds it.

Each site's existing concurrency group now uses `cancel-in-progress: false`, preventing a cancelled upload from finishing after a newer deployment. GitHub does not promise FIFO ordering of pending runs; each selected run therefore resolves current main independently. These controls cover these two Actions deployment paths, not manual out-of-band Cloudflare rollbacks or force-pushed main history.

Historical runs retain their original workflow definition. Do not re-run pre-repair releases just to make old red records green. Merge this change and use its new main-triggered runs as the replacement deployment and verification receipts.

## Verification

Nine isolated local Git tests cover stale checkout refresh, initial fetch failure, wrong branch, tracked-edit protection, preservation of generated files, concurrent main advancement, predeploy fetch failure with cached origin/main, missing/mismatched SHA, and both workflows' serialization/check placement. Bash syntax, YAML parsing and diff whitespace checks must pass before merge. The same tests run in both production workflows.

Two adversarial checks informed the repair: (1) a cached remote ref after network failure cannot serve as evidence of freshness; (2) resetting to main after validation would publish untested source, while cancelling an active upload can produce an ordering race. Both now stop or serialize the operation rather than relaxing quality gates.

No new scheduled task, model call, account, secret, content template or MCP contract. Existing SEO/GEO verification and changed-URL IndexNow policies remain active. No blanket indexing submission is warranted by a workflow-only repair. Production results belong in the merged PR's deployment receipts; do not report a pending run as successful.
