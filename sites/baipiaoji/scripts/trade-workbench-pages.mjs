import {evaluateTool,inputLimits,tradeGroups} from '../lib/trade-workbench/engine.mjs';

export const TRADE_WORKBENCH = '/studio/trade-tools/';
const edition = '20261126.1';
const local = (pair,zh) => pair[zh ? 0 : 1];
const titleFor = (tool,zh) => zh ? tool.zh : tool.en;

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
  const studio = BASE+'/studio/';
  const title = t('外贸工作台','Export trade workbench');
  const description = t('面向中国出口团队的 100 个实用工具。核对合规资料、测算关务与退税、比对外汇收款，整理出口单证和物流。免费注册后即可使用。','100 practical tools for exporters in China. Review compliance evidence, estimate customs and refunds, reconcile FX receipts, and prepare shipping documents. Create a free account to run a tool.');
  const categories = tradeGroups.map(group=>({id:group.id,name:local(group.label,zh),tools:group.tools.map(tool=>({
    id:tool.id,name:titleFor(tool,zh),url:hub+tool.id,description:local(tool.purpose,zh),source:{name:tool.source[zh?0:1],url:tool.source[2]},
  }))}));
  const assets = `<link rel="stylesheet" href="/studio-assets/trade-workbench.css?v=${edition}">`;
  const script = (version=edition) => `<script type="module" src="/studio-assets/trade-workbench.mjs?v=${version}"></script>`;
  const directoryJoin = BASE+'/account?next='+encodeURIComponent((zh?'':'/en')+TRADE_WORKBENCH);
  const sharedCrumbs = [{name:NAME,url:BASE+'/'},{name:t('自研工具','BPJ tools'),url:studio},{name:title,url:hub}];
  const breadcrumbs = (name='')=>`<nav class="trade-crumb" aria-label="${t('面包屑','Breadcrumb')}"><a href="${studio}">${t('自研工具','BPJ tools')}</a><span aria-hidden="true">/</span>${name ? `<a href="${hub}">${title}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(name)}</span>`:`<span aria-current="page">${title}</span>`}</nav>`;
  const hubBody = `${assets}<main class="stage trade-suite" id="main-content" data-trade-directory>${breadcrumbs()}
    <header class="trade-title"><h1>${title}</h1><p>${description}</p><p>${t('免费账户每天共 10 次，覆盖目录内全部工具。','A free account gets 10 runs a day across the directory.')}</p>
      <div class="trade-actions" data-trade-directory-gate><a class="trade-button" data-trade-directory-join href="${esc(directoryJoin)}">${t('免费注册或登录后试用','Join free or sign in to try')}</a></div>
    </header>
    <nav class="trade-categories" aria-label="${t('工具分类','Tool categories')}">${categories.map(group=>`<a href="#${group.id}">${esc(group.name)}</a>`).join('')}</nav>
    <label class="trade-search" hidden>${t('搜索工具','Find a tool')}<input id="trade-search" type="search" autocomplete="off" placeholder="${t('例如报关、退税、收款','Try customs, refund, settlement')}"></label>
    <p role="status" data-trade-search-status hidden></p>
    ${categories.map(group=>`<section class="trade-category" id="${group.id}" aria-labelledby="heading-${group.id}"><h2 id="heading-${group.id}">${esc(group.name)}</h2><ul>
      ${group.tools.map(tool=>`<li><a href="${tool.url}">${esc(tool.name)}</a><p>${esc(tool.description)}</p></li>`).join('')}</ul></section>`).join('')}
    <footer class="trade-reference"><a href="${hub}catalog.json">${t('工具和官方出处索引（JSON）','Tool and authority index (JSON)')}</a><a href="${hub}index.md">${t('文本目录','Plain-text directory')}</a></footer>
  </main>${script(edition+'-directory')}`;
  const itemList = categories.flatMap(group=>group.tools).map((tool,index)=>({'@type':'ListItem',position:index+1,name:tool.name,url:tool.url}));
  write('studio/trade-tools/index.html',layout({title:title+' · BPJ',description,path:TRADE_WORKBENCH,body:hubBody,wide:true,schema:[
    crumbLd(sharedCrumbs),{'@context':'https://schema.org','@type':'CollectionPage',name:title,url:hub,description,inLanguage:lang,mainEntity:{'@type':'ItemList',itemListElement:itemList}},
  ]}));
  write('studio/trade-tools/catalog.json',JSON.stringify({title,url:hub,description,language:lang,execution:'registered_account_required',categories},null,2)+'\n');
  write('studio/trade-tools/index.md',`# ${title}\n\n${description}\n\n`+categories.map(group=>`## ${group.name}\n\n`+group.tools.map(tool=>`- [${tool.name}](${tool.url}) — ${tool.description} [${tool.source.name}](${tool.source.url})`).join('\n')).join('\n\n')+'\n');
  pushPage(hub,'0.9');

  for (const group of tradeGroups) for (const [index,tool] of group.tools.entries()) {
    const name = titleFor(tool,zh);
    const path = TRADE_WORKBENCH+tool.id;
    const url = BASE+path;
    const purpose = local(tool.purpose,zh);
    const scope = local(tool.scope,zh);
    const join = BASE+'/account?next='+encodeURIComponent((zh?'':'/en')+path);
    const checkout = BASE+'/members?tool=bpj-trade-toolbox#account-use';
    const sourceLabel = tool.source[zh ? 0 : 1];
    const sample = Object.fromEntries(tool.inputs.map(([key,,,,value])=>[key,value]));
    let rows;
    try { rows = evaluateTool(tool.id,sample); }
    catch (error) { throw new Error('Invalid sample for '+tool.id,{cause:error}); }
    const fields = tool.inputs.map(([key,type,cn,en,value])=>{
      const label = t(cn,en);
      const limits = inputLimits(type);
      const attr = `id="tw-${key}" name="${key}" required data-example="${esc(value)}"`;
      const control = type === 'choice' ? `<select ${attr}><option value="">${t('请选择','Choose one')}</option>${[['yes',t('是','Yes')],['no',t('否','No')],['unknown',t('待核对','Unknown')]].map(([option,text])=>`<option value="${option}">${text}</option>`).join('')}</select>`
        : `<input ${attr}${limits ? ` type="number" min="${limits.min}" max="${limits.max}" step="${limits.step}" inputmode="${type === 'integer' ? 'numeric' : 'decimal'}"` : type === 'date' ? ' type="date"' : ' type="text" maxlength="160"'} autocomplete="off">`;
      return `<label for="tw-${key}"><span>${esc(label)}</span>${control}</label>`;
    }).join('');
    const related = [1,2,3].map(offset=>group.tools[(index+offset)%group.tools.length]);
    const body = `${assets}<main class="stage trade-suite" id="main-content" data-trade-tool="${tool.id}">${breadcrumbs(name)}
      <header class="trade-title"><a class="trade-category-link" href="${hub}#${group.id}">${esc(local(group.label,zh))}</a><h1>${esc(name)}</h1><p>${esc(purpose)}</p></header>
      <div class="trade-tool-layout"><div>
        <section class="trade-use" aria-labelledby="trade-use"><h2 id="trade-use">${t('试用工具','Run this tool')}</h2>
          <div data-trade-gate aria-busy="true"><p data-trade-gate-message>${t('注册或登录 BPJ 免费账户后即可使用。','Create a free BPJ account or sign in to use this tool.')}</p><a class="trade-button" data-trade-join href="${esc(join)}">${t('免费注册或登录','Join free or sign in')}</a></div>
          <form data-trade-form hidden><p data-trade-quota></p><div class="trade-fields">${fields}</div><div class="trade-actions"><button class="trade-button" type="submit">${t('生成结果','Get results')}</button><button class="trade-secondary" type="button" data-trade-example>${t('填入示例','Fill example')}</button></div></form>
          <p class="trade-status" role="status" data-trade-status></p>
          <section class="trade-result" data-trade-result aria-labelledby="trade-result" hidden><h3 id="trade-result" tabindex="-1">${t('结果','Results')}</h3><dl data-trade-rows></dl><button class="trade-secondary" type="button" data-trade-csv hidden>${t('导出 CSV（计 1 次）','Export CSV (uses one run)')}</button></section>
          <section class="trade-upgrade" data-trade-upgrade hidden><h3>${t('需要更多次数或导出结果？','Need more runs or a CSV export?')}</h3><p data-trade-price></p><p>${t('同一 BPJ 会员可每天运行 100 次并导出 CSV。到会员页选择「使用免费账户」，把权益关联到当前账户。','The BPJ membership includes 100 runs a day and CSV export. Choose “Use free account” on the membership page to attach the benefits to your account.')}</p><a class="trade-button" data-trade-member href="${checkout}" target="_blank" rel="noopener">${t('用当前账户开通会员','Open membership for this account')}</a></section>
        </section>
      </div><aside class="trade-details" aria-label="${t('范围与来源','Scope and source')}">
        <section><h2>${t('适用范围','Scope')}</h2><p>${esc(scope)}</p><p><a href="${esc(tool.source[2])}" rel="noopener noreferrer" target="_blank">${esc(sourceLabel)}</a></p></section>
        <section><h2>${t('需要准备','What to prepare')}</h2><ul>${tool.inputs.map(([, , cn,en])=>`<li>${esc(t(cn,en))}</li>`).join('')}</ul></section>
        <section><h2>${t('可得到','What you get')}</h2><ul>${rows.map(row=>`<li>${esc(local(row,zh))}</li>`).join('')}</ul></section>
        <p>${t('输入只发送给 BPJ 服务器计算，不存入项目或分析数据。请填计算必需的字段。','Inputs go to the BPJ server for the calculation. They are omitted from project storage and analytics. Enter only the values needed for the result.')}</p>
      </aside></div>
      <section class="trade-related"><h2>${t('同类工具','Related tools')}</h2><ul>${related.map(next=>`<li><a href="${hub+next.id}">${esc(titleFor(next,zh))}</a></li>`).join('')}</ul></section>
    </main>${script()}`;
    write('studio/trade-tools/'+tool.id+'.html',layout({title:name+' · BPJ',description:purpose,path,body,wide:true,schema:[
      crumbLd([...sharedCrumbs,{name,url}]),{'@context':'https://schema.org','@type':'WebApplication',name,url,description:purpose,inLanguage:lang,applicationCategory:'BusinessApplication',operatingSystem:'Web',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}},
    ]}));
    pushPage(url+'.html','0.8');
  }
}
