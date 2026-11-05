# Gemini CLI quota record review

The existing bilingual entry still described a default Flash model and a numeric
60-request minute limit from its August review. The current official quota record
supports 1,000 model requests per user per day for free personal Google sign-in,
but does not substantiate those two statements as current guarantees.

Sources read on 2026-11-05:

- [Gemini CLI quota and pricing](https://github.com/google-gemini/gemini-cli/blob/main/docs/resources/quota-and-pricing.md)
- [Code Assist agent-mode and CLI quotas](https://docs.cloud.google.com/gemini/docs/quotas)
- [Official CLI plans](https://geminicli.com/plans/)
- [Separate Gemini API limits](https://ai.google.dev/gemini-api/docs/rate-limits)

The free summary and limits record now distinguish a prompt from a model request,
shared agent-mode usage from a separate API authentication route, and personal
Google AI plans from organization licenses. The current sources do not justify
carrying forward the old Flash/minute claim. This is a withdrawal of an outdated
assurance, not proof that every account has a different minute limit. No paid
price, guaranteed availability or purchase recommendation is introduced.

The update uses the existing limits-edit read/write workflow. The renderer,
tracking, private routes, scheduled collection and other tool records are
unchanged. Existing HTML, structured data and machine-readable feeds derive from
the same record. Changed canonical URLs follow the existing deployment IndexNow
selection; a submission receipt does not prove indexing or customer use.

Three refinements: correct the decision-relevant record; preserve authentication
and accounting boundaries; verify bilingual output and existing release gates.
Two self-checks: retain the supported daily ceiling and request/prompt distinction;
do not infer a new universal minute limit, model guarantee or commercial result.
