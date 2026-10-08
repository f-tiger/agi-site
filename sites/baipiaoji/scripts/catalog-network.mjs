import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export function publicIP(ip) {
  const s=String(ip).toLowerCase().replace(/^\[|\]$/g,'');
  if(isIP(s)===4){const [a,b]=s.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&[0,168].includes(b)||a===100&&b>=64&&b<=127||a===198&&[18,19].includes(b));}
  // Only global-unicast IPv6; mapped IPv4 and translation ranges are excluded.
  return isIP(s)===6&&/^[23][0-9a-f]{0,3}:/.test(s)&&!s.startsWith('2001:db8:')&&!s.startsWith('2002:')&&!/^2001:0{0,4}:/.test(s);
}
export function safeURL(value) {
  const u=new URL(value),host=u.hostname.replace(/^\[|\]$/g,'');
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||!host.includes('.')&&!isIP(host)||isIP(host)&&!publicIP(host))throw new Error('unsafe-url');
  return u;
}
const RETRYABLE_CODES=new Set(['ENETUNREACH','EHOSTUNREACH','ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN']);
function retryableError(error) {
  if(error instanceof AggregateError)return error.errors.length>0&&error.errors.every(retryableError);
  return RETRYABLE_CODES.has(error.code)||['dns-timeout','request-timeout'].includes(error.message);
}
// Match dns.lookup's asynchronous contract. A synchronous callback can destroy
// a TLS socket before https has attached its error listener (Node #28664).
export function pinnedLookup(addresses) {
  const ordered=[...addresses].sort((a,b)=>a.family-b.family);
  return (_host,options,callback)=>process.nextTick(()=>{
    const family=typeof options==='number'?options:options.family;
    const matches=family?ordered.filter(a=>a.family===family):ordered;
    if(!matches.length){callback(Object.assign(new Error('address-family-unavailable'),{code:'ENOTFOUND'}));return;}
    if(options.all)callback(null,matches);
    else callback(null,matches[0].address,matches[0].family);
  });
}
export async function requestURL(value,{json=false,body=false,token='',retries=2,resolve=lookup}={}) {
  async function once(value,redirects=0) {
    const u=safeURL(value),host=u.hostname.replace(/^\[|\]$/g,'');
    let dnsTimer,addresses;
    try{addresses=isIP(host)?[{address:host,family:isIP(host)}]:await Promise.race([resolve(host,{all:true}),new Promise((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error('dns-timeout')),5000);})]);}
    finally{clearTimeout(dnsTimer);}
    if(!addresses.length||addresses.some(a=>!publicIP(a.address)))throw new Error('unsafe-dns');
    const headers={'user-agent':'baipiaoji-catalog/1.0 (+https://baipiaoji.com/github-tools/)','accept':json?'application/json':'text/html,application/json;q=0.9,*/*;q=0.5'};
    if(u.hostname==='api.github.com'&&token)headers.authorization='Bearer '+token;
    const result=await new Promise((resolve,reject)=>{
      const req=https.get(u,{headers,autoSelectFamily:true,autoSelectFamilyAttemptTimeout:250,lookup:pinnedLookup(addresses)},res=>{
        const status=res.statusCode,location=res.headers.location;
        if(!json&&!body||status<200||status>=300){res.destroy();resolve({status,body:'',location});return;}
        const chunks=[];let size=0;
        res.on('data',chunk=>{size+=chunk.length;if(size>2_000_000){req.destroy(new Error('body-limit'));return;}chunks.push(chunk);});
        res.on('error',reject);res.on('end',()=>resolve({status,body:Buffer.concat(chunks).toString('utf8'),location}));
      });
      const timer=setTimeout(()=>req.destroy(new Error('request-timeout')),12000);
      req.on('close',()=>clearTimeout(timer));req.on('error',reject);
    });
    if([301,302,303,307,308].includes(result.status)&&result.location){if(redirects>=4)throw new Error('redirect-limit');return once(new URL(result.location,u).href,redirects+1);}
    return {...result,url:u.href,...(json&&result.status>=200&&result.status<300?{data:JSON.parse(result.body)}:{})};
  }
  for(let attempt=0;attempt<=retries;attempt++){
    // Respect rate limits and access denials; do not retry them via another family.
    try{const r=await once(value);if(![500,502,503,504].includes(r.status)||attempt===retries)return r;}
    catch(e){if(attempt===retries||!retryableError(e))throw e;}
    await new Promise(r=>setTimeout(r,500*(attempt+1)));
  }
}

