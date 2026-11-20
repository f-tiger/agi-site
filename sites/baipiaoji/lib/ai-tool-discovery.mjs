import {AI_FREE_TOOLS, AI_PAID_TOOLS, AI_TOOLS} from './ai-tool-registry.mjs';
import {SUITE_CATEGORIES, SUITE_TOOLS, suitePath, suiteToolDefinitions, toolInputSchema} from './ai-suite/registry.mjs';

export const FREE_MCP_VERSION = '0.3.0';
export const CATALOG_URL = 'https://baipiaoji.com/ai-tools.json';
const LIST_PAGE_SIZE = 40;
let freeDefinitions;
let searchIndex;

export function listDefinitions(params = {}, paid = false) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw Error('Invalid list parameters.');

  const definitions = paid ? AI_PAID_TOOLS : (freeDefinitions ??= [...AI_FREE_TOOLS, ...suiteToolDefinitions()]);
  const prefix = 'bpj/' + FREE_MCP_VERSION + '/free/';
  let offset = 0;
  if (Object.hasOwn(params, 'cursor')) {
    const cursor = params.cursor;
    if (paid || typeof cursor !== 'string' || cursor.length > 96) throw Error('Invalid list cursor.');
    const decoded = atob(cursor);
    if (!decoded.startsWith(prefix)) throw Error('Invalid list cursor.');
    offset = Number(decoded.slice(prefix.length));
    if (!Number.isSafeInteger(offset) || offset <= 0 || offset >= definitions.length ||
        offset % LIST_PAGE_SIZE !== 0 || btoa(prefix + offset) !== cursor) throw Error('Invalid list cursor.');
  }
  const end = offset + LIST_PAGE_SIZE;
  const result = {tools: definitions.slice(offset, end)};
  if (end < definitions.length) result.nextCursor = btoa(prefix + end);
  return result;
}

function normalize(text) {
  return text.normalize('NFKC').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchable(tool) {
  const names = [tool.id, tool.title.en, tool.title.zh].map(normalize);
  return {tool, names, content: normalize([...names, tool.category, tool.description.en, tool.description.zh].join(' '))};
}

function score({names, content}, query, words) {
  if (!words.every(word => content.includes(word))) return 0;
  if (names.includes(query)) return 4;
  if (names.some(name => name.includes(query))) return 3;
  if (words.every(word => names.some(name => name.includes(word)))) return 2;
  return 1;
}

export function discoverSuite(args, paidEnabled) {
  const allowed = ['query', 'category', 'offset', 'limit', 'includeSchema'];
  if (!args || typeof args !== 'object' || Array.isArray(args) ||
      Object.keys(args).some(key => !allowed.includes(key))) throw Error('Invalid discovery arguments.');
  const {query = '', category, offset = 0, includeSchema = false} = args;
  if (typeof query !== 'string' || query.length > 120 || typeof includeSchema !== 'boolean' ||
      (category !== undefined && !SUITE_CATEGORIES.some(group => group.id === category))) throw Error('Invalid search options.');
  const phrase = normalize(query);
  if (query.trim() && !phrase) throw Error('Enter a search term.');
  const maxLimit = includeSchema ? 10 : 100;
  const limit = args.limit === undefined ? (phrase || category || includeSchema ? 10 : 100) : args.limit;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > SUITE_TOOLS.length ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > maxLimit) throw Error('Invalid search window.');
  const words = phrase.split(' ');
  // MCP function names start with bpj_; indexing them without the prefix also supports queries by slug.
  const entries = searchIndex ??= SUITE_TOOLS.map(searchable);
  const candidates = category ? entries.filter(entry => entry.tool.category === category) : entries;
  let matches = candidates;
  if (phrase) {
    const searchPhrase = phrase.replace(/^bpj (?=\S)/, '');
    const searchWords = searchPhrase === phrase ? words : searchPhrase.split(' ');
    matches = candidates.map(entry => ({entry, score: score(entry, searchPhrase, searchWords)}))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.entry);
  }
  const suite = matches.slice(offset, offset + limit).map(({tool}) => ({
    id: tool.id, path: suitePath(tool), name: tool.title, category: tool.category, freeMcp: tool.name,
    ...(includeSchema ? {description: tool.description, inputSchema: toolInputSchema(tool), example: tool.example} : {}),
  }));
  return {
    tools: AI_TOOLS, suite, catalog: CATALOG_URL,
    paidStatus: paidEnabled ? 'enabled_requires_membership' : 'not_launched',
    total: SUITE_TOOLS.length, matched: matches.length, offset,
    nextOffset: offset + suite.length < matches.length ? offset + suite.length : null,
    categories: SUITE_CATEGORIES.map(group => ({id: group.id, title: group.title, count: group.tools.length})),
  };
}
