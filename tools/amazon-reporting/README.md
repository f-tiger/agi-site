# ECO Amazon report access

Read existing Germany Creators API reports through the official `listReports`
and `getReport` protocol. This removes the shared browser as an API dependency.
It does not establish that an account has report permission or that its available
reports cover all offsite affiliate commissions.

## One-time credentials

In German PartnerNet, open Tools → Creators API. Reuse an existing suitable
application, or create `ECO Reporting`, then obtain its Credential ID, Credential
Secret and Credential Version. Copy the exact version shown; do not infer it from
the marketplace. These are application credentials, not the Amazon login password
or old PA API access keys.

In [agi-site Actions Secrets](https://github.com/f-tiger/agi-site/settings/secrets/actions),
add these repository secrets:

| Secret name | Value from Amazon |
| --- | --- |
| `AMAZON_CREATORS_CREDENTIAL_ID` | Credential ID |
| `AMAZON_CREATORS_CREDENTIAL_SECRET` | Credential Secret |
| `AMAZON_CREATORS_CREDENTIAL_VERSION` | Credential Version |

Never paste values into chat, source files, issue bodies, workflow inputs or logs.
The reader performs only report reads; that does not narrow the permissions of
the credentials Amazon issues.

## Verify account access

After this workflow is merged into `main`, run **Check ECO Amazon reporting
access** manually in Actions, selecting `main`. Pull requests run mocked tests
only and do not receive Amazon secrets. The live job prints only operational
status, never filenames, report counts, commission values, token responses or
signed download URLs. It neither uploads artifacts nor commits account data.

- `reports_available`: listing succeeded and at least one report exists.
- `no_reports_available`: listing succeeded but no files are available; this is
  not evidence of zero income.
- `missing_configuration`: the three secret bindings are incomplete.
- `authentication: HTTP_400/401`: investigate the credential values and version.
- `listReports: HTTP_403`: access was denied. An allowlisted reason such as
  `AssociateNotEligible` is retained when returned; do not guess eligibility.
- Network, TLS, malformed response and checksum failures stop with a safe code.

This access check does not download financial data. The public repository is
not a private report destination. No daily job is enabled yet.

## Download in an authorized private runtime

With the same three variables securely injected into a private runtime:

```sh
python3 tools/amazon-reporting/amazon_reports.py --download \
  --output-dir /absolute/private/report-directory
```

Output must be outside Git worktrees. Files have private permissions. Each run
saves metadata and status; downloaded report revisions use hashed local names,
are checked against Amazon's size and MD5, and unchanged files are reused. By
default up to 10 most recently modified reports are considered (`--limit` accepts
1–100). The status records files outside that limit; it does not claim complete
history. The per-file size limit is 64 MiB. The program uses inherited proxies,
normal TLS validation, and declines redirects. Pre-signed S3 URLs never receive
the Creators API Authorization header and are not saved or logged.

Inspect real report headers and date coverage before mapping financial fields.
Keep merchant clicks distinct from first-party click events; preserve currency,
returns, commissions, settlement status and shared Tracking ID attribution.
An empty file list, denied request or missing column must remain unknown, never
zero revenue. `net_commission` remains null until a separately verified parser
can establish the amount.

After one real report is reconciled with PartnerNet, choose an accessible private
storage destination and integrate retrieval with an existing reporting schedule.
GitHub Secrets only make credentials available to Actions; they cannot be read
back into this chat runtime. Secrets alone therefore do not finish the private
data-delivery path.

## Validation and source

```sh
python3 -m unittest discover -s tools/amazon-reporting -p 'test_*.py'
```

Protocol verified on 2026-11-06 against the
[official SDK](https://affiliate-program.amazon.com/creatorsapi/docs/assets/sdk-archived/creatorsapi-nodejs-sdk.zip),
package version 1.3.0, SHA-256
`784128f10d9ae696c050a0a43616c65572f368ee014eb22237a1b361065bb4c9`.
Reference files: `src/auth/OAuth2Config.js`, `src/auth/OAuth2TokenManager.js`,
`src/ApiClient.js`, `src/api/DefaultApi.js`, and the report model classes.
No account call has been validated without real credentials. The SDK describes
report metadata and download URLs, not the financial columns inside each report.
