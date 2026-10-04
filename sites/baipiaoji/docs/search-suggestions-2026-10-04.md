# Homepage actions and search suggestions

Owner reported uneven homepage secondary buttons and requested search suggestions plus measurement. Scope: existing BPJ search and homepage, both languages. No new product, pricing, outbound campaign or account requirement.

Three passes: clarify equal usable actions and quicker discovery; retain the existing language-specific index and privacy boundaries; accept only after mobile/desktop keyboard, touch-target, query privacy and deployed-asset checks. Existing indexed content supplies results. Empty search offers editorial shortcuts, not claimed popular searches or personalized history.

Homepage actions use a two-column grid with centered labels and at least 48px height. The lazy-loaded dropdown supports empty-query suggestions, ranked matches, no-results and retry messages, composition input, arrows/Enter, Escape, Tab and outside dismissal. Request revisions prevent stale asynchronous results reopening a dismissed dropdown. Search results retain existing canonical deduplication and GitHub project anchors.

D1 retains `gs` and `gs_go` event names, with `/search-ui/site|agents/<action>` labels; selection includes the public destination. New search does not collect query text. One selection produces one `gs_go` event. Counts are actions, not people or conversions; historical query-labelled events have a different contract. GA4 receives only fixed `search_suggestions`, `search_results`, `search_empty`, `search_suggestion_select`, `search_result_select`, `search_error` through the existing opt-in channel. QA, automation, DNT/GPC and private account pages are excluded. Backend GA4 receipt is not proved by browser fixtures.

Two self-checks: interaction/async behavior, then privacy/metric deduplication and responsive layout. Browser regression uses generated EN/ZH pages at 320/390/1440px with all network intercepted. It is included in the existing push browser gate. No new recurring task or paid dependency.

SEO/GEO: existing canonical URLs, titles, structured data, crawlable page copy and language indices remain. Suggestions are navigation, not new thin pages; private pages retain exclusions. Script/style changes use existing content-hash URLs. Existing IndexNow runs only for genuinely changed canonical content; no artificial lastmod churn or bulk notification for a JavaScript-only change.
