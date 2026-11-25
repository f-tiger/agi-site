import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGIONAL_TDS_TOOLS, TDS_TOOLS } from '../collector-assets/tds-suite/index.mjs';
import { REGIONAL_GUIDE_PATHS } from '../collector-assets/tds-suite/regional-buying-links.mjs';
import { UK_LAUNDRY_TOOL } from '../collector-assets/tds-suite/regional-uk-laundry.mjs';
import { locales, origin, route } from './collecting/content.mjs';

const updated = '2026-11-22';
const initialRelease = '2026-11-20';
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
const germanMeterPath = '/de/ai-tools/dach-meter-fit';
const germanMeterAdvice = {
  updated: '2026-11-23',
  title: 'Strommessgerät ausleihen oder kaufen?',
  description: 'Einmal den Stromverbrauch messen? Nutze ein geeignetes kWh-Messgerät oder leihe eins aus. Prüfe Last, Stecker und App vor dem Kauf in DE, AT oder CH.',
  checklist: 'Vor dem Kauf richtig messen',
  steps: [
    'Für eine einzelne Messung zuerst ein vorhandenes kWh-Messgerät prüfen oder vor Ort nach einem Leihgerät fragen. Die Verbraucherzentrale NRW nennt Beratungsstellen mit Verleih. Für mehrmalige Messungen mit einer App kann eine passende Messsteckdose sinnvoll sein.',
    'Vor dem Anschließen die Anleitung von Gerät und Messgerät prüfen. Achte auf den passenden Stecker und die zulässige Last, bei Motoren auch auf den Einschaltstrom. Kühlschrank, Trockner und ungeprüfte Lasten brauchen ein dafür ausdrücklich zugelassenes Messgerät. Tapo P110 und P110M kommen hier nur für andere, bestätigte Anwendungen infrage.',
    'Einen Kühlschrank im normalen Alltag sieben Tage messen. Für einen Trockner zählt ein vollständiger Durchgang. Lies die Differenz am kWh-Zähler ab und notiere die Laufzeit und Nutzung. Bei ungewöhnlichen Bedingungen wiederhole die Messung.',
  ],
  sources: [
    ['Verbraucherzentrale NRW · Strommessgeräte ausleihen', 'https://www.verbraucherzentrale.nrw/strommessgeraete'],
    ['Verbraucherzentrale · Kühlschrank sieben Tage messen', 'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/so-finden-sie-den-passenden-kuehlschrank-10573'],
    ['TP-Link · Zulässige Lasttypen für EU-Modelle', 'https://www.tp-link.com/de/support/faq/3816/'],
  ],
};
const ukLaundryUpdated = '2026-11-25';
const ukLaundryReview = {
  en: {
    title: 'Keep a dated record for your next laundry test',
    benefit: 'Save measured kWh, your tariff and the review date in the TDS member workspace. Reopen a previous version on another device, enter your new measurements and check whether the cost difference holds.',
    terms: '30 days of TDS membership. Pay 9 USDT plus a unique order amount of about 0.03 USDT on BNB Smart Chain. The member page shows the exact amount. No automatic renewal.',
    privacy: 'Calculating and downloading your results are free. The calculator runs on this device. Readings are uploaded only when you choose Save in the member workspace.',
    start: 'Open the member workspace',
    existing: 'Open the workspace for existing members',
    checking: 'Checking whether new membership orders are available…',
    paused: 'New membership orders are temporarily paused. Existing members can open their workspace.',
    unavailable: 'New membership availability could not be checked. Existing members can try opening their workspace.',
    popup: 'Allow this site to open the member tab, then try again.',
    alreadyOpen: 'The member tab is already open for the earlier result. Close it to send a new draft.',
    opened: 'Member tab opened. Check the plan and your draft before continuing.',
    sent: 'Draft sent to the member tab. Choose Save there to keep it in the cloud.',
    saved: 'This review was saved in the member workspace.',
    changed: 'An earlier or edited version was saved. Review the current inputs before saving again.',
    replace: 'Load the saved review and replace the current inputs?',
    restored: 'Review dated {date} (UTC) loaded. Check your tariff, measurements and comparable conditions before running it again.',
  },
  de: {
    title: 'Messwerte für den nächsten Trocknungstest festhalten',
    benefit: 'Speichere gemessene kWh, Tarif und Prüfdatum im TDS-Mitgliederbereich. Öffne einen früheren Stand auf einem anderen Gerät, trage neue Messwerte ein und prüfe die Kostendifferenz erneut.',
    terms: '30 Tage TDS-Mitgliedschaft. Der Preis beträgt 9 USDT plus etwa 0,03 USDT zur Zuordnung der Bestellung auf der BNB Smart Chain. Den genauen Betrag siehst du im Mitgliederbereich. Keine automatische Verlängerung.',
    privacy: 'Berechnung und Ergebnisdownload sind kostenlos. Der Rechner läuft auf diesem Gerät. Messwerte werden erst beim Klick auf Speichern im Mitgliederbereich hochgeladen.',
    start: 'Mitgliederbereich öffnen',
    existing: 'Arbeitsbereich für bestehende Mitglieder öffnen',
    checking: 'Verfügbarkeit neuer Mitgliedschaften wird geprüft…',
    paused: 'Neue Mitgliedschaften sind vorübergehend pausiert. Bestehende Mitglieder können ihren Arbeitsbereich öffnen.',
    unavailable: 'Die Verfügbarkeit neuer Mitgliedschaften konnte nicht geprüft werden. Bestehende Mitglieder können versuchen, ihren Arbeitsbereich zu öffnen.',
    popup: 'Erlaube dieser Seite, den Mitgliederbereich in einem neuen Tab zu öffnen.',
    alreadyOpen: 'Der Tab mit dem früheren Ergebnis ist offen. Schließe ihn, um einen neuen Entwurf zu senden.',
    opened: 'Mitgliederbereich geöffnet. Prüfe den Tarif und deinen Entwurf.',
    sent: 'Entwurf an den Mitgliederbereich übergeben. Wähle dort Speichern, um ihn in der Cloud abzulegen.',
    saved: 'Diese Messprüfung wurde im Mitgliederbereich gespeichert.',
    changed: 'Ein früherer oder bearbeiteter Stand wurde gespeichert. Prüfe deine aktuellen Eingaben vor dem nächsten Speichern.',
    replace: 'Gespeicherte Messprüfung laden und aktuelle Eingaben ersetzen?',
    restored: 'Messprüfung vom {date} (UTC) geladen. Prüfe Tarif, Messwerte und vergleichbare Bedingungen vor der nächsten Berechnung.',
  },
  zh: {
    title: '保存本次晾衣记录，方便下次复测',
    benefit: '在 TDS 会员工作区保存实测用电量、电价和复核日期。换设备也能打开以前的版本，填入新测量值，复核费用差异是否仍成立。',
    terms: '30 天 TDS 会员。通过 BNB Smart Chain 支付 9 USDT，加约 0.03 USDT 的订单识别尾数。确切金额以会员页面为准。不会自动续费。',
    privacy: '计算和下载结果均免费。计算器在本机运行。只有你在会员工作区主动点击保存时，测量记录才会上传。',
    start: '打开会员工作区（英文）',
    existing: '打开已有会员的工作区（英文）',
    checking: '正在检查是否可以办理新会员…',
    paused: '新会员办理暂时暂停。已有会员仍可打开工作区。',
    unavailable: '暂时无法确认能否办理新会员。已有会员可尝试打开工作区。',
    popup: '请允许打开会员工作区标签页，再重试。',
    alreadyOpen: '较早结果的会员标签页仍开着。关闭它后可以发送新的草稿。',
    opened: '已打开会员工作区。请核对会员方案和草稿。',
    sent: '草稿已发送到会员标签页，需在那边点击保存才会上传。',
    saved: '这次复测记录已保存到会员工作区。',
    changed: '已保存的是较早或已修改的版本。再次保存前请检查当前输入。',
    replace: '是否打开已保存的复测记录，并替换当前输入？',
    restored: '已打开 {date}（UTC）的复测记录。再次计算前，请核对电价、测量值和可比条件。',
  },
};
const ukLaundryEnergy = {
  en: {
    title: 'Add readings from separate devices',
    instructions: 'When you use a heated airer and a dehumidifier in the same drying session, add each device’s measured kWh from that session. Enter a combined meter reading only once. Leave unused device fields blank.',
    example: 'Worked example: 0.40 kWh + 0.85 kWh = 1.25 kWh. Enter 1.25 kWh as the whole-session reading. Multiply the total by your tariff in pence/kWh and divide by 100 for the cost in pounds.',
    devices: ['First device (kWh)', 'Second device (kWh)', 'Third device (kWh, optional)'],
    useA: 'Use total for session A',
    useB: 'Use total for session B',
    empty: 'Enter at least one measured reading.',
    invalid: 'Enter a measured kWh value between 0 and {maximum} for each device used.',
    over: 'The combined reading must be {maximum} kWh or less.',
    sessionAKwh: 'Session A now uses {total} kWh.',
    sessionBKwh: 'Session B now uses {total} kWh.',
    mixed: 'Some inputs still use example values. Replace them to use your own comparison.',
  },
  de: {
    title: 'Messwerte einzelner Geräte addieren',
    instructions: 'Wenn beheizter Wäscheständer und Luftentfeuchter im selben Trocknungsgang laufen, addiere die in diesem Durchgang gemessenen kWh beider Geräte. Erfasse eine gemeinsame Messung nur einmal. Lass ungenutzte Felder leer.',
    example: 'Rechenbeispiel: 0,40 kWh + 0,85 kWh = 1,25 kWh. Trage 1,25 kWh als Messwert für den ganzen Durchgang ein. Multipliziere die Summe mit deinem Tarif in Pence/kWh und teile durch 100, um den Betrag in Pfund zu erhalten.',
    devices: ['Erstes Gerät (kWh)', 'Zweites Gerät (kWh)', 'Drittes Gerät (kWh, optional)'],
    useA: 'Summe für Durchgang A übernehmen',
    useB: 'Summe für Durchgang B übernehmen',
    empty: 'Gib mindestens einen Messwert ein.',
    invalid: 'Gib für jedes verwendete Gerät einen Messwert zwischen 0 und {maximum} kWh ein.',
    over: 'Die Summe darf höchstens {maximum} kWh betragen.',
    sessionAKwh: 'Für Durchgang A sind jetzt {total} kWh eingetragen.',
    sessionBKwh: 'Für Durchgang B sind jetzt {total} kWh eingetragen.',
    mixed: 'Einige Felder enthalten noch Beispielwerte. Ersetze sie für deinen eigenen Vergleich.',
  },
  zh: {
    title: '合计多台设备的实测用电量',
    instructions: '同一次晾衣使用电热晾衣架和除湿机时，请将各设备在该次晾衣中的实测用电量相加。若仪表已经测得两台设备的总用电量，只录入一次。未使用的设备栏可留空。',
    example: '计算示例：0.40 千瓦时 + 0.85 千瓦时 = 1.25 千瓦时。将 1.25 千瓦时填入整次晾衣的用电量。总用电量乘以便士/千瓦时电价，再除以 100，即得英镑电费。',
    devices: ['第一台设备（千瓦时）', '第二台设备（千瓦时）', '第三台设备（千瓦时，选填）'],
    useA: '将合计填入过程 A',
    useB: '将合计填入过程 B',
    empty: '请至少输入一个实测用电量。',
    invalid: '每台已使用设备的实测用电量须在 0 至 {maximum} 千瓦时之间。',
    over: '合计用电量不得超过 {maximum} 千瓦时。',
    sessionAKwh: '已将 {total} 千瓦时填入过程 A。',
    sessionBKwh: '已将 {total} 千瓦时填入过程 B。',
    mixed: '部分输入仍使用示例值。请替换这些数值，再对比你自己的数据。',
  },
};

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
const regionalSlugs = new Set(REGIONAL_TDS_TOOLS.map(tool => tool.slug));
const regionalCategories = new Set(REGIONAL_TDS_TOOLS.map(tool => tool.category));
const catalogOrder = [...TDS_TOOLS].sort((a,b) =>
  Number(regionalSlugs.has(b.slug)) - Number(regionalSlugs.has(a.slug)) || Number(featured(b)) - Number(featured(a)));
const toolRoute = (lang, tool) => route(lang, slugPath(tool.slug));
const categoryRoute = (lang, key) => route(lang, slugPath('categories/' + key));
const fileFor = (publicRoute) => publicRoute.replace(/^\//, '') + '.html';
const datasetUrl = (lang) => `${assets}/catalog-${lang}.json`;
const alt = (slug) => Object.entries(locales).map(([lang, item]) => `<link rel="alternate" hreflang="${item.tag}" href="${origin + route(lang, slug)}">`).join('') +
  `<link rel="alternate" hreflang="x-default" href="${origin + route('de', slug)}">`;
const nameFor = (lang, tool) => lc(lang, tool.title);
const examplesFor = (lang,tool) => tool.examples?.[lang] ?? tool.example;
const evidenceFor = (lang,tool) => tool.evidenceByLocale?.[lang] ?? tool.evidence;
function page({ lang, slug, title, description, content, graph, discover = true, shoppingPath }) {
  const c = words[lang];
  const full = origin + route(lang, slug);
  const machine = `${assets}/text/${lang}/${slug.replace(/^ai-tools\/?/, '') || 'index'}.txt`;
  const isUkLaundry = slug === slugPath(UK_LAUNDRY_TOOL.slug);
  const browserVersion = isUkLaundry ? '?v=20261125-paid'
    : regionalSlugs.has(slug.split('/').at(-1)) ? '?v=20261123' : '';
  const body = `<!doctype html><html lang="${locales[lang].tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#e4002b"><title>${esc(title)} | The Doll Scout</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${discover ? 'index,follow,max-image-preview:large' : 'noindex,follow'}"><link rel="canonical" href="${full}">${alt(slug)}<link rel="alternate" type="text/plain" href="${origin+machine}"><link rel="alternate" type="application/json" href="${origin+datasetUrl(lang)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${full}"><link rel="stylesheet" href="/document-assets/style.css"><link rel="stylesheet" href="${assets}/suite.css${isUkLaundry ? browserVersion : ''}"><script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script></head><body><a class="skip" href="#main">${esc(c.catalog)}</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="${route(lang)}"><img width="34" height="34" src="/collector-assets/icon.svg" alt=""><span>The Doll Scout</span></a><nav class="main-nav" aria-label="${esc(c.nav)}"><a href="${shoppingPath ?? route(lang,'shop')}">${esc(c.buying)}</a><a href="${route(lang,slugPath())}" aria-current="page">${esc(c.suite)}</a></nav><nav class="languages" aria-label="Language">${Object.entries(locales).map(([key, value]) => `<a href="${route(key, slug)}" lang="${value.tag}"${key === lang ? ' aria-current="page"' : ''}>${value.label}</a>`).join('')}</nav></div></header><main id="main" class="wrap tds-suite">${content}</main><footer class="site-footer"><div class="wrap"><a href="${route(lang)}">The Doll Scout</a> · <a href="${route(lang,'document-privacy')}">${esc(c.privacyLink)}</a></div></footer><script type="module" src="${assets}/browser.mjs${browserVersion}"></script></body></html>`;
  write(fileFor(route(lang,slug)),body);
  if (discover) discovery.push(full);
  allRecords.push({lang, slug, url:full, machine, title, discover});
  return machine;
}
function summaryGraph(lang, slug, title, description, list = []) {
  const url = origin + route(lang, slug);
  const modified = slug === slugPath() || regionalCategories.has(slug.split('/').at(-1)) ? updated : initialRelease;
  return [
    {'@type':'CollectionPage', '@id':url + '#page', name:title, description, url, inLanguage:locales[lang].tag, dateModified:modified},
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
  const field = schema.enum ? `<select id="${id}" name="${inputName}"${required}><option value=""></option>${schema.enum.map(v => `<option value="${esc(v)}">${esc(tool.enumLabels?.[key]?.[v]?.[lang] ?? v)}</option>`).join('')}</select>`
    : schema.type === 'boolean' ? `<input id="${id}" name="${inputName}" type="checkbox">`
    : numeric ? `<input id="${id}" name="${inputName}" type="number" inputmode="decimal" step="${schema.type === 'integer' ? '1' : 'any'}"${numericAttr('min',schema.minimum)}${numericAttr('max',schema.maximum)}${required}>`
    : `<textarea rows="${schema.maxLength > 160 ? 4 : 1}" id="${id}" name="${inputName}"${numericAttr('maxlength',schema.maxLength)}${required}></textarea>`;
  return `<div class="tds-suite-field"><label for="${id}">${esc(title)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${field}</div>`;
};

function energyHelper(copy, {minimum, maximum}) {
  const fields = copy.devices.map((label, index) => {
    const id = `tds-energy-device-${index + 1}`;
    return `<div class="tds-suite-field"><label for="${id}">${esc(label)}</label><input id="${id}" type="number" inputmode="decimal" min="${minimum}" max="${maximum}" step="any" data-tds-energy-input></div>`;
  }).join('');
  return `<details class="tds-suite-energy-helper" data-tds-energy-helper><summary>${esc(copy.title)}</summary><p>${esc(copy.instructions)}</p><p>${esc(copy.example)}</p><div data-tds-energy-controls hidden>${fields}<div class="actions"><button type="button" data-tds-energy-use="sessionAKwh">${esc(copy.useA)}</button><button type="button" data-tds-energy-use="sessionBKwh">${esc(copy.useB)}</button></div><p role="status" aria-live="polite" data-tds-energy-status></p></div></details>`;
}

function laundryReview(copy) {
  return `<section class="work-panel tds-suite-review" data-tds-review hidden aria-labelledby="tds-review-heading"><h2 id="tds-review-heading">${esc(copy.title)}</h2><p>${esc(copy.benefit)}</p><p data-tds-review-terms hidden>${esc(copy.terms)}</p><button type="button" data-tds-review-open>${esc(copy.existing)}</button><p role="status" aria-live="polite" data-tds-review-status></p></section>`;
}

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
    const advice = toolRoute(lang,tool) === germanMeterPath ? germanMeterAdvice : null;
    const energy = tool.name === UK_LAUNDRY_TOOL.name ? ukLaundryEnergy[lang] : null;
    const review = energy ? ukLaundryReview[lang] : null;
    const title = advice?.title ?? nameFor(lang,tool);
    const description = advice?.description ?? lc(lang,tool.description);
    const shoppingPath = REGIONAL_GUIDE_PATHS[tool.slug];
    const metadata = { name:tool.name, locale:lang, inputSchema:tool.inputSchema, example:examplesFor(lang,tool), ui:energy ? {...c, energy, review} : c };
    const evidence = evidenceFor(lang,tool);
    const checked = evidence?.checked ? ` <time datetime="${esc(evidence.checked)}">${esc(evidence.checked)}</time>` : '';
    const source = evidence?.url?.startsWith('https://') ? `<section class="section"><h2>${esc(c.evidence)}</h2><p><a href="${esc(evidence.url)}" rel="noopener noreferrer">${esc(new URL(evidence.url).hostname)}</a>${checked}</p><p>${esc(c.scope)}</p></section>` : '';
    const category = { href:categoryRoute(lang,tool.category), label:categoryLabel(lang,tool.category) };
    const checklistLink = advice ? `<p><a href="#messplan">${esc(advice.checklist)}</a></p>` : '';
    const checklist = advice ? `<section class="section" id="messplan" aria-labelledby="messplan-heading"><h2 id="messplan-heading">${esc(advice.checklist)}</h2><ol>${advice.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol><ul>${advice.sources.map(([label, url]) => `<li><a href="${esc(url)}" rel="noopener noreferrer">${esc(label)}</a></li>`).join('')}</ul><p class="tds-suite-meta">${updateLabel[lang]} <time datetime="${advice.updated}">${advice.updated}</time></p></section>` : '';
    const content = `${crumb(lang,title,category)}<header class="tds-suite-head"${advice ? ' id="messgeraet-ausleihen-oder-kaufen"' : ''}><div><h1>${esc(title)}</h1><p>${esc(description)}</p>${checklistLink}</div><p class="tds-suite-note">${esc(c.local)}</p></header><div class="tds-suite-workspace"><section class="work-panel" aria-labelledby="tds-tool-heading"><h2 id="tds-tool-heading">${esc(c.input)}</h2>${energy ? energyHelper(energy, tool.inputSchema.properties.sessionAKwh) : ''}<p class="tds-suite-meta">${esc(c.required)}</p><form data-tds-tool>${Object.entries(tool.inputSchema.properties).map(([key,schema]) => inputField(lang,tool,key,schema)).join('')}<div class="actions"><button class="primary" type="submit" disabled>${esc(c.execute)}</button><button type="button" data-tds-example disabled>${esc(c.examples)}</button></div></form><noscript><p>${esc(c.noscript)}</p></noscript><p class="tds-suite-meta">${esc(review?.privacy ?? c.privacy)}</p><p role="status" aria-live="polite" data-tds-status></p></section><section class="work-panel tds-suite-result" aria-labelledby="tds-result-heading"><h2 id="tds-result-heading">${esc(c.result)}</h2><p class="tds-suite-result-summary" data-tds-summary hidden></p>${shoppingPath ? '<p><a class="button primary" data-tds-buyer-guide hidden></a></p>' : ''}<pre data-tds-result tabindex="0"></pre><div class="actions"><button type="button" data-tds-copy disabled>${esc(c.copy)}</button><button type="button" data-tds-export disabled>${esc(c.download)}</button></div></section></div>${review ? laundryReview(review) : ''}${checklist}${source}${mcpDocs(lang,tool)}<script type="application/json" data-tds-config>${json(metadata)}</script>`;
    const url = origin + toolRoute(lang,tool);
    const dateModified = energy ? ukLaundryUpdated : advice?.updated;
    const graph = [{'@type':'WebApplication', name:title, description, url, inLanguage:locales[lang].tag, applicationCategory:'UtilitiesApplication', operatingSystem:'Web browser', browserRequirements:'Requires JavaScript', isAccessibleForFree:true, offers:{'@type':'Offer', price:0, priceCurrency:'USD'}, ...(dateModified ? {dateModified} : {})}];
    const machine = page({lang,slug,title,description,content,graph,discover:featured(tool),shoppingPath});
    const checklistText = advice ? `## ${advice.checklist}\n\n${advice.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n${advice.sources.map(([label, url]) => `${label} ${url}`).join('\n')}\n${updateLabel[lang]} ${advice.updated}\n\n` : '';
    const energyText = energy ? `## ${energy.title}\n\n${energy.instructions}\n\n${energy.example}\n\n` : '';
    write(machine.slice(1), `# ${title}\n\n${url}\n\n${description}\n\n${checklistText}${energyText}${review?.privacy ?? c.privacy}\n\n${review ? `## ${review.title}\n\n${review.benefit}\n\n${review.terms}\n\n` : ''}${c.endpoint} ${endpoint}\nMCP tool name ${tool.name}\n\n${JSON.stringify(tool.inputSchema,null,2)}\n`+(evidence?.url?`\n${c.evidence} ${evidence.url} ${updateLabel[lang]} ${evidence.checked}\n`:''));
  }
}

const sitemapFile = path.join(output,'sitemap.xml');
let xml = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile,'utf8') : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
xml = xml.replace(/<url>\s*<loc>https:\/\/thedollscout\.com\/(?:de\/|zh\/)?ai-tools(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>\n?/g,'');
const regionalIndexable = [...new Set([
  ...Object.keys(locales).flatMap(lang => [
    origin + route(lang,slugPath()),
    ...REGIONAL_TDS_TOOLS.map(tool => origin + toolRoute(lang,tool)),
    ...REGIONAL_TDS_TOOLS.map(tool => origin + categoryRoute(lang,tool.category)),
  ]),
  ...Object.values(REGIONAL_GUIDE_PATHS).map(path => origin + path),
  origin + '/',
])];
const touched = new Set(regionalIndexable);
const ukLaundryUrls = new Set(Object.keys(locales).map(lang => origin + toolRoute(lang, UK_LAUNDRY_TOOL)));
const lastmod = url => url === origin + germanMeterPath ? germanMeterAdvice.updated
  : ukLaundryUrls.has(url) ? ukLaundryUpdated : touched.has(url) ? updated : initialRelease;
xml = xml.replace('</urlset>',discovery.map(url=>`<url><loc>${url}</loc><lastmod>${lastmod(url)}</lastmod></url>`).join('\n')+'\n</urlset>');
write('sitemap.xml',xml);
const discoveryBody = '\n<!-- tds-suite:start -->\n## TDS AI and MCP tools\n\n' +
  Object.entries(words).map(([lang,c]) => `- ${c.hub} ${origin+route(lang,slugPath())} · ${c.catalogData} ${origin+datasetUrl(lang)}`).join('\n') +
  Object.keys(locales).flatMap(lang=>REGIONAL_TDS_TOOLS.map(tool=>`\n- ${nameFor(lang,tool)} ${origin+toolRoute(lang,tool)}`)).join('') +
  `\n- MCP endpoint ${endpoint}\n- ${TDS_TOOLS.length} executable tool definitions. Browser execution processes form input on the user's device. MCP execution processes request arguments on the server.\n<!-- tds-suite:end -->\n`;
for (const filename of ['llms.txt','llms-full.txt']) {
  const file = path.join(output,filename);
  const before = fs.existsSync(file) ? fs.readFileSync(file,'utf8') : '# The Doll Scout\n';
  write(filename,before.replace(/\n?<!-- tds-suite:start -->[\s\S]*?<!-- tds-suite:end -->\n?/g,'') + discoveryBody);
}
write('collector-assets/tds-suite/manifest.json',json({updated,count:TDS_TOOLS.length,indexable:discovery,regionalIndexable,pages:allRecords})+'\n');

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
