import { define as d, string as s, requireValue as check, json, record, stable } from './developer-common.mjs';

const document = s(
  'document',
  'JSON 文档',
  'JSON document',
  '{"api":{"port":8080,"flags":["beta",null],"mode":"live","legacy":null},"cache":{},"tag":"v2"}',
  6000,
  json,
);
const object = s('object', 'JSON 对象', 'JSON object', '{"api.port":8080,"mode":"live"}', 6000, (text) => {
  const obj = json(text);
  check(record(obj), 'Enter a JSON object.');
  return obj;
});
const pathPart = (value) => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
const field = s('field', '字段名称', 'Field name', 'mode', 100);
const type = (value) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value);
function visit(value, fn, path = '', depth = 0) {
  fn(value, path, depth);
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) visit(item, fn, path + '/' + pathPart(key), depth + 1);
  }
}
function transform(value, apply) {
  if (Array.isArray(value)) return value.map((item) => transform(item, apply));
  if (!record(value)) return value;
  return Object.fromEntries(apply(Object.entries(value)).map(([key, item]) => [key, transform(item, apply)]));
}
function pointerFilter(value, predicate) {
  const paths = [];
  visit(value, (item, pointer, depth) => {
    if (predicate(item, depth)) paths.push(pointer);
  });
  return { paths };
}
const props = s('keys', '字段名 JSON 数组', 'JSON array of field names', '["mode","enabled"]', 1500, (text) => {
  const keys = json(text);
  check(Array.isArray(keys) && keys.every((k) => typeof k === 'string'), 'Enter a JSON array of strings.');
  return keys;
});
function schema(value) {
  if (Array.isArray(value)) {
    const variants = [...new Set(value.map((item) => JSON.stringify(schema(item))))].map((str) =>
      JSON.parse(str),
    );
    return {
      type: 'array',
      ...(variants.length ? { items: variants.length === 1 ? variants[0] : { anyOf: variants } } : {}),
    };
  }
  if (record(value))
    return {
      type: 'object',
      properties: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, schema(v)])),
      required: Object.keys(value),
    };
  return { type: Number.isInteger(value) ? 'integer' : type(value) };
}
export const tools = [
  d(
    'json-node-census',
    'JSON 节点计数',
    'JSON node census',
    '分别计数每种 JSON 节点并给出最大深度。',
    'Count nodes by JSON type and report the deepest level.',
    [document],
    (doc) => {
      const counts = {};
      let maxDepth = 0;
      visit(doc, (v, p, depth) => {
        counts[type(v)] = (counts[type(v)] || 0) + 1;
        maxDepth = Math.max(maxDepth, depth);
      });
      return { counts, maxDepth };
    },
  ),
  d(
    'json-null-locations',
    '定位 JSON 空值',
    'Locate JSON nulls',
    '返回所有 null 值的 RFC 6901 指针。',
    'Return RFC 6901 pointers to every explicit null.',
    [document],
    (doc) => pointerFilter(doc, (v) => v === null),
  ),
  d(
    'json-empty-containers',
    '查找空 JSON 容器',
    'Find empty JSON containers',
    '列出没有成员的对象和数组路径。',
    'List paths of empty objects and arrays.',
    [document],
    (doc) => pointerFilter(doc, (v) => v !== null && typeof v === 'object' && !Object.keys(v).length),
  ),
  d(
    'json-remove-null-members',
    '清除对象中的空值字段',
    'Remove null-valued object members',
    '递归删除值为 null 的对象字段，保留数组位置。',
    'Recursively remove object fields containing null while retaining array positions.',
    [document],
    (doc) => ({ document: transform(doc, (entries) => entries.filter(([, v]) => v !== null)) }),
  ),
  d(
    'json-redact-field',
    '遮盖指定 JSON 字段',
    'Redact a named JSON field',
    '递归将同名字段值替换为固定遮盖文本。',
    'Replace values of every matching object key with a redaction marker.',
    [document, field],
    (doc, f) => ({
      document: transform(doc, (entries) => entries.map(([k, v]) => [k, k === f ? '[redacted]' : v])),
    }),
  ),
  d(
    'json-retain-root-keys',
    '保留指定顶层字段',
    'Project root object keys',
    '选择存在的顶层字段，并列出缺少的字段。',
    'Select requested root fields and identify absent ones.',
    [object, props],
    (o, keys) => ({
      object: Object.fromEntries(keys.filter((k) => Object.hasOwn(o, k)).map((k) => [k, o[k]])),
      missing: keys.filter((k) => !Object.hasOwn(o, k)),
    }),
  ),
  d(
    'json-rename-root-key',
    '重命名顶层字段',
    'Rename a root object key',
    '在检查名称冲突后为一个顶层字段改名。',
    'Rename a top-level key after checking the source and destination.',
    [object, field, s('target', '新名称', 'New name', 'stage', 100)],
    (o, f, t) => {
      check(
        Object.hasOwn(o, f) && (!Object.hasOwn(o, t) || t === f),
        'Missing source or destination already exists.',
      );
      return { object: Object.fromEntries(Object.entries(o).map(([k, v]) => [k === f ? t : k, v])) };
    },
  ),
  d(
    'json-object-defaults',
    '填充默认配置',
    'Fill missing config defaults',
    '只给缺少的顶层键补上默认值，保留显式空值。',
    'Fill absent top-level config keys and preserve explicit null values.',
    [object, s('defaults', '默认对象', 'Default object', '{"mode":"dev","region":"east"}', 3000, json)],
    (o, defaults) => {
      check(record(defaults), 'Defaults must be an object.');
      return { object: { ...defaults, ...o } };
    },
  ),
  d(
    'json-pointer-encode',
    '生成 JSON 指针',
    'Build a JSON pointer',
    '将键段数组编码为可表示斜杠和波浪号的 JSON 指针。',
    'Encode path segments as an RFC 6901 pointer with slash and tilde escaping.',
    [props],
    (keys) => ({ pointer: keys.map((key) => '/' + pathPart(key)).join('') }),
  ),
  d(
    'json-pointer-segments',
    '拆解 JSON 指针',
    'Parse JSON pointer segments',
    '验证 RFC 6901 的转义规则并返回原始键段。',
    'Validate RFC 6901 escape sequences and recover the original key segments.',
    [s('pointer', 'JSON 指针', 'JSON pointer', '/a~1b/~0version', 500)],
    (p) => {
      check(!p || (p.startsWith('/') && !/~(?![01])/.test(p)), 'Invalid JSON pointer.');
      return {
        segments: p
          ? p
              .slice(1)
              .split('/')
              .map((x) => x.replaceAll('~1', '/').replaceAll('~0', '~'))
          : [],
      };
    },
  ),
  d(
    'json-infer-schema',
    '从示例推断 JSON Schema',
    'Infer a JSON Schema from a sample',
    '从示例推断类型、成员和混合数组变体，标记样本中出现的字段。',
    'Infer types, observed required keys and array variants from one example.',
    [document],
    (doc) => ({ schema: schema(doc) }),
  ),
  d(
    'json-size-breakdown',
    '顶层 JSON 字节分布',
    'Measure JSON field sizes',
    '逐项计算紧凑 JSON 值的 UTF-8 字节数。',
    'Measure UTF-8 bytes of each compactly serialized top-level value.',
    [object],
    (obj) => ({
      fields: Object.entries(obj)
        .map(([key, v]) => ({ key, bytes: new TextEncoder().encode(JSON.stringify(v)).length }))
        .sort((a, b) => b.bytes - a.bytes),
    }),
  ),
  d(
    'json-string-inventory',
    '提取 JSON 字符串',
    'Inventory JSON strings',
    '列出字符串值及其字段位置，保留重复项。',
    'List string values and their pointers, retaining repeated occurrences.',
    [document],
    (doc) => {
      const strings = [];
      visit(doc, (v, path) => {
        if (typeof v === 'string') strings.push({ path, value: v });
      });
      return { strings };
    },
  ),
  d(
    'json-text-sequence',
    '生成 JSON 文本序列',
    'Build an RFC 7464 JSON text sequence',
    '将数组成员逐条写为带记录分隔符和换行的 JSON 文本序列。',
    'Frame each member of a JSON array with an ASCII record separator and line feed for RFC 7464 interchange.',
    [s('records', '记录 JSON 数组', 'JSON array of records', '[{"id":1},{"id":2}]', 6000, json)],
    (items) => {
      check(Array.isArray(items), 'Supply a JSON array of records.');
      return { sequence: items.map((v) => '\u001e' + JSON.stringify(v) + '\n').join(''), records: items.length };
    },
  ),
  d(
    'json-array-unique-values',
    'JSON 数组结构去重',
    'Deduplicate structured array values',
    '按结构保留数组中每个值的首次出现。',
    'Keep the first occurrence of each structurally equal array value.',
    [s('array', 'JSON 数组', 'JSON array', '[{"id":1},{"id":2},{"id":1}]', 5000, json)],
    (a) => {
      check(Array.isArray(a), 'Enter a JSON array.');
      const seen = new Set();
      return {
        array: a.filter((v) => {
          const k = JSON.stringify(stable(v));
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }),
      };
    },
  ),
  d(
    'json-zip-keys-values',
    '组合 JSON 键和值',
    'Zip JSON keys with values',
    '将等长的唯一键列表和值列表组合为对象。',
    'Pair equally sized key and value arrays to form an object.',
    [props, s('values', '值数组', 'Values array', '["live",true]', 3000, json)],
    (keys, values) => {
      check(
        Array.isArray(values) && keys.length === values.length && new Set(keys).size === keys.length,
        'Use unique keys and one value per key.',
      );
      return { object: Object.fromEntries(keys.map((k, i) => [k, values[i]])) };
    },
  ),
  d(
    'json-invert-string-map',
    '反转字符串映射',
    'Invert a JSON string map',
    '交换键和值，使用数组保留多个键映射到同一值的情况。',
    'Group original keys under each mapped string value, retaining collisions.',
    [s('map', '字符串映射', 'String map', '{"a":"team","b":"team","c":"ops"}', 5000, json)],
    (o) => {
      check(record(o) && Object.values(o).every((v) => typeof v === 'string'), 'Use an object of string values.');
      const map = new Map();
      for (const [k, v] of Object.entries(o)) {
        if (!map.has(v)) map.set(v, []);
        map.get(v).push(k);
      }
      return { inverted: Object.fromEntries(map) };
    },
  ),
  d(
    'json-dot-keys-nest',
    '展开点号配置键',
    'Expand dotted config keys',
    '按点号拆分顶层配置键并检测路径冲突。',
    'Nest dotted root keys into objects and reject colliding paths.',
    [object],
    (o) => {
      const root = Object.create(null),
        branches = new WeakSet([root]);
      for (const [key, v] of Object.entries(o)) {
        const parts = key.split('.');
        check(parts.length <= 16 && parts.every(Boolean), 'Invalid dotted key.');
        let cursor = root;
        for (const part of parts.slice(0, -1)) {
          if (!Object.hasOwn(cursor, part)) {
            cursor[part] = Object.create(null);
            branches.add(cursor[part]);
          }
          check(branches.has(cursor[part]), 'Overlapping paths.');
          cursor = cursor[part];
        }
        const last = parts.at(-1);
        check(!Object.hasOwn(cursor, last), 'Overlapping paths.');
        cursor[last] = v;
      }
      return { object: root };
    },
  ),
  d(
    'json-schema-enum',
    '生成枚举约束',
    'Build a JSON Schema enum',
    '以 JSON 数组的不同值创建枚举约束。',
    'Build a JSON Schema enum from distinct values in a nonempty array.',
    [s('values', '候选值数组', 'Candidate value array', '["north","south","north"]', 3000, json)],
    (v) => {
      check(Array.isArray(v) && v.length > 0, 'Enter a nonempty array.');
      return { schema: { enum: [...new Map(v.map((item) => [JSON.stringify(stable(item)), item])).values()] } };
    },
  ),
  d(
    'json-leaf-depths',
    'JSON 叶节点深度分布',
    'Profile JSON leaf depths',
    '按深度统计标量叶节点，帮助识别嵌套负担。',
    'Count scalar leaves at each depth to inspect nesting complexity.',
    [document],
    (doc) => {
      const depths = {};
      visit(doc, (v, p, depth) => {
        if (v === null || typeof v !== 'object') depths[depth] = (depths[depth] || 0) + 1;
      });
      return { depths };
    },
  ),
];
