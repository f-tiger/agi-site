import {claims,interviews,goals} from './catalog.mjs';
import {inWindow,sourceUrl} from './core.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{const v=new URL(u);return v.protocol==='https:'&&!v.username&&!v.password?v.href:null;}catch{return null;}};
const text=(lang,en,zh)=>lang==='zh'?zh:en;
const label=(item,lang)=>typeof item.title==='string'?item.title:item.title[lang];
export const topics=[
 {id:'all',en:'All perspectives',zh:'全部观点'},
 {id:'work',en:'Work & agents',zh:'工作与智能体'},
 {id:'learn',en:'Learning & skills',zh:'学习与能力'},
 {id:'earn',en:'Business & creativity',zh:'商业与创作'},
 {id:'family',en:'Education & family',zh:'教育与家庭'},
 {id:'understand',en:'AI progress',zh:'AI 进展'},
 {id:'forecast',en:'Future forecasts',zh:'未来预判'}
];
export function videoId(url){try{const u=new URL(url);const id=['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)?u.searchParams.get('v'):u.hostname==='youtu.be'?u.pathname.slice(1):null;return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}}
export function contentItems(data){
 const sources=new Map(data.sources.map(s=>[s.id,s]));
 const result=Object.entries(interviews).map(([id,i])=>{
  const raw=data.items.find(x=>x.url===i.source||x.url===i.watch||videoId(x.url)&&videoId(x.url)===i.video),s=sources.get(raw?.sourceId);
  return {id,interview:id,title:i.title,medium:i.kind,date:i.date,publisher:i.publisher,speaker:i.speaker,language:s?.language||'en',category:s?.category||'interview',posterLabel:i.label,url:i.source,watch:sourceUrl(i),video:i.video||null,audioUrl:i.kind==='audio'?safe(raw?.audioUrl):null,views:claims.filter(c=>c.interview===id),goals:[...new Set(claims.filter(c=>c.interview===id).flatMap(c=>c.goals))],dateNote:i.dateNote,access:i.access};
 });
 const seenURLs=new Set(result.flatMap(i=>[i.url,i.watch])),seenVideos=new Set(result.map(i=>i.video).filter(Boolean));
 for(const x of data.items){
  const s=sources.get(x.sourceId);if(!s||!safe(x.url))continue;
  const video=videoId(x.url)||(/^[\w-]{11}$/.test(x.videoId||'')?x.videoId:null);
  if(seenURLs.has(x.url)||video&&seenVideos.has(video))continue;
  seenURLs.add(x.url);if(video)seenVideos.add(video);
  result.push({id:x.id,title:x.title,medium:video?'video':x.medium,date:x.publishedAt.slice(0,10),publisher:s.name,speaker:'',language:s.language,category:s.category,url:x.url,watch:x.url,video,audioUrl:x.medium==='audio'?safe(x.audioUrl):null,views:[],goals:x.goals,publisherExcerpt:x.publisherExcerpt||''});
 }
 return result.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
export function discoveryStatus(data,lang,now=Date.now()){
 const ok=data.sources.filter(s=>s.status==='ok').length,stale=!data.checkedAt||now-Date.parse(data.checkedAt)>36*3600000;
 const state=stale?text(lang,'Update overdue','更新已延迟'):ok===data.sources.length?text(lang,'Sources checked','来源检查完成'):text(lang,'Some sources unavailable','部分来源暂不可用');
 return `${state} · ${ok}/${data.sources.length} · ${text(lang,'Last check: ','最近检查：')}${data.checkedAt?.replace('T',' ').replace('Z',' UTC')||'—'}`;
}
export function selectedItems(data,{medium='video',category='all',creator='all',language='all',goal='all',query='',window='all',order='views',asOf}={}){
 const q=query.trim().toLowerCase();
 return contentItems(data).filter(x=>(medium==='all'||x.medium===medium)&&(category==='all'||x.category===category)&&(creator==='all'||x.publisher===creator)&&(language==='all'||x.language===language)&&(goal==='all'||x.goals.includes(goal))&&inWindow(x.date,window,asOf)&&JSON.stringify([x.title,x.publisher,x.speaker,x.views.map(c=>[c.en.title,c.zh.title,c.en.summary,c.zh.summary])]).toLowerCase().includes(q)).sort((a,b)=>order==='views'?((b.views.length&&inWindow(b.date,'90',asOf)?(b.medium!=='video'||b.video?2:1):0)-(a.views.length&&inWindow(a.date,'90',asOf)?(a.medium!=='video'||a.video?2:1):0)||b.date.localeCompare(a.date)):b.date.localeCompare(a.date));
}
function points(item,lang,goal){
 const views=goal&&goal!=='all'?item.views.filter(c=>c.goals.includes(goal)):item.views;
 return views.length?views:item.views;
}
function poster(item,lang,featured=false){
 const t=(a,b)=>text(lang,a,b),title=label(item,lang);
 if(item.medium!=='video')return '';
 if(!item.video)return `<div class="media-poster publisher-poster"><strong>${escape(item.publisher)}</strong><a class="button" href="${escape(safe(item.watch)||item.url)}" target="_blank" rel="noopener" data-track="source">${t('Watch at publisher','前往出版方观看')} ↗</a></div>`;
 return `<div class="media-poster"><div class="poster-fallback" aria-hidden="true"><span>${escape(item.publisher)}</span><strong>${escape(item.posterLabel||item.publisher)}</strong><small>${escape(title)}</small></div><img src="https://i.ytimg.com/vi/${item.video}/hqdefault.jpg" alt="" width="480" height="360" loading="${featured?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer"><button type="button" class="poster-play" data-play-video="${item.video}" data-player-title="${escape(title)}" aria-label="${escape(t('Watch: ','观看：')+title)}"><span class="play-disc" aria-hidden="true">▶</span><span>${t('Watch here','直接观看')}</span></button></div>`;
}
function mediaCard(item,lang,goal,featured=false){
 const t=(a,b)=>text(lang,a,b),views=points(item,lang,goal),primary=views[0],base=(lang==='zh'?'/zh':'')+'/future-guide/',title=primary?primary[lang].title:label(item,lang);
 const headline=primary?`<a href="${base+primary.id}" data-claim-link>${escape(title)}</a>`:`<a href="${escape(item.url)}" target="_blank" rel="noopener" data-track="source">${escape(title)}</a>`;
 const summary=views.length?`<div class="view-summary"><p class="summary-label">${t('Key takeaways','观点重点')}</p><ul>${views.slice(0,2).map(c=>`<li><strong>${escape(c[lang].short)}</strong><span>${escape(c[lang].summary)}</span></li>`).join('')}</ul></div>`:item.publisherExcerpt?`<div class="publisher-summary"><p class="summary-label">${t('Publisher’s introduction','节目简介（出版方原文）')}</p><p lang="${item.language==='zh'?'zh-Hans':'en'}">${escape(item.publisherExcerpt)}</p><span class="meta">${t('Viewpoint summary pending','观点总结待核对')}</span></div>`:`<p class="meta pending-summary">${t('Newly discovered. Viewpoint summary pending.','新发现内容，观点总结待核对。')}</p>`;
 const audio=item.medium==='audio'?item.audioUrl?`<div class="audio-player"><button type="button" data-play-audio="${escape(item.audioUrl)}" data-player-title="${escape(label(item,lang))}">▷ ${t('Listen to episode','收听这期音频')}</button></div>`:`<a class="quiet-link" href="${escape(safe(item.watch)||item.url)}" target="_blank" rel="noopener" data-track="source">${t('Listen at publisher','收听原始音频')} ↗</a>`:'';
 return `<article class="media-card ${featured?'media-feature':''} medium-${item.medium}" data-discovery-card="${escape(item.id)}" data-medium="${item.medium}" data-reviewed="${views.length?'true':'false'}">${poster(item,lang,featured)}<div class="media-copy"><p class="media-meta"><span>${escape(item.speaker||item.publisher)}</span><time datetime="${item.date}">${item.date}</time>${featured?`<span class="editor-pick">${item.views.length?t('Start here','精选观点'):t('Latest episode','最新节目')}</span>`:''}</p><h3>${headline}</h3>${summary}<div class="media-actions">${primary?`<a href="${base+primary.id}" data-claim-link>${t('Read the full perspective','查看完整观点')} <span aria-hidden="true">↗</span></a>`:''}${audio}${item.medium==='video'?`<a class="source-fallback" href="${escape(safe(item.watch)||item.url)}" target="_blank" rel="noopener" data-track="source">${t('Original video','原视频')} ↗</a>`:''}</div>${item.dateNote?`<details class="media-context"><summary>${t('About the source date','来源日期说明')}</summary><p>${escape(item.dateNote[lang])}</p></details>`:''}</div></article>`;
}
export function discoveryCards(data,lang,options={},limit=4){
 const list=selectedItems(data,options),feature=options.order==='newest'?list[0]:list.find(i=>i.views.length&&(i.medium!=='video'||i.video));
 const rest=feature?list.filter(i=>i.id!==feature.id):list;
 return `${feature?mediaCard(feature,lang,options.goal,true):''}<div class="media-grid">${rest.slice(0,Math.max(0,limit-(feature?1:0))).map(i=>mediaCard(i,lang,options.goal)).join('')}</div>`;
}
export function sourceHealth(data,lang){return data.sources.map(s=>`<li><a href="${escape(safe(s.home)||'#')}" target="_blank" rel="noopener">${escape(s.name)}</a><span>${s.status==='ok'?text(lang,'Checked','已检查'):text(lang,'Unavailable; last good content retained','暂不可用，保留上次内容')} · ${text(lang,'Last success: ','最近成功：')}${escape(s.lastSuccessAt?.slice(0,16).replace('T',' ')||'—')} UTC</span></li>`).join('');}
export function discoverySection(data,lang){
 const t=(a,b)=>text(lang,a,b),items=contentItems(data),creators=[...new Set(items.map(i=>i.publisher))].sort((a,b)=>a.localeCompare(b));
 return `<section id="fresh" class="watch-library"><div class="media-toolbar"><div class="medium-tabs" role="group" aria-label="${t('Video, audio or reading','视频、音频或文字')}">${[['video','Videos','视频'],['audio','Audio','音频'],['text','Reading','文字']].map(([id,en,zh])=>`<button type="button" data-media-tab="${id}" aria-pressed="${id==='video'}">${t(en,zh)} <span data-medium-count="${id}">${items.filter(i=>i.medium===id).length}</span></button>`).join('')}</div><label class="media-search"><span class="sr-only">${t('Search views or creators','搜索观点或创作者')}</span><input id="feed-search" type="search" placeholder="${t('Search a view or creator','搜索观点、人物或博主')}"></label></div><div class="topic-tabs" role="group" aria-label="${t('Perspective topics','观点主题')}">${topics.map(g=>`<button type="button" data-topic="${g.id}" aria-pressed="${g.id==='all'}">${g[lang]}</button>`).join('')}</div><div class="browse-meta"><p id="feed-count" class="meta" aria-live="polite">${selectedItems(data).length} ${t('videos · Read the view, then press play','条视频 · 先看观点，再看原片')}</p><details class="more-filters"><summary>${t('More filters','更多筛选')}</summary><div class="feed-filters"><label>${t('Order','排序')}<select id="feed-order"><option value="views">${t('Takeaways first','观点重点优先')}</option><option value="newest">${t('Newest first','最新发布优先')}</option></select></label><label>${t('Language','内容语言')}<select id="feed-language"><option value="all">${t('All languages','全部语言')}</option><option value="zh">${t('Chinese','中文')}</option><option value="en">English</option></select></label><label>${t('Source','来源类型')}<select id="feed-category"><option value="all">${t('All creators','全部来源')}</option><option value="interview">${t('Interviews','人物访谈')}</option><option value="commentary">${t('Creator commentary','博主解说')}</option><option value="research">${t('Research & learning','研究与学习')}</option><option value="official">${t('Company channels','公司官方频道')}</option></select></label><label>${t('Creator','创作者')}<select id="feed-creator"><option value="all">${t('All creators','全部创作者')}</option>${creators.map(name=>`<option value="${escape(name)}">${escape(name)}</option>`).join('')}</select></label><label>${t('Published','发布时间')}<select id="feed-window"><option value="all">${t('All dates','全部时间')}</option><option value="30">${t('Past 30 days','近 30 天')}</option><option value="90">${t('Past 90 days','近 90 天')}</option><option value="archive">${t('Archive','历史内容')}</option></select></label></div></details></div><div id="fresh-feed">${discoveryCards(data,lang)}</div><div id="feed-empty" class="empty" hidden><p>${t('No matching content. Try another topic or clear the filters.','暂时没有匹配内容，换一个观点主题或清除筛选。')}</p><button id="feed-reset">${t('Clear filters','清除筛选')}</button></div><button id="feed-more" ${selectedItems(data).length<=4?'hidden':''}>${t('More videos','更多视频')}</button><p class="play-note">${t('Videos play here when you click. If a publisher limits playback, use the original link.','点击封面即可在此观看；如出版方限制播放，可打开原视频。')}</p><details class="source-health"><summary>${t('Updated daily · Sources and editorial notes','每日更新 · 来源与整理说明')}</summary><p id="feed-status" class="meta">${escape(discoveryStatus(data,lang))}</p><p class="meta">${t('Takeaways paraphrase the source. Newly discovered episodes show a short publisher introduction when available, until their viewpoints are reviewed. Topic labels are navigation aids, not fact checks. Company channels present the publisher’s own perspective. The rolling collection keeps up to two years of episodes; Shorts are excluded.','观点重点为来源转述；新发现节目优先展示出版方简短简介，核对后再发布观点总结。主题标签用于浏览，不代表事实核查。公司官方频道代表出版方立场。滚动保留近两年内容，不收录 Shorts 短切片。')}</p><ul id="source-health">${sourceHealth(data,lang)}</ul></details><script type="application/json" id="discovery-data">${JSON.stringify(data).replace(/</g,'\\u003c')}</script></section>`;
}
export function initDiscovery(onAction=()=>{}){
 const node=document.getElementById('discovery-data');if(!node)return;
 const lang=document.body.dataset.lang,$=id=>document.getElementById(id),t=(a,b)=>text(lang,a,b),params=new URLSearchParams(location.search);
 let data=JSON.parse(node.textContent),limit=4,lastFetch=Date.now(),medium=['video','audio','text'].includes(params.get('media'))?params.get('media'):'video',goal=topics.some(g=>g.id===params.get('topic'))?params.get('topic'):goals.some(g=>g.id===params.get('goal'))?params.get('goal'):'all';
 const options=()=>({medium,goal,category:$('feed-category').value,creator:$('feed-creator').value,language:$('feed-language').value,window:$('feed-window').value,order:$('feed-order').value,query:$('feed-search').value});
 if([...$('feed-creator').options].some(o=>o.value===params.get('creator')))$('feed-creator').value=params.get('creator');
 function syncURL(){const u=new URL(location.href);medium==='video'?u.searchParams.delete('media'):u.searchParams.set('media',medium);u.searchParams.set('topic',goal);$('feed-creator').value==='all'?u.searchParams.delete('creator'):u.searchParams.set('creator',$('feed-creator').value);history.replaceState(null,'',u);const a=$('language');if(a){const v=new URL(a.href);for(const k of ['media','topic','creator'])u.searchParams.has(k)?v.searchParams.set(k,u.searchParams.get(k)):v.searchParams.delete(k);a.href=v.pathname+v.search;}}
 function stopPlayers(){for(const player of $('fresh-feed').querySelectorAll('iframe,audio')){if(player.tagName==='AUDIO'){player.pause();player.removeAttribute('src');player.load();}player.remove();}}
 function render(){
  stopPlayers();const selected=selectedItems(data,options());$('fresh-feed').innerHTML=discoveryCards(data,lang,options(),limit);
  const name=medium==='video'?t('videos','条视频'):medium==='audio'?t('audio episodes','条音频'):t('articles','篇文字');
  $('feed-count').textContent=selected.length+' '+name+' · '+new Set(selected.map(i=>i.publisher)).size+' '+t('creators','个来源');$('feed-empty').hidden=!!selected.length;$('feed-more').hidden=selected.length<=limit;$('feed-more').textContent=medium==='video'?t('More videos','更多视频'):medium==='audio'?t('More audio','更多音频'):t('More reading','更多文字');
  for(const b of document.querySelectorAll('[data-media-tab]'))b.setAttribute('aria-pressed',String(b.dataset.mediaTab===medium));
  for(const b of document.querySelectorAll('[data-topic]'))b.setAttribute('aria-pressed',String(b.dataset.topic===goal));
  const items=contentItems(data);for(const n of document.querySelectorAll('[data-medium-count]'))n.textContent=items.filter(i=>i.medium===n.dataset.mediumCount).length;
  $('feed-status').textContent=discoveryStatus(data,lang);$('source-health').innerHTML=sourceHealth(data,lang);
  for(const img of $('fresh-feed').querySelectorAll('img'))img.addEventListener('error',()=>{img.hidden=true;});
 }
 for(const b of document.querySelectorAll('[data-media-tab]'))b.onclick=()=>{medium=b.dataset.mediaTab;limit=4;render();syncURL();onAction('medium');};
 for(const b of document.querySelectorAll('[data-topic]'))b.onclick=()=>{goal=b.dataset.topic;limit=4;render();syncURL();onAction('topic');};
 for(const id of ['feed-order','feed-category','feed-creator','feed-language','feed-window','feed-search'])$(id).addEventListener(id==='feed-search'?'input':'change',()=>{limit=4;render();syncURL();});
 $('feed-reset').onclick=()=>{goal='all';for(const id of ['feed-category','feed-creator','feed-language','feed-window'])$(id).value='all';$('feed-search').value='';$('feed-order').value='views';limit=4;render();syncURL();};
 $('feed-more').onclick=()=>{limit+=6;render();};
 $('fresh-feed').addEventListener('click',e=>{
  const video=e.target.closest('[data-play-video]'),audio=e.target.closest('[data-play-audio]'),close=e.target.closest('[data-close-player]');
  if(close){render();return;}
  if(!video&&!audio)return;
  // One active player at a time. No third-party player is loaded on arrival.
  stopPlayers();
  if(video){const id=video.dataset.playVideo;if(!/^[\w-]{11}$/.test(id))return;const stage=video.closest('.media-poster'),frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1';frame.title=video.dataset.playerTitle;frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;stage.append(frame);onAction('video');}
  if(audio){const url=safe(audio.dataset.playAudio);if(!url)return;const player=document.createElement('audio');player.controls=true;player.preload='none';player.src=url;player.setAttribute('aria-label',audio.dataset.playerTitle);audio.parentElement.append(player);player.play().catch(()=>{});onAction('audio');}
 });
 async function refresh(){if(document.hidden||Date.now()-lastFetch<300000)return;lastFetch=Date.now();try{const r=await fetch('/foresight-assets/discovery.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('network');const next=await r.json();if(next.version!==1||!Array.isArray(next.items)||!Array.isArray(next.sources))throw Error('schema');data=next;if(!$('fresh-feed').querySelector('iframe,audio'))render();else $('feed-status').textContent=discoveryStatus(data,lang);}catch{$('feed-status').textContent=discoveryStatus(data,lang)+' · '+t('Could not reload; showing the last snapshot','刷新未完成，展示上次快照');}}
 document.addEventListener('visibilitychange',refresh);setInterval(refresh,300000);render();
}
