# TDS: real local AI tools — 27 September 2026

The owner asked for AI tools after the non-PDF expansion. TDS now has twelve tools in six categories, with AI first on the homepage. Existing PDF, image, JSON, time-zone and delivery tools remain available. English is the default home; localized English/German/Chinese pages explain the actual model-language limits.

## Shipped scope

| Tool | Actual computation | Output and limits |
| --- | --- | --- |
| `/ai-portrait-background-remover` | MODNet neural portrait matting | Transparent PNG; people, not generic products; 10 MiB/20 MP input, longest output side ≤1,600 px |
| `/ai-audio-to-text` | Whisper Tiny English neural speech recognition | English TXT and approximate SRT; WAV/MP3 ≤10 MiB/60 s; no speakers, translation or live recording |
| `/ai-text-summarizer` | MiniLM neural sentence embeddings + deterministic centrality/diversity selection | Original English sentences with source links; 80–12,000 characters, 3–60 sentences, ≤256 tokens/sentence; no paraphrase or factual verification |

Each model uses an immutable Hugging Face revision and q8 ONNX weights. Runtime: Transformers.js 3.8.1, one CPU WebAssembly thread in a Web Worker. No WebGPU dependency, server inference endpoint, model API credential, new paid service or billing change. Published weight sizes are 7/41/23 MB rounded up; runtime/configuration/tokenizer files add download bytes. Initial model downloads require connectivity and device memory. Slow, old or restricted browsers may fail; no universal compatibility or offline availability claim.

Loading is explicit. The ordinary page loads no model or third-party runtime. Clicking Load downloads from jsDelivr/Hugging Face and its CDN; those providers see connection metadata, not user files/text. Inference inputs go only to the local worker. Inputs/results remain in memory; downloads are user controlled. Models may persist in browser cache. Privacy disclosure is visible before loading and in the general privacy page.

Cancellation terminates the worker, releases result blob URLs on clear/change and suppresses stale asynchronous results. Model failure has a retry path. Oversized input and long sentences fail explicitly rather than silently truncating. Silence is rejected before transcription; noisy speech can still hallucinate and every transcript is a draft.

## Positioning and evidence

This is a low-operating-cost product-scope experiment. Likely uses are portrait assets, short English audio clips and source-linked reading notes. Demand, conversion and willingness to pay are not established. These models are not frontier LLMs; neither the AI label nor more pages proves search demand or ranking improvement.

Alternatives include hosted cutout/transcription/summary services and running the same open models directly. Local processing plus task-focused exports is useful, but not a moat. BPJ remains a broader AI-product discovery/creator resource; these TDS routes perform their advertised bounded tasks. No paid plan, marketing message, directory submission or external post was added.

The next acquisition signal is per-tool search impressions/clicks, then own-input completion and export actions. Existing `document-stats` and daily document metrics include the new fixed events. Samples and CI remain excluded. Anonymous actions are not unique users, customers, verified citations or revenue. No new schedule was created. Review the existing traffic window after sufficient observations; this document does not authorize a new recurring task.

## Search and citation surface

Nine new localized tool pages; total 57 generated pages, 54 document-sitemap URLs. Canonical/hreflang, WebApplication, visible matching FAQ, crawlable links, source/method/limits, pinned model references, plain-text mirrors and llms capability records are synchronized. Homepage CollectionPage/ItemList lists twelve tools. An original text sample and the observed summary selection are visible without JavaScript. `/document-assets/ai-evaluation.json` exposes the reproducible real-model smoke check; it is not an accuracy benchmark. Submission acceptance and crawler access are not indexing or AI citation.

## Verification before release

- 43 Node tests passed: prior PDF/utility behavior plus original-sentence preservation, invalid vectors/limits, silence, SRT bounds, pinned models and private-input rejection in analytics.
- Static verifier: 57 pages; current TDS structured-data gate: 170 entries, zero visible-text mismatches.
- Actual Chromium browser inference through final page controls: MODNet generated a 512 × 341 RGBA PNG with both transparent and opaque pixels; visual preview inspected. English speech yielded a transcript and two SRT segments. MiniLM selected source sentences 1, 3 and 6 from the original seven-sentence example.
- Browser checked all nine localized pages at 390 px, all three homepages (12 tools/6 groups), a 1,280 px homepage and existing PDF comparison sample. No page overflow or page errors; no processing POSTs observed.
- Explicit-load network check, model-download failure/retry, invalid image, silent audio, sentence token overflow and cancel/no-stale-output passed. The QA harness used the execution environment's outbound proxy; this is not a tested compatibility matrix for all user devices or regions.
- A first test used an insufficiently long token-limit fixture; corrected to actually exceed 256 tokens. Production guard then rejected it as intended. A mistakenly repo-wide structured-data invocation reported unrelated old-site entries; the TDS-scoped required gate passed. No unrelated site changes were made.

## Primary sources checked

- https://huggingface.co/docs/transformers.js/v3.8.1/index
- https://huggingface.co/docs/transformers.js/v3.8.1/pipelines
- https://huggingface.co/Xenova/modnet and https://github.com/ZHKKKe/MODNet
- https://huggingface.co/Xenova/whisper-tiny.en and https://github.com/openai/whisper/blob/main/model-card.md
- https://huggingface.co/Xenova/all-MiniLM-L6-v2 and https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- https://developers.cloudflare.com/workers-ai/platform/pricing/ — assessed, not activated
- https://docs.typesafe.ai/api — assessed, not integrated; no account credential or service assumption
- https://huggingface.co/briaai/RMBG-1.4 — not selected because its commercial use requires a separate agreement

## Production release

- Feature commit: `0c4a47abcd63e7609c1528877f4cf8d551eeb255`.
- Deployment propagation fix: `a8ee1e15997436a90d51c47c2e13c7cd551802c6`. The first run read the previous 48-page manifest immediately after deployment and correctly failed the 57-page assertion. The live gate now retries the entire strict check four times, eight seconds apart; assertions are unchanged.
- Final successful workflow: https://github.com/f-tiger/agi-site/actions/runs/36329301209 (job `108648050625`). All build, historical-site, structured-data, 57-page production, membership, workbench and isolated telemetry checks passed. Live build stamp matched the propagation-fix commit.
- Actual inference through `https://thedollscout.com` passed for all three tools. Downloads: summary TXT, speech TXT/SRT, portrait transparent PNG. The production homepage has 12 tools. No processing POSTs or page errors were observed. Four existing Cloudflare `/cdn-cgi/rum` performance beacons were inspected separately: timing/navigation metadata, no supplied sample text, transcript or input filename. The test did not treat these performance requests as file uploads or promise zero network traffic.
- Google Search Console accepted both published sitemaps at 2026-09-27 15:24 UTC (23:24 Asia/Shanghai), pending download. Document sitemap contains 54 URLs; full sitemap contains 109 URLs. Acceptance is not indexing.
- The successful retry's workflow-only change had no new public-content diff, so its changed-only document IndexNow step correctly skipped. A bounded recovery submission covered the 54 changed document URLs from the verified feature release; the public verification key was checked first. See the result below. The independent eight legacy workbench URLs were also accepted by their existing workflow step; they are not the new AI pages.

The page/model behavior is verified. Organic traffic, ranking changes, real task adoption and AI citations are not yet established by this release.


IndexNow recovery: 54 URLs, HTTP 200, accepted=true; indexing unknown.
