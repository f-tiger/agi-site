// Read-only collision check; never prints credentials or unrelated DNS records.
const host='localebatch.agiscorecard.com', service='agi-localebatch-pilot';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,secret=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!secret)throw Error('Existing Cloudflare deployment credentials are unavailable.');
async function api(path){const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok||!d.success)throw Error('Cloudflare read-only preflight failed: HTTP '+r.status);return d.result;}
const domains=await api(`accounts/${account}/workers/domains`);
const match=domains.find(d=>d.hostname===host);
if(match&&match.service!==service)throw Error('Requested hostname already belongs to another Worker; assignment stopped.');
if(match){console.log('Hostname is already assigned to this Worker.');}
else{
 const zones=await api('zones?name=agiscorecard.com');
 if(zones.length!==1)throw Error('Expected owner zone was not resolved.');
 const records=await api(`zones/${zones[0].id}/dns_records?name=${host}`);
 if(records.length)throw Error('Requested hostname already has DNS records; assignment stopped.');
 console.log('Requested hostname has no conflicting Worker or DNS record.');
}
