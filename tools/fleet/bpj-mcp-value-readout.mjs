import {writeFileSync} from 'node:fs';
import {seal} from './workers_usage.mjs';
import {validatePublicKey} from '../eco-reporting/report.mjs';
import {watchSecret} from '../../sites/baipiaoji/scripts/ad-runner-config.mjs';

const pem = Buffer.from(process.env.WORKERS_REPORT_PUBLIC_KEY || '', 'base64').toString();
validatePublicKey(pem);
const response = await fetch('https://baipiaoji.com/api/mcp-value-report', {
  headers: {authorization: 'Bearer ' + watchSecret(process.env)},
  redirect: 'error', signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw Error('BPJ MCP value report unavailable, HTTP ' + response.status);
const report = await response.json();
if (!report.ok || typeof report.checkout_ready !== 'boolean' || report.window?.timezone !== 'UTC') {
  throw Error('Incomplete BPJ MCP value report');
}
writeFileSync('/tmp/bpj-mcp-value.enc.json', JSON.stringify(seal(report,pem)), {mode:0o600});
