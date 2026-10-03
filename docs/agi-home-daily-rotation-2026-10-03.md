# Daily homepage video editions

The homepage previously featured the first reviewed video and the newest four
videos for each language, so it could look unchanged even after a source check.
The owner requested an automatic daily selection.

`sites/agiscorecard/home-focus/rotation.mjs` now selects and renders the featured
video and four cards for both the static build and the browser. The editorial
day starts at 00:00 Asia/Shanghai. Both languages feature the same reviewed
video with its corresponding translated summary; the four cards use the
edition's original-language videos. Candidate windows prefer recent content,
interleave publishers and consider topic variety. The featured selection skips
yesterday's video when at least two eligible reviewed videos are available.
Cards are unique within an edition and exclude its featured video. A limited
Chinese source pool means recommendations can return on later days.

The existing daily discovery/deploy job remains the only scheduled source job.
Browsers request the published pool on load and every five minutes while
visible, and check the editorial day every minute and when returning to the
page. An already loaded pool can rotate through a failed source refresh or
delayed deployment. Initial network failure leaves the published HTML readable.
An active iframe and its matching summary remain intact across midnight. A
focused card is retained until focus leaves it; its displayed edition date stays
honest. Source publication and source-check dates are never reset by rotation.

The static build records its edition day; build checks use that saved day so a
midnight boundary between generation and checking does not create false drift.
All existing consent-gated fixed homepage action events remain; automatic
rotation creates no click, impression, subscription or revenue event.

## Validation

- First adversarial self-check: 100 consecutive editions, changing 30/90-day
  windows, duplicate/future/malformed sources, sparse pools, bilingual evidence
  matching and escaped text. Found and fixed adjacent hero repeats at freshness
  cutoffs. No adjacent hero repeats in the retained fixture over 100 days.
- Second adversarial self-check: controlled browser midnight in Shanghai and
  Los Angeles, same-day reload, 320/390px layout, focused cards, active player,
  failed first/subsequent fetches, invalid snapshot and updated source metadata.
  All passed, as did existing homepage countdown, poll and privacy regression
  checks. Fixtures contact no production analytics or write endpoints.
- CI now runs both rotation test files. Existing SEO/GEO, navigation, GA4
  coverage and exact live-asset gates still apply. IndexNow stays in its existing
  weekly/manual incremental workflow; this release adds no submission schedule.

This is a free discovery improvement. Existing takeaways, evidence and library
links retain their paths toward local planning and the optional cloud workspace.
Rotation tests are not evidence of retention, membership conversion or revenue.
