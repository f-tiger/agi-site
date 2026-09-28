# BPJ accounts and provider setup

## Account contract

- New users register with an email, a unique display name and a password (12–128 characters). Display names support Chinese/ASCII letters, digits, `_` and `-`, 3–32 characters. NFKC and case variants collide. Email addresses are normalized for uniqueness and are private account data.
- Email/password login supports Gmail, Outlook, QQ, 163 and other valid mailbox domains. Merely supplying an address does not verify it.
- Legacy username accounts retain their IDs, favorites and paid links. Sign in through the legacy form and bind an email after proving the current password.
- Google sign-in uses GIS, verified server-side RSA signatures, fixed Google JWKS, audience/issuer/time/nonce checks and one-use browser-bound proofs. A new Google user completes the display-name/backup-password form. Subsequent Google sign-ins use the immutable Google subject.
- An existing matching email never auto-merges accounts. Sign in with the existing password, then explicitly confirm linking. Google only establishes current mailbox authority for Gmail or a hosted domain claim; other addresses remain unverified.
- Only verified email can receive password-reset mail. Reset revokes sessions and rotates the recovery code. A recovery code remains the backup if email is not available.

## Production configuration

Set these on Cloudflare Pages project `aiyangmao`, production environment, or in the named GitHub repository variables/secrets before an authorized deployment:

| Name | Storage | Requirement |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Variable or secret | Google OAuth **Web application** client ID. Authorized JavaScript origin `https://baipiaoji.com`; add `https://www.baipiaoji.com` only if it actually serves the app. This GIS callback flow does not need a client secret. Configure the app audience, consent/branding and production publishing in Google Cloud. |
| `RESEND_API_KEY` | Secret | Server-side Resend sending key with permission for the chosen sender. |
| `ACCOUNT_MAIL_FROM` | Variable or secret | A Resend-authorized sender, e.g. `BPJ <accounts@your-verified-domain>`. Verify the sender domain with Resend before enabling. |

`account-configure.mjs` uses the existing Cloudflare deployment credential. Missing inputs preserve existing settings. A partially specified mail pair is skipped. It never prints credential values or changes D1 bindings. No paid plan is bought by this script.

Public capability endpoints `/api/account-google` and `/api/account-email` report configuration availability, **not completed OAuth or proven mail delivery**. Google buttons are hidden if unavailable; email reset explains when unavailable. Password signup still requires a healthy HITS database. D1 quota exhaustion returns an outage state; provider setup does not resolve the database quota.

## Release verification

1. Run `test-free-account.mjs --workerd`, `test-google-account.mjs`, `test-account-email.mjs`, `test-free-account-races.mjs`, and `test-account-configure.mjs`.
2. Build the site and workbench/member outputs; run `test-free-account-browser.mjs` and `test-account-providers-browser.mjs` with installed Playwright/Chromium. They do not send external email or authorize a real Google account.
3. Confirm mobile header signup, email form, duplicate rejection and legacy-account preservation. Account HTML strips email token fragments in its first head script, excludes Google Analytics, and uses no-referrer/no-store/noindex headers.
4. After deployment run `verify-free-account-live.mjs`. A failure is a failed live lifecycle even when code deployment succeeded.
5. After configuring providers, separately complete a real Google consent/login and mailbox verification/reset with an owner-controlled test account. Do not describe either as live-tested based only on capability flags or mocked tests. Do not send unsolicited messages to test addresses.

Official provider contracts: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token ; https://developers.google.com/identity/gsi/web/reference/js-reference ; https://resend.com/docs/api-reference/emails/send-email .

## Account activation improvements (2026-09-26)

The signed-in account page now has direct toolbox/workflow-pack entry points, saved-tool counts, and a directory search with up to eight matches. Following from search uses the existing authenticated favorites API and its 40-tool limit. Browser import is explicit, deduplicated against the current account, limited to catalog entries and available capacity, and retains unfinished local items. It never automatically imports into a new account.

Verification is visible beside the account onboarding panel. Email-verification links start at sign-in and guide the signed-in user to confirmation. Google linking expands account security only for the matching email; expired authorization has explicit retry and email alternatives. Changing the chosen method invalidates older browser callbacks. Merely loading a valid pending Google proof never restarts it.

Account links on public content pages retain a same-origin path back to the tool. Saving the recovery code exposes a prominent return action without automatic navigation. Query strings and fragments are not copied from the source page.

These features improve the implemented usage path. They do not establish conversion, revenue or paid-retention results, and do not remove the production provider or database requirements above.
