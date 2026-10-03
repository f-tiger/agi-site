// Synthetic reference implementation. No network calls or provider credentials.
export function createHandler({ crm, wait = async () => {} }) {
  const completed = new Map();
  return async function handle(event) {
    if (!event || typeof event.id !== 'string' || !event.id.trim() ||
        event.type !== 'contact.upsert' || typeof event.contact?.email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.contact.email)) {
      return { status: 400, code: 'invalid_event' };
    }
    if (completed.has(event.id)) return completed.get(event.id);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // The synthetic CRM guarantees idempotency for this key. A real provider
        // may not: use its documented guarantees or a durable reconciliation design.
        const result = await crm.upsert(event.contact, { idempotencyKey: event.id });
        if (!result || typeof result.id !== 'string' || !result.id) {
          return { status: 502, code: 'invalid_crm_response' };
        }
        const receipt = { status: 200, contactId: result.id };
        completed.set(event.id, receipt);
        return receipt;
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          return { status: 502, code: 'crm_auth' };
        }
        const retryable = error.status === 429 || error.status >= 500 || error.code === 'ETIMEDOUT';
        if (!retryable) return { status: 502, code: 'crm_failure' };
        if (attempt === 2) return { status: 503, code: 'crm_retry_exhausted' };
        await wait(attempt + 1);
      }
    }
  };
}
