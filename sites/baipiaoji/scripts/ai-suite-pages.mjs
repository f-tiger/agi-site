import {SUITE_CATEGORIES,SUITE_TOOLS,inputSpec,toolInputSchema,runSuiteTool,suitePath} from '../lib/ai-suite/registry.mjs';
import {renderAiIndex,categoryPath,aiSuiteSearchIndex,searchIndexPath} from './ai-suite-directory.mjs';
import {suiteGuidance} from './ai-suite-guidance.mjs';

export {renderAiIndex,suiteCount} from './ai-suite-directory.mjs';
export const FREE_SUITE_MCP = 'https://baipiaoji.com/api/ai-mcp';

const assets = '<link rel="stylesheet" href="/studio-assets/ai-suite.css?v=3">';
const resultStyles = '<link rel="stylesheet" href="/studio-assets/ai-suite-result.css?v=3">';
const script = '<script type="module" src="/studio-assets/ai-suite.mjs?v=3"></script>';
const siteTitle = {zh:'BPJ 自研 AI 工具',en:'BPJ AI tools'};

function field(input, sample, hint, lang, esc) {
  const zh=lang==='zh', t=(cn,en)=>zh?cn:en;
  const spec=inputSpec(input), key=esc(input.key), label=esc(input.label[lang]);
  const describedBy=`aria-describedby="field-${key}-help"`;
  if (input.type==='boolean') {
    return `<div class="suite-field suite-option">
      <label for="field-${key}"><input id="field-${key}" type="checkbox" name="${key}" ${hint?describedBy:''}>${label}</label>
      ${hint?`<p id="field-${key}-help">${esc(hint)}</p>`:''}</div>`;
  }
  let control, detail;
  if (input.type==='string') {
    const compactSample=typeof sample==='string'&&!sample.includes('\n')&&sample.length<=80;
    const example=compactSample?` placeholder="${esc(sample)}"`:'';
    control=input.multiline
      ? `<textarea id="field-${key}" name="${key}" rows="5" maxlength="${spec.maxLength}" ${describedBy} spellcheck="false"></textarea>`
      : `<input id="field-${key}" name="${key}" type="text" maxlength="${spec.maxLength}" ${describedBy} ${example} spellcheck="false">`;
    detail=t(`最多 ${spec.maxLength} 个字符`,`Up to ${spec.maxLength} characters`);
  } else {
    const integer=input.type==='integer';
    control=`<input id="field-${key}" name="${key}" type="number" min="${spec.minimum}" max="${spec.maximum}" step="${integer?1:'any'}" ${describedBy} placeholder="${esc(sample)}" required>`;
    detail=t(`${spec.minimum} 至 ${spec.maximum}${integer?'，整数':''}`,`${spec.minimum} to ${spec.maximum}${integer?', whole numbers':''}`);
  }
  const file=input.type==='string'&&input.multiline
    ? `<button type="button" data-suite-open-file aria-controls="file-${key}">${t('打开文本文件','Open text file')}</button>
       <input id="file-${key}" data-suite-file data-field-key="${key}" type="file" accept="text/*,.json,.jsonl,.ndjson,.csv,.tsv,.xml,.md,.yaml,.yml,.srt,.vtt,.log" tabindex="-1" hidden>`
    : '';
  return `<div class="suite-field">
    <div class="suite-field-heading"><label for="field-${key}">${label}</label>${file}</div>
    ${control}
    <p id="field-${key}-help">${hint?`<span>${esc(hint)}</span>`:''}<small>${detail}</small></p>
  </div>`;
}

const byId=new Map(SUITE_TOOLS.map(tool=>[tool.id,tool]));
const generalTerms=new Set(['check','build','convert','compare','series','table','editorial','developer','operations']);
const slugTerms=new Map(SUITE_TOOLS.map(tool=>[
  tool.id,new Set(tool.id.split('-').filter(term=>term.length>2&&!generalTerms.has(term))),
]));
function relatedTools(tool, category, suggested=[]) {
  const terms=slugTerms.get(tool.id);
  const ranked=category.tools.filter(item=>item.id!==tool.id)
    .map(item=>({id:item.id,score:[...slugTerms.get(item.id)].filter(term=>terms.has(term)).length}))
    .filter(item=>item.score>0)
    .sort((a,b)=>b.score-a.score)
    .map(item=>item.id);
  return [...new Set([...suggested,...ranked])]
    .filter(id=>id!==tool.id&&byId.has(id))
    .slice(0,3)
    .map(id=>byId.get(id));
}

export function buildAiSuite({layout,esc,BASE,LOCALE,write,pushPage}) {
  const zh=LOCALE.code==='zh', lang=zh?'zh':'en', t=(cn,en)=>zh?cn:en;
  for (const group of SUITE_CATEGORIES) {
    const path=categoryPath(group), title=group.title[lang];
    const examples=group.tools.slice(0,3).map(tool=>tool.title[lang]).join(t('、',', '));
    const description=t(`此分类包含 ${group.tools.length} 个自研工具，包括${examples}。可在浏览器运行，也可通过 MCP 调用。`,
      `Explore ${group.tools.length} BPJ tools including ${examples}. Run them in your browser or via MCP.`);
    const body=`${assets}<main class="stage suite-workspace"><nav class="crumb" aria-label="${t('面包屑导航','Breadcrumb')}"><a href="${BASE}/studio/ai/">${siteTitle[lang]}</a></nav><header><h1>${esc(title)}</h1><p>${esc(description)}</p></header>${renderAiIndex({BASE,lang,esc,category:group})}</main>`;
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
    const guidance=suiteGuidance(tool,lang);
    const related=relatedTools(tool,category,guidance.relatedIds);
    const mcpExample={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:tool.name,arguments:tool.example}};
    const breadcrumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      [siteTitle[lang],'/studio/ai/'],[category.title[lang],categoryPath(category)],[title,path],
    ].map(([name,link],index)=>({'@type':'ListItem',position:index+1,name,item:BASE+link}))};
    const body=`${assets}${resultStyles}<main class="stage suite-workspace" data-suite-tool="${tool.id}" data-suite-category="${tool.category}" data-suite-labels="${esc(JSON.stringify(guidance.resultLabels||{}))}">
      <nav class="suite-crumb" aria-label="${t('面包屑导航','Breadcrumb')}"><a href="${BASE}/studio/ai/">${siteTitle[lang]}</a><span aria-hidden="true">/</span><a href="${BASE}${categoryPath(category)}">${esc(category.title[lang])}</a></nav>
      <header class="suite-tool-heading"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><a href="#suite-mcp">${t('MCP 调用说明','MCP instructions')}</a></header>
      ${guidance.useCase?`<p class="suite-use-case">${esc(guidance.useCase)}</p>`:''}
      <div class="suite-workgrid">
        <section class="suite-input-pane" aria-labelledby="suite-inputs">
          <div class="suite-pane-heading"><h2 id="suite-inputs">${t('输入','Inputs')}</h2><p>${t('在当前浏览器中处理','Processed in your browser')}</p></div>
          <form method="post" autocomplete="off"><fieldset disabled>
            <div class="suite-buttons suite-form-tools"><button type="button" data-suite-example>${t('填入示例','Load example')}</button><button type="button" data-suite-clear>${t('清空','Clear')}</button></div>
            ${tool.inputs.map(input=>field(input,tool.example[input.key],guidance.fieldHints?.[input.key],lang,esc)).join('')}
            <p class="suite-form-feedback" data-suite-error role="status" hidden></p>
            <div class="suite-buttons suite-run"><button class="suite-primary" type="submit">${t('运行工具','Run tool')}</button><span>${t('也可按 Ctrl/⌘ + Enter','Or press Ctrl/⌘ + Enter')}</span></div>
          </fieldset></form>
          <noscript>${t('启用 JavaScript 后可在浏览器使用。也可查看下方示例和 MCP 调用说明。','Enable JavaScript to run the tool here. The example and MCP instructions are available below.')}</noscript>
        </section>
        <section class="suite-output-pane" id="suite-result-panel" aria-labelledby="suite-result">
          <div class="suite-pane-heading"><h2 id="suite-result">${t('结果','Result')}</h2><p data-suite-source hidden></p></div>
          <p class="suite-empty" data-suite-empty>${t('运行后在这里查看、复制或下载结果。','Run the tool to view, copy or download your result.')}</p>
          <div class="suite-buttons suite-result-format" role="group" aria-label="${t('显示格式','Result format')}" data-suite-format hidden>
            <button type="button" aria-pressed="true" aria-controls="suite-result-view" data-suite-readable>${t('可读视图','Readable')}</button><button type="button" aria-pressed="false" aria-controls="suite-raw" data-suite-raw>JSON</button>
          </div>
          <div id="suite-result-view" data-suite-result-view hidden></div>
          <pre id="suite-raw" data-suite-output hidden tabindex="0" aria-label="${t('JSON 结果','JSON result')}"></pre>
          <p data-suite-status role="status"></p>
          <div class="suite-buttons suite-exports" data-suite-actions hidden><button type="button" data-suite-copy-text hidden>${t('复制正文','Copy text')}</button><button type="button" data-suite-copy>${t('复制 JSON','Copy JSON')}</button><button type="button" data-suite-download>${t('下载 JSON','Download JSON')}</button></div>
        </section>
      </div>
      ${guidance.note?`<aside class="suite-method"><h2>${t('结果口径','How to read the result')}</h2><p>${esc(guidance.note)}</p></aside>`:''}
      <div class="suite-reference">
        <details class="suite-mcp">
          <summary>${t('查看完整示例','View worked example')}</summary>
          <div class="suite-example-grid"><section><h3>${t('示例输入','Example input')}</h3><pre>${esc(JSON.stringify(tool.example,null,2))}</pre></section>
          <section><h3>${t('示例结果','Example result')}</h3><pre>${esc(JSON.stringify(example,null,2))}</pre></section></div>
        </details>
        <details class="suite-mcp" id="suite-mcp">
          <summary>${t('通过 MCP 调用','Call via MCP')}</summary>
          <p><a href="${BASE}/studio/ai/#mcp">${t('连接 BPJ MCP','Connect BPJ MCP')}</a> <code>${tool.name}</code></p>
          <pre>${esc(JSON.stringify(mcpExample,null,2))}</pre>
        </details>
      </div>
      ${related.length?`<nav class="suite-related" aria-label="${t('相关工具','Related tools')}"><h2>${t('相关工具','Related tools')}</h2><ul>${related.map(item=>`<li><a href="${BASE}${suitePath(item)}">${esc(item.title[lang])}</a></li>`).join('')}</ul></nav>`:''}
    </main>${script}`;
    write('studio/ai/'+tool.id+'.html',layout({title:title+' · BPJ',description,path,body,wide:true,schema:[schema,breadcrumbs]}));
    pushPage(BASE+path+'.html','0.7');
  }
  write(searchIndexPath.slice(1),JSON.stringify(aiSuiteSearchIndex(lang,BASE)));
  return SUITE_TOOLS.map(tool=>({
    id:tool.id,name:tool.title,description:tool.description,path:suitePath(tool),url:BASE+suitePath(tool),
    category:tool.category,mcpTool:tool.name,inputSchema:toolInputSchema(tool),example:tool.example,
    execution:'deterministic',isAccessibleForFree:true,
  }));
}
