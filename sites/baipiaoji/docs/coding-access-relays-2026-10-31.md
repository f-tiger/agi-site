# Community-mentioned relay directory expansion

The owner asked to include popular relay sites. The directory previously had two
relay candidates among seven entries. This update adds AnyRouter (anyrouter.top),
88Code, AICodeMirror, YesCode, AIGoCode and DuckCoding, and updates PackyCode to its
current PackyAPI entry. There are now 13 entries, including eight API relays.

## Decision and evidence

Three scope passes: identify actual providers mentioned in developer communities;
verify domain identity, public integration and buying terms; preserve evidence in
the bilingual directory, machine assets and copied selection, then publish through
the existing gates. This is a free directory expansion for developers comparing
access options. Existing vendor sponsorship remains separate; no affiliate links,
payment collection, purchased accounts, outreach or new schedule were introduced.

Public attention is supported by named discussions or community integration
projects, not by a measured popularity ranking. Provider claims, vendor promotions
and user reports are labeled separately. Each added reference records the date it
was observed; that date does not make an old post or indexed document current.
Exact links and bilingual descriptions live in `data/coding-access.json`.

- PackyCode redirects to PackyAPI. Its public documentation lists both CLIs.
  The cited V2EX promotion is exposure evidence, not independent approval.
- AnyRouter refers only to anyrouter.top. Community GitHub adapters establish
  integration interest, not full native compatibility or official current terms.
- 88Code redirects from .org to .ai. Older documentation was visible through
  search indexing; current prices and refunds remain pending. User complaints
  are attributed and their resolution has not been independently verified.
- AICodeMirror redirects from .com to .ai. Public product, recharge, subscription
  and terms pages were read. The named legal operator is a provider statement,
  not a business-registry verification. A 2025 complaint is labeled historical.
- YesCode is co.yes.vg, separately from similarly named services. Current direct
  reads returned a JavaScript shell; indexed marketing and older community posts
  do not justify marking it reviewed.
- AIGoCode's current published terms exclude mainland China registration,
  purchase, top-up and API use. The entry prominently states this restriction.
- DuckCoding's migration and mainland restriction were reported by a user;
  current official text was unreadable. Its regional eligibility remains pending.

Research used the market-research skill and a separate read-only research agent.
Agent-directed text on external forum pages was treated as untrusted source
content and ignored. No source was allowed to set editorial policy.

## Two adversarial checks

1. Challenge: promotions and old search snippets could become a false "reliable
   popular" ranking. Resolution: no numerical rank, no safety score, explicit
   source kinds, old-source caveats and pending status. Reviewed only means public
   documentation was read; no purchase, refund, model-identity or uptime tests.
2. Challenge: added sources could disappear or replace the primary source in the
   copied comparison; new provider clicks could be silently dropped. Resolution:
   preserve entry, primary and additional sources in HTML/JSON/Markdown/export;
   test all catalog IDs against the bounded hit handler and keep input/QA privacy
   exclusions. Independent code review found the primary-source selector issue;
   it was scoped to `.access-actions` before validation.

## Verification and operating boundary

Affected directory tests cover all records, tool/search parity, references and
localized machine output, copied selections, clipboard failure, mobile layout,
no-script reading and fixed privacy-safe events. Run the existing required
build/canonical/analytics and deployment gates before release. Public analytics
uses the fleet's current default-start policy while preserving stored opt-outs,
DNT/GPC, QA exclusions and private-page exceptions.

Existing source/open/filter/copy events continue to measure actions, not buyers,
completed setup or revenue. No fresh demand or sales claims are made. Search,
sitemap, JSON, Markdown and llms discovery are updated from the same source.
IndexNow acceptance, if obtained, is a submission receipt rather than proof of
indexing.

Local validation passed: bilingual catalog and browser tests (13 records),
3722-page distribution verification with zero broken links/schema/language
failures, canonical routes, agent directory, source-scoped count claims, search,
lastmod and IndexNow plan tests. A separate gate runner completed 81 further
non-browser fixture/static commands; five initially blocked by sandbox process
permissions passed after a scoped retry. Final GA4 coverage passed for 3709
public pages with 14 explicit exclusions; public-engagement installation passed.
Chinese mobile screenshots were visually checked. Browser requests were
intercepted locally. This does not establish Google backend event receipt or
real customer purchases. Live release results are recorded below.

Publication coordination: the original relay run 41216467843 passed all local and browser gates but stopped before upload because another site changed main. A subsequent already-running read-only release also became stale after commit f93627dc; its upload was still pending, so it was cancelled before deployment. The next fresh current-main publication retains the exact main guard and all checks; no historical workflow is rerun.


## Published result

The free-page deployment job in run [41219402291](https://github.com/f-tiger/agi-site/actions/runs/41219402291) succeeded from source `09c8a1dfe383e875fa4822eee0555a4682ae7cdb`. Cloudflare completed deployment at 2026-10-31 16:30:35 UTC: https://7711d951.aiyangmao.pages.dev. The source includes this relay expansion and the independently developed BPJ release-input isolation checks; the original global guard was not bypassed in the earlier attempts.

Both public directory locales, JSON and Markdown passed live validation in CI and a separate read-only check. All 13 records (eight relays) and their source labels/links are present. Live analytics verification covered 75 public routes with the current asset version; this is not evidence of Google backend event receipt. IndexNow returned HTTP 200 at 16:31:06 UTC for 16 changed canonical URLs across the combined BPJ release, including both directory pages; receipt does not prove indexing.

The overall workflow is red because its separate existing membership-payment readiness job reports NOT READY and keeps checkout closed. The free-directory deployment and live checks succeeded independently. This expansion creates no paid offering and performed no purchase or refund tests. Earlier runs were superseded or stopped before upload as main changed; this completed deployment is the release receipt.
