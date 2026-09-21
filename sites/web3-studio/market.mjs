export const marketSource='https://coins.llama.fi/prices/current/coingecko:bitcoin,coingecko:ethereum,coingecko:usd-coin,coingecko:tether';
export const marketMethod='https://api-docs.defillama.com/';
export const feeds=[
 {id:'ethereum',name:'Ethereum Foundation',url:'https://blog.ethereum.org/en/feed.xml',home:'https://blog.ethereum.org/',kind:'rss',task:'protocol-change'},
 {id:'x402',name:'x402 Foundation repository',url:'https://api.github.com/repos/x402-foundation/x402/commits?per_page=5',home:'https://github.com/x402-foundation/x402',kind:'commits',task:'stablecoin'},
 {id:'ezkl',name:'EZKL releases',url:'https://api.github.com/repos/zkonduit/ezkl/releases?per_page=5',home:'https://github.com/zkonduit/ezkl/releases',kind:'releases',task:'gas'}
];
const duration={market:300,briefs:3600};
const memory=new Map(),pending=new Map(),attempts=new Map();
const failureCode=e=>/^source_http_\d+$|^invalid_[a-z_]+$|^missing_pair$|^source_too_large$|^all_sources_unavailable$/.test(e?.message)?e.message:/redirect/i.test(e?.message)?'source_redirect_error':/timeout|abort/i.test(e?.name+' '+e?.message)?'source_timeout':e?.name==='TypeError'?'source_type_error':'source_unavailable';
const stamp=()=>new Date().toISOString();
export const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function number(v){const n=Number(v);if(v===null||v===''||!Number.isFinite(n)||n<=0||n>1e12)throw Error('invalid_source_value');return n;}
export function parsePrices(raw,now=Date.now()){
 if(!raw?.coins)throw Error('invalid_prices');
 return [['BTC','bitcoin'],['ETH','ethereum'],['USDC','usd-coin'],['USDT','tether']].map(([symbol,id])=>{
  const row=raw.coins['coingecko:'+id];if(!row||row.symbol!==symbol)throw Error('missing_pair');
  const price=number(row.price),time=number(row.timestamp)*1000;
  if(!Number.isSafeInteger(time)||time>now+300000||now-time>86400000)throw Error('invalid_source_timestamp');
  return {symbol,quote:'USD',price,sourceUpdatedAt:new Date(time).toISOString(),deviationBps:symbol.startsWith('USD')?(price-1)*10000:null};
 });
}
export async function readSource(url,json=true){
 const r=await fetch(url,{headers:{Accept:json?'application/json':'application/rss+xml, application/xml','User-Agent':'Web3Workbench/1.3 (+https://web3.agiscorecard.com/market.html)'},signal:AbortSignal.timeout(7000),redirect:'manual'});
 if(!r.ok)throw Error('source_http_'+r.status);const reader=r.body.getReader();let size=0,text='';const decoder=new TextDecoder();
 while(true){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>1048576){await reader.cancel();throw Error('source_too_large');}text+=decoder.decode(v.value,{stream:true});}text+=decoder.decode();return json?JSON.parse(text):text;
}
const decode=s=>String(s).replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1').replace(/&(?:amp|lt|gt|quot|apos);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[x])).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const field=(s,k)=>decode((s.match(new RegExp('<'+k+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+k+'>','i'))||[])[1]||'');
export function parseFeed(raw,source,now=Date.now()){
 let rows;
 if(source.kind==='rss'){
  if(typeof raw!=='string'||!/<rss\b/.test(raw)||/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('invalid_feed');
  rows=[...raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)].map(m=>({title:field(m[1],'title'),url:field(m[1],'link'),publishedAt:field(m[1],'pubDate')}));
 }else{
  if(!Array.isArray(raw))throw Error('invalid_feed');
  rows=raw.filter(r=>source.kind!=='releases'||(!r.draft&&!r.prerelease)).map(r=>({title:source.kind==='commits'?r.commit?.message?.split('\n')[0]:(r.name||r.tag_name),url:r.html_url,publishedAt:source.kind==='commits'?r.commit?.committer?.date:r.published_at}));
 }
 return rows.filter(r=>{
  const d=Date.parse(r.publishedAt);if(!r.title||r.title.length>500||!Number.isFinite(d)||d>now+300000||now-d>180*86400000)return false;
  try{const u=new URL(r.url),h=new URL(source.home);return u.protocol==='https:'&&u.origin===h.origin&&(!u.username&&!u.password)&&(h.pathname==='/'||u.pathname.startsWith(h.pathname.replace(/\/releases$/,'')+'/'));}catch{return false;}
 }).slice(0,5).map(r=>({title:decode(r.title).slice(0,160),url:r.url,publishedAt:new Date(r.publishedAt).toISOString(),source:source.name,sourceId:source.id,kind:source.kind,task:source.task}));
}
async function collect(kind){
 if(kind==='market')return {quotes:parsePrices(await readSource(marketSource)),source:{name:'DefiLlama current prices',url:marketSource,method:marketMethod},timestampMeaning:'sourceUpdatedAt is the provider price timestamp; retrievedAt is our receipt time. Prices older than 15 minutes are marked stale. No 24-hour change or executable quote is inferred.'};
 const sources=await Promise.all(feeds.map(async s=>{try{return {id:s.id,name:s.name,url:s.home,status:'ok',checkedAt:stamp(),items:parseFeed(await readSource(s.url,s.kind!=='rss'),s)};}catch(e){return {id:s.id,name:s.name,url:s.home,status:'unavailable',checkedAt:stamp(),reason:failureCode(e),items:[]};}}));
 if(sources.every(s=>s.status!=='ok'))throw Object.assign(Error('all_sources_unavailable'),{sources});
 return {sources,items:sources.flatMap(s=>s.items).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)),scope:'Official headlines and code/release metadata only. Source publication is not independent verification or an automatic change to our calculator assumptions.'};
}
export function state(saved,kind,now=Date.now(),failed=false){
 const age=saved?Math.floor((now-Date.parse(saved.retrievedAt))/1000):null;
 if(!saved||age<0||age>86400)return {kind,status:'unavailable',retrievedAt:null,ageSeconds:null,refreshSeconds:duration[kind],quotes:[],items:[],sources:[],reason:'No usable source snapshot; do not substitute example values.'};
 return {...saved,kind,status:failed||age>duration[kind]||(kind==='market'&&(saved.quotes||[]).some(q=>q.sourceUpdatedAt&&now-Date.parse(q.sourceUpdatedAt)>900000))?'stale':'fresh',ageSeconds:age,refreshSeconds:duration[kind],...(failed?{reason:'Refresh failed; retained snapshot is not current.'}:{})};
}
export async function snapshot(kind,cache=globalThis.caches?.default){
 const key='https://web3.agiscorecard.com/__public_cache/v2/'+kind;let saved=memory.get(kind);
 if(!saved&&cache){try{const r=await cache.match(key);if(r)saved=await r.json();}catch{}}
 const age=saved?(Date.now()-Date.parse(saved.retrievedAt))/1000:Infinity;
 if(age>=0&&age<=duration[kind])return state(saved,kind);
 if(pending.has(kind))return pending.get(kind);
 if(Date.now()-(attempts.get(kind)||0)<30000)return state(saved,kind,Date.now(),true);attempts.set(kind,Date.now());
 const work=(async()=>{try{
  const result={...await collect(kind),retrievedAt:stamp()};memory.set(kind,result);
  if(cache)try{await cache.put(key,new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=86400'}}));}catch{}
  return state(result,kind);
 }catch(e){return {...state(saved,kind,Date.now(),true),failureCode:failureCode(e),...(e.sources?{sourceFailures:e.sources.map(({id,reason})=>({id,reason}))}:{})};}finally{pending.delete(kind);}})();pending.set(kind,work);return work;
}
export function marketMarkup(d){
 const rows=(d.quotes||[]).map(q=>`<tr><th scope="row">${escape(q.symbol)} / USD</th><td>$${q.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6})}</td><td>${escape(q.sourceUpdatedAt)}</td><td>${q.deviationBps===null?'—':q.deviationBps.toFixed(1)+' bps'}</td></tr>`).join('');
 return `<p class="source-state" data-source-state="${escape(d.status)}">${d.status==='fresh'?'Recently retrieved':d.status==='stale'?'Stale snapshot — refresh failed or overdue':'Market source unavailable'}${d.retrievedAt?' · Retrieved '+escape(d.retrievedAt):''}</p>${rows?`<div class="table-scroll"><table><caption>DefiLlama aggregated reference prices. Not an executable quote.</caption><thead><tr><th>Pair</th><th>Reference price</th><th>Source timestamp (UTC)</th><th>Difference from $1</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p>Prices could not be retrieved. You can still use the worksheets with your own dated records. No example price is substituted.</p>'}<p class="quiet">Provider time and receipt time are different. Prices older than 15 minutes are marked stale. Price cache: 5 minutes per edge location. Browser refresh: every minute while visible. A quote does not establish settlement, redeemability or reserve backing. <a href="${marketMethod}" rel="noreferrer">Source field definitions</a> · <a href="/api/market">JSON snapshot</a></p>`;
}
export function briefsMarkup(d){return `<p class="source-state" data-source-state="${escape(d.status)}">${escape(d.status)}${d.retrievedAt?' · Checked '+escape(d.retrievedAt):''}. Refresh on request after one hour.</p>`+(d.sources||[]).map(s=>`<p class="quiet">${escape(s.name)}: ${escape(s.status)}${s.status==='ok'&&!s.items.length?' · no eligible recent records':''}</p>`).join('')+((d.items||[]).length?`<ol class="brief-list">${d.items.map(x=>`<li><p class="quiet">${escape(x.source)} · <time datetime="${escape(x.publishedAt)}">${escape(x.publishedAt.slice(0,10))}</time> · ${x.kind==='commits'?'Code change, not a released feature':x.kind==='releases'?'Project release':'Publisher announcement'}</p><h3><a href="${escape(x.url)}" rel="noreferrer">${escape(x.title)}</a></h3><p><a data-track="tool_open" href="/${x.task==='stablecoin'?'stablecoin-payment-check':x.task==='gas'?'gas-budget-check':'protocol-change-check'}.html?via=protocol-change">Review what this could change in your workflow</a></p></li>`).join('')}</ol>`:'<p>No recent official records are available from this snapshot. Use the source links and preserve your current assumptions until you verify a change.</p>');}
export function rss(d){return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Web3 Workbench official-source watch</title><link>https://web3.agiscorecard.com/briefs.html</link><description>Source status: ${escape(d.status)}. Metadata and links; no investment signals.</description>${(d.items||[]).map(x=>`<item><title>${escape(x.source+': '+x.title)}</title><link>${escape(x.url)}</link><guid>${escape(x.url)}</guid><pubDate>${new Date(x.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;}
