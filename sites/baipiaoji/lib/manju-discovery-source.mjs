export const SOURCE='https://www.duanjubaike.net';
export const CRAWLER='BPJManjuDirectory/1.0 (+https://baipiaoji.com/manju/method)';
const text=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export function validQuery(value){return typeof value==='string'&&value.trim().length>=2&&value.trim().length<=60&&/^[\p{L}\p{N}\s《》：:，,。.!！?？、·（）()—-]+$/u.test(value)&&!/https?|www\.|\d{7,}/i.test(value);}
export function allowedByRobots(robots,path){
 const groups=[];let agents=[],rules=[];const flush=()=>{if(agents.length)groups.push({agents,rules});agents=[];rules=[];};
 for(const line of robots.split(/\r?\n/)){const m=/^\s*(user-agent|allow|disallow)\s*:\s*([^#]*)/i.exec(line);if(!m)continue;const k=m[1].toLowerCase(),v=m[2].trim();if(k==='user-agent'){if(rules.length)flush();agents.push(v.toLowerCase());}else if(agents.length&&v)rules.push({allow:k==='allow',value:v});}flush();
 if(!groups.length)return false;const exact=groups.filter(g=>g.agents.some(a=>a!=='*'&&CRAWLER.toLowerCase().startsWith(a))),selected=exact.length?exact:groups.filter(g=>g.agents.includes('*'));let winner=null;
 for(const g of selected)for(const r of g.rules){const p=r.value.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replaceAll('*','.*');if(new RegExp('^'+p).test(path)&&(!winner||r.value.length>winner.value.length||r.value.length===winner.value.length&&r.allow))winner=r;}
 return winner?winner.allow:true;
}
export function sourceCandidates(html){if(!/<title>[^<]*(?:相关短剧推荐|搜索)[^<]*短剧百科<\/title>/.test(html))throw Error('source-shape');const list=[];for(const m of html.matchAll(/<a\b[^>]*href="(\/manju\/info-\d+\.html)"[^>]*title="([^"]+)"/g)){const title=text(m[2]).replace(/^(?:AI)?漫剧《(.*)》$/u,'$1');if(!list.some(x=>x.source===SOURCE+m[1]))list.push({source:SOURCE+m[1],title});}return list.slice(0,12);}
export async function factFromPage(html,source,checkedAt,excluded=[]){
 if(!/^https:\/\/www\.duanjubaike\.net\/manju\/info-\d+\.html$/.test(source))throw Error('source-url');
 const sourceTitle=text(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]||''),m=/^AI漫剧《(.+)》-短剧百科$/.exec(sourceTitle);if(!m)return null;
 const title=m[1],norm=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();if(title.length>100||excluded.some(e=>norm(title).includes(norm(e))))return null;
 const block=html.split('分类标签：')[1]?.split('上映时间')[0];if(!block)return null;
 const tags=[...block.matchAll(/<div\b[^>]*class="badge[^\"]*"[^>]*>([^<]+)<\/div>/g)].map(m=>text(m[1]));if(!tags.length||tags.length>16||tags.some(t=>!/^\p{L}{2,12}$/u.test(t)))return null;
 const release=html.split('上映时间')[1]?.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);if(!release)return null;
 const date=`${release[1]}-${release[2].padStart(2,'0')}-${release[3].padStart(2,'0')}`;if(date>checkedAt||Number.isNaN(Date.parse(date)))return null;
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(html)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 return {title,source,sourceTitle,sourceClaim:'AI漫剧',reportedTags:tags,reportedReleaseDate:release[0],checkedAt,sourceHash:hash};
}
export async function fetchSource(url,get=(...args)=>fetch(...args)){if(new URL(url).origin!==SOURCE)throw Error('source-origin');const r=await get(url,{redirect:'manual',headers:{'User-Agent':CRAWLER},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('source-http-'+r.status);const reader=r.body?.getReader();if(!reader)throw Error('source-body');const chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500000){await reader.cancel();throw Error('source-size');}chunks.push(value);}const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return new TextDecoder().decode(bytes);}
export async function discover(query,{get=(...args)=>fetch(...args),excluded=[],now=new Date()}={}){
 if(!validQuery(query))throw Error('query');const robots=await fetchSource(SOURCE+'/robots.txt',get),path='/so.html?keyword='+encodeURIComponent(query.trim());if(!allowedByRobots(robots,path))throw Error('source-robots');
 const html=await fetchSource(SOURCE+path,get),candidates=sourceCandidates(html),records=[];
 for(const candidate of candidates.slice(0,3)){if(!allowedByRobots(robots,new URL(candidate.source).pathname))continue;const detail=await fetchSource(candidate.source,get),fact=await factFromPage(detail,candidate.source,now.toISOString().slice(0,10),excluded);if(fact)records.push(fact);}
 return records;
}
