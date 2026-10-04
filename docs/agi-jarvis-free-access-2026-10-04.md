# Jarvis: free access without membership

Owner instruction on 2026-10-04: “先不限制会员使用”. This supersedes the membership-only policy in the earlier v6 and v7 records. Release `jarvis-20261004-8` opens the existing research workspace without requiring membership or payment.

Three refinements: (1) remove the payment/expiry prerequisite across the browser, API and background runner; (2) preserve private task ownership, original member history, model/search/request quotas and pause/delete/retention; (3) require anonymous end-to-end fixtures, existing-key compatibility, bilingual copy/SEO, opt-in analytics and official-site verification.

Two adversarial self-checks: free access must not become public task access, so every private API still requires a 256-bit capability and filters by its server-derived owner. Changing browser keys must not reset IP or global allowances. Member suspension and database failures still fail closed for existing member records. No actual membership, payment, customer identity, quota or approval rule is modified to pass tests.

## Behavior

- First visit creates and saves a private browser key, then opens the workspace automatically. No registration, paid key or checkout is required. Clearing that browser key can lose access; this limitation is disclosed.
- Existing AGI member keys keep their stable owner mapping, including unpaid and expired memberships. Optional workspace switching accepts the original key. Device memories remain separated by workspace; stale requests cannot reopen a closed workspace.
- Anonymous background tasks can run. Expired membership does not stop a research task. Previously paused tasks stay paused until explicitly resumed; the v7 recovery protections remain.
- Limits are unchanged: global 12 model attempts/window, per-IP 3, at most two calls for legacy checkpoints, maximum seven occurrences, bounded public search and admission, 30-day retention. No quota reset, new scheduler or paid service.
- English/Chinese pages, FAQ/schema, Markdown/AI-readable mirrors and member-portal copy describe free access. Other paid cloud workbench entitlements and payment rules are unchanged. Existing fixed opt-in Jarvis events remain; they are not payment or revenue evidence.
- Homepage entry, countdown/poll, navigation and mentor positioning are preserved. Existing weekly/manual IndexNow continues; no per-push submission.

## Verification

57 Jarvis engineering tests pass. Coverage includes anonymous/unpaid/expired use, stable member ownership/key rotation, suspension, schema compatibility, old-record recovery, background execution, cross-workspace isolation and changing anonymous keys without bypassing the IP budget. Eight shared membership isolation tests and 11 tool-catalog tests also pass. All model/chain responses in these tests are fixtures.

EN/ZH browser journeys pass without a membership: automatic private key, create, local runner/report, export, pause, reload, delete, close with an in-flight response, and another workspace with separate memories. CSP/XSS and 360px layouts pass. Site validation, hreflang, regenerated home-focus and final GA4 coverage pass. Model quality and production inference are not measured by these checks.

Production receipt: commit `a79cb18ce1232465887f75ea83835bda97e444aa` deployed in [run 37173951931](https://github.com/f-tiger/agi-site/actions/runs/37173951931), all 52 deployment steps passed. The preceding independent deployment's GitHub source probe had returned HTTP 429; this release's fixed-source probe passed. No limit was bypassed or model quota consumed.

Direct production verification confirmed v8, free-access metadata, an empty isolated task list for a fresh browser key, invalid-body rejection, missing-key/cross-origin denial, nonce CSP and unchanged quotas. A TLS-verified production browser check confirmed both EN/ZH workspaces open without a member key, 390px layout, one private task-list read per workspace and zero script errors. Its initial wait for the full page load timed out; the bounded repeat verified DOM readiness and visible workspace state. No production task, payment or inference was created. GA4/SEO/navigation release checks passed; these do not prove model quality, analytics backend receipt, retention or revenue.
