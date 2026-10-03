# Jarvis security review — 2026-10-03

Scope: the English and Chinese Jarvis pilot, private task API, bounded runner, public metadata connectors, browser rendering and Markdown export. Release: `jarvis-20261003-5`. This is an application review with local adversarial fixtures, not an independent penetration test or a claim that attacks are impossible.

## Review brief

Three refinements: identify the permission and cost boundaries; reproduce failures using synthetic local owners and SQLite; make atomic, bounded fixes and verify the actual browser and deployed responses. The two self-adversarial passes covered direct malformed/unauthorized requests, then combined stale reads, simultaneous transitions, interrupted streams and hostile source/model output. Production checks do not invoke AI or reset/increase quotas.

## Findings and changes

| Finding | Evidence before the change | Change |
| --- | --- | --- |
| Resume bypassed active-task admission | A paused task resumed with three active tasks, producing four | One conditional SQL update checks owner, allowed prior state, run/expiry bounds and active count. Two concurrent stale reads cannot admit the same task twice or a fourth active task. |
| Markdown export interpreted untrusted markup | A synthetic report exported raw image HTML and executable Markdown links | Escape user/model/source text, fold line breaks and controls, and create links only for validated source URLs. UI output continues to use text nodes. |
| Workspace lacked browser containment headers | Live English and Chinese responses had no CSP or frame-denial headers | Fresh per-response script nonces, same-origin script/connect/frame policies, no framing, no objects/workers, no referrer, restricted browser capabilities, no conditional HTML reuse. Existing navigation, first-party measurement and opt-in GA4 are retained. |
| Byte limits did not provide a read deadline | Existing JSON reader stopped at 16,000 bytes but could wait indefinitely for a stalled stream | A 5-second request-body deadline and the same byte limit; cancellation cannot block the response. Public source reads have an 8-second overall fetch/body allowance and a 350,000-byte cap. |
| Public retrieval had no separate execution allowance | Creation/resume limits existed, but retrieval ran before model-quota admission | Atomic public-search reservations: at most 24 runs per shared 24-hour window and 6 per IP-key window. New runs use two fixed public searches; older checkpoints retain their existing maximum of three tool actions. Checkpoints retain a reservation instead of charging it again. This does not alter AI quotas. |
| Upstream metadata had uneven type/length validation | IDs, stars and dates were less constrained than titles/descriptions | Restrict identifier shape/size, URLs, numeric stars and date strings before storing or building model schemas. Reject array-valued request IDs and nonces. |

The review did not reproduce cross-owner task access, an unauthenticated runner, arbitrary URL fetching, model-selected external tools or model-to-HTML execution. These boundaries are pinned by regression tests. A source redirect is rejected without following it.

## Verification

- 27 existing engineering tests pass.
- 14 additional security tests pass: task admission races, owner isolation, origin/auth/type validation, runner permissions, dishonest/missing content length, stalled upload/cancellation, stalled upstream body, Markdown injection, hostile metadata, search quota, instruction-to-capability confinement and page policies.
- Chromium exercises English and Chinese create → local API/SQLite/runner → report → export → pause → reload → delete, including 360 px and 390 px layouts. Injected scripts and external fetches are blocked by the page CSP; malicious report HTML is displayed as text and escaped in the download. All AI responses in these tests are fixtures.
- Relevant existing analytics tests, bilingual hreflang and breadcrumb checks pass. Navigation and GA4 generators are run after page generation; the coverage check reports no missing/duplicate/wrong-property tags. No private task content is added to analytics.
- The release workflow runs both engineering and security test files, then checks live response nonces, CSP, frame denial, metadata, private API boundaries, navigation and analytics assets. The workflow receipt is the evidence for deployment completion; a local test alone does not establish a live result.

No production inference allowance was consumed by this review. No live burst test, identity rotation or limit reset was used. The shared AI limits remain 12 attempts per 24-hour window and 3 per IP-key window; unsuccessful calls still consume quota.

## Deployment receipt

The security patch is commit `c4cc7348f7ada1f6c2f1c10399e91f730c766f56`. Its first build passed validation but correctly refused deployment when main advanced. The subsequent main commit `e9f4dc3a33a1675df0ae5a9beffa4c486ab0bd42` includes the unchanged patch plus a separate homepage update.

[Deployment 37122955439](https://github.com/f-tiger/agi-site/actions/runs/37122955439) completed successfully at 2026-10-03 12:33 UTC. Deploy job `111202720985` completed 50 steps successfully, including the new security tests, bilingual browser journeys, live Jarvis policies, private runner/source checks, navigation and GA4 coverage. The optional live model job was skipped as intended; it is not counted as a model-quality pass.

Independent post-deploy checks returned HTTP 200 and `jarvis-20261003-5` for both public pages, matching script nonces and CSP headers, denied unauthorized private APIs, and unchanged model limits. Chromium loaded the actual production responses for both languages at 390 px with zero JavaScript or CSP console errors and no private API calls. The sandbox proxy's CA is not trusted directly by Chromium, so this browser check used Node's TLS-verified managed transport to deliver the production responses; certificate verification was not disabled. Local attack fixtures ran separately.

GA4 tag/asset/consent integration checks passed. No new GA4 backend receipt or genuine-user conversion was claimed from these excluded QA visits.

## Remaining boundaries

Anonymous access and IP-based admission are not strong bot identity. A distributed attacker could exhaust the deliberately small shared allowance and deny service to legitimate visitors. Application caps limit work; this review does not establish protection against volumetric attacks, nor verify account-level WAF/bot-management settings.

The private capability key and editable memories remain in browser storage on the site origin. Trusted same-origin scripts, including the opt-in analytics frame, share that origin's privileges; an empty frame is not a browser security isolation boundary. Origin-wide XSS or a compromised trusted dependency remains material. Stronger separation would require a dedicated private workspace origin or an audited sandboxed integration. This release's CSP and text-only rendering reduce the exposed paths without claiming origin-wide isolation.

Retrieved instructions and model prose remain untrusted. Tests prove that malicious prose cannot select tools, change public keywords, execute HTML or mutate task state; they do not prove that a draft is accurate or immune to misleading recommendations. Citation-ID checks are not semantic verification. The planned held-out model-quality evaluation remains incomplete, and this security release does not turn it into a passing result.

## References

- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP API4:2023 — Unrestricted Resource Consumption](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/)
