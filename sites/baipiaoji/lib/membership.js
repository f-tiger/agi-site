import {products,externalProducts} from '../../../tools/revenue-studio/catalog.mjs';
import {restore as restoreVideo,PRODUCT as VIDEO_PRODUCT} from '../assets/studio/video-core.mjs';
import {digest,seconds} from './ad-commerce.js';
import {failureReason} from '../../../tools/member-studio/failure.mjs';
import {ensureWeb3,web3Health,web3Settings,probeChain,verifyTransfer,formatUnits,chainRpc,matchesTransfer} from './ad-web3.js';
export const PLAN={id:'workbench-30',price_units:9000000,days:30,workspaces:50,versions:10,max_bytes:65536,total_bytes:5242880,grace_days:30};
export const MEMBER_SITES={bpj:{offset:0},agi:{offset:10000},eco:{offset:20000},tds:{offset:30000}};
export function memberSite(env={}){const site=env.MEMBER_SITE||'bpj';if(!Object.hasOwn(MEMBER_SITES,site))throw Error('not_ready');return site;}
export function memberPlan(env={}){const site=memberSite(env);return {...PLAN,id:site+'-workbench-30',site,quote_base:PLAN.price_units+MEMBER_SITES[site].offset};}
export const allowedProduct=(site,id)=>products.some(p=>p.site===site&&p.id===id)||externalProducts.some(p=>p.site===site&&p.id===id);
export const SCHEMA=[
 `CREATE TABLE IF NOT EXISTS wb_health(id INTEGER PRIMARY KEY,checked_at INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS wb_support(id TEXT PRIMARY KEY,member_id TEXT NOT NULL,message TEXT NOT NULL,created INTEGER NOT NULL,resolved INTEGER NOT NULL DEFAULT 0)`,
 `CREATE TABLE IF NOT EXISTS wb_members(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, created INTEGER NOT NULL, ends_at INTEGER NOT NULL DEFAULT 0, suspended INTEGER NOT NULL DEFAULT 0)`,
 `CREATE TABLE IF NOT EXISTS wb_orders(id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES wb_members(id), chain TEXT NOT NULL, recipient TEXT NOT NULL,recipient_hex TEXT NOT NULL,contract TEXT NOT NULL,amount_units INTEGER NOT NULL CHECK(amount_units>9000000 AND amount_units<9010000),days INTEGER NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,cursor INTEGER NOT NULL,checked_at INTEGER NOT NULL DEFAULT 0,scan_done INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',paid_at INTEGER,tx TEXT,UNIQUE(chain,recipient,contract,amount_units))`,
 `CREATE INDEX IF NOT EXISTS wb_order_owner ON wb_orders(member_id,created)`,
 `CREATE TABLE IF NOT EXISTS wb_order_sources(order_id TEXT PRIMARY KEY REFERENCES wb_orders(id),product TEXT NOT NULL,created INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS wb_spaces(member_id TEXT NOT NULL REFERENCES wb_members(id),id TEXT NOT NULL,name TEXT NOT NULL,product TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL,PRIMARY KEY(member_id,id))`,
 `CREATE TABLE IF NOT EXISTS wb_versions(member_id TEXT NOT NULL,space_id TEXT NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL,bytes INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(member_id,space_id,revision),FOREIGN KEY(member_id,space_id) REFERENCES wb_spaces(member_id,id) ON DELETE CASCADE)`,
 `CREATE TABLE IF NOT EXISTS wb_limits(key TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL)`,
 `CREATE TRIGGER IF NOT EXISTS wb_paid AFTER UPDATE OF state ON wb_orders WHEN NEW.state='paid' AND OLD.state='pending' BEGIN UPDATE wb_members SET ends_at=MAX(ends_at,NEW.paid_at)+NEW.days*86400 WHERE id=NEW.member_id; END`,
 `CREATE TRIGGER IF NOT EXISTS wb_space_quota BEFORE INSERT ON wb_spaces WHEN (SELECT COUNT(*) FROM wb_spaces WHERE member_id=NEW.member_id)>=50 BEGIN SELECT RAISE(ABORT,'workspace_quota'); END`,
 `CREATE TRIGGER IF NOT EXISTS wb_version_quota BEFORE INSERT ON wb_versions WHEN NEW.bytes>65536 OR COALESCE((SELECT SUM(bytes) FROM wb_versions WHERE member_id=NEW.member_id),0)+NEW.bytes>5242880 BEGIN SELECT RAISE(ABORT,'storage_quota'); END`,
 `CREATE TRIGGER IF NOT EXISTS wb_pending_quota BEFORE INSERT ON wb_orders WHEN (SELECT COUNT(*) FROM wb_orders WHERE state='pending' AND scan_done=0 AND created>NEW.created-604800)>=20 BEGIN SELECT RAISE(ABORT,'checkout_busy'); END`
];
export async function ensureMembers(db,site='bpj'){const base=memberPlan({MEMBER_SITE:site}).quote_base;await ensureWeb3(db);await db.batch(SCHEMA.map(s=>db.prepare(s.replace('amount_units>9000000 AND amount_units<9010000',`amount_units>${base} AND amount_units<${base+10000}`))));}
export const memberByToken=async(db,token)=>db.prepare('SELECT * FROM wb_members WHERE token_hash=?').bind(await digest(token)).first();
export function memberStatus(m,now=seconds()){return {exists:!!m,active:!!m&&!m.suspended&&m.ends_at>now,suspended:!!m?.suspended,ends_at:m?.ends_at||null,read_until:m?.ends_at?m.ends_at+PLAN.grace_days*86400:null,plan:PLAN};}
export async function memberReady(env){const w=await web3Health(env);let health=null;try{health=await env.HITS.prepare('SELECT checked_at FROM wb_health WHERE id=1').first();}catch{}return !!health&&seconds()-health.checked_at<14400&&env.MEMBERS_ENABLED==='true'&&(memberSite(env)==='bpj'?w.ready:w.enabled&&w.configured)&&w.chain==='bsc'&&w.network.live===1&&w.baseUnits>PLAN.price_units+10000;}
export async function rate(db,key,max,ttl=3600){const now=seconds();await db.prepare('INSERT INTO wb_limits(key,n,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN expires<=? THEN 1 ELSE n+1 END,expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END').bind(key,now+ttl,now,now).run();if((await db.prepare('SELECT n FROM wb_limits WHERE key=?').bind(key).first()).n>max)throw Error('rate_limited');}
export function orderStatus(row){return {id:row.id,state:row.state==='pending'&&row.expires<seconds()?'expired':row.state,days:row.days,payment:{chain:row.chain,token:'USDT',address:row.recipient,contract:row.contract,amount:formatUnits(row.amount_units),expires:row.expires,tx:row.tx}};}
export async function createOrder(env,token,nonce,ip,source=''){
 if(!/^[a-f0-9]{32}$/.test(nonce||''))throw Error('bad_nonce');const plan=memberPlan(env),db=env.HITS,hash=await digest(token),now=seconds();let member=await memberByToken(db,token);const id=await digest('membership:'+memberSite(env)+':'+hash+':'+nonce);
 if(source&&!allowedProduct(memberSite(env),source))throw Error('bad_source');
 const old=await db.prepare('SELECT * FROM wb_orders WHERE id=?').bind(id).first();if(old)return orderStatus(old);
 if(member?.suspended)throw Error('suspended');if(!await memberReady(env))throw Error('not_ready');
 await rate(db,'order:'+await digest(env.ADS_WATCH_SECRET+':'+ip),5);
 const cfg=web3Settings(env),height=await probeChain(env,cfg),memberID=member?.id||crypto.randomUUID();
 if(member){const pending=await db.prepare("SELECT * FROM wb_orders WHERE member_id=? AND state='pending' AND expires>? ORDER BY created DESC LIMIT 1").bind(member.id,now).first();if(pending)return orderStatus(pending);}
 const p=(s,...a)=>db.prepare(s).bind(...a);
 await db.batch([
 p('INSERT OR IGNORE INTO wb_members(id,token_hash,created) VALUES(?,?,?)',memberID,hash,now),
 p(`INSERT INTO wb_orders(id,member_id,chain,recipient,recipient_hex,contract,amount_units,days,created,expires,cursor)
 SELECT ?, (SELECT id FROM wb_members WHERE token_hash=?),?,?,?,?,COALESCE(MAX(amount_units),?)+1,?,?,?,? FROM wb_orders WHERE chain=? AND recipient=? AND contract=?`,id,hash,cfg.chain,cfg.recipient,cfg.recipient.slice(2),cfg.network.contract,plan.quote_base,plan.days,now,now+3600,height,cfg.chain,cfg.recipient,cfg.network.contract),
 p('INSERT INTO wb_order_sources(order_id,product,created) VALUES(?,?,?)',id,source,now)
 ]);
 const row=await db.prepare('SELECT * FROM wb_orders WHERE id=?').bind(id).first();
 // Never recycle amount identifiers. Capacity guard is also checked in SQL below.
 if(row.amount_units>=plan.quote_base+10000)throw Error('quote_capacity');return orderStatus(row);
}
export async function deliver(env,row,proof){
 if(proof.code!=='verified')throw Error('unverified');const db=env.HITS,now=seconds(),receiptID='member:'+row.id,p=(s,...a)=>db.prepare(s).bind(...a);
 await db.batch([
 p('INSERT OR IGNORE INTO bpj_ad_chain_receipts(chain,tx,order_id,block,amount_units,created) VALUES(?,?,?,?,?,?)',row.chain,proof.tx,receiptID,proof.block,row.amount_units,now),
 p("UPDATE wb_orders SET state='paid',paid_at=?,tx=? WHERE id=? AND state='pending' AND EXISTS(SELECT 1 FROM bpj_ad_chain_receipts WHERE chain=? AND tx=? AND order_id=?)",now,proof.tx,row.id,row.chain,proof.tx,receiptID)
 ]);
 return orderStatus(await db.prepare('SELECT * FROM wb_orders WHERE id=?').bind(row.id).first());
}
export async function checkOrder(env,row,tx){
 if(row.state!=='pending')return orderStatus(row);const db=env.HITS,now=seconds();
 const lock=await db.prepare('UPDATE wb_orders SET checked_at=? WHERE id=? AND checked_at<=?').bind(now,row.id,now-15).run();if(!lock.meta?.changes)throw Error('rate_limited');
 if(tx){const proof=await verifyTransfer(env,row,tx);if(proof.code==='verified')return deliver(env,row,proof);return {...orderStatus(row),check:proof.code};}
 const end=await probeChain(env);let cursor=row.cursor;
 for(let page=0;page<3&&cursor<=end;page++){
  const to=Math.min(end,cursor+1999),logs=await chainRpc(env,'eth_getLogs',[{address:row.contract,fromBlock:'0x'+cursor.toString(16),toBlock:'0x'+to.toString(16),topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',null,'0x'+row.recipient_hex.padStart(64,'0')]}]);
  if(!Array.isArray(logs))throw Error('chain_unavailable');
  for(const log of logs.filter(l=>matchesTransfer(l,row))){const proof=await verifyTransfer(env,row,String(log.transactionHash).toLowerCase());if(proof.code==='verified')return deliver(env,row,proof);if(proof.code==='confirming')return {...orderStatus(row),check:'confirming'};}
  let complete=0;
  if(now>row.expires){const block=await chainRpc(env,'eth_getBlockByNumber',['0x'+to.toString(16),false]);if(!block||!/^0x[0-9a-f]+$/i.test(block.timestamp||''))throw Error('chain_unavailable');complete=Number(BigInt(block.timestamp))>row.expires?1:0;}
  cursor=to+1;await db.prepare('UPDATE wb_orders SET cursor=MAX(cursor,?),scan_done=MAX(scan_done,?) WHERE id=?').bind(cursor,complete,row.id).run();if(complete)break;
 }
 return orderStatus(row);
}
export async function watchMembers(env){
 let stage='schema';
 try {
 await ensureMembers(env.HITS,memberSite(env));stage='chain_probe';await probeChain(env);const db=env.HITS,now=seconds();stage='orders_read';
 const rows=await db.prepare("SELECT * FROM wb_orders WHERE state='pending' AND scan_done=0 AND created>? AND checked_at<=? ORDER BY checked_at,created LIMIT 1").bind(now-7*86400,now-15).all();
 stage='orders_scan';for(const row of rows.results||[])await checkOrder(env,row);
 stage='cleanup';
 await db.batch([
 db.prepare('DELETE FROM wb_versions WHERE member_id IN (SELECT id FROM wb_members WHERE ends_at>0 AND ends_at<?)').bind(now-PLAN.grace_days*86400),
 db.prepare('DELETE FROM wb_spaces WHERE member_id IN (SELECT id FROM wb_members WHERE ends_at>0 AND ends_at<?)').bind(now-PLAN.grace_days*86400),
 db.prepare('DELETE FROM wb_limits WHERE expires<?').bind(now-86400)
 ]);
 stage='health_write';await db.prepare('INSERT INTO wb_health(id,checked_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at').bind(now).run();
 stage='support_read';
 return {processed:(rows.results||[]).length,support_open:(await db.prepare('SELECT COUNT(*) n FROM wb_support WHERE resolved=0').first()).n};
 } catch(cause) { const error=Error('membership_watch_unavailable');error.stage=stage;error.reason=failureReason(cause);throw error; }
}
export async function saveSpace(db,m,b){
 if(!memberStatus(m).active)throw Error('membership_required');
 if(!/^[a-f0-9]{32}$/.test(b.id||'')||!Number.isSafeInteger(b.revision)||b.revision<0||typeof b.name!=='string'||!b.name.trim()||b.name.length>80)throw Error('bad_workspace');
 let data=b.data;if(!data||data.version!==1||typeof data.product!=='string'||!/^[a-z0-9-]{1,60}$/.test(data.product)||!data.values||typeof data.values!=='object'||Array.isArray(data.values))throw Error('bad_backup');
 if(data.product===VIDEO_PRODUCT){try{data={version:1,product:VIDEO_PRODUCT,values:{project:restoreVideo(data.values.project)}};}catch{throw Error('bad_backup');}}
 const body=JSON.stringify(data),bytes=new TextEncoder().encode(body).length;if(bytes>PLAN.max_bytes)throw Error('storage_quota');
 const now=seconds(),p=(s,...a)=>db.prepare(s).bind(...a);
 // Optimistic revision claim, version write, trimming and quota check share a transaction.
 const statements=[];
 if(b.revision===0)statements.push(p('INSERT INTO wb_spaces(member_id,id,name,product,revision,updated) VALUES(?,?,?,?,0,?)',m.id,b.id,b.name.trim(),data.product,now));
 statements.push(p('UPDATE wb_spaces SET name=?,revision=revision+1,updated=? WHERE member_id=? AND id=? AND revision=? AND product=? AND EXISTS(SELECT 1 FROM wb_members WHERE id=? AND suspended=0 AND ends_at>?)',b.name.trim(),now,m.id,b.id,b.revision,data.product,m.id,now));
 // A failed optimistic claim intentionally violates NOT NULL and rolls the batch back.
 statements.push(p('INSERT INTO wb_versions(member_id,space_id,revision,body,bytes,created) VALUES(?,?,?,(SELECT ? FROM wb_spaces WHERE member_id=? AND id=? AND revision=? AND updated=?),?,?)',m.id,b.id,b.revision+1,body,m.id,b.id,b.revision+1,now,bytes,now));
 statements.push(p('DELETE FROM wb_versions WHERE member_id=? AND space_id=? AND revision<=?',m.id,b.id,b.revision+1-PLAN.versions));
 try{await db.batch(statements);}catch(e){if(/workspace_quota|storage_quota/.test(e.message))throw Error(e.message.includes('workspace_quota')?'workspace_quota':'storage_quota');throw Error('revision_conflict');}
 return {ok:true,id:b.id,revision:b.revision+1};
}
