import assert from 'node:assert/strict';
const base=process.argv[2];if(!base?.startsWith('https://'))throw Error('Explicit HTTPS target required.');
async function get(path){let last;for(let i=0;i<6;i++){try{const r=await fetch(base+path,{headers:{'User-Agent':'LocaleBatch-release-check/1.0'},signal:AbortSignal.timeout(15000)});if(r.ok)return r;last='HTTP '+r.status;}catch(e){last=e.message;}await new Promise(r=>setTimeout(r,5000));}throw Error(path+': '+last);}
for(const path of ['/','/guide','/privacy','/styles.css','/app.mjs','/core.mjs','/robots.txt','/sitemap.xml']){const r=await get(path);assert.ok((await r.text()).length>20);console.log('OK '+path);}
const config=await (await get('/api/config')).json();assert.equal(config.available,false);assert.equal(config.price,19);console.log('OK paid service remains closed');
const unavailable=await fetch(base+'/api/jobs',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(unavailable.status,503);console.log('OK no payment or catalog upload accepted');
const absent=await fetch(base+'/__missing_release_check');assert.equal(absent.status,404);console.log('OK missing pages return 404');
