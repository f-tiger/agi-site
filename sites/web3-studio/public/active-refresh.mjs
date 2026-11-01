// Reference data is already rendered on the server. Poll only while the reader
// is active; a hidden or abandoned tab must not spend the account's quota.
export function activeRefresh(refresh, {document: doc = globalThis.document,
  now = Date.now, intervalMs = 300000, idleMs = 120000, manualGapMs = 5000,
  schedule = globalThis.setInterval, cancel = globalThis.clearInterval} = {}) {
  let lastActivity = now(), lastAttempt = now() - manualGapMs, busy = false, stopped = false;
  const activity = () => { lastActivity = now(); };
  async function run(manual = false) {
    const time = now();
    if (stopped || busy || doc.hidden || (!manual && time - lastActivity >= idleMs)
      || time - lastAttempt < (manual ? manualGapMs : intervalMs)) return false;
    busy = true; lastAttempt = time;
    try { await refresh(); return true; } finally { busy = false; }
  }
  const visible = () => { if (!doc.hidden) { activity(); void run(); } };
  const events = ['pointerdown', 'keydown', 'input', 'scroll'];
  for (const event of events) doc.addEventListener(event, activity, {passive: true});
  doc.addEventListener('visibilitychange', visible);
  const timer = schedule(() => { void run(); }, intervalMs);
  return {manual: () => { activity(); return run(true); }, tick: () => run(),
    stop() { stopped = true; cancel(timer); for (const event of events) doc.removeEventListener(event, activity);
      doc.removeEventListener('visibilitychange', visible); }};
}
