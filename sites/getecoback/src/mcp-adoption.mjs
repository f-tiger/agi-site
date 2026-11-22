// Keep the original full-week population intact, including legacy unclassified
// rows. The fixed profile marker is added by the compact execution handler.
export const COMPLETE_MCP_WEEK_SQL = `WITH calls AS (
  SELECT day, ua_class, CASE WHEN json_valid(meta) THEN meta ELSE '{}' END AS valid_meta
  FROM ev WHERE name='mcp_call' AND page='/mcp'
    AND day >= date('now','-7 day') AND day < date('now')
    AND (ua_class IS NULL OR ua_class != 'ci')
), profiles AS (
  SELECT day, ua_class, valid_meta,
    ua_class IS NOT NULL AND json_type(valid_meta,'$.tool') = 'text'
      AND json_extract(valid_meta,'$.tool') != ''
      AND json_extract(valid_meta,'$.mcp_profile') = 'compact' AS compact
  FROM calls
)
SELECT date('now','-7 day') AS start, date('now') AS end_exclusive,
  COUNT(*) AS completed_calls,
  COUNT(DISTINCT json_extract(valid_meta,'$.tool')) AS tools_called,
  COUNT(CASE WHEN ua_class='human' THEN 1 END) AS browser_class_calls,
  MIN(CASE WHEN compact THEN day END) AS compact_first_day,
  COUNT(CASE WHEN compact THEN 1 END) AS compact_calls,
  COUNT(CASE WHEN compact AND json_type(valid_meta,'$.mcp_cellar_link') = 'integer'
    AND json_extract(valid_meta,'$.mcp_cellar_link') = 1 THEN 1 END) AS compact_cellar_links
FROM profiles`;

export function completedMcpReports(row) {
  if (!row) return {completeWeek:null, compactCompleteWeek:null};
  const {start, end_exclusive, completed_calls, tools_called, browser_class_calls} = row;
  const completeWeek = {start, end_exclusive, completed_calls, tools_called, browser_class_calls};
  // Without any marked execution, old rows cannot establish profile coverage.
  const compactCompleteWeek = row.compact_first_day ? {
    start, end_exclusive, first_recorded_day:row.compact_first_day,
    completed_calls:row.compact_calls, cellar_links_offered:row.compact_cellar_links,
  } : null;
  return {completeWeek, compactCompleteWeek};
}
