import {appendFileSync} from 'node:fs';
import {configure} from './ad-runner-config.mjs';
try{
 const result=await configure(process.env);
 console.log(JSON.stringify(result));
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`configured=${result.configured}\n`);
 if(!result.configured&&!process.argv.includes('--optional'))process.exitCode=1;
}catch(e){
 // Messages thrown by configure() itself are fixed text in ad-runner-config.mjs (no response body, secret or wallet).
 // A fetch-level error can quote a request header, and the Authorization header holds the Cloudflare token, so
 // bearer values, wallet-shaped strings and any long token-like run are masked before printing. The point is only
 // that a red run says which check failed.
 const why=String(e&&e.message||e).replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/Bearer[^"'`]*/gi,'Bearer …').replace(/0x[0-9a-fA-F]{40}/g,'0x…').replace(/[A-Za-z0-9_\-]{32,}/g,'…').slice(0,160);
 console.error('Payment setup failed ('+why+'): verify ADS_WALLET matches the approved recipient, ADS_WATCH_SECRET (if supplied) is valid, and the Cloudflare token has Pages edit access. No configuration values were logged.');process.exitCode=1;}
