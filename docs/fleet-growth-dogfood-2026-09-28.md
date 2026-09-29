# Fleet growth operator — first measured experiment

2026-09-28. The first customer is the agi-site fleet. This release supplies the instrument and review gate; it does not establish traffic growth, a repeatable marketing service, or revenue.

## Three prompt revisions and the execution brief

1. **Outcome:** help an existing fleet page acquire relevant visitors who take a useful next step. Packaging an MCP, generating drafts, and scheduling posts are outputs, not proof of value.
2. **Adversarial revision:** require a verified channel and a provider-read published-post receipt before interpreting campaign counts. Separate delivery failure, insufficient distribution, and weak landing-page response. Missing data stays unknown.
3. **Executable revision:** use one registered experiment, two existing English pages, one verified source, fixed source tags, deduplicated tab intervals, complete UTC days and a predeclared review. Exclude marked QA and the existing search experiment. Measure costs before replication; never turn the thresholds into an automatic case study.

Execution prompt:

> Operate `bpj-quota-clarity-01` for the fleet first. Verify a relevant owned account and its permitted publishing scope, inspect its real audience, and select one source. Check the landing-page facts against current official sources before reviewing the first post. Publish only within the owner's established authorization, then read back the actual provider status and public post URL. Record the tagged arrivals, qualified tab sessions and official-link action sessions with the deployed instrument. Review after 14 complete UTC days following publication. Preserve missing/failed outcomes and actual operator time/cash cost. Recommend one next action from the evidence. Do not claim unique people, task completion, causal lift, revenue or a saleable case from these proxy counts.

## Experiment contract

| Field | Fixed choice |
|---|---|
| ID | `bpj-quota-clarity-01` |
| Primary landing | `https://baipiaoji.com/en/tools/google-ai-studio` |
| Companion page | `https://baipiaoji.com/en/how-much-has-gemini-free-tier-been-cut` |
| Audience hypothesis | English-speaking developers confused about Gemini free-tier limits, account tier and billing |
| Useful action proxy | Trusted browser click to `aistudio.google.com` or an `ai.google.dev/gemini-api/` page |
| Review | 14 complete UTC days after publication; the publication's partial day is excluded |
| Operating gate | At least 50 qualified tab sessions and 5 action sessions, with costs recorded |
| Following decision | One separately registered replication; preserve this experiment's failures and receipts |
| Case gate | Two independent periods reaching their gates; association and limitations must remain visible |

These are operating thresholds, not statistical significance or guaranteed results. An official-link click is not a completed Google task or a Google conversion. A replicated result would support a limited case description, not a general growth promise.

The relevant forum question and official information sources were identified during research. No new quota number or billing claim is introduced by this release. Account fit and the current claims must be checked again before publication.

## What runs

- `growth-campaign.mjs` loads only on the two pages above. Collection starts only with this campaign ID and an enumerated `utm_source`. A normal untagged visit is not measured by this instrument.
- `POST /api/growth` accepts arrival, qualified reading and official-click stages. The server stores a hash of a random tab nonce and updates one row; request retries and refreshes cannot multiply that interval's stages. Server-side elapsed time also guards the ten-second reading stage.
- `GET /api/growth?days=14` returns complete UTC-day aggregates. Supported windows are 7, 14 and 28 days. A separate cache namespace preserves the existing `/api/reach` contract and limits repeated database reads.
- `data/marketing/traffic-experiment.json` carries the fixed experiment, distribution verification, reported delivery receipt and costs. It currently has no verified channel or published receipt.
- `acquisition_decision` reviews those inputs. `marketing_queue.py` invokes it in the existing daily fleet workflow. No new cron, paid provider, standalone site, public MCP wrapper or automatic publisher is added.

To inspect without rewriting queue artifacts:

```sh
python3 tools/fleet/marketing_queue.py --check
```

For a captured public aggregate, use `--growth-file /path/to/growth.json`. A test fixture is never valid production evidence. Current queued marketing drafts remain drafts; `sends: 0` refers to this draft compiler, not a claim that every fleet channel is silent.

## Receipt and review states

The channel record needs `connection: verified`, a source and a sanitized scope reference. Keep account credentials, private audience data and personal identifiers out of this public repository.

A delivery record needs campaign/source, provider, a sanitized receipt reference, `status: published`, `verification: provider_readback`, a public HTTPS post URL, publication time and a recent readback time. These are reported evidence fields, not independently authenticated provider proof. This release does not fabricate or automatically refresh them.

| State | Interpretation and next work |
|---|---|
| `awaiting_channel` | Verify the connected account, relevant audience and publishing scope |
| `awaiting_delivery` / `delivery_unverified` | Obtain/read the actual published post; accepted or scheduled is insufficient |
| `awaiting_measurement` | Restore a current, valid aggregate; unknown is not zero |
| `collecting_evidence` | The full post-publication window has not elapsed |
| `distribution_review` | Too few qualified arrivals; inspect platform reach, outbound clicks and delivery |
| `landing_review` | Enough qualified arrivals, too few official-link actions; inspect fit and clarity |
| `cost_missing` | Record actual operator minutes and cash expenditure |
| `replicate_once` | One source-associated signal; run an independent replication before a case claim |

No state automatically authorizes spending, outreach, or charging a customer.

## Measurement limits and resource budget

- Session means an estimated 30-minute browser-tab interval, not a person. Blocked storage, separate devices/tabs, lost tags and forged requests can change the estimate. This is not anti-fraud software.
- Foreground reading for at least ten seconds or a trusted official-link click qualifies an interval. Client reports remain imperfect; bot filters do not prove humanity.
- DNT/GPC, common bots, `qa`, `__ci` and `__probe` are excluded. Unmarked owner visits can remain. Use marked links for operator checks.
- Internal, fleet and search referrers are excluded from the acquisition gate. Referrer-less tagged visits are reported separately and included as explicitly weaker source evidence. The client reports only a hostname; the database stores only its class.
- No raw IP, email, account identity, full referrer, fingerprint or client nonce is stored in this table. Public output has only campaign/source/class totals and metric definitions.
- One indexed row per estimated interval; ordinarily three stage writes. Report queries use the date index and a one-hour successful-response cache. No scan of the legacy `hits` table is introduced.
- Rows older than 31 days are removed during uncached report reads. Refresh outages can delay physical deletion. The browser notice describes this behavior; a clock-only deletion guarantee is not claimed.
- No historical campaign backfill. Deployment day is not a valid pre-change marketing baseline. Complete-day reports omit the current UTC day.

The `fireworks`, `pixverse`, `suno` and `kling` search cohorts receive no campaign script or notice. The existing search-experiment contract is checked in the normal build gate.

## Validation and current blocker

The new SQLite suite checks replay/order/expiry, the time threshold, complete days, retention, indexed reads, unknown vs zero, scope, privacy and request exclusions. The real-browser suite uses the built pages and actual handlers with local SQLite; every network request is intercepted. It covers reading, real vs scripted clicks, reload/second-page deduplication, expiry, QA/privacy, failed-arrival recovery and blocked storage. No synthetic marketing event is sent to production.

Three isolated mutations were rejected: removing the time threshold, returning false zero after a database failure, and removing the source boundary. Existing cache, search, account, build and browser gates remain required. The live verification reads the deployed version/pages/asset and sends only an ignored QA request.

Update 2026-09-29: Metricool is connected and its tools are now available. The brand-settings read returned that the brand has no social network connected. No audience, post or platform reach is therefore verified. The owner must connect the intended social account in Metricool; reconnecting the ChatGPT plugin is unnecessary. After that, inspect account/audience fit and the permitted publishing scope before the first post. No receipt has been fabricated.

**Current evidence status: growth unproven.** There is no published receipt or customer acquisition result for this experiment yet.
