# Jarvis: one guest trial, then free registration

Owner instruction on 2026-10-04: “限制使用次数，免费单人一次使用然后引导注册”. This supersedes v8's unrestricted guest access. Release `jarvis-20261004-9` provides one guest task, then requires a free AGI account for another run. Paid membership is not required.

## Three refinement passes and two adversarial self-checks

1. Define the outcome: a guest can inspect one task's result before a clear registration invitation. Existing results must remain readable, exportable and deletable.
2. Reuse the existing AGI account system at `/discuss/account` and `/zh/discuss/account`. Registration uses a display name and downloaded private login key; it requires no email, payment, new provider or password service. Registration grants no extra model quota.
3. Freeze acceptance around actual state transitions: one submission, duplicate retries, simultaneous submissions, deletion/expiry, pause/recovery, daily scheduling, account return, private history and scoped device memory.

Self-check 1: a browser key is not proof of a unique person. Server receipts enforce one trial per key; a separate keyed network digest admits at most one guest trial per IP in a rolling 24-hour period. Changing networks and keys can still evade anonymous-person recognition. Shared networks may need to register earlier. These limits are stated in both languages; no fingerprinting or verified-person claim is introduced.

Self-check 2: hiding the submit button would be insufficient. Admission, task insertion and its usage receipt are one SQL statement with an AFTER INSERT trigger. Deleting a task, claiming it into an account, or expiring its content does not erase the minimal trial receipt. Background execution independently rejects extra guest occurrences. Saved steps of the first interrupted occurrence can resume; unknown model outcomes are still not replayed. Existing surviving guest history counts toward the trial; previously deleted history cannot be reconstructed.

## Implementation and privacy

- A guest trial is consumed when a valid task is durably saved, even if inference later fails or returns only a source pack. Invalid submissions and failed task persistence do not consume it. Duplicate nonces return the existing task.
- Guest daily scheduling is denied before any model work. Registered accounts retain bounded daily watches and the original 3 active / 20 saved task limits. Model limits remain 12 shared attempts per 24-hour window, 3 per IP window and at most 2 per legacy occurrence; new occurrences use one synthesis call. No quota is reset or enlarged.
- The registration invitation records an explicit, short-lived same-tab handoff. The key stays out of URLs and analytics. After successful free registration or sign-in, a fixed same-origin return path restores the trial to that account; in-flight tasks pause for explicit recovery. Completed results keep their status. Other accounts cannot claim the migrated history. Selected local memories move only as part of this explicit handoff.
- Task content still expires after 30 days. The separate retained trial receipt contains only the workspace digest, opaque task ID and creation time. Network admission records stop applying after 24 hours and are removed during bounded maintenance. Routing and trial-network digests attached to individual tasks remain private and are removed with the task at deletion or 30-day expiry. The public privacy FAQ explicitly distinguishes these retention rules. No task body, memory, key, raw IP, customer report or analytics account data is included in this document.
- The existing free-account page remains noindex and excluded from GA4. Jarvis adds only a fixed `jarvis_registration_open` event through the existing opt-in channel. `jarvis_member_verified` means a server-recognized account, not a new registration, unique human, paid conversion or revenue.

## Evidence and falsifiable experiment

Reviewed on 2026-10-04: [Cloudflare D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/) documents auto-commit and transactional batches. [SQLite trigger semantics](https://www.sqlite.org/lang_createtrigger.html) describe trigger execution within modifying statements. A deterministic atomic state transition fits this access-control problem; adding a small or stronger model would add variability and cost without proving identity.

Hypothesis: two simultaneous submissions cannot create two guest tasks, and deletion or repeated execution cannot unlock a second trial. Counterexample criteria: more than one admitted task, a second guest model occurrence, a lost trial on rolled-back persistence, cross-account access, or an uncontrolled redirect. Tests use isolated synthetic SQLite databases and mocked model responses, not actual customers or live-model quality measurements.

## Validation before publication

- 66 Jarvis tests pass, including 9 added trial/registration cases, the prior access controls, quota isolation and checkpoint recovery.
- Existing community/privacy tests and shared fixed-event tests pass. All 8 independent membership/payment isolation checks pass with a mocked chain.
- EN/ZH browser journey: guest trial → source-linked report/export → second-use gate → existing free registration with key backup → automatic return with private history and device memory → registered daily task → pause/reload/delete → logout with an in-flight response → another workspace with separate memory. CSP, hostile report rendering, private account analytics exclusion and 360/390px layout pass.
- Existing EN/ZH community registration, backup/import, pending contributions, follow, sign-out/in and moderation browser journeys pass using synthetic data.
- 376 pages validate, sitemap contains 353 URLs, and 112 hreflang clusters across 294 pages close correctly. Homepage focus, countdown/poll and the distinct Work Mentor position are preserved. GA4 coverage after all generators passes for 371 opt-in pages and 5 explicit private/error/widget exclusions. Existing weekly/manual IndexNow remains unchanged.
- Live model calls for this change: 0. Real model latency, token usage and answer quality were not measured. Fixture successes are engineering evidence only. Actual registration conversion, repeat usage and GA4 backend receipt remain unknown.

Latest-main integration preserves concurrent BPJ registration-journey updates, including its new fixed analytics event. The integrated Jarvis/shared-event suite passes all 75 tests.

## Production verification

The functional release was committed as `5477418937a8e52ef1511b907815ff355b3a1c1f` and deployed by [run 37178016336](https://github.com/f-tiger/agi-site/actions/runs/37178016336). All predeployment tests, the current-main guard, upload, Jarvis live API checks, private runner authentication and fixed public source probes passed. The job then stopped because a statistics module briefly served the previous version while the new coverage manifest was already visible. This is recorded as a failed postdeployment check, not an all-green workflow.

A later execution of the same strict `verify-live.mjs agi` passed: analytics release `f55725f277dc`, 369 covered public routes, 72 live routes checked, and exact shared-asset contents. GA4 backend receipt is still untested. No quota was reset and no acceptance check was weakened.

Separate production checks passed for `/jarvis` and `/zh/jarvis` (v9), private empty guest reads, forged guest daily requests returning `403 registration_required`, missing credentials returning 401, no-store/nonce CSP, EN/ZH free-registration entry pages with noindex and no GA4, and unchanged 12/3 model limits. Live 390px browser reads for both languages confirmed one private-workspace read, working registration links, disabled guest daily scheduling, no horizontal overflow and no JavaScript errors. These live checks created no accounts or tasks and made no model calls.

The skipped public checks for community access boundaries, Earn, Relay, infrastructure and all localized workbench tools were subsequently run and passed. Authenticated aggregate-growth jobs were not rerun outside their authorized CI context; conversion, user counts and retention remain unknown.

A final copy correction distinguishes 24-hour network admission records from network digests attached to 30-day task records. Functional one-trial enforcement is unchanged. The complete final deployment passed all 52 steps, as recorded below.


### Final deployment receipt

Final source commit: `e24e094e29e26528151a120b168c73ba3be272d3`. [Deployment run 37178611921](https://github.com/f-tiger/agi-site/actions/runs/37178611921), job `111366385252`, completed successfully with all 52 steps passing, including all live checks and the authorized aggregate-report steps. The current-main guard and serialized deployment remained enabled. The earlier transient GA4 failure was retained in this record; the final workflow is fully green.

Official product routes: https://agiscorecard.com/jarvis and https://agiscorecard.com/zh/jarvis. Free account entry: `/discuss/account?from=jarvis` and `/zh/discuss/account?from=jarvis`. No new model quality claim, customer-growth claim, paid plan or extra model allowance follows from these deployment tests.
