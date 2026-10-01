# Work Mentor / report demo

`capture.mjs` records continuous interactions with the actual local product: an incorrect net total, the cancelled row, a corrected check and a fresh case. All inputs are fictional. No model result, payment or customer outcome is staged. `render.py` adds original typography, captions, locally generated English narration and an original synthesized score.

Run from repo root with `MENTOR_MEDIA_OUT` set outside the repository; optionally set `MENTOR_BROWSER_CONFIG` to a local Playwright launch-options JSON file. Voice assets are provided through `MENTOR_VOICE_MODELS` (`kokoro.onnx`, `voices.bin`). Then run FFmpeg full decode, inspect representative frames, verify full browser playback and audio levels. Do not claim a human listened based on these checks.

The published cut is 34 seconds, 720×1280, 25 fps, H.264/AAC. The fixed title/caption areas surround a continuously recorded interface; no screenshot slideshow. The demonstration seed is 42. The inaccurate value deliberately includes the $800 cancelled order and is corrected using the tool's actual rules.

Campaign: `mentor-report-01`. CTA: `https://agiscorecard.com/mentor?utm_source=youtube&utm_medium=organic_video&utm_campaign=mentor-report-01` (use `tiktok` on that network). Always include a readable `agiscorecard.com/mentor` because short-form descriptions may not make links clickable. Adult workplace education, not made for kids. Disclose own product, synthetic narration, fictional data and optional paid cloud history. Never claim a learning outcome, salary gain or guaranteed time saving.

Creative sources checked 2026-10-01: [TikTok Creative Codes](https://ads.tiktok.com/business/en/creative-codes) (hook, body, close and motion/sound), [YouTube Shorts discussion](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/) (early hook and concise story). These are platform guidance, not a forecast of this video's reach or conversion.

Video exports, intermediate captures and audio belong outside the repository. Persist the final MP4 and caption file; upload the video through the authorized marketing connector. Record the returned platform state and URL, distinguishing pending from published.
