// GitHub Actions receives a classification only. All hourly counts stay in memory.
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const HOUR = 3600000;
const API = 'https://api.cloudflare.com/client/v4/';
const HOST = 'baipiaoji.com';
const QUERY = `query($z:string,$s:Time,$e:Time){
  viewer { zones(filter:{zoneTag:$z}) {
    httpRequestsAdaptiveGroups(limit:100,filter:{
      datetime_geq:$s,datetime_lt:$e,requestSource:"eyeball",
      clientRequestHTTPHost:"baipiaoji.com",clientRequestPath:"/manju/",
      clientRequestHTTPMethodName:"GET",edgeResponseStatus:200
    }) { count dimensions { datetimeHour verifiedBotCategory } }
  }}
}`;

// Allow 15 minutes for adaptive analytics to settle. A two-hour query remains
// below the one-day GraphQL range even when it crosses midnight.
export function windows(now = new Date()) {
  const end = Math.floor((now.getTime() - 15 * 60000) / HOUR) * HOUR;
  return [0, 1, 2, 3].map(daysAgo => {
    const stop = end - daysAgo * 24 * HOUR;
    return {start: new Date(stop - 2 * HOUR).toISOString(), end: new Date(stop).toISOString()};
  });
}

export function readHours(rows, {start}) {
  if (!Array.isArray(rows) || rows.length >= 100) throw Error('Incomplete edge report');
  const counts = [0, 0];
  const seen = new Set();
  for (const row of rows) {
    const {datetimeHour, verifiedBotCategory} = row.dimensions || {};
    const hour = (Date.parse(datetimeHour) - Date.parse(start)) / HOUR;
    if (![0, 1].includes(hour) || typeof verifiedBotCategory !== 'string' ||
        !Number.isSafeInteger(row.count) || row.count < 0) throw Error('Invalid edge report');
    const key = hour + '/' + verifiedBotCategory;
    if (seen.has(key)) throw Error('Duplicate hourly group');
    seen.add(key);
    // An empty category means Cloudflare did not verify this request as a bot.
    if (verifiedBotCategory === '') counts[hour] += row.count;
  }
  return counts;
}

export function classify([current, ...prior]) {
  if (prior.length !== 3 || ![current, ...prior].every(pair =>
    Array.isArray(pair) && pair.length === 2 && pair.every(n => Number.isSafeInteger(n) && n >= 0)
  )) throw Error('Missing hourly baseline');
  const elevated = current.map((n, i) => {
    const median = prior.map(pair => pair[i]).sort((a, b) => a - b)[1];
    return n >= 500 && n >= 4 * median;
  });
  if (elevated.every(Boolean)) return 'sustained_surge';
  if (elevated.some(Boolean)) return 'single_hour_spike';
  return 'within_threshold';
}

async function call(token, path, body) {
  const response = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: {authorization: 'Bearer ' + token, ...(body ? {'content-type':'application/json'} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
    redirect: 'error', signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw Error('Cloudflare unavailable');
  const result = await response.json();
  if (result.success === false || result.errors?.length) throw Error('Edge query unavailable');
  return result;
}

export async function inspect(env, now = new Date(), request = call) {
  const tokens = new Set([env.CLOUDFLARE_API_TOKEN_ZONE, env.CLOUDFLARE_API_TOKEN, env.CF_API_TOKEN].filter(Boolean));
  const periods = windows(now);
  for (const token of tokens) {
    try {
      const {result} = await request(token, 'zones?name='+HOST+'&per_page=5');
      const zone = result.find(z => z.name === HOST);
      if (!zone?.id) continue;
      const samples = [];
      for (const period of periods) {
        const raw = await request(token, 'graphql', {query: QUERY, variables:{z: zone.id, s: period.start, e: period.end}});
        const zones = raw.data?.viewer?.zones;
        if (!Array.isArray(zones) || zones.length !== 1) throw Error('Missing edge zone');
        samples.push(readHours(zones[0].httpRequestsAdaptiveGroups, period));
      }
      return classify(samples);
    } catch {
      // The other configured credentials may have the required read scope.
    }
  }
  throw Error('Edge telemetry unavailable');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = message => {
    console.log(message);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, message+'\n');
  };
  try {
    const result = await inspect(process.env);
    if (result === 'sustained_surge') {
      console.log('::warning title=BPJ Manju homepage::Sustained increase in requests without a verified-bot category.');
      summary('Sustained surge. Review the encrypted BPJ diagnosis before changing traffic rules.');
    } else if (result === 'single_hour_spike') {
      summary('One elevated hour. The sustained-surge threshold was not met.');
    } else {
      summary('Within the monitoring threshold.');
    }
  } catch {
    summary('Measurement unavailable. No traffic classification was made.');
    process.exitCode = 1;
  }
}
