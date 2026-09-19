import {ensure,digest,seconds,publicStatus,scheduleStatements} from './ad-commerce.js';

// BSC Binance-Peg USDT: Trust Wallet asset registry + on-chain decimals(), checked 2026-09-19.
// Base Sepolia USDC: Circle official test contract. Never trust a token symbol.
export const NETWORKS = {
 bsc:{token:'USDT',contract:'0x55d398326f99059ff775485246999027b3197955',chainId:56,decimals:18,live:1},
 // Test-only native USDC fixture; never part of the public paid inventory.
 'base-sepolia':{token:'USDC',contract:'0x036cbd53842c5426634e7929541ec2318f3dcf7e',chainId:84532,decimals:6,live:0}
};
const TRANSFER='ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const WEB3_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS bpj_ad_web3 (
 order_id TEXT PRIMARY KEY REFERENCES bpj_ad_checkout(id), chain TEXT NOT NULL, recipient TEXT NOT NULL,
 recipient_hex TEXT NOT NULL, contract TEXT NOT NULL, amount_units INTEGER NOT NULL CHECK(amount_units>0),
 expires INTEGER NOT NULL, cursor INTEGER NOT NULL DEFAULT 0, checked_at INTEGER NOT NULL DEFAULT 0,
 tx TEXT, note TEXT, UNIQUE(chain,recipient,contract,amount_units), UNIQUE(chain,tx))`,
 `CREATE TABLE IF NOT EXISTS bpj_ad_chain_receipts (chain TEXT NOT NULL, tx TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE,
 block INTEGER NOT NULL, amount_units INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(chain,tx))`,
 `CREATE TABLE IF NOT EXISTS bpj_ad_web3_health (id TEXT PRIMARY KEY, checked_at INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS bpj_ad_web3_limits (key TEXT PRIMARY KEY, n INTEGER NOT NULL)`
];
export async function ensureWeb3(db){await ensure(db);await db.batch(WEB3_SCHEMA.map(s=>db.prepare(s)));}
export function web3Settings(env){
 const chain=String(env.ADS_WALLET_CHAIN||'').toLowerCase(),network=NETWORKS[chain];
 const recipient=String(env.ADS_WALLET||'').trim();
 const price=String(env.ADS_WEB3_PRICE_USD||''),cents=/^\d{1,5}\.\d{2}$/.test(price)?Number(price.replace('.','')):0;
 const days=Number(env.ADS_DAYS||30);let rpcOK=false;
 if(network?.chainId)try{const u=new URL(env.ADS_WEB3_RPC_URL);rpcOK=u.protocol==='https:'&&!u.username&&!u.password;}catch{}
 const addressOK=/^0x[a-fA-F0-9]{40}$/.test(recipient)&&!/^0x0{40}$/i.test(recipient);
 const configured=!!env.HITS&&!!network&&addressOK&&rpcOK&&cents>0&&cents<=1000000&&Number.isInteger(days)&&days>0&&days<=366&&String(env.ADS_WATCH_SECRET||'').length>=32;
 return {chain,network,recipient:network?.chainId?recipient.toLowerCase():recipient,cents,days,configured,enabled:env.ADS_WEB3_ENABLED==='true',baseUnits:cents*10000};
}
async function api(url,body,headers={}){
 const r=await fetch(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!r.ok)throw Error('chain_unavailable');const j=await r.json();if(j.error||j.Error||j.success===false)throw Error('chain_unavailable');return j;
}
async function rpc(env,method,params=[]){const j=await api(env.ADS_WEB3_RPC_URL,{jsonrpc:'2.0',id:1,method,params});if(!('result' in j))throw Error('chain_unavailable');return j.result;}
const hexNum=x=>{if(!/^0x[0-9a-f]+$/i.test(x||''))throw Error('chain_unavailable');const n=Number(BigInt(x));if(!Number.isSafeInteger(n))throw Error('chain_unavailable');return n;};
export async function probeChain(env,cfg=web3Settings(env)){
 if(!cfg.configured)throw Error('not_configured');
 if(hexNum(await rpc(env,'eth_chainId'))!==cfg.network.chainId)throw Error('wrong_chain');
 if(hexNum(await rpc(env,'eth_call',[{to:cfg.network.contract,data:'0x313ce567'},'latest']))!==cfg.network.decimals)throw Error('token_precision');
 const b=await rpc(env,'eth_getBlockByNumber',['finalized',false]);
 if(!b||Math.abs(seconds()-hexNum(b.timestamp))>1800)throw Error('chain_unavailable');return hexNum(b.number);
}
export async function web3Health(env){
 const cfg=web3Settings(env);let healthy=false,addressValid=false;
 if(cfg.configured){try{addressValid=cfg.configured;const h=await env.HITS.prepare('SELECT checked_at FROM bpj_ad_web3_health WHERE id=?').bind(await healthKey(cfg)).first();healthy=!!h&&seconds()-h.checked_at<4*3600;}catch{}}
 return {...cfg,ready:cfg.enabled&&cfg.configured&&healthy&&addressValid,healthy};
}
const healthKey=cfg=>digest([cfg.chain,cfg.recipient,cfg.network?.contract].join(':'));
export const formatUnits=n=>`${Math.floor(n/1000000)}.${String(n%1000000).padStart(6,'0')}`;
export async function web3Order(db,id){return db.prepare('SELECT c.*,w.* FROM bpj_ad_checkout c JOIN bpj_ad_web3 w ON w.order_id=c.id WHERE c.id=?').bind(id).first();}
export function web3Status(row,now=seconds()){
 const out=publicStatus(row,now);if(row.state==='pending'&&now>row.expires)out.state='payment_expired';
 return {...out,rail:'web3',payment:{chain:row.chain,token:NETWORKS[row.chain].token,contract:row.contract,address:row.recipient,amount:formatUnits(row.amount_units),amount_raw:(BigInt(row.amount_units)*10n**BigInt(NETWORKS[row.chain].decimals-6)).toString(),expires_at:new Date(row.expires*1000).toISOString(),tx:row.tx,note:row.note}};
}
export async function createWeb3Order(env,input,token,ip='unknown'){
 const cfg=await web3Health(env);if(!cfg.ready)throw Error('not_configured');const db=env.HITS;
 await ensureWeb3(db);const hash=await digest(token),id=hash.slice(0,32),now=seconds();
 const old=await web3Order(db,id);
 if(old){if(['name','url','pitch','cat','lang'].some(k=>old[k]!==input[k]))throw Error('order_changed');return web3Status(old);}
 if(await db.prepare('SELECT id FROM bpj_ad_checkout WHERE id=?').bind(id).first())throw Error('order_exists');
 const key=await digest(env.ADS_WATCH_SECRET+':'+ip+':'+Math.floor(now/3600));
 await db.prepare('INSERT INTO bpj_ad_web3_limits(key,n) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(key).run();
 if((await db.prepare('SELECT n FROM bpj_ad_web3_limits WHERE key=?').bind(key).first()).n>5)throw Error('rate_limited');
 if((await db.prepare("SELECT COUNT(*) n FROM bpj_ad_web3 w JOIN bpj_ad_checkout c ON c.id=w.order_id WHERE c.state='pending' AND c.created>?").bind(now-7*86400).first()).n>=20)throw Error('rate_limited');
 const block=await probeChain(env,cfg),recipientHex=cfg.recipient.slice(2);
 const p=(s,...a)=>db.prepare(s).bind(...a);
 // Both rows are committed atomically. Never recycle an amount, even after expiry:
 // a delayed transfer must never buy a DIFFERENT customer's placement.
 await db.batch([
  p(`INSERT OR IGNORE INTO bpj_ad_checkout(id,token_hash,name,url,pitch,cat,lang,price_cents,currency,days,livemode,state,created)
   VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?)`,id,hash,input.name,input.url,input.pitch,input.cat,input.lang,cfg.cents,'usd',cfg.days,cfg.network.live,now),
  p(`INSERT OR IGNORE INTO bpj_ad_web3(order_id,chain,recipient,recipient_hex,contract,amount_units,expires,cursor)
   SELECT ?,?,?,?,?,COALESCE(MAX(amount_units),?)+1,?,? FROM bpj_ad_web3
   WHERE chain=? AND recipient=? AND contract=? AND amount_units>=? AND amount_units<?`,id,cfg.chain,cfg.recipient,recipientHex,cfg.network.contract,cfg.baseUnits,now+3600,block,cfg.chain,cfg.recipient,cfg.network.contract,cfg.baseUnits,cfg.baseUnits+10000)
 ]);
 const row=await web3Order(db,id);
 if(row&&['name','url','pitch','cat','lang'].some(k=>row[k]!==input[k]))throw Error('order_changed');
 if(!row||row.amount_units>=cfg.baseUnits+10000){await db.prepare("UPDATE bpj_ad_checkout SET state='failed' WHERE id=? AND state='pending'").bind(id).run();throw Error('quote_capacity');}
 return web3Status(row);
}
function logMatches(log,row){
 const clean=x=>String(x||'').toLowerCase().replace(/^0x/,'');
 const contract=clean(row.contract);
 if(clean(log.address)!==contract||log.removed||!Array.isArray(log.topics)||log.topics.length!==3||clean(log.topics[0])!==TRANSFER||clean(log.topics[2])!==row.recipient_hex.padStart(64,'0')||!/^([0-9a-f]{64})$/i.test(clean(log.data)))return false;
 return BigInt('0x'+clean(log.data))===BigInt(row.amount_units)*10n**BigInt(NETWORKS[row.chain].decimals-6);
}
export async function verifyTransfer(env,row,tx){
 const cfg=web3Settings(env);
 if(cfg.chain!==row.chain)throw Error('network_config_changed');
 const now=seconds();let block,time;
 {
  if(!/^0x[a-f0-9]{64}$/.test(tx))return {code:'bad_tx'};
  const finalBlock=await probeChain(env,cfg),r=await rpc(env,'eth_getTransactionReceipt',[tx]);
  if(!r)return {code:'confirming'};
  if(r.transactionHash?.toLowerCase()!==tx||r.status!=='0x1'||!r.logs?.some(l=>logMatches(l,row)))return {code:'payment_mismatch'};
  block=hexNum(r.blockNumber);if(block>finalBlock)return {code:'confirming'};
  const b=await rpc(env,'eth_getBlockByNumber',[r.blockNumber,false]);
  if(!b||b.hash?.toLowerCase()!==r.blockHash?.toLowerCase())return {code:'confirming'};
  time=hexNum(b.timestamp);
 }
 if(!Number.isSafeInteger(block)||!Number.isSafeInteger(time)||time>now+60||time<row.created||time>row.expires)return {code:'outside_payment_window'};
 return {code:'verified',block,tx,time};
}
export async function deliverWeb3(env,row,proof){
 if(proof.code!=='verified')throw Error('unverified');const db=env.HITS,now=seconds();
 const p=(s,...a)=>db.prepare(s).bind(...a);
 // Unique chain+tx and the whole payment/slot allocation transaction prevent replay.
 await db.batch([
  p(`INSERT OR IGNORE INTO bpj_ad_chain_receipts(chain,tx,order_id,block,amount_units,created) VALUES(?,?,?,?,?,?)`,row.chain,proof.tx,row.id,proof.block,row.amount_units,now),
  p(`UPDATE bpj_ad_web3 SET tx=?,note=NULL WHERE order_id=? AND EXISTS(SELECT 1 FROM bpj_ad_chain_receipts WHERE chain=? AND tx=? AND order_id=?)`,proof.tx,row.id,row.chain,proof.tx,row.id),
  p(`UPDATE bpj_ad_checkout SET paid_at=?,intent=? WHERE id=? AND state='pending' AND EXISTS(SELECT 1 FROM bpj_ad_chain_receipts WHERE chain=? AND tx=? AND order_id=?)`,now,'chain:'+row.chain+':'+proof.tx,row.id,row.chain,proof.tx,row.id),
  // Statements only run for a payment whose receipt belongs to THIS order.
  ...scheduleStatements(db,row,now)
 ]);
 return web3Status(await web3Order(db,row.id));
}
export async function scanOrder(env,row){
 if(row.state!=='pending')return web3Status(row);
 const now=seconds(),db=env.HITS;
 if(web3Settings(env).chain!==row.chain)throw Error('network_config_changed');
 const lease=await db.prepare('UPDATE bpj_ad_web3 SET checked_at=? WHERE order_id=? AND checked_at<=?').bind(now,row.id,now-15).run();
 if(!lease.meta?.changes)return web3Status(row);
 let txs=[];
 {
  const end=await probeChain(env);let from=row.cursor;
  for(let page=0;page<3&&from<=end;page++){
   const to=Math.min(end,from+1999);
   const logs=await rpc(env,'eth_getLogs',[{address:row.contract,fromBlock:'0x'+from.toString(16),toBlock:'0x'+to.toString(16),topics:['0x'+TRANSFER,null,'0x'+row.recipient_hex.padStart(64,'0')]}]);
   if(!Array.isArray(logs))throw Error('chain_unavailable');
   txs.push(...logs.filter(l=>logMatches(l,row)).map(l=>l.transactionHash.toLowerCase()));
   row.nextCursor=to+1;from=to+1;
   if(txs.length)break;
  }
 }
 for(const tx of new Set(txs)){
  const proof=await verifyTransfer(env,row,tx);
  if(proof.code==='verified')return deliverWeb3(env,row,proof);
  if(proof.code==='confirming')return web3Status(row);
 }
 if(row.nextCursor)await db.prepare('UPDATE bpj_ad_web3 SET cursor=MAX(cursor,?) WHERE order_id=?').bind(row.nextCursor,row.id).run();
 return web3Status(row);
}
export async function watchWeb3(env){
 await ensureWeb3(env.HITS);const cfg=web3Settings(env);const height=await probeChain(env,cfg);
 // Do not advertise availability if the RPC silently lacks log scanning.
 const probe=await rpc(env,'eth_getLogs',[{address:cfg.network.contract,fromBlock:'0x'+height.toString(16),toBlock:'0x'+height.toString(16),topics:['0x'+TRANSFER,null,'0x'+cfg.recipient.slice(2).padStart(64,'0')]}]);
 if(!Array.isArray(probe))throw Error('chain_unavailable');
 const rows=await env.HITS.prepare("SELECT c.*,w.* FROM bpj_ad_checkout c JOIN bpj_ad_web3 w ON w.order_id=c.id WHERE c.state='pending' AND w.chain=? AND c.created>? ORDER BY w.checked_at,c.created LIMIT 3").bind(cfg.chain,seconds()-7*86400).all();
 let processed=0;
 for(const row of rows.results||[]){await scanOrder(env,row);processed++;}
 await env.HITS.prepare('INSERT INTO bpj_ad_web3_health(id,checked_at) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at').bind(await healthKey(cfg),seconds()).run();
 return {ok:true,processed};
}
