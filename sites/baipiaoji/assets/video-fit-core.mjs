/** Local, DOM-free editorial checks. No model calls, uploads, scores or algorithm weights. */
export const PLATFORM_IDS=Object.freeze(['douyin','kuaishou','xiaohongshu','bilibili','weixin','toutiao']);
const NAMES={douyin:'抖音',kuaishou:'快手',xiaohongshu:'小红书',bilibili:'哔哩哔哩',weixin:'视频号',toutiao:'今日头条'};
const CHECKS={opening:['result','problem','conflict','intro'],proof:['demo','steps','story','opinion','none'],captions:['yes','no'],audio:['clear','unclear','not_applicable'],rights:['confirmed','uncertain'],ai:['labelled','unlabelled','not_applicable'],commercial:['disclosed','undisclosed','not_applicable'],claim:['supported','unsupported','not_applicable'],destination:['approved','unverified','not_applicable']};
const LABELS={audience:'目标受众',durationSeconds:'视频时长',aspect:'画幅',opening:'开头表达方式',proof:'内容证据或叙事方式',captions:'字幕可读性',audio:'声音清晰度',rights:'素材权利',ai:'AI 内容标识',commercial:'商业关系披露',claim:'宣传或效果声明依据',destination:'承接入口许可'};
const VALUES={vertical:'竖屏',horizontal:'横屏',square:'方形',result:'先给结果',problem:'先提问题',conflict:'先给冲突',intro:'介绍铺垫',demo:'真实演示',steps:'可复现步骤',story:'叙事',opinion:'观点',none:'未提供',yes:'已确认',no:'没有字幕或难读',clear:'清晰',unclear:'不清晰',confirmed:'已确认',uncertain:'有疑问',labelled:'已标识',unlabelled:'未标识',disclosed:'已披露',undisclosed:'未披露',supported:'有依据',unsupported:'无依据',approved:'已确认获准',unverified:'未核实许可',not_applicable:'用户明确选择不适用'};
const METRIC={views:'播放量（采用该平台后台同一统计口径）',follow:'该视频带来的新增关注数',try:'获准入口后实际首次完成核心任务的激活数'};
const SOURCE_BASIS='官方公开来源；不代表审核通过或平台推荐权重';
const EDITORIAL='编辑假设；用于组织这轮对照，不代表平台时长限制或推荐权重';
const SELF='用户自报；本工具未核验画面与内容真实性';
const FILE='本地文件元数据；仅时长和尺寸，不包含语义理解';
const textValue=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const validNumber=v=>typeof v==='number'&&Number.isFinite(v);
const positive=v=>validNumber(v)&&v>0;
const integer=v=>validNumber(v)&&Number.isSafeInteger(v)&&v>=0;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const reason=(text,basis,trigger,sourceId)=>({...{text,basis,trigger},...(sourceId?{sourceId}:{})});
const action=(id,text,basis,trigger)=>({id,text,basis,trigger});
const aspectOf=(w,h)=>w===h?'square':w>h?'horizontal':'vertical';
function metadata(media){
 if(!media||typeof media!=='object'||!positive(media.durationSeconds)||!integer(media.width)||media.width===0||!integer(media.height)||media.height===0||!integer(media.bytes)||media.bytes===0)return null;
 return {durationSeconds:media.durationSeconds,width:media.width,height:media.height,bytes:media.bytes,aspect:aspectOf(media.width,media.height)};
}
function normalized(input){
 const x={mode:input.mode==='file'?'file':'draft',contentType:['general','app','drama','tutorial'].includes(input.contentType)?input.contentType:'general',goal:['views','follow','try'].includes(input.goal)?input.goal:'views',title:textValue(input.title,120),audience:textValue(input.audience,120),hook:textValue(input.hook,400),summary:textValue(input.summary,1200),durationSeconds:positive(input.durationSeconds)?input.durationSeconds:null,aspect:['vertical','horizontal','square'].includes(input.aspect)?input.aspect:'unknown'};
 for(const [k,values]of Object.entries(CHECKS))x[k]=values.includes(input[k])?input[k]:'unknown';
 return x;
}
function versionExperiment(p,x,shape,duration){
 const byPlatform={douyin:'只改变开头顺序：将已有结果镜头移到介绍之前',kuaishou:'只改变场景举例：把泛泛描述替换为一个具体使用场景',xiaohongshu:'只补充一个适用限制：说明原有方法在哪种情况下不适用',bilibili:'只添加章节标记：按已有内容顺序标出操作步骤',weixin:'只补充一句背景：让未看过前文的观众知道视频在解决什么问题',toutiao:'只修改标题的主体表达：明确原有内容针对的对象'};
 let variant=byPlatform[p.id];
 if(x.contentType==='drama')variant={douyin:'只改变开头顺序：将已有的核心冲突镜头提前',kuaishou:'只补充一句角色关系说明：帮助观众理解已有剧情',xiaohongshu:'只补充一个自己的分析观点：解释已有剧情中的一个选择',bilibili:'只添加剧情章节标记：按已有叙事顺序标出段落',weixin:'只补充一句前情背景：帮助独立观看者理解已有剧情',toutiao:'只修改标题的作品属性表达：明确内容属于影视或动漫'}[p.id];
 if(p.id==='douyin'&&x.opening==='result'&&x.contentType!=='drama')variant='只调整首屏的一句结果说明：测试另一种具体表达，保留已有镜头顺序';
 if(p.id==='douyin'&&x.contentType==='drama'&&x.opening==='conflict')variant='只调整首屏的一句冲突提示：测试另一种具体表达，保留已有镜头顺序';
 if(p.id==='bilibili'&&shape==='horizontal'&&duration>=180&&(x.proof==='steps'||x.proof==='demo'))variant='只添加章节标记：按已有横屏教程的操作顺序标出步骤（180秒为本工具编辑假设）';
 return {variant,control:'仅改变上面指定的一项，其余开头内容、场景、讲解、画幅、字幕、声音、结尾引导和发布设置保持原方案；对照同账号、同平台、相近题材和时长、相同观察窗及流量来源的历史作品，不重复重发刷样本。历史对照仍可能存在混杂差异，不能证明因果',window:'72 小时（本工具观察窗口，可改为24小时或7天；不是官方流量周期）',metric:METRIC[x.goal]};
}
/** Evaluate only user declarations and optional measured metadata, never the video story itself. */
export function evaluateVideo(input={},media=null,rules={}){
 input=input&&typeof input==='object'?input:{};rules=rules&&typeof rules==='object'?rules:{};
 const x=normalized(input),measured=x.mode==='file'?metadata(media):null;
 const unknown=[],supplied=[],conflicts=[],blockers=[],fixes=[];
 const addFix=(id,text,basis,trigger)=>{if(!fixes.some(a=>a.id===id))fixes.push(action(id,text,basis,trigger));};
 const missing=k=>{unknown.push(`${LABELS[k]}：未确认，请补充后再确定首轮小测平台`);};
 if(!x.audience)missing('audience');else supplied.push('目标受众：用户自报，已填写（原文不进入分析事件）');
 if(x.mode==='file'){
  if(!measured){unknown.push('本地文件元数据：未成功读取有效文件，请重新选择文件或切换脚本草稿模式');addFix('media','重新选择可读取的视频；也可改用草稿模式填写时长和画幅',FILE,'文件模式未获得有效元数据');}
  else{
   supplied.push(`本地文件元数据：${measured.durationSeconds} 秒，${measured.width}×${measured.height}，${measured.bytes} 字节，${VALUES[measured.aspect]}`);
   if(x.aspect!=='unknown'&&x.aspect!==measured.aspect)conflicts.push(`画幅冲突：文件为${VALUES[measured.aspect]}，用户填写为${VALUES[x.aspect]}；请核对当前文件或改正填写`);
   // One second is only a rounding tolerance for manual fields, never a platform limit.
   if(x.durationSeconds!==null&&Math.abs(x.durationSeconds-measured.durationSeconds)>1)conflicts.push(`时长冲突：文件为 ${measured.durationSeconds} 秒，用户填写为 ${x.durationSeconds} 秒；请核对（仅容许1秒的编辑舍入差）`);
   if(own(input,'durationSeconds')&&input.durationSeconds!==null&&input.durationSeconds!==undefined&&!positive(input.durationSeconds))conflicts.push('时长填写无效：必须是大于0的有限数字；文件已读取，但请先纠正输入');
  }
 }
 const duration=measured?.durationSeconds??x.durationSeconds,shape=measured?.aspect??x.aspect;
 if(duration===null)missing('durationSeconds');else if(!measured)supplied.push(`视频时长：用户自报 ${duration} 秒，未读取文件验证`);
 if(shape==='unknown')missing('aspect');else if(!measured)supplied.push(`画幅：用户自报${VALUES[shape]}，未读取文件验证`);
 for(const k of Object.keys(CHECKS)){
  if(x[k]==='unknown')missing(k);else supplied.push(`${LABELS[k]}：用户自报，${VALUES[x[k]]}`);
 }
 const blocking=[['rights','uncertain','确认画面、音乐、字体、人物肖像等素材的授权或其他合法使用依据','素材权利尚有疑问，暂不安排发布小测'],['ai','unlabelled','在实际发布页主动声明 AI 生成合成内容，并使用平台相应标识','AI 内容尚未按自报情况完成标识'],['commercial','undisclosed','按真实商业关系和发布入口要求补全披露','商业关系尚未披露'],['claim','unsupported','删除无法证实的效果承诺，或补充可核验的真实依据及适用条件','宣传或效果声明缺少依据'],['destination','unverified','先在账号后台核实可用推广及承接入口，获准后再设计引导','承接入口许可尚未核实']];
 for(const [k,v,fix,block]of blocking)if(x[k]===v){blockers.push(block);addFix(k,fix,'发布前人工核验；用户自报缺项',`${LABELS[k]}：${VALUES[v]}`);}
 if(x.goal==='try'&&x.destination==='not_applicable'){
  conflicts.push('试用目标与“不适用承接入口”不一致；请确认获准入口，或改为播放/关注目标');addFix('goal-destination','试用目标需要确认获准的承接路径；没有路径时先选择播放或关注目标',SELF,'目标为试用，承接入口选择不适用');
 }
 if(conflicts.length)addFix('conflict','先核对并修正互相冲突的资料，然后重新评估',FILE+'；与用户填写对照',conflicts.join('；'));
 if(unknown.length)addFix('missing','补齐未确认项；仅在确实无关时明确选择“不适用”',SELF,unknown.slice(0,3).join('；'));
 if(x.opening==='intro')addFix('opening','把本条的具体结果、问题或人物冲突放到介绍之前，再保留必要背景',EDITORIAL,'开头为介绍铺垫');
 if(x.proof==='none'){blockers.push('内容证据或叙事方式尚未提供，请先补充再安排小测');addFix('proof',x.contentType==='drama'?'补上角色目标、关系和可理解的剧情承接':'补充一个真实过程、可复现步骤或有出处的例子，兑现视频承诺',EDITORIAL,'内容证据或叙事方式为未提供');}
 if(x.captions==='no'){blockers.push('已知没有字幕或难读，请先修正可读性再安排小测');addFix('captions','补上可读字幕，并在手机尺寸下核对遮挡与关键界面的字号',EDITORIAL,'用户自报没有字幕或难读');}
 if(x.audio==='unclear'){blockers.push('已知声音不清晰，请先修正声音再安排小测');addFix('audio','修正人声与背景音的关系；如视频不依赖声音，检查静音时能否独立理解',EDITORIAL,'用户自报声音不清晰');}
 const blocked=blockers.length>0||conflicts.length>0;
 const status=blocked?'revise':unknown.length?'needs-info':'test';
 // Explicit version hypotheses; matching these is not a forecast or an inferred platform algorithm.
 let candidates=[];
 if(status==='test'){
  if(shape==='horizontal'&&duration>=180&&['steps','demo'].includes(x.proof)&&(x.contentType==='tutorial'||x.contentType==='app'))candidates=['bilibili'];
  else if(shape==='vertical'&&duration<=60&&x.proof==='demo'&&['result','problem'].includes(x.opening))candidates=['douyin','kuaishou'];
 }
 const rulePlatforms=Array.isArray(rules.platforms)?rules.platforms:[];
 const platforms=PLATFORM_IDS.map(id=>{
  const p=rulePlatforms.find(p=>p?.id===id)||{id,name:NAMES[id],sources:[]};
  const sourceIds=(Array.isArray(p.sources)?p.sources:[]).map(s=>s?.id).filter(s=>typeof s==='string');
  const reasons=[],actions=[];
  const firstSource=sourceIds[0];
  const factBasis=measured?FILE:SELF;
  if(shape!=='unknown')reasons.push(reason(`目前${measured?'文件测得':'用户填写'}为${VALUES[shape]}；观看前仍需人工核对画面和字幕可读性`,factBasis,`画幅：${VALUES[shape]}`));
  if(x.contentType==='app'){
   const copy={douyin:'把真实结果与关键操作放在同一条演示中，便于检验承诺是否兑现',kuaishou:'用一个具体场景和可复现步骤解释用途，避免只列功能名称',xiaohongshu:'明确谁适用、谁不适用，展示实际体验、收费和使用限制',bilibili:'完整操作路径、失败场景与适用边界可以组成教程版本',weixin:'分享出去后，观众应无需原有上下文也能理解用途',toutiao:'在标题和正文中交代目标用户、解决过程、结果与限制'};
   reasons.push(reason(copy[id],EDITORIAL,'内容类型：App／工具演示'));
  }else if(x.contentType==='drama'){
   const copy={douyin:'让单条剧情片段交代角色目标和冲突',kuaishou:'保留角色关系和前后承接，避免只剩刺激镜头',xiaohongshu:'可测试有增量观点的题材解读或制作过程，不将搬运默认当原创',bilibili:'可测试完整叙事单元、制作过程或有观点的解读',weixin:'保留独立可理解的剧情，同时明确虚构属性',toutiao:'标题交代影视或动漫属性，避免让虚构剧情被误认作现实新闻'};
   reasons.push(reason(copy[id],EDITORIAL,'内容类型：剧情／AI 漫剧'));
  }else{
   const copy={douyin:'可用精简开头与完整说明的两个原创版本检验表达方式',kuaishou:'可用具体场景与可复现过程检验内容是否易理解',xiaohongshu:'可把人群、体验和可复用步骤整理为一个明确主题',bilibili:'可测试完整解释、章节与适用边界组成的版本',weixin:'可测试转发后无需上下文也能理解的独立表达',toutiao:'可测试明确主体和结论的标题与完整讲解'};
   reasons.push(reason(copy[id],EDITORIAL,`内容类型：${x.contentType==='tutorial'?'教程':'通用视频'}`));
  }
  if(firstSource)reasons.push(reason(id==='weixin'?'本轮未读到视频号规范官方全文，也未登录后台；发布前需核对现行规则和账号能力':'请按来源复核内容权利、真实表达、所需声明和当前发布入口；本工具没有审核权限',id==='weixin'?'官方入口已找到；全文与账号能力未核验':SOURCE_BASIS,id==='weixin'?'来源核验状态：官方全文不可访问':'发布前规则核对',firstSource));
  else reasons.push(reason('规则证据未载入，需先打开工具来源页完成核对','证据缺失','未提供本平台来源'));
  if(candidates.includes(id))reasons.push(reason(id==='bilibili'?'横屏、分步或真实演示、至少180秒的完整教程可先在 B站做一轮版本小测；其他平台仍可测试重剪版本':'竖屏、真实演示、先给结果或问题、至多60秒的精简版本，可在抖音与快手并列做首轮小测，不分内部名次',EDITORIAL,id==='bilibili'?'横屏＋完整教程／App 演示＋步骤／演示＋时长≥180秒（编辑假设）':'竖屏＋真实演示＋结果／问题开头＋时长≤60秒（编辑假设）'));
  if(status==='needs-info')reasons.push(reason('先补齐输入证据，再决定是否列入首轮小测',SELF,'仍有未确认项'));
  if(status==='revise')reasons.push(reason('先解决已知缺项或输入冲突；当前不安排发布小测','发布前人工核验',blockers.concat(conflicts).join('；')));
  if(x.goal==='try')actions.push('先确认账号获准的承接方式，记录入口访问与首次完成核心任务，不能把播放量当激活。');
  else if(x.goal==='follow')actions.push('结尾明确下一条会继续解决什么问题，再观察同一窗口新增关注。');
  if(x.opening==='intro')actions.push('把结果、问题或冲突提前，减少理解主题前的介绍铺垫。');
  if(x.captions==='no'||x.audio==='unclear')actions.push('先修正字幕或声音；分别检查手机观看和静音场景是否可理解。');
  if(x.proof==='none')actions.push(x.contentType==='drama'?'补上角色目标与剧情承接。':'补上真实演示、可复现步骤或可核验的依据。');
  if(id==='bilibili'&&shape==='horizontal'&&duration>=180&&['demo','steps'].includes(x.proof))actions.push('按真实操作步骤添加章节，并展示一个失败场景或适用边界。');
  if(id==='xiaohongshu'&&x.contentType==='app')actions.push('在真实使用过程旁说明费用、设备和适用条件；不要虚构亲测。');
  if(id==='weixin')actions.push('发布前在视频号实际后台核对标识、规则和可用入口，当前证据不能代替核验。');
  if(id==='toutiao')actions.push('核对标题主体与结论是否被视频兑现；不要删掉重发或轻微改词刷实验样本。');
  const tier=status==='revise'?'revise':status==='needs-info'?'needs-info':id==='weixin'||!sourceIds.length?'verify':candidates.includes(id)?'priority':'test';
  return {id,name:typeof p.name==='string'?p.name:NAMES[id],tier,reasons,actions,experiment:versionExperiment({...p,id},x,shape,duration),sourceIds};
 });
 const priority=platforms.filter(p=>p.tier==='priority').map(p=>p.id);
 // No evidence means no arbitrary winner. More than two tied candidates remain ordinary tests.
 const safePriority=priority.length<=2?priority:[];
 if(priority.length>2)for(const p of platforms)if(p.tier==='priority')p.tier='test';
 return {version:typeof rules.version==='string'?rules.version:'unversioned',status,mode:x.mode,measured,supplied,unknown,conflicts,blockers,priority:safePriority,alternate:null,topActions:fixes.slice(0,3),platforms,limitations:[
 '这是发布前编辑检查与版本小测方案，不是爆款预测、平台算法评分、流量保证或审核结论。',
 '文件只在本地读取时长、尺寸和字节数；没有观看理解画面、识别剧情、转写声音或核验素材权利。',
 '受众、内容、声明和授权均是用户自报；“不适用”须由用户按真实情况选择，并非已完成核验。',
 '60秒和180秒仅用于组织版本的编辑假设，1秒仅为时长填写的舍入容差，均不是平台硬限制。',
 '未使用账号历史数据、同一时期竞争内容或平台私有数据；所有候选必须通过实际发布数据复核。',
 '视频号官方全文本轮未读取成功；其他来源也只支持其原文范围，不证明账号允许发布或必获推荐。',
 ...(safePriority.length?[]:['当前没有足够区分依据选出唯一或两个首选；六个平台保留可测试版本，不凭排列顺序决定优先级。'])]};
}
/** Descriptive same-context comparison; a supplied baseline is a median, not a forecast. */
export function comparePerformance(data={}){
 data=data&&typeof data==='object'?data:{};
 const metric=['views','follows','activations'].includes(data.metric)?data.metric:null;
 const current=integer(data.current)&&data.current<=1e12?data.current:null;
 const baseline=validNumber(data.baseline)&&data.baseline>=0&&data.baseline<=1e12?data.baseline:null;
 const baselineCount=integer(data.baselineCount)&&data.baselineCount>=1&&data.baselineCount<=10000?data.baselineCount:null;
 const out={status:'invalid',metric,current,baseline,baselineCount,delta:null,relative:null,notes:[]};
 if(metric===null)out.notes.push('请选择播放量、新增关注或实际激活中的同一个主指标。');
 if(current===null)out.notes.push('当前值须为0至1万亿的整数；缺失不当作0。');
 if(baseline===null)out.notes.push('历史中位数须为0至1万亿的有限数字；允许小数，缺失不当作0。');
 if(baselineCount===null)out.notes.push('历史作品数须为1至10000的整数；没有基线作品时不能比较中位数。');
 if(!PLATFORM_IDS.includes(data.platform))out.notes.push('请选择一个已支持的平台，不能将不同平台数据合并。');
 if(!['24h','72h','7d'].includes(data.window))out.notes.push('请选择24小时、72小时或7天中的同一观察窗。');
 if(!['views','follow','try'].includes(data.goal))out.notes.push('请选择本条视频的主要目标。');
 if(out.notes.length)return out;
 const expected={views:'views',follow:'follows',try:'activations'}[data.goal];
 if(metric!==expected)out.notes.push('目标与主指标不一致；试用目标用实际激活，关注目标用新增关注，播放目标用播放量。');
 const flags={accountMatch:'同一账号',platformMatch:'同一平台',windowMatch:'相同观察窗',trafficMatch:'同类流量来源（自然或付费等）',contentMatch:'相近题材、形式和时长'};
 for(const [k,label]of Object.entries(flags))if(data[k]!==true)out.notes.push(`尚未明确确认${label}，不能计算可比增幅。`);
 if(out.notes.length){out.status='incomparable';return out;}
 out.delta=current-baseline;
 if(baseline===0)out.notes.push('历史中位数为0，仅报告绝对差，不计算增长比例。');
 else{
  const relative=out.delta/baseline;
  if(Number.isFinite(relative))out.relative=relative;
  else out.notes.push('历史中位数过小，比例超出安全数值范围，仅报告绝对差。');
 }
 out.status=baselineCount<5?'descriptive':'compared';
 if(baselineCount<5)out.notes.push('历史作品不足5条，仅作少量样本描述；5条是本工具提醒口径，不是统计显著性的标准。');
 out.notes.push('当前值和历史中位数均由用户填写，须来自同一主指标及同一后台口径；本工具未连接平台后台核验。');
 out.notes.push('差值只是描述，不证明修改导致变化、统计显著性或已经成为爆款；自然波动和同期内容仍可能影响结果。');
 return out;
}
const safeMarkdown=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\`*_{}\[\]()#!|]/g,'\\$&');
/** Export the local assessment only. Deliberately omit all raw titles, scripts, links and file names. */
export function reportMarkdown(result,input={}){
 if(!result||!Array.isArray(result.platforms))return '尚未生成有效评估，请先完成评估。';
 const statuses={'needs-info':'补充信息后再评估',revise:'先修改或核对，再评估',test:'可准备小测，仍需人工核验'};
 const lines=['# 视频发布评估报告','',`规则版本：${safeMarkdown(result.version)}`,`当前状态：${statuses[result.status]||'待核对'}`,'','报告基于用户自报和可选的本地文件元数据；原始标题、脚本、链接和文件名不进入此报告。',''];
 for(const [name,items]of [['已提供',result.supplied],['未确认',result.unknown],['输入冲突',result.conflicts],['发布前缺项',result.blockers]])if(items?.length){lines.push(`## ${name}`,'',...items.map(s=>`- ${safeMarkdown(s)}`),'');}
 if(result.topActions?.length)lines.push('## 优先修改','',...result.topActions.map(a=>`- ${safeMarkdown(a.text)}（依据：${safeMarkdown(a.basis)}；触发：${safeMarkdown(a.trigger)}）`),'');
 const tiers={priority:'并列首轮小测候选',alternative:'备选版本',test:'待小测版本',revise:'先修改', 'needs-info':'先补信息',verify:'先核验规则'};
 for(const p of result.platforms){lines.push(`## ${safeMarkdown(p.name)}：${tiers[p.tier]||'待核对'}`,'',...p.reasons.map(r=>`- ${safeMarkdown(r.text)}（${safeMarkdown(r.basis)}；触发：${safeMarkdown(r.trigger)}${r.sourceId?`；来源ID：${safeMarkdown(r.sourceId)}`:''}）`),...p.actions.map(a=>`- 修改：${safeMarkdown(a)}`),`- 小测版本：${safeMarkdown(p.experiment.variant)}`,`- 对照：${safeMarkdown(p.experiment.control)}`,`- 观察窗口：${safeMarkdown(p.experiment.window)}`,`- 主指标：${safeMarkdown(p.experiment.metric)}`,'');}
 lines.push('## 适用边界','',...(result.limitations||[]).map(s=>`- ${safeMarkdown(s)}`));return lines.join('\n');
}
