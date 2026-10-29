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

## Published acceptance record

PR https://github.com/f-tiger/agi-site/pull/201 merged to main as `a3b56e1d2bf8981f2ebdcecc376441b8e92de0a8`. All four final PR checks passed, including the full ECO build/browser check (40864503665). The local browser suite passed 34 checks, including real text and STL downloads; it ran against the local release build, not production.

Production deploy https://github.com/f-tiger/agi-site/actions/runs/40865442894 published both pages successfully. The dedicated production verifier passed for HTML, assets, GA4 script presence, sitemap and discovery links, and the postdeploy page-health check passed. A separate trusted-TLS Node fetch verification also passed. Local Chromium could not complete a production browser pass because its trust store rejected the execution environment's proxy certificate; TLS checks were not disabled. Build browser tests and production HTTP checks are separate evidence.

IndexNow returned HTTP 200 for the two new pages plus six updated discovery pages (8 URLs). This is submission receipt, not search indexing or traffic. Genuine GA4 backend events, affiliate revenue and physical print suitability remain unverified.

The overall deploy workflow is red solely because its existing membership readiness assertion received `{ok:true,ready:false,site:"eco"}` from `/api/member`. The cause is not established: readiness combines recent watcher health with configuration and payment-network conditions. No claim is made that this predates the release. The free workshop has no membership dependency and adds no checkout. The existing watcher can settle pending orders and delete expired stored data, so it was not invoked merely to make this release green. No payment configuration, readiness gate or customer record was changed. Paid membership must not be described as ready based on this release.

## Follow-up investigation and targeted recovery — 2026-10-29

The owner asked to continue. Refined brief: diagnose the unresolved membership service, restore only within existing verification rules, and read actual growth evidence. Self-review challenged assuming every sibling failure has the same cause and treating empty same-day GA4 rows as rejected demand. Neither inference is supported.

The existing two-hour schedule was observed running at 2026-10-29 05:35 and 12:50 UTC, exceeding the four-hour health lifetime. Scheduled run 40876625348 failed: BPJ's chain probe reported `rpc_http_429`; all three sibling watchers also failed, but their aggregate log did not retain the reason. That BPJ error alone does not prove Eco's cause. Public Eco readiness was still false at 15:20 UTC. No health lifetime or chain/token check is relaxed.

Existing aggregate report run https://github.com/f-tiger/agi-site/actions/runs/40900944434 collected at 15:23:10 UTC: Eco paid orders 0, paid members 0, active members 0, unexpired pending orders 0; authenticated aggregate access succeeded and readiness remained false. The report uses existing handlers that may initialize schema; it is not a strictly read-only database audit. No member/order identities were fetched.

The existing watcher workflow gains manual `eco-watch`, restricted to main and the same concurrency group, with a five-minute limit. It calls the unchanged `watch eco` operation, up to seven batches. This verifies pending transfers and performs the existing expired-data cleanup; it is explicitly not read-only. It does not create checkout orders, send funds, synchronize secrets, touch other sites, run Jarvis or add a schedule. Targeted recovery must be judged by its real result and a subsequent public readiness check, not workflow dispatch alone.

Windsor's existing GA4 connection for property 544688614 returned 24 aggregate rows for 2026-10-29 on hostname `getecoback.com` (same-day data can lag). Rows included existing guide pageviews and engagement, but neither workshop route nor any `eco_workshop_` event. This establishes reporting access and existing backend receipt, not receipt of the new events or lack of demand. The original 100-relevant-visit continuation gate remains unchanged. GSC Wizard refused access because its subscription had ended; no subscription or spend was initiated.

Validation before recovery: workflow YAML parsed, original cron unchanged, manual-main restriction inspected; amount-math self-test, eight membership-isolation checks and the safe-diagnostic/failure-readiness check passed using mocked chain/in-memory databases. No real payment test was performed.
