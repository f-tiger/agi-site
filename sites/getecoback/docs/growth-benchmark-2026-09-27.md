# Growth round: benchmark, bottleneck, what shipped (2026-09-27)

Owner: 「对比同类型热门站点，网站流量成长要持平，使用内容扩展，站点优化，补充热门视频，抓实时热点，总之一切方法都可以，实现更快的流量增长」

## 1. What can and cannot be compared

**Competitor traffic cannot be measured from here.** There is no Similarweb-grade
source that covers sites of this size, and the sandbox is blocked by most of them
(recorded 08-28 and 09-22). No competitor traffic number appears in this file, and
none should be added without a source.

What *is* known about the same-niche German sites (from the 08-28 and 09-22 passes,
nothing re-fetched today):

| Site | Visible pattern | Transferable? |
|---|---|---|
| temperaturheld | 68 pages, every lastmod in 2026-09, ~1 050 words, 73 internal links/page, no external sources | No: the dates are refreshed without content changes (fake freshness) |
| raumklimatest | Long advice pages (≈2 250 words), a source list, a named author, real photos | Partly: sources already done on every eco page; photos and an author need the owner |
| klimaanlagen-guru | Same topics as eco, 11–19 posts a month, LocalBusiness with an address | Posting pace: eco published 15 guides from 09-15 to 09-27, which is the same pace |
| Industry baseline | New affiliate sites see first movement at 3–6 months and stable Google traffic at 6–18 months | eco is at month 3 |

**What they have and eco does not is age and links, not method.** That conclusion
from 08-28 still stands. So "grow as fast as they do" cannot be won by out-publishing
them. It can be won on the one front where eco is actually losing time: getting its
own new pages crawled.

## 2. eco's own curve (D1, human, CI excluded)

Weekly page views from 2026-08-05: 115 · 205 · 172 · 157 · 128 · 111 · 118 · 219.
The last week includes US scanner noise. Non-US views over 28 days to 09-27: **439**,
of which **204** arrived from an external source. AI referrals fell week by week:
7 → 5 → 6 → 3 → 1, because the summer pages that ChatGPT cited are out of season.

## 3. The bottleneck: Bing does not crawl the new winter pages

- 100 % of eco's search traffic comes from the Bing index family (Bing, DDG, Ecosia,
  Yahoo, Qwant). Google sends 0 visitors.
- Since 09-15, bingbot has fetched **2 of the 15 new guides, one fetch each**.
- In the same 14 days it fetched the same older pages 12–33 times each:
  - luftentfeuchter-30-qm 17
  - thermovorhang-ratgeber 19
  - strom-sparen-haushalt 17
  - mobile-klimaanlage-ueberwintern 18
- IndexNow was told about every new page on its publish day. The step logged HTTP
  200, for example 7 URLs on today's run.
- Links from a hot page were not enough either. mobile-klimaanlage-ueberwintern has
  linked four winter guides since 09-17 and was crawled 18 times. bingbot followed
  none of those links.
- AI crawlers do fetch the new pages (2–5 fetches each).

**The winter content exists. The search engine that sends all of eco's traffic has
not looked at it.** Adding more pages does not fix that.

## 4. What shipped

| Lever | Change | Measured by |
|---|---|---|
| Discovery | `tools/build_catnew.py`: the 8 newest guides of a category, as plain links with dates, on the 10 pages bingbot crawls most in that category (hubs chosen from the crawl log) | `eco-bing-newpage-1027` |
| Owner lever | `docs/bing-url-submission-2026-09-27.md`: the 15 URLs to paste into Bing Webmaster → URL-Übermittlung. This is the one channel Bing documents as a direct crawl request | same bet |
| Videos | Six winter pages get a click-to-load YouTube facade: überwintern, schimmel-am-fenster, richtig-lueften-im-winter, luftfeuchtigkeit-senken, heizluefter-stromverbrauch, luftentfeuchter-30-qm. Every ID was checked through YouTube oEmbed today (title and channel; Stadtwerke Düsseldorf and a joint-sealing specialist among them). Reference for demand: the EN tilt-and-turn video has 14 plays in 56 days | `eco-winter-videos-1108` |
| Real-time | Already running, so nothing new was built: the cold-weather branch of `/api/heat` (fires on its own when it gets cold), the Prime Deal Days band (appears 09-29), and the daily German trending-searches check (0 niche matches today). Rising queries were measured, not chased: 5 candidates today, 2 read 0,0 absolute. Viral-product fact-check pages (epicooler, air zuma) have drawn ~0 visitors, so "voltomat heating" was skipped | `eco-akku-heizluefter-1225` and the season calendar |
| Content | One page a day from the expansion queue continues (today: akku-heizluefter). More pages per day would add more uncrawled URLs | queue gate |
| Growth target | Non-US human views over 28 days: t0 439 → ≥660 (1,5×) for 10-12→11-08, with external referrals ≥300 | `eco-winter-growth-1108` |

## 5. Not done, and why

- **Fake freshness**, the temperaturheld pattern of refreshing every lastmod: it
  would break `check_sitemap_lastmod` and destroy what IndexNow trust the site has
  left.
- **Mass pages**: pages nobody crawls.
- **IndexNow re-pings of old URLs**: the 09-22 finding was that noise is what hurts.
- **Non-Amazon affiliates and outreach**: standing rules.
