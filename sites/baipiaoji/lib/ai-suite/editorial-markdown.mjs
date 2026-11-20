import { tool, source, field, whole, splitLines, tally, unique, htmlText } from './editorial-common.mjs';
const tools = [];
const add = (id, zh, en, zd, ed, fields, fn) => tools.push(tool(id, zh, en, zd, ed, fields, fn));
const one = (id, zh, en, zd, ed, sample, fn) =>
  add(id, zh, en, zd, ed, [source(sample)], ({ text }) => fn(text));
const md =
  '# Field Notes\n\n## Agenda\n- [x] Read the brief\n- [ ] Edit notes\n\n## Review\nSee [the guide](/guide).';
const tick = String.fromCharCode(96);
const fence = tick.repeat(3);
function scan(text) {
  const rows = [],
    blocks = [];
  let open = null;
  for (const [i, raw] of splitLines(text).entries()) {
    const marker = raw.match(/^ {0,3}((?:`{3,}|~{3,}))(.*)$/);
    if (open) {
      if (
        marker &&
        marker[1][0] === open.marker[0] &&
        marker[1].length >= open.marker.length &&
        !marker[2].trim()
      ) {
        open.end = i + 1;
        open = null;
      } else open.lines.push(raw);
    } else if (marker && !(marker[1][0] === tick && marker[2].includes(tick))) {
      open = { start: i + 1, end: null, marker: marker[1], info: marker[2].trim(), lines: [] };
      blocks.push(open);
    } else rows.push({ line: i + 1, raw });
  }
  return { rows, blocks };
}
function headings(s) {
  return scan(s).rows.flatMap(({ line, raw }) => {
    const m = raw.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*)|$)/);
    return m
      ? [{ line, level: m[1].length, title: (m[2] || '').replace(/(?:^|\s+)#+\s*$/, '').trim() }]
      : [];
  });
}
const anchor = (s) =>
  s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}_\s-]/gu, '')
    .trim()
    .replace(/\s+/gu, '-');
function sectionIds(s) {
  const used = new Set(),
    next = new Map();
  return headings(s).map((h) => {
    const base = anchor(h.title);
    let id = base,
      i = next.get(base) || 1;
    while (used.has(id)) id = base + '-' + i++;
    next.set(base, i);
    used.add(id);
    return { ...h, id };
  });
}
const refs = (s) =>
  scan(s).rows.flatMap(({ line, raw }) =>
    [...raw.matchAll(/^ {0,3}\[([^\]^]+)\]:\s*(?:<([^>]+)>|(\S+))/g)].map((m) => ({
      line,
      label: m[1].toLowerCase(),
      url: m[2] || m[3],
    })),
  );
const links = (s) =>
  scan(s).rows.flatMap(({ line, raw }) =>
    [...raw.matchAll(/(!?)\[([^\[\]]*)\]\(([^()\s]+)\)/g)].map((m) => ({
      line,
      image: !!m[1],
      label: m[2],
      url: m[3],
    })),
  );
const checks = (s) =>
  scan(s).rows.flatMap(({ line, raw }) => {
    const m = raw.match(/^\s*[-*+]\s+\[([ xX])\]\s*(.*)$/);
    return m ? [{ line, done: m[1] !== ' ', label: m[2] }] : [];
  });
one(
  'markdown-section-index',
  'Markdown 章节索引',
  'Markdown section index',
  '解析围栏外的 ATX 标题，生成带行号、层级和唯一本地锚点的索引。',
  'Index ATX headings outside fences with line numbers, levels and unique local anchor suggestions.',
  md,
  (s) => ({ sections: sectionIds(s) }),
);
one(
  'markdown-toc-list',
  'Markdown 目录生成',
  'Markdown linked contents',
  '将围栏外的 ATX 标题转换为带层级缩进和本地锚点的 Markdown 目录。',
  'Build an indented linked contents list from ATX headings using deterministic local slugs.',
  md,
  (s) => ({
    markdown: sectionIds(s)
      .map(
        (h) =>
          '  '.repeat(h.level - 1) + '- [' + h.title.replace(/[[\]\\]/g, '\\$&') + '](#' + h.id + ')',
      )
      .join('\n'),
  }),
);
add(
  'markdown-cut-section',
  '按标题提取 Markdown 章节',
  'Extract a Markdown section',
  '精确匹配 ATX 标题并摘取到下一个同级或更高标题之前。',
  'Extract the first matching ATX heading and its content through the next same-or-higher level heading.',
  [source(md), field('title', '标题原文', 'Exact heading title', 'Agenda', 150)],
  ({ text, title }) => {
    const hs = headings(text),
      i = hs.findIndex((h) => h.title === title);
    if (i < 0) throw Error('Heading not found.');
    const next = hs.slice(i + 1).find((h) => h.level <= hs[i].level);
    return {
      markdown: splitLines(text)
        .slice(hs[i].line - 1, next ? next.line - 1 : undefined)
        .join('\n')
        .trimEnd(),
    };
  },
);
add(
  'markdown-shift-heading-levels',
  '调整 Markdown 标题层级',
  'Shift Markdown heading levels',
  '按偏移量调整围栏外的 ATX 标题，越过一至六级时报告错误。',
  'Shift ATX heading levels outside fenced blocks and reject changes beyond levels one through six.',
  [source(md), whole('offset', '层级偏移', 'Level offset', 1, -5, 5)],
  ({ text, offset }) => {
    const a = splitLines(text);
    for (const h of headings(text)) {
      const l = h.level + offset;
      if (l < 1 || l > 6) throw Error('A resulting level falls outside 1–6.');
      a[h.line - 1] = a[h.line - 1].replace(/^( {0,3})#+/, '$1' + '#'.repeat(l));
    }
    return { markdown: a.join('\n') };
  },
);
one(
  'markdown-heading-collisions',
  'Markdown 标题锚点冲突',
  'Markdown base anchor collisions',
  '定位生成相同基础锚点的标题，便于整理段落链接。',
  'Find heading titles that generate the same base anchor before numeric suffixes.',
  md + '\n## Agenda!',
  (s) => ({ collisions: tally(headings(s).map((h) => anchor(h.title))).filter((x) => x.count > 1) }),
);
one(
  'markdown-fence-coverage',
  'Markdown 围栏闭合检查',
  'Markdown fence closure check',
  '核对反引号和波浪号围栏的结束标记、行号及代码行数。',
  'Check backtick and tilde fence closure, boundaries and contained line counts.',
  fence + 'js\nlet n = 1;\n' + fence,
  (s) => ({
    fences: scan(s).blocks.map(({ start, end, info, lines }) => ({
      start,
      end,
      info,
      closed: end !== null,
      lines: lines.length,
    })),
  }),
);
one(
  'markdown-code-block-export',
  '导出围栏代码块',
  'Export fenced code blocks',
  '按出现顺序提取每个围栏中的原始代码和语言信息。',
  'Extract the source and info string of each fenced code block in document order.',
  fence + 'css\np { color: red; }\n' + fence,
  (s) => ({ blocks: scan(s).blocks.map((b) => ({ info: b.info, code: b.lines.join('\n') })) }),
);
one(
  'markdown-fence-language-mix',
  '代码围栏语言分布',
  'Fenced code language mix',
  '汇总每个围栏信息串的第一个词，未标注的单独计数。',
  'Count fenced blocks by the first word of the info string, including unlabelled blocks.',
  fence + 'js\nlet n = 0;\n' + fence,
  (s) => ({ languages: tally(scan(s).blocks.map((b) => b.info.split(/\s+/)[0] || 'unlabelled')) }),
);
one(
  'markdown-task-progress',
  'Markdown 任务完成率',
  'Markdown task completion',
  '统计已勾选和未勾选项目及完成百分比。',
  'Calculate completion percentage for bullet checkboxes outside fenced code.',
  md,
  (s) => {
    const a = checks(s),
      done = a.filter((c) => c.done).length;
    return {
      total: a.length,
      done,
      open: a.length - done,
      percent: a.length ? Math.round((1000 * done) / a.length) / 10 : null,
    };
  },
);
one(
  'markdown-open-action-list',
  'Markdown 待办摘录',
  'Markdown open action list',
  '提取尚未勾选的列表项，保留原始行号和项目文字。',
  'Collect unchecked Markdown list items with original line numbers and labels.',
  md,
  (s) => ({
    open: checks(s)
      .filter((x) => !x.done)
      .map(({ line, label }) => ({ line, label })),
  }),
);
one(
  'markdown-finished-log',
  'Markdown 完成日志',
  'Markdown completion log',
  '将已勾选任务导出为带来源行的纯文本完成日志。',
  'Export checked tasks into a plain-text completion log with source lines.',
  md,
  (s) => ({
    log: checks(s)
      .filter((x) => x.done)
      .map((x) => x.line + '\t' + x.label)
      .join('\n'),
  }),
);
one(
  'markdown-reference-index',
  'Markdown 引用定义索引',
  'Markdown reference definition index',
  '列出围栏外的单行链接引用定义及其目标。',
  'List single-line Markdown link reference definitions and their destinations outside fences.',
  '[guide]: /guide\nSee [Guide][guide].',
  (s) => ({ definitions: refs(s) }),
);
one(
  'markdown-reference-coverage',
  'Markdown 引用链接核对',
  'Markdown reference link coverage',
  '交叉核对显式或折叠引用的名称，列出缺失、重复和未使用定义。',
  'Cross-check explicit and collapsed reference links for missing, duplicate and unused definitions.',
  '[guide]: /guide\nSee [Guide][guide] and [More][extra].',
  (s) => {
    const defs = refs(s).map((x) => x.label),
      used = scan(s).rows.flatMap(({ raw }) =>
        [...raw.matchAll(/\[([^\[\]]+)\]\[([^\[\]]*)\]/g)].map((m) => (m[2] || m[1]).toLowerCase()),
      );
    return {
      missing: unique(used.filter((x) => !defs.includes(x))),
      unused: unique(defs.filter((x) => !used.includes(x))),
      duplicates: tally(defs).filter((x) => x.count > 1),
    };
  },
);
one(
  'markdown-image-inventory',
  'Markdown 图片资产清单',
  'Markdown image asset inventory',
  '按简单内联图片目标分组，记录替代文字与引用行号。',
  'Group simple inline image destinations with alt labels and source line numbers.',
  '![Cover](/cover.png)\n![Chart](/chart.svg)',
  (s) => ({
    images: links(s)
      .filter((x) => x.image)
      .map(({ line, label, url }) => ({ line, alt: label, url })),
  }),
);
one(
  'markdown-internal-fragments',
  'Markdown 片段链接核对',
  'Markdown local fragment links',
  '比较内联片段链接与此工具由 ATX 标题生成的锚点。',
  'Compare inline fragment links against local anchors generated from ATX headings.',
  md + '\n[Missing](#notes)',
  (s) => {
    const ids = new Set(sectionIds(s).map((h) => h.id));
    return {
      fragments: links(s)
        .filter((x) => !x.image && x.url.startsWith('#'))
        .map((x) => ({ ...x, matched: ids.has(x.url.slice(1)) })),
    };
  },
);
one(
  'markdown-outbound-domains',
  'Markdown 外链域名分布',
  'Markdown outbound hosts',
  '对简单内联 HTTP 链接的主机名计数，跳过相对链接。',
  'Count hostnames of absolute HTTP and HTTPS inline links, excluding image targets.',
  '[Guide](https://example.org/guide)',
  (s) => ({
    hosts: tally(
      links(s).flatMap((x) => {
        try {
          const u = new URL(x.url);
          return !x.image && ['https:', 'http:'].includes(u.protocol) ? [u.hostname] : [];
        } catch {
          return [];
        }
      }),
    ),
  }),
);
one(
  'markdown-footnote-crosscheck',
  'Markdown 脚注核对',
  'Markdown footnote references',
  '比较单行脚注定义与正文脚注标记，给出遗漏及闲置标记。',
  'Compare single-line footnote definitions with inline markers to find missing or unused notes.',
  'A claim[^a].\n[^a]: Source\n[^b]: Appendix',
  (s) => {
    const defs = [],
      uses = [];
    for (const { raw } of scan(s).rows) {
      const m = raw.match(/^ {0,3}\[\^([^\]]+)\]:/);
      if (m) defs.push(m[1]);
      for (const u of (m ? raw.slice(m[0].length) : raw).matchAll(/\[\^([^\]]+)\]/g)) uses.push(u[1]);
    }
    return {
      missing: unique(uses.filter((x) => !defs.includes(x))),
      unused: unique(defs.filter((x) => !uses.includes(x))),
      definitions: defs.length,
    };
  },
);
one(
  'markdown-blockquote-export',
  'Markdown 引文摘录',
  'Markdown blockquote export',
  '收集连续显式引用行并移除一层引用前缀。',
  'Collect adjacent explicitly marked blockquote lines and remove one quote prefix.',
  '> First line\n> Second line\n\nBody',
  (s) => {
    const groups = [];
    let last = -1;
    for (const { line, raw } of scan(s).rows) {
      const m = raw.match(/^ {0,3}> ?(.*)$/);
      if (!m) continue;
      if (line !== last + 1) groups.push([]);
      groups.at(-1).push(m[1]);
      last = line;
    }
    return { quotes: groups.map((a) => a.join('\n')) };
  },
);
one(
  'markdown-horizontal-dividers',
  'Markdown 分隔线索引',
  'Markdown thematic break index',
  '识别至少三个相同星号、下划线或短横线的独立行；列出候选分隔线。',
  'List candidate thematic break lines of three or more matching asterisks, underscores or hyphens.',
  'Intro\n\n* * *\n\nEnd',
  (s) => ({
    lines: scan(s)
      .rows.filter((x) => /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$/.test(x.raw))
      .map((x) => x.line),
  }),
);
one(
  'markdown-hard-break-positions',
  'Markdown 强制换行定位',
  'Markdown hard break locations',
  '查找围栏外以两个空格或反斜杠结尾的行。',
  'Locate nonblank lines outside fences ending in at least two spaces or a backslash.',
  'Line one  \nLine two',
  (s) => ({
    breaks: scan(s)
      .rows.filter((r) => r.raw.trim() && /(?: {2,}|\\)$/.test(r.raw))
      .map((r) => ({ line: r.line, style: r.raw.endsWith('\\') ? 'backslash' : 'spaces' })),
  }),
);
one(
  'markdown-frontmatter-split',
  '分离 Markdown 扉页元数据',
  'Split Markdown front matter',
  '分离文首成对短横线围住的原始元数据及正文，保留原始字段文本。',
  'Separate raw front matter enclosed by leading triple-dash lines from the remaining body.',
  '---\ntitle: Menu\n---\nFresh tea.',
  (s) => {
    const a = splitLines(s);
    if (a[0] !== '---') return { frontMatter: null, body: s };
    const end = a.indexOf('---', 1);
    if (end < 0) throw Error('Unclosed front matter.');
    return { frontMatter: a.slice(1, end).join('\n'), body: a.slice(end + 1).join('\n') };
  },
);
one(
  'markdown-setext-to-atx',
  'Setext 标题转 ATX',
  'Setext to ATX headings',
  '转换由普通非空标题行与紧随的等号或横线组成的简单 Setext 标题。',
  'Convert plain title lines immediately followed by Setext equals or hyphens to ATX headings.',
  'Field Notes\n===========\n\nAgenda\n------',
  (s) => {
    const a = splitLines(s),
      allowed = new Set(scan(s).rows.map((x) => x.line));
    for (let i = 1; i < a.length; i++) {
      if (
        !allowed.has(i) ||
        !allowed.has(i + 1) ||
        !/^ {0,3}(?:=+|-+)\s*$/.test(a[i]) ||
        !a[i - 1]?.trim() ||
        /^\s*[-#*>+\d]/.test(a[i - 1])
      )
        continue;
      a[i - 1] = (a[i].trim()[0] === '=' ? '# ' : '## ') + a[i - 1].trim();
      a[i] = null;
    }
    return { markdown: a.filter((x) => x !== null).join('\n') };
  },
);
one(
  'markdown-bullets-to-checklist',
  '项目列表转任务列表',
  'Bullets to Markdown checklist',
  '给未包含复选框的无序项目加上未完成标记，保留现有状态。',
  'Add unchecked boxes to unordered list items while preserving existing checkbox states.',
  '- Edit\n- [x] Read',
  (s) => {
    const a = splitLines(s);
    for (const { line, raw } of scan(s).rows)
      a[line - 1] = raw.replace(/^(\s*[-*+]\s+)(?!\[[ xX]\](?:\s|$))(\S)/, '$1[ ] $2');
    return { markdown: a.join('\n') };
  },
);
one(
  'markdown-ordered-renumber',
  '有序列表重编号',
  'Renumber Markdown ordered runs',
  '为连续、相同缩进的数字列表从 1 开始编号。',
  'Renumber adjacent ordered list items at the same indentation starting at one.',
  '5. First\n7. Next',
  (s) => {
    const a = splitLines(s);
    let previous = 0,
      indent = null,
      n = 0;
    for (const { line, raw } of scan(s).rows) {
      const m = raw.match(/^(\s*)\d+([.)])(\s+.*)$/);
      if (!m) continue;
      n = line === previous + 1 && indent === m[1] ? n + 1 : 1;
      previous = line;
      indent = m[1];
      a[line - 1] = m[1] + n + m[2] + m[3];
    }
    return { markdown: a.join('\n') };
  },
);
one(
  'markdown-inline-code-wrapper',
  'Markdown 行内代码定界',
  'Wrap an inline code span',
  '选取比内容中最长反引号串更长的定界符，按需补空格。',
  'Select delimiters longer than any backtick run and pad a Markdown code span where needed.',
  'field' + tick + 'name',
  (s) => {
    if (/[\r\n]/.test(s)) throw Error('Use a single-line code span.');
    const run = Math.max(0, ...[...s.matchAll(/`+/g)].map((m) => m[0].length)),
      d = tick.repeat(run + 1),
      pad = s.startsWith(tick) || s.endsWith(tick) || (s.startsWith(' ') && s.endsWith(' '));
    return { markdown: d + (pad ? ' ' : '') + s + (pad ? ' ' : '') + d };
  },
);
add(
  'markdown-safe-fenced-snippet',
  'Markdown 代码围栏生成',
  'Fence a source excerpt',
  '根据正文反引号最长连续数选择围栏长度，并加上语言标签。',
  'Choose a fence longer than every backtick run in the source and attach a language label.',
  [source('const note = "ready";'), field('language', '语言标记', 'Language label', 'js', 32)],
  ({ text, language }) => {
    if (!/^[\w.+#-]+$/.test(language)) throw Error('Use a plain language label.');
    const d = tick.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));
    return { markdown: d + language + '\n' + text + '\n' + d };
  },
);
one(
  'markdown-simple-table-width',
  'Markdown 管道表列数核对',
  'Markdown pipe table widths',
  '核对外侧有管道符的简单表格行是否列数一致，支持反斜杠转义的管道符。',
  'Check column counts in outer-pipe table rows, respecting backslash-escaped pipes.',
  '|Name|Qty|\n|---|---|\n|Tea|2|',
  (s) => {
    const a = splitLines(s)
      .map((l, i) => ({ line: i + 1, l: l.trim() }))
      .filter((x) => x.l.startsWith('|') && x.l.endsWith('|'));
    if (!a.length) throw Error('Use table rows enclosed by pipes.');
    const counts = a.map((x) => {
      let escapes = 0,
        separators = 0;
      for (const c of x.l) {
        if (c === '\\') {
          escapes++;
          continue;
        }
        if (c === '|' && escapes % 2 === 0) separators++;
        escapes = 0;
      }
      return { line: x.line, columns: separators - 1 };
    });
    return {
      expected: counts[0].columns,
      mismatches: counts.filter((x) => x.columns !== counts[0].columns),
    };
  },
);
one(
  'markdown-first-preview',
  'Markdown 摘要分隔',
  'Markdown teaser extraction',
  '在独立 more 注释处分割简介和后续正文，忽略代码围栏内的标记。',
  'Split a Markdown teaser from its continuation at a standalone more comment outside fenced code.',
  'Intro text\n<!--more-->\nMore detail',
  (s) => {
    const m = scan(s).rows.find((x) => /^\s*<!--\s*more\s*-->\s*$/i.test(x.raw));
    if (!m) return { teaser: s, continuation: '' };
    const a = splitLines(s);
    return { teaser: a.slice(0, m.line - 1).join('\n'), continuation: a.slice(m.line).join('\n') };
  },
);
one(
  'markdown-list-html',
  '纯文本清单转 HTML',
  'Plain list to HTML',
  '将每个非空行作为列表项进行 HTML 文本转义并生成无序列表。',
  'Escape each nonblank line as HTML text and build a semantic unordered list.',
  'Tea & mint\nOat milk',
  (s) => ({
    html:
      '<ul>\n' +
      splitLines(s)
        .filter((l) => l.trim())
        .map((l) => '  <li>' + htmlText(l.trim()) + '</li>')
        .join('\n') +
      '\n</ul>',
  }),
);
one(
  'markdown-escape-inline',
  '转义 Markdown 行内标点',
  'Escape inline Markdown punctuation',
  '对 Markdown 可反斜杠转义的 ASCII 标点添加前缀，以便作为字面量发布。',
  'Backslash-escape ASCII punctuation permitted by CommonMark for use as literal inline text.',
  'Price *before* tax [draft].',
  (s) => ({ markdown: s.replace(/[!-/:-@\x5b-\x60{-~]/g, '\\$&') }),
);
export { tools };
