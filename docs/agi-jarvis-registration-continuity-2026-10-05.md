# Jarvis v10: free-registration continuity

Date: 2026-10-05. Release: `jarvis-20261005-10`. This is a bounded task-recovery fix, not a model-quality or AGI claim.

## Three refinement passes

1. Outcome: after the one guest task, every registration entry must preserve the user's private task handoff so a recognized free AGI account can recover that history without payment.
2. Constraints: keep the one-task guest receipt, 24-hour network admission, existing 12/3 model limits, exact host/account allowlists, private browser capability, 30-day task retention and user pause/delete controls. Do not put a key, task ID, goal or memory in a URL, analytics event or public log.
3. Acceptance: the direct Google entry stores the same 30-minute, same-tab handoff used by the existing private-key registration path; the server-side fleet adapter preserves that exact opaque header; recovery still requires the original 256-bit guest capability and does not merge unrelated workspaces.

## Evidence, counterevidence and experiment

Google's official OAuth guidance recommends a unique, non-guessable `state` and exact response matching to protect the authorization redirect. The existing fleet-account flow already follows that server-side rule with a host-bound state and PKCE verifier. The product-specific task handoff is separate: it stays in same-tab `sessionStorage` and is sent only on the first authenticated private-task read. It must not be overloaded into a browser-controlled redirect URL or OAuth identity claim.

The repository inspection found one inconsistent entry: Jarvis's dynamically added Google account link did not call the handoff routine that all other registration links use. A guest who returned through that entry could therefore open a valid new account workspace without the prior private task. This is deterministic application state, so neither the current 8B model nor a stronger model is appropriate to repair it.

Counterevidence: the main post-trial link already used the correct routine, and existing registration tests passed. The defect affected the separate direct Google link, so a successful private-key journey did not prove every registration journey preserved continuity.

Frozen experiment:

- Before navigation, click the direct Google account entry from a guest workspace and inspect the same-tab receipt.
- Pass only if it contains the exact guest capability, the hashed owner scope and a timestamp, contains no goal/task/memory, and the server-side account adapter preserves the exact legacy-capability header.
- Existing adversarial tests must still reject forged registration flags, wrong owners, cross-site writes, rotated guest keys, second guest trials and stale responses after logout.
- No OAuth request, production account, customer task or model call is used by this experiment.

## Result and model decision

The direct Google entry now invokes the same bounded registration handoff as the other account links. The browser regression covers English and Chinese; the fleet-account test covers header preservation through the authenticated server adapter; existing SQLite tests cover exact-capability migration and workspace isolation. Seventy-four Jarvis, membership, security and fleet-account tests pass locally. The full browser suite remains a deployment gate because the local sandbox could not download its Chromium binary.

Current model comparison remains deliberately unresolved:

| Path | Fit for this defect | Evidence this round | Decision |
|---|---|---|---|
| Deterministic browser/server handoff | Exact state transfer and authorization | Reproducible source-path gap plus frozen tests | Ship |
| Current 8B model | Cannot authorize or safely move a private capability | No new quality trial | Keep unchanged |
| Stronger model candidate | More compute cannot replace exact ownership checks | No frozen result-quality comparison | Do not invoke |

Cloudflare's JSON Mode documentation, updated 2026-09-14, says schema conformance is not guaranteed and lists supported models separately. That is additional reason to keep authorization and task recovery outside inference. The same documentation is not evidence that the current model is unusable: the earlier v3 production call did return parseable JSON. A model change still requires the frozen end-result, citation, recovery, latency and token comparison described in the expanded research plan.

Sources:

- Google, [OAuth 2.0 best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- Cloudflare, [Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- Cloudflare, [Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/)

## Release boundaries

No quota, schedule, model, price, paid entitlement, external message, new analytics field or IndexNow trigger changes. Existing fixed `jarvis_registration_open` measurement now also covers this entry after analytics consent; it contains no private content. GA4 frontend emission still does not prove backend receipt. SEO/GEO pages, homepage countdown and poll, bilingual routes, and the separate ecommerce reporting mentor are unchanged.
