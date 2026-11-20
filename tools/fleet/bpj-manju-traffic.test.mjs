import assert from 'node:assert/strict';
import test from 'node:test';
import {classify, inspect, readHours, windows} from './bpj-manju-traffic.mjs';

const now = new Date('2026-11-20T01:23:00Z');
const [period] = windows(now);
const row = (datetimeHour, verifiedBotCategory, count) =>
  ({dimensions:{datetimeHour, verifiedBotCategory}, count});

test('UTC windows use complete hours and the same two hours on prior dates', () => {
  const ranges = windows(now);
  assert.equal(ranges.length, 4);
  assert.equal(ranges[0].start, '2026-11-19T23:00:00.000Z');
  assert.equal(ranges[0].end, '2026-11-20T01:00:00.000Z');
  assert.equal(ranges[3].start, '2026-11-16T23:00:00.000Z');
  assert.equal(windows(new Date('2026-11-20T01:05:00Z'))[0].end, '2026-11-20T00:00:00.000Z');
});

test('verified categories excluded, absent groups zero, unavailable rows and truncated data rejected', () => {
  assert.deepEqual(readHours([row(period.start, 'Search Engine Crawler', 999),row(period.start,'',7)],period),[7,0]);
  assert.deepEqual(readHours([], period), [0,0]);
  for (const invalid of [undefined, Array(100), [row(period.end,'',4)], [row(period.start, null, 500)],
     [row(period.start, '', -1)], [row(period.start, '', 2),row(period.start, '', 2)]]) {
    assert.throws(() => readHours(invalid, period));
  }
});

test('requires two elevated hours, a count floor, and fourfold uplift vs same-hour median', () => {
  const prior = [[100,500],[200,300],[100,100]];
  assert.equal(classify([[499,1199],...prior]), 'within_threshold');
  assert.equal(classify([[500,1199],...prior]), 'single_hour_spike');
  assert.equal(classify([[500,1200],...prior]), 'sustained_surge');
  assert.equal(classify([[10000,10000],[9000,9000],[8000,8000],[0,0]]), 'within_threshold');
  assert.throws(() => classify([[500,1000]]));
});

test('only exact-path read aggregates with known dimensions; token fallback, safe output, failure stays unknown', async () => {
  const env={CLOUDFLARE_API_TOKEN_ZONE:'denied',CLOUDFLARE_API_TOKEN:'reader'};
  const result=await inspect(env,now,async(token,path,body)=>{
    if(token==='denied')throw Error('credential rejected');
    if(path==='zones?name=baipiaoji.com&per_page=5')return {result:[{name:'baipiaoji.com',id:'zone'}]};
    assert.equal(path,'graphql');
    assert.match(body.query,/clientRequestPath:"\/manju\/"/);
    assert.match(body.query,/clientRequestHTTPHost:"baipiaoji\.com"/);
    assert.doesNotMatch(body.query,/clientIP|userAgent|Referer|Query|mutation|clientRequestPath_like/);
    assert.equal(body.variables.z,'zone');
    return {data:{viewer:{zones:[{httpRequestsAdaptiveGroups:[row(body.variables.s,'',7)]}]}}};
  });
  assert.equal(result,'within_threshold');
  await assert.rejects(inspect(env,now,async()=>({errors:[{message:'private'}]})),/Edge telemetry unavailable/);
});
