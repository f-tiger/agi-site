import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export function state(data) {
  assert.equal(data.ok,true,'Membership API must remain healthy');
  assert.equal(data.site,'eco');
  assert.equal(typeof data.ready,'boolean','Membership readiness must be explicit');
  return {site:'eco',ready:data.ready};
}
export function compare(before, after) {
  assert.equal(before.site,'eco');
  assert.equal(typeof before.ready,'boolean');
  assert.equal(after.site,'eco');
  assert.equal(typeof after.ready,'boolean');
  assert(!(before.ready && !after.ready),'Membership became unavailable during the release');
  return after.ready ? 'ready' : 'previously-unavailable';
}
async function main() {
  const [mode,file]=process.argv.slice(2);
  assert(['snapshot','verify'].includes(mode)&&file,'Use snapshot|verify <baseline-file>');
  const response=await fetch('https://getecoback.com/api/member',{
    headers:{'User-Agent':'fleet-outcome-readonly-probe/1.0'},signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200);
  // Persist only public booleans, never payment configuration or user records.
  const current=state(await response.json());
  if(mode==='snapshot') {
    fs.writeFileSync(file,JSON.stringify(current)+'\n');
    console.log('ECO existing membership readiness recorded:',current.ready);
  } else {
    const outcome=compare(JSON.parse(fs.readFileSync(file,'utf8')),current);
    console.log(outcome==='ready' ? 'Existing ECO membership remains ready.' :
      '::warning::ECO membership was unavailable before this content release and remains unavailable. No membership sale is claimed; configuration and order scans were not changed.');
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();
