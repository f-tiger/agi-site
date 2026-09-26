// Shared first-party feature map. Paths describe existing pages, not executable MCP tools.
export const JOURNEY_GROUPS = [
  {id:'create',zh:'制作与交付',en:'Create & deliver'},
  {id:'choose',zh:'选择工具与控制成本',en:'Choose tools & control costs'},
  {id:'connect',zh:'开发者与厂商',en:'Developers & vendors'},
];
// Mirrors build.mjs GATED_TOOLS. Registration applies to interactive use, not public descriptions.
const REGISTERED_TOOL_PATHS = new Set(['/llm-api-calculator','/publish-check','/stack-builder','/video-quota-planner','/subscription-audit','/tokenizer','/pipeline/video','/free-for-you']);
const entry=(id,path,group,type,zh,en,zhDesc,enDesc,next=[],extra={})=>({id,path,group,type,title:{zh,en},description:{zh:zhDesc,en:enDesc},requiresRegistration:REGISTERED_TOOL_PATHS.has(path),next,...extra});
export const SITE_JOURNEYS = [
  entry('account','/account','connect','membership','免费会员与我的清单','Free membership & my list','注册用户名和密码，跨设备同步关注清单，查看站内变更并使用免费会员工具。','Create a username and password, sync followed tools, review in-account changes and use free member tools.',['directory','work-plan','members']),
  entry('watch','/watch','connect','tool','免费额度变更监控','Free-tier change watch','登记 HTTPS webhook 并选择工具，接收核实后的额度变化；免费档可监控 3 个工具。','Register an HTTPS webhook and selected tools to receive verified allowance changes; the free tier covers three tools.',['changes','quotawatch','mcp'],{optionalRegistration:{zh:'需要登记有效 webhook 才能接收通知；无需会员账户。',en:'Receiving notifications requires registering a valid webhook; no member account is needed.'}}),
  entry('design-quotas','/design-quota-board','choose','guide','设计额度与版权对照','Design allowances & rights','核对设计工具的免费限制、导出条件与作品归属。','Review design-tool free limits, export conditions and ownership terms.',['commercial','images','stack']),
  entry('search-quotas','/search-quota-board','choose','guide','搜索额度对照','Search allowance comparison','查看搜索工具官方公布或未公布的免费额度与限制。','See which free allowances and restrictions search vendors publish or leave undisclosed.',['chat-quotas','directory','report']),
  entry('writing-quotas','/writing-quota-board','choose','guide','写作额度对照','Writing allowance comparison','比较写作产品的免费计量方式、额度及使用限制。','Compare free-tier metering, allowances and restrictions for writing products.',['work-plan','subscription','commercial']),
  entry('office-quotas','/office-quota-board','choose','guide','办公额度对照','Office allowance comparison','核对办公 AI 工具的免费额度、试用和功能限制。','Review free allowances, trials and feature restrictions for office AI tools.',['work-plan','pdf','subscription']),
  entry('vendors','/for-vendors','connect','vendor','厂商收录说明','Vendor listing guide','了解厂商自荐、收录审核与独立赞助的条件。','Review vendor submissions, listing review and separate sponsorship conditions.',['submit','launchdesk','advertise']),
  entry('changes','/changes','choose','guide','免费额度变化记录','Free-tier change log','查看站内已记录的额度变更，继续核对对应来源。','Review recorded allowance changes and follow the corresponding sources.',['watch','quotawatch','report']),
  entry('report','/report','choose','guide','免费额度核实报告','Verified free-tier report','查看核实结果与方法，并获取带出处的数据引用格式。','Review verification findings and methods, with ready-to-use data attribution formats.',['developers','changes','directory']),
  entry('compare','/vs/','choose','hub','工具两两比较','Head-to-head tool comparisons','按同类工具查看免费档、限制与来源的逐项对比。','Compare peer tools item by item across free tiers, restrictions and sources.',['directory','subscription','upgrade']),
  entry('upgrade','/upgrade/','choose','hub','升级付费档前核对','Check before upgrading','查看站内工具升级对照与付费档相关信息，再决定是否需要升级。','Review upgrade comparisons and paid-tier information before deciding whether to upgrade.',['subscription','work-plan','compare']),

  entry('workbench','/workbench','create','hub','业务交付工具台','Business delivery workbench','查看赞助投放准备、额度快照比较与视频交接工具。','Explore sponsorship preparation, quota snapshot comparison and video handoff tools.',['creatorops','quotawatch','launchdesk']),
  entry('creatorops','/workbench/creatorops','create','tool','视频制作交接单','CreatorOps production handoff','输入片段时间、证据与版权备注，整理制作交接单；不自动生成视频。','Organize clip timings, evidence and rights notes into a production handoff; does not generate video.',['video','commercial','images'],{optionalRegistration:{zh:'本地计算与导出无需注册；云工作区使用会员账户。',en:'Local calculations and exports need no signup; cloud workspaces use a member account.'}}),
  entry('quotawatch','/workbench/quotawatch-pro','choose','tool','额度快照比较','QuotaWatch snapshot comparison','比较两份自行提供的额度快照，检查单位与周期变化；不会自动监控厂商。','Compare two snapshots you supply, checking units and periods; does not automatically monitor vendors.',['api-budget','subscription','workbench'],{optionalRegistration:{zh:'本地比较无需注册；云工作区使用会员账户。',en:'Local comparisons need no signup; cloud workspaces use a member account.'}}),
  entry('launchdesk','/workbench/launchdesk','connect','tool','赞助投放准备台','LaunchDesk sponsorship preparation','整理工具投放材料与预算，然后查看实际广告库存与付款条件。','Prepare tool placement details and a budget, then review live advertising inventory and payment terms.',['advertise','submit'],{optionalRegistration:{zh:'本地准备无需注册；付费广告条件以结账页为准。',en:'Local preparation needs no signup; paid placement terms are shown at checkout.'}}),
  entry('video-quotas','/video-quota-planner','choose','tool','视频额度规划','Video quota planner','对照视频免费额度、积分换算、商用条件与水印限制。','Compare video free allowances, credit conversions, commercial-use conditions and watermark restrictions.',['video-pipeline','video','commercial']),
  entry('video-pipeline','/pipeline/video','choose','tool','视频产能规划','Video capacity planner','核对图片、配音、音乐与视频环节的额度，寻找工作流程的瓶颈。','Compare allowances for images, voice, music and video to find workflow bottlenecks.',['video-quotas','video','creatorops']),
  entry('role-planner','/free-for-you','choose','tool','按角色选择免费工具','Free tools by role','按学生、开发者或创作者等角色查看免费工具与额度方案。','Explore free tools and allowance plans for students, developers and creators.',['work-plan','stack','directory']),
  entry('coding-quotas','/coding-quota-board','choose','guide','编程额度对照','Coding quota comparison','核对编程工具的免费额度、限制与官方来源。','Review coding-tool free allowances, restrictions and official sources.',['coding','api-budget','release']),
  entry('chat-quotas','/chat-limits-board','choose','guide','聊天额度对照','Chat allowance comparison','比较聊天产品已核实的免费档限制与计量方式。','Compare verified free-tier restrictions and metering for chat products.',['subscription','work-plan','directory']),
  entry('image-quotas','/image-quota-board','choose','guide','图片额度对照','Image allowance comparison','比较图片工具的免费额度与使用约束。','Compare image-tool free allowances and usage restrictions.',['images','commercial','video-pipeline']),
  entry('audio-quotas','/audio-quota-board','choose','guide','音频额度对照','Audio allowance comparison','比较配音与音乐工具的免费额度及产出使用条件。','Compare voice and music free allowances and output-use conditions.',['video-pipeline','commercial','creatorops']),

  entry('studio','/studio/','create','hub','自研工具','Built by BPJ','直接打开 BPJ 自研的计算、制作与导出工具。','Open BPJ tools for calculations, production and exports.',['video','pdf','images','quote','workbench']),
  entry('video','/studio/video-variants','create','tool','商品视频变体','Product video variants','用已有商品图和短视频制作多开场、多画幅视频与字幕。','Turn existing product images and clips into multiple openings, formats and subtitles.',['images','creatorops','video-studio','commercial'],{featured:true,optionalRegistration:{zh:'云项目保存使用会员账户；本地制作与导出无需注册。',en:'Cloud projects use a member account; local editing and export need no signup.'}}),
  entry('pdf','/studio/pdf-tools','create','tool','PDF 整理工具','PDF workbench','在浏览器内合并、选页、重排、旋转 PDF，或将图片转为 PDF。','Merge, select, reorder and rotate PDF pages or convert images to PDF in your browser.',['images','quote'],{featured:true}),
  entry('images','/studio/product-images','create','tool','商品图批处理','Product image batch tools','批量裁切、缩放、压缩和转格式；支持边缘相连的纯色背景处理。','Batch crop, resize, compress and convert images; process plain backgrounds connected to the edges.',['video','pdf'],{featured:true}),
  entry('quote','/studio/quote-compare','create','tool','供应商报价比较','Supplier quote comparison','统一比较箱规、起订量、税运费与交期，导出问题清单和比较表。','Compare pack sizes, minimum orders, tax, freight and lead times; export a comparison and open questions.',['pdf','work-plan'],{featured:true}),
  entry('video-studio','/video/','create','hub','视频工作室与案例','Video studio & examples','按上新、改稿与多画幅交付场景选择工作流程。','Choose a workflow for product launches, revisions and delivery across formats.',['video','images','members']),
  entry('work-plan','/work-plan','choose','tool','岗位 AI 方案','AI work planner','按任务与工作量核对免费额度，计算可执行的工具方案。','Check free-tier capacity against your tasks and workload to plan a tool setup.',['stack','api-budget','members'],{featured:true,optionalRegistration:{zh:'云保存与版本记录使用会员账户。',en:'Cloud saving and version history use a member account.'}}),
  entry('directory','/#chat','choose','directory','外部 AI 工具目录','External AI tool directory','浏览第三方 AI 产品与免费档信息，继续到对应产品页。','Browse third-party AI products and their free-tier information, then open the relevant product page.',['compare','role-planner','agents','stack']),
  entry('coding','/c/coding','choose','directory','编程工具','Coding tools','比较编程类产品及站内已核实的免费档信息。','Compare coding products and the free-tier information verified on BPJ.',['coding-quotas','api-budget','agents','release']),
  entry('agents','/agents/','choose','directory','Agent 与 MCP 目录','Agent & MCP directory','按用途与接入方式浏览带来源的 Agent、MCP 和平台记录。','Browse source-backed agent, MCP and platform records by use case and connection type.',['mcp','coding','stack']),
  entry('api-budget','/llm-api-calculator','choose','tool','免费 API 额度计算','Free API capacity calculator','输入调用量与 Token 用量，对照已核实的免费档。','Compare call volumes and token use with verified free-tier allowances.',['tokens','quotawatch','subscription','mcp']),
  entry('tokens','/tokenizer','choose','tool','本地 Token 计数','Local token counter','在浏览器内计算文本 Token 数量，文本不上传。','Count text tokens locally in your browser without uploading the text.',['api-budget','coding']),
  entry('subscription','/subscription-audit','choose','tool','AI 订阅体检','AI subscription audit','按实际使用检查哪些订阅值得保留。','Review which subscriptions fit your actual use.',['work-plan','upgrade','stack']),
  entry('stack','/stack-builder','choose','tool','免费工具栈','Free tool stack builder','按任务组合工具，并按商用等约束筛选。','Assemble tools for tasks and filter by constraints such as commercial use.',['work-plan','commercial','directory']),
  entry('commercial','/publish-check','choose','tool','商用授权核查','Commercial-use check','依据站内已核实条款检查产出使用条件。','Review output-use conditions against the verified licence records.',['video','stack']),
  entry('members','/members','connect','membership','会员与云保存','Membership & cloud saving','了解账户、云项目保存与会员权益；以页面当前条件为准。','Review accounts, cloud project saving and membership benefits under the terms shown on the page.',['work-plan','video-studio'],{optionalRegistration:{zh:'付费云功能与免费账户权益不同；说明页公开。',en:'Paid cloud features are separate from free account benefits; this information page is public.'}}),
  entry('mcp','/mcp','connect','developer','MCP 接入','MCP integration','通过现有 MCP 查询目录与核实数据；功能地图资源仅用于发现页面。','Query directory and verified data through MCP; the feature-map resource only helps discover pages.',['developers','agents']),
  entry('developers','/developers','connect','developer','API 与开放数据','APIs & open data','查看结构化数据、接口与引用方式。','Find structured data, APIs and attribution instructions.',['mcp','watch','api-budget']),
  entry('submit','/submit','connect','vendor','提交 AI 工具','Submit an AI tool','提交工具供审核；免费收录与赞助位独立。','Submit a tool for review; free listings and sponsorship are separate.',['advertise','directory']),
  entry('advertise','/advertise','connect','vendor','厂商赞助','Vendor sponsorship','查看赞助位、价格、历史触达与当前付款条件。','Review sponsorship placements, pricing, historical reach and current payment terms.',['launchdesk','submit']),
  entry('release','/studio/release-check','connect','pilot','收费应用验收试点','Paid-app review pilot','了解拟议 $299 验收服务的范围并提交真实任务；这不是在线验收或结账。','Review the proposed $299 acceptance-review scope and submit a real task; this is not an online test or checkout.',['coding','studio']),
];
export const JOURNEY_TYPES={guide:{zh:'额度指南',en:'Allowance guide'},tool:{zh:'直接使用',en:'Open tool'},hub:{zh:'工作台',en:'Workspace'},directory:{zh:'外部产品目录',en:'Product directory'},membership:{zh:'会员说明',en:'Membership'},developer:{zh:'开发者',en:'Developer'},vendor:{zh:'厂商入口',en:'For vendors'},pilot:{zh:'需求试点',en:'Demand pilot'}};
export function localizedJourneys(lang='en',base=''){
  const locale=lang==='zh'?'zh':'en';
  return SITE_JOURNEYS.map(x=>({...x,title:x.title[locale],description:x.description[locale],url:base+x.path,typeLabel:JOURNEY_TYPES[x.type][locale],optionalRegistration:x.optionalRegistration?.[locale]||null,registrationNote:x.requiresRegistration?(locale==='zh'?'免费注册后使用交互工具；说明与来源公开。':'Free registration is required for interactive use; descriptions and sources are public.'):null}));
}
export function relatedJourneys(path,lang='en',base='',limit=3){
  const normalized=path.replace(/^https?:\/\/[^/]+/,'').replace(/^\/en(?=\/)/,'').replace(/\.html$/,'');
  const list=localizedJourneys(lang,base);
  const current=list.find(x=>x.path===normalized);
  return current ? current.next.map(id=>list.find(x=>x.id===id)).filter(Boolean).slice(0,limit) : [];
}
