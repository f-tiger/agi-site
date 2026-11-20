import {
  tool,
  field,
  whole,
  source,
  splitLines,
  parseRows,
  html,
  webUrl,
  unique,
  tally,
} from './editorial-common.mjs';
const tools = [];
const add = (id, z, e, zd, ed, fs, fn) => tools.push(tool(id, z, e, zd, ed, fs, fn));
const srt =
  '1\n00:00:01,000 --> 00:00:03,500\nWelcome to Field Notes.\n\n2\n00:00:04,000 --> 00:00:06,000\nFirst item.';
const vtt =
  'WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nWelcome.\n\n00:00:04.000 --> 00:00:06.000\nFirst item.';
function millis(t, format) {
  const re =
    format === 'srt'
      ? /^(\d{2,}):([0-5]\d):([0-5]\d),(\d{3})$/
      : /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/;
  const m = t.match(re);
  if (!m) throw Error('Invalid subtitle timestamp.');
  const ms = ((+(m[1] || 0) * 60 + +m[2]) * 60 + +m[3]) * 1000 + +m[4];
  if (!Number.isSafeInteger(ms) || ms > 360_000_000) throw Error('Timestamp exceeds 100 hours.');
  return ms;
}
function stamp(ms, format) {
  const pad = (n, k = 2) => String(n).padStart(k, '0');
  return (
    pad(Math.floor(ms / 3_600_000)) +
    ':' +
    pad(Math.floor(ms / 60_000) % 60) +
    ':' +
    pad(Math.floor(ms / 1000) % 60) +
    (format === 'srt' ? ',' : '.') +
    pad(ms % 1000, 3)
  );
}
function cues(text, format = 'srt') {
  const blocks = text
    .trim()
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/);
  if (format === 'vtt' && !/^WEBVTT(?:$|[ \t])/.test(blocks.shift() || ''))
    throw Error('Use a WEBVTT header followed by a blank line.');
  const list = [];
  for (const block of blocks) {
    if (format === 'vtt' && /^NOTE(?:$|[ \t\n])/.test(block)) continue;
    const lines = block.split('\n');
    if (!lines[0].includes('-->')) lines.shift();
    const m = lines.shift()?.match(/^(\S+)\s+-->\s+(\S+)(?:[ \t].*)?$/);
    if (!m || !lines.length) throw Error('Use separated timed cue blocks with caption text.');
    const start = millis(m[1], format),
      end = millis(m[2], format);
    if (end <= start) throw Error('Each cue must end after it begins.');
    list.push({ start, end, text: lines.join('\n') });
  }
  if (!list.length) throw Error('Provide at least one timed cue.');
  return list;
}
function render(a, f) {
  return (
    (f === 'vtt' ? 'WEBVTT\n\n' : '') +
    a
      .map(
        (x, i) =>
          (f === 'srt' ? i + 1 + '\n' : '') +
          stamp(x.start, f) +
          ' --> ' +
          stamp(x.end, f) +
          '\n' +
          x.text,
      )
      .join('\n\n')
  );
}
const oneSrt = (id, z, e, zd, ed, fn) =>
  add(id, z, e, zd, ed, [source(srt)], ({ text }) => fn(cues(text)));
oneSrt(
  'srt-to-webvtt',
  'SRT 字幕转 WebVTT',
  'SRT to WebVTT',
  '将 SRT 时码和多行字幕转换为带文档头的 WebVTT。',
  'Convert SRT cue timings and multiline captions into a WebVTT document.',
  (a) => ({ vtt: render(a, 'vtt') }),
);
add(
  'webvtt-to-srt-cues',
  'WebVTT 字幕转 SRT',
  'WebVTT cues to SRT',
  '转换有时码的 WebVTT 字幕块并生成 SRT 序号，略过 NOTE 注释和位置设置。',
  'Convert timed WebVTT cues to numbered SRT; omit NOTE blocks and positioning settings.',
  [source(vtt)],
  ({ text }) => ({ srt: render(cues(text, 'vtt'), 'srt') }),
);
oneSrt(
  'subtitle-overlap-window',
  '字幕重叠检测',
  'Subtitle overlap windows',
  '按起始时刻排序，检测与此前仍在显示的字幕重叠的部分。',
  'Sort cues by start time and identify overlap with the longest active preceding cue.',
  (a) => {
    const ordered = a.map((c, i) => ({ ...c, cue: i + 1 })).sort((x, y) => x.start - y.start);
    let active = ordered[0],
      overlaps = [];
    for (const c of ordered.slice(1)) {
      if (c.start < active.end)
        overlaps.push({
          earlier: active.cue,
          later: c.cue,
          overlapMs: Math.min(active.end, c.end) - c.start,
        });
      if (c.end > active.end) active = c;
    }
    return { overlaps };
  },
);
oneSrt(
  'subtitle-silence-intervals',
  '字幕间隙清单',
  'Subtitle silence intervals',
  '合并相交字幕时间段后列出首条至末条之间的无字幕间隙。',
  'Merge overlapping cue intervals and report uncovered gaps between the first and final cues.',
  (a) => {
    a.sort((x, y) => x.start - y.start);
    let end = a[0].end;
    const gaps = [];
    for (const c of a.slice(1)) {
      if (c.start > end) gaps.push({ fromMs: end, toMs: c.start, durationMs: c.start - end });
      end = Math.max(end, c.end);
    }
    return { gaps };
  },
);
oneSrt(
  'subtitle-reading-pace',
  '字幕阅读速率',
  'Subtitle reading pace',
  '按每条字幕的可见源字符数及持续时间计算每秒字符数，忽略空白和简单标签。',
  'Compute characters per second for each cue, excluding whitespace and simple inline tags.',
  (a) => ({
    cues: a.map((c, i) => {
      const chars = [...c.text.replace(/<[^>\n]*>/g, '').replace(/\s+/g, '')].length;
      return {
        cue: i + 1,
        characters: chars,
        seconds: (c.end - c.start) / 1000,
        charactersPerSecond: Math.round((chars * 100000) / (c.end - c.start)) / 100,
      };
    }),
  }),
);
add(
  'subtitle-shift-timeline',
  '字幕时间轴平移',
  'Shift subtitle timing',
  '按有符号毫秒偏移平移全部 SRT 字幕，若产生负时码则报告错误。',
  'Shift every SRT cue by a signed millisecond offset and reject negative resulting timestamps.',
  [source(srt), whole('offset', '偏移毫秒', 'Shift in milliseconds', 500, -3600000, 3600000)],
  ({ text, offset }) => {
    const a = cues(text).map((c) => ({ ...c, start: c.start + offset, end: c.end + offset }));
    if (a.some((c) => c.start < 0 || c.end > 360000000))
      throw Error('Resulting timestamp outside 0–100 hours.');
    return { srt: render(a, 'srt') };
  },
);
add(
  'subtitle-clock-drift',
  '字幕时钟漂移校正',
  'Subtitle clock drift correction',
  '以两个片长为比例调整所有字幕时码，四舍五入到毫秒。',
  'Rescale cue times using source and target running lengths and round to milliseconds.',
  [
    source(srt),
    whole('original', '原片时长（秒）', 'Original running time, seconds', 100, 1, 360000),
    whole('target', '目标时长（秒）', 'Target running time, seconds', 105, 1, 360000),
  ],
  ({ text, original, target }) => {
    const a = cues(text).map((c) => ({
      ...c,
      start: Math.round((c.start * target) / original),
      end: Math.round((c.end * target) / original),
    }));
    if (a.some((c) => c.end <= c.start || c.end > 360000000))
      throw Error('Scale collapses or exceeds the supported interval.');
    return { srt: render(a, 'srt') };
  },
);
oneSrt(
  'subtitle-transcript-export',
  '字幕生成文字稿',
  'Subtitle transcript export',
  '移除时码、序号和简单标签，将各字幕块整合成逐行文字稿。',
  'Remove timing, numbering and simple tags and export one transcript line per cue.',
  (a) => ({
    transcript: a
      .map((c) =>
        c.text
          .replace(/<[^>\n]+>/g, '')
          .replace(/\n/g, ' ')
          .trim(),
      )
      .join('\n'),
  }),
);
add(
  'subtitle-line-width-review',
  '字幕行宽检查',
  'Subtitle line width review',
  '以 Unicode 码点检查每条字幕中超过自定义上限的行。',
  'Find individual subtitle lines exceeding a chosen Unicode code point limit.',
  [source(srt), whole('limit', '每行字符上限', 'Characters per line', 18, 1, 500)],
  ({ text, limit }) => ({
    overflows: cues(text).flatMap((c, i) =>
      c.text
        .split('\n')
        .map((t, j) => ({ cue: i + 1, line: j + 1, length: [...t.replace(/<[^>\n]*>/g, '')].length }))
        .filter((r) => r.length > limit),
    ),
  }),
);
add(
  'webvtt-speaker-roster',
  'WebVTT 说话人清单',
  'WebVTT speaker roster',
  '按带名称的 WebVTT voice 标记统计说话人及其出现的字幕数。',
  'Count cues by named WebVTT voice annotations, counting each speaker once per cue.',
  [source('WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<v Robin>Good morning.')],
  ({ text }) => ({
    speakers: tally(
      cues(text, 'vtt').flatMap((c) =>
        unique([...c.text.matchAll(/<v(?:\.[^\s.>]+)*\s+([^>\n]+)>/g)].map((m) => m[1].trim())),
      ),
    ),
  }),
);
const rows = field(
  'rows',
  '原文|译文，每行一对',
  'Source|translation, one pair per line',
  'Menu|Menu du jour\nTea|Thé',
  3500,
);
const from = field('from', '源语言', 'Source language', 'en', 32),
  to = field('to', '目标语言', 'Target language', 'fr', 32);
const langs = (a) => {
  const source = Intl.getCanonicalLocales(a.from)[0],
    target = Intl.getCanonicalLocales(a.to)[0];
  if (source === target) throw Error('Use two distinct languages.');
  return [source, target];
};
add(
  'tmx-memory-export',
  'TMX 翻译记忆导出',
  'TMX translation memory export',
  '根据源语言、目标语言及双语句对生成 TMX 1.4 翻译记忆。',
  'Export bilingual segment pairs in a TMX 1.4 translation memory with explicit source and target languages.',
  [from, to, rows],
  (a) => {
    const [s, t] = langs(a);
    return {
      xml:
        '<tmx version="1.4"><header creationtool="BPJ" creationtoolversion="1" segtype="sentence" o-tmf="plain" adminlang="en" srclang="' +
        html(s) +
        '" datatype="plaintext"/><body>' +
        parseRows(a.rows, 2)
          .map(
            ([x, y]) =>
              '<tu><tuv xml:lang="' +
              html(s) +
              '"><seg>' +
              html(x) +
              '</seg></tuv><tuv xml:lang="' +
              html(t) +
              '"><seg>' +
              html(y) +
              '</seg></tuv></tu>',
          )
          .join('') +
        '</body></tmx>',
    };
  },
);
add(
  'xliff-unit-export',
  'XLIFF 翻译单元导出',
  'XLIFF translation unit export',
  '将资源键、原文和译文编码为 XLIFF 1.2 翻译单元，并检查重复键。',
  'Build XLIFF 1.2 trans-units from keys, source strings and translations and reject duplicate IDs.',
  [from, to, field('strings', '键|原文|译文', 'Key|source|translation', 'menu.title|Menu|Carte', 2500)],
  (a) => {
    const [s, t] = langs(a),
      r = parseRows(a.strings, 3);
    if (unique(r.map((i) => i[0])).length !== r.length) throw Error('Unit IDs must be unique.');
    return {
      xml:
        '<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2"><file original="strings" datatype="plaintext" source-language="' +
        s +
        '" target-language="' +
        t +
        '"><body>' +
        r
          .map(
            ([k, x, y]) =>
              '<trans-unit id="' +
              html(k) +
              '"><source>' +
              html(x) +
              '</source><target>' +
              html(y) +
              '</target></trans-unit>',
          )
          .join('') +
        '</body></file></xliff>',
    };
  },
);
add(
  'gettext-po-pairs',
  'gettext PO 消息导出',
  'GNU gettext PO message export',
  '将单数双语消息序列化为带语言与 UTF-8 文件头的 PO 内容。',
  'Serialize singular bilingual messages as GNU gettext PO entries with language and UTF-8 headers.',
  [to, rows],
  (a) => {
    const lang = Intl.getCanonicalLocales(a.to)[0],
      r = parseRows(a.rows, 2);
    if (unique(r.map((i) => i[0])).length !== r.length) throw Error('Source messages must be unique.');
    return {
      po:
        'msgid ""\nmsgstr ""\n' +
        JSON.stringify('Language: ' + lang + '\n') +
        '\n' +
        JSON.stringify('Content-Type: text/plain; charset=UTF-8\n') +
        '\n\n' +
        r.map(([s, t]) => 'msgid ' + JSON.stringify(s) + '\nmsgstr ' + JSON.stringify(t)).join('\n\n'),
    };
  },
);
add(
  'localization-token-parity',
  '译文参数一致性',
  'Translation argument parity',
  '核对两段文本中简单花括号标识符的名称和重复次数。',
  'Compare names and multiplicities of simple braced identifier tokens in a source string and translation.',
  [
    field('original', '原文', 'Source string', 'Hello {name}, order {id}.', 3500),
    field('translation', '译文', 'Translation', 'Salut {name}.', 3500),
  ],
  (a) => {
    const bag = (s) =>
        new Map(
          tally([...s.matchAll(/\{([A-Za-z_][\w.-]*)\}/g)].map((m) => m[1])).map((x) => [
            x.value,
            x.count,
          ]),
        ),
      s = bag(a.original),
      t = bag(a.translation);
    return {
      differences: unique([...s.keys(), ...t.keys()])
        .filter((k) => s.get(k) !== t.get(k))
        .map((key) => ({ key, source: s.get(key) || 0, target: t.get(key) || 0 })),
    };
  },
);
add(
  'translation-length-expansion',
  '译文长度膨胀率',
  'Translation expansion ratios',
  '逐条计算译文相对于原文的字符长度变化，以排查界面截断风险。',
  'Measure code point length changes for each translated string to spot layout pressure.',
  [rows],
  (a) => ({
    pairs: parseRows(a.rows, 2).map(([s, t]) => ({
      source: s,
      sourceLength: [...s].length,
      targetLength: [...t].length,
      changePercent: Math.round(1000 * ([...t].length / [...s].length - 1)) / 10,
    })),
  }),
);
add(
  'translation-conflict-review',
  '翻译记忆冲突检查',
  'Translation memory conflicts',
  '找出同一原文存在多个不同译文的句对。',
  'Identify source segments mapped to multiple distinct translations in a bilingual list.',
  [
    field(
      'rows',
      '原文|译文，每行一对',
      'Source|translation, one pair per line',
      'Menu|Carte\nMenu|Menu du jour',
      3500,
    ),
  ],
  (a) => {
    const m = new Map();
    for (const [s, t] of parseRows(a.rows, 2)) {
      if (!m.has(s)) m.set(s, new Set());
      m.get(s).add(t);
    }
    return {
      conflicts: [...m]
        .filter(([, v]) => v.size > 1)
        .map(([source, v]) => ({ source, translations: [...v] })),
    };
  },
);
add(
  'localization-key-coverage',
  '语言资源键覆盖',
  'Locale key coverage',
  '比较两个扁平 JSON 资源对象的键，列出缺失、额外和空译文。',
  'Compare flat JSON language dictionaries and report missing, extra and blank target translations.',
  [
    field('base', '源语言 JSON 字典', 'Source JSON dictionary', '{"open":"Open","save":"Save"}', 3500),
    field('target', '目标语言 JSON 字典', 'Target JSON dictionary', '{"open":"Ouvrir"}', 3500),
  ],
  (a) => {
    const read = (s) => {
        const o = JSON.parse(s);
        if (
          !o ||
          Array.isArray(o) ||
          typeof o !== 'object' ||
          Object.values(o).some((v) => typeof v !== 'string')
        )
          throw Error('Use a flat JSON object containing strings.');
        return o;
      },
      s = read(a.base),
      t = read(a.target);
    return {
      missing: Object.keys(s).filter((k) => !Object.hasOwn(t, k)),
      extra: Object.keys(t).filter((k) => !Object.hasOwn(s, k)),
      blank: Object.keys(t).filter((k) => !t[k].trim()),
    };
  },
);
add(
  'pseudo-locale-preview',
  '界面伪本地化预览',
  'Pseudo-localize UI copy',
  '为英文元音加重音并扩展字符串长度，保留简单花括号参数。',
  'Accent English vowels and expand text length for UI testing, preserving simple braced arguments.',
  [source('Open {name}'), whole('growth', '膨胀百分比', 'Expansion percent', 30, 0, 100)],
  ({ text, growth }) => {
    const map = { a: 'á', e: 'ë', i: 'î', o: 'ö', u: 'ü', A: 'Á', E: 'Ë', I: 'Î', O: 'Ö', U: 'Ü' };
    let chars = 0;
    const transformed = text
      .split(/(\{[A-Za-z_][\w.-]*\})/g)
      .map((x, i) => {
        if (i % 2) return x;
        chars += [...x].length;
        return x.replace(/[aeiou]/gi, (c) => map[c]);
      })
      .join('');
    return { preview: '[' + transformed + '~'.repeat(Math.ceil((chars * growth) / 100)) + ']' };
  },
);
add(
  'locale-plural-samples',
  '复数规则样例分组',
  'Locale plural category samples',
  '按指定语言的基数复数规则对输入数值分组。',
  'Group supplied numeric samples by cardinal plural category for the requested locale.',
  [to, field('numbers', '数字，以逗号分隔', 'Comma-separated numeric samples', '0, 1, 2, 5, 11', 1000)],
  (a) => {
    if (!Intl.PluralRules.supportedLocalesOf([a.to]).length) throw Error('Unsupported plural locale.');
    const rule = new Intl.PluralRules(a.to),
      parts = a.numbers.split(',').map((s) => s.trim());
    if (parts.some((n) => !/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(n) || !Number.isFinite(Number(n))))
      throw Error('Use comma-separated decimal numbers.');
    return { samples: parts.map((n) => ({ number: Number(n), category: rule.select(Number(n)) })) };
  },
);
add(
  'bidi-isolate-fields',
  '双向文本字段隔离',
  'Bidirectional field isolation',
  '在每个非空行两侧插入 Unicode FSI/PDI 隔离符，返回可复核的转义表示。',
  'Wrap each nonempty field with Unicode FSI/PDI isolates and include an escaped representation for inspection.',
  [source('Field 24\nOrder 72')],
  ({ text }) => {
    const lines = splitLines(text).filter((x) => x.trim());
    return {
      fields: lines.map((x) => '\u2068' + x + '\u2069'),
      escaped: lines.map((x) => '\\u2068' + x + '\\u2069'),
    };
  },
);
const title = field('title', '作品标题', 'Work title', 'City Notes', 220),
  authors = field(
    'authors',
    '作者，每行一位，姓|名',
    'Authors, one family|given name per line',
    'Lane|Robin\nRay|Taylor',
    1300,
  ),
  year = whole('year', '出版年份', 'Publication year', 2026, 1, 9999);
const creator = (a) => parseRows(a.authors, 2).map(([family, given]) => ({ family, given }));
add(
  'csl-journal-record',
  '期刊 CSL-JSON 记录',
  'CSL-JSON journal record',
  '把作者姓名、期刊、卷和年份编码为引用管理器可读的 CSL-JSON。',
  'Encode structured authors, journal, volume and year as a CSL-JSON journal article record.',
  [
    title,
    authors,
    year,
    field('journal', '期刊', 'Journal', 'City Studies', 180),
    field('volume', '卷', 'Volume', '12', 32),
  ],
  (a) => ({
    record: {
      id: 'record-1',
      type: 'article-journal',
      title: a.title,
      author: creator(a),
      'container-title': a.journal,
      volume: a.volume,
      issued: { 'date-parts': [[a.year]] },
    },
  }),
);
add(
  'ris-citation-import',
  'RIS 文献导入',
  'RIS citation reader',
  '解析以 TY/ER 包围的 RIS 记录，保留重复字段与续行。',
  'Parse RIS records delimited by TY and ER and preserve repeated tags and continuation lines.',
  [source('TY  - JOUR\nTI  - City Notes\nAU  - Lane, Robin\nER  -')],
  ({ text }) => {
    const records = [];
    let current = null,
      last;
    for (const line of splitLines(text)) {
      if (!line.trim()) continue;
      const m = line.match(/^([A-Z0-9]{2})  -\s?(.*)$/);
      if (!m) {
        if (!current || !last || !/^\s/.test(line)) throw Error('Invalid RIS line.');
        const arr = current[last];
        arr[arr.length - 1] += ' ' + line.trim();
        continue;
      }
      const [, tag, val] = m;
      if (tag === 'TY') {
        if (current) throw Error('Unclosed RIS record.');
        current = Object.create(null);
      }
      if (!current) throw Error('Expected TY at start.');
      if (tag === 'ER') {
        records.push(current);
        current = null;
        last = null;
      } else {
        (current[tag] ??= []).push(val);
        last = tag;
      }
    }
    if (current || !records.length) throw Error('Incomplete RIS record.');
    return { records };
  },
);
add(
  'bibtex-book-entry',
  '图书 BibTeX 记录',
  'BibTeX book entry',
  '使用引用键、作者姓与名、年份和出版社生成图书 BibTeX。',
  'Generate a BibTeX book entry from a citation key, structured names, year and publisher.',
  [
    title,
    authors,
    year,
    field('key', '引用键', 'Citation key', 'Lane2026', 80),
    field('publisher', '出版社', 'Publisher', 'Civic Press', 160),
  ],
  (a) => {
    if (!/^[\w:.-]+$/.test(a.key)) throw Error('Use a plain citation key.');
    const tex = (s) =>
      s.replace(
        /[\\{}&%$#_^~]/g,
        (c) =>
          ({
            '\\': '\\textbackslash{}',
            '{': '\\{',
            '}': '\\}',
            _: '\\_',
            '&': '\\&',
            '%': '\\%',
            $: '\\$',
            '#': '\\#',
            '^': '\\textasciicircum{}',
            '~': '\\textasciitilde{}',
          })[c],
      );
    return {
      bibtex:
        '@book{' +
        a.key +
        ',\n  title = {' +
        tex(a.title) +
        '},\n  author = {' +
        creator(a)
          .map((p) => tex(p.family) + ', ' + tex(p.given))
          .join(' and ') +
        '},\n  year = {' +
        a.year +
        '},\n  publisher = {' +
        tex(a.publisher) +
        '}\n}',
    };
  },
);
add(
  'doi-reference-inventory',
  '参考文献 DOI 清单',
  'Reference DOI inventory',
  '从文本提取常见 DOI 形式，清除末尾句号或不配对的右括号并去重。',
  'Extract common DOI forms and remove trailing sentence punctuation and unmatched closing parentheses.',
  [source('Read doi:10.1234/notes.2 and https://doi.org/10.5555/abc.')],
  ({ text }) => ({
    dois: unique(
      (text.match(/\b10\.\d{4,9}\/[A-Z0-9._;()/:+-]+/gi) || []).map((raw) => {
        let s = raw.replace(/[.,;:]+$/g, '');
        let left = (s.match(/\(/g) || []).length,
          right = (s.match(/\)/g) || []).length;
        while (right > left && s.endsWith(')')) {
          s = s.slice(0, -1);
          right--;
        }
        return s.toLowerCase();
      }),
    ),
  }),
);
add(
  'citation-initials',
  '作者姓名缩写',
  'Bibliography name initials',
  '按姓和名字段生成带首字母点号的作者形式，保留连字符。',
  'Format family and given names with dotted initials, preserving hyphenated given names.',
  [authors],
  (a) => ({
    authors: creator(a).map(
      ({ family, given }) =>
        family +
        ', ' +
        given
          .split(/\s+/)
          .map((w) =>
            w
              .split('-')
              .map((p) => {
                const l = p.match(/\p{L}/u)?.[0];
                return l ? l.toUpperCase() + '.' : '';
              })
              .join('-'),
          )
          .filter(Boolean)
          .join(' '),
    ),
  }),
);
add(
  'numbered-reference-coverage',
  '数字引文覆盖检查',
  'Numbered reference coverage',
  '将简单方括号数字及短横线范围与逐行编号书目核对。',
  'Cross-check bracketed numeric citations and hyphenated ranges against a numbered bibliography.',
  [
    source('See [1, 3-4].'),
    field(
      'references',
      '以正整数开头的书目，每行一条',
      'Bibliography lines starting with positive numbers',
      '1. City Notes\n2. Field Guide\n3. Data Notes',
      3000,
    ),
  ],
  (a) => {
    const refs = splitLines(a.references).map((l) => {
      const m = l.trim().match(/^\[?(\d{1,5})\]?[.)]?\s+\S/);
      if (!m || +m[1] < 1) throw Error('Begin each bibliography entry with a positive number.');
      return +m[1];
    });
    const used = new Set();
    for (const m of a.text.matchAll(/\[([\d,\s–-]+)\]/g)) {
      for (const item of m[1].split(',')) {
        const r = item.trim().match(/^(\d{1,5})(?:\s*[-–]\s*(\d{1,5}))?$/);
        if (!r) continue;
        const first = +r[1],
          last = +(r[2] || r[1]);
        if (!first || last < first || last - first > 500)
          throw Error('Use ascending citation ranges of up to 501 entries.');
        for (let i = first; i <= last; i++) used.add(i);
      }
    }
    return {
      missing: [...used].filter((x) => !refs.includes(x)),
      uncited: unique(refs.filter((x) => !used.has(x))),
      duplicateNumbers: tally(refs)
        .filter((x) => x.count > 1)
        .map((x) => x.value),
    };
  },
);
add(
  'isbn10-upgrade',
  'ISBN-10 转 ISBN-13',
  'Upgrade ISBN-10 to ISBN-13',
  '先校验 ISBN-10（含 X 校验位），再加上 978 前缀并计算新的校验位。',
  'Validate an ISBN-10 including X check digits, add the 978 prefix and calculate its new ISBN-13 digit.',
  [field('isbn', 'ISBN-10', 'ISBN-10', '0-306-40615-2', 32)],
  (a) => {
    const s = a.isbn.replace(/[ -]/g, '').toUpperCase();
    if (
      !/^\d{9}[\dX]$/.test(s) ||
      [...s].reduce((n, c, i) => n + (c === 'X' ? 10 : Number(c)) * (10 - i), 0) % 11 !== 0
    )
      throw Error('Invalid ISBN-10 or check digit.');
    const body = '978' + s.slice(0, 9),
      sum = [...body].reduce((n, c, i) => n + Number(c) * (i % 2 ? 3 : 1), 0);
    return { isbn13: body + ((10 - (sum % 10)) % 10) };
  },
);
add(
  'reference-title-filing-order',
  '书名排序键',
  'Title filing order',
  '忽略开头的英语冠词、大小写与拉丁重音，生成书名排序键并排序。',
  'Sort English titles by filing keys that omit initial articles, case and Latin diacritics.',
  [source('The City\nA Field Guide\nAtlas')],
  ({ text }) => ({
    titles: splitLines(text)
      .filter((x) => x.trim())
      .map((title) => ({
        title,
        key: title
          .trim()
          .toLowerCase()
          .replace(/^(?:the|an|a)\s+/, '')
          .normalize('NFD')
          .replace(/(\p{Script=Latin})\p{M}+/gu, '$1'),
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
  }),
);
add(
  'author-year-disambiguation',
  '作者年份消歧后缀',
  'Author-year citation disambiguation',
  '把同组作者与年份的作品按标题顺序分配 a、b 等引用后缀。',
  'Assign letter suffixes to works sharing an author and year, using title order within each group.',
  [
    field(
      'works',
      '作者|年份|标题，每行一条',
      'Author|year|title, one work per line',
      'Lane|2026|Field Notes\nLane|2026|City Guide',
      3000,
    ),
  ],
  (a) => {
    const all = parseRows(a.works, 3).map(([author, year, title]) => {
      if (!/^\d{4}$/.test(year)) throw Error('Use a four-digit year.');
      return { author, year, title };
    });
    const groups = new Map();
    for (const row of all) {
      const k = JSON.stringify([row.author, row.year]);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(row);
    }
    for (const g of groups.values()) {
      g.sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
      g.forEach((r, i) => {
        let letter = '',
          n = i + 1;
        while (n) {
          n--;
          letter = String.fromCharCode(97 + (n % 26)) + letter;
          n = Math.floor(n / 26);
        }
        r.citation = r.author + ' ' + r.year + (g.length > 1 ? letter : '');
      });
    }
    return { works: all };
  },
);
add(
  'web-citation-access-log',
  '网络引用访问记录',
  'Web citation access log',
  '校验网页来源的访问日期和 URL，按日期生成访问记录表。',
  'Validate source URLs and calendar access dates and sort the resulting citation log chronologically.',
  [
    field(
      'records',
      '标题|网址|访问日期，每行一条',
      'Title|URL|access date, one source per line',
      'Field Notes|https://example.org/notes|2026-10-04',
      3000,
    ),
  ],
  (a) => ({
    sources: parseRows(a.records, 3)
      .map(([title, url, accessed]) => {
        const ms = Date.parse(accessed + 'T00:00:00Z');
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(accessed) ||
          !Number.isFinite(ms) ||
          new Date(ms).toISOString().slice(0, 10) !== accessed
        )
          throw Error('Use a valid YYYY-MM-DD access date.');
        return { title, url: webUrl(url), accessed };
      })
      .sort((a, b) => (a.accessed < b.accessed ? -1 : a.accessed > b.accessed ? 1 : 0)),
  }),
);
export { tools };
