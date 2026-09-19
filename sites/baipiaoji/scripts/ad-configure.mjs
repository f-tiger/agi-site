import {configure} from './ad-runner-config.mjs';
try{
 const result=await configure(process.env);
 console.log(JSON.stringify(result));
 if(!result.configured&&!process.argv.includes('--optional'))process.exitCode=1;
}catch{console.error('Payment setup failed: verify ADS_WALLET matches the approved recipient, ADS_WATCH_SECRET (if supplied) is valid, and the Cloudflare token has Pages edit access. No configuration values were logged.');process.exitCode=1;}
