import {MCP_CLIENT_SIGNALS, mcpClientSignal} from '../../../getecoback/src/mcp-client-signal.mjs';

const outcomes = ['completed', 'invalid_input', 'unavailable'];
const signalNames = new Set([...MCP_CLIENT_SIGNALS, 'operator', 'indexer', 'demo_or_probe']);
const outcomeEvent = outcome => `mcp_tool_${outcome}`;

export function mcpUsageSignal(request, url, clientInfo) {
  const headers = request.headers;
  const ua = headers.get('user-agent') || '';
  if (url.searchParams.has('__ci') || url.searchParams.get('ci') === '1' ||
      headers.get('dnt') === '1' || headers.get('sec-gpc') === '1' ||
      /agi-site-deploy-selfcheck|deploy-smoke-bot|deploy-selfcheck-bot|github-actions/i.test(ua)) return null;
  if (/indexer|crawler|collector|mcp-audit|sentineloracle|uptime|spider/i.test(ua)) return 'indexer';
  if (url.searchParams.get('demo') === '1' || /smoke|probe|test-fixture|headless/i.test(ua)) return 'demo_or_probe';
  const signal = mcpClientSignal(clientInfo, ua);
  if (signal !== 'unknown') return signal;
  if (/^(?:curl|wget|python|node|undici|postmanruntime)\b/i.test(ua)) return 'operator';
  return 'unknown';
}

export function recordMcpUsage(db, ctx, tool, outcome, signal) {
  if (!db || !signal || !ctx?.waitUntil) return;
  const now = Date.now();
  ctx.waitUntil(Promise.resolve().then(() => db.prepare(
    'INSERT INTO events (ts, day, name, location, label, path, ua_class) VALUES (?,?,?,?,?,?,?)'
  ).bind(now, new Date(now).toISOString().slice(0, 10), outcomeEvent(outcome),
    'mcp', `tool:${tool}`, '/mcp', signal).run()).catch(() => {}));
}

export async function mcpUsageResponse(db, toolNames, now = new Date()) {
  const generated = now.toISOString();
  const end = new Date(generated.slice(0, 10) + 'T00:00:00.000Z');
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 28);
  const window = {start:start.toISOString().slice(0, 10), end_exclusive:generated.slice(0, 10), days:28, timezone:'UTC'};
  const headers = {'x-robots-tag':'noindex', 'cache-control':'no-store'};
  try {
    const eventNames = outcomes.map(outcomeEvent);
    const {results} = await db.prepare(`SELECT day, name, label, ua_class, count(*) AS n
      FROM events WHERE name IN (?, ?, ?) AND location='mcp' AND day>=? AND day<?
      GROUP BY day, name, label, ua_class ORDER BY day, name, label, ua_class`
    ).bind(...eventNames, window.start, window.end_exclusive).all();
    const groups = results.flatMap(({day, name, label, ua_class, n}) => {
      const outcome = outcomes[eventNames.indexOf(name)];
      const tool = label?.startsWith('tool:') ? label.slice(5) : '';
      return outcome && toolNames.has(tool) && signalNames.has(ua_class)
        ? [{day, tool, outcome, caller_signal:ua_class, calls:n}] : [];
    });
    return Response.json({ok:true, generated, window, groups,
      first_observed_day:groups[0]?.day ?? null, authenticated_principals:null,
      limitations:'Recognized tool-call outcomes only. QA and privacy opt-outs are excluded. Operator, indexer and demo/probe rows are separate. Client names are self-declared or guessed from the user agent. An unknown caller remains unknown. Earlier raw logs are excluded. Missing rows cannot establish zero demand, unique users, retention or revenue.'}, {headers});
  } catch {
    return Response.json({ok:false, generated, window, groups:null, error:'Measurement unavailable'}, {status:503, headers});
  }
}
