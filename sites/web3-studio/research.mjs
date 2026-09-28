import {assets,assetIds,parseResearchPrices,parseHistory,changeFrom} from './public/research-core.mjs';
import {readSource,escape as h} from './market.mjs';
const memory=new Map(),pending=new Map(),attempts=new Map();
const ttl={prices:300,history:3600};
const currentUrl='https://coins.llama.fi/prices/current/'+assetIds;
async function load(kind){
 const now=Date.now(),end=Math.floor(now/3600000)*3600;
 const url=kind==='prices'?currentUrl:'https://coins.llama.fi/chart/'+assetIds+'?start='+(end-7*86400)+'&span=8&period=1d';
 const raw=await readSource(url);const rows=kind==='prices'?parseResearchPrices(raw,now):parseHistory(raw,now);
 if(rows.every(r=>kind==='prices'?r.price===null:!r.points.length))throw Error('empty_source');
 return {rows,url,retrievedAt:new Date().toISOString()};
}
export function sourceState(saved,kind,now=Date.now(),failed=false){const age=(now-Date.parse(saved?.retrievedAt))/1000;
 if(!saved||!Number.isFinite(age)||age<0||age>86400)return {rows:[],url:kind==='prices'?currentUrl:null,retrievedAt:null,status:'unavailable'};
 return {...saved,status:failed||age>ttl[kind]?'stale':'fresh'};
}
async function cached(kind){const cache=globalThis.caches?.default,key='https://web3.agiscorecard.com/__research/v1/'+kind;let old=memory.get(kind);
 if(!old&&cache)try{old=await(await cache.match(key))?.json();}catch{}
 if(sourceState(old,kind).status==='fresh')return sourceState(old,kind);
 if(pending.has(kind))return pending.get(kind);
 if(Date.now()-(attempts.get(kind)||0)<30000)return sourceState(old,kind,Date.now(),true);attempts.set(kind,Date.now());
 const promise=(async()=>{try{const value=await load(kind);memory.set(kind,value);if(cache)try{await cache.put(key,new Response(JSON.stringify(value),{headers:{'Cache-Control':'public,max-age=86400','Content-Type':'application/json'}}));}catch{}return sourceState(value,kind);}catch{return sourceState(old,kind,Date.now(),true);}finally{pending.delete(kind);}})();pending.set(kind,promise);return promise;
}
export function researchResult(prices,history,now=Date.now()){
 const rows=assets.map(a=>{const q=prices.rows.find(q=>q.symbol===a.symbol)||{symbol:a.symbol,price:null,sourceUpdatedAt:null},age=now-Date.parse(q.sourceUpdatedAt);
  const status=q.price===null||!Number.isFinite(age)||age>86400000?'unavailable':prices.status!=='fresh'||age>900000||age< -300000?'stale':'fresh';
  const quote={...q,status,...(status==='unavailable'?{price:null}:{} )},series=history.status==='fresh'?(history.rows.find(x=>x.symbol===a.symbol)?.points||[]):[];
  return {...quote,group:a.group,points:series,day:changeFrom(quote,series,1),week:changeFrom(quote,series,7)};
 });
 return {status:prices.status,retrievedAt:prices.retrievedAt,historyStatus:history.status,historyRetrievedAt:history.retrievedAt,source:{name:'DefiLlama',url:prices.url,historyUrl:history.url},quotes:rows,coverage:'Curated research set, not an index or ranking. Read each row status: a fresh request can contain an older provider price.',historyMethod:'Daily samples, not candles. Changes use the nearest sample within 2 hours of 1 or 7 days before the current provider timestamp. Missing comparisons remain null.'};
}
export async function researchSnapshot(){const [p,h]=await Promise.all([cached('prices'),cached('history')]);return researchResult(p,h);}
function updatesMarkup(d){const u=d.updates;if(!u)return '';return `<section class="research-updates"><h2>Official updates to investigate</h2><p class="quiet">${h(u.status)}. Protocol-wide context, not an explanation of token-price moves. Dates below are publication dates.</p><ol>${u.items.map(x=>`<li><a href="${h(x.url)}" rel="noreferrer">${h(x.title)}</a><small>${h(x.source)} · ${h(x.publishedAt.slice(0,10))} · ${x.kind==='commits'?'Code commit, not a release':'Publisher metadata'}</small></li>`).join('')}</ol><a href="/briefs.html">Read all sources and status</a></section>`;}
const pct=n=>n===null?'—':(n.percent>=0?'+':'')+n.percent.toFixed(2)+'%';
function spark(q){if(q.points.length<2)return '<span class="quiet">History unavailable</span>';const points=q.points,min=Math.min(...points.map(p=>p.price)),max=Math.max(...points.map(p=>p.price)),t0=Date.parse(points[0].at),span=Date.parse(points.at(-1).at)-t0;
 const coordinates=points.map(p=>((Date.parse(p.at)-t0)/span*126+2).toFixed(1)+','+(max===min?22:40-(p.price-min)/(max-min)*36).toFixed(1)).join(' ');
 return `<svg class="price-spark" viewBox="0 0 130 44" role="img" aria-label="${h(q.symbol)} daily price samples over seven days"><title>${h(q.symbol)}: daily samples; independently scaled, not candles.</title><polyline points="${coordinates}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}
export function researchMarkup(d){
 const valid=d.quotes.filter(q=>q.status==='fresh'),moves=valid.filter(q=>q.day&&q.group!=='stable').sort((a,b)=>Math.abs(b.day.percent)-Math.abs(a.day.percent)),lead=moves[0];
 return `<div id="research-data" data-snapshot="${h(JSON.stringify(d))}" hidden></div><p class="source-state" data-source-state="${h(d.status)}">Price retrieval: ${h(d.status)}${d.retrievedAt?' · '+h(d.retrievedAt):''}. ${valid.length}/${assets.length} provider prices within 15 minutes. History: ${h(d.historyStatus)}.</p><div class="research-pulse"><div><h2>Start with what changed</h2><p>${lead?`<strong>${h(lead.symbol)} ${pct(lead.day)}</strong> is the largest absolute 1-day sampled move in this selected set.`:'A current comparison is not available. Check individual source times below.'}</p><p class="quiet">Price movement identifies a question to investigate. It does not explain the cause.</p></div><a href="#research-note">Record a view to revisit</a></div><div class="table-scroll"><table class="research-table"><caption>USD reference prices. 1d / 7d changes use daily samples; each chart has its own scale.</caption><thead><tr><th>Watch</th><th>Asset</th><th>Price / freshness</th><th>1d ≈</th><th>7d ≈</th><th>7-day path</th><th>Investigate</th></tr></thead><tbody>${d.quotes.map(q=>{const a=assets.find(a=>a.symbol===q.symbol);return `<tr data-asset="${q.symbol}" data-group="${a.group}"><td><input type="checkbox" data-watch="${q.symbol}" aria-label="Watch ${q.symbol}"></td><th scope="row">${q.symbol}<small>${h(a.name)}</small></th><td>${q.price===null?'Unavailable':'$'+q.price.toLocaleString('en-US',{maximumFractionDigits:q.price<2?6:2})}<small class="quote-${q.status}">${h(q.status)}${q.sourceUpdatedAt?' · '+h(q.sourceUpdatedAt.slice(11,19))+' UTC':''}</small></td><td class="${q.day?.percent<0?'price-down':'price-up'}" title="${q.day?h(q.day.from+' → '+q.day.to):'No comparable fresh observations'}">${pct(q.day)}</td><td class="${q.week?.percent<0?'price-down':'price-up'}">${pct(q.week)}</td><td>${spark(q)}</td><td><button type="button" class="research-question" data-question="${q.symbol}">Review ${q.symbol}</button></td></tr>`;}).join('')}</tbody></table></div><p class="quiet">Data: <a href="${h(d.source.url||currentUrl)}" rel="noreferrer">DefiLlama current prices</a>${d.source.historyUrl?' · <a href="'+h(d.source.historyUrl)+'" rel="noreferrer">Dated history samples</a>':''}. Missing or stale data never becomes a signal. <a href="/api/research">JSON with exact comparison dates</a>.</p>${updatesMarkup(d)}`;
}
