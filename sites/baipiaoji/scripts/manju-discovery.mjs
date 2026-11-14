import {buildGenrePages} from './manju-genre-pages.mjs';
import {workURL as workUrl,hasWorkPage,createWorkResolver} from './manju-work-urls.mjs';
// Useful, finite landing pages drawn from the existing reviewed catalogue.
export const GENRES=[
 {id:'cultivation',angle:'仙侠与修仙漫剧片单',intro:'仙侠片单按目录中的修真、仙侠线索归类，适合从修炼、成长和人物选择寻找故事。先核对原平台题材，再用系统、战斗等已有标签细选。',tips:'修仙通常关注修炼与境界，奇幻覆盖更广的超常世界；有古代服饰并不足以归入仙侠。本站分类是检索线索，不代替原作设定或全片评价。',related:['fantasy','historical']},
 {id:'suspense',angle:'悬疑与怪谈漫剧片单',intro:'悬疑片单从未知事件、线索与谜团进入故事。目录中的怪谈和冒险标签可以帮助缩小范围，但不能只凭标签判断作品的惊吓程度或推理质量。',tips:'先区分想看解谜、探险还是超常事件，再核对剧情资料与原平台内容提示。没有观看证据时，不把悬疑等同于恐怖，也不承诺适合儿童。',related:['fantasy','apocalypse']},
 {id:'drama',angle:'剧情类漫剧与 AI 短剧目录',intro:'剧情类收录暂未按现有规则落入更具体主题材的记录。它是宽泛的找剧入口，不表示作品风格相同；可继续按来源给出的穿越、系统、日常等标签挑选。',tips:'先看单部记录的分类来源，再用剧情标签筛选。剧情类记录数多，不代表这个题材市场更大或更受欢迎；记录也可能包含不同季与同名作品。',related:['urban','family']},
 {id:'urban',angle:'都市漫剧与 AI 短剧',intro:'从职场变化、城市生活和人物关系切入选剧。先看角色面临的具体抉择，再判断你更喜欢生活叙事还是身份逆转；都市是背景分类，不代表作品都有同一种剧情。',tips:'想看工作与成长，可在完整目录继续按“职场”“成长”筛选。喜欢家庭关系时，可转到家庭片单；别把都市标签直接等同于总裁或豪门。',related:['family','romance']},
 {id:'fantasy',angle:'奇幻漫剧与 AI 影像',intro:'奇幻片单侧重超常设定、神话和想象世界。选择时可以先比较世界规则是否容易理解，以及故事更偏神话改编、冒险还是轻松脑洞。',tips:'奇幻与仙侠、科幻有交叉，但本站为每条记录保留一个主题材；系统、穿越等属于剧情标签。喜欢明确修炼体系，可从选题助手的玄幻方向继续找案例。',related:['historical','apocalypse']},
 {id:'historical',angle:'古风漫剧片单',intro:'从古代背景的人物关系、身份选择与生活处境找故事。古风是叙事背景，不意味着历史考据，也不等于所有作品都有宫廷或恋爱情节。',tips:'先确认想看的是人物关系还是成长冒险。穿越、重生等标签可以进一步缩小范围；不同季分别列出，寻找前情时应在原平台核对系列顺序。',related:['romance','fantasy']},
 {id:'romance',angle:'恋爱漫剧推荐目录',intro:'把人物关系的变化作为选剧线索。先区分想看当代生活、古代背景还是奇幻设定中的感情发展，再通过作品资料找到发布来源。',tips:'恋爱题材不自动代表适龄分级或甜宠风格，具体内容以原平台说明为准。偏好亲子或代际关系，可以转到家庭片单。',related:['historical','family']},
 {id:'family',angle:'家庭与萌宝漫剧片单',intro:'围绕家人关系、照护、成长和共同生活寻找作品。家庭是主题材，萌宝是情节标签，两者有交集，但不能把整个家庭目录都称为萌宝剧。',tips:'先读有来源的剧情概述，再比较角色关系与冲突。萌宝标签不是儿童适宜证明；与孩子一起观看时，应先核对原平台的内容提示。',related:['urban','rural']},
 {id:'apocalypse',angle:'末世与生存漫剧片单',intro:'从资源、危机和求生选择进入故事。可以比较你喜欢个人成长、团队合作还是环境探索，再决定要不要追看更长的系列。',tips:'末世是主题材，囤货、系统和异能等是可能出现的标签。目录收录不代表每部都具备这些情节；紧张程度和适龄提示需要在原平台核对。',related:['fantasy','urban']},
 {id:'period',angle:'年代与重生漫剧片单',intro:'关注时代背景下的生活、家庭和经营选择。年代题材不全是重生，重生作品也不全发生在过去；这里按目录主题材归类，再用标签细选。',tips:'想看赶山、种田或经营，可结合具体剧情资料判断；不要只凭时代背景推断作品情节。创作者可参考种田方向的官方榜内样本与制作约束。',related:['rural','family']},
 {id:'rural',angle:'乡村与种田漫剧片单',intro:'从乡村生活、生计和人与社区的关系寻找故事。乡村是背景，种田、赶山、赶海等是更细的叙事方向，不能把目录数量当成某个细分题材的热度。',tips:'先核对作品资料描述的劳动与生活场景，再看你偏好家庭关系、经营目标还是成长冒险。制作此类故事时，场景和时代道具也需要单独测试。',related:['period','family']}
];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const root='https://baipiaoji.com/manju/';
export const discoveryPaths=()=>['guide','categories',...GENRES.map(g=>'genre-'+g.id)];
export function discoverySearch(catalog,insights){const resolve=createWorkResolver(catalog,insights.cohorts.filter(c=>c.metric==='snapshot_heat').flatMap(c=>c.records));return [{u:root+'categories',n:'漫剧题材分类：按故事偏好找官方入口',k:'分类导航',q:'漫剧 分类 仙侠 修仙 悬疑 剧情 都市 题材 标签 区别'}, {u:root+'guide',n:'AI漫剧去哪看、如何找官方入口与引用热度数据',k:'选剧指南',q:'ai短剧 漫剧 官方 平台 哪里看 红果 抖音 热度 播放量 来源'},...GENRES.map(g=>({u:root+'genre-'+g.id,n:g.angle,k:'题材片单',q:g.angle+' '+g.intro})),...insights.cohorts.filter(c=>c.metric==='snapshot_heat').flatMap(c=>c.records.map(x=>({u:(()=>{const item=resolve(x);return item&&hasWorkPage(item)?workUrl(item):root+'rankings#rank-'+c.id+'-'+x.sourceRank;})(),n:x.title,k:'红果官方榜单',q:x.title+' '+x.tags.join(' ')})))];}
export const genreLinks=()=>`<nav class="mj-genre-links" aria-label="按题材浏览片单"><a href="/manju/categories">全部题材与分类区别</a>${GENRES.map(g=>`<a href="/manju/genre-${g.id}">${g.angle}</a>`).join('')}<a href="/manju/guide">新手选剧与数据指南</a></nav>`;
export function buildDiscovery({publish,page,write,catalog,insights,external,plotFor,directoryURL}){
 const faq=[
  ['AI 漫剧和 AI 短剧去哪里看？','从作品的官方片库或原平台详情页进入。帧选目录区分官方片库、介绍／预告和平台搜索；红果榜单记录附官方详情链接。本站不播放视频，能否播放、登录与收费条件以原平台为准。'],
  ['AI 短剧和漫剧是一回事吗？','不是同一种划分方式。AI 描述制作技术，漫剧描述内容形态；漫剧不一定全部由 AI 制作。帧选保留来源对形态的标注，没有逐部审计制作过程。'],
  ['红果热度能当播放量吗？','不能。红果公开榜单以观看、互动等综合热度排序，完整计算窗口未公开。快照热度、月峰值和抖音月播放增量分别展示，不相加，也不据此推算人数或收入。'],
  ['为什么不同月份、不同榜单的数据不能直接比较？',`当前核实的是 ${insights.reviewedAt} 检查的红果官方榜单快照，9 月完整官方月榜尚未核实。8 月保留的是 DataEye 报告摘录。来源、指标和周期不同，不能计算同比或环比增长。`],
  ['如何引用帧选的榜单和题材计数？','写明原始来源、平台、观察日期、指标与样本范围，并附本站页面和原始来源链接。题材计数含分季、多标签有交叉，不是市场份额。可查看带出处的 JSON 和 Markdown 摘要；资料公开不等于获得作品素材转载许可。'],
  ['收藏会同步到账号吗？','收藏默认保存在当前浏览器，可免费导出文本或主动分享。登录 BPJ 免费账户后，可在片单区手动保存最多 200 部收藏并在其他设备恢复，不会自动上传；观看进度仍在本机。目录 RSS 通知资料更新，不是剧集追更。']
 ];
 const breadcrumb=(title,path)=>({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'帧选',item:root},{'@type':'ListItem',position:2,name:title,item:root+path}]});
 buildGenrePages({genres:GENRES,publish,page,write,catalog,insights,external,plotFor,directoryURL});
 const title='AI 漫剧去哪看：官方入口、热度口径与选剧指南';
 publish('guide',page({title,path:'guide',description:'了解 AI 漫剧与 AI 短剧的区别，找到官方观看入口，正确理解红果热度、抖音播放量和榜单日期，按题材找剧或生成创作选题。',body:`<article class="mj-topic-article"><a href="/manju/">帧选</a><h1>${title}</h1><p>想看作品，先按题材选片，再核对原平台；想做作品，先看带日期的题材依据，再验证自己的样片。</p>${genreLinks()}${faq.map(([q,a])=>`<section><h2>${q}</h2><p>${a}</p></section>`).join('')}<h2>数据来源与下一步</h2>${insights.reports.map(r=>`<p>${external(r.url,r.publisher)} · ${r.kind==='official_snapshot'?'观察日期 '+r.observedAt:'统计期 '+r.periodStart+'—'+r.periodEnd}</p>`).join('')}<p><a class="mj-button" href="/manju/topics">生成带出处的选题参考</a></p><p><a href="/manju/previews">先看官方预告与视频入口</a> · <a href="/manju/rankings">查官方榜单快照</a></p><p><a href="/manju/insights.json">榜单 JSON</a> · <a href="/manju/insights.md">可引用的榜单摘要</a> · <a href="/manju/guide.md">本指南文字版</a></p><p>需要补充官方物料或讨论专题合作，可<a href="/manju/cooperate?kind=cooperate">提交合作意向</a>。普通投稿免费，不出售排名，目前不在线收款。</p></article>`,schema:[{'@context':'https://schema.org','@type':'FAQPage',name:title,url:root+'guide',inLanguage:'zh-Hans',mainEntity:faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},breadcrumb(title,'guide')]}));
 write('manju/guide.md','# '+title+'\n\n'+faq.map(([q,a])=>'## '+q+'\n\n'+a).join('\n\n')+'\n\n来源：\n'+insights.reports.map(r=>'- '+r.publisher+' '+r.url+'；'+(r.kind==='official_snapshot'?'观察日期 '+r.observedAt:'统计期 '+r.periodStart+'—'+r.periodEnd)).join('\n')+'\n\n'+root+'topics\n');
}
