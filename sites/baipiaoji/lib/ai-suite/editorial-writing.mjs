import {
  tool,
  source,
  field,
  whole,
  splitWords,
  splitParas,
  splitLines,
  tally,
  occurrences,
} from './editorial-common.mjs';
const tools = [];
const add = (id, zh, en, zd, ed, fields, fn) => tools.push(tool(id, zh, en, zd, ed, fields, fn));
const one = (id, zh, en, zd, ed, s, fn) => add(id, zh, en, zd, ed, [source(s)], ({ text }) => fn(text));
const sentences = (s) =>
  Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(s), (x) =>
    x.segment.trim(),
  ).filter(Boolean);
const words = (s) => splitWords(s).map((w) => w.toLowerCase());
const english = (s) => s.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) || [];
const round = (n) => Math.round(n * 100) / 100;
const rules = [
  [
    'adjacent-word-echo',
    '相邻重复词',
    'Adjacent repeated words',
    '查找仅以空白相隔、忽略大小写的相邻重复英文词。',
    'Find adjacent English words repeated across whitespace, ignoring case.',
    'The the menu is ready.',
    /\b([a-z]+)\s+\1\b/gi,
  ],
  [
    'english-passive-candidates',
    '英语被动结构线索',
    'English passive candidates',
    '标出 be 动词加常见过去分词的片段，供编辑复核。',
    'Flag forms of be followed by common participles as candidates for editorial review.',
    'The review was completed yesterday.',
    /\b(?:am|is|are|was|were|be|been|being)\s+(?:[a-z]{2,}ed|written|built|done|given|seen|made|sent|known|taken|found)\b/gi,
  ],
  [
    'english-hedge-review',
    '英语模糊限定词',
    'English hedge review',
    '定位可能弱化陈述的英语限定词与短语。',
    'Locate common English hedging expressions an editor may want to qualify.',
    'This may perhaps improve the result.',
    /\b(?:perhaps|possibly|somewhat|arguably|apparently|it seems|it appears|more or less|sort of|kind of)\b/gi,
  ],
  [
    'english-intensifier-review',
    '英语程度副词复核',
    'English intensifier review',
    '标出 very、really 等常见程度副词及原文位置。',
    'Locate common English intensifiers and return their positions for review.',
    'A very bright and really useful lamp.',
    /\b(?:very|really|extremely|totally|incredibly|absolutely|utterly|highly|exceptionally)\b/gi,
  ],
  [
    'unexpanded-initialisms',
    '未定义首字母缩写',
    'Unexpanded initialisms',
    '列出英文大写缩写中没有以括号形式引入的条目，供人工确认。',
    'List uppercase initialisms without a parenthesized introduction for manual review.',
    'A service level agreement (SLA) helps the QA team.',
    null,
  ],
  [
    'english-wordy-phrases',
    '英语冗长短语',
    'Wordy English phrase review',
    '查找可简化的常用英语短语，并列出简明替代表达。',
    'Find common wordy English phrases and suggest shorter equivalents.',
    'In order to open the file, use a reader.',
    null,
  ],
  [
    'punctuation-runs',
    '连续感叹号与问号',
    'Repeated question and exclamation marks',
    '定位连续问号或感叹号，便于核对强调语气。',
    'Locate consecutive question or exclamation marks for tone review.',
    'Ready?! Yes!!!',
    /[!?]{2,}/g,
  ],
  [
    'ambiguous-numeric-dates',
    '数字日期歧义检查',
    'Ambiguous numeric dates',
    '标出月、日都在 1 至 12 的斜杠日期及两种可能读法。',
    'Find slash dates where both leading fields could be month or day and report both readings.',
    'Meet on 03/04/2026.',
    null,
  ],
  [
    'mixed-english-spellings',
    '英美拼写一致性',
    'Mixed English spelling pairs',
    '检查同一文本是否同时使用常见英式与美式拼写。',
    'Check for pairs of common British and American spellings used in the same document.',
    'Choose a colour for the color chart.',
    null,
  ],
  [
    'bracket-balance',
    '括号配对检查',
    'Bracket balance',
    '按嵌套次序核对圆括号、方括号、大括号，并标出错配位置。',
    'Check nesting of parentheses, square brackets and braces and return mismatched offsets.',
    'See [item (2]).',
    null,
  ],
];
const overrides = {
  'unexpanded-initialisms': (s) => {
    const defined = new Set([...s.matchAll(/\(([A-Z][A-Z0-9]{1,7})\)/g)].map((m) => m[1]));
    return {
      candidates: tally(s.match(/\b[A-Z][A-Z0-9]{1,7}\b/g) || []).filter((x) => !defined.has(x.value)),
    };
  },
  'english-wordy-phrases': (s) => {
    const dict = {
      'in order to': 'to',
      'at this point in time': 'now',
      'due to the fact that': 'because',
      'in the event that': 'if',
      'for the purpose of': 'for',
      'has the ability to': 'can',
      'in close proximity to': 'near',
    };
    return {
      suggestions: occurrences(s, new RegExp('\\b(?:' + Object.keys(dict).join('|') + ')\\b', 'gi')).map(
        (m) => ({ ...m, suggestion: dict[m.text.toLowerCase()] }),
      ),
    };
  },
  'ambiguous-numeric-dates': (s) => ({
    dates: [...s.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)]
      .filter((m) => +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 12 && +m[1] !== +m[2])
      .slice(0, 100)
      .map((m) => ({
        source: m[0],
        monthFirst: [m[3], m[1].padStart(2, '0'), m[2].padStart(2, '0')].join('-'),
        dayFirst: [m[3], m[2].padStart(2, '0'), m[1].padStart(2, '0')].join('-'),
      })),
  }),
  'mixed-english-spellings': (s) => {
    const set = new Set(words(s));
    return {
      mixed: [
        ['colour', 'color'],
        ['centre', 'center'],
        ['organise', 'organize'],
        ['favour', 'favor'],
        ['behaviour', 'behavior'],
        ['analyse', 'analyze'],
        ['theatre', 'theater'],
        ['travelling', 'traveling'],
        ['catalogue', 'catalog'],
      ].filter(([a, b]) => set.has(a) && set.has(b)),
    };
  },
  'bracket-balance': (s) => {
    const stack = [],
      issues = [],
      close = { ')': '(', ']': '[', '}': '{' };
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if ('([{'.includes(c)) stack.push({ char: c, offset: i });
      else if (Object.hasOwn(close, c)) {
        if (stack.at(-1)?.char === close[c]) stack.pop();
        else issues.push({ unexpected: c, offset: i });
      }
    }
    return {
      balanced: !stack.length && !issues.length,
      unexpected: issues.slice(0, 100),
      unclosed: stack.slice(0, 100),
    };
  },
};
for (const [id, zh, en, zd, ed, s, re] of rules)
  one(id, zh, en, zd, ed, s, overrides[id] || ((s) => ({ matches: occurrences(s, re) })));
const sample = 'Our team reads the brief. The editor checks every claim. Short notes help the team.';
one(
  'sentence-length-profile',
  '句长统计',
  'Sentence length profile',
  '按英文句界分段，计算每句词数与平均句长。',
  'Segment English sentences, then calculate individual word counts and the mean sentence length.',
  sample,
  (s) => {
    const counts = sentences(s).map((x) => words(x).length);
    return { counts, mean: round(counts.reduce((a, b) => a + b, 0) / counts.length) };
  },
);
one(
  'sentence-opening-variety',
  '开句用词分布',
  'Sentence opening variety',
  '按句首词汇总次数，帮助发现重复开头。',
  'Group sentences by their opening word to reveal repetitive starts.',
  sample,
  (s) => ({
    openings: tally(
      sentences(s)
        .map((x) => words(x)[0])
        .filter(Boolean),
    ),
  }),
);
one(
  'paragraph-topic-lines',
  '段落首句摘录',
  'Paragraph lead extraction',
  '从每个空行分段中摘取开头一句供审阅结构。',
  'Extract the opening sentence of each blank-line-separated paragraph to review structure.',
  sample + '\n\nCheck the proofs.',
  (s) => ({ leads: splitParas(s).map((x, i) => ({ paragraph: i + 1, lead: sentences(x)[0] })) }),
);
one(
  'lexical-diversity-mattr',
  '移动平均词汇多样度',
  'Moving lexical diversity',
  '对最多 50 词的滑动窗口计算不同词比例，并取平均。',
  'Compute mean type-token ratio across sliding windows of up to 50 words.',
  sample,
  (s) => {
    const a = words(s),
      width = Math.min(50, a.length);
    if (!width) throw Error('Provide words.');
    let total = 0;
    for (let i = 0; i <= a.length - width; i++) total += new Set(a.slice(i, i + width)).size / width;
    return {
      windowWords: width,
      windows: a.length - width + 1,
      meanTypeTokenRatio: round((100 * total) / (a.length - width + 1)) / 100,
    };
  },
);
one(
  'hapax-vocabulary',
  '单次出现词目录',
  'Once-used vocabulary',
  '列出只出现一次的词及其在总词数中的占比。',
  'List words used exactly once and calculate their share of total tokens.',
  sample,
  (s) => {
    const a = words(s),
      hapax = tally(a).filter((x) => x.count === 1);
    return {
      count: hapax.length,
      tokenShare: a.length ? round((hapax.length / a.length) * 100) / 100 : 0,
      words: hapax.slice(0, 300).map((x) => x.value),
    };
  },
);
one(
  'repeated-word-trigrams',
  '重复三词搭配',
  'Repeated three-word phrases',
  '以重叠窗口找出重复出现的连续三词序列。',
  'Find repeated three-word sequences with overlapping windows.',
  'Check the draft now. Check the draft again.',
  (s) => {
    const a = words(s);
    return {
      phrases: tally(a.slice(2).map((_, i) => a.slice(i, i + 3).join(' ')))
        .filter((x) => x.count > 1)
        .slice(0, 100),
    };
  },
);
one(
  'automated-readability-index',
  '英文 ARI 可读性',
  'Automated Readability Index',
  '依据英文词、句和字母数字字符计算 ARI 年级估算。',
  'Estimate US grade level from English alphanumeric characters, words and sentences using ARI.',
  sample,
  (s) => {
    const a = s.match(/[a-z0-9]+(?:['’][a-z0-9]+)*/gi) || [],
      chars = (s.match(/[a-z0-9]/gi) || []).length,
      n = sentences(s).filter((x) => /[a-z0-9]/i.test(x)).length;
    if (!a.length || !n) throw Error('Use English prose.');
    return {
      words: a.length,
      characters: chars,
      sentences: n,
      index: round((4.71 * chars) / a.length + (0.5 * a.length) / n - 21.43),
    };
  },
);
one(
  'coleman-liau-grade',
  '英文 Coleman–Liau 指数',
  'Coleman–Liau grade estimate',
  '以每百词字母数和句数估算英文阅读年级。',
  'Estimate English reading grade from letters and sentences per hundred words.',
  sample,
  (s) => {
    const n = english(s).length,
      letters = (s.match(/[A-Za-z]/g) || []).length,
      count = sentences(s).filter((x) => /[a-z]/i.test(x)).length;
    if (!n) throw Error('Use English prose.');
    return {
      letters,
      words: n,
      sentences: count,
      grade: round((0.0588 * 100 * letters) / n - (0.296 * 100 * count) / n - 15.8),
    };
  },
);
one(
  'lix-readability-index',
  'LIX 文本难度',
  'LIX readability index',
  '以句均词数与超过六个字母的长词百分比计算 LIX。',
  'Add words per sentence and the percentage of words longer than six letters to calculate LIX.',
  sample,
  (s) => {
    const a = words(s),
      n = sentences(s).filter((x) => words(x).length).length;
    if (!a.length) throw Error('Provide prose.');
    const long = a.filter((w) => [...w.replace(/['’]/g, '')].length > 6).length;
    return { longWords: long, index: round(a.length / n + (100 * long) / a.length) };
  },
);
one(
  'english-pronoun-profile',
  '英语人称分布',
  'English pronoun perspective',
  '按第一、第二及第三人称对常见英语人称代词进行计数。',
  'Count common personal pronouns by first, second and third person in English text.',
  sample + ' We review it with you.',
  (s) => {
    const a = words(s),
      groups = {
        first: 'i me my mine myself we us our ours ourselves',
        second: 'you your yours yourself yourselves',
        third: 'he him his himself she her hers herself they them their theirs themselves it its itself',
      };
    return Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, a.filter((w) => v.split(' ').includes(w)).length]),
    );
  },
);
add(
  'keyword-in-context-lines',
  '关键词索引摘录',
  'Keyword concordance',
  '在完整词匹配位置输出前后各五词，适合检查词汇用法。',
  'Build a concordance of whole-word matches with up to five words on either side.',
  [source(sample), field('word', '关键词', 'Keyword', 'team', 100)],
  ({ text, word }) => {
    const a = splitWords(text);
    return {
      concordance: a
        .flatMap((w, i) =>
          w.toLowerCase() === word.toLowerCase()
            ? [
                {
                  left: a.slice(Math.max(0, i - 5), i).join(' '),
                  word: w,
                  right: a.slice(i + 1, i + 6).join(' '),
                },
              ]
            : [],
        )
        .slice(0, 100),
    };
  },
);
add(
  'editorial-term-preference',
  '首选术语一致性',
  'Preferred terminology audit',
  '按逐行旧词与首选词对照表，标出原文中待替换的字面用词。',
  'Find case-sensitive literal uses of deprecated terminology using supplied old|preferred pairs.',
  [
    source('Open the control panel.'),
    field(
      'terms',
      '旧词|首选词，每行一组',
      'Old|preferred term per line',
      'control panel|dashboard',
      1500,
    ),
  ],
  ({ text, terms }) => {
    const rows = splitLines(terms).map((l) => l.split('|').map((s) => s.trim()));
    if (rows.some((r) => r.length !== 2 || !r[0] || !r[1]) || rows.length > 60)
      throw Error('Use up to 60 old|preferred pairs.');
    return {
      suggestions: rows
        .map(([old, preferred]) => ({ old, preferred, count: text.split(old).length - 1 }))
        .filter((x) => x.count > 0),
    };
  },
);
add(
  'long-sentence-shortlist',
  '超长句筛查',
  'Long sentence shortlist',
  '按自选词数阈值列出长句及原始句号序号。',
  'List sentences exceeding a chosen word count, preserving sentence numbers.',
  [source(sample), whole('limit', '句长阈值（词）', 'Word limit per sentence', 4, 1, 1000)],
  ({ text, limit }) => ({
    sentences: sentences(text)
      .map((sentence, i) => ({ number: i + 1, words: words(sentence).length, sentence }))
      .filter((s) => s.words > limit)
      .slice(0, 100),
  }),
);
add(
  'keyword-distribution-quartiles',
  '关键词四分段分布',
  'Keyword distribution by quarter',
  '将词序列均分四段，分别计数指定词的出现次数。',
  'Split token positions into four quarters and count occurrences of the target word in each.',
  [source(sample), field('word', '目标词', 'Target word', 'team', 80)],
  ({ text, word }) => {
    const a = words(text),
      counts = [0, 0, 0, 0];
    a.forEach((w, i) => {
      if (w === word.toLowerCase()) counts[Math.floor((i * 4) / a.length)]++;
    });
    return { counts };
  },
);
one(
  'paragraph-word-balance',
  '段落篇幅占比',
  'Paragraph word shares',
  '计算各段词数及全文占比，以识别篇幅失衡。',
  'Report words and share of total words for each paragraph.',
  'One idea here.\n\nTwo more ideas follow here.',
  (s) => {
    const n = splitParas(s).map((p) => words(p).length),
      total = n.reduce((a, b) => a + b, 0);
    return {
      paragraphs: n.map((v, i) => ({
        paragraph: i + 1,
        words: v,
        sharePercent: total ? round((100 * v) / total) : 0,
      })),
    };
  },
);
one(
  'extract-direct-quotations',
  '直接引语摘录',
  'Direct quotation extraction',
  '摘录单行内成对弯双引号或直双引号之间的引语及其位置。',
  'Extract single-line passages enclosed in matched curly or straight double quotes.',
  'The editor said “ready” today.',
  (s) => ({
    quotes: occurrences(s, /“[^”\n]*”|"[^"\n]*"/g).map((m) => ({ ...m, text: m.text.slice(1, -1) })),
  }),
);
one(
  'extract-parenthetical-asides',
  '括注内容摘录',
  'Parenthetical aside extraction',
  '提取无嵌套的圆括号内文字，并显示在原文中的位置。',
  'Extract innermost parenthetical passages with source offsets.',
  'The book (second edition) is ready.',
  (s) => ({ asides: occurrences(s, /\([^()\n]+\)/g).map((m) => ({ ...m, text: m.text.slice(1, -1) })) }),
);
one(
  'parallel-list-endings',
  '列表结尾一致性',
  'List ending consistency',
  '比较项目符号行最末标点或无标点的分布。',
  'Compare terminal punctuation across bullet and numbered list items.',
  '- Read the brief.\n- Prepare notes',
  (s) => {
    const lines = splitLines(s).filter((x) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(x)),
      endings = tally(lines.map((x) => x.trim().match(/\p{P}$/u)?.[0] || 'none'));
    return { items: lines.length, consistent: endings.length <= 1, endings };
  },
);
one(
  'numeric-style-mix',
  '英文数字写法一致性',
  'Mixed number styles',
  '查找同一篇英文中 0 至 10 的数字形式与拼写形式并存的情况。',
  'Find values from zero to ten appearing both as digits and English number words.',
  'We need two copies and 2 stamps.',
  (s) => {
    const names = 'zero one two three four five six seven eight nine ten'.split(' '),
      tokens = new Set(s.toLowerCase().match(/\b[a-z]+\b|\b\d+\b/g) || []);
    return {
      mixed: names.flatMap((w, i) =>
        tokens.has(w) && tokens.has(String(i)) ? [{ digit: i, word: w }] : [],
      ),
    };
  },
);
one(
  'sentence-ending-moods',
  '句末语气标点分布',
  'Sentence terminal punctuation',
  '按陈述、疑问、感叹或无句末标记对英文分句计数。',
  'Count segmented sentences by declarative, questioning, exclamatory or unmarked endings.',
  'Ready? Yes! Send the memo.',
  (s) => ({
    endings: tally(
      sentences(s).map((x) => {
        const last = x.replace(/[”’"'\])}]+$/g, '').at(-1);
        return last === '?'
          ? 'question'
          : last === '!'
            ? 'exclamation'
            : last === '.'
              ? 'period'
              : 'unmarked';
      }),
    ),
  }),
);
export { tools };
