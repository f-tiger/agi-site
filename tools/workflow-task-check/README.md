# Compare coding assistants on one CRM workflow

Use the same small task to see whether an assistant handles failure paths, rather
than choosing it from a model ranking. This free Node.js 22+ exercise uses a local
CRM stub and synthetic events. It needs no API key, paid model call or account.
It does not connect to your CRM, send messages or create real contacts.

## Run the example

From a checkout of this repository:

```sh
cd tools/workflow-task-check
node check.mjs starter.mjs
node check.mjs reference.mjs
```

The starter is deliberately incomplete and should fail checks. The reference
shows one passing implementation. A nonzero exit means at least one contract
failed. The JSON lists each check; a green process alone is not the result.

## Try your assistant

Start from a fresh copy of `starter.mjs` for each assistant. Give it the contract
below and `check.mjs`, but keep `reference.mjs` out of its context. Run the checks
locally against the edited file. Do not upload customer records, credentials or
private repositories for this exercise. Only execute code you have reviewed and
trust: this runner is not a security sandbox.

> Implement `createHandler({ crm, wait })`, returning an async function that takes
> a synthetic contact-upsert event. Require a nonempty string id, type
> `contact.upsert`, and contact.email. Invalid input returns status 400 with no
> CRM call. `crm.upsert(contact, { idempotencyKey: event.id })` returns an object
> with a nonempty string id. Successful handling returns status 200 and contactId.
> Prevent duplicate writes on redelivery and after a handler restart using the
> stub's documented idempotency-key guarantee. Retry 429, 5xx and ETIMEDOUT at
> most three total attempts, calling the injected wait between attempts. Do not
> retry 401/403; return status 502 and code crm_auth. Exhausted retries return
> status 503 and code crm_retry_exhausted. A malformed success returns status 502
> and code invalid_crm_response. No real network, file, account or deployment
> access is required.

Record assistant/version/settings, each check outcome, your intervention minutes,
number of correction rounds and the usage actually shown by your provider. Keep
unknown measurements blank. Runner duration is not your development time, and
subscription usage percentages are not a dollar cost. Do not infer a model ranking
or savings from this single small, visible exercise.

## What the nine checks cover

Valid events; duplicate delivery; invalid input; one transient failure; invalid
credentials; bounded rate-limit retries; a timeout after the remote write already
committed; handler restart; and malformed CRM success responses.

**Boundary:** the stub guarantees remote idempotency. Many real CRM endpoints do
not support this exact contract. A production integration needs provider-specific
auth and signature checks, durable event state, concurrency handling, retry and
reconciliation design, and tests against an authorized sandbox. This sample is
not a production connector, security audit or customer success case.

## Bring one unresolved task

If this exposes a problem in your actual workflow, you can
[open a public, sanitized workflow question](https://github.com/f-tiger/agi-site/issues/new?template=workflow-question.yml).
Include the system involved, expected result, failing step and a tiny synthetic
example. Public issues are visible to everyone: no email addresses, credentials,
customer records, screenshots containing personal data or private source code.
Do not use this channel for sensitive issues or private commercial terms.

We can assess whether a free configuration change is sufficient or whether a
small implementation task needs separate scope and acceptance criteria. Posting
does not reserve paid work or promise a response time. There is no checkout or
fixed service price attached to this exercise.

This task was motivated by a public question about selecting an AI coding tool
for API-heavy GTM automation. It is independently written, uses only synthetic
data and has not been validated by that question's author. The exercise is MIT
licensed; see LICENSE.
