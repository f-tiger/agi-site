// Curated coverage is an editorial selection, never a ranking or buy list.
export const assets=[
 {symbol:'BTC',id:'bitcoin',name:'Bitcoin',group:'core',home:'https://bitcoin.org/',question:'Is this an asset-specific move or a broader market move?',check:'Compare dated market observations. A simultaneous headline does not establish a cause.'},
 {symbol:'ETH',id:'ethereum',name:'Ethereum',group:'core',home:'https://ethereum.org/',question:'Did the fee budget change, or only the USD price of ETH?',check:'Separate gas units, effective gas price and ETH/USD; verify the transaction estimate.'},
 {symbol:'USDC',id:'usd-coin',name:'USD Coin',group:'stable',home:'https://www.circle.com/transparency',question:'Does a quote near $1 establish settlement or redemption?',check:'Check the exact chain, asset, receipt and issuer terms separately.'},
 {symbol:'USDT',id:'tether',name:'Tether',group:'stable',home:'https://tether.to/en/transparency/',question:'Is the price difference relevant to the payment I received?',check:'Keep the historical settlement rate and fees; do not replace them with a current quote.'},
 {symbol:'TAO',id:'bittensor',name:'Bittensor',group:'ai',home:'https://www.bittensor.com/',question:'Does the evidence show useful demand beyond token incentives?',check:'Look for paid external workloads and accepted outputs. Subnet activity alone does not establish customer revenue.'},
 {symbol:'RENDER',id:'render-token',name:'Render',group:'ai',home:'https://rendernetwork.com/',question:'Did accepted rendering demand change, or only token attention?',check:'Compare completed jobs, customer payments and capacity over the same period. A token move does not measure GPU utilization.'},
 {symbol:'FET',id:'fetch-ai',name:'Fetch.ai / FET',group:'ai',home:'https://www.fetch.ai/',question:'Is an agent announcement supported by repeat use?',check:'Verify released functionality and successful paid tasks. Registered agents are not retained paying users.'},
 {symbol:'AKT',id:'akash-network',name:'Akash',group:'ai',home:'https://akash.network/',question:'Is decentralized compute cheaper for my actual workload?',check:'Include failures, egress, setup and accepted outputs. Token appreciation is not a compute-cost benchmark.'}
];
export const assetIds=assets.map(a=>'coingecko:'+a.id).join(',');
const validPrice=v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1e12;
export function parseResearchPrices(raw,now=Date.now()){
 if(!raw?.coins||typeof raw.coins!=='object')throw Error('invalid_prices');
 return assets.map(a=>{const q=raw.coins['coingecko:'+a.id],at=q?.timestamp*1000;
  if(!q||q.symbol!==a.symbol||!validPrice(q.price)||!Number.isSafeInteger(at)||at>now+300000||now-at>86400000)return {symbol:a.symbol,price:null,sourceUpdatedAt:null,status:'unavailable'};
  return {symbol:a.symbol,price:q.price,sourceUpdatedAt:new Date(at).toISOString(),status:now-at>900000?'stale':'fresh'};
 });
}
export function parseHistory(raw,now=Date.now()){
 if(!raw?.coins||typeof raw.coins!=='object')throw Error('invalid_history');
 return assets.map(a=>{const r=raw.coins['coingecko:'+a.id],p=r?.prices;let points=[];
  if(r?.symbol===a.symbol&&Array.isArray(p)&&p.length>=2&&p.length<=16){
   const good=p.every((x,i)=>validPrice(x.price)&&Number.isSafeInteger(x.timestamp)&&x.timestamp*1000<=now+300000&&now-x.timestamp*1000<=9*86400000&&(!i||x.timestamp>p[i-1].timestamp));
   if(good)points=p.map(x=>({price:x.price,at:new Date(x.timestamp*1000).toISOString()}));
  }
  return {symbol:a.symbol,points};
 });
}
export function changeFrom(q,points,days){
 if(q.status!=='fresh'||!validPrice(q.price)||!Array.isArray(points))return null;
 const at=Date.parse(q.sourceUpdatedAt),target=at-days*86400000;
 const p=points.reduce((best,x)=>!best||Math.abs(Date.parse(x.at)-target)<Math.abs(Date.parse(best.at)-target)?x:best,null);
 if(!p||!validPrice(p.price)||Math.abs(Date.parse(p.at)-target)>7200000)return null;
 return {percent:(q.price/p.price-1)*100,from:p.at,to:q.sourceUpdatedAt};
}
export function makeBaseline(quotes,symbols,now=Date.now()){
 const allowed=new Set(assets.map(a=>a.symbol));const rows=quotes.filter(q=>symbols.includes(q.symbol)&&allowed.has(q.symbol)&&q.status==='fresh'&&validPrice(q.price)&&now-Date.parse(q.sourceUpdatedAt)<=900000&&Date.parse(q.sourceUpdatedAt)<=now+300000).map(({symbol,price,sourceUpdatedAt})=>({symbol,price,sourceUpdatedAt}));
 if(!rows.length)throw Error('Select at least one asset with a fresh price before saving.');
 return {version:1,savedAt:new Date(now).toISOString(),quotes:rows};
}
export function readBaseline(raw,now=Date.now()){
 if(typeof raw!=='string'||raw.length>20000)return null;let v;try{v=JSON.parse(raw);}catch{return null;}
 if(v?.version!==1||!Number.isFinite(Date.parse(v.savedAt))||Date.parse(v.savedAt)>now||now-Date.parse(v.savedAt)>30*86400000||!Array.isArray(v.quotes)||!v.quotes.length||v.quotes.length>assets.length)return null;
 if(new Set(v.quotes.map(q=>q?.symbol)).size!==v.quotes.length||v.quotes.some(q=>!q||!assets.some(a=>a.symbol===q.symbol)||!validPrice(q.price)||!Number.isFinite(Date.parse(q.sourceUpdatedAt))||Date.parse(q.sourceUpdatedAt)>Date.parse(v.savedAt)+300000||Date.parse(v.savedAt)-Date.parse(q.sourceUpdatedAt)>900000))return null;
 return {version:1,savedAt:v.savedAt,quotes:v.quotes.map(({symbol,price,sourceUpdatedAt})=>({symbol,price,sourceUpdatedAt}))};
}
export function compareBaseline(saved,quotes,now=Date.now()){return saved.quotes.map(old=>{const q=quotes.find(x=>x.symbol===old.symbol);return {symbol:old.symbol,from:old.sourceUpdatedAt,to:q?.sourceUpdatedAt||null,percent:q?.status==='fresh'&&validPrice(q.price)&&now-Date.parse(q.sourceUpdatedAt)<=900000&&Date.parse(q.sourceUpdatedAt)<=now+300000&&Date.parse(q.sourceUpdatedAt)>Date.parse(old.sourceUpdatedAt)?(q.price/old.price-1)*100:null};});}
export const reviewFields=['claim','evidence','counter','invalidate','reviewDate'];
export function reviewValue(v){
 if(!v||reviewFields.some(k=>typeof v[k]!=='string'||!v[k].trim()||v[k].length>2000)||!/^\d{4}-\d{2}-\d{2}$/.test(v.reviewDate)||!Number.isFinite(Date.parse(v.reviewDate))||new Date(v.reviewDate).toISOString().slice(0,10)!==v.reviewDate)throw Error('Complete the claim, evidence, counterevidence, invalidation rule and review date.');
 return Object.fromEntries(reviewFields.map(k=>[k,v[k].trim()]));
}
export function reviewMarkdown(v,quotes=[],now=new Date().toISOString()){
 const r=reviewValue(v);return '# My Web3 research note\n\nWritten: '+now+'\nMethod: https://web3.agiscorecard.com/market.html#research-note\n\n'+[['Claim',r.claim],['Supporting evidence / original sources',r.evidence],['Counterevidence / alternative explanation',r.counter],['What would change my mind',r.invalidate],['Review date (manual; no notification)',r.reviewDate]].map(([k,x])=>'## '+k+'\n\n'+x).join('\n\n')+'\n\n## Dated reference context\n\n'+quotes.filter(q=>q.price!==null).map(q=>`${q.symbol}: USD ${q.price}; provider time ${q.sourceUpdatedAt}; status ${q.status}`).join('\n')+'\nSource: https://coins.llama.fi/prices/current/'+assetIds+'\n\nUser-authored note. Claims and causal explanations have not been independently verified. Review source freshness before use. This export does not execute a trade or publish a post.\n';
}
