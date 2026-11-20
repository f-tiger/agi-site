import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TDS_TOOLS } from '../collector-assets/tds-suite/index.mjs';
import { locales, origin, route } from './collecting/content.mjs';

const updated = '2026-11-20';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : root);
const write = (name, value) => {
  const file = path.join(output, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const json = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const lc = (lang, source) => source?.[lang] ?? source?.en ?? '';
const assets = '/collector-assets/tds-suite';
const updateLabel = { en:'Reviewed', de:'Geprüft', zh:'复核日期' };

const words = {
  en:{
    hub:'AI and MCP tools', catalog:'Find a tool', local:'Runs on this device', privacyLink:'Privacy', privacy:'Your entries are processed by the browser. The page does not send them to TDS.',
    intro:'Open a calculator, purchase check or planning workflow. Use it in your browser or call the same operation through MCP.',
    browse:'Browse by task', search:'Search tools by problem, model or name', placeholder:'For example, storage box', all:'All categories', more:'Show more', zero:'No tools match.',
    load:'Tool search could not be loaded. Browse by category below.', count:'tools', go:'Open tool', home:'Home', buying:'Buying guides',
    tools:'All tools', examples:'Load example', execute:'Run tool', result:'Result', copy:'Copy result', copied:'Result copied.', download:'Download JSON',
    error:'Review the highlighted or missing fields.', failed:'The tool could not process these values.', process:'Processing…', input:'Enter your details', evidence:'Manufacturer source',
    interface:'Use via MCP', calls:'Copy MCP request details', endpoint:'MCP endpoint', browser:'Use in the browser', catalogData:'Machine-readable directory',
    scope:'Manufacturer specifications and local checks can help you choose. Check the seller’s current offer, regional version and instructions before purchasing.',
    suite:'TDS tools', read:'See how to use the tool', noscript:'You can read the instructions and filter by category below. Running a tool requires JavaScript.',
    nav:'Tools', exampleResult:'Worked example', required:'Required fields are marked.'
  },
  de:{
    hub:'KI- und MCP-Tools', catalog:'Werkzeug finden', local:'Läuft auf diesem Gerät', privacyLink:'Datenschutz', privacy:'Der Browser verarbeitet deine Eingaben. Die Seite sendet sie nicht an TDS.',
    intro:'Öffne einen Rechner, eine Kaufprüfung oder einen Planungsablauf. Nutze das Werkzeug im Browser oder rufe dieselbe Funktion über MCP auf.',
    browse:'Nach Aufgabe stöbern', search:'Werkzeuge nach Aufgabe, Modell oder Namen suchen', placeholder:'Zum Beispiel Aufbewahrungsbox', all:'Alle Kategorien', more:'Mehr anzeigen', zero:'Keine passenden Werkzeuge.',
    load:'Die Suche konnte nicht geladen werden. Wähle unten eine Kategorie.', count:'Werkzeuge', go:'Werkzeug öffnen', home:'Start', buying:'Kaufhilfen',
    tools:'Alle Werkzeuge', examples:'Beispiel laden', execute:'Werkzeug ausführen', result:'Ergebnis', copy:'Ergebnis kopieren', copied:'Ergebnis kopiert.', download:'JSON herunterladen',
    error:'Prüfe die markierten oder fehlenden Angaben.', failed:'Das Werkzeug konnte diese Werte nicht verarbeiten.', process:'Wird verarbeitet…', input:'Angaben eingeben', evidence:'Herstellerquelle',
    interface:'Über MCP nutzen', calls:'MCP-Aufruf kopieren', endpoint:'MCP-Endpunkt', browser:'Im Browser nutzen', catalogData:'Maschinenlesbarer Katalog',
    scope:'Herstellerangaben und lokale Prüfungen helfen bei der Auswahl. Prüfe vor dem Kauf das aktuelle Angebot, die Länderversion und die Anleitung.',
    suite:'TDS-Werkzeuge', read:'Anwendung ansehen', noscript:'Anleitung und Kategorien sind direkt lesbar. Zum Ausführen eines Werkzeugs ist JavaScript erforderlich.',
    nav:'Werkzeuge', exampleResult:'Rechenbeispiel', required:'Pflichtfelder sind gekennzeichnet.'
  },
  zh:{
    hub:'AI 与 MCP 工具', catalog:'查找工具', local:'在当前设备运行', privacyLink:'隐私', privacy:'浏览器在本机处理输入。页面不会把输入发送给 TDS。',
    intro:'打开计算器、选购检查或规划工具。可在浏览器中运行，也可通过 MCP 调用同一功能。',
    browse:'按任务浏览', search:'按问题、型号或工具名称搜索', placeholder:'例如收纳盒', all:'全部分类', more:'显示更多', zero:'没有符合条件的工具。',
    load:'搜索暂不可用，可以按下方分类浏览。', count:'个工具', go:'打开工具', home:'首页', buying:'选购指南',
    tools:'全部工具', examples:'载入示例', execute:'运行工具', result:'结果', copy:'复制结果', copied:'已复制结果。', download:'下载 JSON',
    error:'请检查标记的字段或缺少的信息。', failed:'工具无法处理当前输入。', process:'正在处理…', input:'填写所需信息', evidence:'厂家来源',
    interface:'通过 MCP 调用', calls:'复制 MCP 请求信息', endpoint:'MCP 接口', browser:'在浏览器中运行', catalogData:'机器可读目录',
    scope:'厂家规格和本地检查可以辅助选择。下单前请确认卖家实际商品、地区版本和使用说明。',
    suite:'TDS 工具', read:'查看用法', noscript:'可以直接阅读说明和按分类浏览。运行工具需要 JavaScript。',
    nav:'工具', exampleResult:'示例结果', required:'必填项已标记。'
  }
};
const titles = {
  bath:['Bath','Bad','卫浴'], cleaning:['Home cleaning','Reinigung','居家清洁'], climate:['Indoor climate','Raumklima','室内环境'],
  creative:['Creative projects','Kreative Projekte','创作手工'], desk:['Workspace','Arbeitsplatz','桌面办公'], display:['Display','Präsentation','展示陈列'],
  electronics:['Electronics','Elektronik','消费电子'], kitchen:['Kitchen','Küche','厨房用品'], lighting:['Lighting','Beleuchtung','家居照明'],
  'personal-care':['Personal care','Körperpflege','个护'], photo:['Photography','Fotografie','拍摄'],
  'smart-home':['Smart home','Smart Home','智能家居'], stationery:['Stationery','Schreibwaren','文具'], storage:['Storage','Aufbewahrung','家居收纳'],
  finance:['Budget and costs','Budget und Kosten','预算与成本'], household:['Home planning','Haushaltsplanung','家庭规划'],
  commerce:['Shopping and value','Einkauf und Preis','选购与性价比'], planning:['Planning','Planung','规划'],
  text:['Text and writing','Text und Schreiben','文本写作'], data:['Data and lists','Daten und Listen','数据与清单'],
  marketing:['Marketing','Marketing','营销'], productivity:['Workflows','Arbeitsabläufe','工作流'],
  measurements:['Measurements','Maße','度量与规格'], collections:['Collections','Sammlungen','收藏管理'],
  logistics:['Transport and packing','Transport und Verpackung','包装与运输'], shipping:['Shipping','Versand','运输快递'],
  resale:['Resale','Weiterverkauf','转售'], comparison:['Comparison','Vergleich','对比决策'], packing:['Packing','Verpackung','包装'],
  intake:['Intake','Bestandszugang','入库'], buying:['Buying decisions','Kaufentscheidungen','购买决策'],
  inventory:['Inventory','Bestand','库存清单'], handover:['Handover','Übergabe','交接记录']
};
const categoryLabel = (lang, category) => titles[category]?.[{ en:0, de:1, zh:2 }[lang]] ?? category.replaceAll('-', ' ');
const slugPath = (part = '') => 'ai-tools' + (part ? '/' + part : '');
const endpoint = origin + '/api/home-mcp';
const discovery = [];
const allRecords = [];
const groups = new Map();
const featured = (tool) => !tool.name.startsWith('tds_purchase_');
for (const tool of TDS_TOOLS) {
  if (!groups.has(tool.category)) groups.set(tool.category, []);
  groups.get(tool.category).push(tool);
}
const catalogOrder = [...TDS_TOOLS].sort((a,b) => Number(featured(b)) - Number(featured(a)));
const toolRoute = (lang, tool) => route(lang, slugPath(tool.slug));
const categoryRoute = (lang, key) => route(lang, slugPath('categories/' + key));
const fileFor = (publicRoute) => publicRoute.replace(/^\//, '') + '.html';
const datasetUrl = (lang) => `${assets}/catalog-${lang}.json`;
const alt = (slug) => Object.entries(locales).map(([lang, item]) => `<link rel="alternate" hreflang="${item.tag}" href="${origin + route(lang, slug)}">`).join('') +
  `<link rel="alternate" hreflang="x-default" href="${origin + route('de', slug)}">`;
const nameFor = (lang, tool) => lc(lang, tool.title);
const examplesFor = (lang,tool) => tool.examples?.[lang] ?? tool.example;
const evidenceFor = (lang,tool) => tool.evidenceByLocale?.[lang] ?? tool.evidence;
function page({ lang, slug, title, description, content, graph, discover = true }) {
  const c = words[lang];
  const full = origin + route(lang, slug);
  const machine = `${assets}/text/${lang}/${slug.replace(/^ai-tools\/?/, '') || 'index'}.txt`;
  const body = `<!doctype html><html lang="${locales[lang].tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#e4002b"><title>${esc(title)} | The Doll Scout</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${discover ? 'index,follow,max-image-preview:large' : 'noindex,follow'}"><link rel="canonical" href="${full}">${alt(slug)}<link rel="alternate" type="text/plain" href="${origin+machine}"><link rel="alternate" type="application/json" href="${origin+datasetUrl(lang)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${full}"><link rel="stylesheet" href="/document-assets/style.css"><link rel="stylesheet" href="${assets}/suite.css"><script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script></head><body><a class="skip" href="#main">${esc(c.catalog)}</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="${route(lang)}"><img width="34" height="34" src="/collector-assets/icon.svg" alt=""><span>The Doll Scout</span></a><nav class="main-nav" aria-label="${esc(c.nav)}"><a href="${route(lang,'shop')}">${esc(c.buying)}</a><a href="${route(lang,slugPath())}" aria-current="page">${esc(c.suite)}</a></nav><nav class="languages" aria-label="Language">${Object.entries(locales).map(([key, value]) => `<a href="${route(key, slug)}" lang="${value.tag}"${key === lang ? ' aria-current="page"' : ''}>${value.label}</a>`).join('')}</nav></div></header><main id="main" class="wrap tds-suite">${content}</main><footer class="site-footer"><div class="wrap"><a href="${route(lang)}">The Doll Scout</a> · <a href="${route(lang,'document-privacy')}">${esc(c.privacyLink)}</a></div></footer><script type="module" src="${assets}/browser.mjs"></script></body></html>`;
  write(fileFor(route(lang,slug)),body);
  if (discover) discovery.push(full);
  allRecords.push({lang, slug, url:full, machine, title, discover});
  return machine;
}
function summaryGraph(lang, slug, title, description, list = []) {
  const url = origin + route(lang, slug);
  return [
    {'@type':'CollectionPage', '@id':url + '#page', name:title, description, url, inLanguage:locales[lang].tag, dateModified:updated},
    {'@type':'ItemList', '@id':url + '#tools', name:title, numberOfItems:list.length, itemListElement:list.slice(0,36).map((tool,i) => ({'@type':'ListItem', position:i+1, name:nameFor(lang,tool), url:origin+toolRoute(lang,tool)}))}
  ];
}
const crumb = (lang, title, link = '') => `<nav class="breadcrumb" aria-label="${words[lang].suite}"><a href="${route(lang)}">${words[lang].home}</a><span>/</span><a href="${route(lang,slugPath())}">${words[lang].suite}</a>${link ? `<span>/</span><a href="${link.href}">${esc(link.label)}</a>` : ''}${title ? `<span>/</span><span aria-current="page">${esc(title)}</span>` : ''}</nav>`;
const taskTile = (lang, tool) => `<li class="tds-suite-card"><a href="${toolRoute(lang,tool)}">${esc(nameFor(lang,tool))}</a><p>${esc(lc(lang,tool.description))}</p><span>${esc(categoryLabel(lang,tool.category))}</span></li>`;
const docsLinks = (lang) => `<p class="tds-suite-meta"><a href="${datasetUrl(lang)}">${esc(words[lang].catalogData)}</a> · <a href="#mcp">MCP</a></p>`;
const mcpDocs = (lang, tool) => {
  const c = words[lang];
  const request = tool ? {jsonrpc:'2.0',id:1,method:'tools/call',params:{name:tool.name,arguments:examplesFor(lang,tool),_meta:{'tds/locale':lang}}} : {jsonrpc:'2.0',id:1,method:'tools/list'};
  return `<section class="section tds-mcp" id="mcp" aria-labelledby="tds-mcp-heading"><h2 id="tds-mcp-heading">${esc(c.interface)}</h2><p>${esc(c.endpoint)} <code>${endpoint}</code></p><pre data-tds-mcp>${esc(JSON.stringify(request,null,2))}</pre><button type="button" data-tds-copy-mcp hidden>${esc(c.calls)}</button></section>`;
};
const inputField = (lang, tool, key, schema) => {
  const required = tool.inputSchema.required?.includes(key) ? ' required' : '';
  const inputName = esc(key);
  const id = 'tds-field-' + inputName;
  const title = lc(lang, tool.fieldTitles?.[key]) || key.replace(/([a-z])([A-Z])/g, '$1 $2');
  const numeric = ['number','integer'].includes(schema.type);
  const numericAttr = (attribute, value) => Number.isFinite(value) ? ` ${attribute}="${value}"` : '';
  const field = schema.enum ? `<select id="${id}" name="${inputName}"${required}><option value=""></option>${schema.enum.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>`
    : schema.type === 'boolean' ? `<input id="${id}" name="${inputName}" type="checkbox">`
    : numeric ? `<input id="${id}" name="${inputName}" type="number" inputmode="decimal" step="${schema.type === 'integer' ? '1' : 'any'}"${numericAttr('min',schema.minimum)}${numericAttr('max',schema.maximum)}${required}>`
    : `<textarea rows="${schema.maxLength > 160 ? 4 : 1}" id="${id}" name="${inputName}"${numericAttr('maxlength',schema.maxLength)}${required}></textarea>`;
  return `<div class="tds-suite-field"><label for="${id}">${esc(title)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${field}</div>`;
};

for (const [lang,c] of Object.entries(words)) {
  const langData = catalogOrder.map(tool => ({
    name:tool.name, slug:tool.slug, category:tool.category, categoryLabel:categoryLabel(lang,tool.category), title:nameFor(lang,tool),
    description:lc(lang,tool.description), path:toolRoute(lang,tool), inputSchema:tool.inputSchema, evidence:evidenceFor(lang,tool) ?? null,
    execution:'browser-or-mcp',
  }));
  const directory = {updated, locale:lang, count:langData.length, runsLocally:true, mcp:endpoint, categories:Object.fromEntries([...groups].map(([key,v]) => [key,{count:v.length,label:categoryLabel(lang,key),url:categoryRoute(lang,key)}])), tools:langData};
  write(datasetUrl(lang).slice(1),json(directory)+'\n');
  const intro = `${catalogOrder.length.toLocaleString(locales[lang].tag)} ${c.count}. ${c.intro}`;
  const initial = catalogOrder.slice(0,24);
  const hubContent = `${crumb(lang)}<header class="tds-suite-head"><div><h1>${esc(c.hub)}</h1><p>${esc(intro)}</p>${docsLinks(lang)}</div><p class="tds-suite-note">${esc(c.local)}</p></header><section class="tds-suite-directory" data-tds-directory data-source="${datasetUrl(lang)}"><h2>${esc(c.catalog)}</h2><form data-tds-filters hidden><label>${esc(c.search)}<input type="search" name="q" maxlength="100" placeholder="${esc(c.placeholder)}"></label><label>${esc(c.browse)}<select name="category"><option value="">${esc(c.all)}</option>${[...groups].map(([key,v])=>`<option value="${esc(key)}">${esc(categoryLabel(lang,key))} (${v.length})</option>`).join('')}</select></label></form><p aria-live="polite" class="tds-suite-meta" data-tds-list-count>${catalogOrder.length.toLocaleString(locales[lang].tag)} ${esc(c.count)}</p><ul class="tds-suite-grid" data-tds-results>${initial.map(tool=>taskTile(lang,tool)).join('')}</ul><button type="button" data-tds-more hidden>${esc(c.more)}</button><noscript><p>${esc(c.noscript)}</p></noscript></section><section class="section tds-suite-categories"><h2>${esc(c.browse)}</h2><ul>${[...groups].map(([key,v])=>`<li><a href="${categoryRoute(lang,key)}">${esc(categoryLabel(lang,key))}</a> <span>${v.length}</span></li>`).join('')}</ul></section>${mcpDocs(lang)}<script type="application/json" data-tds-ui>${json(c)}</script>`;
  const hubMachine = page({lang,slug:slugPath(),title:c.hub,description:intro,content:hubContent,graph:summaryGraph(lang,slugPath(),c.hub,intro,catalogOrder)});
  write(hubMachine.slice(1), `# ${c.hub}\n\n${origin+route(lang,slugPath())}\n\n${intro}\n\n${c.privacy}\n\n${c.catalogData} ${origin+datasetUrl(lang)}\nMCP ${endpoint}\n\n`+
    [...groups].map(([key,items])=>`- ${categoryLabel(lang,key)} · ${items.length} · ${origin+categoryRoute(lang,key)}`).join('\n')+'\n');
  for (const [key, items] of groups) {
    const slug = slugPath('categories/' + key);
    const name = categoryLabel(lang,key);
    const description = `${name} · ${items.length} ${c.count}. ${c.intro}`;
    const content = `${crumb(lang,name)}<header class="tds-suite-head"><div><h1>${esc(name)}</h1><p>${esc(description)}</p><a href="${route(lang,slugPath())}">${esc(c.tools)}</a></div></header><ul class="tds-suite-grid tds-suite-category-grid">${items.map(tool=>taskTile(lang,tool)).join('')}</ul>`;
    const machine = page({lang,slug,title:name,description,content,graph:summaryGraph(lang,slug,name,description,items)});
    write(machine.slice(1), `# ${name}\n\n${origin+categoryRoute(lang,key)}\n\n${description}\n\n` + items.map(tool=>`- ${nameFor(lang,tool)} · ${origin+toolRoute(lang,tool)}\n  ${lc(lang,tool.description)}`).join('\n')+'\n');
  }
  for (const tool of TDS_TOOLS) {
    const slug = slugPath(tool.slug);
    const title = nameFor(lang,tool);
    const description = lc(lang,tool.description);
    const metadata = { name:tool.name, locale:lang, inputSchema:tool.inputSchema, example:examplesFor(lang,tool), ui:c };
    const evidence = evidenceFor(lang,tool);
    const checked = evidence?.checked ? ` <time datetime="${esc(evidence.checked)}">${esc(evidence.checked)}</time>` : '';
    const source = evidence?.url?.startsWith('https://') ? `<section class="section"><h2>${esc(c.evidence)}</h2><p><a href="${esc(evidence.url)}" rel="noopener noreferrer">${esc(new URL(evidence.url).hostname)}</a>${checked}</p><p>${esc(c.scope)}</p></section>` : '';
    const category = { href:categoryRoute(lang,tool.category), label:categoryLabel(lang,tool.category) };
    const content = `${crumb(lang,title,category)}<header class="tds-suite-head"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><p class="tds-suite-note">${esc(c.local)}</p></header><div class="tds-suite-workspace"><section class="work-panel" aria-labelledby="tds-tool-heading"><h2 id="tds-tool-heading">${esc(c.input)}</h2><p class="tds-suite-meta">${esc(c.required)}</p><form data-tds-tool>${Object.entries(tool.inputSchema.properties).map(([key,schema]) => inputField(lang,tool,key,schema)).join('')}<div class="actions"><button class="primary" type="submit" disabled>${esc(c.execute)}</button><button type="button" data-tds-example disabled>${esc(c.examples)}</button></div></form><noscript><p>${esc(c.noscript)}</p></noscript><p class="tds-suite-meta">${esc(c.privacy)}</p><p role="status" aria-live="polite" data-tds-status></p></section><section class="work-panel tds-suite-result" aria-labelledby="tds-result-heading"><h2 id="tds-result-heading">${esc(c.result)}</h2><p class="tds-suite-result-summary" data-tds-summary hidden></p><pre data-tds-result tabindex="0"></pre><div class="actions"><button type="button" data-tds-copy disabled>${esc(c.copy)}</button><button type="button" data-tds-export disabled>${esc(c.download)}</button></div></section></div>${source}${mcpDocs(lang,tool)}<script type="application/json" data-tds-config>${json(metadata)}</script>`;
    const url = origin + toolRoute(lang,tool);
    const graph = [{'@type':'WebApplication', name:title, description, url, inLanguage:locales[lang].tag, applicationCategory:'UtilitiesApplication', operatingSystem:'Web browser', browserRequirements:'Requires JavaScript', isAccessibleForFree:true, offers:{'@type':'Offer', price:0, priceCurrency:'USD'}}];
    const machine = page({lang,slug,title,description,content,graph,discover:featured(tool)});
    write(machine.slice(1), `# ${title}\n\n${url}\n\n${description}\n\n${c.privacy}\n\n${c.endpoint} ${endpoint}\nMCP tool name ${tool.name}\n\n${JSON.stringify(tool.inputSchema,null,2)}\n`+(evidence?.url?`\n${c.evidence} ${evidence.url} ${updateLabel[lang]} ${evidence.checked}\n`:''));
  }
}

const sitemapFile = path.join(output,'sitemap.xml');
let xml = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile,'utf8') : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
xml = xml.replace(/<url>\s*<loc>https:\/\/thedollscout\.com\/(?:de\/|zh\/)?ai-tools(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>\n?/g,'');
xml = xml.replace('</urlset>',discovery.map(url=>`<url><loc>${url}</loc><lastmod>${updated}</lastmod></url>`).join('\n')+'\n</urlset>');
write('sitemap.xml',xml);
const discoveryBody = '\n<!-- tds-suite:start -->\n## TDS AI and MCP tools\n\n' +
  Object.entries(words).map(([lang,c]) => `- ${c.hub} ${origin+route(lang,slugPath())} · ${c.catalogData} ${origin+datasetUrl(lang)}`).join('\n') +
  `\n- MCP endpoint ${endpoint}\n- ${TDS_TOOLS.length} executable tool definitions. Browser execution processes form input on the user's device. MCP execution processes request arguments on the server.\n<!-- tds-suite:end -->\n`;
for (const filename of ['llms.txt','llms-full.txt']) {
  const file = path.join(output,filename);
  const before = fs.existsSync(file) ? fs.readFileSync(file,'utf8') : '# The Doll Scout\n';
  write(filename,before.replace(/\n?<!-- tds-suite:start -->[\s\S]*?<!-- tds-suite:end -->\n?/g,'') + discoveryBody);
}
write('collector-assets/tds-suite/manifest.json',json({updated,count:TDS_TOOLS.length,indexable:discovery,pages:allRecords})+'\n');

for (const [lang,c] of Object.entries(words)) {
  for (const target of [route(lang), route(lang,'document-tools')]) {
    const filename = target.endsWith('/') ? target.slice(1) + 'index.html' : fileFor(target);
    const file = path.join(output,filename);
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file,'utf8');
    if (before.includes('data-tds-suite-entry')) continue;
    const entry = `<section class="section" data-tds-suite-entry><h2>${esc(c.hub)}</h2><p>${esc(c.intro)}</p><a class="button primary" href="${route(lang,slugPath())}">${esc(c.tools)}</a></section>`;
    write(filename,before.replace('</main>',entry+'</main>'));
  }
}
const headers = path.join(output,'_headers');
const headerBody = fs.existsSync(headers) ? fs.readFileSync(headers,'utf8') : '';
const suiteHeaders = `
# TDS-SUITE-HEADERS
/collector-assets/tds-suite/catalog-de.json
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
/collector-assets/tds-suite/catalog-en.json
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
/collector-assets/tds-suite/catalog-zh.json
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
/collector-assets/tds-suite/manifest.json
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
/collector-assets/tds-suite/text/*
  Content-Type: text/plain; charset=utf-8
  Access-Control-Allow-Origin: *
  X-Robots-Tag: noindex
# /TDS-SUITE-HEADERS
`;
write('_headers',headerBody.replace(/\n?# TDS-SUITE-HEADERS[\s\S]*?# \/TDS-SUITE-HEADERS\n?/g,'')+suiteHeaders);
console.log(`TDS suite: ${TDS_TOOLS.length} tool definitions, ${allRecords.length} localized pages, ${discovery.length} sitemap URLs.`);
