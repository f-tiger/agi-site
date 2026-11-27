import {createHmac} from 'node:crypto';
import {utcDay} from './trade-workbench-access.mjs';

export const GUEST_DAILY_RUNS = 2;
const table = 'bpj_trade_workbench_guest_daily';
const schema = `CREATE TABLE IF NOT EXISTS ${table} (
  utc_day TEXT NOT NULL,
  bucket TEXT NOT NULL,
  runs INTEGER NOT NULL CHECK (runs BETWEEN 1 AND ${GUEST_DAILY_RUNS}),
  PRIMARY KEY (utc_day,bucket)
) WITHOUT ROWID`;
const cleanupBatch = 200;
const prunedDay = new WeakMap();

function clientNetwork(address) {
  if (!address || address.length > 64 || !/^[a-f0-9:.]+$/i.test(address)) return null;
  if (!address.includes(':')) {
    const octets = address.split('.');
    return octets.length === 4 && octets.every(value => /^(?:0|[1-9][0-9]{0,2})$/.test(value) && Number(value) <= 255)
      ? '4:' + address : null;
  }
  let ipv6;
  try { ipv6 = new URL('https://[' + address + ']/').hostname.slice(1,-1); }
  catch { return null; }
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(ipv6);
  if (mapped) {
    const high = parseInt(mapped[1],16), low = parseInt(mapped[2],16);
    return `4:${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  const [left,right] = ipv6.split('::');
  const groups = left ? left.split(':') : [];
  const tail = right ? right.split(':') : [];
  return '6:' + [...groups,...Array(8-groups.length-tail.length).fill('0'),...tail].slice(0,4).join(':');
}

export function guestTradeQuota(request, secret, now) {
  if (typeof secret !== 'string' || secret.length < 32) return null;
  const network = clientNetwork(request.headers.get('CF-Connecting-IP'));
  if (!network) return null;
  const day = utcDay(now);
  const bucket = createHmac('sha256',secret).update(`bpj:trade-workbench:guest:v1\0${day}\0${network}`).digest('hex');
  return {day,bucket};
}

export function guestTradeAllowance(used) {
  return {access:'guest', limit:GUEST_DAILY_RUNS, remaining:Math.max(0,GUEST_DAILY_RUNS-used)};
}

function missingTable(error) {
  return String(error?.message ?? '').toLowerCase().includes('no such table: ' + table);
}

export async function guestTradeUsage(db, {day,bucket}) {
  try {
    return (await db.prepare(`SELECT runs FROM ${table} WHERE utc_day=? AND bucket=?`).bind(day,bucket).first())?.runs ?? 0;
  } catch (error) {
    if (missingTable(error)) return 0;
    throw error;
  }
}

export async function recordGuestTradeRun(db, {day,bucket}) {
  const claim = () => db.prepare(`INSERT INTO ${table}(utc_day,bucket,runs) VALUES(?,?,1)
    ON CONFLICT(utc_day,bucket) DO UPDATE SET runs=runs+1 WHERE runs<? RETURNING runs`)
    .bind(day,bucket,GUEST_DAILY_RUNS).first();
  let result;
  try {
    result = await claim();
  } catch (error) {
    if (!missingTable(error)) throw error;
    await db.prepare(schema).run();
    result = await claim();
  }
  if (result && prunedDay.get(db) !== day) {
    prunedDay.set(db,day);
    try {
      const purged = await db.prepare(`DELETE FROM ${table} WHERE (utc_day,bucket) IN
        (SELECT utc_day,bucket FROM ${table} WHERE utc_day<? ORDER BY utc_day LIMIT ?)`)
        .bind(day,cleanupBatch).run();
      if (purged.meta?.changes === cleanupBatch && prunedDay.get(db) === day) prunedDay.delete(db);
    } catch {
      // A cleanup failure cannot discard a delivered result or reset today's quota.
      if (prunedDay.get(db) === day) prunedDay.delete(db);
    }
  }
  return result;
}
