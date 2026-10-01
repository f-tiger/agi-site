# Fleet distribution round 2 — 2026-10-01

## Decision and scope

Continue the existing marketing round with two distribution experiments: an embeddable BPJ work planner and standard discovery for the existing Codex Efficiency Lite skill. Do not add another product, paid tier, email platform, link platform or advertising expense.

The current fleet already contains ECO creator embeds, the TDS verifier starter kit, BPJ quote tools, ReleaseCheck and the Mentor pilot. This round adds a missing BPJ embed and makes an existing public skill easier to install. It does not duplicate those launches.

## Three prompt refinements

1. **Goal:** identify another practical acquisition path for existing tools, connected to useful paid delivery; traffic volume alone is not the objective.
2. **Constraints:** inspect current main and existing assets first; use primary project documentation; preserve payment readiness gates; no purchased traffic, new recurring services, unsolicited messages or fabricated adoption.
3. **Acceptance:** bilingual public entry points, an actual interactive calculation, correct full-tool handoff, verified standalone skill discovery, documented free/paid boundaries, deployment checks and measurable activation definitions.

## Two adversarial self-reviews

These are self-reviews, not independent agent reviews.

- **Assumption challenge:** installing popular marketing infrastructure does not create an audience. Existing embeds and downloads are not evidence of external adoption. Correction: ship two small distribution surfaces, retain existing products and pricing, and require external placements plus edited task completion before expansion. A generic all-repository Skills command would expose many unrelated marketing skills. Correction: publish a one-product allowlist and explicitly select the skill and agent.
- **Failure and measurement challenge:** previews, default calculations, local tests, copied commands and file downloads can all inflate growth claims. An iframe could leak workload parameters or send readers into an account flow inside another site. Correction: isolate the widget, keep computation local, share state only after the reader opens the full tool, suppress QA/DNT/GPC and third-party analytics, and separate modes and actions. Publish only six exact release files. Check bytes after an isolated Skills CLI installation. Never claim marketplace approval, successful customer installs or sales from these tests.

## Primary-source research and selection

| Direction | Primary project / documentation | What it supplies | Fleet decision |
|---|---|---|---|
| Skill distribution | [vercel-labs/skills](https://github.com/vercel-labs/skills), MIT; [well-known provider source](https://github.com/vercel-labs/skills/blob/3694740352eeef5cdd689af694c485f1ff62eec3/src/providers/wellknown.ts) | Specific-skill / agent selection, project installation and web discovery | Ship a bounded catalog for existing Lite. Verified with released CLI 1.7.0; no server platform added. |
| Website embeds | [Tally embed documentation](https://tally.so/help/embed-your-form) | An established example of letting publishers add an interactive product to their pages | Apply the distribution pattern to our own calculator. No Tally code or account dependency. This is not evidence that our widget will grow traffic. |
| Search quality | [SEOnaut](https://github.com/stjudewashere/seonaut), MIT | Technical SEO crawling and issue discovery; self-hosting requires its runtime/database | Defer a new service. Existing canonical, link and sitemap gates remain in use; add deeper crawling when an observed indexing problem warrants it. |
| Attribution / referral | [Dub](https://github.com/dubinc/dub) | Link attribution and marketing integrations | Defer. Current experiments have first-party action counts; there is no validated referral program to justify another stack. Do not equate click tracking with new demand. |
| Email retention | [listmonk](https://github.com/knadh/listmonk), AGPL-3.0 | Self-hosted mailing-list management using PostgreSQL | Defer until a permissioned audience and useful recurring delivery are established. Installing a sender does not acquire subscribers. |

Sources checked 2026-10-01. The Skills source clone was commit `3694740352eeef5cdd689af694c485f1ff62eec3`; npm reported version 1.7.0. Star counts, vendor customer logos and vendor volume claims were not used as evidence of fleet conversion or growth. These selections are our operational inference from documented capabilities and current fleet gaps.

## Experiment A — publisher embeds

**Publisher:** an AI workflow educator, tutorial author or tool-directory editor who wants readers to calculate directly inside an article.

**Reader:** someone with a real recurring workload who needs to compare that workload with sourced free allowances. The widget uses the exact existing planner functions and data; no new allowance assumptions.

- Publisher entry: [中文](https://baipiaoji.com/work-plan#embed) / [English](https://baipiaoji.com/en/work-plan#embed).
- Widget: `/embed/work-plan`, `/en/embed/work-plan`; noindex, excluded from sitemap and GA4 by the existing widget policy.
- Free: embed, calculation and full-tool exports, no account required.
- Paid continuation: existing cloud workspace, **9 USDT / 30 days**, manual renewal, recent 10 versions and cross-device restore. This round does not claim a new successful payment acceptance or change entitlement code.
- The HTML snippet contains no reader-specific query or fragment. The widget does not contact its parent, open account workflows, load third-party analytics or send task values to `/api/hit`.
- Opening the full planner is an explicit action. Task parameters travel in its URL fragment, which is not sent in the HTTP request. Readers are told this before opening.
- Anonymous event counts contain only allowlisted action/mode/input class, language and coarse referring domain (the shared endpoint also stores date and country). They contain no workload, email, cookie, unique ID or publisher URL path/query.

**Owned marketing actions:** add the publisher entry near the planner headline and below the explanation; provide copyable bilingual embed code; add GitHub README and `llms.txt` discovery links. External outreach has not been performed or claimed.

**Publisher-facing copy:** “Let readers check free AI allowances against their own workload inside your tutorial. Embed the free BPJ planner; they can open the full result and export it.” One action: open the embed guide.

## Experiment B — existing skill discovery

**User / potential buyer:** a local Codex CLI developer who reviews repeated tasks and wants inspectable counters and workflow evidence. No claim that token counters equal remaining subscription quota or a bill.

- Entry: [中文](https://baipiaoji.com/studio/codex-efficiency#install) / [English](https://baipiaoji.com/en/studio/codex-efficiency#install).
- Catalog: `/.well-known/agent-skills/index.json`, with compatible `/.well-known/skills/index.json` fallback.
- Exactly one listed skill; six allowlisted files, byte-for-byte matching product release commit `db601fe9c7407c976403316fdc48e6bad872a3aa`. SHA256SUMS is public; a build fails if release bytes change without a reviewed distribution update. Private product context and logs are excluded.
- Public command: `npx skills@1.7.0 add https://baipiaoji.com --skill bpj-codex-efficiency --agent codex --copy`. Run in the chosen project after source review; existing installations should be backed up. Skills CLI owns replacement/removal for this path; the original BPJ installer remains available.
- Lite stays free and local. Pro remains the existing proposed **19 USDT / 30 days**, 3 projects, 100 evaluations and 30-day history, subject to the live readiness gate. On 2026-10-01 the public endpoint returned `ready:false, trial:true`; purchase remains closed.
- No new MCP is advertised. The existing BPJ MCP registration is a separate product surface.

**Owned marketing actions:** product page install section, copyable exact command, GitHub README and machine-readable catalog. This is self-published discovery; neither a marketplace approval nor a leaderboard listing is claimed.

**Developer-facing copy:** “Codex stuck retrying? Inspect one selected local session before the next run. BPJ Lite keeps raw logs local and lets you review the counters and retry evidence.” One action: review source and install Lite.

## Measurement and decision rules

All thresholds below are experiment targets, not forecasts. Review the first 14 complete UTC days after verified deployment; there is no newly scheduled automation in this round.

| Signal | Interpretation | Expansion gate |
|---|---|---|
| `distribution /work-plan/view/{mode}/{input}` | Widget impression; not a unique visitor or installation | Not sufficient alone |
| `distribution /work-plan/calculate/external/edited` | An explicit calculation whose settings differ from its selected role's defaults, in an external frame | At least 10 events **and** 2 manually verified, relevant external placements before investing in publisher features |
| `distribution /work-plan/open/{mode}/{input}` | Full-tool link activated | Intent only; browsers may block navigation |
| `distribution /work-plan/arrive/page/{input}` and `/calculate/page/{input}` | Tagged full-tool arrival / explicit calculation | Useful continuation counts, not individually joined conversions |
| `distribution /work-plan/copy/page/none` | Embed snippet copied | Not a published embed |
| `distribution /skill/copy/page/none` and `/source/page/none` | Install command copied / source opened | Need 5 user-confirmed real-task uses before proposing broader skill features; no install telemetry or count is inferred |
| Existing checkout / entitlement records | Separate payment truth | Only verified records count as revenue; closed Pro cannot generate a paid conversion rate |

`preview`, `owned`, `direct` and `frame-unknown` are separate from `external`. Owned mode excludes BPJ, ECO, AGI, TDS and their subdomains. Missing referrers stay unknown; never reconstruct identity. The public endpoint can be spoofed; action counts alone cannot establish unique people, causal uplift or external adoption. Local and CI requests are suppressed or intercepted. Neither copied code nor test installs enters a customer-install ledger.

If there are no verified external placements, refine the publisher message and permitted distribution before building more features. If placements exist but edited calculations do not, inspect audience fit and the first-use experience. If readers calculate but do not continue, test the relevance of cloud delivery before changing price. Do not treat a closed checkout as a rejected offer.

## Validation record

- Built 2,357 HTML pages; full HTML gate: zero broken links, structured-data parse errors, language leaks, placeholders, stale counts or hreflang errors. Canonical/sitemap checks passed.
- Existing work-plan arithmetic/share/restore, studio and agent-discovery gates passed.
- 35 new checks cover event allowlists, server/client privacy gates, catalog scope, file integrity and widget indexing/analytics isolation.
- 36 browser checks cover both widget languages at phone width, explicit example/edited actions, coarse referral, full-tool state handoff, no opener, safe publisher snippet, copy feedback and QA separation. Browser requests were intercepted; they are not production usage.
- Skills CLI 1.7.0 discovered the served catalog and installed only the selected skill in an isolated compatibility-test project. All six installed release files matched their expected SHA-256 digests. The test did not invoke the skill against user logs, enroll an account or purchase Pro.
- Production deployment receipts and live checks are recorded below and in `fleet-distribution-round2-2026-10-01.json`.

### First production verification and correction

- Feature commit: `1dc2c1a0b267b4b1cc9431cd7ccc46e5b7986515`. Its first workflow was superseded by another main-branch release. The descendant deployment `dc75bc477642daaae7b8329bd0cef2bed013c6f8` completed successfully in [run 36868968765](https://github.com/f-tiger/agi-site/actions/runs/36868968765).
- Skills CLI 1.7.0 successfully discovered exactly one skill and six files from the **production** `https://baipiaoji.com` endpoint using `--list`. This read did not install a customer skill, enable telemetry or count as customer adoption.
- HTTP inspection found Cloudflare email obfuscation rewriting `skills@1.7.0` inside the public install command. Browsers may decode it, but machine readers receive altered text. The correction wraps only this non-email command in the supported `email_off` HTML markers; no zone-wide protection setting changes. [Cloudflare primary documentation](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/#prevent-cloudflare-from-obfuscating-email).
- Corrective deployment and final raw-command verification completed; see the final receipt below.

### Final release receipt

- Corrective commit `fbc87edc9699224ee6de7156e4caadd2be09c85b` completed successfully in [deployment run 36870234022](https://github.com/f-tiger/agi-site/actions/runs/36870234022).
- **2026-10-01 13:38 UTC:** both widget routes, both publisher guides, install surfaces, the deployed JS/CSS bytes, both discovery indexes and all six release files under each index verified over production HTTP. Widget responses permit framing, declare noindex and omit third-party analytics. Both indexes returned CORS permission.
- **2026-10-01 13:44 UTC:** Chinese and English installation pages returned the exact raw pinned command, without email obfuscation. Public Pro status was rechecked: `ready:false, trial:true`.
- Local compatibility installation and real production CLI discovery are separate checks. No customer installation or paid conversion is inferred. External placements, incremental traffic and revenue remain unverified.
- Complete reproducible route/file outcomes: [machine-readable receipt](fleet-distribution-round2-2026-10-01.json). This closes the deployment task; expansion remains subject to the experiment gates above.
