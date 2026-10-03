# Jarvis membership requirement — 2026-10-03

Owner instruction: nonmembers must not use Jarvis. This supersedes the earlier free-pilot access policy. Deployed release: `jarvis-20261003-6`.

## Policy and implementation

- Public English/Chinese descriptions, FAQs and source-library links remain readable. The interactive workspace starts hidden and requires a valid AGI Scorecard membership key. The existing AGI member portal opens or renews membership; no separate Jarvis plan, price increase or new payment provider is introduced.
- Every private task API resolves the bearer key against this site's canonical membership database and checks `ends_at` and `suspended`. Missing authentication returns 401; unknown, unpaid, expired or suspended memberships return 403. Client flags, another site's paid order, a browser's former anonymous key and the private maintenance credential do not grant ordinary member access.
- Tasks are owned by a hash of the server-resolved member identity. Task access survives a legitimate membership-key replacement and works across browsers; two members cannot read or mutate each other's tasks. Raw membership keys never enter task storage, prompts, URLs, logs or analytics.
- The runner verifies membership before catalog retrieval and again before subsequent tools, inference and committing results. Revocation or an unavailable membership store pauses work. An already-started provider request cannot be retroactively undone, but its result is not published after failed authorization and no next run is scheduled.
- Existing anonymous active tasks are paused during schema migration. A valid member who also supplies the original browser capability may recover that browser's old records. Recovery keeps tasks paused; neither recovery nor renewal implicitly starts work. Records retain their original 30-day expiry.
- The browser reuses the AGI portal's per-tab membership key. It hides and clears task content on logout, rejects responses from an older login, locks at membership expiry, and separates device memories by member identity. Old anonymous memory can migrate on the original device after verified membership.
- Shared AI limits remain 12 attempts per 24-hour window and 3 per IP-key window. Existing search limits, atomic task admission, CSP and bounded request/source reads remain in force. Membership is an access requirement, not an unlimited or guaranteed model allowance.

AGI member-portal copy now distinguishes its cloud-workspace export grace period from Jarvis's active-membership requirement. Existing calculators and other sites keep their existing access terms. The product catalog includes Jarvis for correct return navigation and verified-order source attribution.

## Validation

The brief was refined in three passes: make active AGI membership the explicit access rule; include all API/background paths and existing records; define local adversarial tests and live negative probes. Two self-adversarial passes covered direct forged credentials/status and combined expiry, background execution, key replacement, migration and stale browser responses.

- 27 prior Jarvis engineering tests and 14 prior security tests pass under synthetic active-member fixtures.
- 8 new membership tests pass: denied entitlement states and forged flags, member ownership/key replacement, queued expiry/renewal, mid-search revocation, mid-inference revocation, legacy schema/recovery, failed membership storage, and the real shared membership API with mocked chain receipts.
- 8 shared membership-isolation tests pass. Cross-site payment isolation, receipt replay protection and existing paid access are preserved. No real funds or paid accounts were created by tests.
- English and Chinese Chromium journeys cover nonmember rejection, member verification, creation, local SQLite execution, report/export, pause/reload/delete, logout with an outstanding response, another member's empty memory view, CSP and 360/390 px layout. Provider output is synthetic and does not demonstrate live model quality.
- Hreflang, breadcrumbs, relevant revenue/analytics tests and post-generator GA4 coverage pass. Jarvis membership-open and member-verified events carry fixed action names only and remain opt-in; they are intent/access events, not payment receipts. Existing order verification remains the payment evidence.
- Visible metadata, JSON-LD, Markdown mirrors and LLM-readable summaries reflect paid membership access. IndexNow continues through the existing weekly process; no per-push submission or indexing claim is added.

The deployment workflow includes membership tests and live checks for both 401 and 403 boundaries. Its nonmember create probe deliberately uses invalid task input, so a regression cannot create a real task or invoke AI. Production verification does not fabricate an active membership or consume model quota.

## Deployment receipt

Commit `bde81cc0674a00e4a94b36879c58bff975a4ff56` was deployed by [AGI workflow 37125088977](https://github.com/f-tiger/agi-site/actions/runs/37125088977). Deploy job `111208648408` completed all 50 steps successfully. Existing sibling-site deployments triggered by shared catalog, member-template and analytics sources also completed successfully; the unrelated daily-update job was intentionally skipped.

Independent post-deploy checks confirmed both public pages return HTTP 200 with version `jarvis-20261003-6`, nonce CSP and frame-denial headers. Missing private authentication returns 401; a fresh nonmember key and a forged paid-status create probe both return 403 `membership_required`. The probe's task data is deliberately invalid and no task, payment or inference was created.

Chromium checked the actual production responses for English and Chinese at 390 px: the nonmember workspace is hidden, membership entry is visible, the layout fits, and no JavaScript or CSP console errors occurred. Node's TLS-verified managed transport supplied the production responses because the sandbox proxy CA is not directly trusted by Chromium. No certificate verification was disabled and no private task API was called in those fresh browser sessions.

Live GA4 tag/asset checks passed through CI. Excluded QA visits do not establish genuine-user analytics receipt or revenue. Positive membership/payment flows were validated with the shared API and local mocked receipts, not by fabricating a production subscription.

## Remaining limitations

Possession of a membership key grants its holder the associated member access; keys must remain private. Same-origin script privileges and the broader trusted-dependency risk described in the preceding security review remain. Membership reduces anonymous resource abuse, but it does not establish protection from volumetric attacks or guarantee availability under the shared site budget. Semantic model-quality evaluation remains incomplete.
