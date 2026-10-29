# EcoBack family workshop release — 2026-10-29

Owner asked to broaden Eco beyond energy into 3D printing, pool cleaning and household tasks, then explicitly requested execution and launch. Three brief passes: preserve household jobs; compare alternatives, source quality and unit economics; ship bounded free tools with discoverability and truthful measurement. Two self-review passes challenged (1) the assumption that a category demand implies a product recommendation and (2) accidental claims about fit, private data and paid delivery. Corrections: no model rankings, comparison links only on relevant outcomes, local-only answers, constrained STL use, and fixed event allowlists.

## Delivered scope and audience

DE `/familienwerkstatt.html` and EN `/en/home-workshop.html`: households considering a pool cleaner, robot mower or a small repair/organization project. Three local rules-based checks distinguish identifying/measuring first, maintenance constraints, source/manual review and comparison. Download a text checklist containing the answers, next step and source. Unknown answers remain unknown. A photograph upload, AI diagnosis, custom replacement-part service and model database are not implemented or promised.

The repair branch can generate an original closed rectangular divider STL (millimetres, 20–250 length, 10–100 height, 2–8 thickness) after explicit confirmation of a non-loaded organization use. It is not a universal replacement, load-bearing component or physically validated fit. Other replacements go to existing-part/model/license checking; critical uses do not reveal the generator. No third-party STL is redistributed. Browser-only downloads create no hosted customer files. No new API keys, fees, backend job, cron or checkout.

This direct owner-authorized material release is distinct from the daily auto-content queue and does not change that queue's allowance. The historical August rejection addressed 3D-printer accessories and purifier affiliate content. This release follows the user's new, narrower household repair/template instruction; it does not reopen printer sales, ventilation claims, energy storage or balcony solar.

## Evidence and constraints

- Household repair: https://www.reddit.com/r/3Dprinting/comments/1ciklru/how_do_you_create_replacement_parts_with_the/ (2024; measuring, CAD, fit iteration; old anecdote, not current market size).
- Pool trap: https://www.reddit.com/r/pools/comments/1kqhxgg/ (2025; stairs, liner and family time; anecdote, not defect frequency).
- Mower route: https://www.reddit.com/r/roboticLawnmowers/comments/1uth9jj/robot_mower_for_narrow_passage/ (2026; physical width differs from navigation clearance).
- Technical sources checked 2026-10-29: https://www.maytronics.com/global/support/faq/?question=will-my-dolphin-clean-the-stairs ; https://www.husqvarna.com/us/support/how-to-create-a-passage-in-an-automower-boundary-wire-installation-ka-01710/ ; https://help.prusa3d.com/filament-material-guide . These are model/material guidance, not our own tests. Maytronics has differing step capability by model; Husqvarna's boundary-wire distances cannot be transferred to every navigation system.
- Alternatives: free manufacturer support, existing model repositories, hand measurements and dealer consultation. The free deliverable must help complete a task before paid expansion is justified.

## Commercial design and actual readiness

Free checks and local exports are delivered. Existing DE `getecoback-21` and US `ecoback0d-20` tags are preserved on clearly disclosed category searches only for unconstrained comparison outcomes. EN explicitly labels Amazon.com as US; no UK/EU compatibility or local commission is implied. Exact items, stock, ASINs, price and performance are not claimed. Category searches are not certified recommendations. No new program is enrolled and no paid deliverable is advertised. Future per-file delivery is only a hypothesis until real fit-tested acceptance and paid demand; shared free login does not imply cloud storage.

## Discovery, marketing and measurement

Existing DE/EN homepages, calculator pages, DE living entry and tools hub link to the checks. Homepages also have direct task links near the heading. New routes have canonical, reciprocal DE/EN hreflang, honest WebApplication metadata, no-JS source fallback, dated technical sources and site-search entries. `build_llmstxt.py` includes both routes as supplementary machine discovery, without claiming citations. Existing sitemap and changed-URL IndexNow flow owns release submission; receipt is not indexing.

No unsolicited Reddit messages, posts, ad spend or outside registrations. Actual authorized distribution is on-site contextual placement. A result can be downloaded for the user to use or share; no user data is automatically posted.

After every generator, the existing fleet GA4 coverage and engagement installers run. `business.mjs` accepts only fixed `eco_workshop_{pool,garden,repair}_{decision,export,official,shop,stl}` names on exactly the two routes; rejects fields containing answers. STL only for repair, shopping only for pool/garden. QA, automation, DNT/GPC and explicit opt-outs remain excluded. These events use GA4, not a new D1 event stream. Thus no unsupported GA4/D1 comparison. Backend genuine receipt and conversion/revenue need actual reporting; frontend assertions do not establish it.

Public experiment `eco-family-workshop-1128` uses a minimum of 100 relevant visits before utility judgment, then 10 decisions and 3 exports as an operational continuation gate, not statistical proof. Low reach is distribution-inconclusive. Seasonal pool results must be separate from repair. No new scheduled monitor.

## Verification

Node tests cover all allowed branches, critical-part blocking, invalid dimensions, closed STL edges, positive/correct volume and analytics privacy allowlisting. Browser checks cover both languages, 320/390/1280 widths, green-water and narrow-path no-shopping outcomes, selected-market tags, actual checklist/STL downloads, stale-result removal, invalid dimension blocking and zero probe events. Mesh validation is not a physical print test. Final deployment, live tests and IndexNow receipt are recorded after publication.

## Clean-checkout correction

The first PR run reached the final analytics gate, then exposed a missing `/eco-engagement.mjs` build artifact already referenced by committed public HTML. The installer normally writes it after coverage, creating a clean-checkout ordering cycle. Commit the current public source's exact 4.5 KB artifact; the existing installer still refreshes and verifies it after coverage on every build. No tracker logic, measurement exclusions or gate is weakened. First failed run: 40863647934.
