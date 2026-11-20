const DAY = 86_400_000;
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const jsonTypes = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];

const bilingual = (zh, en) => ({ zh, en });
const string = (key, zh, en, maxLength = 500, multiline = false) =>
  ({ key, label: bilingual(zh, en), type: 'string', maxLength, multiline });
const integer = (key, zh, en, min, max) =>
  ({ key, label: bilingual(zh, en), type: 'integer', min, max });
const entry = (id, title, description, inputs, example, run) =>
  ({ id, title: bilingual(...title), description: bilingual(...description), inputs, example, run });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Enter valid JSON.');
  }
}

function objectJson(text) {
  const value = parseJson(text);
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'Enter a JSON object.');
  return value;
}

function lines(text) {
  return text.replaceAll('\r\n', '\n').split('\n');
}

function list(text) {
  return lines(text).map(line => line.trim()).filter(Boolean);
}

function parseDate(year, month, day) {
  const value = new Date(0);
  value.setUTCFullYear(year, month - 1, day);
  check(value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day, 'Enter a valid calendar date.');
  return value.getTime();
}

function parseInstant(text) {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.(\d{1,3}))?(Z|([+-])(\d\d):(\d\d))$/.exec(text);
  check(match, 'Use an ISO timestamp with seconds and an explicit UTC offset.');
  const [, year, month, day, hour, minute, second, fraction = '', , sign, tzHour = '0', tzMinute = '0'] = match;
  check(+hour < 24 && +minute < 60 && +second < 60 && +tzHour < 24 && +tzMinute < 60, 'Timestamp or offset is out of range.');
  const offset = (Number(tzHour) * 60 + Number(tzMinute)) * (sign === '-' ? -1 : 1);
  return parseDate(+year, +month, +day) + ((+hour * 60 + +minute - offset) * 60 + +second) * 1000 +
    Number(fraction.padEnd(3, '0'));
}

function iso(milliseconds) {
  check(Number.isSafeInteger(milliseconds) && Math.abs(milliseconds) <= 8.64e15, 'Timestamp is out of range.');
  return new Date(milliseconds).toISOString();
}

function compareStrings(a, b) {
  return a === b ? 0 : a < b ? -1 : 1;
}

function compareDigits(a, b) {
  return compareStrings(a.length, b.length) || compareStrings(a, b);
}

function compareSemver(left, right) {
  const a = SEMVER.exec(left);
  const b = SEMVER.exec(right);
  check(a && b, 'Enter two SemVer versions such as 2.1.0-rc.1.');
  const prerelease = [a[4], b[4]].map(version => version?.split('.') || []);
  check(prerelease.flat().every(part => !/^0\d+$/.test(part)), 'Numeric prerelease identifiers cannot start with a zero.');
  for (const part of [1, 2, 3]) {
    const comparison = compareDigits(a[part], b[part]);
    if (comparison) return comparison;
  }
  const [p, q] = prerelease;
  if (!p.length || !q.length) return compareStrings(Number(!p.length), Number(!q.length));
  for (let i = 0; i < Math.min(p.length, q.length); i++) {
    const numericA = /^\d+$/.test(p[i]);
    const numericB = /^\d+$/.test(q[i]);
    const comparison = numericA && numericB ? compareDigits(p[i], q[i]) :
      numericA !== numericB ? compareStrings(Number(numericB), Number(numericA)) : compareStrings(p[i], q[i]);
    if (comparison) return comparison;
  }
  return compareStrings(p.length, q.length);
}

function cronField(text, min, max) {
  const values = new Set();
  for (const part of text.split(',')) {
    const match = /^(\*|\d{1,2})(?:-(\d{1,2}))?(?:\/(\d{1,2}))?$/.exec(part);
    check(match, 'Use numeric cron fields with commas, ranges, or steps.');
    const [, start, finish, stride = '1'] = match;
    check(start !== '*' || finish === undefined, 'A wildcard cannot be followed by a range endpoint.');
    const first = start === '*' ? min : Number(start);
    const last = start === '*' ? max : finish !== undefined ? Number(finish) : match[3] ? max : first;
    const step = Number(stride);
    check(first >= min && last <= max && first <= last && step > 0, 'Cron field is out of range.');
    for (let n = first; n <= last; n += step) values.add(n);
  }
  return [...values].sort((a, b) => a - b);
}

function cronPreview(expression, after, count) {
  const fields = expression.trim().split(/\s+/);
  check(fields.length === 5, 'Enter five numeric cron fields.');
  const [minutes, hours, dates, months, weekdays] = fields.map((field, i) => cronField(field, ...[
    [0, 59], [0, 23], [1, 31], [1, 12], [0, 6]
  ][i]));
  const afterTime = parseInstant(after);
  const startDay = Math.floor(afterTime / DAY) * DAY;
  const runs = [];
  const end = afterTime + 366 * DAY;
  for (let day = startDay; day <= end && runs.length < count; day += DAY) {
    const date = new Date(day);
    if (!months.includes(date.getUTCMonth() + 1)) continue;
    const dateMatch = dates.includes(date.getUTCDate());
    const weekdayMatch = weekdays.includes(date.getUTCDay());
    const restrictDate = !fields[2].startsWith('*');
    const restrictWeekday = !fields[4].startsWith('*');
    if (!(restrictDate && restrictWeekday ? dateMatch || weekdayMatch : dateMatch && weekdayMatch)) continue;
    for (const hour of hours) {
      for (const minute of minutes) {
        const instant = day + (hour * 60 + minute) * 60_000;
        if (instant > afterTime && instant <= end && runs.length < count) runs.push(iso(instant));
      }
    }
  }
  return { occurrencesUtc: runs, returned: runs.length, searchedUntilUtc: iso(end), requested: count };
}

function calendarText(text) {
  return text.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;')
    .replace(/\r\n|\r|\n/g, '\\n');
}

function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  let folded = '';
  let width = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (width + size > 75) {
      folded += '\r\n ';
      width = 1;
    }
    folded += char;
    width += size;
  }
  return folded;
}

function classifyType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function parsePointer(pointer) {
  check(pointer === '' || (pointer.startsWith('/') && !/~(?:[^01]|$)/.test(pointer)), 'Use a valid JSON Pointer.');
  return pointer === '' ? [] : pointer.slice(1).split('/').map(token => token.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function inspectImportMap(text, specifiers) {
  const source = objectJson(text);
  const imports = source.imports === undefined ? {} : source.imports;
  check(classifyType(imports) === 'object', 'The import map imports field must be an object.');
  const mapped = Object.entries(imports);
  check(mapped.every(([key, value]) => key && (
    value === null || (typeof value === 'string' && value && (!key.endsWith('/') || value.endsWith('/')))
  )), 'Import mappings must be strings or null. Prefix mappings use a trailing slash.');
  const prefixes = mapped.filter(([key]) => key.endsWith('/')).sort(([a], [b]) => b.length - a.length);
  const queries = list(specifiers);
  check(queries.length && queries.length <= 50 && queries.every(key => !/^(?:[./]|[a-z][a-z0-9+.-]*:)|\s/i.test(key)),
    'Enter up to 50 bare module specifiers, one per line.');
  return { lookups: queries.map(specifier => {
    if (Object.hasOwn(imports, specifier)) {
      const target = imports[specifier];
      return { specifier, match: specifier, status: target === null ? 'blocked' : 'mapped', target };
    }
    const prefix = prefixes.find(([key]) => specifier.startsWith(key));
    if (!prefix) return { specifier, status: 'unmapped' };
    const [key, base] = prefix;
    const suffix = specifier.slice(key.length);
    check(!suffix.split('/').some(part => /^(?:\.|%2e){1,2}$/i.test(part)), 'A package suffix must stay inside its mapped prefix.');
    return { specifier, match: key, status: base === null ? 'blocked' : 'mapped', target: base === null ? null : base + suffix };
  }) };
}

function patchPlan(text) {
  const patch = parseJson(text);
  check(Array.isArray(patch) && patch.length <= 100, 'Enter a JSON Patch array with at most 100 operations.');
  const supported = new Set(['add', 'remove', 'replace', 'move', 'copy', 'test']);
  const operations = patch.map((operation, index) => {
    check(operation && supported.has(operation.op) && typeof operation.path === 'string', 'Invalid JSON Patch operation or target path.');
    const path = parsePointer(operation.path);
    const base = { step: index + 1, operation: operation.op, target: operation.path };
    if (operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') {
      check(Object.hasOwn(operation, 'value'), 'A patch operation is missing its value.');
    }
    if (operation.op === 'move' || operation.op === 'copy') {
      check(typeof operation.from === 'string', 'Move and copy operations require a source path.');
      const from = parsePointer(operation.from);
      check(operation.op !== 'move' || path.length <= from.length || from.some((token, i) => token !== path[i]),
        'A move target cannot be a descendant of its source.');
      base.source = operation.from;
    }
    return base;
  });
  return { operations, mutations: operations.filter(operation => operation.operation !== 'test').length };
}

function envNames(text, template) {
  const names = [];
  for (const line of list(text)) {
    if (line.startsWith('#')) continue;
    const key = template ? /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|$)/.exec(line)?.[1] : line;
    check(key && IDENTIFIER.test(key), 'Use single-line environment declarations or bare variable names.');
    names.push(key);
  }
  return [...new Set(names)].sort();
}

function interpolateRoute(template, parameters) {
  check(/^\/(?!\/)[^\s?#\\]*$/.test(template), 'Enter a relative API path beginning with one slash.');
  const used = new Set();
  const route = template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => {
    check(Object.hasOwn(parameters, key) && ['string', 'number'].includes(typeof parameters[key]), 'A path parameter is missing or invalid.');
    used.add(key);
    const value = String(parameters[key]);
    check(value !== '' && value !== '.' && value !== '..' && !/[\/\\\u0000-\u001f\u007f]/.test(value),
      'A value must represent one route segment.');
    try {
      return encodeURIComponent(value);
    } catch {
      throw new Error('A path parameter is not valid Unicode.');
    }
  });
  check(!/[{}]/.test(route) && !route.split('/').some(part => /^(?:(?:\.|%2e)){1,2}$/i.test(part)), 'Path contains an invalid segment.');
  return { path: route, unusedParameters: Object.keys(parameters).filter(key => !used.has(key)) };
}

function filePaths(text) {
  const paths = lines(text).filter(line => line.trim());
  check(paths.length <= 100, 'Enter at most 100 relative paths.');
  const seen = new Map();
  const issues = [];
  for (const [index, path] of paths.entries()) {
    const parts = path.split('/');
    if (parts.some(part => !part || part === '.' || part === '..' || /[<>:"\\|?*\u0000-\u001f]/.test(part) ||
      /[ .]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part))) {
      issues.push({ entry: index + 1, code: 'invalid_segment' });
    }
    if (parts.some(part => new TextEncoder().encode(part).length > 255)) issues.push({ entry: index + 1, code: 'long_segment' });
    const key = path.normalize('NFC').toLowerCase();
    if (seen.has(key)) issues.push({ entry: index + 1, code: 'case_or_unicode_collision', conflictsWith: seen.get(key) });
    else seen.set(key, index + 1);
  }
  return { checked: paths.length, portable: issues.length === 0, issues };
}

function parseRetryAfter(value, now) {
  const observedAt = parseInstant(now);
  if (/^\d{1,12}$/.test(value)) {
    const waitSeconds = Number(value);
    return { waitSeconds, retryAtUtc: iso(observedAt + waitSeconds * 1000), format: 'delta-seconds' };
  }
  const match = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) ([A-Z][a-z]{2}) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/.exec(value);
  check(match, 'Enter delta seconds or an IMF-fixdate HTTP date.');
  const [, weekday, day, month, year, hour, minute, second] = match;
  const calendarMonth = MONTHS.indexOf(month) + 1;
  check(calendarMonth && +hour < 24 && +minute < 60 && +second < 60, 'Enter a valid HTTP date.');
  const retryTime = parseDate(+year, calendarMonth, +day) + ((+hour * 60 + +minute) * 60 + +second) * 1000;
  check(new Date(retryTime).toUTCString().startsWith(weekday), 'The HTTP date weekday does not match its date.');
  return { waitSeconds: Math.max(0, Math.ceil((retryTime - observedAt) / 1000)), retryAtUtc: iso(retryTime), format: 'http-date' };
}

function diffStats(text) {
  const input = lines(text);
  const files = [];
  let file = { path: null, hunks: 0, added: 0, removed: 0 };
  let remaining;
  for (let i = 0; i < input.length; i++) {
    const line = input[i];
    if (remaining && (remaining.old || remaining.new)) {
      const code = line[0];
      if (line === '\\ No newline at end of file') continue;
      check(code === ' ' || code === '+' || code === '-', 'Malformed unified diff hunk.');
      if (code !== '+') remaining.old--;
      if (code !== '-') remaining.new--;
      check(remaining.old >= 0 && remaining.new >= 0, 'Hunk content exceeds its declared range.');
      if (code === '+') file.added++;
      if (code === '-') file.removed++;
      continue;
    }
    if (line.startsWith('--- ') && input[i + 1]?.startsWith('+++ ')) {
      if (file.path || file.hunks) files.push(file);
      const oldPath = line.slice(4).split('\t', 1)[0];
      const newPath = input[++i].slice(4).split('\t', 1)[0];
      file = { path: newPath === '/dev/null' ? oldPath : newPath, hunks: 0, added: 0, removed: 0 };
    } else if (line.startsWith('@@')) {
      const match = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@(?: |$)/.exec(line);
      check(match, 'Enter standard unified diff hunk headers.');
      remaining = { old: Number(match[1] ?? 1), new: Number(match[2] ?? 1) };
      file.hunks++;
    }
  }
  check(!remaining || (!remaining.old && !remaining.new), 'Unified diff ends before its hunk is complete.');
  if (file.path || file.hunks) files.push(file);
  check(files.some(item => item.hunks), 'Enter a unified text diff with at least one hunk.');
  return { files, added: files.reduce((n, item) => n + item.added, 0), removed: files.reduce((n, item) => n + item.removed, 0) };
}

function openapiIndex(text) {
  const api = objectJson(text);
  check(typeof api.openapi === 'string' && /^3\./.test(api.openapi) && classifyType(api.paths) === 'object',
    'Enter an OpenAPI 3 JSON document with a paths object.');
  const operations = [];
  const names = new Map();
  for (const [path, pathItem] of Object.entries(api.paths)) {
    if (!path.startsWith('/') || classifyType(pathItem) !== 'object') continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || classifyType(operation) !== 'object') continue;
      const operationId = typeof operation.operationId === 'string' && operation.operationId.trim() ? operation.operationId : null;
      operations.push({ method: method.toUpperCase(), path, operationId });
      if (operationId) names.set(operationId, (names.get(operationId) || 0) + 1);
    }
  }
  return { operationCount: operations.length, operations, missingOperationIds: operations.filter(op => !op.operationId).length,
    duplicateOperationIds: [...names].filter(([, count]) => count > 1).map(([name]) => name) };
}

function resolveDocPath(base, target) {
  const relative = value => !/^(?:[a-z][a-z0-9+.-]*:|\/)|[\\\u0000-\u001f]/i.test(value);
  check(base !== '' && relative(base) && !/[?#]/.test(base) && !base.endsWith('/'), 'Use a repository-relative source document path.');
  check(relative(target), 'Use a relative document destination.');
  const mark = target.search(/[?#]/);
  const path = mark < 0 ? target : target.slice(0, mark);
  const suffix = mark < 0 ? '' : target.slice(mark);
  const output = [];
  const combined = path ? base.split('/').slice(0, -1).concat(path.split('/')) : base.split('/');
  for (const component of combined) {
    if (!component || component === '.') continue;
    if (component === '..') {
      check(output.length, 'Destination goes above the repository root.');
      output.pop();
    } else output.push(component);
  }
  const resolved = output.join('/') + (path.endsWith('/') && output.length ? '/' : '');
  return { repositoryPath: resolved, fragmentOrQuery: suffix, resolvedReference: resolved + suffix };
}

function crc32(text) {
  const bytes = new TextEncoder().encode(text);
  let state = -1;
  for (const byte of bytes) {
    state ^= byte;
    for (let bit = 0; bit < 8; bit++) state = (state >>> 1) ^ (-(state & 1) & 0xedb88320);
  }
  return { crc32: ((state ^ -1) >>> 0).toString(16).padStart(8, '0'), utf8Bytes: bytes.length };
}

function traceability(requirements, mappings) {
  const ids = [...new Set(list(requirements))];
  check(ids.length && ids.length <= 100 && ids.every(id => /^[A-Za-z0-9_.-]+$/.test(id)), 'Enter up to 100 requirement identifiers, one per line.');
  const links = new Map(ids.map(id => [id, new Set()]));
  const unknown = new Set();
  const rows = list(mappings);
  check(rows.length <= 150, 'Enter at most 150 test mappings.');
  for (const row of rows) {
    const m = /^([A-Za-z0-9_.-]+)\s*:\s*([A-Za-z0-9_.-]+(?:\s*,\s*[A-Za-z0-9_.-]+)*)$/.exec(row);
    check(m, 'Use one test ID followed by a colon and comma-separated requirement IDs.');
    for (const id of m[2].split(/\s*,\s*/)) {
      if (links.has(id)) links.get(id).add(m[1]);
      else unknown.add(id);
    }
  }
  const covered = [...links].filter(([, tests]) => tests.size > 0).length;
  return { total: ids.length, covered, uncovered: ids.filter(id => !links.get(id).size), unknown: [...unknown],
    perRequirement: [...links].map(([id, tests]) => ({ id, tests: [...tests] })) };
}

export const tools = [
  entry('compare-semver', ['语义版本比较', 'Compare SemVer versions'],
    ['按 SemVer 2.0 判断两个版本的顺序，支持预发行版本和构建元数据。', 'Compare two SemVer 2.0 versions, including prereleases and build metadata.'],
    [string('left', '左侧版本', 'Left version', 120), string('right', '右侧版本', 'Right version', 120)],
    { left: '1.3.0-rc.2', right: '1.3.0-rc.10' },
    ({ left, right }) => {
      const order = compareSemver(left, right);
      return { order, relation: ['older', 'equivalent', 'newer'][order + 1] };
    }),

  entry('preview-utc-cron', ['UTC 定时任务预览', 'Preview UTC cron schedule'],
    ['预览五字段数字 cron 在未来 366 天内的触发时间。星期日用 0，支持数字、范围和步长。', 'Find upcoming runs within 366 days for numeric five-field cron in UTC. Use 0 for Sunday. Supports lists, ranges and steps.'],
    [string('expression', '五字段 cron（UTC）', 'Five-field cron expression (UTC)', 180),
      string('after', '从此 ISO 时间之后开始', 'After this ISO timestamp', 40),
      integer('count', '返回次数', 'Occurrences to return', 1, 30)],
    { expression: '15 9 * * 1-5', after: '2026-11-20T09:15:00Z', count: 4 },
    ({ expression, after, count }) => cronPreview(expression, after, count)),

  entry('convert-timestamp', ['时间戳转换', 'Convert timestamps'],
    ['输入明确指定的秒、毫秒或带偏移的 ISO 时间，同步得到 UTC、Unix 秒和毫秒。', 'Convert explicitly specified Unix seconds, milliseconds, or an ISO timestamp with an offset into three time formats.'],
    [string('format', '单位（seconds / milliseconds / iso）', 'Input format (seconds, milliseconds, or iso)', 20),
      string('value', '原始时间', 'Time value', 40)],
    { format: 'iso', value: '2026-11-20T10:30:00+08:00' },
    ({ format, value }) => {
      const factor = { seconds: 1000, milliseconds: 1 };
      check(format === 'iso' || Object.hasOwn(factor, format), 'Choose seconds, milliseconds, or iso.');
      if (format !== 'iso') check(/^-?\d{1,16}$/.test(value), 'Use an integer Unix timestamp.');
      const unixMilliseconds = format === 'iso' ? parseInstant(value) : Number(value) * factor[format];
      return { utc: iso(unixMilliseconds), unixSeconds: unixMilliseconds / 1000, unixMilliseconds };
    }),

  entry('iso-week-coordinates', ['ISO 周次计算', 'ISO week coordinates'],
    ['给定日期，计算 ISO 周所属年份、周次、星期和本周周一。', 'Find the ISO week-year, week number, weekday and Monday for a calendar date.'],
    [string('date', '日期（YYYY-MM-DD）', 'Date (YYYY-MM-DD)', 10)],
    { date: '2027-01-01' },
    ({ date }) => {
      const parts = /^(\d{4})-(\d\d)-(\d\d)$/.exec(date);
      check(parts, 'Use YYYY-MM-DD.');
      const time = parseDate(...parts.slice(1).map(Number));
      const weekday = new Date(time).getUTCDay() || 7;
      const thursday = time + (4 - weekday) * DAY;
      const weekYear = new Date(thursday).getUTCFullYear();
      const week = Math.floor((thursday - parseDate(weekYear, 1, 1)) / (7 * DAY)) + 1;
      return { weekYear, week, weekday, monday: iso(time - (weekday - 1) * DAY).split('T')[0] };
    }),

  entry('convert-fixed-offset-time', ['固定时区偏移转换', 'Convert to a fixed UTC offset'],
    ['将指定的时间点转换为固定偏移时间，适合 UTC+08:00 等明确偏移。', 'Convert an instant to a specified fixed UTC offset. Daylight-saving rules are outside this conversion.'],
    [string('instant', '带偏移的 ISO 时间', 'ISO timestamp with offset', 40),
      integer('offsetMinutes', '目标偏移分钟数', 'Target offset in minutes', -720, 840)],
    { instant: '2026-11-20T22:00:00Z', offsetMinutes: 330 },
    ({ instant, offsetMinutes }) => {
      const time = parseInstant(instant);
      const absolute = Math.abs(offsetMinutes);
      const sign = offsetMinutes < 0 ? '-' : '+';
      const offset = sign + [Math.floor(absolute / 60), absolute % 60].map(n => String(n).padStart(2, '0')).join(':');
      return { utc: iso(time), local: iso(time + offsetMinutes * 60_000).replace(/Z$/, offset), offsetMinutes };
    }),

  entry('build-calendar-event', ['生成 iCalendar 日程', 'Build an iCalendar event'],
    ['用标题、开始时间和时长生成一个可导入日历应用的 ICS 日程。', 'Create an importable ICS calendar event from its title, start time, and duration.'],
    [string('summary', '事件标题', 'Event title', 250),
      string('uid', '唯一标识（建议使用事件 ID）', 'Unique event ID', 120),
      string('start', '开始时间（ISO）', 'Start time (ISO)', 40),
      string('created', '生成时间（ISO）', 'Created time (ISO)', 40),
      integer('durationMinutes', '持续时间（分钟）', 'Duration in minutes', 1, 10_080)],
    { summary: '发布复盘', uid: 'release-review-20261120', start: '2026-11-20T18:00:00+08:00',
      created: '2026-11-20T08:00:00Z', durationMinutes: 45 },
    ({ summary, uid, start, created, durationMinutes }) => {
      check(summary.trim() && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(summary) &&
        /^[A-Za-z0-9_@.+-]+$/.test(uid), 'Enter a title and an event ID made of letters, digits, or _@.+-.');
      const toCalendar = value => {
        const stamp = iso(value);
        check(/^\d{4}-/.test(stamp), 'Calendar event requires a four-digit year.');
        return stamp.replace(/[-:]|\.\d{3}/g, '');
      };
      const from = parseInstant(start);
      const event = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Baipiaoji//BPJ Workflow Tools//EN',
        'BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + toCalendar(parseInstant(created)),
        'DTSTART:' + toCalendar(from), 'DTEND:' + toCalendar(from + durationMinutes * 60_000),
        'SUMMARY:' + calendarText(summary), 'END:VEVENT', 'END:VCALENDAR'];
      return { contentType: 'text/calendar; charset=utf-8', ics: event.map(foldCalendarLine).join('\r\n') + '\r\n' };
    }),

  entry('check-object-field-contract', ['JSON 对象字段契约核对', 'Check a JSON object field contract'],
    ['使用字段名到类型的映射，核对样例中的缺失、额外字段及类型差异。检查对象顶层。', 'Compare one sample object with a field-to-type map and report missing, additional, and mistyped top-level fields.'],
    [string('contract', '字段到类型的 JSON 映射', 'JSON field-to-type map', 3000, true),
      string('sample', '待检查的 JSON 对象', 'Sample JSON object', 7000, true)],
    { contract: '{"itemId":"string","priority":"integer","active":"boolean"}',
      sample: '{"itemId":"T-3","priority":2,"active":true}' },
    ({ contract, sample }) => {
      const expected = objectJson(contract);
      const actual = objectJson(sample);
      const missing = [];
      const mismatched = [];
      for (const [field, type] of Object.entries(expected)) {
        check(jsonTypes.includes(type), 'Use object, array, string, number, integer, boolean, or null as field types.');
        if (!Object.hasOwn(actual, field)) missing.push(field);
        else {
          const received = classifyType(actual[field]);
          if (received !== type && !(type === 'number' && received === 'integer')) mismatched.push({ field, expected: type, received });
        }
      }
      const extra = Object.keys(actual).filter(key => !Object.hasOwn(expected, key));
      return { matches: !missing.length && !mismatched.length && !extra.length, missing, mismatched, extra };
    }),

  entry('inspect-import-map', ['模块导入映射检查', 'Inspect module import mappings'],
    ['查询浏览器 import map 的全局 imports，把模块名匹配到精确项或最长路径前缀。', 'Look up bare module names in global import map entries by exact key and longest matching prefix.'],
    [string('map', 'import map JSON 文档', 'Import map JSON document', 8000, true),
      string('specifiers', '模块名，每行一个', 'Bare module specifiers, one per line', 2000, true)],
    { map: '{"imports":{"ui/":"./modules/ui/","ui/theme":"./theme.js","legacy":null}}',
      specifiers: 'ui/theme\nui/button.js\nlegacy\nunknown' },
    ({ map, specifiers }) => inspectImportMap(map, specifiers)),

  entry('plan-json-patch', ['预审 JSON Patch', 'Plan a JSON Patch'],
    ['核对 RFC 6902 操作字段并列出目标和来源路径，便于人工查看变更范围。', 'Validate required RFC 6902 operation fields and list target and source paths for review.'],
    [string('patch', 'JSON Patch 操作数组', 'JSON Patch operation array', 8000, true)],
    { patch: '[{"op":"test","path":"/version","value":1},{"op":"replace","path":"/version","value":2}]' },
    ({ patch }) => patchPlan(patch)),

  entry('environment-variable-coverage', ['环境变量覆盖检查', 'Check environment variable coverage'],
    ['比较公共示例配置声明与部署端现有变量名，列出缺漏。部署端只输入变量名。', 'Compare a public environment template with the variable names present in a deployment. Supply only names for the deployed side.'],
    [string('template', '公开示例配置（.env.example）', 'Public .env.example template', 4000, true),
      string('present', '现有变量名，每行一个', 'Available variable names, one per line', 2500, true)],
    { template: '# Public examples\nMODE=production\nPUBLIC_API_URL=', present: 'MODE\nLOG_LEVEL' },
    ({ template, present }) => {
      const expected = envNames(template, true);
      const available = envNames(present, false);
      return { expectedCount: expected.length, availableCount: available.length,
        missing: expected.filter(name => !available.includes(name)), extra: available.filter(name => !expected.includes(name)) };
    }),

  entry('expand-api-route', ['填充 API 路径参数', 'Expand API route parameters'],
    ['把参数填入相对 API 路径中的占位符，对单个路径段做 URL 编码。', 'Substitute parameters into a relative API route, encoding each inserted path segment.'],
    [string('template', '相对路径模板', 'Relative route template', 300),
      string('parameters', '参数 JSON 对象', 'Parameters as a JSON object', 2500, true)],
    { template: '/v1/projects/{project}/reports/{month}', parameters: '{"project":"季度报告","month":"2026-11"}' },
    ({ template, parameters }) => interpolateRoute(template, objectJson(parameters))),

  entry('build-sql-in-parameters', ['生成 SQL IN 绑定参数', 'Build SQL IN bind parameters'],
    ['将输入值转换为 SQL IN 片段与独立绑定参数，适用于 SQLite 等支持问号占位符的驱动。', 'Build an SQL IN clause and separate bind values for SQLite and other drivers using question-mark placeholders.'],
    [string('values', '字符串或数字组成的 JSON 数组', 'JSON array of strings or numbers', 6500, true)],
    { values: '["editorial","ready",123]' },
    ({ values }) => {
      const parameters = parseJson(values);
      check(Array.isArray(parameters) && parameters.length > 0 && parameters.length <= 100 &&
        parameters.every(value => typeof value === 'string' || Number.isFinite(value)),
      'Enter 1 to 100 strings or finite numbers.');
      return { fragment: 'IN (' + parameters.map(() => '?').join(', ') + ')', parameters, count: parameters.length };
    }),

  entry('inspect-uuid', ['UUID 版本辨识', 'Inspect a UUID'],
    ['从 UUID 文本中识别版本位、变体与 Nil 或 Max 特殊值。', 'Read the version nibble, variant bits, and Nil or Max forms from a UUID.'],
    [string('uuid', '带连字符的 UUID', 'Hyphenated UUID', 36)],
    { uuid: '018d3316-f91a-7c22-9e2d-418b431aaa89' },
    ({ uuid }) => {
      check(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(uuid), 'Use the hyphenated hexadecimal UUID form.');
      const normalized = uuid.toLowerCase();
      const digits = normalized.replaceAll('-', '');
      const special = /^0+$/.test(digits) ? 'nil' : /^f+$/.test(digits) ? 'max' : null;
      const value = Number.parseInt(normalized[19], 16);
      const variant = value < 8 ? 'ncs' : value < 12 ? 'rfc9562' : value < 14 ? 'microsoft' : 'reserved';
      const version = special || variant !== 'rfc9562' ? null : Number.parseInt(normalized[14], 16);
      return { normalized, variant, version, special };
    }),

  entry('check-artifact-paths', ['构建产物路径检查', 'Check artifact path portability'],
    ['检查相对产物路径中的 Windows 禁用名称、过长路径段和大小写或 Unicode 冲突。', 'Check relative artifact paths for Windows-reserved names, oversized segments, and case or Unicode collisions.'],
    [string('paths', '相对文件路径，每行一个', 'Relative file paths, one per line', 8000, true)],
    { paths: 'reports/Summary.md\nreports/summary.md\nexports/con.txt' },
    ({ paths }) => filePaths(paths)),

  entry('summarize-log-severity', ['日志级别摘要', 'Summarize log severity'],
    ['按行统计级别前缀或带时间戳的日志级别，输出分布和无法分类的行数。', 'Count recognized severity prefixes in plain log lines, with optional timestamps, and report the unclassified lines.'],
    [string('log', '日志片段', 'Log excerpt', 8000, true)],
    { log: '2026-11-20T02:00:00Z [INFO] started\n[WARN] slow response\nERROR: timeout' },
    ({ log }) => {
      const totals = { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0, unclassified: 0 };
      const rows = list(log);
      for (const row of rows) {
        const match = /^(?:\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:[.,]\d+)?(?:Z|[+-]\d\d:?\d\d)?\s+)?\[?(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL)(?=\]|:|\s|$)/i.exec(row);
        const level = match ? match[1].toLowerCase().replace('warning', 'warn') : 'unclassified';
        totals[level]++;
      }
      return { lines: rows.length, counts: totals };
    }),

  entry('estimate-base64-size', ['Base64 传输体积估算', 'Estimate Base64 payload size'],
    ['根据原始字节数计算含填充的 Base64 长度、包装开销和是否超出预算。', 'Calculate padded Base64 length, wrapping overhead and whether the encoded payload fits a byte budget.'],
    [integer('bytes', '原始字节数', 'Raw bytes', 0, 2_000_000_000),
      integer('wrapperBytes', '包装字节数', 'Wrapper bytes', 0, 100_000_000),
      integer('budgetBytes', '总字节预算', 'Total byte budget', 0, 3_000_000_000)],
    { bytes: 65_536, wrapperBytes: 64, budgetBytes: 100_000 },
    ({ bytes, wrapperBytes, budgetBytes }) => {
      const encodedBytes = Math.ceil(bytes / 3) * 4;
      const totalBytes = encodedBytes + wrapperBytes;
      return { encodedBytes, totalBytes, overheadBytes: totalBytes - bytes,
        remainingBytes: budgetBytes - totalBytes, fits: totalBytes <= budgetBytes };
    }),

  entry('interpret-retry-after', ['解析 Retry-After', 'Interpret Retry-After'],
    ['解析 HTTP Retry-After 的秒数或 HTTP 日期，换算为等待秒数和 UTC 时间。', 'Convert a Retry-After delta or IMF-fixdate header into a wait duration and UTC timestamp.'],
    [string('header', 'Retry-After 值', 'Retry-After header value', 50),
      string('observed', '收到响应的 ISO 时间', 'Response observation time (ISO)', 40)],
    { header: 'Fri, 20 Nov 2026 02:31:00 GMT', observed: '2026-11-20T02:30:15Z' },
    ({ header, observed }) => parseRetryAfter(header.trim(), observed)),

  entry('summarize-unified-diff', ['统一差异变更统计', 'Summarize a unified diff'],
    ['核对 unified diff 的变更块边界，统计每个文件的增删行。', 'Validate unified diff hunk ranges and count added and deleted lines per file.'],
    [string('diff', '统一差异文本', 'Unified diff text', 8000, true)],
    { diff: '--- a/notes.md\n+++ b/notes.md\n@@ -1,2 +1,3 @@\n Release\n-Old note\n+New note\n+Next step' },
    ({ diff }) => diffStats(diff)),

  entry('index-openapi-operations', ['OpenAPI 操作索引', 'Index OpenAPI operations'],
    ['从 OpenAPI 3 JSON 的 paths 中提取方法和操作 ID，找出缺失或重复的操作 ID。', 'Extract methods and operation IDs from an OpenAPI 3 JSON paths object and spot missing or duplicate IDs.'],
    [string('document', 'OpenAPI 3 JSON 文档', 'OpenAPI 3 JSON document', 9500, true)],
    { document: '{"openapi":"3.1.0","paths":{"/projects":{"get":{"operationId":"listProjects"},"post":{"operationId":"createProject"}}}}' },
    ({ document }) => openapiIndex(document)),

  entry('inventory-package-scripts', ['npm 脚本清单', 'Inventory npm package scripts'],
    ['从 package.json 列出脚本名及其 pre / post 生命周期钩子，便于核对运行顺序。', 'Inspect package.json script names and their pre/post lifecycle hooks to check which scripts would run together.'],
    [string('manifest', 'package.json 内容', 'package.json contents', 9000, true)],
    { manifest: '{"name":"catalog","scripts":{"prebuild":"npm test","build":"node build.js","postbuild":"node verify.js","test":"node --test"}}' },
    ({ manifest }) => {
      const pkg = objectJson(manifest);
      const scripts = pkg.scripts ?? {};
      check(classifyType(scripts) === 'object' && Object.values(scripts).every(value => typeof value === 'string'),
        'The scripts field must be an object of string commands.');
      const names = Object.keys(scripts).sort();
      return { scripts: names.map(name => ({
        name, pre: Object.hasOwn(scripts, 'pre' + name) ? 'pre' + name : null,
        post: Object.hasOwn(scripts, 'post' + name) ? 'post' + name : null
      })), count: names.length };
    }),

  entry('resolve-relative-document-link', ['解析相对文档链接', 'Resolve a relative document link'],
    ['根据源文件和相对链接计算仓库内目标路径，保留查询参数或片段。', 'Resolve a link against its source document to get a repository-relative path and preserve the query or fragment.'],
    [string('source', '源文件路径', 'Source file path', 700),
      string('target', '相对链接', 'Relative link', 700)],
    { source: 'docs/setup/index.md', target: '../reference.md#options' },
    ({ source, target }) => resolveDocPath(source, target)),

  entry('fingerprint-text-crc32', ['文本 CRC32 校验值', 'Calculate a text CRC32 checksum'],
    ['计算 UTF-8 文本的 CRC32 和字节数，便于比较传输前后的内容。', 'Calculate the CRC32 checksum and byte count of UTF-8 text for basic transfer checks. CRC32 is non-cryptographic.'],
    [string('text', '原始文本', 'Raw text', 8000, true)],
    { text: '123456789' },
    ({ text }) => crc32(text)),

  entry('canonicalize-language-tags', ['规范化语言标签', 'Canonicalize language tags'],
    ['规范化语言标签的大小写和常见别名，标出不符合 Unicode Locale 语法的标签。', 'Canonicalize case and recognized aliases in language tags and report entries outside Unicode Locale syntax.'],
    [string('tags', '语言标签，每行一个', 'Language tags, one per line', 1500, true)],
    { tags: 'zh-hans-cn\nen-us\niw-il' },
    ({ tags }) => {
      const entries = list(tags).map(input => {
        try {
          return { input, canonical: Intl.getCanonicalLocales(input)[0] };
        } catch {
          return { input, canonical: null };
        }
      });
      return { entries, invalid: entries.filter(row => row.canonical === null).length };
    }),

  entry('audit-test-traceability', ['验收需求覆盖检查', 'Audit requirements-to-test coverage'],
    ['将用例关联到验收需求，找出缺少覆盖的需求和不存在的引用 ID。', 'Map test cases to acceptance requirements, identify uncovered requirements and unknown references.'],
    [string('requirements', '需求 ID，每行一个', 'Requirement IDs, one per line', 2000, true),
      string('tests', '用例映射，每行 test-id:req1,req2', 'Test mappings, one test-id:req1,req2 per line', 7000, true)],
    { requirements: 'REQ-1\nREQ-2\nREQ-3', tests: 'case-login:REQ-1\ncase-export:REQ-1,REQ-3' },
    ({ requirements, tests }) => traceability(requirements, tests)),

  entry('preview-test-matrix', ['测试矩阵组合预览', 'Preview a test matrix'],
    ['按维度和值计算矩阵组合数，并预览前 16 项，便于估算测试批次。', 'Calculate the number of combinations across test dimensions and preview the first 16 jobs.'],
    [string('dimensions', '维度名称到选项数组的 JSON 对象', 'JSON object mapping dimensions to option arrays', 4500, true)],
    { dimensions: '{"browser":["chromium","firefox"],"locale":["zh","en"],"width":[390,1440]}' },
    ({ dimensions }) => {
      const axes = Object.entries(objectJson(dimensions));
      check(axes.length >= 1 && axes.length <= 10 &&
        axes.every(([name, values]) => name && Array.isArray(values) && values.length <= 30 && values.length > 0 &&
          values.every(value => typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(value)) &&
          new Set(values).size === values.length), 'Use up to ten dimensions with 1–30 unique scalar options each.');
      const combinationCount = axes.reduce((product, [, values]) => product * values.length, 1);
      const preview = [];
      for (let row = 0; row < Math.min(16, combinationCount); row++) {
        let remaining = row;
        const entries = [];
        for (let i = axes.length - 1; i >= 0; i--) {
          const [dimension, values] = axes[i];
          entries.push([dimension, values[remaining % values.length]]);
          remaining = Math.floor(remaining / values.length);
        }
        preview.push(Object.fromEntries(entries.reverse()));
      }
      return { combinationCount, preview };
    })
];
