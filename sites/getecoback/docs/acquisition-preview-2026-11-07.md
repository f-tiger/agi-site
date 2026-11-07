# ECO acquisition entry repair — 2026-11-07

The owner confirmed ECO as the site to improve toward 1,000 daily visitors.
This release addresses observable discovery and task-handoff defects. It is not
evidence of traffic uplift, search indexing, Discover inclusion or commission.

## Competitive mechanism and chosen scope

Public pages were read again on 2026-11-07. home&smart changes the question used
to introduce an existing seasonal article; CHIP pairs a specific problem title
with an answer in its summary, a relevant image and practical steps. Neither
publisher exposes the conversion data needed to attribute an uplift to those
choices. The useful mechanism is a consistent promise, answer and next action.

- [home&smart: cold, wet cellar](https://www.homeandsmart.de/weil-der-herbst-2026-kalt-und-nass-ist-brauchen-viele-keller-einen-luftentfeuchter-0001-427687)
- [home&smart: heater as a heating substitute](https://www.homeandsmart.de/heizluefter-statt-heizung-kosten-0013-290373)
- [CHIP: indoor laundry ventilation](https://www.chip.de/news/haushalt-garten/waesche-in-der-wohnung-trocknen-dieser-lueftungsfehler-kann-teuer-werden_f2acff24-e3e4-4a4f-b410-9feb45f52c8b.html)

ECO's existing buying, cellar and indoor-laundry pages lacked explicit social
preview images. Four authored cost links also led from dehumidifier/laundry
tasks to an air-conditioner cost guide, although matching tools already exist.
Keep the current URLs and titles stable; reuse the existing decision paths.

## Product changes

- Original, topic-specific schematic images and one consistent metadata set on
  five existing acquisition pages. No manufacturer photographs, lab-test claims,
  measured performance or savings claims are introduced.
- Indoor-laundry cost links lead to the existing same-dryness calculator.
  Dehumidifier cost links lead to the existing operation-cost guide.
- The dehumidifier guide's electricity example explicitly identifies assumed
  wattage, tariff and time; it no longer implies a typical monthly cost.
- Editorial modification dates reflect material changes. Existing source-check
  dates remain unchanged; no site-wide date refresh is performed.
- Existing Markdown/AI-readable mirrors, sitemap and GA4 coverage are rebuilt
  through the normal release pipeline. IndexNow submits eligible changed
  canonical URLs after deployment, not every page touched by a generator.

[Google's Discover guidance](https://developers.google.com/search/docs/appearance/google-discover)
recommends representative large images and permits large previews; it explicitly
does not guarantee inclusion. [Article markup guidance](https://developers.google.com/search/docs/appearance/structured-data/article)
and the [Open Graph protocol](https://ogp.me/) inform metadata checks. This is a
bounded preview repair, not a Discover acquisition forecast.

## Measurement and next decision

The user target is separate from engineering acceptance. Use daily GA4
`totalUsers` as a browser/device estimate, with `activeUsers`, engaged sessions,
country and channel as quality checks. A seven-day daily average sums the seven
daily user counts and divides by seven; it must not divide a seven-day
deduplicated total. Use complete property-timezone days and report coverage
limitations. Global arrivals and German arrivals are separate.

Keep first-party pageview events, tool actions, platform views, merchant clicks
and independently verified commission separate. Exclude QA. Observe the existing
YouTube publication and this release over complete days before changing the
same entry again. Missing user/search reporting is unknown, not zero.

At sufficient relevant arrivals, investigate the next break in the path:
exposure to click, click to task use, task use to an appropriate next step.
Low reach does not establish product failure. Do not add more pages, markets or
AI features solely to satisfy an activity count. This release adds no recurring
job, paid promotion or unsolicited outreach.
