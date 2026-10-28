# ECO foreground engagement recovery

ECO uses the shared empty analytics frame. Its Google tag does not observe the
public document focus and foreground time. An intercepted real-tag control
reproduces a pageview with no engagement duration; the same page with this
adapter emits `eco_page_engagement` carrying Google `_et`.

The ECO-only adapter follows the established BPJ implementation. It samples
visible, focused elapsed time locally and flushes on blur, hide and navigation.
There are no periodic network keep-alives or extra pageviews. Sleep gaps,
background time, pre-start time and opt-out time are discarded. BFCache resume
starts a fresh interval. It retains existing frame cookies and public build-time
metadata; queries, fragments, dynamic titles, form inputs and raw referrers are
not sent. No shared analytics or other site's runtime changes.

Install after the final coverage gate using `tools/install-public-engagement.mjs
--write`, then run without `--write`. Only records admitted by the ECO coverage
manifest receive the adapter. Membership, embeds and internal frames remain
excluded. The deploy workflow validates the asset version and representative
public/private routes after release.

## Validation

- Deterministic clock tests cover sleep, duplicate lifecycle events and resets.
- Browser tests use built German/English pages and intercept every outbound
  collection request. They check BFCache, withdrawal/regrant, QA, DNT, GPC,
  automation exclusion, private routes and sanitized fields.
- With `ECO_REAL_GTAG` pointing to a freshly downloaded Google tag, the browser
  test compares a no-adapter control and the fix, verifies `_et`, one pageview
  and no private markers. Synthetic events never reach production.
- Existing shared analytics and coverage regression tests remain required.

## Measurement and scope

This fixes future frontend duration delivery, not historical records. GA4 backend
receipt must be verified later using genuine traffic; local/browser success is
not backend receipt. Engagement events are neither tool completion nor sales.
D1 counts and GA4 retain their distinct filters, time zones and collection scope;
this change does not force them to match or alter affiliate counting.

No content, canonical, structured data, discovery URLs or paid offer changes.
SEO/GEO are preserved. No substantive URL change warrants another IndexNow
submission; retain the existing release submission policy.
