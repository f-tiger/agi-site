# Tool distribution experiments — 2026-09-29

## Three prompt passes

1. Explore acquisition beyond SEO/GEO and eight already-published organic videos. Success is useful external traffic and actions, not asset count or scheduling.
2. Compare creator embeds, runnable templates, user sharing, answer-led communities, product launches, data citations, opted-in retention and paid/partner channels. Reuse real tools; do not invent adoption, revenue or audiences.
3. Ship two bounded adoption surfaces, test cross-origin operation and failure handling, separate example/own and internal/external signals. No ads, unsolicited messages or unapproved community submissions. Keep existing video experiments intact.

## Decision table (hypotheses, not measured channel rankings)

| Route | Best fleet fit | Why a recipient might use it | Main failure mode | Decision |
|---|---|---|---|---|
| Creator embeds | ECO electricity comparison | Readers calculate both first-year and recurring costs inside an article | Nobody installs it; iframe friction | Ship localized embed kit; seek independently observable adoption |
| Runnable workflow starter | TDS file verification | Repeatable local/CI check catches changed delivery bytes | Technical audience differs from image-compressor viewers | Separate small experiment; downloads are not executions |
| Shareable outcomes | ECO scenarios; AGI dated predictions | Share one's own result rather than a generic homepage | Share button clicks do not become visits | Preserve evidence and measure receiving-page actions |
| Problem-specific answers | BPJ quota troubleshooting | Immediate diagnosis plus official sources | Broad automated promotion violates community expectations | Prepare cases; only participate where relevant rules and authorization permit |
| Product launch directories | A coherent BPJ/TDS workflow | Try a distinct useful product | One-day attention with weak activation | Defer mass submissions; improve demo and positioning first |
| Dated data/reference assets | AGI thesis ledger | A writer needs a sourced chart/verdict | Citation produces no click; stale or overclaimed data | Reuse auditable data; measure external arrival separately |
| Opted-in retention | Users who explicitly requested updates | Return when a meaningful input/verdict changes | Broken delivery promise or unsolicited contact | Verify delivery and consent before making new promises |
| Paid ads / creator sponsorship / referral rewards | Later, after a working activation path | Buy distribution or incentivize referrals | Spend amplifies weak activation; fake/referral abuse | No spend or program commitments in this round |

Embedding and templates are distribution surfaces, not an acquisition channel by themselves. Owned-site exposure and internal fleet referrals do not establish external adoption. We have not obtained partner installations, newsletter placements or directory acceptance.

## ECO implementation

Five existing electricity workbenches (DE/EN/FR/ES/IT) now offer an iframe snippet and an embed mode. Existing country calculation model is reused. Five creator-kit pages link to their local workbench kit.

The snippet contains an example only: no current bill, saved fragment or video UTM. Shared scenario links explicitly carry values in a fragment, retain the existing privacy warning, and use `via=tariff-share`. Embed mode offers a full-tool link and states third-party connection/anonymous interactions. No storage or balcony-PV products.

New `/api/distribution-growth` reads the last 14 completed UTC days, with one-hour server caching. It reports events, input kind, placement and coarse referrer evidence, not people, verified installations or revenue. `external_host` only means a non-fleet referrer; absent referrer is unknown. Frame and standalone preview stay separate. One event of each type/input kind is sent per page load. Sample-first then own-input remains observable. Client sends only the referrer origin and fixed metadata; server rejects extra metadata and excludes QA/bot/privacy signals. No schema migration.

Initial operating gate: after 14 completed days following deployment, at least one independently verified external embedding page plus 10 external-frame own-input calculation events justifies another targeted iteration. This is a provisional decision rule, not unique-user evidence or statistical significance. With no verified distribution, conclude insufficient distribution; do not infer no demand. Never count internal previews as partner adoption.

## TDS implementation

EN/DE/ZH `/verify-file` pages offer a deterministic ZIP and setup text. ZIP has six files: existing public verifier, local runner, known `abc` example, reference, README and optional GitHub Actions workflow. No npm dependency, account or TDS API call. Actions has read-only contents permission and credentials persistence disabled; adopting it on GitHub is optional and subject to account limits. Downloading does not enable any workflow.

The reference must be independently trusted. Changing both file and reference can pass. File equality proves neither identity nor acceptance, malware safety, delivery or timestamp. Optional GitHub upload exposes content according to repository visibility; confidential files can stay offline. Download click event is only a download intent, not receipt, installation or successful execution. No telemetry from the CLI and no fabricated usage count. This is not an n8n template or a marketplace listing.

Initial gate: obtain two independent reports of using the starter on a real file handoff (without collecting their files) before extending integrations. Twenty download intents without usage feedback is insufficient evidence. No universal conversion-rate claim.

## Verification

ECO model and collector tests: 10 passed, including actual SQLite completed-day filtering, strict metadata and privacy exclusion. Cross-origin Chromium checks: all five languages, 390 px layout, example/own inputs, 130 EUR first-year saving / -70 EUR recurring saving, share restoration, no private values in embed snippets, no QA event writes. TDS existing suite: 50 passed; 93 generated pages verified. Starter checks: match exit 0, altered file exit 1, malformed reference and unreadable file exit 2; ZIP verifier equals existing public CLI. EN/DE/ZH download links and mobile layout checked. All network activity during browser QA intercepted locally. Live deployment status must be reported separately.

## Source checks (2026-09-29)

- Tally documents free embeds and multiple embed forms: https://tally.so/help/embed-your-form . Evidence of a real product distribution surface, not proof of ECO growth.
- GitHub template repositories can replicate directory structures: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template . Our deliverable is currently a ZIP, not a separately configured template repository.
- n8n offers template creator submissions: https://n8n.io/workflows/ . Requires an actual n8n workflow and acceptance; current TDS starter is ineligible as-is.
- Product Hunt recommends promotion plus availability to respond: https://www.producthunt.com/launch/sharing-your-launch . A launch requires audience work; listing is not guaranteed traffic.
- Reddit requires relevant contributions and community-specific rules: https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam . No blanket 10% permission rule, no automated link dumping.
- MCP Registry is a discovery registry: https://github.com/modelcontextprotocol/registry . Registration is not proof of calls, useful visits or revenue.

## Productization implication

The future marketing skill/MCP should store an experiment record: audience/problem, selected route, reusable asset, permitted action, provider receipt, first-party action evidence, cost and continuation decision. It must distinguish prepared, published, exposed, activated and paid. Until fleet sites produce independently checkable results, sell neither guaranteed traffic nor a proven acquisition engine.
