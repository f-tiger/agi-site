import {pathToFileURL} from 'node:url';
import {checkPaymentHealth} from '../../../tools/member-studio/release-health.mjs';
export {paymentState} from '../../../tools/member-studio/release-health.mjs';
export async function verify(fetcher=fetch,{logger=console,summaryPath=process.env.GITHUB_STEP_SUMMARY,requireReady=true}={}) {
 let status=0,data;
 try { const r=await fetcher('https://baipiaoji.com/api/member?__ci=1',{method:'GET',redirect:'error',headers:{'User-Agent':'bpj-ci-selfcheck'},signal:AbortSignal.timeout(25000),cache:'no-store'});status=r.status;data=await r.json(); } catch {}
 try {checkPaymentHealth(status,data,{site:'bpj',requireReady,logger,summaryPath});return 0;}
 catch(error){logger.error('::error::'+error.message);return 1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await verify(fetch,{requireReady:!process.argv.includes('--release-health')});
