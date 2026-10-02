# TDS creator videos and Labubu style odds

The owner requested recommended videos on the homepage and noted the missing style-probability tool on the Labubu page. The page previously linked to `/rarity`; it did not contain a calculator, and the older calculator covered only secrets.

## Brief and two self-reviews

1. Clarify: add a useful watch-to-tool path and a calculator directly on all three Labubu brand pages.
2. Strengthen: distinguish one regular style, a secret and known per-style odds; source names without inventing official probabilities. Use provider embeds with attribution and explicit activation.
3. Operationalize: localized controls, one active player, no autoplay, original-video fallback, shared browser/MCP math, public catalog, official registry update and existing changed-URL IndexNow flow.

Review 1 — evidence and modeling: official POP MART content confirms Have a Seat names (Dada, Hehe, Baba, Sisi, Zizi, Ququ and secret Duoduo). The editable 1:72 input is an example, not a verified rate for the current product. Regular mode explicitly assumes equal regular probabilities and replacement by the secret: `(1 - 1/N) / K`. Printed mode accepts the probability for the exact style. All multi-box calculations assume independent draws; no case assortment, no-repeat promise, POP NOW hints or prior-miss advantage is inferred.

Review 2 — failure and measurement: fractional/empty/out-of-range inputs clear results; missing mode-specific MCP arguments return a tool error. Thumbnails have a local CSS fallback because this execution environment cannot fetch YouTube image media. The iframe has a 200 px minimum height, keyboard controls, no autoplay and a close action; opening another removes the previous one. Player requests and tool-link clicks are separate first-party events, not views, watch time, users or revenue. Browser QA and privacy opt-outs emit none.

## Sources and selection

All three public titles, authors and embed HTML returned HTTP 200 from YouTube oEmbed on 2026-10-02. These are editorial picks for the site's three collection tasks, not a popularity ranking or a claim of a complete content review. They retain their original runtimes and are not presented as newly produced short clips.

| Topic | Creator | Original video | Next action |
|---|---|---|---|
| Labubu Have a Seat | Lorien's Toy Box | https://www.youtube.com/watch?v=xtvGm3qH1sc | Style probability calculator |
| SKULLPANDA Image of Reality | Toy Chat | https://www.youtube.com/watch?v=yS-JAOeq2i8 | Source-linked series guide |
| Jellycat collection tour | Vic In The Meadow | https://www.youtube.com/watch?v=wZF5TygoARs | Display planner |

- Style names: https://www.popmart.com/us/products/1372/the-monsters-have-a-seat-vinyl-plush-blind-box
- Embed behavior: https://developers.google.com/youtube/player_parameters
- The actual Labubu watch page displayed the matching title, creator, chapter and 10:09 duration. Its media remained buffering in the verification browser; full playback and audio were not verified. Other videos' metadata and embedding responses were verified, not full playback. Availability can vary by region and over time; every card retains its original link.
- Videos are provider-hosted. No downloaded MP4, copied audio or third-party thumbnail binary is committed. Remote thumbnail requests and click-to-load players are disclosed. No guaranteed captions are claimed.

## Product and discovery

- EN/DE/ZH homepage video shelf, navigation anchor and localized tool actions.
- EN/DE/ZH `/brands/labubu#style-probability`: named Have a Seat regular styles, secret Duoduo, custom regular counts, user-entered per-style percentage, box count, at-least-one/none probabilities, expected count and 50%/90% thresholds. Free, no account or payment required.
- `collector-assets/style-odds-core.mjs` is shared by the browser and `calculate_style_probability` MCP tool. Existing tools remain; public server version is 2.3.0, registered under the existing `io.github.f-tiger/dollscout-collecting` name after live validation.
- Static HTML, plain-text mirrors, root llms and tool/brand catalogs match the visible content. No upload date, video duration or view count was invented for video rich-result markup; the homepage has a source-attributed CreativeWork list, not a claim to qualify as a dedicated video watch page.
- No paid offer, membership claim, new recurring task, social post or advertising spend. Existing measurement uses `odds_calc` only on a valid submit and `collector_video_request` / `collector_video_tool` once each per page; initial previews are not completed tasks. Compare those raw action counts with homepage visits before judging the module's value; traffic, retention and revenue gains are unproven.

## Verification

- Nine collector/MCP tests pass: independent rational oracle, zero/certain/tiny probabilities, invalid and missing inputs, source/contract consistency and retirement protections.
- EN/DE/ZH at 1440, 390 and 320 px: all modes, style selection, custom counts, invalid-result clearing, one active iframe, close controls, no autoplay and no QA telemetry pass. No horizontal overflow, first-party asset errors or JS errors. A no-JS worked example remains readable.
- Assembled workbench → documents → collecting build passes all 18 collecting-page SEO/link/retirement checks. Existing analytics coverage was applied last.
- Live deployment, registry and IndexNow receipts will be added to the PR after actual publication.
