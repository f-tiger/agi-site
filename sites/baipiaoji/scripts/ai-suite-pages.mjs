import {SUITE_CATEGORIES,SUITE_TOOLS,inputSpec,toolInputSchema,runSuiteTool,suitePath} from '../lib/ai-suite/registry.mjs';

const assets = '<link rel="stylesheet" href="/studio-assets/ai-suite.css?v=2">';
const script = '<script type="module" src="/studio-assets/ai-suite.mjs?v=2"></script>';
const mcp = 'https://baipiaoji.com/api/ai-mcp';
const siteTitle = {zh:'BPJ 自研 AI 工具',en:'BPJ AI tools'};

export const suiteCount=SUITE_TOOLS.length;
const categoryPath = group => '/studio/ai/categories/'+group.id;

export function renderAiIndex({BASE,lang,esc,home=false,category}) {
  const zh=lang==='zh', t=(cn,en)=>zh?cn:en;
  const groups=category?[category]:SUITE_CATEGORIES;
  const total=category?category.tools.length:suiteCount;
  return `${assets}<section class="suite-index" ${home?'id="ai-tools" data-home-block="ai-tools"':''} data-suite-index>
    ${home?`<header class="suite-index-header"><div><h2>${siteTitle[lang]}</h2><p>${t('在浏览器使用，或通过 MCP 交给你的 AI 调用。','Use a tool in your browser or connect it to your AI via MCP.')}</p></div><nav><a href="${BASE}/studio/ai/">${t('浏览全部工具','Browse all tools')}</a><a href="${BASE}/studio/ai/#mcp">${t('连接 MCP','Connect MCP')}</a></nav></header>`:''}
    <div class="suite-search" hidden><label for="suite-search">${t('搜索工具','Search tools')}</label><input type="search" id="suite-search" data-suite-search placeholder="${t('例如 CSV、预算、站点地图','Try CSV, budget, or sitemap')}" autocomplete="off"><span data-suite-count role="status">${t(`共 ${total} 个自研工具`,`${total} BPJ tools`)}</span></div>
    <div class="suite-categories">${groups.map(group=>`<details data-suite-group data-group-id="${group.id}" ${category?'open':''}>
      <summary><strong>${group.title[lang]}</strong> <span>${group.tools.length}</span></summary>
      ${category?'':`<a class="suite-category-link" href="${BASE}${categoryPath(group)}">${t('浏览此分类','Browse category')} →</a>`}
      <ul>${group.tools.map(tool=>`<li data-suite-keywords="${home?esc(tool.description[lang]):''}"><a href="${BASE}${suitePath(tool)}">${esc(tool.title[lang])}</a>${home?'':`<p>${esc(tool.description[lang])}</p>`}</li>`).join('')}</ul>
    </details>`).join('')}</div>
  </section>${script}`;
}

function field(input, lang, esc) {
  const spec=inputSpec(input), key=esc(input.key), label=esc(input.label[lang]);
  if(input.type==='boolean') return `<label class="suite-check"><input type="checkbox" name="${key}">${label}</label>`;
  const control=input.type==='string'
    ? input.multiline
      ? `<textarea name="${key}" rows="5" maxlength="${spec.maxLength}" spellcheck="false"></textarea>`
      : `<input name="${key}" type="text" maxlength="${spec.maxLength}" autocomplete="off" spellcheck="false">`
    : `<input name="${key}" type="number" min="${spec.minimum}" max="${spec.maximum}" step="${input.type==='integer'?1:'any'}" required>`;
  return `<label class="suite-field"><span>${label}</span>${control}</label>`;
}

export function buildAiSuite({layout,esc,BASE,LOCALE,write,pushPage}) {
  const zh=LOCALE.code==='zh', lang=zh?'zh':'en', t=(cn,en)=>zh?cn:en;
  for (const group of SUITE_CATEGORIES) {
    const path=categoryPath(group), title=group.title[lang];
    const examples=group.tools.slice(0,3).map(tool=>tool.title[lang]).join(t('、',', '));
    const description=t(`此分类包含 ${group.tools.length} 个自研工具，包括${examples}。可在浏览器运行，也可通过 MCP 调用。`,
      `Explore ${group.tools.length} BPJ tools including ${examples}. Run them in your browser or via MCP.`);
    const body=`<main class="stage suite-workspace"><nav class="crumb" aria-label="${t('面包屑导航','Breadcrumb')}"><a href="${BASE}/studio/ai/">${siteTitle[lang]}</a></nav><header><h1>${esc(title)}</h1><p>${esc(description)}</p></header>${renderAiIndex({BASE,lang,esc,category:group})}</main>`;
    write(path.slice(1)+'.html',layout({title:title+' · BPJ',description,path,body,wide:true,
      schema:[{'@context':'https://schema.org','@type':'CollectionPage',name:title,url:BASE+path,description,inLanguage:lang}]}));
    pushPage(BASE+path+'.html','0.8');
  }
  for (const tool of SUITE_TOOLS) {
    const path=suitePath(tool), title=tool.title[lang], description=tool.description[lang];
    const category=SUITE_CATEGORIES.find(group=>group.id===tool.category);
    const schema={'@context':'https://schema.org','@type':'WebApplication',name:title,url:BASE+path,description,
      applicationCategory:'UtilitiesApplication',operatingSystem:'Web browser',isAccessibleForFree:true,
      offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},inLanguage:lang};
    const example=runSuiteTool(tool.name,tool.example);
    const body=`${assets}<main class="stage suite-workspace" data-suite-tool="${tool.id}" data-suite-category="${tool.category}">
      <nav class="crumb" aria-label="${t('面包屑导航','Breadcrumb')}"><a href="${BASE}/studio/ai/">${siteTitle[lang]}</a><span>/</span><a href="${BASE}${categoryPath(category)}">${esc(category.title[lang])}</a></nav>
      <header><h1>${esc(title)}</h1><p>${esc(description)}</p></header>
      <div class="suite-workgrid">
        <section aria-label="${t('输入','Inputs')}">
          <p class="suite-note">${t('在当前浏览器中计算。工具不保存输入。','Runs in this browser. The tool does not save inputs.')}</p>
          <form method="post" autocomplete="off"><fieldset disabled>
            ${tool.inputs.map(input=>field(input,lang,esc)).join('')}
            <div class="suite-buttons"><button class="suite-primary" type="submit">${t('运行工具','Run tool')}</button><button type="button" data-suite-example>${t('填入示例','Load example')}</button></div>
          </fieldset></form>
          <noscript>${t('启用 JavaScript 后可在浏览器使用。也可以通过下方 MCP 调用。','Enable JavaScript to run the tool here, or use the MCP call below.')}</noscript>
        </section>
        <section aria-labelledby="suite-result">
          <h2 id="suite-result">${t('结果','Result')}</h2>
          <p data-suite-status role="status"></p>
          <pre data-suite-output hidden></pre>
          <div class="suite-buttons" data-suite-actions hidden><button type="button" data-suite-copy>${t('复制结果','Copy result')}</button><button type="button" data-suite-download>${t('下载 JSON','Download JSON')}</button></div>
        </section>
      </div>
      <details class="suite-mcp">
        <summary>${t('MCP 调用与示例','MCP call and example')}</summary>
        <p><a href="${BASE}/studio/ai/#mcp">${t('连接 BPJ MCP','Connect BPJ MCP')}</a> <code>${tool.name}</code></p>
        <pre>${esc(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:tool.name,arguments:tool.example}},null,2))}</pre>
        <h2>${t('示例结果','Example result')}</h2><pre>${esc(JSON.stringify(example,null,2))}</pre>
      </details>
    </main>${script}`;
    write('studio/ai/'+tool.id+'.html',layout({title:title+' · BPJ',description,path,body,wide:true,schema:[schema]}));
    pushPage(BASE+path+'.html','0.7');
  }
  return SUITE_TOOLS.map(tool=>({
    id:tool.id,name:tool.title,description:tool.description,path:suitePath(tool),url:BASE+suitePath(tool),
    category:tool.category,mcpTool:tool.name,inputSchema:toolInputSchema(tool),example:tool.example,
    execution:'deterministic',isAccessibleForFree:true,
  }));
}

export const FREE_SUITE_MCP = mcp;
