// Stateless tasks over the published, source-linked named-series snapshot.
// No browser storage, network, clock, persistence or collection quantities here.
const LANGUAGES = new Set(['en', 'de', 'zh']);
const BRANDS = new Set(['smiski', 'sonny-angel']);
const copy = {
 en: {
  title: 'Collection checklist', owned: 'Marked owned', unmarked: 'Not marked owned',
  wanted: 'Explicitly wanted', unknownOwned: 'Unmatched owned input', unknownWanted: 'Unmatched wanted input',
  none: 'None supplied or matched.', source: 'Official source', checked: 'Source checked', modified: 'Catalog entry modified',
  missing: 'This series is not in the published TDS catalog. Search the available series first.',
  limits: [
   'Compared only with the named styles in this TDS catalog entry. This does not establish a complete official series, secret coverage or a completed collection.',
   'Not marked owned does not mean wanted. Wanted styles are included only when explicitly supplied.',
   'Names match after whitespace, Unicode canonical composition and case normalization only; no spelling guesses, translations or splitting of combined figures.',
   'Repeated input names are deduplicated, not treated as quantities or items offered for trade. An explicitly wanted style may also be marked owned.',
   'Only the supplied list was processed. No local collection was read or changed; no stock, price, authenticity or transaction was verified.'
  ]
 },
 de: {
  title: 'Sammlungscheckliste', owned: 'Als vorhanden angegeben', unmarked: 'Nicht als vorhanden angegeben',
  wanted: 'Ausdrücklich gewünscht', unknownOwned: 'Nicht zugeordnete Bestandsangaben', unknownWanted: 'Nicht zugeordnete Wünsche',
  none: 'Keine Angaben oder Treffer.', source: 'Offizielle Quelle', checked: 'Quelle geprüft', modified: 'Katalogeintrag geändert',
  missing: 'Diese Serie steht nicht im veröffentlichten TDS-Katalog. Zuerst die verfügbaren Serien suchen.',
  limits: [
   'Verglichen werden nur die benannten Figuren dieses TDS-Katalogeintrags. Das belegt weder eine vollständige offizielle Serie noch alle Secrets oder eine vollständige Sammlung.',
   'Nicht als vorhanden angegeben bedeutet nicht gewünscht. Wünsche werden nur aus ausdrücklichen Angaben übernommen.',
   'Abgeglichen werden nur normalisierte Leerzeichen, kanonische Unicode-Zusammensetzung und Groß-/Kleinschreibung; keine Tippfehlerkorrektur, Übersetzung oder Aufteilung kombinierter Figuren.',
   'Wiederholte Namen werden zusammengefasst, nicht als Stückzahlen oder Tauschangebote gewertet. Eine ausdrücklich gewünschte Figur kann auch als vorhanden angegeben sein.',
   'Nur die übergebene Liste wurde verarbeitet. Keine lokale Sammlung wurde gelesen oder verändert; Bestand, Preis, Echtheit und Handel wurden nicht überprüft.'
  ]
 },
 zh: {
  title: '收藏清单', owned: '已标记拥有', unmarked: '尚未标记拥有', wanted: '明确想要',
  unknownOwned: '未识别的已有款式', unknownWanted: '未识别的想要款式', none: '未提供或无匹配款式。',
  source: '官方来源', checked: '来源核对日期', modified: '目录条目修改日期',
  missing: '已发布的 TDS 目录中没有这个系列，请先搜索可用系列。',
  limits: [
   '仅对照此 TDS 目录条目中已列名的款式；不能据此断言官方系列或隐藏款收录完整，也不能证明已经集齐。',
   '尚未标记拥有不等于想买；只有主动提供的款式会列入明确想要。',
   '仅统一空白、Unicode 标准组合形式及大小写，不猜测错别字、不翻译别名、不拆分组合款。',
   '重复输入的名称只会去重，不代表藏品数量或愿意交换；明确想要的款式也可以是已标记拥有的款式。',
   '仅处理此次提供的清单，没有读取或修改本地收藏；没有核实库存、价格、真伪或交易。'
  ]
 }
};

function fail(message) { throw new RangeError(message); }
function object(value, allowed, required) {
 if (!value || typeof value !== 'object' || Array.isArray(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) fail('Arguments must be a plain object.');
 if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) fail('Use only the documented required and optional arguments.');
}
function text(value, name, max = 120) {
 if (typeof value !== 'string' || value.length > max) fail(`${name} must contain 1 to ${max} characters.`);
 // Permit ordinary input spacing, but reject invisible and directional controls.
 if (/[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]/u.test(value.replace(/[\t\r\n]/g, ' '))) fail(`${name} contains unsupported control or invisible characters.`);
 const clean = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
 if (!clean || clean.length > max) fail(`${name} must contain 1 to ${max} characters.`);
 return clean;
}
const key = value => value.toLowerCase();
function language(value = 'en') { if (!LANGUAGES.has(value)) fail('language must be en, de or zh.'); return value; }
function list(value, name) {
 if (!Array.isArray(value) || value.length > 100) fail(`${name} must be an array of at most 100 names.`);
 const unique = new Map(); let duplicates = 0;
 // Iteration, unlike map(), also checks sparse-array holes.
 for (const valueItem of value) { const clean = text(valueItem, name); const id = key(clean); if (unique.has(id)) duplicates++; else unique.set(id, clean); }
 return {names: [...unique.values()], duplicates};
}
function date(value) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Published catalog dates are invalid.');
 const parsed = new Date(value + 'T12:00:00Z');
 if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('Published catalog dates are invalid.');
 return value;
}
function snapshot(catalog) {
 if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog) || !Array.isArray(catalog.series) || catalog.series.length > 300) fail('Published catalog is unavailable or invalid.');
 const scope = text(catalog.scope, 'catalog scope', 1000), ids = new Set();
 const series = Array.from(catalog.series, record => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail('Published series is invalid.');
  const seriesId = text(record.id, 'published seriesId');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seriesId) || ids.has(seriesId) || !BRANDS.has(record.brand)) fail('Published series identity is invalid.');
  ids.add(seriesId);
  if (!Array.isArray(record.names) || !record.names.length || record.names.length > 1000) fail('Published style names are invalid.');
  const styles = Array.from(record.names, value => text(value, 'published style'));
  if (new Set(styles.map(key)).size !== styles.length) fail('Published style names are ambiguous.');
  let source;
  try { source = new URL(record.source); } catch { fail('Published source is invalid.'); }
  if (typeof record.source !== 'string' || record.source.length > 2048 || /\s/.test(record.source) || source.protocol !== 'https:' || source.username || source.password) fail('Published source must be a public HTTPS URL.');
  return {seriesId, brand: record.brand, title: text(record.title, 'published title', 240), styles,
   source: source.href, checked: date(record.checked), modified: date(record.modified), catalogScope: scope};
 });
 return {scope, series};
}
function markdownText(value) {
 // Every supplied name stays literal, including HTML, links and task-list syntax.
 return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/[\\`*_{}\[\]()#+\-.!|~:\/=]/g, '\\$&');
}
function section(title, values, c) { return `## ${title}\n\n${values.length ? values.map(value => '- ' + markdownText(value)).join('\n') : c.none}`; }

export function searchCollectionSeries(catalog, args) {
 object(args, ['query', 'brand', 'limit', 'language'], ['query']);
 const query = text(args.query, 'query'), lang = language(args.language), limit = args.limit === undefined ? 5 : args.limit;
 if (!Number.isInteger(limit) || limit < 1 || limit > 10) fail('limit must be an integer from 1 to 10.');
 if (args.brand !== undefined && !BRANDS.has(args.brand)) fail('brand must be smiski or sonny-angel.');
 const data = snapshot(catalog), terms = key(query).split(' ');
 const matches = data.series.filter(s => (!args.brand || s.brand === args.brand) && terms.every(term => key([s.seriesId, s.title, ...s.styles].join(' ')).includes(term)));
 return {found: matches.length > 0, query, language: lang, limit, totalMatches: matches.length,
  series: matches.slice(0, limit), catalogScope: data.scope, limitations: [...copy[lang].limits]};
}

export function prepareCollectionChecklist(catalog, args) {
 object(args, ['seriesId', 'owned', 'wanted', 'language'], ['seriesId', 'owned']);
 const requestedId = key(text(args.seriesId, 'seriesId')), lang = language(args.language), c = copy[lang];
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedId)) fail('seriesId must be a catalog identifier returned by search_collection_series.');
 const own = list(args.owned, 'owned'), wish = list(args.wanted === undefined ? [] : args.wanted, 'wanted'), data = snapshot(catalog);
 const series = data.series.find(s => s.seriesId === requestedId);
 if (!series) return {found: false, reason: 'series_not_found', seriesId: requestedId, language: lang, catalogScope: data.scope,
  limitations: [...c.limits], markdown: c.missing};
 const canonical = new Map(series.styles.map(name => [key(name), name]));
 const ownedKeys = new Set(own.names.map(key)), wantedKeys = new Set(wish.names.map(key));
 const owned = series.styles.filter(name => ownedKeys.has(key(name)));
 const notMarkedOwned = series.styles.filter(name => !ownedKeys.has(key(name)));
 const wanted = series.styles.filter(name => wantedKeys.has(key(name)));
 const unmatchedOwned = own.names.filter(name => !canonical.has(key(name)));
 const unmatchedWanted = wish.names.filter(name => !canonical.has(key(name)));
 const markdown = [`# ${c.title}: ${markdownText(series.title)}`,
  `${c.source}: <${series.source}>\n\n${c.checked}: ${series.checked}\n\n${c.modified}: ${series.modified}`,
  markdownText(series.catalogScope), ...c.limits,
  section(c.owned, owned, c), section(c.unmarked, notMarkedOwned, c), section(c.wanted, wanted, c),
  section(c.unknownOwned, unmatchedOwned, c), section(c.unknownWanted, unmatchedWanted, c)].join('\n\n');
 return {found: true, ...series, language: lang, comparisonScope: 'published_catalog_names_only', owned, notMarkedOwned, wanted,
  unmatchedOwned, unmatchedWanted, duplicateInputs: {owned: own.duplicates, wanted: wish.duplicates},
  counts: {cataloguedStyles: series.styles.length, ownedStyles: owned.length, notMarkedOwnedStyles: notMarkedOwned.length,
   wantedStyles: wanted.length, unmatchedOwned: unmatchedOwned.length, unmatchedWanted: unmatchedWanted.length},
  markdown, limitations: [...c.limits]};
}
