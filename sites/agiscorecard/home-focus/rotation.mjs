// Pure selection and rendering shared by the daily build and the browser.
const DAY=86400000,OFFSET=8*3600000;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const validDate=s=>/^\d{4}-\d\d-\d\d$/.test(s||'')&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const validView=v=>v&&/^[a-z0-9-]+$/.test(v.id)&&['en','zh'].every(l=>typeof v[l]?.title==='string'&&v[l].title&&typeof v[l]?.summary==='string'&&v[l].summary);
export function rotationDay(now=Date.now()){
 const ms=now instanceof Date?now.getTime():typeof now==='number'?now:Date.parse(now);
 if(!Number.isFinite(ms))throw Error('Invalid rotation time');
 return new Date(ms+OFFSET).toISOString().slice(0,10);
}
export function rotationPool(items){
 const seen=new Set();
 return {version:1,timeZone:'Asia/Shanghai',videos:items.filter(i=>i.medium==='video'&&/^[\w-]{11}$/.test(i.video||'')&&validDate(i.date)&&!seen.has(i.video)&&seen.add(i.video)).map(i=>({video:i.video,date:i.date,title:i.title,publisher:i.publisher,speaker:i.speaker||'',posterLabel:i.posterLabel||'',language:i.language,goals:i.goals||[],views:(i.views||[]).filter(validView).map(v=>({id:v.id,en:{title:v.en.title,summary:v.en.summary},zh:{title:v.zh.title,summary:v.zh.summary}}))}))};
}
function eligible(v,day){return v&&/^[\w-]{11}$/.test(v.video||'')&&validDate(v.date)&&v.date<=day&&Array.isArray(v.views)&&Array.isArray(v.goals)&&['en','zh'].includes(v.language)&&typeof v.publisher==='string'&&(typeof v.title==='string'||typeof v.title?.en==='string'&&typeof v.title?.zh==='string');}
function recent(list,day,minimum=8){
 const today=Date.parse(day+'T00:00:00Z');
 for(const days of [30,90]){const pool=list.filter(v=>today-Date.parse(v.date+'T00:00:00Z')<=days*DAY);if(pool.length>=minimum)return pool;}
 return list;
}
// Interleave creators. Within each creator's newest four candidates, prefer
// topics not covered by the previous three entries. Rotation itself is a ring,
// so disjoint consecutive four-card batches are possible with >= 8 candidates.
function balancedRing(list,limit=96){
 const groups=new Map();
 for(const item of [...list].sort((a,b)=>cmp(b.date,a.date)||cmp(a.video,b.video))){if(!groups.has(item.publisher))groups.set(item.publisher,[]);if(groups.get(item.publisher).length<8)groups.get(item.publisher).push(item);}
 const names=[...groups.keys()].sort(cmp),ring=[];
 while(ring.length<limit&&names.some(n=>groups.get(n).length))for(const name of names){
  const q=groups.get(name);if(!q.length||ring.length>=limit)continue;
  const covered=new Set(ring.slice(-3).flatMap(x=>x.goals));let best=0,novel=-1;
  for(let i=0;i<Math.min(4,q.length);i++){const score=q[i].goals.filter(g=>!covered.has(g)).length;if(score>novel){novel=score;best=i;}}
  ring.push(q.splice(best,1)[0]);
 }
 return ring;
}
function batch(ring,dayIndex,count){
 if(!ring.length)return [];
 const n=Math.min(count,ring.length),start=((dayIndex*count)%ring.length+ring.length)%ring.length;
 return Array.from({length:n},(_,i)=>ring[(start+i)%ring.length]);
}
function dailyFeature(videos,day){
 const reviewed=videos.filter(v=>v.views.length);if(!reviewed.length)return null;
 // Replay the small reviewed collection deterministically. A 30/90-day cutoff
 // can change the ring size; remember yesterday's choice to avoid a repeat at
 // that boundary without cookies, user tracking or a successful daily build.
 const end=Date.parse(day+'T00:00:00Z'),start=Math.min(...reviewed.map(v=>Date.parse(v.date+'T00:00:00Z')));
 let feature=null,ring=[];
 for(let time=start;time<=end;time+=DAY){const date=new Date(time).toISOString().slice(0,10);ring=balancedRing(recent(reviewed.filter(v=>v.date<=date),date,2),24);const index=Math.floor(time/DAY)%ring.length;let next=ring[index];if(next?.video===feature?.video&&ring.length>1)next=ring[(index+1)%ring.length];feature=next;}
 return {feature,ringSize:ring.length};
}
export function homeEdition(pool,now=Date.now()){
 if(pool?.version!==1||!Array.isArray(pool.videos))throw Error('Invalid home rotation pool');
 const day=rotationDay(now),dayIndex=Math.floor(Date.parse(day+'T00:00:00Z')/DAY),seen=new Set();
 const videos=pool.videos.filter(v=>eligible(v,day)&&!seen.has(v.video)&&seen.add(v.video)).map(v=>({...v,views:v.views.filter(validView)}));
 const chosen=dailyFeature(videos,day);if(!chosen)return null;
 const {feature,ringSize}=chosen,view=feature.views[Math.floor(dayIndex/Math.max(1,ringSize))%feature.views.length];
 const recommendations={};
 for(const lang of ['en','zh']){
  // Keep the recommendation pool independent of the daily feature so its ring
  // does not shift every day. If the hero occurs in the batch, advance one slot.
  const pool=balancedRing(recent(videos.filter(v=>v.language===lang),day));
  const picks=batch(pool,dayIndex,4).filter(v=>v.video!==feature.video);
  if(picks.length<Math.min(4,pool.length))for(const v of batch(pool,dayIndex+1,4)){if(v.video!==feature.video&&!picks.some(x=>x.video===v.video))picks.push(v);if(picks.length===4)break;}
  recommendations[lang]=picks.slice(0,4);
 }
 return {day,timeZone:'Asia/Shanghai',feature,view,recommendations};
}
export function renderHomeFeature(edition,lang){
 const {feature:f,view,day}=edition,t=(en,zh)=>lang==='zh'?zh:en,hub=(lang==='zh'?'/zh':'')+'/future-guide',d=view[lang],title=typeof f.title==='string'?f.title:f.title[lang];
 return `<article class="home-feature" data-home-feature="${f.video}" data-home-edition="${day}"><div class="home-poster"><div class="home-poster-fallback" aria-hidden="true"><span>${esc(f.publisher)}</span><strong>${esc(f.posterLabel||f.publisher)}</strong><small>${esc(f.speaker)}</small></div><img src="https://i.ytimg.com/vi/${f.video}/hqdefault.jpg" width="480" height="360" alt="" decoding="async" referrerpolicy="no-referrer"><button type="button" data-home-video="${f.video}" data-player-title="${esc(title)}" aria-label="${esc(t('Watch: ','观看：')+title)}"><span aria-hidden="true">▶</span>${t('Watch here','直接观看')}</button></div><div class="home-feature-copy"><p class="home-eyebrow">${t('Daily perspective','每日精选观点')} <span>${f.language==='zh'?t('Chinese original','中文原片'):t('English original','英文原片')} · ${f.date}</span></p><h2><a href="${hub}/${view.id}" data-home-action="view">${esc(d.title)}</a></h2><p>${esc(d.summary)}</p><div class="home-feature-actions"><a href="${hub}/${view.id}" data-home-action="view">${t('Read takeaways & evidence','看观点与证据')} ↗</a><a href="https://www.youtube.com/watch?v=${f.video}" target="_blank" rel="noopener">${t('Original video','原视频')} ↗</a></div></div></article>`;
}
export function renderHomePicks(edition,lang){
 const t=(en,zh)=>lang==='zh'?zh:en,hub=(lang==='zh'?'/zh':'')+'/future-guide';
 return edition.recommendations[lang].map(i=>`<article class="home-latest-card" data-home-pick="${i.video}"><a class="home-thumb" href="${hub}?watch=${i.video}#fresh" data-home-action="latest"><span class="home-thumb-fallback">${esc(i.publisher)}</span><img src="https://i.ytimg.com/vi/${i.video}/hqdefault.jpg" loading="lazy" width="480" height="360" alt="" referrerpolicy="no-referrer"><span class="home-thumb-play" aria-hidden="true">▶</span></a><p class="home-video-meta">${esc(i.publisher)} <time datetime="${i.date}">${i.date}</time></p><h3><a href="${hub}?watch=${i.video}#fresh" data-home-action="latest">${esc(typeof i.title==='string'?i.title:i.title[lang])}</a></h3><p class="home-review-label">${i.views.length?t('Reviewed takeaways','已有观点总结'):t('Summary pending review','观点总结待核对')}</p></article>`).join('');
}
