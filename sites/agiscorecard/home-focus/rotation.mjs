// Pure selection and rendering shared by the daily build and the browser.
const OFFSET=8*3600000;
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
 return {version:1,timeZone:'Asia/Shanghai',videos:items.filter(i=>i.medium==='video'&&/^[\w-]{11}$/.test(i.video||'')&&validDate(i.date)&&!seen.has(i.video)&&seen.add(i.video)).map(i=>({video:i.video,date:i.date,publishedAt:i.publishedAt||i.date+'T00:00:00Z',title:i.title,publisher:i.publisher,speaker:i.speaker||'',publisherExcerpt:i.publisherExcerpt||'',posterLabel:i.posterLabel||'',language:i.language,goals:i.goals||[],views:(i.views||[]).filter(validView).map(v=>({id:v.id,en:{title:v.en.title,summary:v.en.summary},zh:{title:v.zh.title,summary:v.zh.summary}}))}))};
}
function eligible(v,day){return v&&/^[\w-]{11}$/.test(v.video||'')&&validDate(v.date)&&v.date<=day&&Array.isArray(v.views)&&Array.isArray(v.goals)&&['en','zh'].includes(v.language)&&typeof v.publisher==='string'&&(typeof v.title==='string'||typeof v.title?.en==='string'&&typeof v.title?.zh==='string');}
const newestFirst=(a,b)=>cmp(b.publishedAt||b.date,a.publishedAt||a.date)||cmp(a.video,b.video);
export function homeEdition(pool,now=Date.now()){
 if(pool?.version!==1||!Array.isArray(pool.videos))throw Error('Invalid home rotation pool');
 const day=rotationDay(now),seen=new Set();
 const videos=pool.videos.filter(v=>eligible(v,day)&&!seen.has(v.video)&&seen.add(v.video)).map(v=>({...v,views:v.views.filter(validView)})).sort(newestFirst);
 // New source publications lead the homepage even before editorial takeaways exist.
 // With no new publication, keep the latest video and its original date.
 const feature=videos[0];if(!feature)return null;
 const view=feature.views[0]||null,recommendations={en:[],zh:[]};
 for(const lang of ['en','zh'])recommendations[lang]=videos.filter(v=>v.language===lang&&v.video!==feature.video).slice(0,4);
 return {day,timeZone:'Asia/Shanghai',feature,view,recommendations};
}
export function renderHomeFeature(edition,lang){
 const {feature:f,view,day}=edition,t=(en,zh)=>lang==='zh'?zh:en,hub=(lang==='zh'?'/zh':'')+'/future-guide',d=view?.[lang],title=typeof f.title==='string'?f.title:f.title[lang];
 const destination=d?hub+'/'+view.id:hub+'?watch='+f.video+'#fresh',action=d?'view':'latest';
 const description=d?.summary||f.publisherExcerpt||t('Watch the original source. A viewpoint summary has not been reviewed yet.','观看原始视频；观点总结尚未核对。');
 const attribution=d?t('Reviewed takeaways','已核对观点'):t('Publisher’s introduction · Summary pending review','出版方简介 · 观点总结待核对');
 return `<article class="home-feature" data-home-feature="${f.video}" data-home-edition="${day}"><div class="home-poster"><div class="home-poster-fallback" aria-hidden="true"><span>${esc(f.publisher)}</span><strong>${esc(f.posterLabel||f.publisher)}</strong><small>${esc(f.speaker)}</small></div><img src="https://i.ytimg.com/vi/${f.video}/hqdefault.jpg" width="480" height="360" alt="" decoding="async" referrerpolicy="no-referrer"><button type="button" data-home-video="${f.video}" data-player-title="${esc(title)}" aria-label="${esc(t('Watch: ','观看：')+title)}"><span aria-hidden="true">▶</span>${t('Watch here','直接观看')}</button></div><div class="home-feature-copy"><p class="home-eyebrow">${t('Latest video','最新视频')} <span>${f.language==='zh'?t('Chinese original','中文原片'):t('English original','英文原片')} · <time datetime="${f.date}">${f.date}</time></span></p><h2><a href="${destination}" data-home-action="${action}">${esc(d?.title||title)}</a></h2><p class="home-review-label">${esc(f.publisher)} · ${attribution}</p><p${d||!f.publisherExcerpt?'':' lang="'+(f.language==='zh'?'zh-Hans':'en')+'"'}>${esc(description)}</p><div class="home-feature-actions"><a href="${destination}" data-home-action="${action}">${d?t('Read takeaways & evidence','看观点与证据'):t('Open this episode','打开这期视频')} ↗</a><a href="https://www.youtube.com/watch?v=${f.video}" target="_blank" rel="noopener">${t('Original video','原视频')} ↗</a></div></div></article>`;
}
export function renderHomePicks(edition,lang){
 const t=(en,zh)=>lang==='zh'?zh:en,hub=(lang==='zh'?'/zh':'')+'/future-guide';
 return edition.recommendations[lang].map(i=>`<article class="home-latest-card" data-home-pick="${i.video}"><a class="home-thumb" href="${hub}?watch=${i.video}#fresh" data-home-action="latest"><span class="home-thumb-fallback">${esc(i.publisher)}</span><img src="https://i.ytimg.com/vi/${i.video}/hqdefault.jpg" loading="lazy" width="480" height="360" alt="" referrerpolicy="no-referrer"><span class="home-thumb-play" aria-hidden="true">▶</span></a><p class="home-video-meta">${esc(i.publisher)} <time datetime="${i.date}">${i.date}</time></p><h3><a href="${hub}?watch=${i.video}#fresh" data-home-action="latest">${esc(typeof i.title==='string'?i.title:i.title[lang])}</a></h3><p class="home-review-label">${i.views.length?t('Reviewed takeaways','已有观点总结'):t('Summary pending review','观点总结待核对')}</p></article>`).join('');
}
