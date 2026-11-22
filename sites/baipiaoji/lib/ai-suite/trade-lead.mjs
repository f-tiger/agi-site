import {readCsv} from './csv-input.mjs';

const requiredFields = ['company', 'country', 'product'];
const fields = [...requiredFields, 'signal', 'source_url', 'source_reviewed', 'requested_units', 'response_by'];
const signals = ['inquiry', 'open_tender', 'directory', 'unknown'];
const sourceStates = ['reviewed_by_user', 'awaiting_review', 'no_source'];
const priorities = ['follow_up', 'verify', 'low_fit'];
const reasonCodes = [
  'market_match', 'market_mismatch', 'product_match', 'product_mismatch',
  'purchase_signal', 'directory_listing', 'purchase_signal_missing',
  'reviewed_by_user', 'awaiting_review', 'no_source',
  'minimum_met', 'below_minimum', 'quantity_missing',
  'response_due_soon', 'response_due_later', 'response_date_passed', 'response_date_missing',
  'duplicate_details_differ',
];
const maxLeads = 100;
const maxUnits = 1_000_000_000;
const dayMs = 86_400_000;
const normalize = text => text.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

function textField(value, name, maxLength) {
  if (typeof value !== 'string' || !value.trim() || Array.from(value).length > maxLength || /[\u0000-\u001F\u007F]/u.test(value)) {
    throw Error(name + ' must be nonempty text of up to ' + maxLength + ' characters.');
  }
  return value.trim();
}

function countryCode(value, name) {
  const text = textField(value, name, 2);
  if (!/^[A-Za-z]{2}$/.test(text)) throw Error(name + ' must be a two-letter country code.');
  return text.toUpperCase();
}

function calendarDate(value, name) {
  const text = textField(value, name, 10);
  const time = Date.parse(text + 'T00:00:00.000Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== text) {
    throw Error(name + ' must be a valid date in YYYY-MM-DD format.');
  }
  return {text, time};
}

function requestedUnits(value) {
  if (value == null || value === '') return null;
  const validType = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  const units = validType ? Number(value) : NaN;
  if (!Number.isSafeInteger(units) || units < 1 || units > maxUnits) {
    throw Error('requested_units must be a positive whole number of up to ' + maxUnits + '.');
  }
  return units;
}

function sourceDetails(raw) {
  const review = raw.source_reviewed;
  if (review != null && !['', 'true', 'false', true, false].includes(review)) {
    throw Error('source_reviewed must be true, false, or blank.');
  }
  const reviewed = review === true || review === 'true';
  let sourceUrl = null;
  if (raw.source_url != null && raw.source_url !== '') {
    const text = textField(raw.source_url, 'source_url', 500);
    let url;
    const invalidUrl = 'source_url must use a company or directory domain, starting with http:// or https://.';
    try { url = new URL(text); } catch { throw Error(invalidUrl); }
    const host = url.hostname.replace(/\.$/, '');
    const localHost = !host.includes('.') || /\.(?:localhost|local|internal|home\.arpa)$/.test(host);
    const ipAddress = /^\d+(?:\.\d+){3}$/.test(host) || host.startsWith('[');
    if (!/^https?:\/\//i.test(text) || url.username || url.password || localHost || ipAddress || url.href.length > 500) {
      throw Error(invalidUrl);
    }
    sourceUrl = url.href;
  }
  if (reviewed && !sourceUrl) throw Error('source_reviewed requires a source_url.');
  return {
    sourceUrl,
    sourceReview: reviewed ? 'reviewed_by_user' : (sourceUrl ? 'awaiting_review' : 'no_source'),
  };
}

function parseRows(input) {
  const data = input.trim();
  if (data.startsWith('[') || data.startsWith('{')) {
    let records;
    try { records = JSON.parse(data); } catch { throw Error('Leads contain invalid JSON.'); }
    if (!Array.isArray(records)) throw Error('Lead JSON must be an array of company records.');
    return records;
  }
  // Keep quoting and value whitespace for the shared strict parser.
  const {columns, rows} = readCsv(input);
  if (requiredFields.some(field => !columns.includes(field)) || columns.some(field => !fields.includes(field))) {
    throw Error('CSV header must include company,country,product. Optional fields: signal,source_url,source_reviewed,requested_units,response_by.');
  }
  return rows.map(row => Object.fromEntries(columns.map((field, index) => [field, row[index].trim()])));
}

function rankRow(raw, inputRow, target) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !fields.includes(key))) {
    throw Error('Use company records with only the fields shown in the CSV example.');
  }
  const company = textField(raw.company, 'company', 160);
  const country = countryCode(raw.country, 'country');
  const product = textField(raw.product, 'product', 100);
  const signal = raw.signal == null || raw.signal === '' ? 'unknown' : raw.signal;
  if (!signals.includes(signal)) throw Error('signal must be inquiry, open_tender, directory, unknown, or blank.');
  const {sourceUrl, sourceReview} = sourceDetails(raw);
  const quantity = requestedUnits(raw.requested_units);
  const date = raw.response_by == null || raw.response_by === '' ? null : calendarDate(raw.response_by, 'response_by');
  const days = date === null ? null : (date.time - target.asOf.time) / dayMs;

  const marketMatch = country === target.country;
  const productMatch = normalize(product) === target.product;
  const purchaseSignal = signal === 'inquiry' || signal === 'open_tender';
  const minimumMet = quantity !== null && quantity >= target.minimumUnits;
  const dueSoon = days !== null && days >= 0 && days <= 14;
  const reasons = [
    marketMatch ? 'market_match' : 'market_mismatch',
    productMatch ? 'product_match' : 'product_mismatch',
    purchaseSignal ? 'purchase_signal' : (signal === 'directory' ? 'directory_listing' : 'purchase_signal_missing'),
    sourceReview,
    quantity === null ? 'quantity_missing' : (minimumMet ? 'minimum_met' : 'below_minimum'),
    days === null ? 'response_date_missing' : (days < 0 ? 'response_date_passed' : (dueSoon ? 'response_due_soon' : 'response_due_later')),
  ];
  const score = 25 * Number(marketMatch) + 25 * Number(productMatch) + 20 * Number(purchaseSignal) +
    15 * Number(sourceReview === 'reviewed_by_user') + 10 * Number(minimumMet) + 5 * Number(dueSoon && purchaseSignal);
  const lowFit = !marketMatch || !productMatch || (quantity !== null && !minimumMet) || (days !== null && days < 0);
  const ready = purchaseSignal && sourceReview === 'reviewed_by_user' && minimumMet &&
    (signal !== 'open_tender' || date !== null);
  return {
    company, country, product, signal, sourceUrl, sourceReview, requestedUnits: quantity,
    responseBy: date?.text ?? null, priority: lowFit ? 'low_fit' : (ready ? 'follow_up' : 'verify'),
    inputRow, score, reasons,
  };
}

function compareLeads(a, b) {
  return priorities.indexOf(a.priority) - priorities.indexOf(b.priority) || b.score - a.score || a.inputRow - b.inputRow;
}

function retainLead(group) {
  const retained = group.toSorted(compareLeads)[0];
  const sameProduct = group.filter(record => normalize(record.product) === normalize(retained.product));
  const conflict = ['requestedUnits', 'responseBy'].some(field =>
    new Set(sameProduct.map(record => record[field]).filter(value => value !== null)).size > 1
  );
  return {
    ...retained,
    priority: conflict && retained.priority === 'follow_up' ? 'verify' : retained.priority,
    reasons: conflict ? [...retained.reasons, 'duplicate_details_differ'] : retained.reasons,
    sourceRows: group.map(record => record.inputRow),
  };
}

function prioritizeLeads({targetCountry, targetProduct, minimumUnits, asOf, leads}) {
  const target = {
    country: countryCode(targetCountry, 'targetCountry'),
    product: normalize(textField(targetProduct, 'targetProduct', 100)),
    minimumUnits,
    asOf: calendarDate(asOf, 'asOf'),
  };
  const input = parseRows(leads);
  if (!input.length || input.length > maxLeads) throw Error('Supply 1 to ' + maxLeads + ' lead records.');

  const groups = new Map();
  input.forEach((record, index) => {
    const rowNumber = index + 1;
    let lead;
    try { lead = rankRow(record, rowNumber, target); }
    catch (error) { throw Error('Lead ' + rowNumber + ': ' + error.message); }
    const key = normalize(lead.company) + '\0' + lead.country;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lead);
  });
  const ranked = [...groups.values()].map(retainLead).sort(compareLeads);
  const counts = Object.fromEntries(priorities.map(priority => [priority, 0]));
  ranked.forEach(lead => { counts[lead.priority] += 1; });
  return {
    asOf: target.asOf.text,
    inputRows: input.length,
    uniqueCompanies: ranked.length,
    duplicateRows: input.length - ranked.length,
    counts,
    ranked,
  };
}

const text = (key, zh, en, maxLength, multiline = false) =>
  ({key, label:{zh, en}, type:'string', maxLength, multiline});
const count = {type:'integer', minimum:0, maximum:maxLeads};
const rowIndex = {...count, minimum:1};
const dateString = {type:'string', pattern:'^\\d{4}-\\d{2}-\\d{2}$'};
const nullable = spec => ({anyOf:[spec, {type:'null'}]});
const rankProperties = {
  company:{type:'string', minLength:1, maxLength:160},
  country:{type:'string', pattern:'^[A-Z]{2}$'},
  product:{type:'string', minLength:1, maxLength:100},
  signal:{enum:signals},
  sourceUrl:nullable({type:'string', maxLength:500}),
  sourceReview:{enum:sourceStates},
  requestedUnits:nullable({type:'integer', minimum:1, maximum:maxUnits}),
  responseBy:nullable(dateString),
  priority:{enum:priorities},
  score:{type:'integer', minimum:0, maximum:100},
  reasons:{type:'array', items:{enum:reasonCodes}},
  inputRow:rowIndex,
  sourceRows:{type:'array', minItems:1, maxItems:maxLeads, items:rowIndex},
};

export const tools = [{
  id:'trade-lead-priority',
  title:{zh:'外贸买家线索排序', en:'Rank B2B export leads'},
  description:{
    zh:'导入公司线索 CSV 或 JSON，按目标市场、品类、采购信号、来源复核、数量和截止日期筛选，输出跟进顺序及待核验项。来源状态来自你的记录。',
    en:'Rank company leads from CSV or JSON by market, product, purchase signal, source review, quantity and deadline. Get a follow-up queue and see which details still need checking.',
  },
  searchAliases:['外贸找客源','出口销售线索','买家开发','进口商筛选','foreign trade lead qualification','export prospecting','importer list','buyer discovery'],
  inputs:[
    text('targetCountry', '目标国家或地区代码（如 DE）', 'Target country or region code (e.g. DE)', 2),
    text('targetProduct', '目标品类标签（与线索品类对应）', 'Target product label (match the lead records)', 100),
    {key:'minimumUnits', type:'integer', min:1, max:maxUnits, label:{zh:'最小订量（件）', en:'Minimum order quantity (units)'}},
    text('asOf', '评估日期（YYYY-MM-DD）', 'Assessment date (YYYY-MM-DD)', 10),
    text('leads', '公司线索 CSV 或 JSON（按示例表头，最多 100 条）', 'Company CSV or JSON leads (use the example field names, up to 100)', 24000, true),
  ],
  example:{
    targetCountry:'DE', targetProduct:'recycled mailers', minimumUnits:200, asOf:'2026-11-22',
    leads:[
      'company,country,product,signal,source_url,source_reviewed,requested_units,response_by',
      'Sample Buyer A,DE,recycled mailers,inquiry,https://buyer-a.example/rfq,true,300,2026-12-01',
      'sample buyer A,DE,recycled mailers,directory,https://buyer-a.example/catalog,false,,',
      'Sample Buyer B,DE,recycled mailers,directory,https://buyer-b.example/catalog,false,,',
      'Sample Buyer C,CA,recycled mailers,open_tender,https://buyer-c.example/tender,true,450,2026-11-30',
    ].join('\n'),
  },
  outputSchema:{
    type:'object', additionalProperties:false,
    required:['asOf','inputRows','uniqueCompanies','duplicateRows','counts','ranked'],
    properties:{
      asOf:dateString, inputRows:count, uniqueCompanies:count, duplicateRows:count,
      counts:{type:'object', additionalProperties:false, required:priorities, properties:Object.fromEntries(priorities.map(priority => [priority,count]))},
      ranked:{
        type:'array', maxItems:maxLeads,
        items:{type:'object', additionalProperties:false, required:Object.keys(rankProperties), properties:rankProperties},
      },
    },
  },
  run:prioritizeLeads,
}];
