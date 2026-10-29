import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function paymentState(status, data) {
 if(status!==200||!data||data.ok!==true||data.site!=='bpj'||typeof data.ready!=='boolean') return 'unavailable';
 return data.ready?'ready':'not_ready';
}
export async function verify(fetcher=fetch,{logger=console,summaryPath=process.env.GITHUB_STEP_SUMMARY}={}) {
 let state='unavailable';
 try { const r=await fetcher('https://baipiaoji.com/api/member?__ci=1',{headers:{'User-Agent':'bpj-ci-selfcheck'},signal:AbortSignal.timeout(25000),cache:'no-store'}); state=paymentState(r.status,await r.json()); } catch {}
 const message=state==='ready'?'Membership payment readiness: ready (read-only check; no payment tested).':state==='not_ready'?'Membership payment readiness: NOT READY. Free-page release completed separately; checkout remains closed. Public response does not identify the failed prerequisite.':'Membership payment readiness: UNAVAILABLE. Free-page release completed separately; no readiness claim.';
 logger.log(message);
 if(summaryPath)appendFileSync(summaryPath,message+'\n');
 if(state!=='ready'){logger.error('::error::'+message);return 1;}return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await verify();
