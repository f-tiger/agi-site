import { tool, source, field, whole, splitLines, tally, unique } from './editorial-common.mjs';

const tools = [];
const one = (id, zh, en, zdesc, desc, sample, fn) =>
  tools.push(tool(id, zh, en, zdesc, desc, [source(sample)], ({ text }) => fn(text)));
const withFields = (id, zh, en, zdesc, desc, fields, fn) =>
  tools.push(tool(id, zh, en, zdesc, desc, fields, fn));
let graphemes;
const graphemeSegments = (s) =>
  (graphemes ??= new Intl.Segmenter('en', { granularity: 'grapheme' })).segment(s);
const segment = (s) => Array.from(graphemeSegments(s), (x) => x.segment);
const cp = (n) => 'U+' + n.toString(16).toUpperCase().padStart(4, '0');
one(
  'grapheme-boundaries',
  '字形簇边界',
  'Grapheme boundaries',
  '按字形簇列出 UTF-16 起止位置，保留组合字符和表情序列。',
  'List UTF-16 start and end offsets of grapheme clusters, preserving combining marks and emoji sequences.',
  'Cafe\u0301!',
  (s) => ({
    clusters: Array.from(new Intl.Segmenter('en').segment(s), (x) => ({
      text: x.segment,
      start: x.index,
      end: x.index + x.segment.length,
    })).slice(0, 400),
  }),
);
one(
  'unicode-scalar-inventory',
  'Unicode 码点清单',
  'Unicode scalar inventory',
  '按出现频次显示字符及其十六进制码点。',
  'Group characters by Unicode code point and list their frequencies.',
  'Café à Paris',
  (s) => ({
    characters: tally([...s])
      .slice(0, 400)
      .map((x) => ({ ...x, code: cp(x.value.codePointAt(0)) })),
  }),
);
one(
  'normalization-forms',
  'Unicode 规范化对照',
  'Unicode normalization comparison',
  '比较 NFC、NFD、NFKC 和 NFKD 形式及其码点长度。',
  'Compare NFC, NFD, NFKC and NFKD text and code point lengths.',
  'Cafe\u0301 ①',
  (s) => ({
    forms: Object.fromEntries(
      ['NFC', 'NFD', 'NFKC', 'NFKD'].map((f) => [
        f,
        { text: s.normalize(f), length: [...s.normalize(f)].length },
      ]),
    ),
  }),
);
one(
  'diacritic-fold',
  '拉丁字母重音折叠',
  'Latin diacritic folding',
  '移除拉丁字母后的组合重音，保留其他文字的组合符。',
  'Remove combining marks attached to Latin letters while preserving marks in other scripts.',
  'Crème brûlée',
  (s) => ({
    text: s
      .normalize('NFD')
      .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
      .normalize('NFC'),
  }),
);
one(
  'unicode-script-profile',
  '文字系统分布',
  'Writing system profile',
  '统计常见 Unicode 文字系统字符以及其他字符。',
  'Count characters from common Unicode scripts, with remaining characters grouped separately.',
  'Beta βeta 123',
  (s) => {
    const names = [
      'Latin',
      'Greek',
      'Cyrillic',
      'Arabic',
      'Hebrew',
      'Devanagari',
      'Han',
      'Hiragana',
      'Katakana',
      'Hangul',
      'Thai',
      'Common',
      'Inherited',
    ];
    const rules = names.map((name) => [name, new RegExp('\\p{Script=' + name + '}', 'u')]);
    return { scripts: tally([...s].map((c) => rules.find(([, re]) => re.test(c))?.[0] || 'Other')) };
  },
);
one(
  'unicode-category-profile',
  '字符通用类别统计',
  'Unicode category profile',
  '按字母、附加符、数字、标点、符号、分隔符及其他类别汇总字符。',
  'Count characters in the seven top-level Unicode general categories.',
  'Score 9.5 ★',
  (s) => ({
    categories: tally(
      [...s].map((c) =>
        /\p{L}/u.test(c)
          ? 'Letter'
          : /\p{M}/u.test(c)
            ? 'Mark'
            : /\p{N}/u.test(c)
              ? 'Number'
              : /\p{P}/u.test(c)
                ? 'Punctuation'
                : /\p{S}/u.test(c)
                  ? 'Symbol'
                  : /\p{Z}/u.test(c)
                    ? 'Separator'
                    : 'Other',
      ),
    ),
  }),
);
one(
  'unicode-escape-sequence',
  'Unicode 码点转义',
  'Unicode code point escapes',
  '将每个码点表示为 JavaScript 花括号 Unicode 转义序列。',
  'Represent every code point as a JavaScript braced Unicode escape.',
  'A🪴',
  (s) => ({ escaped: [...s].map((c) => '\\u{' + c.codePointAt(0).toString(16) + '}').join('') }),
);
one(
  'decode-codepoint-list',
  '码点列表还原文本',
  'Decode a code point list',
  '把空格分隔的十六进制码点还原为 Unicode 文本，拒绝代理码点。',
  'Decode whitespace-separated hexadecimal scalar values and reject surrogate code points.',
  'U+0041 U+1F33F',
  (s) => {
    const values = s
      .trim()
      .split(/\s+/u)
      .map((x) => {
        if (!/^(?:U\+|0x)?[0-9a-f]{1,6}$/i.test(x)) throw Error('Invalid hexadecimal code point.');
        const n = parseInt(x.replace(/^(?:U\+|0x)/i, ''), 16);
        if (n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) throw Error('Invalid Unicode scalar value.');
        return n;
      });
    return { text: String.fromCodePoint(...values) };
  },
);
one(
  'utf8-byte-histogram',
  'UTF-8 字节宽度分布',
  'UTF-8 width histogram',
  '计算占用一至四个 UTF-8 字节的码点数量及其总字节数。',
  'Count code points by their UTF-8 byte width and report the total byte count.',
  'Café 🌿',
  (s) => {
    const widths = [0, 0, 0, 0];
    for (const c of s) {
      const n = c.codePointAt(0);
      widths[n <= 127 ? 0 : n <= 2047 ? 1 : n <= 65535 ? 2 : 3]++;
    }
    return { widths, total: widths.reduce((n, x, i) => n + x * (i + 1), 0) };
  },
);
withFields(
  'truncate-grapheme-budget',
  '按字形簇截断',
  'Truncate to a grapheme budget',
  '按可见字形数量截断；需要截断时省略号占一个名额。',
  'Truncate at a grapheme boundary and count the ellipsis inside the supplied limit.',
  [source('Cafe\u0301 menu'), whole('limit', '字形上限', 'Grapheme limit', 5, 1, 6000)],
  ({ text, limit }) => {
    const a = segment(text);
    return {
      text: a.length > limit ? a.slice(0, limit - 1).join('') + '…' : text,
      truncated: a.length > limit,
    };
  },
);
withFields(
  'truncate-utf8-budget',
  '按 UTF-8 字节截断',
  'Truncate to a UTF-8 budget',
  '在完整码点结束处截断文本并报告已用字节。',
  'Fit text into a UTF-8 byte budget without cutting a code point.',
  [source('Café in Paris'), whole('bytes', '字节上限', 'Byte limit', 5, 1, 24000)],
  ({ text, bytes }) => {
    let result = '',
      used = 0;
    const encoder = new TextEncoder();
    for (const c of text) {
      const n = encoder.encode(c).length;
      if (used + n > bytes) break;
      result += c;
      used += n;
    }
    return { text: result, used };
  },
);
one(
  'newline-inventory',
  '换行符格式检测',
  'Line ending inventory',
  '区分 CRLF、LF 和 CR 并检查文末是否有换行。',
  'Count CRLF, LF and CR line endings and detect a final newline.',
  'A\r\nB\nC',
  (s) => {
    const crlf = (s.match(/\r\n/g) || []).length;
    return {
      crlf,
      lf: (s.match(/\n/g) || []).length - crlf,
      cr: (s.match(/\r/g) || []).length - crlf,
      finalNewline: /[\r\n]$/.test(s),
    };
  },
);
one(
  'indentation-profile',
  '行缩进分布',
  'Line indentation profile',
  '统计以空格、制表符或混合前缀缩进的非空行。',
  'Count nonblank lines by space, tab, mixed or absent indentation.',
  'Menu\n  Salad\n\tTea',
  (s) => ({
    indentation: tally(
      splitLines(s)
        .filter((l) => l.trim())
        .map((l) => {
          const i = l.match(/^[ \t]*/)[0];
          return !i
            ? 'none'
            : i.includes(' ') && i.includes('\t')
              ? 'mixed'
              : i.includes(' ')
                ? 'spaces'
                : 'tabs';
        }),
    ),
  }),
);
one(
  'strip-common-indent',
  '移除公共缩进',
  'Remove common indentation',
  '从各非空行移除完全相同的公共空白前缀。',
  'Remove the longest identical leading whitespace prefix shared by all nonblank lines.',
  '  menu\n    tea\n  end',
  (s) => {
    const lines = splitLines(s),
      prefixes = lines.filter((x) => x.trim()).map((x) => x.match(/^[ \t]*/)[0]);
    let p = prefixes[0];
    for (const other of prefixes) {
      let i = 0;
      while (i < p.length && p[i] === other[i]) i++;
      p = p.slice(0, i);
    }
    return { prefix: p, text: lines.map((l) => (l.startsWith(p) ? l.slice(p.length) : l)).join('\n') };
  },
);
withFields(
  'expand-tab-stops',
  '按制表位展开',
  'Expand tab stops',
  '按列将制表符替换为空格，每个 Unicode 码点计一列。',
  'Expand tabs to the next tab stop, counting one column per Unicode code point.',
  [source('Name\tQty\nTea\t2'), whole('width', '制表宽度', 'Tab width', 4, 1, 12)],
  ({ text, width }) => ({
    text: splitLines(text)
      .map((line) => {
        let col = 0,
          out = '';
        for (const c of line) {
          const n = c === '\t' ? width - (col % width) : 1;
          out += c === '\t' ? ' '.repeat(n) : c;
          col += n;
        }
        return out;
      })
      .join('\n'),
  }),
);
one(
  'line-length-distribution',
  '行宽分布',
  'Line length distribution',
  '用 Unicode 码点计算行宽，报告最短、最长、平均值以及最长行号。',
  'Measure line width in code points and report minimum, maximum, mean and longest line numbers.',
  'Tea\nFresh mint\nOat',
  (s) => {
    const a = splitLines(s).map((l) => [...l].length),
      max = Math.max(...a);
    return {
      min: Math.min(...a),
      max,
      mean: a.reduce((a, b) => a + b, 0) / a.length,
      longest: a.flatMap((v, i) => (v === max ? [i + 1] : [])).slice(0, 100),
    };
  },
);
withFields(
  'number-text-lines',
  '文本加行号',
  'Number text lines',
  '从自选起始值逐行添加对齐的行号。',
  'Prefix each line with an aligned decimal line number from a chosen starting value.',
  [source('Prepare\nReview'), whole('start', '起始行号', 'First line number', 1, 0, 999999)],
  ({ text, start }) => {
    const a = splitLines(text),
      w = String(start + a.length - 1).length;
    return { text: a.map((l, i) => String(start + i).padStart(w) + '  ' + l).join('\n') };
  },
);
one(
  'join-print-hyphenation',
  '连接印刷断词',
  'Join print hyphenation',
  '把拉丁字母之间的连字符换行合并，适用于检查印刷文本提取结果。',
  'Join a hyphen and a line break between Latin letters when cleaning extracted print text.',
  'A docu-\nment is ready.',
  (s) => ({ text: s.replace(/(\p{Script=Latin})-\r?\n[ \t]*(?=\p{Script=Latin})/gu, '$1') }),
);
one(
  'straighten-smart-quotes',
  '转换弯引号',
  'Straighten typographic quotes',
  '把常见西文弯引号及低位引号转换为 ASCII 单双引号。',
  'Convert common curved and low typographic quotation marks to ASCII quotes.',
  '“It’s ready.”',
  (s) => ({ text: s.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"') }),
);
one(
  'fullwidth-ascii-fold',
  '全角 ASCII 转半角',
  'Fold fullwidth ASCII',
  '将全角 ASCII 和全角空格映射为半角，保留其他兼容字符。',
  'Map fullwidth ASCII and ideographic space to ordinary ASCII while preserving other characters.',
  'ＡＢ１２',
  (s) => ({
    text: s.replace(/[\uFF01-\uFF5E\u3000]/g, (c) =>
      c === '\u3000' ? ' ' : String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    ),
  }),
);
one(
  'xml-character-check',
  'XML 1.0 字符检查',
  'XML 1.0 character check',
  '按 XML 1.0 的 Char 产生式定位不能出现在文档中的码点。',
  'Locate scalar values disallowed by the XML 1.0 Char production.',
  'Title\u0007',
  (s) => {
    let offset = 0;
    const invalid = [];
    for (const c of s) {
      const n = c.codePointAt(0);
      if (
        !(
          n === 9 ||
          n === 10 ||
          n === 13 ||
          (n >= 32 && n <= 0xd7ff) ||
          (n >= 0xe000 && n <= 0xfffd) ||
          (n >= 0x10000 && n <= 0x10ffff)
        )
      )
        invalid.push({ offset, code: cp(n) });
      offset += c.length;
    }
    return { total: invalid.length, invalid: invalid.slice(0, 100) };
  },
);
one(
  'decode-decimal-html-references',
  '十进制字符引用解码',
  'Decode decimal character references',
  '还原带分号的十进制 Unicode 标量引用；无效码点保持原样。',
  'Decode semicolon-terminated decimal scalar references; leave invalid values unchanged.',
  'Caf&#233;',
  (s) => ({
    text: s.replace(/&#([0-9]{1,7});/g, (m, n) => {
      const v = Number(n);
      return v > 0 && v <= 0x10ffff && (v < 0xd800 || v > 0xdfff) ? String.fromCodePoint(v) : m;
    }),
  }),
);
one(
  'ascii-entity-transcription',
  'ASCII 数字引用转写',
  'ASCII numeric reference transcription',
  '以十六进制字符引用表示非 ASCII 字符，生成可在纯 ASCII 文件中保存的文本。',
  'Represent non-ASCII characters with hexadecimal character references for ASCII-only storage.',
  'Café ★',
  (s) => ({
    text: [...s]
      .map((c) =>
        c.codePointAt(0) > 127 ? '&#x' + c.codePointAt(0).toString(16).toUpperCase() + ';' : c,
      )
      .join(''),
  }),
);
one(
  'visible-whitespace-preview',
  '空白字符标注预览',
  'Visible whitespace preview',
  '用标记显示空格、制表符、换行和不换行空格。',
  'Render spaces, tabs, line breaks and nonbreaking spaces with visible markers.',
  'Menu\tTea\nFresh mint',
  (s) => ({
    text: s.replace(
      /\r\n|[ \t\r\n\u00a0]/g,
      (c) => ({ ' ': '·', '\t': '→', '\r': '␍', '\n': '␊\n', '\r\n': '␍␊\n', '\u00a0': '⍽' })[c],
    ),
  }),
);
one(
  'unicode-decimal-blocks',
  '十进制数字文字分组',
  'Decimal digit block inventory',
  '按连续 Unicode 十进制数字组的零码点汇总数字系统。',
  'Group decimal digits by the zero code point of their ten-character decimal block.',
  '2026 · ١٢٣',
  (s) => ({
    blocks: tally(
      [...s]
        .filter((c) => /\p{Nd}/u.test(c))
        .map((c) => {
          let n = c.codePointAt(0),
            first = n;
          while (first > 0 && /\p{Nd}/u.test(String.fromCodePoint(first - 1))) first--;
          return cp(n - ((n - first) % 10));
        }),
    ),
  }),
);
one(
  'map-typographic-fractions',
  '展开分数字符',
  'Expand vulgar fractions',
  '将常用 Unicode 分数字符展开为分子、斜杠与分母。',
  'Expand Unicode vulgar fractions into numerator, slash and denominator text.',
  'Use ½ cup and ¼ tsp.',
  (s) => ({
    text: s.replace(/[¼-¾⅐-⅞]/gu, (c) => {
      const r = c.normalize('NFKD');
      return /^\d+⁄\d+$/.test(r) ? r.replace('⁄', '/') : c;
    }),
  }),
);
one(
  'punctuation-inventory',
  '标点符号清单',
  'Punctuation inventory',
  '按字符和码点列出文本使用的 Unicode 标点及次数。',
  'List Unicode punctuation characters, code points and frequencies used in a text.',
  'Hello, world! Really?',
  (s) => ({
    punctuation: tally([...s].filter((c) => /\p{P}/u.test(c))).map((x) => ({
      ...x,
      code: cp(x.value.codePointAt(0)),
    })),
  }),
);
withFields(
  'surrounding-lines',
  '按行号摘录上下文',
  'Excerpt lines by number',
  '返回指定行前后的上下文，并标注原始行号。',
  'Extract surrounding lines with their source line numbers for review.',
  [
    source('Open\nReview\nClose'),
    whole('line', '目标行', 'Target line', 2, 1, 6001),
    whole('radius', '前后行数', 'Lines either side', 1, 0, 100),
  ],
  ({ text, line, radius }) => {
    const a = splitLines(text);
    if (line > a.length) throw Error('Target line is beyond the end.');
    const start = Math.max(0, line - 1 - radius);
    return { lines: a.slice(start, line + radius).map((text, i) => ({ line: i + start + 1, text })) };
  },
);
one(
  'word-boundary-segments',
  '单词边界分段',
  'Word boundary segments',
  '按 Unicode 分词规则列出单词片段及 UTF-16 起始位置。',
  'List word-like segments and their UTF-16 start positions using English locale Unicode segmentation.',
  'Café, 15 tickets.',
  (s) => ({
    segments: Array.from(new Intl.Segmenter('en', { granularity: 'word' }).segment(s))
      .filter((x) => x.isWordLike)
      .slice(0, 400)
      .map((x) => ({ word: x.segment, offset: x.index })),
  }),
);
one(
  'paragraph-initials',
  '段首字符索引',
  'Paragraph initials index',
  '逐个提取非空段落首个字形簇，拼出段落首字符序列。',
  'Collect the first grapheme of each blank-line-separated paragraph in reading order.',
  'Menu opens.\n\nOrders follow.',
  (s) => {
    const a = s
      .trim()
      .split(/(?:\r?\n[ \t]*){2,}/)
      .map((x) => graphemeSegments(x.trim()).containing(0)?.segment);
    return { initials: a.join(''), distinct: unique(a) };
  },
);
export { tools };
