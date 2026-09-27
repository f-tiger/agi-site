# Free membership: execution brief and acceptance evidence

## Optimized task
Replace email-only reminder collection with a real free account that has repeat sign-in and useful, persistent benefits. Connect signup, login, recovery, account management, followed tools and free member packs across the bilingual site. Keep public local tools usable and preserve existing paid cloud projects. Treat old email subscriptions as unverified contact records, never as authentication. Ship only after two adversarial review rounds and actual browser/runtime tests.

Prompt acceptance rubric: outcome, current-state evidence, scope, security, paid compatibility, EN/ZH journeys, failure handling, and release verification. A prompt score is a planning judgment, not evidence of conversion lift.

## Delivered contract
- `/account` and `/en/account`: username/password registration and login; one-time recovery-code display/download; password change, recovery-code replacement and free-account deletion.
- Usernames are normalized ASCII handles, not email addresses. Email delivery is not configured. Signup does not subscribe users to marketing.
- Up to 40 followed tools are stored per authenticated account. Anonymous browser favorites can be explicitly imported. Account pages show recorded public changes and export tool sources/dates with unknown allowances marked unknown.
- Eight existing free member tools use session-aware discovery gates; workflow pack content checks the session server-side. Browser-only tools are not DRM-protected secrets.
- Paid cloud entitlement is separate: 9 USDT/30 days, no automatic renewal, 50 workspaces, latest 10 versions, 64 KiB/version and 5 MiB total. Creating a free account never activates that entitlement.
- Linking an existing paid identity requires both the free-account password and existing paid key. An account/member mapping is one-to-one. Current paid-key backup must be confirmed before deleting a linked free account.

## Authentication boundaries
- Native `node:crypto` scrypt: N=32768, r=8, p=3, 16-byte salt, 32-byte output. This is an OWASP-listed alternative; no reduced-strength fallback. BPJ enables Cloudflare `nodejs_compat` with compatibility date 2026-09-01. Other sites do not import this account backend.
- `__Host-bpj_account`: Secure, HttpOnly, SameSite=Lax, path `/`, 30-day expiry; only a session-token hash is stored. Recovery codes are 32 random bytes, stored hashed, single-use on recovery.
- Same-origin JSON mutation checks, bounded inputs, atomic per-network/username limits, session-version invalidation and account-ID checks for authenticated writes.
- Logout can revoke a valid session after the ordinary write quota is exhausted. Stale-tab identity is rejected before changing or clearing another account.
- Frontend identity generations reject delayed private responses after account switches and clear old password/recovery displays. A recovery response is shown before a subsequent refresh, so a failed status read cannot swallow it.
- Legacy subscription records are retained for unsubscribe compatibility, without being imported as verified accounts.

## Review rounds
1. Found and fixed stale-tab mutation, logout rate-limit lockout, recovery-code display dependent on an extra read, obsolete email promises, and missing export sources/dates.
2. Found and fixed delayed recovery-code response crossing an account switch; added a controlled-response race regression suite. Final review and CI must confirm this before release.

## Release gates
- Real SQLite authentication, recovery, concurrency, quotas and account/paid isolation tests.
- Actual workerd + D1 execution of native password hashing, registration/login, identity checks and recovery revocation.
- EN/ZH browser registration, secure cookie, code download, second-device login, followed-list persistence, sheet export, pack authorization and old local-flag rejection.
- Paid bridge and existing shared member/video browser regressions; canonical routes and complete assembled HTML validation.
- Production `verify-free-account-live.mjs` creates only a unique QA account, tests persistence and recovery, and removes it. No emails, payments or real-user records are touched.

Conversion impact is not yet measured. Technical acceptance cannot establish improved signup or retention rates.

References: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html and https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/
