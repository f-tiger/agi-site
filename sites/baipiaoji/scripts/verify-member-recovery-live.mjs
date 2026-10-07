// No account creation, login, session grants, retention or lifecycle mutations.
import assert from 'node:assert/strict';
const base='https://baipiaoji.com',headers={'User-Agent':'bpj-ci-selftest member-receipts-recovery'};
async function get(path){const r=await fetch(base+path,{headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,path);return r;}
const expected=(process.env.GOOGLE_CLIENT_ID||'').trim();assert.ok(expected,'Existing public Google client binding is required');
const google=await (await get('/api/account-google?__ci=1')).json();assert.equal(google.available,true);assert.equal(google.client_id,expected,'Existing Google client must be unchanged');
const account=await (await get('/api/account?readiness=1&__ci=1')).json();assert.equal(account.ok,true);assert.equal(account.ready,true);assert.equal(account.user,null);
console.log('PASS existing public Google client and anonymous SELECT-only account readiness');
if(!process.argv.includes('--account-only')){
 for(const path of ['/members','/en/members','/account','/en/account']){const r=await get(path+'?__ci=1'),body=await r.text();assert.match(body,/<html\b/i);}
 const r=await fetch(base+'/api/bpj-member-recovery?__ci=1',{method:'POST',headers,signal:AbortSignal.timeout(25000)});assert.equal(r.status,401,'Recovery must require the existing operator credential');
 console.log('PASS membership/account pages and anonymous recovery refusal; lifecycle mutation tests intentionally not run');
}
