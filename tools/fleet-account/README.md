# Fleet Google registration

All canonical production hosts in `config.mjs` use the existing BPJ free account service. Each site exposes `/auth/account`, starts at `/auth/google`, and returns via `/auth/callback`. The BPJ account page offers Google registration and existing email login. Google GIS only executes on `https://baipiaoji.com`; this is the only Google JavaScript origin required by this architecture. Google Cloud configuration and a real owner sign-in still require verification outside synthetic tests.

AGI additionally maps an authenticated fleet session to a stable free AGI identity for Jarvis and discussion-profile registration. Its server-only HMAC capability never reaches the browser; every request revalidates the fleet session. Existing paid workspace keys and discussion profiles are not automatically merged. It grants no paid entitlement. Existing BPJ accounts and Google identity validation are reused unchanged. Existing public tools stay accessible without a new gate. No 30-day trial is enabled.

The originating site stores a random state and PKCE verifier in a Secure, HttpOnly, host-only cookie for 15 minutes. The hub requires an authenticated session, same-origin POST, explicit confirmation and matching account ID. A 90-second authorization code binds account version, exact allowlisted host and SHA-256 challenge. Atomic `DELETE RETURNING` consumes it once. Server-side exchange creates a separate opaque session per site. Only hashes are stored. Account removal or security-version changes invalidate all derived sessions; logout revokes the current site session. No tokens go to localStorage or analytics. Site handlers never accept arbitrary redirect URLs or browser-supplied identity claims.

Identity and session tables stay in BPJ's existing private D1 database. Other workers need no new database bindings, credentials, domain purchases or schedules. AGI uses its existing member database and signing secret for the native free-account adapter. Introspection occurs on the account page, not on every public page. Failures show retry and do not claim a logged-in user. Ordinary content and other worker entrypoints are preserved.

`/auth/*` and BPJ `/account` are private, noindex/no-store, and excluded from GA4, sitemaps and IndexNow. Existing public GA4 and discovery gates remain in each deployment. There is no private page analytics exemption removal. Public navigation adds a real account link without manufactured dates or search submissions. OAuth claims, email addresses, session tokens and authorization codes are never logged. Registering is not marketing consent, payment or revenue.

Tests:
- `node tools/fleet-account/test.mjs`: real SQLite security and lifecycle tests.
- `node tools/fleet-account/browser-test.mjs`: generated BPJ page, guest/owner confirmation, local SQLite exchange, mobile fit and logout. HTTP redirect boundaries are stepped offline so the fixture never contacts production; actual 303 contracts are covered separately. This is not proof of real Google consent.
- `node tools/fleet-account/verify-live.mjs SITE`: per-host read-only deployed routing, entry and privacy checks.
- BPJ's existing disposable `qa=1` live-account test now checks real D1 code exchange, replay rejection, host isolation and logout before deleting the account.

SunWatch lives in a separate repository. Its `src/fleet-account/{edge,config}.mjs` is an explicit source copy; synchronize it whenever the protocol changes. The hub allowlist includes its canonical `invest.agiscorecard.com` hostname. Legacy workers.dev links remain unchanged.
