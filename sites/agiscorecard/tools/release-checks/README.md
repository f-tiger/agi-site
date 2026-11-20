# AGI coding agent release checks

The AI tools hub shows the two publishers’ stable CLI tags, public package advisories, and dated model announcements. The daily AGI discovery job refreshes public data. The first run takes a bounded historical sample. A partial or unavailable source retains its coverage status. The report does not infer the backend selected by an installed CLI.

## Model behavior checks

The three fixed fictional tasks ask for a draft approval state, a public subset of fields and an ordered list of string identifiers. A browser can score an answer privately. The hosted release job reads only public feeds and inventories the suite. Public results require separate reviewed execution evidence.

A Linux operator with an existing, authorized signed-in CLI can call the local runner from a post-upgrade hook. Use an isolated environment with a dedicated profile and two separate owner-only directories outside the checkout. Supply the trusted publisher binary’s absolute path and independently verified SHA-256. The invocation uses the CLI account’s existing allowance and may be billed under its terms.

| Setting | Value |
| --- | --- |
| `AGI_LOCAL_RELEASE_CHECKS` | `true` on the authorized runner |
| `AGI_CHECK_BIN` | Absolute path to the installed native binary |
| `AGI_CHECK_BIN_SHA256` | Verified digest of that binary |
| `AGI_CHECK_PROFILE` | Dedicated signed-in CLI profile directory |
| `AGI_CHECK_RECEIPTS_DIR` | Private results directory |

Run `node sites/agiscorecard/tools/release-checks/run-checks.mjs --local codex` or use `--local claude-code` after the stable version appears in the publisher snapshot. The default invocation without arguments inventories the public snapshot and makes zero model requests. Unsupported versions or isolation controls stop the local run.

To check a separately announced model on an unchanged installed CLI, pass the exact publisher URL from `models.json` and a model ID corresponding to a fully spelled-out name in its headline. For example:

```sh
node sites/agiscorecard/tools/release-checks/run-checks.mjs --local claude-code \
  --announcement https://anthropic.com/claude-fable-and-mythos-5-2 --model claude-fable-5-2
```

The operator opts into each CLI or model selection under the existing account's allowance and billing terms. The runner reads the URL from the inventory without fetching it. A shared or abbreviated model name and an unsupported selector stop before any model request. The CLI receives the selected ID as its `--model` option. If the CLI omits its effective model ID or reports a different ID, the receipt records the request, any client-reported ID and the private CLI fixture outcome. The announced model's result stays unverified and the runner stops.

A receipt is reserved per CLI version and suite before the first model call. Model-specific runs also distinguish the announcement URL and requested model. A normal run executes at most three fixed tasks. A result records the CLI version, fixture outcomes and any model identifier the client attests. Incomplete runs stay incomplete. The operator reviews the minimized receipt before proposing a public result through a normal PR. Leave private profiles, raw answers and credentials on the operator machine.
