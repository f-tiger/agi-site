// Pure shared renderer, usable by static builds and the discussion Worker.
export const VERSION='20261003-nav2';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const primary=[['home','Home','首页',''],['videos','Videos & ideas','视频与观点','future-guide'],['evidence','Evidence','证据','progress-index'],['jarvis','Jarvis','贾维斯','jarvis'],['tools','Tools','工具','ai-tools'],['invest','Invest','投资','invest']];
export const groups=[
 {en:'Explore AI',zh:'探索 AI',links:[['videos','Videos & ideas','视频与观点','future-guide'],['evidence','Prediction evidence','预测证据','progress-index'],['jarvis','Jarvis research','贾维斯研究','jarvis'],['discuss','Discussions','讨论社区','discuss'],['search','Search the site','站内搜索（英文）','/search']]},
 {en:'Tools & work',zh:'工具与工作',links:[['tools','AI tools','AI 工具','ai-tools'],['workbench','Practical workbench','实用工具工作台','workbench'],['earn','Earn with AI','AI 赚钱实战','earn'],['mentor','Work mentor','工作导师','mentor'],['create','Create & share','创作与分享','create'],['agents','Agent directory','智能体目录','agents/']]},
 {en:'Invest & follow',zh:'投资与追踪',links:[['invest','Investment research','投资研究','invest'],['portfolio','12-stock tracker','12 股收益追踪','portfolio-tracker'],['infrastructure','AI infrastructure','AI 产业链研究','ai-infrastructure'],['exposure','Stock exposure tool','持仓敞口工具','ai-stock-exposure']]},
 {en:'Your space',zh:'我的空间',links:[['notebook','Saved views & actions','收藏与行动','future-guide#notebook'],['account','My discussions / join','我的讨论 / 注册','discuss/account'],['members','Membership workspace','会员工作区','members'],['newsletter','Free newsletter','免费周报（英文）','https://agiscorecard.beehiiv.com/subscribe']]}
];
export function sectionFor(pathname){
 const route=pathname.replace(/^\/zh(?=\/)/,'').replace(/\.html$/,'').replace(/\/$/,'')||'/';
 if(route==='/'||route==='/cn')return 'home';
 if(route.startsWith('/future-guide'))return 'videos';
 if(route==='/jarvis')return 'jarvis';
 if(/^\/(invest|portfolio-tracker|ai-infrastructure|ai-stock-exposure)/.test(route))return 'invest';
 if(/^\/(ai-tools|workbench|mentor|earn|create|agents|agi-test|matrix-odds|future-bet|ai-job-risk-check)/.test(route))return 'tools';
 if(route.startsWith('/discuss'))return 'discuss';
 if(route.startsWith('/members'))return 'members';
 if(route==='/search')return 'search';
 return 'evidence';
}
export function siteHeader(lang,{slug='',pathname,alternate,current,translation=true}={}){
 const zh=String(lang).startsWith('zh'),t=(en,cn)=>zh?cn:en,p=zh?'/zh':'',home=zh?'/cn':'/';
 pathname=pathname||(slug?p+'/'+slug:home);current=current||sectionFor(pathname);
 alternate=alternate||(slug?(zh?'':'/zh')+'/'+slug:(zh?'/':'/cn'));
 const href=path=>!path?home:path.startsWith('/')||path.startsWith('https://')?path:p+'/'+path;
 const link=([id,en,cn,path],extra='')=>`<a href="${esc(href(path))}" data-nav-destination="${id}" ${extra}>${t(en,cn)}</a>`;
 const languageLabel=translation?t('切换到中文','Switch to English'):t('中文首页（本页暂无中文）','English home (no translation for this page)');
 return `<header class="agi-header" id="agi-nav" data-nav-version="${VERSION}" data-nav-language="${zh?'zh':'en'}"><div class="agi-header-inner"><a class="agi-brand" href="${home}" aria-label="${t('AGI Scorecard home','AGI 记分牌首页')}" data-nav-destination="home"><span aria-hidden="true">A</span>${t('AGI Scorecard','AGI 记分牌')}</a><nav class="agi-primary-nav" aria-label="${t('Main navigation','主导航')}">${primary.map((item,index)=>link(item,`class="${index>3?'agi-nav-extra':''}" ${current===item[0]?'aria-current="page"':''}`)).join('')}</nav><a class="agi-language" id="language" href="${esc(alternate)}" lang="${zh?'en':'zh-Hans'}" aria-label="${languageLabel}" title="${languageLabel}" data-nav-language-link="${translation?'translation':'home'}">${zh?'EN':'中文'}</a><details class="agi-menu" id="agi-site-menu"><summary aria-controls="agi-menu-panel"><span class="agi-menu-icon" aria-hidden="true">☰</span><span>${t('All sections','全部栏目')}</span></summary><div class="agi-menu-panel" id="agi-menu-panel"><div class="agi-menu-groups">${groups.map(g=>`<section><h2>${g[zh?'zh':'en']}</h2><nav aria-label="${g[zh?'zh':'en']}">${g.links.map(item=>link(item,current===item[0]?'aria-current="page"':'')).join('')}</nav></section>`).join('')}</div></div></details></div></header>`;
}
export function navAssets(){return `<link rel="stylesheet" href="/home-focus/nav.css?v=${VERSION}"><script type="module" src="/site-nav/app.mjs?v=${VERSION}"></script>`;}
