import {evaluateTool, inputLimits, tradeGroups} from './trade-workbench/engine.mjs';

export const TRADE_MCP_SERVER_NAME = 'io.github.f-tiger/bpj-trade-tools';
export const TRADE_MCP_VERSION = '1.0.0';
export const TRADE_MCP_PROTOCOLS = Object.freeze(['2025-11-25', '2025-06-18', '2025-03-26']);
export const TRADE_MCP_DOCS = 'https://baipiaoji.com/en/studio/trade-tools/mcp/';

const lang = {type:'string', enum:['zh','en'], description:'Output language (default: en).'};
const id = {type:'string', pattern:'^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength:100, description:'Exact ID returned by list_trade_tools.'};
const query = {type:'string', maxLength:100, description:'Find tools by name, purpose, or input label in Chinese or English.'};
const cursor = {type:'string', pattern:'^(0|[1-9][0-9]{0,2})$', description:'The nextCursor from a previous page with the same filters.'};
const limit = {type:'integer', minimum:1, maximum:20, description:'Page size (default: 12).'};
const group = {type:'string', enum:tradeGroups.map(item=>item.id), description:'Filter by one trade workflow group.'};

function definition(name, description, properties, required = [], readOnlyHint = true) {
  return {name, description, inputSchema:{type:'object', properties, required, additionalProperties:false},
    annotations:{readOnlyHint, destructiveHint:false, idempotentHint:readOnlyHint, openWorldHint:false}};
}

export const TRADE_MCP_TOOLS = Object.freeze([
  definition('list_trade_tools', 'Find a tool among 100 BPJ trade workflows in compliance, customs, tax and refunds, FX and settlement, and shipping documents. Requires a BPJ trade MCP key. Returns paginated summaries.',
    {group, query, cursor, lang, limit}),
  definition('get_trade_tool', 'Get the source, scope, exact input schema and worked example for a tool ID. Requires a BPJ trade MCP key. Use this before run_trade_tool.', {id, lang}, ['id']),
  definition('run_trade_tool', 'Run one deterministic calculation or evidence checklist using its exact input schema. Requires a BPJ trade MCP key and uses one shared daily web/MCP run. Treat legal or policy results as aids for human review.',
    {id, input:{type:'object', description:'Exact input object from get_trade_tool. Send only the fields the task needs.'}, lang}, ['id','input'], false),
]);

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const local = (pair, language) => pair[language === 'zh' ? 0 : 1];
const normalized = value => value.normalize('NFKC').toLowerCase();
const catalogue = tradeGroups.flatMap(category => category.tools.map(tool => ({
  tool, category,
  search:normalized([tool.id, tool.zh, tool.en, ...tool.purpose, ...category.label,
    ...tool.inputs.flatMap(([, , zh, en]) => [zh,en])].join(' ')),
})));
const byId = new Map(catalogue.map(entry => [entry.tool.id, entry]));

export function validateTradeMcpArgs(name, args) {
  const definition = TRADE_MCP_TOOLS.find(tool => tool.name === name);
  if (!definition || !object(args)) throw new RangeError('invalid_arguments');
  const {required, properties} = definition.inputSchema;
  if (required.some(key => !Object.hasOwn(args,key))) throw new RangeError('invalid_arguments');
  for (const [key,value] of Object.entries(args)) {
    if (!Object.hasOwn(properties,key)) throw new RangeError('invalid_arguments');
    const rule = properties[key];
    if (rule.type === 'object' && !object(value)) throw new RangeError('invalid_arguments');
    if (rule.type === 'integer' && (!Number.isSafeInteger(value) || value < rule.minimum || value > rule.maximum)) {
      throw new RangeError('invalid_arguments');
    }
    if (rule.type === 'string' && (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value) ||
        (rule.maxLength && value.length > rule.maxLength) || (rule.enum && !rule.enum.includes(value)) ||
        (rule.pattern && !new RegExp(rule.pattern).test(value)))) throw new RangeError('invalid_arguments');
  }
  if (Number(args.cursor) > catalogue.length) throw new RangeError('invalid_arguments');
  return {...args, lang:args.lang ?? 'en'};
}

function toolSummary({tool, category}, language) {
  return {
    id:tool.id, name:tool[language], description:local(tool.purpose,language),
    group:{id:category.id,name:local(category.label,language)},
    url:'https://baipiaoji.com'+(language === 'en' ? '/en' : '')+'/studio/trade-tools/'+tool.id,
  };
}

function toolReference(entry, language) {
  const {tool} = entry;
  return {...toolSummary(entry,language), scope:local(tool.scope,language),
    source:{name:local(tool.source,language),url:tool.source[2]}};
}

function fieldSchema([,type,zh,en], language) {
  const description = local([zh,en],language), bounds = inputLimits(type);
  if (bounds) return {description, anyOf:[
    {type:type === 'integer' ? 'integer' : 'number', minimum:bounds.min, maximum:bounds.max},
    {type:'string', pattern:'^-?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)$'},
  ]};
  if (type === 'choice') return {type:'string', enum:['yes','no','unknown'], description};
  if (type === 'date') return {type:'string', format:'date', description};
  return {type:'string', minLength:1, maxLength:160, description};
}

function localizedRows(rows, language) {
  return rows.map(pair => ({label:local(pair,language), value:Array.isArray(pair[2]) ? local(pair[2],language) : pair[2]}));
}

export function listTradeTools({lang,group,query,cursor,limit = 12}) {
  const terms = normalized(query ?? '').trim().split(/\s+/).filter(Boolean);
  const matches = catalogue.filter(entry => (!group || entry.category.id === group) && terms.every(term => entry.search.includes(term)));
  const offset = Number(cursor ?? 0);
  return {language:lang,total:matches.length,tools:matches.slice(offset,offset+limit).map(entry=>toolSummary(entry,lang)),
    ...(offset+limit < matches.length ? {nextCursor:String(offset+limit)} : {})};
}

function entryFor(id) {
  const entry = byId.get(id);
  if (!entry) throw new RangeError('unknown_trade_tool');
  return entry;
}

export function getTradeTool({id,lang}) {
  const entry = entryFor(id), fields = entry.tool.inputs;
  const input = Object.fromEntries(fields.map(([key,,,,value])=>[key,value]));
  return {language:lang, tool:toolReference(entry,lang), inputSchema:{type:'object',
    properties:Object.fromEntries(fields.map(field=>[field[0],fieldSchema(field,lang)])),
    required:fields.map(([key])=>key), additionalProperties:false},
  example:{input, rows:localizedRows(evaluateTool(id,input),lang)}};
}

export function runTradeTool({id,input,lang}) {
  const entry = entryFor(id);
  return {language:lang,tool:toolReference(entry,lang),rows:localizedRows(evaluateTool(id,input),lang)};
}
