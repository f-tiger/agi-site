import {SUITE_CATEGORIES,SUITE_TOOLS,suitePath} from '../lib/ai-suite/registry.mjs';

const assets = '<link rel="stylesheet" href="/studio-assets/ai-suite-directory.css?v=1">';
const script = '<script type="module" src="/studio-assets/ai-suite-directory.mjs?v=1"></script>';

export const suiteCount = SUITE_TOOLS.length;
export const categoryPath = group => '/studio/ai/categories/'+group.id;

export function renderAiIndex({BASE,lang,esc,home=false,category}) {
  const zh=lang==='zh';
  const t=(cn,en)=>zh?cn:en;
  const alternate=zh?'en':'zh';
  // Alternate-language labels are search metadata. Character references preserve the
  // exact alias in the browser without putting translated words in English page copy.
  const alias=tool=>esc(tool.title[alternate]).replace(/\p{Script=Han}/gu,char=>'&#'+char.codePointAt(0)+';');
  const groups=category?[category]:SUITE_CATEGORIES;
  const total=category?category.tools.length:suiteCount;
  const homeIntro=`<header class="suite-index-header"><div>
    <h2>${t('BPJ 自研 AI 工具','BPJ AI tools')}</h2>
    <p>${t(`${total.toLocaleString('zh-CN')} 个自研工具，打开即用。也可以通过 MCP 交给 AI 调用。`,`${total.toLocaleString('en-US')} BPJ tools you can run in your browser or connect to your AI via MCP.`)}</p>
    </div><nav aria-label="${t('工具目录入口','Tool directory links')}">
      <a href="${BASE}/studio/ai/">${t('完整工具目录','Full directory')}</a>
      <a href="${BASE}/studio/ai/#mcp">${t('连接 MCP','Connect MCP')}</a>
    </nav></header>`;
  const groupSelect=category?'':`<label class="suite-search-scope" for="suite-search-scope">
      <span>${t('分类','Category')}</span>
      <select id="suite-search-scope" data-suite-filter>
        <option value="">${t('全部分类','All categories')}</option>
        ${groups.map(group=>`<option value="${group.id}">${esc(group.title[lang])}</option>`).join('')}
      </select>
    </label>`;
  const browse=groups.map(group=>`<details data-suite-group data-group-id="${group.id}" ${category?'open':''}>
    <summary><strong>${esc(group.title[lang])}</strong><span>${group.tools.length}</span></summary>
    ${category?'':`<a class="suite-category-link" href="${BASE}${categoryPath(group)}">${t('浏览此分类','Browse category')}</a>`}
    <ul>${group.tools.map(tool=>`<li data-suite-keywords data-suite-alt="${alias(tool)}">
      <a href="${BASE}${suitePath(tool)}">${esc(tool.title[lang])}</a>
      <p class="suite-directory-description">${esc(tool.description[lang])}</p>
    </li>`).join('')}</ul>
    </details>`).join('');
  return `${assets}<section class="suite-index${home?' suite-index-home':''}${category?' suite-index-category':''}" ${home?'id="ai-tools" data-home-block="ai-tools"':''} data-suite-index>
    ${home?homeIntro:''}
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
    <div data-suite-results id="suite-search-results" class="suite-search-results" hidden>
      <ul aria-label="${t('搜索结果','Search results')}" data-suite-result-list></ul>
      <button type="button" class="suite-directory-button" data-suite-more hidden>${t('显示更多工具','Show more tools')}</button>
    </div>
    <div class="suite-categories" data-suite-browse>${browse}</div>
  </section>${script}`;
}
