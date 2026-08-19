# DollScout tracking plan

- **Tool:** Google Analytics 4, property measurement ID `G-2SEHFY33H8`
- **Numeric property ID: `547130808`** — this is the value `GA4_PROPERTY_ID`
  wants. The measurement ID above is the *tag*; the Data API needs the numeric
  property, and confusing the two is the usual reason `ga4-report.mjs` fails.
- **Implementation:** `js/analytics.js`, loaded on every page after `js/config.js`
- **Tag manager:** none. A static site with nine events does not need a GTM
  container between us and the code.
- **Last updated:** July 2026

## Configuration and why

```js
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: 'granted'   // see warning below — do not set to denied
});
gtag('config', id, {
  client_storage: 'none',
  anonymize_ip: true,
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
```

> **`analytics_storage` must stay granted.** Denying it looks like the more
> private setting and is not. It puts GA4 into consent mode, where hits become
> cookieless modelling pings that never reach the standard reports — and
> modelling only yields numbers above substantial traffic thresholds, so a site
> this size would report nothing at all, permanently. This was the original
> configuration and it is why the property showed "no data received" after
> launch; changing it to granted on 2026-07-27 made data appear, which confirms
> the diagnosis. The no-cookie promise is kept by `client_storage: 'none'`,
> which is the setting that actually governs storage — verified in a browser,
> zero cookies set.

`client_storage: 'none'` means GA4 writes **no cookies and no localStorage**.
That was chosen before anything else, because this site's privacy page is a
selling point in a category where discretion is the product. It also means no
consent banner is legally required, and no banner means no bounce tax.

The cost is real and worth stating: **every pageview looks like a new user.**
Returning-visitor counts, retention curves, and cohort reports are meaningless
here. Sessions, pageviews, traffic sources, landing pages, and event counts all
work normally. Read "Users" as "sessions" and you will not be misled.

Nothing loads until the 18+ gate is passed. `main.js` fires a `ds:age-verified`
event on acceptance; `analytics.js` boots on that, or immediately on load if the
visitor already accepted in a previous visit.

With `ga4Id` empty in `js/config.js`, no Google script is requested at all and
every `dsTrack()` call is a no-op. That is the kill switch.

## Events

| Event | Fires when | Properties |
|---|---|---|
| `page_view` | automatic (enhanced measurement) | GA4 defaults |
| `affiliate_click` | click on any `a[rel~="sponsored"]` | `vendor` (hostname), `location`, `page_path` |
| `quiz_completed` | 60-Second Finder reaches a result | `result` (torso / compact / tpe / silicone), `questions` |
| `scamcheck_scored` | 2.5 s after the last checkbox change | `score` (1–10), `band` |
| `calculator_used` | "Show my real first-year cost" is pressed | `material`, `region` |
| `checklist_printed` | `beforeprint` on /checklist.html | `page_path` |
| `recourse_checked` | "Check my recourse" is pressed on /payment-protection.html | `region`, `network`, `result` |
| `share_clicked` | click on any share-row button | `network`, `page_path` |
| `email_submitted` | any `form[data-capture]` submit | `page_path` |

`affiliate_click.location` buckets the click by where it sat on the page:
`bestsellers`, `banner`, `product_card`, `quiz_result`, `article`, `other`.
This is the one dimension that decides layout work — it tells us whether the
vendor bestsellers strip or the editorial content actually earns.

### Deliberately not tracked

- The prices typed into the cost calculator, and the resulting total. The page
  promises "your numbers stay in your browser".
- The amount and the date entered into the payment recourse checker. Someone
  using that page has just lost money on a purchase they may not want traced;
  the outcome bucket is enough to tell us whether the page works.
- Individual quiz answers and individual Scam-Check ticks. Only the outcome.
- Email addresses. `email_submitted` records that a signup happened, nothing else.
- Scroll depth, rage clicks, session recording. Nothing here would change a
  decision, and all of it weakens the privacy claim.

## Mark these as key events in GA4

Admin → Events → toggle "Mark as key event":

1. `affiliate_click` — the only event that maps to revenue
2. `email_submitted` — the owned-audience metric
3. `quiz_completed`

## Custom dimensions to register

Admin → Custom definitions → Create custom dimension (event-scoped). Event
parameters are **not** reportable until registered, and registration is not
retroactive — do this before waiting on data.

| Dimension name | Parameter | Scope |
|---|---|---|
| Affiliate location | `location` | Event |
| Affiliate vendor | `vendor` | Event |
| Quiz result | `result` | Event |
| Scam-Check band | `band` | Event |
| Calculator material | `material` | Event |
| Calculator region | `region` | Event |
| Share network | `network` | Event |

`recourse_checked` deliberately reuses `region`, `network` and `result` rather
than minting new parameters, so it needs no additional registration — it reports
the moment the three above exist.

## The three questions this is meant to answer

1. **Which pages produce affiliate clicks per visitor** — not which pages get
   traffic. A guide with a tenth of the traffic and five times the click rate
   deserves the next backlink push.
2. **Where on the page people click out** — `affiliate_click.location` settles
   whether the bestsellers strip earns its place at the top of the home page.
3. **Which tool is the actual hook** — quiz, Scam-Check, calculator or
   checklist. The winner gets the outreach effort and the next feature.

## Verifying

1. GA4 → Admin → DebugView, with the GA Debugger extension on, or append
   `?debug_mode=1`.
2. Load the site, pass the age gate — `page_view` should appear only after.
3. Click a vendor link and confirm `affiliate_click` with a `location` value.
4. Check DevTools → Application → Cookies: there must be **no `_ga` cookie**.
   If one appears, `client_storage` is not applying and the privacy page is
   wrong — fix before shipping.
5. **Realtime is the fastest end-to-end test.** Open the site, pass the 18+
   gate, then GA4 → Reports → Realtime. A visit should appear within seconds.
   If Realtime stays empty, hits are not arriving and nothing else in this
   document matters. Note that a visitor who never passes the age gate sends
   nothing at all, by design — so the gate must be clicked for the test to
   mean anything.

## Notes

- Google Search Console was verified on 2026-07-26. Link it to this property
  (Admin → Product links) so query data sits alongside behaviour.
- Cloudflare Web Analytics could replace this entirely if GA4 ever becomes a
  liability — it is cookieless by default. The events above would be lost.
