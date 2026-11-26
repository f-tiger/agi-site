import {digest,json} from '../../lib/ad-commerce.js';
import {memberReady} from '../../lib/membership.js';
import {readMcpValueReport} from '../../lib/mcp-value-report.mjs';

export async function onRequestGet({request,env}) {
  const secret = env.ADS_WATCH_SECRET;
  if (!env.HITS || !secret || secret.length < 32) return json({ok:false},503);
  const bearer = request.headers.get('Authorization') || '';
  if (!bearer.startsWith('Bearer ') || bearer.length > 520 || await digest(secret) !== await digest(bearer.slice(7))) {
    return json({ok:false},401);
  }
  try {
    const report = await readMcpValueReport(env.HITS);
    return json({ok:true, checkout_ready:await memberReady(env), ...report});
  } catch {
    return json({ok:false},503);
  }
}
