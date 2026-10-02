# TDS collector relaunch — 2026-10-02

## Owner decision and scope

Owner accepted a multi-brand collectible-toy discovery, buying-decision and collection-tool direction for TDS, with general digital tools aggregated on BPJ. Later correction: benchmark five very popular toy sites and make the homepage lively and contemporary. This supersedes the September 25–27 document-first homepage, not the retired-content, privacy or evidence rules.

Three brief refinements: (1) restore a clear collectible-toy audience and four-site differentiation; (2) verify actual search status, official brand sources and design references rather than assuming a domain ban or invented popularity; (3) deliver localized pages, working task links, discovery mirrors, retirement regression gates and an independently verified release. Self-review one rejected a blanket tool migration and invented trend/stock labels. Self-review two required encoded/case/localized legacy-route coverage, small-screen German QA, canonical sharing and consent-preserving measurement. These are self-checks, not independent external reviews.

## Five design references

Checked October 2. Similarweb publicly available August 2026 pages show the following **estimated last-three-month totals**, not monthly users or company revenue. These five relevant reference sites are not asserted to be the global top five in a single category: Similarweb places them in different categories.

| Site | Three-month estimated visits | Evidence and lesson |
| --- | ---: | --- |
| LEGO | 49.9M | https://www.similarweb.com/website/lego.com/ ; https://www.lego.com/en-us — browse by interest/theme, approachable task entry. |
| Jellycat | 6.6M | https://www.similarweb.com/website/jellycat.com/ ; https://us.jellycat.com/ — character families, gifting and themed collections. |
| Funko | 6.5M | https://www.similarweb.com/website/funko.com/ ; https://funko.com/ — campaign scene, fandom navigation and collection cards. |
| Good Smile | 5.1M | https://www.similarweb.com/website/goodsmile.com/ ; https://www.goodsmile.com/en — large visual stories, brand-first discovery and clear release distinctions. |
| POP MART | 4.3M | https://www.similarweb.com/website/popmart.com/ ; https://www.popmart.com/us — immersive campaign hero, character navigation and separate new-arrival/series sections. |

Direct browser observation completed for POP MART, Funko and Good Smile. Jellycat and LEGO presented human-verification screens in the research browser; their navigation/content were read through public official-page retrieval. Do not claim their live visual layout was fully inspected. Brand traffic does not establish that copying a layout causes traffic growth.

AGI lesson: answer the user's decision before method and evidence. BPJ lesson: explicit tasks, outputs, limits, localized entry points and useful next steps. TDS uses a colorful original campaign scene with restrained white/black/red navigation, colored collection illustrations and immediately accessible collector tools. No competitor code, logos or character artwork is reused.

## Search evidence before release

GSC Wizard URL Inspection on October 2, property sc-domain:thedollscout.com:

| URL | Google result | Last crawl |
| --- | --- | --- |
| / | PASS, submitted and indexed, indexing allowed | 2026-09-29T11:01:47Z |
| /rarity | PASS, submitted and indexed, indexing allowed | 2026-09-30T07:01:46Z |
| /checker | PASS, submitted and indexed, indexing allowed | 2026-09-23T23:14:02Z |
| /vendors/yourdoll | NEUTRAL, not found (404) | 2026-09-22T07:26:41Z |

This contradicts a blanket claim that the domain is rejected from Google's index. It does not verify absence of manual actions, security issues or SafeSearch classification. The connected API does not expose those reports. Sitemap submissions were downloaded September 28 with zero errors/warnings; the sitemap report's indexed:0 field must not override individual URL inspection evidence. Bing Webmaster data is not configured in GSC Wizard.

Official removal guidance: https://developers.google.com/search/docs/crawling-indexing/remove-information ; https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors . Keep removed pages crawlable with 404/410, do not redirect unrelated retired material to the new homepage or hide removal responses behind robots.txt. Google says SafeSearch classifiers may take up to 2–3 months to process changes: https://developers.google.com/search/docs/specialty/explicit/troubleshooting . This is a possible classification delay, not a diagnosis that TDS is filtered.

## Implemented product and migration boundary

- EN /, DE /de/, ZH /zh/: collector-first, image-led homepage, four brand guides each locale (15 pages total). Labubu / THE MONSTERS, SKULLPANDA, Jellycat and Sonny Angel are editorial starting points, not a live popularity ranking.
- Official sources linked in visible content and plain-text mirrors. No prices, stock counts, sales rankings, authentication certificates or fake customer evidence.
- Original AI-generated hero stored in collector-assets/collector-world.webp, with social JPEG and explicit illustration disclosure. Illustrations are imagined objects, not branded product photos. Built-in image generation prompt: premium playful 3D still life of an original translucent red robot, lilac fluffy cloud, yellow abstract star and unbranded blind box on display plinths, pale pink background, no existing mascots/logos/words. Encoding optimization only; original generated PNG retained outside the repo.
- Existing tools remain functional. Only the former home directory moves to /document-tools (+ DE/ZH); every dedicated document/AI/utility URL keeps its canonical address. Root URLs become the collector homepage, without redirects. /collectors links current collecting guides rather than calling them an archive.
- BPJ /studio/toolkit and /en/studio/toolkit aggregate native BPJ and existing TDS utilities, explicitly labeling hosting origin. BPJ home/studio/search supply discovery. This is aggregation, not completed cross-domain hosting migration. Any later hosted migration must map an exact old URL to a functioning equivalent before 301, update canonical/hreflang and verify actual files, limits and privacy.
- Collecting builder owns root HTML and root llms files. Digital builder owns document-tools, digital pages and document-assets/llms*. Final release order: assemble → shared workbench → digital build → collecting build → analytics coverage. Existing stale-push guard remains.
- Legacy retirement matcher handles case, known locale prefixes, .html/.htm and encoded variants. No archived content is restored. Final artifact scan covers HTML/XML/JSON/TXT/SVG; middleware responds 410 plus noindex. Reused /mcp and /llms-full.txt remain available.
- The existing TDS trend job now rotates labubu/jellycat/sonny angel in the same three-seed allocation. No additional job, schedule or external request budget.

## Audience, distribution and commercial gate

Audience: collectors and gift buyers choosing a series, checking a seller/source, planning a shelf or recording purchases. Free value: source-linked decisions, probability math, display fit and local collection tracking. These are hypotheses about repeat demand, not customer-interview findings.

Money path: existing disclosed US/DE affiliate buying guides and relevant display accessories. Official brand links in the new guides are not affiliate links. No new paid product or checkout was introduced. Existing independent collector membership must not be presented as a payment for the free directory or digital tools. Visits, tool actions, affiliate clicks, merchant-reported commissions and received cash remain different measures. No new revenue is established by this release.

Authorized distribution: new crawlable internal links, BPJ toolkit referral entry, accurate metadata/text mirrors/sitemaps, safe copyable public guide links, changed-URL notification via the existing IndexNow mechanism. No social posts, messages, ads, new subscriptions or recurring spend were added. New brand-guide URLs must enter scripts/urls.txt so the existing eligibility filter can submit them. IndexNow receipt is not indexing or AI citation.

Learning window through November 13 (42 days; chosen operating gates, not market benchmarks):
- Review GSC by /brands/*, existing collector pages and digital pages separately. Confirm acquisition with at least 100 relevant non-QA visits before judging task conversion.
- Seek at least 20 own-input tool completions in the consented collector workbench stream and 10 measured collector affiliate out-clicks. Counts are actions, not distinct buyers; inspect the source/landing mix and exclude examples/CI.
- Require actual repeat-user evidence and merchant reports before widening a paid offer. No inferred revenue from clicks.
- If visits are insufficient, improve a specific query/landing match and distribution. If visits arrive but users do not complete the task, fix the task. Avoid another whole-site pivot during this learning window absent a concrete safety or functional defect. This document does not create a future automation.

## Validation

Local release verification completed:
- Document/AI/utility regression suite: 54 tests passed; 93 localized digital pages and assets verified.
- Collector release: 15 localized pages verified; retired-route and moved-hub regressions passed; 191 FAQ/DefinedTerm entries match visible copy. Existing collector/odds generators remain in sync.
- Browser QA: EN/DE/ZH home at 1440, 390 and 320 px; filters, hero image, two brand guides and all three digital hubs passed with no overflow, script errors or failed assets.
- BPJ build: 2,363 generated pages checked with zero broken links, structured-data errors, language leaks or empty pages; canonical sitemap routes verified. Both toolkit languages passed browser QA at 1440/390/320 px. Studio and site-journey gates passed.
- Final analytics coverage applied after page generators: TDS 163 HTML pages and BPJ 2,364 HTML pages including the internal analytics frame; account/embedded/error surfaces remain excluded as configured.
- YAML parsing, diff whitespace and public credential/private-identity pattern review passed. The hero WebP is approximately 48 KB.

Production verification and IndexNow receipts will be attached to the release/PR after deployment; no local result is represented as a production result. An unrelated BPJ daily external-link health checker was blocked by automatic approval review; its outbound routine is not a required release gate. The local verify-dist gate is the appropriate build verification. No bypass or broad external link sweep was used.
