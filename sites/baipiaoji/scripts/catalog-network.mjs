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
export async function requestURL(value,{json=false,body=false,token='',retries=2,resolve=lookup}={}) {
  async function once(value,redirects=0) {
    const u=safeURL(value),host=u.hostname.replace(/^\[|\]$/g,'');
    const addresses=isIP(host)?[{address:host,family:isIP(host)}]:await Promise.race([resolve(host,{all:true}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('dns-timeout')),5000);t.unref();})]);
    if(!addresses.length||addresses.some(a=>!publicIP(a.address)))throw new Error('unsafe-dns');
    const headers={'user-agent':'baipiaoji-catalog/1.0 (+https://baipiaoji.com/github-tools/)','accept':json?'application/json':'text/html,application/json;q=0.9,*/*;q=0.5'};
    if(u.hostname==='api.github.com'&&token)headers.authorization='Bearer '+token;
    const result=await new Promise((resolve,reject)=>{
      const req=https.get(u,{headers,lookup:(_h,options,cb)=>options.all?cb(null,addresses):cb(null,addresses[0].address,addresses[0].family)},res=>{
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
    try{const r=await once(value);if(![429,500,502,503,504].includes(r.status)||attempt===retries)return r;}
    catch(e){if(attempt===retries||/unsafe/.test(e.message))throw e;}
    await new Promise(r=>setTimeout(r,500*(attempt+1)));
  }
}
