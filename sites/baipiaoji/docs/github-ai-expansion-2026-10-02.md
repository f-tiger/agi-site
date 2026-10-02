# GitHub catalogue expansion: AI and LLM focus

Owner instruction, 2026-10-02: “项目太少了，扩大搜索，github 的精品项目非常多，特别是 AI 大模型重点”. This explicitly authorizes expansion now; the earlier observation target does not block the requested scope.

## Scope and evidence

80 unique projects, retaining all 12 original IDs and adding 68 AI-related projects: 47 applications, 19 developer frameworks, 14 model repositories. This is an editorial selection, not a top-80 ranking or latest-model leaderboard. Existing `/tools/` discovery records and `/agents/` registry entries remain separate.

Overlapping topics: chat 11, local inference 12, knowledge/search 17, agents/automation 18, coding 6, images 8, audio 9, video 9, models/fine-tuning 20, OCR/documents 6, everyday 12. UI counts derive from the dataset; the AI filter covers 68 projects.

Candidate discovery used GitHub searches for `topic:llm stars:>20000`, `topic:rag stars:>10000`, `topic:ai-agents stars:>10000`, `topic:text-to-speech stars:>5000` with archived/fork exclusions, plus official-organization/name searches and web searches. These are discovery queries, not claims that every selected project meets those star thresholds. Lower-star official repositories can be selected for useful coverage.

All 68 additions have retrieved canonical GitHub metadata and an official README. Cards record dated stars, primary links, bilingual tasks, setup/runtime requirements, cost boundaries, limitations and three steps. Metadata review does not establish installation success, model quality, full security or OSI license certification. Existing snapshots retain their original timestamps.

Current-source decisions:

- Flowise and Roo Code repositories are archived; exclude them from new recommendations: https://github.com/FlowiseAI/Flowise and https://github.com/RooCodeInc/Roo-Code .
- AutoGen documents maintenance mode and recommends https://github.com/microsoft/agent-framework for new projects. Preserve the AutoGen README as a source on that card.
- Canonical changes: Perplexica → https://github.com/ItzCrazyKns/Vane ; LobeChat → https://github.com/lobehub/lobehub ; LibreChat → https://github.com/LibreChat-AI/LibreChat ; CosyVoice → https://github.com/QwenAudio/CosyVoice ; CogVideo → https://github.com/zai-org/CogVideo ; MiniCPM-o → https://github.com/OpenBMB/MiniCPM-V . Search retains common old names.
- Verified Qwen and GLM family repositories: https://github.com/QwenLM/Qwen3.8 and https://github.com/zai-org/GLM-5 . Version-specific V3/video entries do not promise to cover the latest release.
- https://github.com/SWivid/F5-TTS distinguishes MIT code from CC-BY-NC pretrained weights. Both cost and limitation text disclose this. Other custom licenses and model-card conditions are not flattened into unrestricted commercial use.
- Of 80 official entry URLs, 79 returned HTTP 200 initially. Unsloth’s site returned 403; its README-linked official GitHub Releases alternative returned 200 and became the card entry. Reachability is not application-health testing.

## Three prompt refinements

1. Outcome: substantially expand AI/LLM coverage while translating repositories into tasks understandable by nontechnical visitors.
2. Constraints: canonical official sources, stable old links, separate app/framework/model types, explicit API/compute/weight-license costs, no archived recommendations or unsupported pricing/performance promises.
3. Acceptance: 80 unique projects including 68 AI-related, complete bilingual fields, full-catalogue topic/type/device/setup search, usable mobile filters and pagination, working project deep links, connected discovery surfaces, release gates and production verification.

## Two adversarial self-reviews

These are self-reviews, not independent reviewers.

Round 1 challenges selection: popularity can survive archival; repositories move; model weights are not apps; stars do not prove ease of use; source code does not include free APIs or unrestricted weights. Corrections: live canonical/archival checks, replacements above, separate types and runtime fields, specific cost/license caveats and no benchmark promises.

Round 2 challenges use and conversion: pagination can hide search matches or deep links, mobile selects can overflow, and “free code” can mislead commercial users. Corrections verified in browser: search all 80 before showing 18, reveal anchors beyond the first batch, clear conflicting filters for explicit project anchors, preserve shareable category/type state and QA markers, fix select sizing, and display F5-TTS weight restrictions prominently. Queries are not analytics payloads; automated visits remain excluded.

## Distribution, payment and measurement

Owned marketing action: bilingual homepage AI-focused pitch and direct AI-application link, topical filter URLs, global search, feature map, existing MCP feature-map resource, llms.txt and bilingual JSON. Existing hub canonicals/hreflang/sitemap and substantive-change IndexNow flow remain. No new cron, thin project SEO pages or new MCP registration. Do not claim external social publication, third-party listing acceptance or search indexing.

Free audience value is source-backed discovery and practical setup/cost guidance. Buyer hypotheses remain maintainers and hosting vendors using existing vendor/sponsorship offers. Payment buys neither organic order nor endorsement. The proposed USD29 scoped setup service stays closed pending real requests, delivery/support/refund economics and payment readiness. This release opens no checkout or paid entitlement.

Existing `github_tools` events use fixed actions and allowlisted project IDs; no raw searches, referrers or personal input. Guide opens, official opens and vendor intent are not installations, unique people or revenue. Existing reporting remains the observation channel. The 28-day operating target is 30 official opens and 10 guide opens; low exposure is inconclusive, and the target does not override an explicit expansion request.

## Validation

Local final build: 3324 HTML pages, zero failures in the complete static verifier; canonical routes, search and site journeys pass. All 61 selected existing local gate commands pass after supplying the existing Chromium executable for two quote-page browser checks. The expanded GitHub browser gate passes both languages, mobile, full-catalogue search, topic/type filters, pagination, URL state, deep links, XSS, no-JS and QA exclusion. Homepage consent/repeated-action browser checks pass. These use intercepted/local traffic, not customer activity.

The release receipt records the final commit, deployment, IndexNow response and production checks separately. No installation, traffic growth or revenue result is claimed from these tests.
