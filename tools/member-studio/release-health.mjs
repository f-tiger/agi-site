// Release verification only. This never changes payment or account state.
import {appendFileSync} from 'node:fs';

export function paymentState(status, data, site='bpj') {
  if(status!==200||!data||data.ok!==true||data.site!==site||typeof data.ready!=='boolean'||data.auto_renew!==false)return 'unavailable';
  return data.ready?'ready':'not_ready';
}

export function checkPaymentHealth(status, data, {site='bpj',requireReady=true,logger=console,summaryPath=process.env.GITHUB_STEP_SUMMARY}={}) {
  const state=paymentState(status,data,site);
  const message=state==='ready'
    ? `${site}: membership payment readiness is ready (read-only status; no payment tested).`
    : state==='not_ready'
      ? `${site}: membership payment readiness is NOT READY; checkout remains closed. Free-page release checks continue separately. Payment recovery and alerts remain in the existing BPJ ad payment watcher workflow.`
      : `${site}: membership API is unavailable or its response contract is invalid; payment readiness is unknown.`;
  logger.log(message);
  if(summaryPath)appendFileSync(summaryPath,message+'\n');
  if(state==='unavailable'||(state==='not_ready'&&requireReady))throw new Error(message);
  if(state==='not_ready')logger.warn('::warning::'+message);
  return state;
}
