// Intentionally incomplete task fixture, not production code.
export function createHandler({ crm }) {
  return async function handle(event) {
    const result = await crm.upsert(event.contact);
    return { status: 200, contactId: result.id };
  };
}
