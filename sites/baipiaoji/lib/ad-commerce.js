// Payment state is private. Public listings expose only delivery fields.
export const CATS = ['chat','coding','image','design','video','audio','office','writing','search','study','agent','api','safety','local'];
export const json = (value, status=200) => new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'}});
export const SCHEMA = [
`CREATE TABLE IF NOT EXISTS bpj_ad_checkout (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, pitch TEXT NOT NULL,
 cat TEXT NOT NULL, lang TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>0), currency TEXT NOT NULL,
 days INTEGER NOT NULL CHECK(days>0), livemode INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'creating',
 session TEXT UNIQUE, intent TEXT UNIQUE, created INTEGER NOT NULL, paid_at INTEGER,
 slot INTEGER CHECK(slot BETWEEN 1 AND 3), starts_at INTEGER, ends_at INTEGER, total_cents INTEGER, tax_cents INTEGER
)`,
`CREATE INDEX IF NOT EXISTS bpj_ad_delivery ON bpj_ad_checkout(cat,state,slot,ends_at)`,
`CREATE TABLE IF NOT EXISTS bpj_ad_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created INTEGER NOT NULL)`,
`CREATE TABLE IF NOT EXISTS bpj_ad_reversals (intent TEXT PRIMARY KEY, reason TEXT NOT NULL, created INTEGER NOT NULL)`
];
export async function ensure(db) { await db.batch(SCHEMA.map(s=>db.prepare(s))); }
export const seconds = ()=>Math.floor(Date.now()/1000);
export async function digest(value) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join(''); }
export function settings(env) {
 const price=Number(env.ADS_PRICE_CENTS), days=Number(env.ADS_DAYS||30), currency=String(env.ADS_CURRENCY||'EUR').toLowerCase();
 const valid=Number.isSafeInteger(price)&&price>0&&price<=1000000&&Number.isSafeInteger(days)&&days>0&&days<=366&&['eur','usd','gbp'].includes(currency);
 const mode=env.ADS_STRIPE_MODE||'live';
 const key=String(env.STRIPE_SECRET_KEY||'');
 const keyOK=['live','test'].includes(mode)&&(mode==='test'?/^(sk|rk)_test_/:/^(sk|rk)_live_/).test(key);
 let origin=String(env.ADS_PUBLIC_ORIGIN||'https://baipiaoji.com');
 let originOK=false;try{const u=new URL(origin);originOK=u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash;origin=u.origin;}catch{}
 return {price,days,currency,mode,origin,valid,ready:valid&&originOK&&!!env.HITS&&keyOK&&!!env.STRIPE_WEBHOOK_SECRET};
}
export function validate(b) {
 const name=String(b.name||'').trim(), pitch=String(b.pitch||'').trim();
 if(!name||name.length>60||!pitch||pitch.length>140||!CATS.includes(b.cat))return {error:'missing'};
 let u;try{u=new URL(String(b.url||''));}catch{return {error:'badurl'};}
 if(u.protocol!=='https:')return {error:'nothttps'};
 const host=u.hostname.toLowerCase();
 if(u.username||u.password||u.port||host.includes(':')||!host.includes('.')||/^[\d.]+$/.test(host)||/\.(localhost|local|internal|test|invalid|example)$/.test(host)||host==='localhost'||u.href.length>300)return {error:'badhost'};
 if(/https?:\/\/|www\.|[<>\x00-\x1f]/i.test(pitch)||/[<>\x00-\x1f]/.test(name))return {error:'nolinks'};
 const banned=['casino','gambling','betting','porn','escort','nsfw','crack','keygen','nulled','phishing','airdrop','forex signal','博彩','赌博','色情','成人','破解','私服','刷单','代开'];
 if(banned.some(w=>(name+' '+pitch+' '+host).toLowerCase().includes(w)))return {error:'refused'};
 return {name,pitch,url:u.href,cat:b.cat,lang:b.lang==='en'?'en':'zh'};
}
export async function stripe(env,path,form,key) {
 const headers={Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Stripe-Version':'2025-06-30.basil'};
 if(form)headers['Content-Type']='application/x-www-form-urlencoded';
 if(key)headers['Idempotency-Key']=key;
 const r=await fetch('https://api.stripe.com/v1/'+path,{method:form?'POST':'GET',headers,body:form?new URLSearchParams(form):undefined,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('payment_provider_unavailable');
 return r.json();
}
export async function signature(secret,header,raw) {
 const fields=String(header||'').split(',').map(x=>x.trim().split('='));
 const t=fields.find(x=>x[0]==='t')?.[1];
 if(!/^\d+$/.test(t||'')||Math.abs(seconds()-Number(t))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw));
 const want=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
 return fields.filter(x=>x[0]==='v1').some(([,sig])=>{if(sig.length!==want.length)return false;let d=0;for(let i=0;i<want.length;i++)d|=sig.charCodeAt(i)^want.charCodeAt(i);return d===0;});
}
export function publicStatus(row,now=seconds()) {
 let state=row.state;
 if(state==='paid')state=now<row.starts_at?'queued':now>=row.ends_at?'expired':'live';
 return {ok:true,id:row.id,state,slot:row.slot,starts_at:row.starts_at?new Date(row.starts_at*1000).toISOString():null,ends_at:row.ends_at?new Date(row.ends_at*1000).toISOString():null,cat:row.cat};
}
// All statements run in ONE D1 transaction. Lane selection is serialized with the
// update, so two concurrent payments cannot reserve the same lane/time interval.
export async function fulfill(db,s,eventID,eventType,now=seconds()) {
 const id=s.metadata?.bpj_order;
 const row=await db.prepare('SELECT * FROM bpj_ad_checkout WHERE id=?').bind(id||'').first();
 if(!row)throw Error('order_not_found');
 if(s.payment_status!=='paid')return {ok:true,code:'unpaid'};
 const tax=Number(s.total_details?.amount_tax||0);
 if(s.mode!=='payment'||s.client_reference_id!==id||!/^cs_/.test(s.id||'')||!/^pi_/.test(s.payment_intent||'')||
    Number(s.livemode)!==row.livemode||(row.session&&row.session!==s.id)||
    s.amount_subtotal!==row.price_cents||s.currency!==row.currency||
    !Number.isSafeInteger(tax)||tax<0||s.amount_total!==row.price_cents+tax||
    Number(s.total_details?.amount_discount||0)!==0||Number(s.total_details?.amount_shipping||0)!==0)
   return {ok:false,code:'payment_mismatch'};
 const active=['creating','pending'].includes(row.state);
 if(!active)return {ok:true,code:'already',...publicStatus(row,now)};
 const p=(sql,...args)=>db.prepare(sql).bind(...args);
 await db.batch([
  p(`UPDATE bpj_ad_checkout SET session=?,intent=?,total_cents=?,tax_cents=?,paid_at=?,
    state=COALESCE((SELECT reason FROM bpj_ad_reversals WHERE intent=?),'pending')
    WHERE id=? AND state IN ('creating','pending')`,s.id,s.payment_intent,s.amount_total,tax,now,s.payment_intent,id),
  p(`UPDATE bpj_ad_checkout SET slot=(
    WITH lanes(n) AS (VALUES(1),(2),(3)) SELECT n FROM lanes
    ORDER BY MAX(?,COALESCE((SELECT MAX(ends_at) FROM bpj_ad_checkout q WHERE q.cat=bpj_ad_checkout.cat AND q.livemode=bpj_ad_checkout.livemode AND q.slot=n AND q.state='paid'),0)),n LIMIT 1
    ) WHERE id=? AND state='pending' AND starts_at IS NULL`,now,id),
  p(`UPDATE bpj_ad_checkout SET starts_at=MAX(?,COALESCE((SELECT MAX(q.ends_at) FROM bpj_ad_checkout q
    WHERE q.id<>bpj_ad_checkout.id AND q.cat=bpj_ad_checkout.cat AND q.livemode=bpj_ad_checkout.livemode AND q.slot=bpj_ad_checkout.slot AND q.state='paid'),0))
    WHERE id=? AND state='pending' AND starts_at IS NULL`,now,id),
  p(`UPDATE bpj_ad_checkout SET ends_at=starts_at+days*86400,state='paid' WHERE id=? AND state='pending' AND starts_at IS NOT NULL`,id),
  p('INSERT OR IGNORE INTO bpj_ad_events(id,type,created) VALUES(?,?,?)',eventID,eventType,now)
 ]);
 return publicStatus(await p('SELECT * FROM bpj_ad_checkout WHERE id=?',id).first(),now);
}
