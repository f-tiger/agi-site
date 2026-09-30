# BPJ Codex Efficiency v1

Owner authorized implementation on 2026-09-30 after the v5 product/pricing review. This overrides the historical Studio expansion hold for this product only. Research and decisions: https://chatgpt.com/space/page_761deafe6a7c819198f5226cbb049cca (private working document).

## Buyer and job

Hypothesis: independent developers using local Codex CLI on recurring projects will pay for project-specific execution rules and repeated-run review. Quota complaints are anecdotal demand signals, not validated willingness to pay. Existing ccusage and shell-output optimizers mean a token dashboard alone is insufficient.

Ship a repository-distributed Skill with a dependency-free local CLI. No personal ChatGPT skill installation is requested. Explicit project/session selection; bounded reads; no auth-file discovery; no raw log uploads. Tokens are observed session counters, never subscription credits or a cash bill. Unsupported logs report unknown. No model proxy, guaranteed savings, automatic rule installation or enforced token cap.

## Paid delivery from the first release

Lite is free. One complete project evaluation per BPJ account is free. Pro: 19 USDT / 30 days, manual renewal, 3 project slots per period, 100 evaluations per period, 30-day evaluation history. Checkout quotes add a nonrecycled identification fraction below 0.01 USDT, disclosed before payment. One evaluation accepts at most 30 numeric run summaries / 16 KiB and returns a policy with evidence. Failed requests do not consume quota; retries use the same idempotency key. A project slot stays assigned until period expiry to prevent unlimited rotation. Early renewal queues another 30-day period with its own quota, rather than silently replenishing the current period.

Use existing BPJ cookie accounts; issue revocable, scoped device credentials. Never ask the model to handle a password, membership master key or OpenAI credential. Device linking requires browser consent and a one-time code. Dedicated order, entitlement and usage tables preserve existing 9-USDT membership semantics. Shared chain receipt uniqueness prevents a transfer buying two products. Only finalized, exact-chain/token/recipient/amount/time-window evidence activates a period.

First purchase has a 7-day refund request window. The customer supplies a BSC refund destination in their authenticated account. Requests are recorded for operator processing; the API never sends funds. Completion requires finalized outgoing-transfer evidence from the configured merchant wallet and revokes the matching entitlement. Refund requests and completed transfers are distinct states. Publish this process and retention limits before enabling checkout.

## Implementation gates

Real SQLite transaction tests: forged payment, reused receipt, concurrent/idempotent evaluations, expiry, renewal, refund revocation, cross-account access, trial repetition, device code expiry/rotation. Local CLI: unsupported/reset counters, malformed/large logs, symlink/path escape, summaries without raw content, safe install/uninstall. Browser: account, linking, checkout consent, failures and private output. Run existing BPJ build/canonical/dist gates and related account/member tests. New checks must fail when their protected condition is deliberately broken.

Payment enablement remains separately gated by live readiness and operator configuration. No actual payment or refund is initiated by this implementation. Do not call mocked chain tests production payment acceptance. No external marketing posts, directory submissions, paid model calls or new schedules.

## Discovery and experiment

Chinese/English installation + pricing page, Studio/search/coding entry, sitemap and llms link. Fixed-version source distribution; no unverified marketplace listing. Headline explains workflow improvement; before/after illustrations are explicitly synthetic, not measured savings.

Targets, not results: day 14, 20 qualified offer viewers / 3 buyers who use Pro; day 30, 50 qualified offer viewers / 10 nonrefunded buyers / 7 repeat evaluators. Stop expansion if 50 qualified offers produce fewer than 3 purchases. First 10 eligible renewals target 6. Variable delivery cost target <=3 USDT equivalent per paid cycle. Do not infer people or revenue from downloads, bots or page events. No telemetry without disclosed consent; server orders and successful evaluations are the commercial truth. The 20-task paired model-quality study remains a later live-client experiment, not a unit-test claim.

## Visual direction

Reuse BPJ navigation and typography. White #ffffff, ink #182b46, slate #53647a, blue #2457a7, pale blue #edf3fc. A readable project-review example beside a short install path; simple comparison rows for pricing. Buttons describe installation, linking or purchase. No fake savings counters, decorative dashboard charts or fabricated testimonials.
