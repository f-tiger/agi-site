import {readFileSync} from 'node:fs';
import {evaluateTool, getTool, tradeGroups} from '../lib/trade-workbench/engine.mjs';

const hubPath = '/studio/trade-tools/';
export const tradeMcpPath = hubPath + 'mcp/';
export const tradeMcpKeysPath = tradeMcpPath + 'keys/';
const manifestPath = '/.well-known/trade-mcp.json';
const assetPath = '/studio-assets/';
const edition = 'trade-mcp1';

const keyPage = ({zh, title, origin, docs, join, esc}) => {
  const t = (cn,en) => zh ? cn : en;
  const alternate = (zh ? '/en' : '') + tradeMcpKeysPath;
  return `<!DOCTYPE html>
<html lang="${zh ? 'zh-Hans' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title>${esc(title)} · BPJ</title>
<link rel="canonical" href="${esc(origin + (zh ? '' : '/en') + tradeMcpKeysPath)}">
<link rel="stylesheet" href="${assetPath}trade-workbench.css">
<link rel="stylesheet" href="${assetPath}trade-mcp.css?v=${edition}">
<script type="module" src="${assetPath}trade-mcp-keys.mjs?v=${edition}"></script>
</head>
<body class="trade-mcp-private">
<main class="stage trade-suite trade-mcp trade-mcp-keys" data-trade-mcp-keys>
  <nav class="trade-crumb" aria-label="${t('导航','Navigation')}"><a href="${esc(docs)}">${t('外贸 MCP 接入说明','Trade MCP setup')}</a><a href="${alternate}" lang="${zh ? 'en' : 'zh-Hans'}">${zh ? 'English' : '中文'}</a></nav>
  <header class="trade-title"><h1>${t('外贸 MCP 密钥','Trade MCP keys')}</h1>
    <p>${t('用 BPJ 免费账户创建外贸工具专用密钥。每把密钥可独立换新或撤销。','Create scoped trade tool keys with your free BPJ account. Rotate or revoke a key independently.')}</p></header>
  <p id="trade-mcp-status" class="trade-status" role="status">${t('正在检查登录状态…','Checking your sign-in status…')}</p>
  <div class="trade-actions"><a class="trade-button" id="trade-mcp-sign-in" href="${esc(join)}" hidden>${t('免费注册或登录','Join free or sign in')}</a><button class="trade-secondary" type="button" id="trade-mcp-retry" hidden>${t('重新检查','Check again')}</button></div>
  <noscript><p>${t('请启用 JavaScript 后管理密钥。','Enable JavaScript to manage keys.')}</p><a href="${esc(join)}">${t('免费注册或登录','Join free or sign in')}</a></noscript>
  <section class="trade-use trade-mcp-section" id="trade-mcp-manager" hidden aria-labelledby="trade-mcp-manage-title">
    <h2 id="trade-mcp-manage-title">${t('管理密钥','Manage keys')}</h2><p id="trade-mcp-limits"></p>
    <form id="trade-mcp-create"><label for="trade-mcp-label">${t('密钥备注','Key label')}</label>
      <input id="trade-mcp-label" name="label" type="text" required maxlength="40" autocomplete="off" placeholder="${t('例如工作电脑','E.g., work laptop')}">
      <div class="trade-actions"><button class="trade-button" type="submit" id="trade-mcp-create-button">${t('创建密钥','Create a key')}</button></div>
    </form>
    <ul class="trade-mcp-key-list" id="trade-mcp-key-list" aria-label="${t('有效密钥','Active keys')}"></ul>
  </section>
  <section class="trade-use trade-mcp-section" id="trade-mcp-secret-panel" hidden aria-labelledby="trade-mcp-secret-title">
    <h2 id="trade-mcp-secret-title">${t('新密钥，仅本次可获取','New key, available once')}</h2>
    <p>${t('把密钥放进自己的 MCP 客户端配置。下载的文件含登录凭据，请私密保存。','Use this key in your own MCP client. The downloaded configuration contains a credential. Keep it private.')}</p>
    <label for="trade-mcp-secret">${t('外贸 MCP 密钥','Trade MCP key')}</label>
    <input id="trade-mcp-secret" type="password" readonly autocomplete="off" spellcheck="false">
    <div class="trade-actions">
      <button class="trade-secondary" type="button" id="trade-mcp-reveal" aria-pressed="false">${t('显示密钥','Show key')}</button>
      <button class="trade-secondary" type="button" id="trade-mcp-copy">${t('复制密钥','Copy key')}</button>
      <button class="trade-button" type="button" id="trade-mcp-download">${t('下载私密配置','Download private config')}</button>
      <button class="trade-secondary" type="button" id="trade-mcp-clear">${t('清除本页显示','Clear from this page')}</button>
    </div>
  </section>
</main>
</body>
</html>`;
};

export function buildTradeMcpPages({layout, esc, crumbLd, BASE, NAME, LOCALE, write, pushPage}) {
  const zh = LOCALE.code === 'zh';
  const t = (cn,en) => zh ? cn : en;
  const locale = zh ? '' : '/en';
  const lang = LOCALE.code;
  const origin = BASE.slice(0, BASE.length - locale.length);
  const hub = BASE + hubPath;
  const docs = BASE + tradeMcpPath;
  const keys = BASE + tradeMcpKeysPath;
  const join = BASE + '/account?next=' + encodeURIComponent(locale + tradeMcpKeysPath);
  const membership = BASE + '/members?tool=bpj-trade-toolbox#account-use';
  const toolCount = tradeGroups.reduce((count,group)=>count + group.tools.length,0);
  const tool = getTool('carton-cubic-volume');
  const sample = Object.fromEntries(tool.inputs.map(([id,,,,value])=>[id,value]));
  const sampleResult = evaluateTool(tool.id,sample).at(-1)[2];
  const formatExample = new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US',{maximumFractionDigits:6}).format(sampleResult);
  const sampleTitle = t(tool.zh,tool.en);
  const sampleSource = t(tool.source[0],tool.source[1]);
  const sampleURL = hub + tool.id;
  const dimensions = [sample.length,sample.width,sample.height].join(' × ');
  const exampleText = t(`每箱外尺寸 ${dimensions} 厘米，${sample.cartons} 箱，试算总体积 ${formatExample} 立方米。承运人可按包装和拼托后尺寸复测。`, `With ${sample.cartons} cartons measuring ${dimensions} cm each, the example shipment is ${formatExample} m³. Carriers may remeasure packed or palletized cargo.`);
  const title = t('外贸 AI 工具 MCP','Export trade MCP for AI agents');
  const description = t(`把 BPJ 的 ${toolCount} 个合规、关务、退税、外汇和物流工具接入 AI 助手。免费注册、创建专用密钥，网页与 MCP 共用每日额度。`, `Connect ${toolCount} BPJ tools for export compliance, customs, tax refunds, FX and logistics to an AI agent. A free account and scoped key unlock the same daily allowance as the web tools.`);
  const scope = t('MCP 结果包含工具依据和适用范围。提交或签署业务单据前，请按单项工具来源复核；这套工具提供计算和资料准备。','Each MCP result includes the tool’s reference and scope. Use the linked sources to review decisions before filing or signing trade documents. The tools support calculations and preparation.');
  const limits = t('游客每天可在网页运行 2 次。免费账户每天 10 次，关联有效 BPJ 会员后每天 100 次。账户的网页运行和所有 MCP 密钥共享额度，UTC 零点重置。','Guests get 2 runs a day on the web. Free accounts get 10. An active, linked BPJ membership increases the account allowance to 100. Account web runs and every MCP key share the same allowance, reset at midnight UTC.');
  const auth = t('需要支持 Streamable HTTP 及自定义 Authorization 请求头的客户端。用外贸 MCP 专用密钥作为 Bearer 凭据。只有 OAuth 登录入口的客户端暂不适用。','Use a client that supports Streamable HTTP and custom Authorization headers. Supply a scoped trade MCP key as the Bearer credential. Clients with only OAuth sign-in require a different integration.');
  const discovery = t('可匿名握手和查看协议工具列表。调用工具需要有效密钥，查询工具目录和输入规则不占运行额度。','An anonymous client can initialize and list the protocol tools. Tool calls require a valid key. Browsing the catalog and input rules uses no runs.');
  const config = {mcpServers:{'bpj-trade-tools':{url:origin+'/api/trade-mcp',headers:{Authorization:'Bearer BPJ_TRADE_MCP_KEY'}}}};
  const configLink = docs + 'config.json';
  const textLink = docs + 'index.md';
  const guideLink = docs + 'guide.json';
  const manifestLink = origin + manifestPath;
  const requestExample = {jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'run_trade_tool',arguments:{id:tool.id,input:sample,lang}}};
  const tools = [
    ['list_trade_tools',t('按分类或关键词查找工具，使用游标翻页。','Find tools by category or keyword and paginate with the returned cursor.')],
    ['get_trade_tool',t('按工具 ID 读取输入规则、示例、适用范围和来源。','Get input rules, an example, scope and reference by tool ID.')],
    ['run_trade_tool',t('按工具 ID 和输入执行一次有效计算，返回 JSON 结果及剩余额度。','Run one valid calculation by tool ID and input. Get JSON results and the remaining allowance.')],
  ];
  const categories = tradeGroups.map(group=>`<li><a href="${esc(hub+'#'+group.id)}">${esc(group.label[zh ? 0 : 1])}</a></li>`).join('');
  const body = `<link rel="stylesheet" href="${assetPath}trade-workbench.css"><link rel="stylesheet" href="${assetPath}trade-mcp.css?v=${edition}">
<main class="stage trade-suite trade-mcp" id="main-content">
  <nav class="trade-crumb" aria-label="${t('面包屑','Breadcrumb')}"><a href="${esc(hub)}">${t('外贸工作台','Export trade workbench')}</a><span aria-hidden="true">/</span><span aria-current="page">MCP</span></nav>
  <header class="trade-title"><h1>${title}</h1><p>${description}</p>
    <div class="trade-actions"><a class="trade-button" data-trade-mcp-key-entry href="${esc(keys)}">${t('创建或管理密钥','Create or manage keys')}</a><a class="trade-secondary" href="${esc(hub)}">${t('浏览全部外贸工具','Browse all trade tools')}</a></div></header>
  <section class="trade-use trade-mcp-section" aria-labelledby="trade-mcp-connect"><h2 id="trade-mcp-connect">${t('连接你的 MCP 客户端','Connect an MCP client')}</h2>
    <ol><li>${t('创建或登录 BPJ 免费账户，打开密钥管理并生成外贸 MCP 专用密钥。','Sign up or sign in with your free BPJ account and create a scoped key in the key manager.')}</li>
      <li>${t('下载私密配置，或在客户端中将下方模板的凭据变量替换为自己的密钥。配置格式按客户端要求调整。','Download your private config or replace the credential variable in the template with your own key. Adjust the configuration format for your client.')}</li>
      <li>${t('先查找工具，再查看输入规则，最后提交一次有效计算。','Find a tool, check its input rules, then submit a valid calculation.')}</li></ol>
    <p>${auth}</p><pre class="trade-mcp-code"><code>${esc(JSON.stringify(config,null,2))}</code></pre>
    <p>${t('公开模板只含凭据变量。请把生成的密钥和私密配置保存在自己的客户端。','The public template contains a credential variable. Keep the generated key and private config in your own client.')}</p>
  </section>
  <section class="trade-use trade-mcp-section" aria-labelledby="trade-mcp-tools"><h2 id="trade-mcp-tools">${t('查找并运行工具','Find and run a tool')}</h2>
    <ul>${tools.map(([name,detail])=>`<li><code>${name}</code> · ${detail}</li>`).join('')}</ul>
    <p>${discovery}</p><p>${limits}</p>
    <p><a href="${esc(membership)}">${t('查看现有 BPJ 会员权益','View existing BPJ membership benefits')}</a></p>
    <h3><a href="${esc(sampleURL)}">${esc(sampleTitle)}</a></h3><p>${esc(exampleText)}</p>
    <pre class="trade-mcp-code"><code>${esc(JSON.stringify(requestExample,null,2))}</code></pre>
    <p><a href="${esc(tool.source[2])}" rel="noopener noreferrer">${esc(sampleSource)}</a></p>
  </section>
  <section class="trade-details trade-mcp-section" aria-labelledby="trade-mcp-evidence"><h2 id="trade-mcp-evidence">${t('出处、范围与数据','Sources, scope and data')}</h2>
    <p>${scope}</p><p>${t('BPJ 服务器执行计算。持久记录涵盖密钥校验和共享额度，输入和结果正文仅在执行时使用。','The BPJ server runs the calculation. It keeps credential and quota records. Inputs and result contents are used during execution only.')}</p>
    <ul>${categories}</ul>
  </section>
  <nav class="trade-reference" aria-label="${t('机器可读资料','Machine-readable resources')}">
    <a href="${esc(configLink)}" download>${t('下载公开配置模板','Download public config template')}</a>
    <a href="${esc(manifestLink)}">${t('MCP 清单','MCP manifest')}</a>
    <a href="${esc(hub+'catalog.json')}">${t('工具目录 JSON','Tool catalog JSON')}</a>
    <a href="${esc(textLink)}">Markdown</a><a href="${esc(guideLink)}">${t('接入指南 JSON','Setup guide JSON')}</a>
  </nav>
</main>`;
  const mediaAlternates = [{type:'text/markdown',href:textLink},{type:'application/json',href:guideLink}];
  const page = layout({title:title+' · BPJ',description,path:tradeMcpPath,body,wide:true,mediaAlternates,schema:[
    crumbLd([{name:NAME,url:BASE+'/'},{name:t('外贸工作台','Export trade workbench'),url:hub},{name:title,url:docs}]),
    {'@context':'https://schema.org','@type':'TechArticle',headline:title,description,url:docs,inLanguage:zh ? 'zh-Hans' : 'en',isPartOf:{'@type':'CollectionPage',url:hub},citation:tool.source[2]},
  ]});
  write(tradeMcpPath.slice(1)+'index.html',page);
  pushPage(docs,'0.75');
  write(tradeMcpKeysPath.slice(1)+'index.html',keyPage({zh,title:t('外贸 MCP 密钥','Trade MCP keys'),origin,docs,join,esc}));
  write(tradeMcpPath.slice(1)+'config.json',JSON.stringify(config,null,2)+'\n');
  write(tradeMcpPath.slice(1)+'guide.json',JSON.stringify({
    title,description,language:lang,canonical:docs,endpoint:origin+'/api/trade-mcp',manifest:manifestLink,
    authentication:{kind:'Bearer',requirements:auth,keyManager:keys,publicDiscovery:['initialize','tools/list']},
    allowances:{webGuest:2,free:10,linkedMember:100,sharedWithWeb:true,reset:'00:00 UTC'},
    protocolTools:tools.map(([name,detail])=>({name,description:detail})),
    catalog:hub+'catalog.json',example:{tool:sampleTitle,url:sampleURL,request:requestExample,shipmentVolumeM3:Number(sampleResult.toFixed(6)),description:exampleText,source:{name:sampleSource,url:tool.source[2]}},scope,
  },null,2)+'\n');
  const markdown = [
    `# ${title}`,`Canonical: ${docs}`,description,
    `## ${t('访问与额度','Access and allowance')}`,auth,discovery,limits,
    `[${t('创建或管理密钥','Create or manage keys')}](${keys})`,
    `## ${t('协议工具','Protocol tools')}`,...tools.map(([name,detail])=>`- \`${name}\` — ${detail}`),
    `## [${sampleTitle}](${sampleURL})`,exampleText,`[${sampleSource}](${tool.source[2]})`,scope,
    `- [${t('外贸工具目录','Trade catalog')}](${hub})`,
    `- [${t('工具目录 JSON','Tool catalog JSON')}](${hub}catalog.json)`,
    `- [${t('MCP 清单','MCP manifest')}](${manifestLink})`,
    `- [${t('接入指南 JSON','Setup guide JSON')}](${guideLink})`,
  ].join('\n\n');
  write(tradeMcpPath.slice(1)+'index.md',markdown+'\n');
  if (zh) {
    for (const file of ['trade-mcp.css','trade-mcp-keys.mjs']) {
      write(assetPath.slice(1)+file,readFileSync(new URL('../assets/studio/'+file,import.meta.url),'utf8'));
    }
  }
}
