# Bilingual homepage and video collection

The homepage serves readers asking what AI means for their work, learning, family or business. It now starts with a sourced, playable perspective, shows actual collection counts, and offers six topic paths and recent videos. The AGI countdown and anonymous public poll remain prominent. The evidence score keeps its original ledger date and is not presented as a probability.

Both homepages and all Future Guide pages use one navigation renderer. Chinese links lead to Chinese context; English links lead to English context. A specific episode uses a validated `watch` parameter that survives language switching. Topic, content language, publication order and creator filters also survive switching. New discovery has publisher metadata and a pending-summary label, not an invented reviewed view.

`foresight/build.mjs` generates `foresight-assets/home.json` from the same deduplicated catalog and discovery snapshot as the collection. The existing daily feed job publishes discovery; the existing deployment builds this snapshot before the homepage. Visible homepages check the published snapshot every five minutes and leave active players undisturbed. No additional scheduler, API spend or subscription was introduced.

The free path is homepage → video/topic → source-linked viewpoint → personal notebook/action. Readers can continue a question in the existing Jarvis research agent. Cross-device notebook storage uses the existing membership handoff and availability checks; this release does not introduce paid reports or represent clicks as purchases.

Authorized distribution in this release is internal placement: primary navigation, watchable homepage feature, topic links, latest-video links, paired-language links, page descriptions, generated Markdown mirrors and the public changelog/feed. Existing incremental IndexNow scheduling remains in place; acceptance and actual indexing are separate. No external messages, paid campaigns or new commercial commitments are part of this change.

Measurement uses the existing opt-in GA4 channel with fixed home actions: library, audio, video_open, view, topic, latest, notebook and jarvis. The conversion questions are which homepage paths lead to viewing, further reading, saved plans and existing membership intent. Search text, video titles/IDs, user inputs and notebook contents are excluded. Frontend validation and live coverage do not prove backend GA4 receipt or revenue.

Review 1 (source integrity): homepage counts and links are generated from the same dataset; reviewed claims are counted separately from discovered media; original publication/check dates remain explicit; page redesign does not redate verdict evidence.
Review 2 (journey and regression): phone countdown stays in the first viewport; video loads only after a click; deep links and language switching retain the episode; embed mode hides the shared header; existing poll, privacy, local notebooks, export and membership handoff are covered by regression checks.
