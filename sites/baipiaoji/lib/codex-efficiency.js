import {digest,seconds} from './ad-commerce.js';
import {ensureAccounts,consumeRate} from './free-account.js';
import {ensureWeb3,web3Health,web3Settings,probeChain,verifyTransfer,chainRpc,matchesTransfer,formatUnits} from './ad-web3.js';
import {validateSummary,compilePolicy,VERSION} from './codex-policy.js';

export const PRODUCT='codex-efficiency-pro';
export const PLAN={product:PRODUCT,version:VERSION,price_usdt:19,days:30,projects:3,evaluations:100,history_days:30,auto_renew:false};
export const SCHEMA=[
 `CREATE TABLE IF NOT EXISTS ce_support (order_id TEXT PRIMARY KEY REFERENCES ce_orders(id),account_id TEXT NOT NULL,created INTEGER NOT NULL,resolved INTEGER NOT NULL DEFAULT 0)`,
 `CREATE TABLE IF NOT EXISTS ce_devices (hash TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,account_id TEXT,account_version INTEGER,created INTEGER NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0)`,
 `CREATE INDEX IF NOT EXISTS ce_devices_owner ON ce_devices(account_id)`,
 `CREATE TABLE IF NOT EXISTS ce_periods (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('trial','paid')),starts INTEGER NOT NULL,ends INTEGER NOT NULL,quota INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,project_limit INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,qa INTEGER NOT NULL DEFAULT 0)`,
 `CREATE UNIQUE INDEX IF NOT EXISTS ce_one_trial ON ce_periods(account_id) WHERE kind='trial'`,
 `CREATE INDEX IF NOT EXISTS ce_periods_owner ON ce_periods(account_id,ends)`,
 `CREATE TABLE IF NOT EXISTS ce_projects (period_id TEXT NOT NULL REFERENCES ce_periods(id),project TEXT NOT NULL,PRIMARY KEY(period_id,project))`,
 `CREATE TABLE IF NOT EXISTS ce_evaluations (account_id TEXT NOT NULL,nonce TEXT NOT NULL,fingerprint TEXT NOT NULL,period_id TEXT NOT NULL REFERENCES ce_periods(id),project TEXT NOT NULL,result TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(account_id,nonce))`,
 `CREATE TABLE IF NOT EXISTS ce_evaluation_receipts (account_id TEXT NOT NULL,nonce TEXT NOT NULL,fingerprint TEXT NOT NULL,PRIMARY KEY(account_id,nonce))`,
 `CREATE INDEX IF NOT EXISTS ce_history ON ce_evaluations(account_id,project,created)`,
 `CREATE INDEX IF NOT EXISTS ce_retention ON ce_evaluations(created)`,
 `CREATE TRIGGER IF NOT EXISTS ce_evaluation_gate BEFORE INSERT ON ce_evaluations BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ce_periods WHERE id=NEW.period_id AND account_id=NEW.account_id AND revoked=0 AND starts<=NEW.created AND ends>NEW.created AND used<quota) THEN RAISE(ABORT,'evaluation_quota') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ce_projects WHERE period_id=NEW.period_id AND project=NEW.project) AND (SELECT COUNT(*) FROM ce_projects WHERE period_id=NEW.period_id)>=(SELECT project_limit FROM ce_periods WHERE id=NEW.period_id) THEN RAISE(ABORT,'project_quota') END; END`,
 `CREATE TRIGGER IF NOT EXISTS ce_evaluation_charge AFTER INSERT ON ce_evaluations BEGIN INSERT INTO ce_evaluation_receipts(account_id,nonce,fingerprint) VALUES(NEW.account_id,NEW.nonce,NEW.fingerprint); UPDATE ce_periods SET used=used+1 WHERE id=NEW.period_id; INSERT OR IGNORE INTO ce_projects(period_id,project) VALUES(NEW.period_id,NEW.project); END`,
 `CREATE TABLE IF NOT EXISTS ce_orders (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,chain TEXT NOT NULL,recipient TEXT NOT NULL,recipient_hex TEXT NOT NULL,contract TEXT NOT NULL,amount_units INTEGER NOT NULL CHECK(amount_units>19000000 AND amount_units<19010000),created INTEGER NOT NULL,expires INTEGER NOT NULL,cursor INTEGER NOT NULL,checked_at INTEGER NOT NULL DEFAULT 0,scan_done INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',paid_at INTEGER,tx TEXT,qa INTEGER NOT NULL DEFAULT 0,UNIQUE(chain,recipient,contract,amount_units))`,
 `CREATE INDEX IF NOT EXISTS ce_orders_owner ON ce_orders(account_id,created)`,
 `CREATE INDEX IF NOT EXISTS ce_orders_pending ON ce_orders(state,scan_done,checked_at)`,
 `CREATE TRIGGER IF NOT EXISTS ce_pending_cap BEFORE INSERT ON ce_orders WHEN (SELECT COUNT(*) FROM ce_orders WHERE state='pending' AND scan_done=0 AND created>NEW.created-604800)>=20 BEGIN SELECT RAISE(ABORT,'checkout_busy'); END`,
 `CREATE TRIGGER IF NOT EXISTS ce_paid AFTER UPDATE OF state ON ce_orders WHEN NEW.state='paid' AND OLD.state='pending' BEGIN INSERT INTO ce_periods(id,account_id,kind,starts,ends,quota,project_limit,qa) SELECT NEW.id,NEW.account_id,'paid',MAX(NEW.paid_at,COALESCE(MAX(ends),0)),MAX(NEW.paid_at,COALESCE(MAX(ends),0))+2592000,100,3,NEW.qa FROM ce_periods WHERE account_id=NEW.account_id AND kind='paid' AND revoked=0; END`,
 `CREATE TABLE IF NOT EXISTS ce_refunds (order_id TEXT PRIMARY KEY REFERENCES ce_orders(id),destination TEXT NOT NULL,created INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'requested',tx TEXT UNIQUE,completed INTEGER)`,
 `CREATE TRIGGER IF NOT EXISTS ce_refunded AFTER UPDATE OF state ON ce_refunds WHEN NEW.state='completed' AND OLD.state='requested' BEGIN UPDATE ce_periods SET revoked=1 WHERE id=NEW.order_id; UPDATE ce_orders SET state='refunded' WHERE id=NEW.order_id; END`,
 `CREATE TABLE IF NOT EXISTS ce_health (id INTEGER PRIMARY KEY,checked_at INTEGER NOT NULL)`
];
export async function ensureEfficiency(env){if((env.MEMBER_SITE||'bpj')!=='bpj')throw Error('wrong_site');await ensureAccounts(env);await ensureWeb3(env.HITS);await env.HITS.batch(SCHEMA.map(s=>env.HITS.prepare(s)));}
export async function cleanup(env){const t=seconds();await env.HITS.batch([env.HITS.prepare('DELETE FROM ce_evaluations WHERE created<=?').bind(t-30*86400),env.HITS.prepare('DELETE FROM ce_devices WHERE expires<=?').bind(t)]);}
export async function ready(env){
 const w=await web3Health(env);let h=null;try{h=await env.HITS.prepare('SELECT checked_at FROM ce_health WHERE id=1').first();}catch{}
 return env.CODEX_EFFICIENCY_ENABLED==='true'&&w.ready&&w.chain==='bsc'&&w.network.live===1&&w.baseUnits>=19010000&&!!h&&seconds()-h.checked_at<14400;
}
export async function startDevice(env,challenge,ip){
 if(!/^[a-f0-9]{64}$/.test(challenge||''))throw Error('bad_device');
 if(!await consumeRate(env,'ce-device',ip,10,900))throw Error('rate_limited');
 const code=[...crypto.getRandomValues(new Uint8Array(6))].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
 await env.HITS.prepare('INSERT INTO ce_devices(hash,code,created,expires) VALUES(?,?,?,?)').bind(challenge,code,seconds(),seconds()+600).run();
 return {code,expires_in:600,verification_uri:'https://baipiaoji.com/studio/codex-efficiency#connect'};
}
export async function approveDevice(env,user,code){
 if(!/^[A-F0-9]{12}$/.test(code||''))throw Error('bad_device');
 const r=await env.HITS.prepare('UPDATE ce_devices SET account_id=?,account_version=?,expires=? WHERE code=? AND account_id IS NULL AND revoked=0 AND expires>?').bind(user.id,user.session_version,seconds()+90*86400,code,seconds()).run();
 if(!r.meta?.changes)throw Error('device_expired');return {linked:true};
}
export async function deviceUser(env,token){
 if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 return env.HITS.prepare('SELECT a.id,a.session_version,a.qa FROM ce_devices d JOIN free_accounts a ON a.id=d.account_id AND a.session_version=d.account_version WHERE d.hash=? AND d.revoked=0 AND d.expires>?').bind(await digest(token),seconds()).first();
}
export async function status(env,user){
 const periods=(await env.HITS.prepare('SELECT kind,starts,ends,quota,used,project_limit,revoked FROM ce_periods WHERE account_id=? ORDER BY starts DESC').bind(user.id).all()).results;
 return {plan:PLAN,ready:await ready(env),periods,trial_available:!periods.some(p=>p.kind==='trial')};
}
export async function evaluate(env,user,b){
 if(b.consent!==true)throw Error('consent_required');
 if(!/^[a-f0-9]{32}$/.test(b.nonce||''))throw Error('bad_nonce');
 const s=validateSummary(b.summary),db=env.HITS,t=seconds(),fingerprint=await digest(JSON.stringify(s));
 const prior=()=>db.prepare('SELECT * FROM ce_evaluations WHERE account_id=? AND nonce=?').bind(user.id,b.nonce).first();
 const replay=row=>{if(row.fingerprint!==fingerprint)throw Error('idempotency_conflict');return {result:JSON.parse(row.result),replayed:true};};
 const old=await prior();if(old)return replay(old);
 const receipt=await db.prepare('SELECT fingerprint FROM ce_evaluation_receipts WHERE account_id=? AND nonce=?').bind(user.id,b.nonce).first();
 if(receipt)throw Error(receipt.fingerprint===fingerprint?'result_expired':'idempotency_conflict');
 let period=await db.prepare("SELECT * FROM ce_periods WHERE account_id=? AND kind='paid' AND revoked=0 AND starts<=? AND ends>? ORDER BY starts LIMIT 1").bind(user.id,t,t).first();
 if(!period){await db.prepare("INSERT OR IGNORE INTO ce_periods(id,account_id,kind,starts,ends,quota,project_limit,qa) VALUES(?,?,'trial',?,?,1,1,?)").bind('trial:'+user.id,user.id,t,t+30*86400,user.qa||0).run();period=await db.prepare("SELECT * FROM ce_periods WHERE account_id=? AND kind='trial'").bind(user.id).first();}
 const history=await db.prepare('SELECT result FROM ce_evaluations WHERE account_id=? AND project=? AND created>? ORDER BY created DESC LIMIT 1').bind(user.id,s.project,t-30*86400).first();
 const result=compilePolicy(s,history?JSON.parse(history.result):null);
 try{await db.prepare('INSERT INTO ce_evaluations(account_id,nonce,fingerprint,period_id,project,result,created) VALUES(?,?,?,?,?,?,?)').bind(user.id,b.nonce,fingerprint,period.id,s.project,JSON.stringify(result),t).run();}
 catch(e){const row=await prior();if(row)return replay(row);if(/evaluation_quota|project_quota/.test(e.message))throw Error(e.message.includes('project_quota')?'project_quota':'evaluation_quota');throw e;}
 return {result,replayed:false};
}
export function orderView(r){return {id:r.id,state:r.state==='pending'&&r.expires<seconds()?'expired':r.state,paid_at:r.paid_at,amount_usdt:formatUnits(r.amount_units),payment:{chain:r.chain,token:'USDT',address:r.recipient,contract:r.contract,expires:r.expires,tx:r.tx}};}
export async function checkout(env,user,b,ip){
 if(b.accept_terms!==true)throw Error('consent_required');if(user.qa)throw Error('qa_checkout_disabled');
 if(!/^[a-f0-9]{32}$/.test(b.nonce||''))throw Error('bad_nonce');
 const db=env.HITS,id=await digest(PRODUCT+':'+user.id+':'+b.nonce),t=seconds();
 const old=await db.prepare('SELECT * FROM ce_orders WHERE id=?').bind(id).first();if(old)return orderView(old);
 if(!await ready(env))throw Error('not_ready');
 const pending=await db.prepare("SELECT * FROM ce_orders WHERE account_id=? AND state='pending' AND expires>? ORDER BY created DESC LIMIT 1").bind(user.id,t).first();if(pending)return orderView(pending);
 if(!await consumeRate(env,'ce-checkout',ip,5,3600))throw Error('rate_limited');
 const cfg=web3Settings(env),height=await probeChain(env,cfg);
 await db.prepare(`INSERT INTO ce_orders(id,account_id,chain,recipient,recipient_hex,contract,amount_units,created,expires,cursor) SELECT ?,?,?,?,?,?,COALESCE(MAX(amount_units),19000000)+1,?,?,? FROM ce_orders WHERE chain=? AND recipient=? AND contract=?`).bind(id,user.id,cfg.chain,cfg.recipient,cfg.recipient.slice(2),cfg.network.contract,t,t+3600,height,cfg.chain,cfg.recipient,cfg.network.contract).run();
 return orderView(await db.prepare('SELECT * FROM ce_orders WHERE id=?').bind(id).first());
}
export async function deliver(env,row,proof){
 if(proof.code!=='verified')throw Error('unverified');const db=env.HITS,t=seconds(),receipt='ce:'+row.id;
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO bpj_ad_chain_receipts(chain,tx,order_id,block,amount_units,created) VALUES(?,?,?,?,?,?)').bind(row.chain,proof.tx,receipt,proof.block,row.amount_units,t),
 db.prepare("UPDATE ce_orders SET state='paid',paid_at=?,tx=? WHERE id=? AND state='pending' AND EXISTS(SELECT 1 FROM bpj_ad_chain_receipts WHERE chain=? AND tx=? AND order_id=?)").bind(t,proof.tx,row.id,row.chain,proof.tx,receipt)]);
 return orderView(await db.prepare('SELECT * FROM ce_orders WHERE id=?').bind(row.id).first());
}
export async function checkOrder(env,row,tx){
 if(row.state!=='pending')return orderView(row);
 const lock=await env.HITS.prepare('UPDATE ce_orders SET checked_at=? WHERE id=? AND checked_at<=?').bind(seconds(),row.id,seconds()-15).run();if(!lock.meta?.changes)throw Error('rate_limited');
 if(tx){const proof=await verifyTransfer(env,row,tx);return proof.code==='verified'?deliver(env,row,proof):{...orderView(row),check:proof.code};}
 const end=await probeChain(env);let cursor=row.cursor;
 for(let page=0;page<3&&cursor<=end;page++){
  const to=Math.min(end,cursor+1999),logs=await chainRpc(env,'eth_getLogs',[{address:row.contract,fromBlock:'0x'+cursor.toString(16),toBlock:'0x'+to.toString(16),topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',null,'0x'+row.recipient_hex.padStart(64,'0')]}]);
  if(!Array.isArray(logs))throw Error('chain_unavailable');
  for(const log of logs.filter(l=>matchesTransfer(l,row))){const proof=await verifyTransfer(env,row,String(log.transactionHash).toLowerCase());if(proof.code==='verified')return deliver(env,row,proof);if(proof.code==='confirming')return {...orderView(row),check:'confirming'};}
  let done=0;if(seconds()>row.expires){const block=await chainRpc(env,'eth_getBlockByNumber',['0x'+to.toString(16),false]);if(!/^0x[0-9a-f]+$/i.test(block?.timestamp||''))throw Error('chain_unavailable');done=Number(BigInt(block.timestamp))>row.expires?1:0;}
  cursor=to+1;await env.HITS.prepare('UPDATE ce_orders SET cursor=MAX(cursor,?),scan_done=MAX(scan_done,?) WHERE id=?').bind(cursor,done,row.id).run();if(done)break;
 }
 return orderView(row);
}
export async function watchEfficiency(env){
 await ensureEfficiency(env);await probeChain(env);await cleanup(env);
 const rows=(await env.HITS.prepare("SELECT * FROM ce_orders WHERE state='pending' AND scan_done=0 AND created>? AND checked_at<=? ORDER BY checked_at,created LIMIT 1").bind(seconds()-7*86400,seconds()-15).all()).results;
 for(const row of rows)await checkOrder(env,row);
 await env.HITS.prepare('INSERT INTO ce_health(id,checked_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at').bind(seconds()).run();return {processed:rows.length};
}
export async function requestRefund(env,user,b){
 const row=await env.HITS.prepare("SELECT * FROM ce_orders WHERE id=? AND account_id=? AND state='paid'").bind(String(b.id||''),user.id).first();if(!row)throw Error('not_found');
 const existing=await env.HITS.prepare('SELECT state FROM ce_refunds WHERE order_id=?').bind(row.id).first();if(existing)return existing;
 const first=await env.HITS.prepare("SELECT id FROM ce_orders WHERE account_id=? AND paid_at IS NOT NULL ORDER BY paid_at,created,id LIMIT 1").bind(user.id).first();
 if(first?.id!==row.id||seconds()>row.paid_at+7*86400)throw Error('refund_window');
 if(!/^0x[a-fA-F0-9]{40}$/.test(b.destination||'')||/^0x0{40}$/i.test(b.destination)||b.confirm_destination!==true)throw Error('bad_destination');
 await env.HITS.prepare('INSERT OR IGNORE INTO ce_refunds(order_id,destination,created) VALUES(?,?,?)').bind(row.id,b.destination.toLowerCase(),seconds()).run();return {state:'requested'};
}
// Records a completed external refund; never signs or sends a transfer.
export async function completeRefund(env,id,tx){
 const row=await env.HITS.prepare("SELECT o.*,r.destination,r.created AS refund_created FROM ce_orders o JOIN ce_refunds r ON r.order_id=o.id WHERE o.id=? AND r.state='requested'").bind(id).first();if(!row)throw Error('not_found');
 const target={...row,recipient:row.destination,recipient_hex:row.destination.slice(2),created:row.refund_created,expires:seconds()+60};
 const proof=await verifyTransfer(env,target,tx);if(proof.code!=='verified')throw Error('refund_unverified');
 const receipt=await chainRpc(env,'eth_getTransactionReceipt',[tx]);
 if(!receipt.logs.some(l=>matchesTransfer(l,target)&&l.topics[1]?.toLowerCase()==='0x'+row.recipient_hex.padStart(64,'0')))throw Error('refund_unverified');
 await env.HITS.batch([
 env.HITS.prepare('INSERT INTO bpj_ad_chain_receipts(chain,tx,order_id,block,amount_units,created) VALUES(?,?,?,?,?,?)').bind(row.chain,tx,'ce-refund:'+id,proof.block,row.amount_units,seconds()),
 env.HITS.prepare("UPDATE ce_refunds SET state='completed',tx=?,completed=? WHERE order_id=? AND state='requested'").bind(tx,seconds(),id)]);return {state:'completed'};
}
