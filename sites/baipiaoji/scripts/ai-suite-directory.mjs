import {SUITE_CATEGORIES,SUITE_TOOLS,suitePath} from '../lib/ai-suite/registry.mjs';
import {aiSuiteFeaturedCss, renderAiFeatured} from './ai-suite-featured.mjs';

const script = '<script type="module" src="/studio-assets/ai-suite-directory.mjs?v=3"></script>';

export const suiteCount = SUITE_TOOLS.length;
export const categoryPath = group => '/studio/ai/categories/'+group.id;
export const searchIndexPath = '/studio/ai/search-index.json';
export function aiSuiteSearchIndex(lang, base) {
  const alternate=lang==='zh'?'en':'zh';
  const prefix=new URL(base).pathname.replace(/\/$/,'');
  return SUITE_CATEGORIES.map(group=>({
    id:group.id,
    title:group.title[lang],
    tools:group.tools.map(tool=>({
      path:prefix+suitePath(tool),
      title:tool.title[lang],
      alternate:tool.title[alternate],
      ...(tool.searchAliases ? {aliases:tool.searchAliases} : {}),
      description:tool.description[lang],
    })),
  }));
}

export function renderAiIndex({BASE,lang,esc,home=false,category}) {
  const zh=lang==='zh';
  const t=(cn,en)=>zh?cn:en;
  const alternate=zh?'en':'zh';
  // Alternate-language labels are search metadata. Character references preserve the
  // exact alias in the browser without putting translated words in English page copy.
  const searchAttribute=value=>esc(value).replace(/\p{Script=Han}/gu,char=>'&#'+char.codePointAt(0)+';');
  const groups=category?[category]:SUITE_CATEGORIES;
  const total=category?category.tools.length:suiteCount;
  const homeIntro=`<header class="suite-index-header"><div>
    <h2>${t('BPJ 自研 AI 工具','BPJ AI tools')}</h2>
    <p>${t(`用浏览器中的工具完成 AI 评测与复核。工具目录中的 ${total.toLocaleString('zh-CN')} 项也可通过 MCP 调用。`,`Evaluate and review AI outputs in your browser. The directory's ${total.toLocaleString('en-US')} tools are also available through MCP.`)}</p>
    </div><nav aria-label="${t('工具目录入口','Tool directory links')}">
      <a href="${BASE}/studio/ai/">${t('完整工具目录','Full directory')}</a>
      <a href="${BASE}/studio/ai/#mcp">${t('连接 MCP','Connect MCP')}</a>
    </nav></header>`;
  const tasks = category ? '' : renderAiFeatured({BASE, lang, esc, heading: home ? 'h3' : 'h2'});
  const groupSelect=category?'':`<label class="suite-search-scope" for="suite-search-scope">
      <span>${t('分类','Category')}</span>
      <select id="suite-search-scope" data-suite-filter>
        <option value="">${t('全部分类','All categories')}</option>
        ${groups.map(group=>`<option value="${group.id}">${esc(group.title[lang])}</option>`).join('')}
      </select>
    </label>`;
  const browse=groups.map(group=>{
    // Keep each category and representative tools discoverable in the initial home document.
    const shown=!home?group.tools:group.id==='text-data'
      ? [group.tools.find(tool=>tool.id==='csv-to-json'),group.tools[0]]
      : group.tools.slice(0,2);
    return `<details data-suite-group data-group-id="${group.id}" ${category?'open':''}>
    <summary><strong>${esc(group.title[lang])}</strong><span>${group.tools.length}</span></summary>
    ${category?'':`<a class="suite-category-link" href="${BASE}${categoryPath(group)}">${t('浏览此分类','Browse category')}</a>`}
    <ul>${shown.map(tool=>`<li data-suite-keywords data-suite-alt="${searchAttribute(tool.title[alternate])}" ${tool.searchAliases ? `data-suite-aliases="${searchAttribute(JSON.stringify(tool.searchAliases))}"` : ''}>
      <a href="${BASE}${suitePath(tool)}">${esc(tool.title[lang])}</a>
      <p class="suite-directory-description">${esc(tool.description[lang])}</p>
    </li>`).join('')}</ul>
    </details>`;
  }).join('');
  return `${aiSuiteFeaturedCss}<section class="suite-index${home?' suite-index-home':''}${category?' suite-index-category':''}" ${home?`id="ai-tools" data-home-block="ai-tools" data-suite-source="${BASE}${searchIndexPath}"`:''} data-suite-index data-suite-total="${total}">
    ${home?homeIntro:''}${tasks}
    <div class="suite-search" data-suite-controls hidden>
      <form data-suite-search-form role="search" aria-label="${t('搜索自研 AI 工具','Search BPJ AI tools')}">
        <label class="suite-search-query" for="suite-search">
          <span>${t('按任务或名称搜索','Find a tool by task or name')}</span>
          <input type="search" id="suite-search" data-suite-search placeholder="${t('例如 CSV、矩阵、库存','Try CSV, matrix, or inventory')}" maxlength="120" autocomplete="off" aria-controls="suite-search-results">
        </label>
        ${groupSelect}
      </form>
      <div class="suite-search-line">
        <span data-suite-count role="status"></span>
        <button type="button" class="suite-directory-button" data-suite-clear hidden>${t('清除筛选','Clear filters')}</button>
      </div>
    </div>
    <p class="suite-search-empty" data-suite-empty hidden>${t('找不到匹配的工具。试试更短的关键词，或选择全部分类。','No tools match. Try a shorter search or choose all categories.')}</p>
    ${home?`<p class="suite-search-empty" data-suite-unavailable hidden>${t('当前无法载入搜索。','Search is temporarily unavailable.')} <a href="${BASE}/studio/ai/">${t('打开完整工具目录','Open the full directory')}</a></p>`:''}
    <div data-suite-results id="suite-search-results" class="suite-search-results" hidden>
      <ul aria-label="${t('搜索结果','Search results')}" data-suite-result-list></ul>
      <button type="button" class="suite-directory-button" data-suite-more hidden>${t('显示更多工具','Show more tools')}</button>
    </div>
    <div class="suite-categories" data-suite-browse>${browse}</div>
  </section>${script}`;
}
