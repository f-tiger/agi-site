// BPJ-only recovery: verify existing receipts, without retention or CE work.
import {seconds} from '../lib/ad-commerce.js';
import {ensureMembers,memberSite,memberReady,checkOrder} from '../lib/membership.js';
import {web3Settings,probeChain,chainRpc} from '../lib/ad-web3.js';
import {failureReason} from '../../../tools/member-studio/failure.mjs';

export async function recoverMemberReceipts(env){
 let stage='configuration';
 try{
  const cfg=web3Settings(env);
  if(memberSite(env)!=='bpj'||env.MEMBERS_ENABLED!=='true'||!cfg.enabled||!cfg.configured||cfg.chain!=='bsc'||cfg.network.live!==1||cfg.baseUnits<=9010000)throw Error('not_configured');
  stage='schema';await ensureMembers(env.HITS,'bpj');
  stage='chain_probe';const height=await probeChain(env,cfg);
  // A fresh chain head alone does not prove the provider supports log scans.
  stage='log_probe';
  const logs=await chainRpc(env,'eth_getLogs',[{address:cfg.network.contract,fromBlock:'0x'+height.toString(16),toBlock:'0x'+height.toString(16),topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',null,'0x'+cfg.recipient.slice(2).padStart(64,'0')]}]);
  if(!Array.isArray(logs))throw Error('chain_unavailable');
  const db=env.HITS,now=seconds();stage='orders_read';
  const rows=await db.prepare("SELECT * FROM wb_orders WHERE state='pending' AND scan_done=0 AND created>? AND checked_at<=? ORDER BY checked_at,created LIMIT 1").bind(now-7*86400,now-15).all();
  if(!Array.isArray(rows.results))throw Error('database_error');
  stage='orders_scan';for(const row of rows.results)await checkOrder(env,row);
  stage='support_read';const support=await db.prepare('SELECT COUNT(*) n FROM wb_support WHERE resolved=0').first();
  if(!Number.isSafeInteger(support?.n)||support.n<0)throw Error('database_error');
  // Only real chain/log/order checks can refresh the unchanged 4-hour guard.
  stage='health_write';await db.prepare('INSERT INTO wb_health(id,checked_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at').bind(seconds()).run();
  stage='readiness';return {ok:true,mode:'receipts-only',processed:rows.results.length,support_open:support.n,ready:await memberReady(env)};
 }catch(cause){const error=Error('membership_recovery_unavailable');error.stage=stage;error.reason=failureReason(cause);throw error;}
}
