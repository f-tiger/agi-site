# Jarvis v14 — claim-level correction handoff (2026-10-08)

## Verified starting point

- Work started from remote `main` at `ce503b8dd64be3a6405b0bfacff2511b5cfafa29`. The 19 commits after v13 did not change Jarvis code or its standing research notes.
- The public site still reported `jarvis-20261007-13`. A read-only live check passed the English and Chinese pages, one-guest-task/free-registration contract, private task boundary, nonce CSP, bilingual structured data, 12 attempts per 24-hour window, 3 attempts per IP window and one model call for a new task. It created no account, task, payment or inference.
- The latest observed AGI deployment before this change was [run 37599822138](https://github.com/f-tiger/agi-site/actions/runs/37599822138), completed successfully on 2026-10-07. Its Jarvis build, live boundary check and private runner check all passed. The preceding relevant failure, [run 37558746238](https://github.com/f-tiger/agi-site/actions/runs/37558746238), failed before deployment in the separate portfolio build; the Jarvis build had passed, and later deployments succeeded.
- Cloudflare's current catalog still lists the deployed `@cf/meta/llama-3.1-8b-instruct-fast` model, and its May 8 deprecation notice explicitly says the `-fast` variant remains active. This is catalog availability, not a fresh Jarvis inference or quality result. The existing Relay availability job made successful English and Chinese calls to a different 70B model on 2026-10-07; it does not prove Jarvis 8B quality.
- No permission-safe Jarvis task/feedback aggregate is exposed in this checkout or the public API. Real starts, useful ratings, repeat use and retention remain unknown. No customer task, memory, key or row was read, and fixtures/page events are not counted as customers.

## Three optimization rounds

1. **Clarify:** after v13 exposes the sources for each model interpretation, let a person correct exactly the interpretation they distrust instead of restating the whole report.
2. **Strengthen:** use deterministic code, not another model self-critique. Carry only the original goal, selected interpretation and the IDs/titles of sources it actually cites. Do not copy source descriptions, URLs, memories, search consent or execution permissions. Mark the copied metadata as untrusted and not proof.
3. **Operationalize:** one click creates an editable draft and nothing else. It must not create a D1 task, call a model, persist a new feedback value or bypass the guest-trial gate. A person must add the missing criticism, review all defaults and explicitly consent before submission.

## New first-party evidence and counterevidence

Google's [People + AI Guidebook: Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapter/feedback-controls/) recommends connecting feedback to a recognizable user benefit and, where possible, letting feedback have an immediate effect. It also recommends editability and a manual fallback. This supports converting a selected weak interpretation into a correction draft immediately.

The same guide is also the counterevidence: feedback often does not tune a model immediately, and ambiguous claims about future improvement can create a false mental model. Therefore v14 does not say Jarvis learned, does not silently change memory, and does not automatically retry. The visible effect is limited to a draft the user controls.

## Candidate comparison

| Candidate | Calls added | What can be tested now | Main risk | Decision |
|---|---:|---|---|---|
| Deterministic claim-level draft | 0 | Exact copied fields, bounds, defaults, gate and side effects | Extra UI or copied untrusted text | Ship behind explicit user review |
| Current 8B self-critique | 1 | Schema/ID validity, but not honest diagnosis without labels | Repeats the same error and consumes scarce quota | Do not use for this step |
| Small extraction model | 1 | Could classify a fixed error taxonomy | Adds nondeterminism where fields are already known | Do not use |
| Stronger 70B critic | 1+ | Candidate for a future blinded semantic comparison | Higher compute/latency; recent Relay success is not Jarvis quality evidence | Keep as eval candidate |

This choice is about a recovery control, not a claim that deterministic templates make the model more accurate.

## Frozen experiment

The frozen set contains 12 synthetic English/Chinese cases: one citation, Chinese copy, duplicate citation, missing citation, no mapped source, control and bidirectional characters, prompt-like source title, HTML-like model text, four citations, oversized fields, description exclusion and malformed/missing citation arrays.

Pass criteria for every case:

1. draft is at most 1,200 characters and keeps both editable questions;
2. only known, cited IDs/titles appear once; descriptions and URLs do not;
3. control and bidi characters are removed, while HTML-like text remains inert textarea text;
4. preparation creates no task/model call/feedback mutation and resets memory selection, public search, cadence and cloud consent;
5. guest trial and registration rules are unchanged.

V13 had no finding-level correction action, so it satisfied 0/12 of this specific product-flow set. V14's pure draft cases passed 12/12; all 70 Jarvis unit, membership and security tests passed. These results validate the deterministic handoff, not source support, model quality, customer value or retention.

The first v14 release run, [37711079873](https://github.com/f-tiger/agi-site/actions/runs/37711079873), stopped before deployment in the new adversarial browser assertion. The fixture had injected an attack title into `sources[0]`, while the report cited `calc-3*60`; the product correctly copied only the actually cited source, so the expected attack string was absent. The fixture was corrected to select the source by cited ID. No acceptance condition or product guard was relaxed, and this failed run did not deploy v14.

## Two adversarial checks

1. **Privacy, authorization and quota:** a prepared draft is local and editable; it does not write D1, call AI, select device memories, enable public search, choose a daily watch or grant cloud consent. `startAllowed()` remains the same server-backed guest/account gate. Existing fixed analytics event names contain no goal, finding, source or reason.
2. **Hostile content and overclaiming:** source descriptions and URLs are excluded. IDs/titles and model text pass through bounded control-character stripping and enter only `textContent`/textarea value. The draft labels metadata untrusted and not proof; the model system prompt already treats memory and source content as untrusted. This reduces but does not eliminate prompt-injection risk after a user chooses to submit, so the UI requires review and the release does not claim automatic correction.

## Release boundaries

The model, prompt, D1 schema, retention, trial receipts, free registration, task limits and two-hour maintenance schedule are unchanged. GA4 continues to accept only the existing fixed correction events. English/Chinese pages and AI-readable mirrors retain the same honest product scope; sitemap `lastmod` is updated to 2026-10-08. IndexNow remains the existing weekly/manual process, with no per-push submission.

