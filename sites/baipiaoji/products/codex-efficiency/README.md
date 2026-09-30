# BPJ Codex Efficiency — 1.0.0

A small, inspectable Codex Skill and local CLI for reviewing coding-task usage and improving project rules. Independent BPJ product, not an OpenAI product. Node.js 22+, Git and local Codex CLI. No runtime dependencies.

## Install

Review the source first. The fixed release reference is `bpj-codex-efficiency-v1.0.0`.

```sh
git clone --depth 1 --branch bpj-codex-efficiency-v1.0.0 https://github.com/f-tiger/agi-site.git bpj-efficiency
cd bpj-efficiency/sites/baipiaoji/products/codex-efficiency
node scripts/cli.mjs install --project /absolute/project
```

Then explicitly invoke `bpj-codex-efficiency` in a supported local client. Installation writes only `.agents/skills/bpj-codex-efficiency` in the chosen project and refuses an existing installation. It does not edit Codex configuration. See [the command reference](references/cli.md) for review, account binding, submission, upgrade and safe uninstall.

## Free and paid

Lite provides the Skill, local session selection, observed counters and a reviewable numeric summary. It works without an account. Optional Pro evaluates approved numeric summaries on BPJ's server, returning evidence-linked rules and a descriptive comparison with the previous project evaluation. This is a deterministic rules service, not an LLM subscription, quota interceptor or guaranteed cost reduction.

One complete evaluation per BPJ account is free. Proposed production offer: **19 USDT / 30 days**, manually renewed, three project slots and 100 successful evaluations per period, 30-day result history. Exact BSC USDT checkout adds a nonrecycled identification fraction below 0.01 USDT. The [product page](https://baipiaoji.com/studio/codex-efficiency) shows live purchase availability and terms. **No purchase is available unless the service readiness gate is open.** A completed local test is not evidence of real payment acceptance or savings.

Raw session logs, code and auth files are not uploaded. Submission requires the checksum of the exact numeric summary the user reviewed. Hashes of project paths and session IDs are pseudonymous, not guaranteed anonymous. API results may enter the host model's context. No telemetry, automatic polling or recurring debit.

## Counter contract

Only `session_meta` with matching `cwd` and `event_msg` / `token_count` / `info.total_token_usage.total_tokens` are interpreted. Final cumulative counters are used once; duplicates are not summed. A reset, malformed record, missing counter or recognized child/fork lineage returns unknown. Files are bounded to 64 MiB, lines to 1 MiB, and listings to 5,000 entries. Snapshot elapsed time includes idle time. Multi-session/subagent totals are not supported, and the result is **not** remaining subscription credit or a cash estimate. Other schemas need a reviewed adapter.

## Verification

Run from `sites/baipiaoji`:

```sh
node scripts/test-codex-efficiency.mjs
```

The suite uses real SQLite, synthetic session logs and mocked chain RPC. Browser integration tests use fixture account identity and mocked RPC. No real funds, customer results, savings benchmark or 90% skill-trigger score is implied. A separate forward test checks ambiguous concurrent projects and preservation of release gates.

Local distribution is MIT licensed (see LICENSE). Paid server access is controlled by account-scoped credentials, server entitlements and quota transactions; it is not a client-side license flag. Do not paste credentials or passwords into an agent conversation.
