import {writeFileSync} from 'node:fs';
import {seal} from './workers_usage.mjs';
import {validatePublicKey} from '../eco-reporting/report.mjs';
import {watchSecret} from '../../sites/baipiaoji/scripts/ad-runner-config.mjs';

const pem=Buffer.from(process.env.WORKERS_REPORT_PUBLIC_KEY,'base64').toString();
validatePublicKey(pem);
const r=await fetch('https://baipiaoji.com/api/vendor-stats',{
  headers:{authorization:'Bearer '+watchSecret(process.env)},redirect:'error',signal:AbortSignal.timeout(20000)
});
if(!r.ok)throw Error('BPJ vendor totals unavailable, HTTP '+r.status);
const report=await r.json();
if(!report.ok||!Array.isArray(report.events)||!Array.isArray(report.intake))throw Error('Incomplete BPJ totals');
writeFileSync('/tmp/bpj-vendors.enc.json',JSON.stringify(seal(report,pem)),{mode:0o600});
