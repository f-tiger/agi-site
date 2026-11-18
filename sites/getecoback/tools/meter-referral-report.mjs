import {appendFileSync} from 'node:fs';

const worksheetUrl = 'https://getecoback.com/api/meter-referral';
const guideUrl = 'https://thedollscout.com/api/smart-home-growth';
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const headers = {'user-agent':'fleet-report-probe', 'x-probe':'meter-referral-report'};

async function read(url) {
  const response = await fetch(url, {headers, redirect:'error', signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw Error(`Report ${url} returned HTTP ${response.status}`);
  const report = await response.json();
  if (report.ok !== true || !Array.isArray(report.daily) || !/^\d{4}-\d{2}-\d{2}$/.test(report.end_exclusive) ||
      report.end_exclusive <= yesterday)
    throw Error(`Incomplete UTC window from ${url}`);
  return report;
}

function completeRow(daily, fields) {
  const rows = daily.filter(row => row.date === yesterday);
  if (rows.length !== 1 || fields.some(key => !Number.isSafeInteger(rows[0][key]) || rows[0][key] < 0))
    throw Error(`Missing complete counts for ${yesterday}`);
  return rows[0];
}

const [source, destination] = await Promise.all([read(worksheetUrl), read(guideUrl)]);
if (source.feeder_path !== '/guide/luftbefeuchter-stromverbrauch.html' ||
    source.source_path !== '/strommess-protokoll.html' || destination.path !== '/de/shop/categories/smart-home')
  throw Error('Unexpected worksheet, feeder or shopping guide');

if (!/^\d{4}-\d{2}-\d{2}$/.test(source.first_full_link_day)) throw Error('Missing link measurement start date');
const covered = yesterday >= source.first_full_link_day;
const worksheetFields = ['humidifier_pageviews', 'source_pageviews'];
if (covered) worksheetFields.push('humidifier_arrivals','link_views','link_clicks');
const row = completeRow(source.daily, worksheetFields);
const actions = covered
  ? `${row.humidifier_arrivals} arrivals from the humidifier guide, ${row.link_views} link views, ${row.link_clicks} link clicks`
  : 'link and arrival measurement pending for this date';
let guide = 'Release day excluded';
if (yesterday !== destination.excluded_release_day) {
  const r = completeRow(destination.daily,['pageviews','eco_referred_pageviews','amazon_de_clicks']);
  guide = `${r.pageviews} guide views, ${r.eco_referred_pageviews} ECO-referred views, ${r.amazon_de_clicks} Amazon.de clicks across the guide`;
}
const summary = [
  `EcoBack · ${yesterday} UTC · ${row.humidifier_pageviews} humidifier guide views, ${row.source_pageviews} worksheet views, ${actions}. [Source report](${worksheetUrl})`,
  `TDS · ${yesterday} UTC · ${guide}. [Destination report](${guideUrl})`
].join('\n\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
console.log(summary);
