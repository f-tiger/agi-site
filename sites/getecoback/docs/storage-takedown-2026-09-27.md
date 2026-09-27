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
