# Relay friends 01 — animated launch creative

## Three prompt refinements and adversarial checks
1. Replace broad “promote an AGI social network” with one adult friend-to-friend interactive-story use case. Objection: more generated output does not prove a reason to share. Answer: test play → edit → remix.
2. Replace a feature-list advertisement with an immediate fictional choice: a robot wants coffee that tastes like Friday. Objection: abstract AI claims and slow intros lose attention. Answer: animated robot, A/B options, movement, a short payoff, then actual UI.
3. Tie the creative to a playable deep link and opt-in bounded attribution. Objection: views and query tags do not prove acquisition or retention. Answer: report referrer versus tag-only evidence separately; measure consenting browser-days, never call these unique humans.

## Delivered assets
36-second EN 9:16 and 16:9; ZH 9:16. H.264 baseline, 25 fps, AAC stereo 48 kHz. Original robot/steam/choice animation, selection pulse, UI pans, transitions and relay dots. Original 112 BPM music and click accents; EN synthetic voice with music ducking; ZH captions/music without narration. Five scenes: hook, choose, ending, edit, invitation. Burned-in subtitles plus VTT/SRT, posters and SHA-256 manifest.

Outputs: sites/agiscorecard/create-assets/media/. Watch pages: /relay-demo and /zh/relay-demo. These show actual editorial/manual UI, not a fabricated AI run.

## Reproduce and verify
From repo root run capture.mjs, render.py (Pillow/numpy/soundfile/kokoro_onnx and ffmpeg), then qa.mjs. Existing local voice paths are in media_base.py; provide a compatible Kokoro model/voices and Chinese font. Local rendering does not call the product AI. The optional RELAY_CHROMIUM environment selects headless Chromium. Browser QA verifies playable video metadata, mobile fit, deep-link starter and no opt-out telemetry. Existing Relay browser tests cover actual local DB-backed publication/remix/deletion, with AI explicitly a fixture. Three files decode in ffmpeg; audio is non-silent and original score is mixed below EN voice.

## SEO / GEO
Visible bilingual product descriptions, limitations and FAQs; canonical/hreflang; WebApplication; dedicated video-first pages with accurate VideoObject and transcript; main and video sitemaps; extracted English Markdown mirror/feed. Crawlable facts help retrieval but cannot guarantee Google indexing or AI citations. Private/unlisted story URLs remain excluded. No fake ratings or mass generated doorway pages.

## Baseline and experiment
GSC inspection at preparation: /create unknown to Google. Query report returned zero rows for 2026-08-30–2026-09-26, a PRELAUNCH window; this is not evidence of zero postlaunch demand. No platform reach, engagement or revenue result has yet been observed for this campaign.

Suggested first review: after each channel has at least 100 qualified video starts, inspect first-3-second hold, completion, source-linked starts and completed plays; definitions differ across platforms. Treat these as directional small samples. Compare a later hook variant with the same body/CTA and similar exposure; do not attribute all differences causally to the hook. Do not buy traffic until organic viewers actually complete/remix the experience. Social publication is not established by creation of these files.

YouTube link: https://agiscorecard.com/create?starter=cafe&utm_source=youtube&utm_medium=organic_video&utm_campaign=relay-friends-01
TikTok link: https://agiscorecard.com/create?starter=cafe&utm_source=tiktok&utm_medium=organic_video&utm_campaign=relay-friends-01
UTM-only evidence stays explicitly tag_only. Self-reported client events are not fraud-proof. Opt-in samples omit nonconsenting visitors; browser-day counts are not people or attributable lifetime conversions.

## Sources actually consulted
- https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/ — first-second hook and miniature story, creator interview.
- https://ads.tiktok.com/business/en/creative-codes — hook/body/close, movement, sound, vertical format and safe space.
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide — grounded crawlable content, no special AI schema shortcut.
- https://developers.google.com/search/docs/appearance/video — video-first watch pages and accurate metadata.
These are published creative/search principles, not a measured sample of competitor viral clips or a guarantee of reach.

## Storage correction — 2026-09-30
Owner requested deletion of videos from the code repository. The three MP4s and hosted video manifest/sitemap were removed. Watch URLs now serve a text walkthrough and playable-app link. Rendering now defaults to /tmp/relay-marketing/exports (override RELAY_MEDIA_OUT), and video extensions are ignored by Git. Previous release descriptions above are historical, not current hosting claims. This normal deletion does not rewrite existing Git history.
