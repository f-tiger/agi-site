import {ensureWeb3,web3Health} from '../../lib/ad-web3.js';
import {json,settings,ensure,seconds} from '../../lib/ad-commerce.js';
export async function onRequestGet({request,env}) {
 const u=new URL(request.url),cfg=settings(env);
 if(u.searchParams.get('doctor')==='1'){
  let database=false;
  try{if(env.HITS){await ensureWeb3(env.HITS);database=true;}}catch{}
  const wallet=await web3Health(env);
  const blockers=[];
  if(!env.STRIPE_SECRET_KEY)blockers.push('缺 STRIPE_SECRET_KEY：服务端无法创建结账订单');
  if(!env.STRIPE_WEBHOOK_SECRET)blockers.push('缺 STRIPE_WEBHOOK_SECRET：无法验签到账通知');
  if(!cfg.valid)blockers.push('价格、币种或投放天数配置无效');
  if(!database)blockers.push('订单数据库不可用');
  if(env.STRIPE_SECRET_KEY&&!cfg.ready)blockers.push('检查 Stripe key 与 ADS_STRIPE_MODE 是否匹配');
  if(!wallet.ready)blockers.push('Web3 待配置或后台链上核验尚未正常运行');
  return json({ok:true,selling:(cfg.ready||wallet.ready)&&database,mode:wallet.ready?(wallet.network.live?'live':'test'):cfg.mode,
   rails:{card:cfg.ready&&database,wallet:wallet.ready&&database},
   configured:{stripe_api:!!env.STRIPE_SECRET_KEY,stripe_webhook:!!env.STRIPE_WEBHOOK_SECRET,database,
    payment_link:!!env.ADS_PAYMENT_LINK,wallet:!!env.ADS_WALLET,claim_secret:!!env.ADS_WATCH_SECRET},
   web3:{configured:wallet.configured,enabled:wallet.enabled,watch_healthy:wallet.healthy,chain:wallet.chain,token:wallet.network?.token||'',price_cents:wallet.cents,quote_extra_max:'0.009999'},
   price_cents:cfg.price||0,currency:cfg.currency.toUpperCase(),days:cfg.days,slots:3,blockers,
   hint:'配置齐全不代表已完成真实付款验收。新订单支持 Web3 与 Stripe；Web3 按链上已确认的精确金额验款。旧订单继续保留。'});
 }
 if(!env.HITS)return json({ok:false,ads:[]},503);
 const cat=String(u.searchParams.get('cat')||''),now=seconds();
 try{
  await ensure(env.HITS);
  const sql="SELECT id,name,url,pitch,cat,slot FROM bpj_ad_checkout WHERE state='paid' AND livemode=1 AND starts_at<=? AND ends_at>?";
  const result=await (cat?env.HITS.prepare(sql+' AND cat=? ORDER BY slot,id').bind(now,now,cat):env.HITS.prepare(sql+' ORDER BY cat,slot,id').bind(now,now)).all();
  // Grandfather existing contracts; never silently hide a paid legacy placement.
  const today=new Date(now*1000).toISOString().slice(0,10);
  const old=await (cat?env.HITS.prepare("SELECT id,name,url,pitch,cat FROM ads WHERE status='live' AND expires>=? AND cat=? ORDER BY paid_at,id").bind(today,cat):env.HITS.prepare("SELECT id,name,url,pitch,cat FROM ads WHERE status='live' AND expires>=? ORDER BY paid_at,id").bind(today)).all().catch(e=>{if(/no such table/i.test(String(e)))return {results:[]};throw e;});
  return json({ok:true,ads:[...(result.results||[]),...(old.results||[])]});
 }catch{return json({ok:false,ads:[],code:'temporarily_unavailable'},503);}
}
