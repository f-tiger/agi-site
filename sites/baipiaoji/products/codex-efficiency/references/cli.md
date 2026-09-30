# CLI reference (v1.0.0)

Run commands in your own terminal. Resolve `scripts/cli.mjs` relative to this skill directory. Node.js 22+; no dependencies or background process.

```sh
node scripts/cli.mjs sessions --project /absolute/project
node scripts/cli.mjs review --project /absolute/project --session /absolute/session.jsonl --accepted true --failures 0 --interventions 0 --out /absolute/review.json
```

The session must be under `~/.codex/sessions` or `~/.codex/archived_sessions`, or an explicitly authorized `--sessions-root`. Its session metadata must match the selected project. The tool reads bounded streams; it does not execute log content. `sessions` lists only matching session paths and opaque IDs. Unknown/parent-inherited/reset counters remain null. A review file contains only numeric metrics, outcome, random-looking hashes, and a summary checksum. Outcome, failed attempts and interventions are user-supplied observations, not independently verified quality scores. Repeating a review of the same unchanged session returns the same run ID.

Optional Pro, after reviewing the exact summary:

```sh
node scripts/cli.mjs login
# Open the printed BPJ URL, sign in, enter the printed device code and approve.
node scripts/cli.mjs status
node scripts/cli.mjs submit --review /absolute/review.json --consent CHECKSUM_FROM_REVIEW
node scripts/cli.mjs history
node scripts/cli.mjs logout
```

`login` stores a scoped credential in a private local config file without printing it. Do not ask an agent to open that file. Browser approval expires in 10 minutes; approved credentials expire after 90 days and can be revoked on the product page. Password/session-version changes invalidate them. `logout` removes the local credential; revoke remotely in the browser if the device was lost. No automatic uploads, telemetry, polling or paid overage. `submit` transmits the approved summary; the API result may enter the host model's context. Retrying identical content uses an identical idempotency key. History remains available for 30 days, even after expiry; cached policy files remain yours.

Install for one project (no config edits or overwrites):

```sh
node scripts/cli.mjs install --project /absolute/project
node /absolute/project/.agents/skills/bpj-codex-efficiency/scripts/cli.mjs uninstall --project /absolute/project
```

Inspect the source before installation. Existing installation paths are refused. Uninstall refuses modified files or extra files; save your edits before manually removing them. To upgrade, uninstall an unchanged old version and install the reviewed new version. Installation does not imply automatic skill triggering. Explicitly invoke `bpj-codex-efficiency` in a supported local client.
