# AGI English and Chinese shared navigation — 2026-10-03

The previous mobile header hid Tools and Invest without a complete menu. Other page generators emitted different global headers. This release adds a shared renderer and a native disclosure menu with 19 destinations, grouped by exploration, work, investment and personal use. Four shortcuts remain visible on phones. Both language editions use the same geometry, styles and interactions.

The final navigation build runs after public page generators and before browser regressions and final analytics coverage. It normalizes 303 current English and Chinese HTML pages. Discussion pages render the same header in the Worker. Redirects, widgets, error pages, analytics frames and other language editions retain their existing treatment. Translated counterparts come from existing hreflang links; an unavailable translation is clearly labelled as a language-home link.

The menu works without JavaScript. JavaScript adds Escape/outside-click dismissal, focus return, safe view-state handling and fixed opt-in navigation events. Account, membership and moderation pages exclude these events. No search text, user files, account keys or query strings enter navigation analytics.

Checks: normalization idempotence; all menu routes exist; one header and language control per page; dynamic account forms retained; 64 page/viewport consistency checks; 320–1440 px layouts; no-JavaScript disclosure; actual navigation through tools/investment/discussions; locale switching; existing homepage countdown/poll, media playback/filtering and portfolio browser regressions. A narrow-screen scorecard share row also wraps to prevent horizontal page drift.

Two adversarial self-checks: (1) hidden shortcuts still have reachable destinations with and without JavaScript, including narrow English text; (2) subsequent daily page generation cannot restore old headers because the final build and regression gate run on every deployment. Existing canonical/hreflang and content/evidence dates are preserved. Existing sitemap/agent-surface and scheduled IndexNow workflows remain responsible for discovery; no new crawler or recurring task is created.

Public reading and tool exploration remain free entry points; existing membership and newsletter links remain available through the menu. This UI repair changes neither payment readiness nor pricing. Clicks measure navigation intent, not registration, paid subscriptions or revenue. Frontend opt-in tests do not demonstrate GA4 backend receipt.
