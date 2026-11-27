import {evaluateTool,inputLimits,tradeGroups} from '../lib/trade-workbench/engine.mjs';
import {FREE_DAILY_RUNS,MEMBER_DAILY_RUNS} from '../lib/trade-workbench-access.mjs';
import {GUEST_DAILY_RUNS} from '../lib/trade-workbench-guests.mjs';
import {TRADE_QUOTE_PATH} from './trade-pages.mjs';

export const TRADE_WORKBENCH = '/studio/trade-tools/';
const edition = '20261127.1';
const local = (pair,zh) => pair[zh ? 0 : 1];
const titleFor = (tool,zh) => zh ? tool.zh : tool.en;
const workedExamples = new Set([
  'eu-ce-technical-file', 'hs-classification-dossier', 'tax-trader-refund-estimate',
  'fx-bank-quote-unit', 'carton-cubic-volume',
]);
const choices = [
  ['yes',['是','Yes']], ['no',['否','No']], ['unknown',['待核对','Unknown']],
];
const exampleNotice = ['以下是固定的演示值，供理解输入与输出。','These fixed illustrative values demonstrate the inputs and outputs.'];
const citationNotice = ['引用时请附上工具页面、原始出处和测算所用条件。填写自己的业务资料前，请先核对适用规则和日期。','Cite the tool page, the primary reference, and the assumptions used. Before using your own figures, check the applicable rules and dates.'];

function publicTool(tool,hub,zh) {
  const url = hub+tool.id;
  const inputs = tool.inputs.map(([id,type,cn,en])=>({id,type,label:zh?cn:en}));
  const sample = Object.fromEntries(tool.inputs.map(([id,,,,value])=>[id,value]));
  let rows;
  try { rows = evaluateTool(tool.id,sample); }
  catch (error) { throw new Error('Invalid sample for '+tool.id,{cause:error}); }
  const outputs = rows.map(row=>local(row,zh));
  const reference = {
    id:tool.id,name:titleFor(tool,zh),url,markdown:url+'.md',description:local(tool.purpose,zh),
    scope:local(tool.scope,zh),inputs,outputs,source:{name:local(tool.source,zh),url:tool.source[2]},
  };
  if (workedExamples.has(tool.id)) {
    const exampleValue = (type,value) => type==='choice' ? local(choices.find(([id])=>id===value)[1],zh) : value;
    reference.example = {
      type:'illustrative',
      inputs:inputs.map(({id,type,label})=>({label,value:exampleValue(type,sample[id])})),
      outputs:rows.map((row,index)=>({label:outputs[index],value:Array.isArray(row[2])?local(row[2],zh):row[2]})),
    };
  }
  return reference;
}

function referenceMarkdown(reference,t,{allowanceCopy,join,joinCopy,mcpDocs,mcpCopy,quoteHandoff}) {
  const {name,url,description,scope,inputs,outputs,source,example} = reference;
  const bullets = values => values.map(value=>`- ${value}`);
  const exampleList = values => bullets(values.map(({label,value})=>`${label} — ${value}`));
  return [
    `# ${name}`,'',description,'',
    `[${t('工具页面','Canonical tool page')}](${url})`,'',
    `## ${t('适用范围','Scope')}`,'',scope,'',
    `## ${t('需要准备','Required inputs')}`,'',...bullets(inputs.map(field=>field.label)),'',
    `## ${t('可得到','Outputs')}`,'',...bullets(outputs),'',
    ...(quoteHandoff?[
      `## ${quoteHandoff.title}`,'',quoteHandoff.direction,'',`[${quoteHandoff.label}](${quoteHandoff.url})`,'',
    ]:[]),
    ...(example?[
      `## ${t('固定示例','Worked example')}`,'',
      t(...exampleNotice),'',
      `### ${t('示例输入','Example inputs')}`,'',...exampleList(example.inputs),'',
      `### ${t('示例结果','Example outputs')}`,'',...exampleList(example.outputs),'',
    ]:[]),
    `## ${t('原始出处','Primary reference')}`,'',`[${source.name}](${source.url})`,'',
    t(...citationNotice),'',
    `## ${t('试用与额度','Access and limits')}`,'',allowanceCopy,'',
    `[${joinCopy}](${join})`,`${mcpCopy} [${t('查看接入指南','Read the setup guide')}](${mcpDocs})`,'',
  ].join('\n');
}

export function tradeWorkbenchSearch(BASE,zh) {
  return tradeGroups.flatMap(group=>group.tools.map(tool=>({
    u:BASE+TRADE_WORKBENCH+tool.id,
    n:titleFor(tool,zh),
    k:local(group.label,zh),
    q:[titleFor(tool,zh),local(group.label,zh),local(tool.purpose,zh),...tool.inputs.map(field=>field[zh ? 2 : 3])].join(' ').toLowerCase(),
  })));
}

export function buildTradeWorkbench({layout,esc,crumbLd,BASE,NAME,LOCALE,write,pushPage}) {
  const zh = LOCALE.code === 'zh';
  const lang = zh ? 'zh' : 'en';
  const t = (cn,en) => zh ? cn : en;
  const hub = BASE+TRADE_WORKBENCH;
  const mcpDocs = hub+'mcp/';
  const studio = BASE+'/studio/';
  const title = t('外贸工作台','Export trade workbench');
  const toolCount = tradeGroups.reduce((count,group)=>count+group.tools.length,0);
  const searchTitle = t(`${toolCount} 个外贸工具｜关务、退税、收汇、合规`,`${toolCount} Export Trade Tools for Customs, Tax, FX and Compliance`);
  const intro = t(`面向中国出口团队的 ${toolCount} 个实用工具，覆盖合规、关务、退税、收汇和物流。`,`${toolCount} export trade tools covering compliance, customs, tax refunds, FX and logistics for exporters in China.`);
  const description = intro+' '+t(`网页访客每天共 ${GUEST_DAILY_RUNS} 次试算额度。`,`Guests get ${GUEST_DAILY_RUNS} web runs a day.`);
  const allowanceCopy = t(`网页访客每天共可试算 ${GUEST_DAILY_RUNS} 次，同一网络可能共用额度。免费账户每天共 ${FREE_DAILY_RUNS} 次，关联有效会员后每天共 ${MEMBER_DAILY_RUNS} 次。外贸工具共用额度，在 UTC 零点重置。`, `Guests get ${GUEST_DAILY_RUNS} web runs a day, which may be shared by visitors on the same network. A free account gets ${FREE_DAILY_RUNS} runs a day, or ${MEMBER_DAILY_RUNS} with an active linked membership. These allowances apply across the workbench and reset at midnight UTC.`);
  const joinCopy = t(`免费注册，解锁每天 ${FREE_DAILY_RUNS} 次`,`Join free for ${FREE_DAILY_RUNS} runs a day`);
  const mcpCopy = t('使用 MCP 需要账号专用密钥，与登录后的网页工具共用每日额度。','MCP requires a scoped account key and shares the signed-in web allowance.');
  const quoteUrl = BASE+TRADE_QUOTE_PATH;
  const quoteLabel = t('用自己的成本算 FOB 或 CIF 底价','Calculate an FOB or CIF price floor from your costs');
  const fxQuoteHandoff = {
    url:quoteUrl, title:t('用换算后的汇率做出口报价','Use the converted rate for export pricing'),
    direction:t('本工具给出每 1 单位外币折合的人民币。若成本币是人民币、报价币是外币，请用 1 除以该结果，再填入报价计算器。',
      'This tool gives CNY per unit of foreign currency. If costs are in CNY and your quote is in that foreign currency, divide 1 by that result before entering the rate in the quote calculator.'),
    label:t('打开出口报价计算器','Open the export quote calculator'),
  };
  const categories = tradeGroups.map(group=>({id:group.id,name:local(group.label,zh),tools:group.tools.map(tool=>publicTool(tool,hub,zh))}));
  const references = new Map(categories.flatMap(group=>group.tools.map(tool=>[tool.id,tool])));
  const assets = `<link rel="stylesheet" href="/studio-assets/trade-workbench.css?v=${edition}">`;
  const script = (suffix='') => `<script type="module" src="/studio-assets/trade-workbench.mjs?v=20261127.2${suffix}"></script>`;
  const directoryJoin = BASE+'/account?next='+encodeURIComponent((zh?'':'/en')+TRADE_WORKBENCH);
  const sharedCrumbs = [{name:NAME,url:BASE+'/'},{name:t('自研工具','BPJ tools'),url:studio},{name:title,url:hub}];
  const breadcrumbs = (name='')=>`<nav class="trade-crumb" aria-label="${t('面包屑','Breadcrumb')}"><a href="${studio}">${t('自研工具','BPJ tools')}</a><span aria-hidden="true">/</span>${name ? `<a href="${hub}">${title}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(name)}</span>`:`<span aria-current="page">${title}</span>`}</nav>`;
  const hubBody = `${assets}<main class="stage trade-suite" id="main-content" data-trade-directory>${breadcrumbs()}
    <header class="trade-title"><h1>${title}</h1><p>${intro}</p><p>${allowanceCopy}</p>
      <p><a href="${esc(quoteUrl)}" data-bpj-next>${quoteLabel}</a></p>
      <div class="trade-actions" data-trade-directory-gate><a class="trade-button" data-trade-directory-join href="${esc(directoryJoin)}">${joinCopy}</a></div>
    </header>
    <nav class="trade-categories" aria-label="${t('工具分类','Tool categories')}">${categories.map(group=>`<a href="#${group.id}">${esc(group.name)}</a>`).join('')}</nav>
    <label class="trade-search" hidden>${t('搜索工具','Find a tool')}<input id="trade-search" type="search" autocomplete="off" placeholder="${t('例如报关、退税、收款','Try customs, refund, settlement')}"></label>
    <p role="status" data-trade-search-status hidden></p>
    ${categories.map(group=>`<section class="trade-category" id="${group.id}" aria-labelledby="heading-${group.id}"><h2 id="heading-${group.id}">${esc(group.name)}</h2><ul>
      ${group.tools.map(tool=>`<li><a href="${tool.url}">${esc(tool.name)}</a><p>${esc(tool.description)}</p></li>`).join('')}</ul></section>`).join('')}
    <footer class="trade-reference"><a href="${hub}catalog.json" rel="alternate" type="application/json">${t('工具、所需资料与出处（JSON）','Tools, required inputs and references (JSON)')}</a><a href="${hub}index.md" rel="alternate" type="text/markdown">${t('文本目录','Plain-text directory')}</a><a href="${mcpDocs}">${t('外贸 MCP 接入指南','Trade MCP setup guide')}</a></footer>
  </main>${script('-directory')}`;
  const itemList = categories.flatMap(group=>group.tools).map((tool,index)=>({'@type':'ListItem',position:index+1,name:tool.name,url:tool.url}));
  write('studio/trade-tools/index.html',layout({title:searchTitle+' · BPJ',description,path:TRADE_WORKBENCH,body:hubBody,wide:true,
    mediaAlternates:[{type:'application/json',href:hub+'catalog.json'},{type:'text/markdown',href:hub+'index.md'}],schema:[
    crumbLd(sharedCrumbs),{'@context':'https://schema.org','@type':'CollectionPage',name:title,url:hub,description,inLanguage:lang,mainEntity:{'@type':'ItemList',itemListElement:itemList}},
  ]}));
  const access = {
    web:{guest_daily_runs:GUEST_DAILY_RUNS,free_account_daily_runs:FREE_DAILY_RUNS,linked_member_daily_runs:MEMBER_DAILY_RUNS,guest_may_share_network_quota:true},
    mcp:{scoped_account_key_required:true,shares_account_web_allowance:true},
    reset:'00:00 UTC',
  };
  write('studio/trade-tools/catalog.json',JSON.stringify({title,url:hub,description,language:lang,execution:'web_guest_or_account',access,mcp_docs:mcpDocs,categories},null,2)+'\n');
  write('studio/trade-tools/index.md',`# ${title}\n\n${intro}\n\n${allowanceCopy}\n\n[${quoteLabel}](${quoteUrl})\n\n${mcpCopy}\n\n[${t('工具目录网页','Canonical directory')}](${hub}) · [${joinCopy}](${directoryJoin}) · [${t('工具与出处 JSON','Tools and source JSON')}](${hub}catalog.json) · [${t('外贸 MCP 接入指南','Trade MCP setup guide')}](${mcpDocs})\n\n`+categories.map(group=>`## ${group.name}\n\n`+group.tools.map(tool=>`- [${tool.name}](${tool.url}) — ${tool.description} [${tool.source.name}](${tool.source.url}) · [${t('输入、结果与出处','Inputs, outputs and reference')}](${tool.markdown})`).join('\n')).join('\n\n')+'\n');
  pushPage(hub,'0.9');

  for (const group of tradeGroups) for (const [index,tool] of group.tools.entries()) {
    const reference = references.get(tool.id);
    const {name,url,description:purpose,scope,source,example} = reference;
    const path = TRADE_WORKBENCH+tool.id;
    const quoteHandoff = tool.id==='fx-bank-quote-unit'?fxQuoteHandoff:null;
    const join = BASE+'/account?next='+encodeURIComponent((zh?'':'/en')+path);
    const checkout = BASE+'/members?tool=bpj-trade-toolbox#account-use';
    const fields = tool.inputs.map(([key,type,cn,en,value])=>{
      const label = t(cn,en);
      const limits = inputLimits(type);
      const attr = `id="tw-${key}" name="${key}" required data-example="${esc(value)}"`;
      const control = type === 'choice' ? `<select ${attr}><option value="">${t('请选择','Choose one')}</option>${choices.map(([option,text])=>`<option value="${option}">${local(text,zh)}</option>`).join('')}</select>`
        : `<input ${attr}${limits ? ` type="number" min="${limits.min}" max="${limits.max}" step="${limits.step}" inputmode="${type === 'integer' ? 'numeric' : 'decimal'}"` : type === 'date' ? ' type="date"' : ' type="text" maxlength="160"'} autocomplete="off">`;
      return `<label for="tw-${key}"><span>${esc(label)}</span>${control}</label>`;
    }).join('');
    const related = [1,2,3].map(offset=>group.tools[(index+offset)%group.tools.length]);
    const sampleList = values => `<ul>${values.map(({label,value})=>`<li>${esc(label)} — ${esc(value)}</li>`).join('')}</ul>`;
    const sampleDetails = example ? `<section><h2>${t('固定示例','Worked example')}</h2><p>${t(...exampleNotice)}</p><details><summary>${t('查看示例输入和结果','See example inputs and outputs')}</summary><p><strong>${t('示例输入','Example inputs')}</strong></p>${sampleList(example.inputs)}<p><strong>${t('示例结果','Example outputs')}</strong></p>${sampleList(example.outputs)}</details></section>` : '';
    const body = `${assets}<main class="stage trade-suite" id="main-content" data-trade-tool="${tool.id}">${breadcrumbs(name)}
      <header class="trade-title"><a class="trade-category-link" href="${hub}#${group.id}">${esc(local(group.label,zh))}</a><h1>${esc(name)}</h1><p>${esc(purpose)}</p></header>
      <div class="trade-tool-layout"><div>
        <section class="trade-use" aria-labelledby="trade-use"><h2 id="trade-use">${t('试用工具','Run this tool')}</h2>
          <div data-trade-gate aria-busy="true"><p data-trade-gate-message>${t(`外贸工具网页访客每天共 ${GUEST_DAILY_RUNS} 次试算。注册或登录 BPJ 免费账户后每天共 ${FREE_DAILY_RUNS} 次。`,`Guests get ${GUEST_DAILY_RUNS} web runs a day across the workbench. Join free or sign in to get ${FREE_DAILY_RUNS} runs a day.`)}</p><a class="trade-button" data-trade-join href="${esc(join)}">${joinCopy}</a></div>
          <form data-trade-form hidden><p data-trade-quota></p><div class="trade-fields">${fields}</div><div class="trade-actions"><button class="trade-button" type="submit">${t('生成结果','Get results')}</button><button class="trade-secondary" type="button" data-trade-example>${t('填入示例','Fill example')}</button></div></form>
          <p class="trade-status" role="status" data-trade-status></p>
          <section class="trade-result" data-trade-result aria-labelledby="trade-result" hidden><h3 id="trade-result" tabindex="-1">${t('结果','Results')}</h3><dl data-trade-rows></dl><button class="trade-secondary" type="button" data-trade-csv hidden>${t('导出 CSV（计 1 次）','Export CSV (uses one run)')}</button></section>
          <section class="trade-upgrade" data-trade-upgrade hidden><h3>${t('需要更多次数或导出结果？','Need more runs or a CSV export?')}</h3><p data-trade-price></p><p>${t(`关联有效 BPJ 会员后每天可运行 ${MEMBER_DAILY_RUNS} 次并导出 CSV。到会员页选择「使用免费账户」，把权益关联到当前账户。`,`An active linked BPJ membership includes ${MEMBER_DAILY_RUNS} runs a day and CSV export. Choose “Use free account” on the membership page to attach the benefits to your account.`)}</p><a class="trade-button" data-trade-member href="${checkout}" target="_blank" rel="noopener">${t('用当前账户开通会员','Open membership for this account')}</a></section>
        </section>
      </div><aside class="trade-details" aria-label="${t('范围与来源','Scope and source')}">
        <section><h2>${t('适用范围','Scope')}</h2><p>${esc(scope)}</p></section>
        <section><h2>${t('需要准备','What to prepare')}</h2><ul>${reference.inputs.map(({label})=>`<li>${esc(label)}</li>`).join('')}</ul></section>
        <section><h2>${t('可得到','What you get')}</h2><ul>${reference.outputs.map(label=>`<li>${esc(label)}</li>`).join('')}</ul></section>
${quoteHandoff?`        <section><h2>${quoteHandoff.title}</h2><p>${quoteHandoff.direction}</p><p><a href="${esc(quoteHandoff.url)}" data-bpj-next>${quoteHandoff.label}</a></p></section>\n`:''}        ${sampleDetails}
        <section><h2>${t('原始出处','Primary reference')}</h2><p><a href="${esc(source.url)}" rel="noopener noreferrer" target="_blank">${esc(source.name)}</a></p><p>${t(...citationNotice)}</p></section>
        <p>${t('输入只发送给 BPJ 服务器计算，不存入项目或分析数据。请填计算必需的字段。','Inputs go to the BPJ server for the calculation. They are omitted from project storage and analytics. Enter only the values needed for the result.')}</p>
      </aside></div>
      <section class="trade-related"><h2>${t('同类工具','Related tools')}</h2><ul>${related.map(next=>`<li><a href="${hub+next.id}">${esc(titleFor(next,zh))}</a></li>`).join('')}</ul></section>
      <footer class="trade-reference"><a href="${reference.markdown}" rel="alternate" type="text/markdown">${t('阅读或引用 Markdown','Read or cite Markdown')}</a><a href="${mcpDocs}">${t('外贸 MCP 接入指南','Trade MCP setup guide')}</a></footer>
    </main>${script()}`;
    const searchDescription = purpose+' '+t(`网页访客每天共 ${GUEST_DAILY_RUNS} 次试算额度。`,`The workbench gives guests ${GUEST_DAILY_RUNS} web runs a day.`);
    write('studio/trade-tools/'+tool.id+'.html',layout({title:name+t('｜外贸工具',' | Export Trade Tools')+' · BPJ',description:searchDescription,path,body,wide:true,
      mediaAlternates:[{type:'text/markdown',href:reference.markdown}],schema:[
      crumbLd([...sharedCrumbs,{name,url}]),{'@context':'https://schema.org','@type':'WebApplication',name,url,description:purpose,inLanguage:lang,applicationCategory:'BusinessApplication',operatingSystem:'Web',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},featureList:reference.outputs,subjectOf:{'@type':'CreativeWork',url:reference.markdown,inLanguage:lang},citation:{'@type':'CreativeWork',name:source.name,url:source.url}},
    ]}));
    write('studio/trade-tools/'+tool.id+'.md',referenceMarkdown(reference,t,{allowanceCopy,join,joinCopy,mcpDocs,mcpCopy,quoteHandoff}));
    pushPage(url+'.html','0.8');
  }
}
