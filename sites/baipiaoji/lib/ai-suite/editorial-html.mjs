import { tool, source, tally, unique } from './editorial-common.mjs';

// A source-start-tag scanner for editorial inventories. It does not execute markup or infer rendered accessibility.
const rawTextTags = new Set(['script', 'style', 'textarea', 'title']);
const voidTags = new Set(
  'area base br col embed hr img input link meta param source track wbr'.split(' '),
);
function tags(s) {
  const result = [],
    stack = [];
  const startTag = /<(\/?)([a-zA-Z][\w:-]*)\b/y;
  let pos = 0;
  while (pos < s.length) {
    const i = s.indexOf('<', pos);
    if (i < 0) break;
    if (s.startsWith('<!--', i)) {
      const end = s.indexOf('-->', i + 4);
      pos = end < 0 ? s.length : end + 3;
      continue;
    }
    startTag.lastIndex = i;
    const m = startTag.exec(s);
    if (!m) {
      pos = i + 1;
      continue;
    }
    let j = i + m[0].length,
      quote = '';
    for (; j < s.length; j++) {
      const c = s[j];
      if (quote) {
        if (c === quote) quote = '';
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    if (j >= s.length) break;
    const name = m[2].toLowerCase();
    pos = j + 1;
    if (m[1]) {
      const k = stack.findLastIndex((t) => t.name === name);
      if (k >= 0) {
        stack[k].end = i;
        stack.length = k;
      }
      continue;
    }
    const attrs = Object.create(null),
      duplicates = [];
    for (const a of s
      .slice(i + m[0].length, j)
      .matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g)) {
      const key = a[1].toLowerCase();
      if (Object.hasOwn(attrs, key)) duplicates.push(key);
      else attrs[key] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    const t = {
      name,
      attrs,
      duplicates,
      offset: i,
      bodyStart: pos,
      end: pos,
      parent: stack.at(-1) || null,
    };
    result.push(t);
    if (rawTextTags.has(name)) {
      const close = new RegExp('</' + name + '\\s*>', 'ig');
      close.lastIndex = pos;
      const end = close.exec(s);
      t.end = end?.index ?? s.length;
      pos = end ? close.lastIndex : s.length;
    } else if (!voidTags.has(name)) {
      stack.push(t);
    }
  }
  return result;
}
const has = (t, key) => Object.hasOwn(t.attrs, key);
const value = (t, k) => (t.attrs[k] || '').trim();
const lower = (t, k) => value(t, k).toLowerCase();
const tokens = (t, k) => value(t, k).split(/\s+/).filter(Boolean);
const loc = (t) => ({ tag: t.name, offset: t.offset });
const names = (arr, ...n) => arr.filter((t) => n.includes(t.name));
const issues = (a) => ({ count: a.length, items: a.slice(0, 100) });
const ancestor = (t, name) => {
  for (let p = t.parent; p; p = p.parent) if (p.name === name) return p;
  return null;
};
const checks = [];
function add(id, zh, en, zd, ed, example, fn) {
  checks.push(tool(id, zh, en, zd, ed, [source(example)], ({ text }) => fn(tags(text), text)));
}
add(
  'html-id-uniqueness',
  'HTML 重复 ID 核对',
  'Duplicate HTML IDs',
  '查找标记中重复使用的非空 id，并返回源偏移位置。',
  'Find nonempty ID values used more than once and report source offsets.',
  '<h2 id="a">Menu</h2><p id="a">Tea</p>',
  (a) => {
    const by = new Map();
    for (const t of a.filter((t) => value(t, 'id'))) {
      const id = t.attrs.id;
      if (!by.has(id)) by.set(id, []);
      by.get(id).push(t.offset);
    }
    return issues([...by].filter(([, v]) => v.length > 1).map(([id, offsets]) => ({ id, offsets })));
  },
);
add(
  'html-fragment-targets',
  'HTML 页内锚点核对',
  'HTML fragment target coverage',
  '检查本页片段链接是否存在对应 ID 或传统命名锚点。',
  'Match decoded in-page fragments against element IDs and legacy named anchors in the supplied markup.',
  '<a href="#tea">Tea</a><h2 id="tea">Tea</h2>',
  (a) => {
    const ids = new Set(
      a.flatMap((t) => [t.attrs.id, t.name === 'a' ? t.attrs.name : null]).filter(Boolean),
    );
    return {
      links: names(a, 'a', 'area')
        .filter((t) => value(t, 'href').startsWith('#') && value(t, 'href').length > 1)
        .map((t) => {
          const fragment = t.attrs.href.trim().slice(1);
          let id;
          try {
            id = decodeURIComponent(fragment);
          } catch {
            id = null;
          }
          return { ...loc(t), fragment, found: ids.has(id) };
        }),
    };
  },
);
add(
  'html-aria-reference-targets',
  'ARIA 引用目标核对',
  'ARIA ID reference coverage',
  '核对常用 ARIA 空白分隔 ID 引用是否存在于当前 HTML。',
  'Validate common ARIA ID references against available IDs in the supplied markup.',
  '<input aria-describedby="hint"><p id="hint">Use letters</p>',
  (a) => {
    const ids = new Set(a.map((t) => t.attrs.id));
    return issues(
      a.flatMap((t) =>
        [
          'aria-describedby',
          'aria-labelledby',
          'aria-controls',
          'aria-owns',
          'aria-flowto',
          'aria-details',
          'aria-errormessage',
          'aria-activedescendant',
        ].flatMap((attribute) =>
          tokens(t, attribute)
            .filter((id) => !ids.has(id))
            .map((id) => ({ ...loc(t), attribute, id })),
        ),
      ),
    );
  },
);
add(
  'html-positive-tabindex',
  '正数 tabindex 检查',
  'Positive tabindex review',
  '列出正数 tabindex，以便检查自定义键盘顺序。',
  'Locate positive integer tabindex values for a keyboard navigation order review.',
  '<button tabindex="3">Open</button>',
  (a) =>
    issues(
      a
        .filter((t) => /^\+?\d+$/.test(value(t, 'tabindex')) && Number(t.attrs.tabindex) > 0)
        .map((t) => ({ ...loc(t), value: t.attrs.tabindex })),
    ),
);
add(
  'html-accesskey-conflicts',
  '快捷键冲突检查',
  'Access key conflicts',
  '按小写候选快捷键汇总重复使用位置。',
  'Find accesskey tokens assigned to multiple elements using case-insensitive matching.',
  '<a accesskey="h">Home</a><button accesskey="H">Help</button>',
  (a) => {
    const used = new Map();
    for (const t of a)
      for (const key of unique(tokens(t, 'accesskey').map((k) => k.toLowerCase()))) {
        if (!used.has(key)) used.set(key, []);
        used.get(key).push(t.offset);
      }
    return issues([...used].filter(([, o]) => o.length > 1).map(([key, offsets]) => ({ key, offsets })));
  },
);
add(
  'html-document-language',
  'HTML 文档语言检查',
  'HTML language declarations',
  '检查 html 根元素的 lang 及内嵌语言声明能否按 Intl 解析。',
  'Report the root lang and validate explicit lang declarations using Intl language tag parsing.',
  '<html lang="en"><p lang="fr">Salut</p></html>',
  (a) => ({
    rootLanguage: value(a.find((t) => t.name === 'html') || { attrs: {} }, 'lang') || null,
    declarations: a
      .filter((t) => has(t, 'lang'))
      .map((t) => {
        let canonical = null;
        try {
          canonical = Intl.getCanonicalLocales(t.attrs.lang)[0];
        } catch {}
        return { ...loc(t), value: t.attrs.lang, canonical };
      }),
  }),
);
add(
  'html-landmark-inventory',
  'HTML 地标清单',
  'HTML landmark inventory',
  '汇总语义区域和显式地标角色及其标签，供结构复核。',
  'List semantic landmark candidates and explicit landmark roles with any supplied labels.',
  '<main><nav aria-label="Menu"></nav></main>',
  (a) => {
    const implicit = {
        main: 'main',
        nav: 'navigation',
        aside: 'complementary',
        header: 'banner',
        footer: 'contentinfo',
        search: 'search',
      },
      roles = new Set([
        'main',
        'navigation',
        'complementary',
        'banner',
        'contentinfo',
        'form',
        'region',
        'search',
      ]);
    return {
      landmarks: a.flatMap((t) => {
        const role = value(t, 'role') || implicit[t.name];
        return roles.has(role)
          ? [{ ...loc(t), role, label: value(t, 'aria-label') || value(t, 'aria-labelledby') || null }]
          : [];
      }),
    };
  },
);
add(
  'html-main-landmark-count',
  '主内容地标数量',
  'Main landmark count',
  '统计未直接设置 hidden 或 aria-hidden 的 main 元素和 main 角色。',
  'Count main elements or main roles without a directly applied hidden or aria-hidden attribute.',
  '<main>Content</main>',
  (a) => {
    const list = a.filter(
      (t) =>
        (t.name === 'main' || lower(t, 'role') === 'main') &&
        !has(t, 'hidden') &&
        lower(t, 'aria-hidden') !== 'true',
    );
    return { count: list.length, locations: list.map(loc) };
  },
);
add(
  'html-skip-link-target',
  '跳转主内容链接检查',
  'Skip link target review',
  '列出前五个链接中的同页跳转及其目标元素类型，供检查跳转主内容入口。',
  'Inspect local jumps among the first five links and identify target element types for skip-link review.',
  '<a href="#main">Skip to content</a><main id="main"></main>',
  (a) => ({
    earlyJumps: names(a, 'a')
      .filter((t) => has(t, 'href'))
      .slice(0, 5)
      .filter((t) => value(t, 'href').startsWith('#'))
      .map((t) => {
        const fragment = t.attrs.href.trim().slice(1);
        let id = fragment;
        try {
          id = decodeURIComponent(fragment);
        } catch {}
        return { fragment, target: a.find((x) => x.attrs.id === id)?.name || null };
      }),
  }),
);
add(
  'html-iframe-title-audit',
  '内嵌框架标题检查',
  'Iframe title review',
  '定位没有非空 title 的 iframe，并返回其资源地址。',
  'Locate iframe elements lacking nonempty title attributes and report their source URLs.',
  '<iframe src="/calendar"></iframe>',
  (a) =>
    issues(
      names(a, 'iframe')
        .filter((t) => !value(t, 'title'))
        .map((t) => ({ ...loc(t), src: value(t, 'src') })),
    ),
);
add(
  'html-media-caption-tracks',
  '媒体字幕轨清单',
  'Media caption track inventory',
  '对每个音视频元素列出其字幕轨语言并标记缺少 captions 轨的情况。',
  'List caption track languages for each media element and flag absent caption tracks.',
  '<video><track kind="captions" srclang="en" src="captions.vtt"></video>',
  (a) => ({
    media: names(a, 'video', 'audio').map((t) => {
      const tracks = names(a, 'track').filter((x) => x.parent === t && lower(x, 'kind') === 'captions');
      return {
        ...loc(t),
        hasCaptions: tracks.length > 0,
        languages: tracks.map((x) => value(x, 'srclang')),
      };
    }),
  }),
);
add(
  'html-autoplay-inventory',
  '自动播放媒体清单',
  'Autoplay media review',
  '列出自动播放的音视频及 muted、controls 状态。',
  'Locate autoplaying media and report muted and controls attribute states.',
  '<video autoplay muted></video>',
  (a) =>
    issues(
      names(a, 'audio', 'video')
        .filter((t) => has(t, 'autoplay'))
        .map((t) => ({ ...loc(t), muted: has(t, 'muted'), controls: has(t, 'controls') })),
    ),
);
add(
  'html-table-caption-review',
  '数据表标题复核',
  'Table caption review',
  '检查各表的直接 caption 子元素及其有无源文本。',
  'Check each table for a direct caption child and nonempty source text.',
  '<table><caption>Menu</caption><tr><td>Tea</td></tr></table>',
  (a, s) => ({
    tables: names(a, 'table').map((t) => {
      const c = names(a, 'caption').find((x) => x.parent === t);
      return {
        ...loc(t),
        hasCaption: !!c,
        caption: c
          ? s
              .slice(c.bodyStart, c.end)
              .replace(/<[^>]*>/g, '')
              .trim()
          : null,
      };
    }),
  }),
);
add(
  'html-table-header-links',
  '表格 headers 关联检查',
  'Table header associations',
  '核对单元格 headers 中的每个标记是否指向同一表内的 th。',
  'Check whether each cell headers token identifies a th in the same source table.',
  '<table><tr><th id="price">Price</th><td headers="price">2</td></tr></table>',
  (a) => {
    const ids = new Map(
      names(a, 'th')
        .filter((t) => value(t, 'id'))
        .map((t) => [t.attrs.id, t]),
    );
    return issues(
      names(a, 'td', 'th').flatMap((t) =>
        tokens(t, 'headers')
          .filter((id) => !ids.has(id) || ancestor(t, 'table') !== ancestor(ids.get(id), 'table'))
          .map((id) => ({ ...loc(t), id })),
      ),
    );
  },
);
add(
  'html-th-scope-review',
  '表头 scope 值检查',
  'Header cell scope review',
  '列出 th 的 scope 值，并检查显式值是否属于 HTML 枚举。',
  'Inspect th scope attributes and check explicit values against the HTML enumeration.',
  '<th scope="column">Price</th>',
  (a) => ({
    headers: names(a, 'th').map((t) => ({
      ...loc(t),
      scope: value(t, 'scope') || null,
      valid: !has(t, 'scope') || ['row', 'col', 'rowgroup', 'colgroup'].includes(lower(t, 'scope')),
    })),
  }),
);
add(
  'html-fieldset-legends',
  '表单组图例检查',
  'Fieldset legend review',
  '检查 fieldset 的首个直接子元素是否为 legend。',
  'Check whether each fieldset starts with a direct legend element.',
  '<fieldset><legend>Address</legend><input></fieldset>',
  (a) => ({
    groups: names(a, 'fieldset').map((t) => ({
      ...loc(t),
      firstChildIsLegend: a.find((x) => x.parent === t)?.name === 'legend',
    })),
  }),
);
add(
  'html-radio-group-defaults',
  '单选组默认值检查',
  'Radio group defaults',
  '按同一表单和 name 汇总静态单选项，检查多选默认和空组名。',
  'Group static radio inputs by form owner and name to detect multiple checked defaults and empty names.',
  '<form><input type="radio" name="size" checked><input type="radio" name="size"></form>',
  (a) => {
    const group = new Map();
    for (const t of names(a, 'input').filter((t) => lower(t, 'type') === 'radio')) {
      const form = has(t, 'form')
          ? value(t, 'form')
          : ancestor(t, 'form')?.attrs.id || 'offset-' + (ancestor(t, 'form')?.offset ?? 'none'),
        name = value(t, 'name'),
        key = JSON.stringify([form, name]);
      if (!group.has(key)) group.set(key, { form, name, count: 0, checked: 0 });
      const g = group.get(key);
      g.count++;
      if (has(t, 'checked')) g.checked++;
    }
    return { groups: [...group.values()].map((g) => ({ ...g, review: !g.name || g.checked > 1 })) };
  },
);
add(
  'html-details-summaries',
  '折叠面板摘要检查',
  'Details summary check',
  '报告每个 details 的直接 summary 数量和首个元素类型。',
  'Report direct summary counts and the first child element of each details panel.',
  '<details><summary>Notes</summary><p>Body</p></details>',
  (a) => ({
    panels: names(a, 'details').map((t) => {
      const children = a.filter((x) => x.parent === t);
      return {
        ...loc(t),
        summaries: names(children, 'summary').length,
        firstChild: children[0]?.name || null,
      };
    }),
  }),
);
add(
  'html-autofocus-review',
  '自动聚焦元素检查',
  'Autofocus inventory',
  '列出声明 autofocus 的元素及其 ID，以便检查意外焦点移动。',
  'List autofocus elements with IDs to review potential unexpected focus movement.',
  '<input autofocus id="search">',
  (a) => issues(a.filter((t) => has(t, 'autofocus')).map((t) => ({ ...loc(t), id: value(t, 'id') }))),
);
add(
  'html-dialog-labels',
  '对话框名称复核',
  'Dialog naming review',
  '检查原生及 ARIA 对话框是否声明 aria-label 或 aria-labelledby。',
  'Inspect native and ARIA dialog elements for explicit aria-label or aria-labelledby attributes.',
  '<dialog aria-label="Order">Ready</dialog>',
  (a) => ({
    dialogs: a
      .filter((t) => t.name === 'dialog' || ['dialog', 'alertdialog'].includes(lower(t, 'role')))
      .map((t) => ({
        ...loc(t),
        label: value(t, 'aria-label') || null,
        labelledBy: tokens(t, 'aria-labelledby'),
      })),
  }),
);
add(
  'html-svg-labels',
  'SVG 可访问名称线索',
  'SVG naming signals',
  '检查内联 SVG 根元素的直接 title、ARIA 标签及隐藏状态。',
  'Inspect inline SVG elements for direct titles, ARIA names and hidden state.',
  '<svg role="img"><title>Sales</title></svg>',
  (a) => ({
    graphics: names(a, 'svg').map((t) => ({
      ...loc(t),
      hasTitle: a.some((x) => x.name === 'title' && x.parent === t),
      label: value(t, 'aria-label') || null,
      labelledBy: tokens(t, 'aria-labelledby'),
      ariaHidden: lower(t, 'aria-hidden') === 'true',
    })),
  }),
);
add(
  'html-hidden-focusable',
  '隐藏区域可聚焦线索',
  'Focusable elements inside aria-hidden regions',
  '找出有 aria-hidden 祖先或自身标记的原生交互元素与可聚焦 tabindex。',
  'Locate native interactive or nonnegative tabindex elements in explicitly aria-hidden source subtrees.',
  '<div aria-hidden="true"><button>Edit</button></div>',
  (a) =>
    issues(
      a
        .filter((t) => {
          if (has(t, 'disabled') || lower(t, 'type') === 'hidden') return false;
          const focus = has(t, 'tabindex')
            ? /^\+?\d+$/.test(value(t, 'tabindex'))
            : (t.name === 'a' && has(t, 'href')) ||
              ['input', 'button', 'select', 'textarea'].includes(t.name);
          if (!focus) return false;
          for (let p = t; p; p = p.parent) if (lower(p, 'aria-hidden') === 'true') return true;
          return false;
        })
        .map(loc),
    ),
);
add(
  'html-list-structure',
  'HTML 列表子元素检查',
  'List child structure',
  '定位 ul 或 ol 中除 li、script、template 之外的直接元素。',
  'Find direct element children of ul or ol other than li, script or template.',
  '<ul><div>Menu</div></ul>',
  (a) =>
    issues(
      a
        .filter(
          (t) => ['ol', 'ul'].includes(t.parent?.name) && !['li', 'script', 'template'].includes(t.name),
        )
        .map(loc),
    ),
);
add(
  'html-meter-range-check',
  'meter 数值区间检查',
  'Meter range validation',
  '核对 meter 的数值是否有限、最小值不大于最大值、value 落在区间内。',
  'Validate finite meter values, min/max ordering and the position of value within the range.',
  '<meter min="0" max="10" value="12"></meter>',
  (a) => ({
    meters: names(a, 'meter').map((t) => {
      const number = (k, fallback) => (has(t, k) ? (value(t, k) ? Number(t.attrs[k]) : NaN) : fallback);
      const min = number('min', 0),
        max = number('max', 1),
        v = number('value', NaN);
      return {
        ...loc(t),
        valid: [min, max, v].every(Number.isFinite) && min <= max && v >= min && v <= max,
      };
    }),
  }),
);
add(
  'html-progress-states',
  'progress 状态检查',
  'Progress element states',
  '区分不定进度条与有值进度条，并检查正数上限和有效区间。',
  'Distinguish indeterminate progress elements and validate positive maxima and bounded values.',
  '<progress max="20" value="5"></progress>',
  (a) => ({
    progress: names(a, 'progress').map((t) => {
      const max = has(t, 'max') ? Number(value(t, 'max')) : 1,
        indeterminate = !has(t, 'value'),
        v = value(t, 'value') ? Number(t.attrs.value) : NaN;
      return {
        ...loc(t),
        indeterminate,
        valid:
          Number.isFinite(max) &&
          max > 0 &&
          (indeterminate || (Number.isFinite(v) && v >= 0 && v <= max)),
      };
    }),
  }),
);
add(
  'html-track-language-audit',
  '字幕轨语言检查',
  'Subtitle track languages',
  '检查字幕轨的语言标记和同一媒体元素下重复默认轨。',
  'Check subtitle track language tags and repeated default tracks on the same media parent.',
  '<video><track kind="subtitles" srclang="fr" default></video>',
  (a) => ({
    tracks: names(a, 'track').map((t) => {
      let language = null;
      try {
        language = Intl.getCanonicalLocales(value(t, 'srclang'))[0];
      } catch {}
      return {
        ...loc(t),
        kind: lower(t, 'kind') || 'subtitles',
        language,
        default: has(t, 'default'),
        otherDefault:
          has(t, 'default') &&
          a.some((x) => x !== t && x.name === 'track' && x.parent === t.parent && has(x, 'default')),
      };
    }),
  }),
);
add(
  'html-text-direction-review',
  'HTML 文字方向检查',
  'HTML direction declarations',
  '列出 dir 与 bdo 的方向值，标出非枚举值或 bdo 错用 auto。',
  'Validate explicit dir values and check that bdo uses a fixed ltr or rtl direction.',
  '<bdo dir="rtl">ABC</bdo>',
  (a) => ({
    directions: a
      .filter((t) => has(t, 'dir') || t.name === 'bdo')
      .map((t) => ({
        ...loc(t),
        dir: value(t, 'dir'),
        valid: (t.name === 'bdo' ? ['ltr', 'rtl'] : ['ltr', 'rtl', 'auto']).includes(lower(t, 'dir')),
      })),
  }),
);
add(
  'html-button-type-review',
  '表单按钮类型复核',
  'Form button type review',
  '检查表单内按钮的显式 type 和省略类型时的默认提交行为。',
  'Inspect button types inside source forms and identify implicit submit defaults.',
  '<form><button>Save</button></form>',
  (a) => ({
    buttons: names(a, 'button')
      .filter((t) => ancestor(t, 'form') || has(t, 'form'))
      .map((t) => ({
        ...loc(t),
        declared: value(t, 'type') || null,
        implicitSubmit: !['button', 'reset', 'submit'].includes(lower(t, 'type')),
      })),
  }),
);
add(
  'html-autocomplete-tokens',
  '表单自动完成字段清单',
  'Autocomplete token inventory',
  '列出自动完成字段的 section、配送或账单分组与最后一个用途词。',
  'Inventory autocomplete tokens, section names, shipping or billing groups and final purpose tokens.',
  '<input autocomplete="section-order shipping postal-code">',
  (a) => ({
    fields: names(a, 'input', 'select', 'textarea')
      .filter((t) => has(t, 'autocomplete'))
      .map((t) => {
        const parts = tokens(t, 'autocomplete').map((v) => v.toLowerCase());
        return {
          ...loc(t),
          section: parts.find((p) => p.startsWith('section-')) || null,
          group: parts.find((p) => p === 'billing' || p === 'shipping') || null,
          purpose: parts.filter((p) => p !== 'webauthn').at(-1) || null,
        };
      }),
  }),
);
add(
  'html-duplicate-attributes',
  'HTML 重复属性核对',
  'Duplicate HTML attributes',
  '按起始标签标出重复出现的属性名称，忽略属性名大小写。',
  'Identify repeated attribute names per start tag using case-insensitive attribute matching.',
  '<p class="lead" CLASS="body">Text</p>',
  (a) =>
    issues(
      a.filter((t) => t.duplicates.length).map((t) => ({ ...loc(t), duplicates: unique(t.duplicates) })),
    ),
);
export { checks as tools };
