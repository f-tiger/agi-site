# ECO official read-only analytics

Single manual run, no schedule or paid connector. Fixed ECO property `544688614`,
hostname `getecoback.com`, GSC property `sc-domain:getecoback.com`. This follows
the service-account request pattern of the existing TDS reports, but never writes
metrics to public content, job logs or job summaries. It reuses the repository's
`tools/fleet/workers_usage.mjs` RSA-OAEP-SHA256 + AES-256-GCM envelope.

Public-repository Actions artifacts are not private analytics storage. Only
encrypted report data is uploaded, retained for three days. The recipient keeps
the private key locally and sends only the public PEM as a workflow input.

## One-time access

Use an existing Google service account where available. Enable Google Analytics
Data API, Google Analytics Admin API (property timezone read), and Search Console
API in its Google Cloud project. Grant it **Viewer** on ECO GA4 property 544688614
and **Restricted** read access to `sc-domain:getecoback.com` in Search Console.
Save its JSON in the existing repository secret `GA4_SERVICE_ACCOUNT_JSON`.
Never paste a private key into chat, a workflow input, a commit or a log.

`Read ECO official analytics privately` → `preflight` only checks credential
presence and JSON/key validity. It sends no request to Google. Missing credentials
produce `blocked` and a failed step, not zero traffic. `credentials_present` is
not evidence that the service account can access either property.

The equivalent single read-only preflight dispatch, after this workflow exists
on the default branch, is:

```sh
gh workflow run eco-readonly-report.yml --repo f-tiger/agi-site -f mode=preflight
```

Do not repeatedly rerun a known missing-secret result. Configure access first.
Local CLI defaults to `preflight` when `ECO_REPORT_MODE` is unset. Any other
mode is rejected; actual collection requires the explicit value `report`.

## Read and decrypt

Generate a recipient key pair in a private local directory, with mode 0700 on the
directory and mode 0600 on the private key. For example:

```sh
umask 077
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /private/eco-report-key.pem
openssl pkey -in /private/eco-report-key.pem -pubout -out /private/eco-report-public.pem
```

Run the manual workflow with mode `report` and the public PEM text in
`report_public_key`. Download `eco-official-report-encrypted` when it finishes.
Use the existing envelope fields (`key`, `iv`, `tag`, `data`) to decrypt locally:

```js
import {readFileSync,writeFileSync} from 'node:fs';
import {privateDecrypt,createDecipheriv,constants} from 'node:crypto';
const envelope=JSON.parse(readFileSync('/private/report.enc.json','utf8'));
const key=privateDecrypt({key:readFileSync('/private/eco-report-key.pem'),
  oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.key,'base64'));
const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
const bytes=Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]);
writeFileSync('/private/eco-official-report.json',bytes,{mode:0o600});
```

Keep the private key until the report is downloaded and decrypted. Losing it
means the artifact cannot be recovered. No private key is stored in GitHub.

## Measurement contract

- GA4: previous 28 complete **property-timezone** dates; exact hostname filter.
  Daily `totalUsers`, `activeUsers`, sessions, pageviews, engaged sessions; separate
  channel, country, landing-page and event-name reports. A successful Data API
  report with real event rows establishes historical backend receipt; it does not
  prove every new action or newest deployment has been received.
- GSC: web search, final data, previous 28 dates ending three **Pacific** dates
  back; canonical ECO HTTPS host filter. Daily, page, query, query/page and country
  reports. Daily limit 100; other limits 5,000. No pagination: `atRowLimit` is
  explicit. These are top rows; anonymized queries and Google's own limits remain
  missing even below the cap. Raw response metadata is retained.
- GA4 daily limit 100; other dimensions 1,000. `rowCount` and actual rows expose
  truncation. Thresholding/sampling/data-loss metadata is preserved. Missing rows
  and failed requests are never filled with invented zero traffic.
- Daily totalUsers estimates daily distinct measured identities, not a census of
  real people. Report activeUsers separately. A 7-day unique total divided by seven
  is not the average daily unique count. D1 pageview events are a separate series.
- HTTP/API failures emit fixed status codes only; provider response/error bodies,
  token details, queries and counts never appear in console output. GA4 and GSC
  retain independent statuses, so one failed source does not erase the other.

## Validation

```sh
node --test tools/eco-reporting/report.test.mjs
```

Tests use generated fixture credentials and mocked Google responses. They do
not collect events or call production reporting APIs. No recurring job, new
tracking identifier or Google configuration mutation is introduced.
