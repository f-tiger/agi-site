import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const response = await fetch('https://thedollscout.com/api/document-stats', { headers:{ 'User-Agent':'tds-document-probe/1.0', 'x-probe':'1' }, signal:AbortSignal.timeout(20000) });
if (!response.ok) throw new Error('Document metrics HTTP ' + response.status);
const data = await response.json();
if (data.ok !== true || data.since !== '2026-09-25' || !data.events || !data.excluded) throw new Error('Document measurement contract missing');
fs.writeFileSync(path.join(root, 'content/document-metrics.json'), JSON.stringify(data, null, 2) + '\n');
const count = (key) => Number.isFinite(data[key]) ? data[key] : 'unavailable';
const report = 'Document Scout / anonymous actions (rolling window: up to ' + count('days') + ' days including current day; no earlier than ' + data.since + ')\n'
  + 'Generated: ' + (data.generated || 'unavailable') + '\n'
  + 'Legacy tool_views (includes homepage views): ' + count('tool_views') + '\n'
  + 'Homepage views: ' + count('homepage_views') + ' · Dedicated tool-page views: ' + count('dedicated_tool_views') + '\n'
  + 'Action counts (not unique users or qualified collector visits): ' + JSON.stringify(data.events) + '\n'
  + 'Video loads are not completed watches; collector views use a separate event stream.\n'
  + 'Excluded CI and sample actions: ' + JSON.stringify(data.excluded) + '\n'
  + (data.unit ? 'Measurement limits: ' + data.unit + '\n' : '')
  + (data.attribution_scope ? 'Attribution limits: ' + data.attribution_scope + '\n' : '');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
