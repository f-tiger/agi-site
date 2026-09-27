import {appendFileSync} from 'node:fs';
import {configure} from './ad-runner-config.mjs';
try{
 const result=await configure(process.env);
 console.log(JSON.stringify(result));
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`configured=${result.configured}\n`);
 if(!result.configured&&!process.argv.includes('--optional'))process.exitCode=1;
}catch(e){
 // Every message thrown by configure() is written in ad-runner-config.mjs and carries no value from a response,
 // a secret or the wallet; fetch-level errors (timeout, network) carry none either. Print it so a red run says which check failed.
 const why=String(e&&e.message||e).replace(/0x[0-9a-fA-F]{40}/g,'0x…').slice(0,160);
 console.error('Payment setup failed ('+why+'): verify ADS_WALLET matches the approved recipient, ADS_WATCH_SECRET (if supplied) is valid, and the Cloudflare token has Pages edit access. No configuration values were logged.');process.exitCode=1;}
