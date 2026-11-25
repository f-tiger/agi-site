# BPJ receipt verification

One SQLite Durable Object verifies existing receipts between GitHub's scheduled runs. It checks ads, BPJ membership receipts and public checkout readiness in that order. The existing Pages endpoints retain responsibility for orders and entitlements. GitHub handles its regular maintenance separately.

The first successful run schedules a follow-up after 90 seconds so deployment can observe a real alarm. Successful runs then schedule the next check hourly. A failed check schedules a retry in 15 minutes and leaves a fixed diagnostic in authenticated status. Each alarm makes at most 16 outbound requests. The existing GitHub workflow remains responsible for its scheduled maintenance. It also provides the current manual BPJ recovery path.

Run the `bpj-receipts-clock` workflow in `preflight` mode to check eligibility using the existing account credential. Deploy after the free-plan gate passes. The `workers.dev` endpoint accepts only authenticated `/status`, `/start` and `/pause` commands. Each credential authorizes one operation family, receipt verification or Worker control. The workflow can pause future alarms and verify the pause using status.

Use `node --test tools/bpj-receipts-clock/test.mjs` for local checks. A successful alarm indicates checkout readiness at that time. Track the actual interval between checks before expanding sales. Verified activation and a repeat paid customer task remain separate business outcomes.
