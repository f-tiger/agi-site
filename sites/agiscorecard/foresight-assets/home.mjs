import {contentItems,topics} from './discovery.mjs';
import {rotationPool,homeEdition,renderHomeFeature,renderHomePicks} from '../home-focus/rotation.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {siteHeader} from '../site-nav/render.mjs';
export {siteHeader} from '../site-nav/render.mjs';
export function homeSnapshot(data,{now=Date.now()}={}){
 const items=contentItems(data),videos=items.filter(i=>i.medium==='video'),rotation=rotationPool(items),edition=homeEdition(rotation,now);
 if(!edition)throw Error('Homepage requires a sourced, reviewed video');
 const counts={videos:videos.length,audio:items.filter(i=>i.medium==='audio').length,views:items.reduce((n,i)=>n+i.views.length,0),sources:data.sources.length};
 const locales={};
 for(const lang of ['en','zh']){
  const zh=lang==='zh',t=(en,cn)=>zh?cn:en,hub=(zh?'/zh':'')+'/future-guide';
  const stat=`<span><strong>${counts.videos}</strong> ${t('videos','条视频')}</span><a href="${hub}?media=audio#fresh" data-home-action="audio"><strong>${counts.audio}</strong> ${t('audio episodes','条音频')}</a><span><strong>${counts.views}</strong> ${t('reviewed views','条已核对观点')}</span>`;
  const featured=renderHomeFeature(edition,lang);
  const topicLinks=topics.filter(g=>g.id!=='all').map(g=>`<a href="${hub}?topic=${g.id}#fresh" data-home-action="topic">${esc(g[lang])}<span>${videos.filter(i=>i.goals.includes(g.id)).length}</span></a>`).join('');
  const latestCards=renderHomePicks(edition,lang);
  const feed=`<section class="focus-future" id="home-videos" data-release="agi-home-library-20261003" aria-labelledby="home-videos-heading"><div class="home-section-heading"><div><h2 id="home-videos-heading">${t('Follow the questions that matter to you.','从你关心的问题，看见下一步。')}</h2><p>${t('Interviews, creator videos and research. Choose a perspective.','访谈、博主视频与研究解说，按观点主题持续整理。')}</p></div><a href="${hub}" data-home-action="library">${t('Browse all videos','浏览全部视频')} ↗</a></div><nav class="home-topics" aria-label="${t('Browse video topics','按观点主题浏览视频')}">${topicLinks}</nav><div class="home-section-heading home-latest-heading"><h3>${t('Daily English picks','每日中文推荐')}</h3><a href="${hub}?lang=${lang}&order=newest#fresh" data-home-action="latest">${t('See more','查看更多')} ↗</a></div><div class="home-latest-grid" data-home-picks-day="${edition.day}">${latestCards}</div><p class="home-rotation-note">${t('A fresh selection each day · ' ,'每日轮换 · 本期 ')}<time data-home-edition-date datetime="${edition.day}">${edition.day}</time> · ${t('00:00 UTC+8','北京时间零点更新')}</p><p class="home-sync-note">${t('Checked ','最近检查 ')}<time datetime="${esc(data.checkedAt)}">${esc(data.checkedAt?.replace('T',' ').replace('Z',' UTC'))}</time> · ${t('Daily source checks; reviewed summaries are published separately.','每日检查来源；观点总结经核对后另行发布。')}</p></section>`;
  locales[lang]={header:siteHeader(lang),stats:stat,feature:featured,feed};
 }
 return {version:1,editionDay:edition.day,checkedAt:data.checkedAt,counts,rotation,locales};
}
