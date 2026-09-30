# Relay marketing release proof — 2026-09-30

Code commit: d533a783b97461bbb9ef4c78519d93b48d482f7a
Workflow: https://github.com/f-tiger/agi-site/actions/runs/36648025053
Worker version: 45c695ff-b17a-4124-a1c4-1559277e3ec9
App version: relay-20260930-1

## What is live
- https://agiscorecard.com/relay-demo
- https://agiscorecard.com/zh/relay-demo
- Three animated 36-second MP4s under /create-assets/media/: EN vertical/wide and ZH vertical.
- Visible product FAQ/capsules, WebApplication and VideoObject, transcripts, sitemaps, extracted agent-readable mirrors.
- Opt-in acquisition categories, no raw referrer URLs, browser-day deduplication and bounded enum fields.

## Evidence
7 Relay tests passed. EN/ZH DB-backed local browser flows passed. Watch-page QA passed video duration/dimensions, mobile fit, starter selection, campaign preservation and no telemetry before opt-in. Site validation: 241 pages and 219 sitemap URLs. Hreflang: 160 pages, 45 clusters. Missing breadcrumbs: 0.
All three published MP4 byte hashes matched the local manifest after deploy. Chinese watch page fetched HTTP 200 with expected video and VideoObject. CI live Relay page/API/privacy verification passed.
Main sitemap and video-sitemap submitted via Search Console at 2026-09-30T00:01:45Z: both accepted, pending. Submission is not indexing or citation proof.

## Material limitation
The workflow deployed successfully but its later real AI-generation check returned HTTP 429 rate_limited and failed the overall run. The existing quota was preserved; no quota bypass, reset or limit increase was made. This is not a green full-workflow claim and does not prove current available inference capacity. Later workflow aggregate/smoke steps were consequently skipped. Earlier real EN/ZH inference proof remains in the prior experiment report. Editorial-starter play and manual remix are independent of AI inference.
No external social post has been published for this campaign in this session; no views, retention, demand or revenue result is claimed.

## Creative evidence boundaries
Original animated robot, steam, A/B choice reveal and selection ring; real starter screenshots with gentle camera movement; original 112 BPM music, click accents, synthetic English narration with ducking. Chinese cut has captions/music and no narration. Applied published YouTube/TikTok hook/story/motion/sound guidance; no claimed causal viral formula.
