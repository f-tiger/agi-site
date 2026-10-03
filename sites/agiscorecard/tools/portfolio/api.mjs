import {validateSnapshot} from '../../portfolio-assets/core.mjs';

export const PORTFOLIO_URL='https://agiscorecard.com/portfolio-tracker';
const symbols=['AMD','TSLA','META','MU','NVDA','PLTR','SPCX','AMZN','GOOGL','MSFT','NOW','PANW','SPY','QQQ','TQQQ'];
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');

// One read model for HTTP, MCP and SunWatch. Never use intraday quotes here.
export async function portfolioData(env,{include_history=false,now=Date.now()}={}){
 const read=async path=>{const r=await env.ASSETS.fetch(new Request('https://agiscorecard.com/portfolio-assets/'+path));if(!r.ok)throw Error('asset_unavailable');return r.json();};
 const [raw,m]=await Promise.all([read('snapshot.json'),read('manifest.json')]);
 const s=validateSnapshot(raw);
 if(m.id!==s.cohort||m.entry_session!==s.entry_session||[...m.stocks,...m.benchmarks].map(x=>x.ticker).join()!==symbols.join())throw Error('manifest_mismatch');
 if(s.dates.length&&symbols.some(k=>!Number.isFinite(s.entry_adjusted_close?.[k])||s.entry_adjusted_close[k]<=0))throw Error('entry_prices_missing');
 if(Date.parse(s.attempted_at)>now+300000||s.as_of>new Date(now).toISOString().slice(0,10))throw Error('future_record');
 const age=now-Date.parse(s.last_success_at);
 const expired=s.dates.length&&(!Number.isFinite(age)||age>4*86400000);
 const status=expired?'stale':s.status;
 const row=x=>({ticker:x.ticker,name:x.name,initial_weight:m.stocks.includes(x)?1/12:1,entry_adjusted_close:s.entry_adjusted_close?.[x.ticker]??null,...(s.metrics?.[x.ticker]??{return_pct:null,max_drawdown_pct:null,excess_spy_pp:null})});
 const valuation_id=s.as_of?await digest([s.cohort,s.manifest_sha256,s.dates,symbols.map(k=>[k,s.entry_adjusted_close[k],s.series[k]]),s.series.basket,[...symbols,'basket'].map(k=>[k,s.metrics[k].return_pct,s.metrics[k].max_drawdown_pct,s.metrics[k].excess_spy_pp])]):null;
 return {schema_version:1,cohort:s.cohort,manifest_sha256:s.manifest_sha256,status,valuation_id,entry_session:s.entry_session,as_of:s.as_of,attempted_at:s.attempted_at,last_success_at:s.last_success_at??null,
  freshness:{expired,reason:expired?'last_success_over_96_hours':s.failure_reason??null},currency:'USD',notional_per_portfolio:10000,
  basket:{ticker:'basket',name:'12-stock equal-initial-weight buy-and-hold',...(s.metrics?.basket??{return_pct:null,max_drawdown_pct:null,excess_spy_pp:null})},
  stocks:m.stocks.map(row),benchmarks:m.benchmarks.map(row),
  provider:s.provider,return_basis:m.return_basis,weight_rule:m.weight_rule,revisions:s.revisions??[],
  ...(include_history?{dates:s.dates,series:s.series}:{}),
  links:{page:PORTFOLIO_URL,zh_page:'https://agiscorecard.com/zh/portfolio-tracker',manifest:PORTFOLIO_URL.replace('/portfolio-tracker','/portfolio-assets/manifest.json'),snapshot:PORTFOLIO_URL.replace('/portfolio-tracker','/portfolio-assets/snapshot.json')},
  limitations:['Model portfolio, not actual trades or a return guarantee.','SPY is an ETF proxy for the S&P 500.','TQQQ targets 3x DAILY Nasdaq-100 performance, not 3x long-term returns.','Valuations use completed adjusted daily closes, not live quotes.']};
}

export async function portfolioRoute(request,env){
 const url=new URL(request.url);if(url.pathname!=='/api/portfolio')return null;
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'};
 if(request.method!=='GET')return new Response(JSON.stringify({error:'GET only'}),{status:405,headers:{...headers,allow:'GET'}});
 try{return new Response(JSON.stringify(await portfolioData(env,{include_history:url.searchParams.get('history')==='1'})),{headers});}
 catch{return new Response(JSON.stringify({schema_version:1,status:'data_unavailable',error:'Validated portfolio data unavailable; no return inferred.',links:{page:PORTFOLIO_URL}}),{status:503,headers});}
}
