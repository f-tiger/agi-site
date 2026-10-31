# BPJ Listing Pack — bounded cross-border product experiment

Date: 2026-10-31. Owner requested implementation after the cross-border AI strategy discussion. This explicitly authorizes this bounded product extension; historic general expansion freezes do not block this task.

## Three-pass brief

1. Serve a Chinese small merchant preparing an English product listing batch. Reuse BPJ's existing studio and local image/video tools; no new domain or directory.
2. Preserve merchant-provided facts and SKU identity. Detect missing data, duplicates and mismatched AI output. Native Amazon/Shopify generation is a real alternative; willingness to pay and distribution remain unverified.
3. Deliver bilingual local CSV intake, editable product facts, bounded checks, a structured AI handoff, review of returned drafts and a ZIP handoff package. Keep real inputs/files off analytics and servers. Add a separate optional inquiry with explicit contact consent and withdrawal receipt. No new checkout, price or outbound messages.

## Evidence and buyer hypothesis

Prior conversation reviewed official Amazon listing AI, Shopify native AI and BPJ's product-image/video tools. These establish competing capabilities, not customer demand. Buyer hypothesis: a merchant with repeated batches who spends time reconciling Chinese supplier facts and English channel assets. No interviews, customers, payments, savings or retention have been observed in this task.

References: https://sell.amazon.com/blog/amazon-listing-ai ; https://help.shopify.com/en/manual/ai-powered-tools ; https://baipiaoji.com/studio/product-images ; https://baipiaoji.com/studio/video-variants . Prior research checked 2026-10-17; capability documentation is not a benchmark.

## Scope and honest limitations

- Local UTF-8 CSV or pasted table; small batch cap, source fields retained; template and explicitly fictional demo.
- Product family: simple non-regulated home accessories. English copy for one market, generic review worksheet and Shopify-oriented handoff, not an automatically accepted platform import or policy certification.
- AI draft source must be explicit. No configured BPJ model runtime was found. The owner explicitly selected the existing-assistant handoff on 2026-10-31: download instructions, generate externally, then import for review. No direct API setup, automatic paid model usage or fabricated translation.
- Manual workflow can use an existing AI assistant through a downloaded prompt/JSON contract and returned draft import; a review flag never proves factual accuracy.
- Output: source facts, English draft fields, review issues, image inventory and original accepted images, and a human-readable review checklist. No automatic publishing.
- Existing image/video tools remain available; no misleading promise that a plain resize performs AI generation.
- Inquiry is an expression of interest, not a purchase or accepted order. Do not reuse membership/placement payment routes. Inquiry only stores explicitly submitted contact/scope, never the catalog or images.

## Acceptance

Test quoted/newline CSV, malformed files, limits, duplicate/unknown SKUs, missing facts, unsafe spreadsheet formulas, HTML/script strings, mismatched AI output, stale review after edits, meaningful export and ZIP traversal protection. Test inquiry validation, same-origin controls, length limits, deduplication/abuse bounds and withdrawal privacy. Browser QA with synthetic inputs and all analytics/API requests intercepted. Build and run site-specific existing release gates, canonical/hreflang, public discovery links, sitemap and GA4 coverage. Use existing actual-change IndexNow policy; add no schedules.

## Two challenge passes

Assumption challenge: platform-native AI may already suffice. Keep a concrete task and test repeat use; building a page does not establish demand.

Failure challenge: an AI draft can invent specifications, a successful export can contain unreviewed work, and a synthetic demo can look like adoption. Block unknown/duplicate SKUs, retain source facts, mark review status and unverified claims, invalidate reviews after changes, and separate demo/own/QA actions. No automatic claim that semantic truth was verified.

## Measurement and distribution

Free value: actual local checking and export without registration. Potential paid value: separately agreed human-assisted batch delivery, only after scope and a suitable payment route are confirmed. First-party and GA4 events are fixed action counts, not users, leads or revenue. Monitor own-data completion, handoff export, reviewed delivery export and actual inquiry separately; preserve QA/DNT/GPC/opt-out behavior. Reuse existing studio, toolkit and related-tool navigation. Prepare concise honest launch copy; no unsolicited outreach, new spend or recurring expense.

Initial operating gate: three independent actual buyers, positive contribution after delivery/model/support cost and evidence of a later batch before scaling. Until buyers can be reached, missing sales is inconclusive. Payment is not enabled by this release.

## Launch copy and operation

Chinese: 把供应商商品资料整理成可核对的英文上新包。导入 CSV，下载 AI 任务，用已有助手生成草稿，再导回核对事实和图片并下载 ZIP。最多 50 个 SKU，本机处理，无需注册。不是平台原生导入文件，也不自动发布商品。

English: Turn supplier facts into a reviewable English listing pack. Import a CSV, use the downloaded brief with your existing AI assistant, bring back its draft, review the facts and images, and export a ZIP. Up to 50 SKUs, locally processed, without registration. Platform-specific preparation and human review still apply.

Owned distribution: bilingual studio and toolkit navigation, related image tools, sitemap and llms.txt. No external messages sent. Existing release workflow handles IndexNow for changed public URLs only.

Inquiries use the existing private HITS D1 binding and a separate `listing_inquiries` queue. The form does not notify operators automatically: an authorized operator must inspect the private queue through existing Cloudflare access. Do not copy contact rows into the public repo, CI logs or analytics. Status `new` is interest only, not accepted work. Contact records expire after 30 days and are removed on the next valid mutation; no scheduled deletion is promised. A receipt can request earlier withdrawal. GET readiness checks do not create tables or customer records.

## Review findings resolved

- Source fields retain their original text. Surrounding SKU whitespace is an explicit error, never silently removed.
- Missing source references block the workflow; all supplied references still require human verification.
- Source/draft/image edits invalidate review. A review acknowledgement is not proof of factual correctness.
- Inquiry withdrawal proof must be available before a potentially ambiguous response; retries preserve request identity.
- Synthetic fixtures and built-in examples are separate from declared own-data activity. Event counts are not unique customers or verified revenue.
- Browser-normalized CSV line endings are used for the review-state comparison; importing ordinary CRLF files does not leave the next step incorrectly disabled.
- Withdrawal persists a proof-bound cancellation for 30 days so a delayed original POST cannot recreate the contact. Unknown withdrawals are rate-bounded; inability to persist cancellation returns an error, never a false success.

## Local release evidence

2026-10-31: 22 core cases, 15 SQLite/security cases and 3 event-contract cases passed. Independent review reported no remaining blocking issue. Playwright checked Chinese and English at desktop and mobile widths, downloaded real ZIPs and independently unpacked them with Python zipfile. Checks covered exact source and image bytes, SKU matching, reimported examples, CRLF input, review invalidation, unsafe markup, input leakage, ambiguous inquiry responses, retries, withdrawal and QA exclusion. Every browser request was intercepted; no production inquiry, customer or payment was created.

Full generated-site links, metadata, canonical routes, studio discovery and related workbench gates passed. Final analytics coverage checked 3,709 public pages with 14 intentional private/embedded/error exclusions. This verifies instrumentation and release artifacts, not GA4 backend receipt or real adoption. Live route, exact-asset, read-only inquiry readiness and GA4 checks are included in the existing deployment workflow.

Release coordination: the first release commit `786aabe6` entered CI, then unrelated TDS documentation advanced main to `d48db0ac`. The first follow-up retained the exact-main guard and rebuilt on updated main without discarding concurrent documentation. Subsequent repeated blocking led to the BPJ-only isolation check described below; the original shared exact-main check for other sites remains intact.

## BPJ release isolation after repeated concurrent updates

The first retries retained the existing exact-main check. Further independent TDS, ECO, AGI and radar updates repeatedly prevented uploading builds that had passed product checks. A BPJ-only pre-upload check now accepts a descendant main commit only when every changed path is in an audited, narrow list of unrelated content or release notes. Unknown paths, BPJ code, shared tools, workflows/configuration, and AGI server dependencies used by BPJ account tests still stop the release. The two explicitly listed BPJ release-note files are not generator inputs.

The original shared prepare guard still fetches and pins current main before building. The new check still requires main ref, a successful fresh fetch, unchanged checkout HEAD, valid built SHA and descendant history. It does not reset, rebase or change validated artifacts. Changes are read using NUL delimiters without rename collapsing, and symlinks/gitlinks cannot make allowed content an indirect protected dependency. Logs retain both the actual built SHA and checked main SHA plus accepted changed paths. All product, security, analytics and live gates remain. ECO/AGI keep the original shared exact-main check unchanged.

Maintain the list conservatively: before allowing another path, prove it is not consumed by BPJ's generators, deployed functions, shared modules or required validation. A new dependency must be protected. Temporary-repository regression tests cover content-only descendants, protected/mixed/renamed changes, unknown files, fetch failure, history divergence, changed HEAD and artifact preservation.

Validation: all 30 BPJ guard cases and all 10 original shared-guard cases passed, along with recovery/read-only workflow truth tables, the 18-site analytics release contract and YAML parsing. Independent review of both dependency boundaries and final workflow integration found no blocking issue. These are local release checks; publication still requires the complete existing CI pipeline and live verification.

Further dependency audit identified exact non-input exceptions: the TDS daily marketing plan; central fleet-evolution/pain-radar records and their trial note; and AGI's isolated Tianya browser test. BPJ has explicit test lists, does not discover tests across the repository, and does not import that AGI browser test. The central radar consumers run in separate fleet workflows; BPJ's own `data/fleet-evolution.json` remains protected. The helper lists each exception by full path; sibling data, shared consumer code, Tianya runtime and other tests remain blocked. No directory-wide root-data or AGI-tools exception is introduced. Independent audit approved these exact paths; the expanded 36-case guard suite, workflow truth tables and fleet release contract all passed.
