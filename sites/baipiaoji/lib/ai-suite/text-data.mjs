import {readCsv, requireColumn} from './csv-input.mjs';

const labels = (zh, en) => ({ zh, en });
const stringInput = (key, zh, en, maxLength = 12000, multiline = false) => ({
  key, label: labels(zh, en), type: 'string', maxLength, multiline,
});
const integerInput = (key, zh, en, min, max) => ({ key, label: labels(zh, en), type: 'integer', min, max });
const booleanInput = (key, zh, en) => ({ key, label: labels(zh, en), type: 'boolean' });
const textInput = () => stringInput('text', '文本', 'Text', 12000, true);
const csvInput = () => stringInput('csv', '含表头的 CSV', 'CSV with headers', 12000, true);
const jsonInput = () => stringInput('json', 'JSON 数据', 'JSON data', 12000, true);
const define = (id, zhTitle, enTitle, zhDescription, enDescription, inputs, example, run) => ({
  id, title: labels(zhTitle, enTitle), description: labels(zhDescription, enDescription), inputs, example, run,
});

const lines = text => text.split(/\r\n|[\n\r]/u);
const nonblankLines = text => lines(text).map(line => line.trim()).filter(Boolean);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const kind = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;

function parseJson(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error('Enter valid JSON.');
  }

  let nodes = 0;
  function inspect(node, depth) {
    nodes += 1;
    if (nodes > 3000 || depth > 24) throw Error('JSON exceeds the node or nesting limit.');
    if (typeof node === 'number' && !Number.isFinite(node)) throw Error('JSON numbers must be finite.');
    if (node !== null && typeof node === 'object') {
      for (const child of Object.values(node)) inspect(child, depth + 1);
    }
  }
  inspect(value, 0);
  return value;
}

function readRecords(text) {
  const rows = parseJson(text);
  if (!Array.isArray(rows) || !rows.length || rows.length > 300 || rows.some(row => !isRecord(row))) {
    throw Error('Use a JSON array of 1 to 300 objects.');
  }
  const columns = [...new Set(rows.flatMap(Object.keys))];
  if (!columns.length || columns.length > 32 || columns.some(name => !name || name.length > 100)) {
    throw Error('Use 1 to 32 nonempty field names, each at most 100 characters.');
  }
  return { rows, columns };
}

function pointerPart(key) {
  return key.replaceAll('~', '~0').replaceAll('/', '~1');
}

function encodeTableCell(value) {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const guard = typeof value === 'string' && /^[\s\p{Cf}]*[=+@-]|^[\t\r\n]/u.test(text);
  const cell = guard ? "'" + text : text;
  return { cell: /[",\r\n]/u.test(cell) ? '"' + cell.replaceAll('"', '""') + '"' : cell, guard };
}

export const tools = [
  define(
    'text-inspect', '文本长度与字节统计', 'Text length and byte counts',
    '统计 Unicode 码点、UTF-8 字节、行数和非空字段，便于核对输入限制。',
    'Count Unicode code points, UTF-8 bytes, lines and whitespace-delimited fields to check size limits.',
    [textInput()], { text: 'BPJ AI\nTool 🎯' },
    ({ text }) => ({
      codePoints: [...text].length,
      utf16Units: text.length,
      utf8Bytes: new TextEncoder().encode(text).length,
      lines: text === '' ? 0 : lines(text).length,
      whitespaceDelimitedFields: text.trim() ? text.trim().split(/\s+/u).length : 0,
    }),
  ),
  define(
    'normalize-whitespace', '清理复制文本空白', 'Normalize pasted whitespace',
    '把连续的空白合并，按需保留换行。',
    'Collapse repeated whitespace with a choice to preserve line breaks.',
    [textInput(), booleanInput('keepLines', '保留换行', 'Preserve lines')],
    { text: '  Project  notes \r\n\tStatus:  active', keepLines: true },
    ({ text, keepLines }) => ({
      text: keepLines ? lines(text).map(line => line.trim().replace(/\s+/gu, ' ')).join('\n')
        : text.trim().replace(/\s+/gu, ' '),
    }),
  ),
  define(
    'deduplicate-lines', '按行去重', 'Remove duplicate lines',
    '清除空行与重复项，保留首次出现的顺序。',
    'Remove blank and repeated lines in first-seen order.',
    [textInput()], { text: 'Keyword A\nKeyword B\nKeyword A\n\nKeyword C' },
    ({ text }) => {
      const supplied = nonblankLines(text);
      const distinct = [...new Set(supplied)];
      return { text: distinct.join('\n'), unique: distinct.length, duplicateLines: supplied.length - distinct.length };
    },
  ),
  define(
    'compare-line-sets', '比较两份清单', 'Compare two line lists',
    '逐行对比两份清单，列出新增、移除和仍然存在的项。',
    'Find additions, removals and retained items between two line lists.',
    [stringInput('before', '原清单', 'Previous list', 6000, true), stringInput('after', '新清单', 'Updated list', 6000, true)],
    { before: 'ChatGPT\nKimi\nGemini', after: 'Gemini\nKimi\nClaude' },
    ({ before, after }) => {
      const first = new Set(nonblankLines(before));
      const second = new Set(nonblankLines(after));
      return {
        added: [...second].filter(line => !first.has(line)),
        removed: [...first].filter(line => !second.has(line)),
        retained: [...first].filter(line => second.has(line)),
      };
    },
  ),
  define(
    'replace-literal', '预览文本批量替换', 'Preview literal replacements',
    '按字面替换全部非重叠匹配并统计次数。',
    'Replace all non-overlapping occurrences of a literal string and report the count.',
    [textInput(), stringInput('find', '查找', 'Find', 300), stringInput('replacement', '替换为', 'Replace with', 300)],
    { text: 'draft-01 / draft-02', find: 'draft', replacement: 'review' },
    ({ text, find, replacement }) => {
      if (!find) throw Error('Enter text to find.');
      const parts = text.split(find);
      const replaced = parts.length - 1;
      if (text.length + replaced * (replacement.length - find.length) > 24000) throw Error('Replacement output is too large.');
      return { text: parts.join(replacement), replaced };
    },
  ),
  define(
    'make-readable-slug', '生成可读的路径短名', 'Generate a readable slug',
    '把标题转换成带连字符的路径短名，支持中文字符。',
    'Convert a title to a hyphen-separated slug with support for Unicode letters.',
    [stringInput('title', '标题', 'Title', 300)], { title: '  BPJ tools: café planning ' },
    ({ title }) => {
      const sanitized = title.normalize('NFKC').toLowerCase()
        .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-').replace(/^-|-$/gu, '');
      const slug = [...sanitized].slice(0, 90).join('').replace(/-$/u, '');
      if (!/[\p{L}\p{N}]/u.test(slug)) throw Error('A slug needs at least one letter or digit.');
      return { slug, encodedPathSegment: encodeURIComponent(slug) };
    },
  ),
  define(
    'count-word-frequency', '词项频率', 'Token frequency ranking',
    '按 Unicode 字母和数字划分词项，统计最常见的词。',
    'Rank runs of Unicode letters, marks and numbers by frequency.',
    [textInput(), integerInput('limit', '显示前几项', 'Number of terms', 1, 40)],
    { text: 'AI tools serve creators. AI tools serve teams.', limit: 5 },
    ({ text, limit }) => {
      const entries = new Map();
      const tokens = text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
      for (const word of tokens) entries.set(word, (entries.get(word) ?? 0) + 1);
      const top = [...entries].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([term, count]) => ({ term, count }));
      return { top, totalTerms: tokens.length, distinctTerms: entries.size };
    },
  ),
  define(
    'search-text-context', '高亮关键词上下文', 'Find terms in context',
    '按字面查询词语，返回出现位置和邻近的文本。',
    'Find literal matches and return UTF-16 offsets with neighboring text.',
    [textInput(), stringInput('term', '查询词', 'Search term', 200), integerInput('radius', '前后字符数', 'Context on each side', 0, 80)],
    { text: 'An export completed. The second export needs review.', term: 'export', radius: 6 },
    ({ text, term, radius }) => {
      if (!term) throw Error('Enter a search term.');
      const matches = [];
      let start = 0;
      let total = 0;
      while (start <= text.length - term.length) {
        const offset = text.indexOf(term, start);
        if (offset === -1) break;
        start = offset + term.length;
        total += 1;
        if (matches.length < 30) matches.push({
          offset, before: text.slice(Math.max(0, offset - radius), offset),
          match: term, after: text.slice(start, start + radius),
        });
      }
      return { matches, total, truncated: total > matches.length };
    },
  ),
  define(
    'extract-web-links', '提取网页链接', 'Extract web links',
    '从文本中提取并去重 HTTP 和 HTTPS 链接，保留首次出现顺序。',
    'Extract and deduplicate absolute HTTP and HTTPS URLs in first-seen order.',
    [textInput()], { text: 'Directory: https://baipiaoji.com/manju/; toolbox https://baipiaoji.com/' },
    ({ text }) => {
      const urls = new Set();
      for (const match of text.matchAll(/https?:\/\/[^\s<>"'，。；！？、）】]+/giu)) {
        const candidate = match[0].replace(/[),.;!?\]}]+$/u, '');
        try {
          const url = new URL(candidate);
          if (!url.username && !url.password && url.href.length <= 2048) urls.add(url.href);
        } catch {
          // Ignore text fragments that do not form valid URLs.
        }
      }
      return { urls: [...urls].slice(0, 40), distinct: urls.size, truncated: urls.size > 40 };
    },
  ),
  define(
    'find-invisible-characters', '查找不可见控制字符', 'Find invisible control characters',
    '标出零宽字符、不换行空格和双向控制字符的位置。',
    'Locate invisible formatting controls, nonbreaking spaces and other uncommon separators.',
    [textInput()], { text: 'normal\u200Btext with\u00A0space' },
    ({ text }) => {
      const occurrences = [];
      let total = 0;
      for (const match of text.matchAll(/[\p{Cf}\p{Cc}\p{Zs}\p{Zl}\p{Zp}]/gu)) {
        if ([' ', '\n', '\r', '\t'].includes(match[0])) continue;
        total += 1;
        if (occurrences.length < 100) {
          occurrences.push({
            utf16Offset: match.index,
            codePoint: 'U+' + match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0'),
          });
        }
      }
      return { occurrences, total, truncated: total > occurrences.length };
    },
  ),
  define(
    'chunk-text', '按字符上限切分文本', 'Split text into sized chunks',
    '按 Unicode 码点限制切块，优先在自然空白处断开，保留原始文本。',
    'Split by a maximum code-point count with a preference for nearby whitespace. Chunks rejoin to the original text.',
    [textInput(), integerInput('size', '每块最多码点数', 'Maximum code points per chunk', 32, 3000)],
    { text: 'Keep each group of sentences together when possible. Long text can be inspected in small chunks.', size: 38 },
    ({ text, size }) => {
      const points = [...text];
      const chunks = [];
      for (let from = 0; from < points.length;) {
        let end = Math.min(points.length, from + size);
        if (end < points.length) {
          const floor = from + Math.ceil(size * 0.65);
          for (let index = end; index >= floor; index -= 1) {
            if (/\s/u.test(points[index - 1])) {
              end = index;
              break;
            }
          }
        }
        chunks.push(points.slice(from, end).join(''));
        from = end;
      }
      return { chunks, count: chunks.length };
    },
  ),
  define(
    'csv-to-json', 'CSV 转 JSON 对象', 'Convert CSV to JSON objects',
    '用首行作字段名，保留引号内的逗号和换行，单元格按字符串输出。',
    'Use the first row as keys and preserve quoted commas and line breaks. Cells remain strings.',
    [csvInput()], { csv: 'tool,notes\nBPJ,"Free, includes a directory"\nFrame Picks,Drama search' },
    ({ csv }) => {
      const { columns, rows } = readCsv(csv);
      const repeatedKeySize = columns.reduce((sum, name) => sum + JSON.stringify(name).length + 2, 0) * rows.length;
      if (csv.length + repeatedKeySize > 40000) throw Error('The resulting JSON is too large. Split the CSV into smaller batches.');
      return { columns, rows: rows.map(row => Object.fromEntries(columns.map((name, index) => [name, row[index]]))) };
    },
  ),
  define(
    'json-to-csv', 'JSON 对象转 CSV', 'Convert JSON objects to CSV',
    '把对象数组展开为 CSV。单元格须为标量，疑似电子表格公式的文本会转义。',
    'Export scalar fields from an array of objects. Formula-like string cells receive an apostrophe prefix.',
    [jsonInput()], { json: '[{"tool":"BPJ","count":3},{"tool":"Frame Picks","source":"=imported"}]' },
    ({ json }) => {
      const { rows, columns } = readRecords(json);
      let escapedCells = 0;
      const encodeRow = row => {
        const fields = row.map(value => {
          if (value !== null && typeof value === 'object') throw Error('CSV cells must be strings, numbers, booleans or null.');
          const { cell, guard } = encodeTableCell(value);
          if (guard) escapedCells += 1;
          return cell;
        });
        // A single empty field needs quotes to distinguish the record from a final line break.
        return fields.length === 1 && !fields[0] ? '""' : fields.join(',');
      };
      const records = rows.map(row => columns.map(name => Object.hasOwn(row, name) ? row[name] : null));
      if (records.length * columns.length > 2400) throw Error('Use at most 2400 CSV data cells.');
      return { csv: [encodeRow(columns), ...records.map(encodeRow)].join('\r\n'), dataRows: rows.length, escapedCells };
    },
  ),
  define(
    'csv-to-markdown-table', 'CSV 转 Markdown 表格', 'Convert CSV to a Markdown table',
    '用 CSV 的首行作列名，输出适合文档的 Markdown 表格。',
    'Use CSV headers to produce a document-ready Markdown table.',
    [csvInput()], { csv: 'Tool,Description\nFrame Picks,Dramas | Catalogue\nBPJ,Search and compare' },
    ({ csv }) => {
      const { columns, rows } = readCsv(csv);
      const cell = text => text.replace(/\r\n|[\r\n]/gu, ' ')
        .replace(/[&<>]/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])
        .replace(/[\\|`*_\[\]~]/gu, char => '\\' + char);
      const rowText = values => '| ' + values.map(cell).join(' | ') + ' |';
      return { markdown: [rowText(columns), rowText(columns.map(() => '---')), ...rows.map(rowText)].join('\n') };
    },
  ),
  define(
    'profile-csv', '检查 CSV 列的数据质量', 'Profile CSV column quality',
    '逐列统计空值、非空值、不同值和重复值。',
    'Count blanks, populated cells, distinct values and repeats per CSV column.',
    [csvInput()], { csv: 'id,tag\n1,video\n2,\n2,video' },
    ({ csv }) => {
      const { columns, rows } = readCsv(csv);
      return {
        rowCount: rows.length,
        columns: columns.map((name, index) => {
          const values = rows.map(row => row[index].trim()).filter(Boolean);
          const distinct = new Set(values).size;
          return { name, blank: rows.length - values.length, populated: values.length, distinct, repeats: values.length - distinct };
        }),
      };
    },
  ),
  define(
    'pivot-csv-counts', 'CSV 双列计数透视', 'Count CSV category combinations',
    '按两个字段组合汇总出现次数，便于比较分类和状态。',
    'Count observed combinations of two columns, such as category and status.',
    [csvInput(), stringInput('rowKey', '分组列', 'Group column', 100), stringInput('columnKey', '分类列', 'Category column', 100)],
    { csv: 'team,state\nweb,open\nweb,open\nweb,done\nmobile,open', rowKey: 'team', columnKey: 'state' },
    ({ csv, rowKey, columnKey }) => {
      const { columns, rows } = readCsv(csv);
      const groupIndex = requireColumn(columns, rowKey);
      const categoryIndex = requireColumn(columns, columnKey);
      if (groupIndex === categoryIndex) throw Error('Choose two different columns.');
      const groups = new Map();
      for (const row of rows) {
        const group = row[groupIndex];
        const category = row[categoryIndex];
        if (!groups.has(group)) groups.set(group, new Map());
        const counts = groups.get(group);
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
      return {
        groups: [...groups].map(([group, counts]) => ({
          group, counts: [...counts].map(([category, count]) => ({ category, count })),
        })),
        rowCount: rows.length,
      };
    },
  ),
  define(
    'filter-csv', '按单列筛选 CSV', 'Filter CSV by exact column value',
    '筛选某列等于指定值的记录，返回字段与匹配行。',
    'Return the columns and records that match a supplied exact column value.',
    [csvInput(), stringInput('column', '列名', 'Column', 100), stringInput('value', '匹配值', 'Exact value', 300)],
    { csv: 'tool,status\nBPJ,live\nPrototype,draft\nFrame Picks,live', column: 'status', value: 'live' },
    ({ csv, column, value }) => {
      const { columns, rows } = readCsv(csv);
      const index = requireColumn(columns, column);
      const matches = rows.filter(row => row[index] === value);
      return { columns, rows: matches, matched: matches.length, total: rows.length };
    },
  ),
  define(
    'numeric-summary', '数列摘要与四分位数', 'Numeric summary and quartiles',
    '计算均值、中位数、四分位数、极值和总体标准差。',
    'Calculate mean, median, quartiles, extrema and population standard deviation.',
    [stringInput('values', '数字序列', 'Number series', 8000, true)], { values: '3, 4, 7, 8, 10, 21' },
    ({ values }) => {
      const tokens = values.trim().split(/[\s,，;；]+/u).filter(Boolean);
      if (!tokens.length || tokens.length > 500) throw Error('Enter 1 to 500 numbers.');
      const nums = tokens.map(value => {
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(value)) throw Error('The series contains an invalid number.');
        const number = Number(value);
        if (!Number.isFinite(number) || Math.abs(number) > 1e12) throw Error('Numbers must be finite and within ±1e12.');
        return number;
      }).sort((a, b) => a - b);
      const percentile = fraction => {
        const at = (nums.length - 1) * fraction;
        const low = Math.floor(at);
        const high = Math.ceil(at);
        return nums[low] + (nums[high] - nums[low]) * (at - low);
      };
      const sum = nums.reduce((result, number) => result + number, 0);
      const mean = sum / nums.length;
      const variance = nums.reduce((result, number) => result + (number - mean) ** 2, 0) / nums.length;
      return {
        count: nums.length, sum, mean, min: nums[0], q1: percentile(0.25), median: percentile(0.5),
        q3: percentile(0.75), max: nums.at(-1), populationStdDev: Math.sqrt(variance),
      };
    },
  ),
  define(
    'format-json', '校验并格式化 JSON', 'Validate and format JSON',
    '校验 JSON 并按所选缩进输出；零空格生成紧凑格式。',
    'Parse JSON and format it with the selected indentation. Zero produces compact output.',
    [jsonInput(), integerInput('spaces', '缩进空格数', 'Indentation spaces', 0, 4)],
    { json: '{"product":{"name":"BPJ","active":true}}', spaces: 2 },
    ({ json, spaces }) => {
      const parsed = parseJson(json);
      const formatted = JSON.stringify(parsed, null, spaces);
      if (formatted.length > 40000) throw Error('Formatted output is too large. Use fewer indentation spaces.');
      return { json: formatted, rootType: kind(parsed) };
    },
  ),
  define(
    'flatten-json', '展开 JSON 字段路径', 'Flatten JSON field paths',
    '输出每个叶节点的 JSON Pointer 路径和值，保留空容器。',
    'List leaf values with their JSON Pointer paths, including empty containers.',
    [jsonInput()], { json: '{"tool":"BPJ","results":[{"status":"live"}],"empty":{}}' },
    ({ json }) => {
      const rows = [];
      let count = 0;
      let remaining = 16000;
      function visit(value, pointer) {
        const entries = value !== null && typeof value === 'object' ? Object.entries(value) : [];
        if (entries.length) {
          for (const [key, child] of entries) visit(child, pointer + '/' + pointerPart(key));
          return;
        }
        count += 1;
        const cost = pointer.length + JSON.stringify(value).length + 24;
        if (rows.length < 300 && cost <= remaining) {
          rows.push({ pointer, value });
          remaining -= cost;
        }
      }
      visit(parseJson(json), '');
      return { rows, leafCount: count, truncated: count > rows.length };
    },
  ),
  define(
    'read-json-pointer', '按 JSON Pointer 读取字段', 'Read a JSON Pointer',
    '使用标准 JSON Pointer 定位对象字段或数组元素。空指针表示根节点。',
    'Read an object field or array entry using JSON Pointer. An empty pointer selects the whole value.',
    [jsonInput(), stringInput('pointer', '字段指针', 'Pointer', 800)],
    { json: '{"tools":[{"name":"BPJ"}],"a/b":5}', pointer: '/tools/0/name' },
    ({ json, pointer }) => {
      let value = parseJson(json);
      if (pointer && !pointer.startsWith('/')) throw Error('A JSON Pointer must start with /.');
      const keys = pointer ? pointer.slice(1).split('/') : [];
      for (const part of keys) {
        if (/~(?![01])/u.test(part)) throw Error('Use ~0 for a tilde and ~1 for a slash.');
      }
      for (const part of keys) {
        const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
        if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return { found: false };
        if (Array.isArray(value) && !/^(?:0|[1-9][0-9]*)$/u.test(key)) return { found: false };
        value = value[key];
      }
      return { found: true, type: kind(value), value };
    },
  ),
  define(
    'compare-json', '比较 JSON 字段差异', 'Compare JSON field differences',
    '按字段路径列出新增、移除和变更。对象键顺序无关，数组按位置比较。',
    'Report added, removed and changed paths. Object member order is ignored and arrays are compared by position.',
    [stringInput('before', '原 JSON', 'Previous JSON', 8000, true), stringInput('after', '新 JSON', 'Updated JSON', 8000, true)],
    { before: '{"free":true,"uses":3,"old":1}', after: '{"free":true,"uses":5,"tier":"starter"}' },
    ({ before, after }) => {
      const changes = [];
      let total = 0;
      let remaining = 16000;
      function record(change, pointer, metadata) {
        total += 1;
        const cost = pointer.length + 100;
        if (changes.length < 200 && cost <= remaining) {
          changes.push({ change, pointer, ...metadata });
          remaining -= cost;
        }
      }
      function compare(a, b, pointer) {
        if (a === b) return;
        if (kind(a) === kind(b) && a !== null && typeof a === 'object') {
          const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
          for (const key of keys) {
            const child = pointer + '/' + pointerPart(key);
            if (!Object.hasOwn(a, key)) record('added', child, { afterType: kind(b[key]) });
            else if (!Object.hasOwn(b, key)) record('removed', child, { beforeType: kind(a[key]) });
            else compare(a[key], b[key], child);
          }
        } else record('changed', pointer, { beforeType: kind(a), afterType: kind(b) });
      }
      compare(parseJson(before), parseJson(after), '');
      return { equal: total === 0, changes, total, truncated: total > changes.length };
    },
  ),
  define(
    'profile-json-records', '识别 JSON 对象数组的字段结构', 'Profile JSON record fields',
    '从样本对象数组统计字段的存在率、空值和类型。',
    'Summarize field presence, missing values, nulls and observed types in a sample of JSON records.',
    [jsonInput()], { json: '[{"tool":"BPJ","count":15},{"tool":"Frame Picks","count":null,"active":true}]' },
    ({ json }) => {
      const { rows, columns } = readRecords(json);
      return {
        recordCount: rows.length,
        fields: columns.map(key => {
          const observed = new Map();
          for (const row of rows) {
            if (Object.hasOwn(row, key)) {
              const type = kind(row[key]);
              observed.set(type, (observed.get(type) ?? 0) + 1);
            }
          }
          const present = [...observed.values()].reduce((total, count) => total + count, 0);
          return { key, present, missing: rows.length - present, types: Object.fromEntries(observed) };
        }),
      };
    },
  ),
  define(
    'check-json-lines', '逐行校验 JSONL', 'Check JSON Lines',
    '逐行检查 JSONL，返回无效行号及有效记录的类型统计。忽略空行。',
    'Validate JSON Lines and report invalid line numbers and valid record types. Blank lines are ignored.',
    [stringInput('jsonl', 'JSONL 文本', 'JSON Lines', 12000, true)],
    { jsonl: '{"tool":"BPJ"}\n{"broken":}\n{"tool":"Frame Picks","public":true}' },
    ({ jsonl }) => {
      const source = lines(jsonl);
      if (source.length > 500) throw Error('Use at most 500 lines.');
      const invalidLines = [];
      const types = new Map();
      let records = 0;
      let blank = 0;
      for (const [index, line] of source.entries()) {
        if (!line.trim()) {
          blank += 1;
          continue;
        }
        try {
          const type = kind(parseJson(line));
          types.set(type, (types.get(type) ?? 0) + 1);
          records += 1;
        } catch {
          invalidLines.push(index + 1);
        }
      }
      return { valid: invalidLines.length === 0, records, blank, invalidLines, types: Object.fromEntries(types) };
    },
  ),
  define(
    'apply-json-merge-patch', '预览 JSON Merge Patch', 'Preview a JSON Merge Patch',
    '按 RFC 7396 合并 JSON 对象。补丁中的 null 删除字段，数组按整体替换。',
    'Apply RFC 7396 JSON Merge Patch. Null object members remove fields and arrays are replaced as a whole.',
    [stringInput('document', '原 JSON', 'Original JSON', 8000, true), stringInput('patch', '合并补丁', 'Merge patch', 8000, true)],
    { document: '{"tool":"BPJ","options":{"cached":false,"retired":true}}', patch: '{"options":{"cached":true,"retired":null}}' },
    ({ document, patch }) => {
      function merge(target, update) {
        if (!isRecord(update)) return update;
        const result = new Map(isRecord(target) ? Object.entries(target) : []);
        for (const [key, value] of Object.entries(update)) {
          if (value === null) result.delete(key);
          else result.set(key, merge(result.get(key), value));
        }
        return Object.fromEntries(result);
      }
      return { result: merge(parseJson(document), parseJson(patch)) };
    },
  ),
];
