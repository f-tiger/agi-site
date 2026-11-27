import {N90_TOOL_NAME} from './n90-entry.mjs';
import {MCP_CLIENT_SIGNALS} from './mcp-client-signal.mjs';

const CLIENT_COLUMNS = MCP_CLIENT_SIGNALS.map((signal, index) =>
  `COUNT(CASE WHEN client_signal='${signal}' THEN 1 END) AS client_${index}`).join(',\n  ');

// Keep the original full-week population intact, including legacy unclassified
// rows. The fixed profile marker is added by the compact execution handler.
export const COMPLETE_MCP_WEEK_SQL = `WITH calls AS (
  SELECT day, ua_class, CASE WHEN json_valid(meta) THEN meta ELSE '{}' END AS valid_meta
  FROM ev WHERE name='mcp_call' AND page='/mcp'
    AND day >= date('now','-7 day') AND day < date('now')
    AND (ua_class IS NULL OR ua_class != 'ci')
), profiles AS (
  SELECT day, ua_class, valid_meta, json_extract(valid_meta,'$.mcp_client_signal') AS client_signal,
    ua_class IS NOT NULL AND json_type(valid_meta,'$.tool') = 'text'
      AND json_extract(valid_meta,'$.tool') != ''
      AND json_extract(valid_meta,'$.mcp_profile') = 'compact' AS compact
  FROM calls
), offers AS (
  SELECT *, compact AND json_extract(valid_meta,'$.tool')='${N90_TOOL_NAME}'
    AND json_type(valid_meta,'$.mcp_n90_link')='integer'
    AND json_extract(valid_meta,'$.mcp_n90_link')=1 AS n90_link
  FROM profiles
)
SELECT date('now','-7 day') AS start, date('now') AS end_exclusive,
  COUNT(*) AS completed_calls,
  COUNT(DISTINCT json_extract(valid_meta,'$.tool')) AS tools_called,
  COUNT(CASE WHEN ua_class='human' THEN 1 END) AS browser_class_calls,
  MIN(CASE WHEN compact THEN day END) AS compact_first_day,
  COUNT(CASE WHEN compact THEN 1 END) AS compact_calls,
  COUNT(CASE WHEN compact AND json_type(valid_meta,'$.mcp_cellar_link') = 'integer'
    AND json_extract(valid_meta,'$.mcp_cellar_link') = 1 THEN 1 END) AS compact_cellar_links,
  MIN(CASE WHEN n90_link THEN day END) AS n90_first_day,
  COUNT(CASE WHEN n90_link THEN 1 END) AS n90_links_offered,
  MIN(CASE WHEN client_signal IN ('${MCP_CLIENT_SIGNALS.join("','")}') THEN day END) AS client_first_day,
  ${CLIENT_COLUMNS}
FROM offers`;

export function completedMcpReports(row) {
  if (!row) return {completeWeek:null, compactCompleteWeek:null, n90CompactCompleteWeek:null, clientCompleteWeek:null};
  const {start, end_exclusive, completed_calls, tools_called, browser_class_calls} = row;
  const completeWeek = {start, end_exclusive, completed_calls, tools_called, browser_class_calls};
  // Without any marked execution, old rows cannot establish profile coverage.
  const compactCompleteWeek = row.compact_first_day ? {
    start, end_exclusive, first_recorded_day:row.compact_first_day,
    completed_calls:row.compact_calls, cellar_links_offered:row.compact_cellar_links,
  } : null;
  const n90CompactCompleteWeek = row.n90_first_day ? {
    start, end_exclusive, first_recorded_day:row.n90_first_day,
    n90_links_offered:row.n90_links_offered,
  } : null;
  let clientCompleteWeek = null;
  if (row.client_first_day) {
    const by_signal = {client_info:{}, user_agent:{}};
    let measured_calls = 0;
    const unknown_calls = row.client_0;
    for (const [index, signal] of MCP_CLIENT_SIGNALS.entries()) {
      const count = row[`client_${index}`];
      measured_calls += count;
      if (signal === 'unknown' || count === 0) continue;
      const [evidence, family] = signal.split(':');
      by_signal[evidence][family] = count;
    }
    clientCompleteWeek = {
      start, end_exclusive, first_recorded_day:row.client_first_day,
      measured_calls, unmeasured_calls:completed_calls-measured_calls, unknown_calls, by_signal,
    };
  }
  return {completeWeek, compactCompleteWeek, n90CompactCompleteWeek, clientCompleteWeek};
}
