const freeActions = ['preview', 'backup', 'export', 'image', 'canva'];
const ownActions = {import_own: 'import', member_open: 'member_open', paid_offer_view: 'paid_offer_view'};
const events = new Map();
for (const mode of ['demo', 'own']) {
  for (const action of freeActions) events.set(`/proofkit/${action}_${mode}`, {mode, action});
}
for (const [event, action] of Object.entries(ownActions)) events.set(`/proofkit/${event}`, {mode: 'own', action});

export const PROOFKIT_PATHS = [...events.keys()];
export const parseProofKitEvent = path => events.get(path);
export function emptyProofKitCounts() {
  const free = Object.fromEntries(freeActions.map(action => [action, 0]));
  return {demo: free, own: {...free, import: 0, member_open: 0, paid_offer_view: 0}};
}
