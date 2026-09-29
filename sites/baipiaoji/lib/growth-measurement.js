import {CAMPAIGNS, SESSION_SECONDS, RETENTION_DAYS, QUALIFY_SECONDS, MEASUREMENT_VERSION, campaignFor, cleanPath, arrivalClass} from './growth-campaigns.js';

export const GROWTH_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS bpj_growth_sessions (
    sid TEXT PRIMARY KEY, campaign TEXT NOT NULL, source TEXT NOT NULL,
    arrival TEXT NOT NULL, d TEXT NOT NULL, started INTEGER NOT NULL,
    qualified INTEGER NOT NULL DEFAULT 0 CHECK(qualified IN (0,1)),
    acted INTEGER NOT NULL DEFAULT 0 CHECK(acted IN (0,1))
  ) WITHOUT ROWID`,
  'CREATE INDEX IF NOT EXISTS bpj_growth_day ON bpj_growth_sessions(d, campaign, source)',
];
export const GROWTH_SQL = `SELECT campaign, source, arrival, COUNT(*) arrivals,
  SUM(qualified) qualified, SUM(acted) action_sessions
  FROM bpj_growth_sessions WHERE d >= ? AND d < ?
  GROUP BY campaign, source, arrival`;
const ready = new WeakMap();
export async function ensureGrowthSchema(db) {
  if (!ready.has(db)) {
    const work = (async () => { for (const sql of GROWTH_SCHEMA) await db.prepare(sql).run(); })();
    ready.set(db, work);
    work.catch(() => ready.delete(db));
  }
  return ready.get(db);
}
export function normalizeGrowthEvent(body) {
  if (!body || typeof body !== 'object' || body.qa === true || body.qa === 1) return null;
  const {campaign, source, sid, kind} = body;
  const path = cleanPath(body.path);
  if (!campaignFor(campaign, path, source) || !/^[a-f0-9]{32}$/.test(sid || '') || !['arrival','qualified','official_click'].includes(kind)) return null;
  return {campaign, source, sid, kind, path, arrival: arrivalClass(body.referrer_host)};
}
export async function recordGrowthEvent(db, event, now = Date.now()) {
  await ensureGrowthSchema(db);
  const seconds = Math.floor(now / 1000), day = new Date(now).toISOString().slice(0,10);
  // A random per-tab nonce, hashed before storage. Never accept an account identifier.
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(event.sid));
  const sid = [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2,'0')).join('');
  if (event.kind === 'arrival') {
    const result = await db.prepare(`INSERT INTO bpj_growth_sessions(sid,campaign,source,arrival,d,started) VALUES(?,?,?,?,?,?)
      ON CONFLICT(sid) DO UPDATE SET sid=excluded.sid
      WHERE campaign=excluded.campaign AND source=excluded.source AND started>=? AND started<=?`)
      .bind(sid, event.campaign, event.source, event.arrival, day, seconds, seconds-SESSION_SECONDS, seconds).run();
    return Number(result.meta?.changes ?? result.changes) > 0;
  } else {
    // Only an existing arrival can become qualified. Replays cannot inflate totals.
    // Ten seconds on the server as well as active foreground time in the browser.
    const earliest = seconds - SESSION_SECONDS;
    const latest = seconds - (event.kind === 'qualified' ? QUALIFY_SECONDS : 0);
    const result = await db.prepare(`UPDATE bpj_growth_sessions SET qualified=1, acted=MAX(acted,?)
      WHERE sid=? AND campaign=? AND source=? AND started>=? AND started<=?`)
      .bind(event.kind === 'official_click' ? 1 : 0, sid, event.campaign, event.source, earliest, latest).run();
    return Number(result.meta?.changes ?? result.changes) > 0;
  }
}
export async function readGrowthMeasurement(db, days = 28, now = Date.now()) {
  const end = new Date(now).toISOString().slice(0,10);
  const start = new Date(Date.parse(end) - days * 86400000).toISOString().slice(0,10);
  const base = {measurement_version: MEASUREMENT_VERSION, generated: new Date(now).toISOString(),
    window: {start, end_exclusive: end, complete_days: days, date_basis: 'UTC'},
    definitions: {
      unit: 'Estimated 30-minute browser-tab sessions, not unique people. Reloads in one tab are deduplicated; different tabs/devices are not.',
      arrival: 'Fixed campaign and source tags plus a client-reported referrer class. Tags/referrers can be lost or forged. Tag-only arrivals are reported separately.',
      qualified: 'At least 10 seconds active foreground time or a trusted browser click to an allowed official destination. Client reports are not proof of human identity or task completion.',
      exclusion: 'Known bots, DNT/GPC and marked QA visits are excluded; unmarked owner visits and automation may remain. Internal, fleet and search referrers are separate.',
      attribution: 'One campaign per tab interval; no cross-site identity, causal lift, revenue or Google conversion rate. No historical backfill.',
      privacy: 'Only hashed random nonce, campaign/source enums, referrer class, UTC day/start and stage flags. No email, IP, full URL, country or raw referrer. Records older than 31 days are pruned on uncached report reads; refresh gaps can delay deletion.',
    }};
  try {
    if (!db) throw Error('no_db');
    await ensureGrowthSchema(db);
    const cutoff = now - RETENTION_DAYS * 86400000;
    await db.prepare('DELETE FROM bpj_growth_sessions WHERE d <= ? AND started < ?')
      .bind(new Date(cutoff).toISOString().slice(0,10), Math.floor(cutoff/1000)).run();
    const rows = (await db.prepare(GROWTH_SQL).bind(start,end).all()).results || [];
    return {...base, ok: true, campaigns: CAMPAIGNS.map(c => ({id:c.id, state:c.state,
      rows: rows.filter(r => r.campaign === c.id).map(({source,arrival,arrivals,qualified,action_sessions}) =>
        ({source,arrival,arrivals,qualified,action_sessions}))}))};
  } catch {
    return {...base, ok:false, code:'measurement_unavailable', campaigns:null};
  }
}
