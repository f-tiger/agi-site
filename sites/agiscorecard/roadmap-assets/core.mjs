export function safeURL(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function validateWatch(input,companies){
 if(!Array.isArray(input)||input.length>50)throw Error('invalid_watch');
 const allowed=new Set(companies.map(x=>x.ticker));
 return [...new Set(input.filter(x=>typeof x==='string'&&allowed.has(x)))];
}
export function candidates(discovery,routes,interviews,now=Date.now()){
 const reviewedVideos=new Set(Object.values(interviews).map(x=>x.video).filter(Boolean));
 const reviewedURLs=new Set(Object.values(interviews).map(x=>x.source));
 const seen=new Set();
 return (discovery.items??[]).filter(x=>{
  const t=Date.parse(x.publishedAt);
  return ['video','audio'].includes(x.medium)&&Number.isFinite(t)&&t<=now&&now-t<90*86400000&&safeURL(x.url)&&!reviewedURLs.has(x.url)&&!reviewedVideos.has(x.videoId);
 }).map(x=>({...x,route_ids:routes.filter(r=>r.keywords.some(k=>x.title.toLowerCase().includes(k))).map(r=>r.id)}))
 .filter(x=>x.route_ids.length&&!seen.has(x.url)&&seen.add(x.url)).slice(0,100)
 .map(x=>({id:x.id,title:String(x.title).slice(0,220),url:safeURL(x.url),published_at:x.publishedAt,first_seen_at:x.firstSeenAt,route_ids:x.route_ids,status:'metadata_only',medium:x.medium}));
}
export function renderBrief(data,watch,lang='en'){
 const zh=lang==='zh',lines=[zh?'# AI 路线观察清单':'# AI roadmap watchlist',`${zh?'观点复核':'Editorial review'}: ${data.reviewed_at}`,zh?'仅本机观察清单；没有创建持仓、个人推送或交易。':'Local watchlist only; no holdings, personal subscription or trades created.'];
 for(const ticker of validateWatch(watch,data.companies)){
  const c=data.companies.find(x=>x.ticker===ticker),rs=data.routes.filter(r=>r.tickers.includes(ticker));
  lines.push(`\n## ${ticker} · ${c.name}`,c.role[lang],`${zh?'核对':'Check'}: ${c.check[lang]}`,`${zh?'风险':'Risk'}: ${c.risk[lang]}`,`${zh?'原始证据':'Source'}: ${c.source}`);
  for(const r of rs)lines.push(`- ${r.name[lang]}: ${r.confirm[lang]} / ${r.invalidate[lang]}`);
 }
 lines.push('\nhttps://agiscorecard.com/'+(zh?'zh/':'')+'invest');return lines.join('\n');
}
