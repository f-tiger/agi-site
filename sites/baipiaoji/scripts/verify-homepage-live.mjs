import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const origin='https://baipiaoji.com';
async function checkOnce(fetchImpl){
const get=async path=>{const r=await fetchImpl(origin+path,{headers:{'User-Agent':'bpj-ci-home-verify'},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r;};
const reach=await (await get('/api/reach?days=28')).json(),home=reach.homepage_signals;
assert(home?.ok,'homepage detail available');assert.equal(home.window.date_basis,'UTC');
assert.equal(home.daily.reduce((n,r)=>n+r.clicks,0),home.clicks);
assert.equal(home.entries.reduce((n,r)=>n+r.n,0),home.clicks);
assert.equal(home.daily_entries.reduce((n,r)=>n+r.n,0),home.clicks);
assert.equal(home.daily.at(-1).complete,false);
assert(home.entries.every(r=>!('path' in r)&&!('country' in r)&&!('ref' in r)));
for(const prefix of ['','/en']){const html=await(await get(prefix+'/?__ci=1')).text();assert(html.includes('data-home-block="hero"'));assert(html.includes("sec.classList.contains('bpj-site-header')"));assert(html.includes('!navigator.webdriver'));}
}

// Pages can serve the previous deployment briefly after Wrangler reports success.
// Every attempt runs the same checks; persistent failures still fail the release.
export async function verifyHomepageLive({fetchImpl=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=5,delayMs=10000,onRetry=console.warn}={}){
assert(Number.isInteger(attempts)&&attempts>0,'positive retry limit');
for(let attempt=1;attempt<=attempts;attempt++){
  try{await checkOnce(fetchImpl);return;}
  catch(error){
    if(attempt===attempts)throw error;
    onRetry(`Homepage live check ${attempt}/${attempts} failed (${error.message}); retrying in ${delayMs} ms.`);
    await wait(delayMs);
  }
}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
await verifyHomepageLive();
console.log('PASS live homepage labels, daily/bilingual aggregate sums and privacy shape; read-only check, no production click events.');
}
