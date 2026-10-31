// Stateless event preparation. No network, storage, identity, contact or clock access.
export const EVENT_PAYLOAD_VERSION = 1;
export const MAX_EVENT_PAYLOAD_BYTES = 12000;
export const MAX_EVENT_FRAGMENT_LENGTH = 16020;
const ORIGIN = 'https://thedollscout.com';
const LANGUAGES = new Set(['en', 'de', 'zh']);
const MODES = new Set(['peer', 'store', 'display']);
const FIELDS = ['kind', 'eventName', 'eventDate', 'exchangeMode', 'rulesUrl', 'note', 'wanted', 'offered', 'language'];
const REQUIRED = ['kind', 'eventName', 'eventDate', 'exchangeMode'];
const copy = {
 en: {
  event: 'Event preparation template', card: 'My event preparation card', date: 'Date supplied by the creator', rules: 'Creator-supplied rules link', note: 'Event rules summary supplied by the creator', wanted: 'Explicitly wanted', offered: 'Explicitly offered for exchange', unknownWanted: 'Unmatched wanted names', unknownOffered: 'Unmatched offered names', none: 'None supplied.', source: 'Catalog sources', checked: 'checked', expired: 'The supplied event date is in the past. This is a historical snapshot; update the date before sharing.',
  modes: {peer:'Participant-to-participant exchange, subject to the supplied event rules.', store:'Exchange with the store only; this card does not invite participant-to-participant exchange.', display:'Display / preparation only; no exchange offer is accepted in this mode.'},
  limits: [
   'The event name, date, mode, note and rules link were supplied by the creator. TDS has not verified the organizer, event, permission or rules. Confirm with the actual organizer.',
   'Wanted and offered items come only from explicit inputs. Missing or duplicate collection items are never inferred as wanted or offered. Repeated names are not quantities.',
   'Only exact published names or unambiguous exact figure names are matched after whitespace, Unicode composition and case normalization. Unknown or ambiguous names remain unresolved; catalog coverage may omit secrets and variants.',
   'This is a preparation card, not proof of ownership, authenticity, matching, payment or completed exchange. No marketplace or messaging service is provided.',
   'The share link contains readable, editable data. Anyone with it can read, change or forward it; previously shared copies cannot be revoked here. Do not include private contact information.',
   'No browser collection is read or changed. No event or card is published automatically. Check the event and community rules before sharing.'
  ]
 },
 de: {
  event:'Vorlage zur Veranstaltungsvorbereitung', card:'Meine Veranstaltungskarte', date:'Vom Ersteller angegebenes Datum', rules:'Vom Ersteller angegebener Regellink', note:'Veranstaltungshinweis des Erstellers', wanted:'Ausdrücklich gesucht', offered:'Ausdrücklich zum Tausch angeboten', unknownWanted:'Nicht zugeordnete Suchangaben', unknownOffered:'Nicht zugeordnete Tauschangebote', none:'Keine Angaben.', source:'Katalogquellen', checked:'geprüft', expired:'Das angegebene Veranstaltungsdatum liegt in der Vergangenheit. Dies ist eine historische Momentaufnahme; vor dem Teilen das Datum aktualisieren.',
  modes:{peer:'Tausch zwischen Teilnehmern gemäß den angegebenen Veranstaltungsregeln.',store:'Nur Tausch mit dem Geschäft; diese Karte lädt nicht zum Tausch zwischen Teilnehmern ein.',display:'Nur Präsentation / Vorbereitung; in diesem Modus werden keine Tauschangebote angenommen.'},
  limits:[
   'Name, Datum, Modus, Hinweis und Regellink stammen vom Ersteller. TDS hat Veranstalter, Veranstaltung, Erlaubnis und Regeln nicht geprüft. Beim tatsächlichen Veranstalter bestätigen.',
   'Gesuchte und angebotene Figuren stammen nur aus ausdrücklichen Angaben. Fehlende oder doppelte Sammlungsstücke werden nie als Wunsch oder Angebot interpretiert. Wiederholte Namen sind keine Stückzahlen.',
   'Nur genaue veröffentlichte Namen oder eindeutige Figurennamen werden nach Normalisierung von Leerzeichen, Unicode-Zusammensetzung und Groß-/Kleinschreibung zugeordnet. Unbekannte oder mehrdeutige Namen bleiben offen; Secrets und Varianten können fehlen.',
   'Dies ist eine Vorbereitungskarte, kein Nachweis für Besitz, Echtheit, Vermittlung, Zahlung oder abgeschlossenen Tausch. Kein Marktplatz oder Nachrichtendienst wird bereitgestellt.',
   'Der Link enthält lesbare, veränderbare Daten. Jeder mit dem Link kann sie lesen, ändern oder weiterleiten; bereits geteilte Kopien lassen sich hier nicht widerrufen. Keine privaten Kontaktdaten eingeben.',
   'Keine Browsersammlung wird gelesen oder geändert. Veranstaltung und Karte werden nicht automatisch veröffentlicht. Vor dem Teilen Veranstaltungs- und Community-Regeln prüfen.'
  ]
 },
 zh: {
  event:'活动准备模板', card:'我的活动准备卡', date:'创建者填写的日期', rules:'创建者提供的规则链接', note:'创建者填写的活动说明', wanted:'明确想要', offered:'明确愿意交换', unknownWanted:'未识别的想要款式', unknownOffered:'未识别的交换款式', none:'未提供。', source:'目录来源', checked:'核对日期', expired:'所填活动日期已经过去。这是历史快照，请更新日期后再分享。',
  modes:{peer:'参与者之间交换，以创建者提供的活动规则为准。',store:'仅与店方交换，本卡不邀请参与者之间互换。',display:'仅展示／准备，此模式不接受交换物品。'},
  limits:[
   '活动名称、日期、模式、备注和规则链接由创建者填写。TDS 未核实组织者、活动、授权或规则，请向实际组织者确认。',
   '想要与愿意交换的物品只来自明确输入，不会由缺款或重复藏品推导。重复名称不代表数量。',
   '仅统一空白、Unicode 标准组合形式和大小写后匹配完整目录名称，或唯一的准确款式名。未知或有歧义的名称保留待核对；目录可能缺少隐藏款和其他版本。',
   '本卡仅用于准备，不证明持有、真伪、匹配、付款或交换完成，也不提供交易市场或消息服务。',
   '分享链接包含可读、可修改的数据。拿到链接的人可以查看、修改和转发；已分享副本无法在这里撤回。请勿填写私人联系方式。',
   '没有读取或修改浏览器收藏，也不会自动发布活动或卡片。分享前请核对活动与社区规则。'
  ]
 }
};

function fail(message) { throw new RangeError(message); }
function object(value, allowed, required = []) {
 if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('Use a plain object.');
 if (Reflect.ownKeys(value).some(k => typeof k !== 'string' || !allowed.includes(k)) || required.some(k => !Object.hasOwn(value, k))) fail('Use only documented fields and include all required fields.');
}
function text(value, field, max, optional = false) {
 if (optional && value === undefined) return '';
 if (typeof value !== 'string' || [...value].length > max) fail(`${field} must be text of at most ${max} characters.`);
 if (/[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]/u.test(value.replace(/[\t\r\n]/g, ' '))) fail(`${field} contains unsupported controls or invisible characters.`);
 const clean = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
 if ((!optional && !clean) || [...clean].length > max) fail(`${field} must contain ${optional ? '0' : '1'} to ${max} characters.`);
 return clean;
}
const key = value => value.toLowerCase();
function date(value, field) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${field} must be YYYY-MM-DD.`);
 const parsed = new Date(value + 'T12:00:00Z');
 if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(`${field} is not a calendar date.`);
 return value;
}
function url(value, field, max = 500, optional = false) {
 if (optional && (value === undefined || value === '')) return '';
 const raw = text(value, field, max);
 if (/\s|\\/.test(raw)) fail(`${field} must be a public HTTPS URL without credentials.`);
 let parsed; try { parsed = new URL(raw); } catch { fail(`${field} is not a valid URL.`); }
 const host = parsed.hostname.replace(/\.$/, '');
 if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local') || /^[\d.]+$/.test(host) || host.includes(':') || parsed.href.length > max) fail(`${field} must be a public HTTPS URL without credentials.`);
 return parsed.href;
}
function list(value, field) {
 if (value === undefined) value = [];
 if (!Array.isArray(value) || value.length > 8) fail(`${field} must contain at most eight names.`);
 const unique = new Map(); let duplicates = 0;
 for (const item of value) { const name = text(item, field, 120), id = key(name); if (unique.has(id)) duplicates++; else unique.set(id, name); }
 return {names:[...unique.values()], duplicates};
}
function normalize(value, withVersion, complete = true) {
 object(value, withVersion ? ['v', ...FIELDS] : FIELDS, withVersion ? ['v', ...REQUIRED] : REQUIRED);
 if (withVersion && value.v !== EVENT_PAYLOAD_VERSION) fail('Unsupported event payload version.');
 if (!['event', 'card'].includes(value.kind)) fail('kind must be event or card.');
 if (!MODES.has(value.exchangeMode)) fail('exchangeMode must be peer, store or display.');
 const language = value.language === undefined ? 'en' : value.language;
 if (!LANGUAGES.has(language)) fail('language must be en, de or zh.');
 const wanted = list(value.wanted, 'wanted'), offered = list(value.offered, 'offered');
 if (value.kind === 'event' && (wanted.names.length || offered.names.length)) fail('An organizer template cannot include participant lists.');
 if (complete && value.kind === 'card' && !wanted.names.length && !offered.names.length) fail('A personal card needs an explicit wanted or offered item.');
 if (value.exchangeMode === 'display' && offered.names.length) fail('Display-only events cannot include exchange offers.');
 const payload = {v:EVENT_PAYLOAD_VERSION, kind:value.kind, eventName:text(value.eventName, 'eventName', 80), eventDate:date(value.eventDate, 'eventDate'), exchangeMode:value.exchangeMode,
  rulesUrl:url(value.rulesUrl, 'rulesUrl', 500, true), note:text(value.note, 'note', 240, true), wanted:wanted.names, offered:offered.names, language};
 return {payload, duplicates:{wanted:wanted.duplicates, offered:offered.duplicates}};
}
function serialized(payload) {
 const raw = JSON.stringify(payload), bytes = new TextEncoder().encode(raw);
 if (bytes.length > MAX_EVENT_PAYLOAD_BYTES) fail('The event payload is too large to share.');
 return {raw, bytes};
}
function b64url(bytes) {
 let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// Encodes a snapshot, not a secret, signature, database record or revocable link.
export function encodeEventPayload(value) {
 const {payload} = normalize(value, true), fragment = '#event=' + b64url(serialized(payload).bytes);
 if (fragment.length > MAX_EVENT_FRAGMENT_LENGTH) fail('The event fragment is too large.');
 return fragment;
}
export function decodeEventPayload(fragment) {
 if (typeof fragment !== 'string' || fragment.length > MAX_EVENT_FRAGMENT_LENGTH || !/^#event=[A-Za-z0-9_-]+$/.test(fragment)) fail('Invalid event fragment.');
 const encoded = fragment.slice(7);
 if (encoded.length % 4 === 1) fail('Invalid event encoding.');
 let bytes;
 try { const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4)); bytes = Uint8Array.from(binary, c => c.charCodeAt(0)); } catch { fail('Invalid event encoding.'); }
 if (bytes.length > MAX_EVENT_PAYLOAD_BYTES || b64url(bytes) !== encoded) fail('Invalid or oversized event encoding.');
 let parsed;
 try { parsed = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes)); } catch { fail('Invalid event JSON.'); }
 return normalize(parsed, true).payload;
}
export function eventShareUrl(payload, lang = payload?.language || 'en') {
 if (!LANGUAGES.has(lang)) fail('language must be en, de or zh.');
 return ORIGIN + (lang === 'en' ? '' : '/' + lang) + '/collecting/event-kit' + encodeEventPayload(payload);
}
export function makeParticipantPayload(value) {
 const {payload} = normalize(value, true);
 return {...payload, kind:'card', wanted:[], offered:[]};
}

function catalogEntries(catalog) {
 if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog) || !Array.isArray(catalog.series) || catalog.series.length > 300) fail('Published catalog is unavailable or invalid.');
 const scope = text(catalog.scope, 'catalog scope', 1000), ids = new Set(), entries = [];
 for (const series of catalog.series) {
  if (!series || typeof series !== 'object' || Array.isArray(series)) fail('Invalid published series.');
  const seriesId = text(series.id, 'published seriesId', 120), title = text(series.title, 'published title', 240);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seriesId) || ids.has(seriesId)) fail('Invalid published series identity.'); ids.add(seriesId);
  if (!Array.isArray(series.names) || !series.names.length || series.names.length > 1000) fail('Invalid published figure names.');
  const source = url(series.source, 'published source', 2048), checked = date(series.checked, 'published check date'), names = new Set();
  for (const value of series.names) {
   const style = text(value, 'published style', 120), id = key(style); if (names.has(id)) fail('Ambiguous published figure names.'); names.add(id);
   entries.push({label:title + ' / ' + style, seriesId, title, style, source, checked});
  }
 }
 return {scope, entries};
}
function resolve(names, entries) {
 const matches = [], unmatched = [], labels = [], seen = new Set(); let duplicates = 0;
 for (const input of names) {
  const full = entries.filter(entry => key(entry.label) === key(input));
  const hits = full.length ? full : entries.filter(entry => key(entry.style) === key(input));
  if (hits.length === 1) { const entry = hits[0], identity = entry.seriesId + '\n' + key(entry.style); if (seen.has(identity)) { duplicates++; continue; } seen.add(identity); labels.push(entry.label); matches.push({input, ...entry}); }
  else { labels.push(input); unmatched.push(input); }
 }
 return {labels, matches, unmatched, duplicates};
}
function markdownText(value) {
 return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+\-.!|~:\/=]/g, '\\$&');
}
const section = (title, names, empty) => `## ${title}\n\n${names.length ? names.map(name => '- ' + markdownText(name)).join('\n') : empty}`;

export function prepareEventCard(catalog, args, options) {
 object(options, ['today'], ['today']); const today = date(options.today, 'today');
 const {payload, duplicates} = normalize(args, false), c = copy[payload.language], data = catalogEntries(catalog);
 const wanted = resolve(payload.wanted, data.entries), offered = resolve(payload.offered, data.entries);
 const sources = [...new Map([...wanted.matches, ...offered.matches].map(item => [item.seriesId, {seriesId:item.seriesId, title:item.title, source:item.source, checked:item.checked}])).values()];
 const expired = payload.eventDate < today;
 // Keep the normalized user inputs in the payload: a future catalog update must
 // not silently rewrite the snapshot or turn someone's card into another person's.
 const markdown = [`# ${payload.kind === 'event' ? c.event : c.card}: ${markdownText(payload.eventName)}`,
  `${c.date}: ${payload.eventDate}`, c.modes[payload.exchangeMode], ...(expired ? [c.expired] : []),
  ...(payload.rulesUrl ? [`${c.rules}: <${payload.rulesUrl}>`] : []), ...(payload.note ? [`${c.note}: ${markdownText(payload.note)}`] : []),
  section(c.wanted, wanted.labels, c.none), section(c.offered, offered.labels, c.none), section(c.unknownWanted, wanted.unmatched, c.none), section(c.unknownOffered, offered.unmatched, c.none),
  `## ${c.source}\n\n${sources.length ? sources.map(s => `- ${markdownText(s.title)}: <${s.source}> (${c.checked}: ${s.checked})`).join('\n') : c.none}`,
  markdownText(data.scope), ...c.limits].join('\n\n');
 return {found:true, kind:payload.kind, language:payload.language, event:{name:payload.eventName, date:payload.eventDate, exchangeMode:payload.exchangeMode, rulesUrl:payload.rulesUrl, note:payload.note, unverified:true},
  expired, wanted:wanted.labels, offered:offered.labels, unmatchedWanted:wanted.unmatched, unmatchedOffered:offered.unmatched,
  matches:{wanted:wanted.matches, offered:offered.matches}, sources, catalogScope:data.scope, duplicateInputs:{wanted:duplicates.wanted+wanted.duplicates, offered:duplicates.offered+offered.duplicates},
  payload, markdown, limitations:[...c.limits], shareUrl:expired ? null : eventShareUrl(payload)};
}
