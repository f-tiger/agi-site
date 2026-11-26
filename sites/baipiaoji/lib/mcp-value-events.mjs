const STARTUP_MEMBER_TOOLS = [
  'search_startup_cases', 'compare_startup_cases', 'get_startup_radar', 'build_startup_plan',
];
export const MCP_VALUE_TOOLS = Object.freeze([
  'startup_preview', ...STARTUP_MEMBER_TOOLS, 'check_api_quota_fit', 'check_commercial_use',
]);
export const MCP_VALUE_OUTCOMES = Object.freeze(['usable', 'no_result', 'service_error']);

const MEMBER_DAY_RETENTION = 35;
const SECONDS_PER_DAY = 86400;
const initialization = new WeakMap();
const lastPruned = new WeakMap();
const dailySchema = `CREATE TABLE IF NOT EXISTS bpj_mcp_value_daily (
  day TEXT NOT NULL, tool TEXT NOT NULL, outcome TEXT NOT NULL, n INTEGER NOT NULL,
  PRIMARY KEY(day,tool,outcome)
) WITHOUT ROWID`;
const memberDaySchema = `CREATE TABLE IF NOT EXISTS bpj_mcp_value_startup_member_days (
  day TEXT NOT NULL, member_id TEXT NOT NULL,
  first_at INTEGER NOT NULL, PRIMARY KEY(day,member_id)
) WITHOUT ROWID`;

function initialize(db) {
  if (!initialization.has(db)) {
    const ready = db.batch([db.prepare(dailySchema), db.prepare(memberDaySchema)]).catch(error => {
      initialization.delete(db);
      throw error;
    });
    initialization.set(db, ready);
  }
  return initialization.get(db);
}

const utcDay = seconds => new Date(seconds * 1000).toISOString().slice(0,10);

export function isMcpValueProbe(request) {
  return /^bpj-ci-selfcheck(?:\/1\.0)?$/.test(request.headers.get('User-Agent') || '') &&
    new URL(request.url).searchParams.get('__probe') === '1';
}

// Inputs, response bodies, keys and client headers never enter this store.
// Only authenticated, usable startup execution can add a member-day.
export async function recordMcpValue(db, {tool, outcome, memberId, now = Math.floor(Date.now() / 1000)}) {
  if (!db || !MCP_VALUE_TOOLS.includes(tool) || !MCP_VALUE_OUTCOMES.includes(outcome)) return false;
  try {
    const day = utcDay(now);
    await initialize(db);
    const count = db.prepare(`INSERT INTO bpj_mcp_value_daily (day,tool,outcome,n) VALUES (?,?,?,1)
      ON CONFLICT(day,tool,outcome) DO UPDATE SET n=n+1`).bind(day,tool,outcome);
    const statements = [count];
    if (memberId && outcome === 'usable' && STARTUP_MEMBER_TOOLS.includes(tool)) {
      statements.push(db.prepare(`INSERT INTO bpj_mcp_value_startup_member_days (day,member_id,first_at) VALUES (?,?,?)
        ON CONFLICT(day,member_id) DO UPDATE SET first_at=excluded.first_at WHERE excluded.first_at<first_at`)
        .bind(day,memberId,now));
    }
    const prune = lastPruned.get(db) !== day;
    if (prune) {
      const cutoff = utcDay(now - (MEMBER_DAY_RETENTION - 1) * SECONDS_PER_DAY);
      statements.push(db.prepare('DELETE FROM bpj_mcp_value_startup_member_days WHERE day<?').bind(cutoff));
    }
    if (statements.length === 1) await count.run();
    else await db.batch(statements);
    if (prune) lastPruned.set(db,day);
    return true;
  } catch {
    return false;
  }
}
