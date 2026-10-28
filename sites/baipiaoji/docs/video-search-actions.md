# Video production actions and bounded catalogue discovery

The Manju search UI used to abort and restart an automatic source lookup when a visitor submitted the same query. It now keeps that request, reuses up to 20 successful/empty results for 15 minutes in tab memory, and respects the API's rate-limit retry interval across queries. Server quotas remain unchanged. Local matches, suggestions and recommendations remain usable during cooldown. Queries are not persisted or added to analytics. Stale responses cannot replace the current query.

Video production previously used only the existing first-party event stream. The public entry, case player and editor now also use the shared isolated GA4 channel with exact BPJ routes and fixed action names. The original first-party definitions remain unchanged.

- `video_example_*`: fictional examples and their actions.
- `video_editor_open`, `video_membership_open`: navigation intent, not completion or payment.
- `video_attach_media_own`: successful local attachment, not an upload or finished video.
- `video_export_video_own` / `video_export_batch_own`: completed own-project video rendering and download initiation. The `_demo` counterparts remain separate. A download initiation does not prove the user kept the file.
- Project/brief/handoff exports remain distinct from rendered video exports.
- `video_cloud_open_own` is intent; `video_cloud_saved_own` requires the existing validated member acknowledgement. Neither proves a new sale.

No customer text, filename, media, project ID, query or amount enters these fixed GA4 actions. Stored opt-out, QA, DNT, GPC and automation exclusions apply, including after asynchronous module loading. Private account/member pages remain excluded. Frontend tests are not proof of GA4 backend receipt.

## Verification and follow-up

Browser fixtures intercept all network requests. Regressions cover duplicate submits in flight and after completion, revisiting cached queries, cooldown across different queries, expiration, IME input, stale responses and raw-input exclusion. Video tests render both a fictional demo and an own project with synthetic local images, verify that incomplete exports never count as success, and exercise opt-out/QA. Existing member browser tests cover handoff, revisions and restoration.

First self-check: retry/caching must reduce requests without disabling automatic discovery or claiming additional results. Second self-check: telemetry must distinguish browsing, fictional examples, own output and membership intent, with no change to paid entitlements or actual outcome counters.

The deployment verifies exact published script bytes with read-only QA requests. SEO/GEO: no new pages, claims or content sources; canonical, sitemap, metadata and bilingual gates remain required. Script-version changes do not justify a whole-site IndexNow submission; retain the existing material-change planner and report its actual result.

Review the first complete seven-day window after deployment, allowing GA4 processing time. Compare discovery request and rate-limit events separately from search submissions; these are event counts, not a person funnel. Verify real backend receipt before using new video events. If fewer than 30 genuine editor sessions are observed, treat conversion as under-sampled and improve distribution to existing relevant video pages before expanding the product or changing prices. This is an operating threshold, not statistical proof. No new schedule, external post or paid placement is created by this change.
