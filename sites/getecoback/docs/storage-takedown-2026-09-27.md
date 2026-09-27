# Storage products taken off getecoback.com (2026-09-27)

Owner, 2026-09-27: 「eco站点下架所有储能产品」, followed during the work by
「后续记得不做储能品类」. So there are two orders: remove every storage product
now, and never build the category again.

## What "storage product" means here

Battery storage in the owner's sense (储能): balcony batteries (Anker
Solarbank/SOLIX, Zendure SolarFlow, Marstek Venus, Growatt NOAH, EcoFlow STREAM),
portable power stations (Jackery, Bluetti, EcoFlow), and generic
`balkonkraftwerk speicher` searches. The list is `tools/storage_veto.txt`.

Not included: Balkonkraftwerk panels themselves (generation, not storage), plug
meters and smart plugs, and heat storage (Nachtspeicherofen, Warmwasserspeicher),
which the list names as exceptions.

## Before

- 14 pages, 108 Amazon links to storage products; the new gate read 112 on the
  old build, the extra four being search terms assembled in the storage
  calculator's script.
- Surfaces: the shared storage shelf (grid, top strip, exit prompt) on 10 pages;
  storage cards in the context shelves of `klimaanlage-balkonkraftwerk`,
  `strompreis-radar` and `growatt-noah-2000-probleme`; the storage card on
  `/kategorie/energie-sparen.html`; five hand-written body links or buttons; the
  Solarbank link on the Anker diagnosis page; and the storage calculator, which
  named Zendure or Anker for the computed size and built an Amazon button.
- Also storage-adjacent: `EB_ENERGY`, a box on five running-cost pages that
  pitched "Balkonkraftwerk mit Speicher", and a "Top 5 im Test" storage video on
  `balkonkraftwerk-speicher-nachruesten`.

## What it cost

D1, 90 days to 2026-09-27, human rows, CI excluded: 4 of 180 affiliate clicks
went to storage products (2,2 %). Two were Anker Solarbank 3 (one of them from
India, on the homepage) and two were Growatt NOAH 2000, on its troubleshooting
page. The plug-meter click on that page is not storage and still has a card.

## After

- `DEVICE_MODELS["storage"]` is empty. `shelf_skipped()` gives storage-family
  pages without their own context set no grid, strip or prompt. Without it, the
  empty list would have fallen back to the AC ladder and battery pages would
  have started selling portable air conditioners.
- Context shelves: the Growatt page keeps its two measuring plugs, the mounting
  page keeps its mounts, and the two cost pages lose their storage card.
- The hub card is replaced by the plug meter, which already sits on four
  energy-page shelves.
- The storage calculator returns a size range only.
- Body text keeps model names but loses the links. Pure buy buttons are removed.
- `EB_ENERGY` is retired (strip-only), and the "Top 5" video is removed.
- The homepage line no longer says "Modelle".

## Guards (so it stays off without anyone remembering)

| Where | What it refuses |
|---|---|
| `build_structure.py` `storage_guard()` | builds with a storage row in any shelf table, `CAT_SHOP` or `MODEL_ASIN` |
| `build_rising_rail.py` | turning a storage Trends query into a homepage Amazon chip (A/B tested: 1 chip → 0) |
| `check_storage_veto.py` (deploy gate) | a storage Amazon URL, or a storage search term assembled inside a script that builds Amazon links; the self-test covers both directions |
| `check_expansion_queue.py` | a storage item that is queued, gated, blocked or on seasonal hold |
| `demand_digest.py` | presenting storage rising rows as topics (it hides them and says how many) |
| post-deploy check | the four former storage pages and the homepage, scanned live with the gate's own scanner; an empty body counts as an error, not a pass |

## Queue, measurement, bets

- `marstek-venus-probleme` and `balkonkraftwerk-speicher-nachruesten-2027` are
  withdrawn. The storage batch is gone from the DE-QUEUE Trends basket.
- `eco-storage-spring-0415` is withdrawn; its reading is the click share above.
- Three related lines stay open because they do not depend on storage clicks:
  `eco-balkon-mieter-recht-1115`, `eco-at-balkon-1116` and
  `eco-storage-retitle-1112`. Each carries a note that its win action may not
  extend into storage.

## Left for the owner

The storage guides are still online and are now information only. Taking the
pages down as well would be a separate change: 410 or redirects, sitemap and
llms removal, and the internal links that point at them. The session does not do
that without being asked.

---

# Step 2: the pages (2026-09-27, same day)

The owner followed up in three messages: 「全部下线储能页！」, then asked which
scope, answered **all 14**, then added 「指南页，排障页，只要是相关的都下架」.
That covers guides, troubleshooting pages, and anything else related.

## Why it was 14 and not 7

In step 1 I described "12 storage guide pages plus Growatt and Anker". That
count mixed two groups:

- **Storage pages (7).** Their subject is a battery or a power station:
  - speicher-nachruesten;
  - balkonspeicher-rechner, balkonspeicher-foerderung, balkonspeicher-winter-frost;
  - Anker Solarbank troubleshooting and Growatt NOAH troubleshooting;
  - stromausfall-heizen (power stations).
- **Balcony-PV pages (7):** lohnt-sich-rechner, mieter-recht, oesterreich,
  ohne-bohren, standort-check, wo-kaufen, klimaanlage-balkonkraftwerk.

Before deleting anything I asked which scope was meant. The answer was all 14.

I then scanned the whole site, titles and body text. **These 14 are every page
whose subject is storage or balcony PV.** Single mentions on other pages were
left in place, because they are not related pages:

- the "Heimspeicher" category in the § 14a EnWG explanation;
- the MRG examples;
- the verb "speichern".

## Final reading before removal

D1, 28 days to 2026-09-27, human rows, CI excluded.

| | pv | affiliate clicks | external referrals |
|---|---|---|---|
| Growatt NOAH troubleshooting | 28 | 3 | 25 |
| the other 13 pages together | 15 | 0 | 3 |
| **site total** | 595 | 78 | |

Almost all of the cost is the Growatt page.

## What went offline

- **The 14 page files and their .md mirrors.** The worker answers 410 Gone
  (noindex) for both. The list lives only in `tools/gone_pages.txt`.
- **The generator that rebuilt the Anker page on every deploy:**
  `build_revenue_guide.py`, its data file and two assets.
- **The MCP tool `balkonspeicher_foerderung`.**
  - Its answers linked a removed page.
  - The smoke test drops the case, and its tool count stays equal to the
    server's.
  - The registry description no longer says "balcony solar": version 1.3.0,
    97 characters.
  - The agent pages now say eight tools.
- **The five country cost calculators** lost their "Solar-Eigenverbrauch" mode.
  - Removed from the option, the fields, the PV method note and the PV
    sections.
  - The IDAE and PVGIS sources are removed.
  - An old `?mode=solar` link falls back to the first mode.
- **Other surfaces:**
  - the homepage storage card and three homepage links;
  - the storage "Top 5 im Test" video in the autumn homepage rail. It was live
    through step 1, because step 1's gate only looked at Amazon links;
  - the balcony-PV slots in the summer and spring teasers;
  - the "Mit eigenem Solarstrom?" button on about 50 AC pages;
  - the balcony-PV lever on the electricity-check page (list, FAQ and result
    text);
  - the "indirekt mit Balkonkraftwerk + Speicher" passages on the price radar
    (summary, body and one FAQ);
  - "Balkonkraftwerk" in the homepage schema `knowsAbout`;
  - the `balkonkraftwerk` Trends seed.

## Guards

| Guard | What it refuses |
|---|---|
| `test_gone.mjs` | the worker's list differing from `gone_pages.txt`, a listed page or .md not answering 410, or a live page (balcony shade, price radar, hub, home) being caught |
| `check_gone.py` | a removed page file coming back, or any published html, md, txt, xml, json or js linking one (step 1's gate missed the video and the non-Amazon card; this one found them) |
| `storage_veto.txt` | now also lists balcony-PV terms, so the rising rail, the queue gate and the digest drop them. Balcony shade and "ohne Balkon" are self-tested as allowed. |
| post-deploy | every listed page answers 410 live, the .md mirror answers 410, and the live sitemap lists none of them |

## Queue and bets

- **Queue:** the Anker item moves to the new status `removed`. The gate
  requires that its page does not exist.
- **Withdrawn**, with final readings: `eco-balkon-mieter-recht-1115`,
  `eco-at-balkon-1116`, `eco-storage-retitle-1112`, `eco-stromausfall-0116`.
- **Annotated** (`note_2026-09-27_pages`):
  - `eco-newest-block-1008`: the treatment group is now 7 pages;
  - `eco-tools-hub-1020`: events from the removed calculators are excluded;
  - `eco-at-mrg-1116` and `eco-dach-troubleshoot-1116`: the balcony-PV half of
    each win action is dropped;
  - `eco-wallbox-demand-1015`: ask the owner before building a page;
  - `eco-troubleshoot-shape-1112`.

## A mistake the browser caught before shipping

The first build of step 2 took the solar fields out of the calculator form but
left them in `country-model.js`. That file treats every field as required, so
**all five calculators refused every input** ("Bitte markierte Werte prüfen").
None of the static gates flagged this, because they only check the HTML.

A click-through in Chromium caught it. The model now drops the three solar
fields and the solar branch. I then ran all 5 calculators in all 3 modes: all
15 compute, and they reproduce the page's own worked example (108 € / 75,60 € /
21,6 years).

**Rule:** when you remove a form field, check whether the model or validator
still expects it.
