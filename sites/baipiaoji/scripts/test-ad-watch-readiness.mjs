// Regression: first-deploy propagation must not silently skip payment readiness.
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const target=new URL('./ad-watch-v2.mjs',import.meta.url).href;
function run(required,states){
 const code=`
 let states=${JSON.stringify(states)}, calls=0;
 globalThis.setTimeout=fn=>{fn();return 0;};
 globalThis.fetch=async(url,options)=>{
  if(url.endsWith('/api/ad-web3-watch')){console.log('WATCH_EXECUTED');return {ok:true,json:async()=>({ok:true,processed:0})};}
  const configured=states[Math.min(calls++,states.length-1)];
  return {ok:true,json:async()=>({ok:true,web3:{configured,enabled:true,watch_healthy:configured},selling:configured,rails:{wallet:configured}})};
 };
 process.argv.push('--if-configured');
 await import(${JSON.stringify(target)});
 `;
 return spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,ADS_WATCH_SECRET:'fixture-watch-secret-32-characters-long',REQUIRE_WEB3_CONFIGURED:String(required)}});
}
const delayed=run(true,[false,false,true]);
assert.equal(delayed.status,0,delayed.stderr);assert.match(delayed.stdout,/WATCH_EXECUTED/);assert.match(delayed.stdout,/"selling":true/);
const absent=run(true,[false]);assert.notEqual(absent.status,0);assert.match(absent.stderr,/did not become ready/);assert.doesNotMatch(absent.stdout,/WATCH_EXECUTED/);
const unconfigured=run(false,[false]);assert.equal(unconfigured.status,0,unconfigured.stderr);assert.match(unconfigured.stdout,/"skipped":true/);
console.log('PASS: delayed propagation triggers watch; required missing configuration fails; unconfigured scheduled run skips');
