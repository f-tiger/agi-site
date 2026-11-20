const localized = (zh, en) => ({zh, en});
const str = (key, zh, en, maxLength, multiline = false) => ({
  key, label: localized(zh, en), type: 'string', maxLength, ...(multiline ? {multiline} : {}),
});
const integer = (key, zh, en, min, max) => ({key, label: localized(zh, en), type: 'integer', min, max});
const bool = (key, zh, en) => ({key, label: localized(zh, en), type: 'boolean'});

function httpUrl(value, base) {
  let url;
  try {
    url = new URL(value.trim(), base);
  } catch {
    throw Error('Enter a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw Error('Enter a valid HTTP or HTTPS URL without credentials.');
  }
  return url;
}

function rows(value, limit, columns) {
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > limit) throw Error('Enter a supported number of nonblank rows.');
  return lines.map(line => {
    const fields = line.split('|').map(field => field.trim());
    if (fields.length !== columns || fields.some(field => !field)) {
      throw Error('Each row must contain the specified number of nonempty fields separated by |.');
    }
    return fields;
  });
}

function text(value) {
  const normalized = value.trim().replace(/\s+/gu, ' ');
  if (!normalized) throw Error('Enter nonblank text.');
  return normalized;
}

function day(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Use a calendar date in YYYY-MM-DD format.');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw Error('Use a valid calendar date.');
  }
  return time;
}

const tracking = /^(?:utm_|gclid$|fbclid$|msclkid$)/i;
const xml = value => value.replace(/[<>&"']/gu, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'})[c]);
const ld = (type, data) => ({
  jsonLd: JSON.stringify({'@context': 'https://schema.org', '@type': type, ...data}, null, 2).replace(/</g, '\\u003c'),
});
const graphemes = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
const count = value => Array.from(graphemes.segment(value)).length;
const genericLabel = /^(?:click here|here|read more|more|details|learn more|点击这里|这里|查看更多|更多|阅读全文|了解更多|详情)[.!。！\s]*$/iu;

function contrast(first, second) {
  const luminance = color => {
    if (!/^#[\da-f]{6}$/i.test(color)) throw Error('Use colors in #RRGGBB format.');
    const channel = offset => {
      const s = parseInt(color.slice(offset, offset + 2), 16) / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return channel(1) * 0.2126 + channel(3) * 0.7152 + channel(5) * 0.0722;
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function validLocale(value) {
  if (value.toLowerCase() === 'x-default') return 'x-default';
  if (!/^[a-z]{2,3}(?:-[a-z]{4})?(?:-[a-z]{2})?$/i.test(value)) {
    throw Error('Use a language tag with an optional script or region, or x-default.');
  }
  return value.toLowerCase();
}

function markdownLabel(value) {
  return text(value).replace(/[\\[\]*_`<>]/g, '\\$&');
}

export const tools = [
  {
    id: 'page-meta-budget',
    title: localized('标题与摘要字数检查', 'Title and description budget'),
    description: localized('按自定义字数预算检查页面标题和摘要，按屏幕可见字符计数。', 'Measure visible characters in a page title and description against your editorial limits.'),
    inputs: [
      str('title', '页面标题', 'Page title', 300),
      str('description', '页面摘要', 'Page description', 1500),
      integer('titleLimit', '标题字数预算', 'Title character limit', 1, 300),
      integer('descriptionLimit', '摘要字数预算', 'Description character limit', 1, 1500),
    ],
    example: {title: 'BPJ 创作者工具目录', description: '按实际任务查找免费网络工具。', titleLimit: 35, descriptionLimit: 85},
    run({title, description, titleLimit, descriptionLimit}) {
      const measure = (value, limit) => {
        const length = count(text(value));
        return {characters: length, limit, remaining: limit - length, fits: length <= limit};
      };
      return {title: measure(title, titleLimit), description: measure(description, descriptionLimit)};
    },
  },
  {
    id: 'canonical-link-check',
    title: localized('规范链接检查', 'Canonical URL check'),
    description: localized('比较页面与声明的 canonical，识别跨来源、跟踪参数和片段。', 'Resolve a declared canonical link and check for cross-origin targets, fragments and tracking parameters.'),
    inputs: [str('page', '当前页面 URL', 'Current page URL', 1800), str('declared', 'canonical 的 href', 'Canonical href', 1800)],
    example: {page: 'https://example.org/guide?utm_source=mail', declared: '/guide'},
    run({page, declared}) {
      const url = httpUrl(page);
      const canonical = httpUrl(text(declared), url);
      return {
        resolved: canonical.href,
        sameOrigin: canonical.origin === url.origin,
        selfCanonical: canonical.href === url.href,
        samePath: canonical.pathname === url.pathname,
        hasFragment: Boolean(canonical.hash),
        trackingParameters: [...new Set(Array.from(canonical.searchParams.keys()).filter(key => tracking.test(key)))],
      };
    },
  },
  {
    id: 'robots-meta-reader',
    title: localized('Robots 元标签解读', 'Robots meta reader'),
    description: localized('解读已提供的 robots 元标签，提取索引、链接跟踪与摘要限制。', 'Interpret sitewide robots meta directives for indexing, link following and snippet limits.'),
    inputs: [str('directives', 'robots content（逗号分隔）', 'Robots content (comma-separated)', 900)],
    example: {directives: 'noindex, follow, max-snippet: 120, max-image-preview: large'},
    run({directives}) {
      const rules = new Map(directives.toLowerCase().split(',').map(token => {
        const [name, ...value] = token.split(':');
        return [name.trim(), value.join(':').trim()];
      }).filter(([name]) => name));
      const snippet = rules.get('max-snippet');
      const image = rules.get('max-image-preview');
      if ((snippet !== undefined && !/^(?:-1|\d{1,6})$/.test(snippet)) ||
          (image !== undefined && !['none', 'standard', 'large'].includes(image))) {
        throw Error('Invalid snippet or image preview directive.');
      }
      return {
        indexAllowed: !rules.has('none') && !rules.has('noindex'),
        followAllowed: !rules.has('none') && !rules.has('nofollow'),
        maxSnippetCharacters: rules.has('nosnippet') ? 0 : snippet === undefined || snippet === '-1' ? null : Number(snippet),
        imagePreview: image ?? null,
        directives: [...rules.keys()],
      };
    },
  },
  {
    id: 'sitemap-xml-builder',
    title: localized('站点地图 XML 生成', 'XML sitemap builder'),
    description: localized('把最多 40 个同源 URL 去重并转成可保存的 sitemap XML。', 'Deduplicate up to 40 same-origin URLs and turn them into XML sitemap entries.'),
    inputs: [str('urls', 'URL，每行一个', 'One URL per line', 6000, true)],
    example: {urls: 'https://example.org/\nhttps://example.org/guide?language=en&format=long'},
    run({urls}) {
      const list = urls.split(/\r?\n/).map(value => value.trim()).filter(Boolean).map(value => httpUrl(value));
      if (!list.length || list.length > 40 || list.some(url => url.origin !== list[0].origin || url.hash)) {
        throw Error('Provide 1–40 same-origin URLs without fragments.');
      }
      const links = [...new Set(list.map(url => url.href))];
      const locations = links.map(url => '  <url><loc>' + xml(url) + '</loc></url>').join('\n');
      return {count: links.length, xml: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + locations + '\n</urlset>'};
    },
  },
  {
    id: 'redirect-map-check',
    title: localized('重定向链与循环检查', 'Redirect chain and loop check'),
    description: localized('检查预先收集的重定向表，标出冲突、循环和多跳。', 'Find conflicting destinations, loops and extra hops in a supplied redirect map.'),
    inputs: [str('mapping', '来源 URL | 目的 URL，每行一组', 'Source URL | destination URL per line', 6000, true)],
    example: {mapping: 'https://example.org/old | https://example.org/intermediate\nhttps://example.org/intermediate | https://example.org/current'},
    run({mapping}) {
      const destinations = new Map();
      const conflicts = new Set();
      for (const [source, target] of rows(mapping, 40, 2)) {
        const a = httpUrl(source);
        const b = httpUrl(target);
        if (a.hash || b.hash) throw Error('Use redirect URLs without fragments.');
        if (destinations.has(a.href) && destinations.get(a.href) !== b.href) conflicts.add(a.href);
        else destinations.set(a.href, b.href);
      }
      return {
        conflicts: [...conflicts],
        chains: [...destinations.keys()].map(source => {
          const visited = new Set();
          let current = source;
          while (destinations.has(current) && !visited.has(current) && !conflicts.has(current)) {
            visited.add(current);
            current = destinations.get(current);
          }
          return {source, hops: visited.size, destination: current, loop: visited.has(current), ambiguous: conflicts.has(current)};
        }),
      };
    },
  },
  {
    id: 'social-card-check',
    title: localized('社交分享卡片检查', 'Social share card check'),
    description: localized('检查分享标题、描述、图片 HTTPS 地址和宽高比。', 'Check share-card copy, the image URL scheme and image proportions.'),
    inputs: [
      str('title', '分享标题', 'Share title', 400),
      str('description', '分享描述', 'Share description', 1500),
      str('image', '图片绝对 URL', 'Absolute image URL', 1500),
      integer('width', '图片宽度（像素）', 'Image width in pixels', 1, 20000),
      integer('height', '图片高度（像素）', 'Image height in pixels', 1, 20000),
    ],
    example: {title: 'Free browser utilities', description: 'Work with your text and data in the browser.', image: 'https://example.org/card.png', width: 1200, height: 630},
    run({title, description, image, width, height}) {
      const url = httpUrl(image);
      const ratio = width / height;
      return {
        titleCharacters: count(text(title)),
        descriptionCharacters: count(text(description)),
        imageUrl: url.href,
        imageUsesHttps: url.protocol === 'https:',
        imageAspectRatio: Number(ratio.toFixed(3)),
        fitsWidePreview: ratio >= 1.8 && ratio <= 2.05,
      };
    },
  },
  {
    id: 'new-tab-link-check',
    title: localized('新窗口外链属性检查', 'New-tab link attributes'),
    description: localized('核对 target、rel 和商业关系，给出显式链接属性建议。', 'Check supplied target and rel attributes and suggest explicit tokens for commercial or contributed links.'),
    inputs: [
      bool('newTab', '是否在新标签页打开', 'Opens in a new tab'),
      str('rel', 'rel 属性值（可为空）', 'rel tokens (may be blank)', 300),
      bool('sponsored', '是否为商业链接', 'Sponsored link'),
      bool('contributed', '是否为用户提供的链接', 'User-contributed link'),
    ],
    example: {newTab: true, rel: 'nofollow', sponsored: true, contributed: false},
    run({newTab, rel, sponsored, contributed}) {
      const existing = [...new Set(rel.trim().toLowerCase().split(/\s+/).filter(Boolean))];
      const desired = [...existing];
      if (newTab && !existing.includes('noopener') && !existing.includes('noreferrer')) desired.push('noopener');
      if (sponsored && !existing.includes('sponsored')) desired.push('sponsored');
      if (contributed && !existing.includes('ugc')) desired.push('ugc');
      return {
        existing,
        suggestedRel: desired.filter(token => !newTab || token !== 'opener').join(' '),
        explicitOpener: newTab && existing.includes('opener'),
        explicitlyIsolated: !newTab || ((existing.includes('noopener') || existing.includes('noreferrer')) && !existing.includes('opener')),
      };
    },
  },
  {
    id: 'image-alt-check',
    title: localized('图片替代文本检查', 'Image alternative text check'),
    description: localized('根据装饰图、信息图或功能图的角色检查已有替代文字。', 'Check the supplied alternative text against a decorative, informative or functional image role.'),
    inputs: [
      str('role', '图片角色（decorative、informative、functional）', 'Role (decorative, informative, functional)', 20),
      str('alt', 'alt 属性值（可为空）', 'Alt attribute value (may be blank)', 800),
    ],
    example: {role: 'functional', alt: '打开产品搜索'},
    run({role, alt}) {
      role = role.trim().toLowerCase();
      if (!['decorative', 'informative', 'functional'].includes(role)) throw Error('Use decorative, informative or functional as the image role.');
      const value = alt.trim();
      const findings = [];
      if (role === 'decorative' && value) findings.push('decorative_alt_should_be_empty');
      if (role !== 'decorative' && !value) findings.push('missing_meaningful_alt');
      if (/(?:\.(?:png|jpeg|jpg|webp|gif|svg)$|^(?:image|picture|photo|icon|图片|照片|图标)$)/iu.test(value)) {
        findings.push('filename_or_generic_alt');
      }
      return {pass: findings.length === 0, findings, characters: count(value)};
    },
  },
  {
    id: 'color-contrast-check',
    title: localized('WCAG 文字对比度', 'WCAG text contrast'),
    description: localized('计算实心文字颜色与背景色的相对亮度和 WCAG 对比度。', 'Calculate WCAG contrast for solid foreground and background colors.'),
    inputs: [str('foreground', '文字颜色 #RRGGBB', 'Text color #RRGGBB', 7), str('background', '背景颜色 #RRGGBB', 'Background #RRGGBB', 7)],
    example: {foreground: '#264653', background: '#FFFFFF'},
    run({foreground, background}) {
      const ratio = contrast(foreground.trim(), background.trim());
      return {ratio: Number(ratio.toFixed(3)), aaNormalText: ratio >= 4.5, aaLargeText: ratio >= 3, aaaNormalText: ratio >= 7, aaaLargeText: ratio >= 4.5};
    },
  },
  {
    id: 'heading-outline-check',
    title: localized('Markdown 标题层级检查', 'Markdown heading outline'),
    description: localized('提取 ATX 标题层级，跳过代码块并标出跳级。', 'Extract ATX headings outside fenced code and flag skipped levels.'),
    inputs: [str('markdown', 'Markdown 文本', 'Markdown source', 10000, true)],
    example: {markdown: '# 帮助中心\n\n## 入门\n\n#### 导出记录'},
    run({markdown}) {
      const headings = [];
      let fence = null;
      let previous = 0;
      for (const [index, line] of markdown.split(/\r?\n/).entries()) {
        const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
        if (fence) {
          if (fenceMatch && fence[0] === fenceMatch[1][0] && fenceMatch[1].length >= fence.length && !fenceMatch[2].trim()) fence = null;
          continue;
        }
        if (fenceMatch) {
          fence = fenceMatch[1];
          continue;
        }
        const match = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
        if (!match) continue;
        const level = match[1].length;
        headings.push({line: index + 1, level, title: match[2].replace(/\s+#+$/u, ''), skipsLevel: level > previous + 1});
        previous = level;
      }
      return {headings: headings.slice(0, 100), totalHeadings: headings.length, topLevelCount: headings.filter(h => h.level === 1).length, skippedLevelCount: headings.filter(h => h.skipsLevel).length};
    },
  },
  {
    id: 'link-label-check',
    title: localized('链接文字清晰度检查', 'Link label clarity'),
    description: localized('从链接清单找出空白、通用文案以及多处同名但去向不同的链接。', 'Flag blank or generic labels and repeated labels that lead to different targets.'),
    inputs: [str('links', '链接文字 | 目标 URL，每行一组', 'Link label | target URL per line', 5600, true)],
    example: {links: 'Read more | https://example.org/start\nRead more | https://example.org/pricing\nContact support | https://example.org/help'},
    run({links}) {
      const entries = links.split(/\r?\n/).map((value, i) => ({value, line: i + 1})).filter(row => row.value.trim());
      if (!entries.length || entries.length > 40) throw Error('Provide between 1 and 40 links.');
      const seen = new Map();
      const records = entries.map(({value, line}) => {
        const fields = value.split('|').map(value => value.trim());
        if (fields.length !== 2) throw Error('Each row requires a link label and target URL separated by |.');
        const [label, target] = fields;
        const url = httpUrl(target).href;
        const key = label.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ');
        if (!seen.has(key)) seen.set(key, new Set());
        seen.get(key).add(url);
        return {line, label, key, url};
      });
      return {links: records.map(({key, ...record}) => ({
        ...record,
        empty: !key,
        generic: genericLabel.test(key),
        differentTargetWithSameLabel: Boolean(key && seen.get(key).size > 1),
      }))};
    },
  },
  {
    id: 'tap-target-check',
    title: localized('点击目标尺寸检查', 'Tap target size check'),
    description: localized('比较点击区域的 CSS 像素尺寸与 24px 和 44px 基准。', 'Compare target dimensions with the 24px and 44px WCAG size thresholds.'),
    inputs: [
      integer('width', '可点击宽度（CSS 像素）', 'Clickable width in CSS pixels', 1, 4000),
      integer('height', '可点击高度（CSS 像素）', 'Clickable height in CSS pixels', 1, 4000),
    ],
    example: {width: 36, height: 22},
    run({width, height}) {
      const needed = threshold => ({width: Math.max(0, threshold - width), height: Math.max(0, threshold - height)});
      return {sizeMeets24: width >= 24 && height >= 24, sizeMeets44: width >= 44 && height >= 44, pixelsTo24: needed(24), pixelsTo44: needed(44)};
    },
  },
  {
    id: 'form-label-check',
    title: localized('表单标签一致性检查', 'Form label consistency'),
    description: localized('比较可见字段标签与读屏名称，并检查必填状态是否一致。', 'Compare a field’s visible label with its accessible name and check required-state consistency.'),
    inputs: [
      str('visible', '可见标签（可为空）', 'Visible label (may be blank)', 300),
      str('accessible', '无障碍名称（可为空）', 'Accessible name (may be blank)', 300),
      bool('visiblyRequired', '界面标为必填', 'Visibly marked as required'),
      bool('programmaticallyRequired', '程序标为必填', 'Programmatically marked as required'),
    ],
    example: {visible: '电子邮件', accessible: '邮箱', visiblyRequired: true, programmaticallyRequired: true},
    run({visible, accessible, visiblyRequired, programmaticallyRequired}) {
      const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
      const label = normalize(visible);
      const name = normalize(accessible);
      return {
        hasVisibleLabel: Boolean(label),
        hasAccessibleName: Boolean(name),
        accessibleNameContainsVisibleLabel: Boolean(label && name.includes(label)),
        requiredStateMatches: visiblyRequired === programmaticallyRequired,
      };
    },
  },
  {
    id: 'faq-structured-data',
    title: localized('FAQ 结构化数据生成', 'FAQ structured data'),
    description: localized('把页面已展示的问题与回答转成 FAQPage JSON-LD。', 'Generate FAQPage JSON-LD from questions and answers already shown on the page.'),
    inputs: [str('questions', '问题 | 答案，每行一组', 'Question | answer per line', 7000, true)],
    example: {questions: 'How do I export a result? | Select Export after editing the result.\nIs signup required? | The free browser tools work without signup.'},
    run({questions}) {
      const pairs = rows(questions, 24, 2);
      if (new Set(pairs.map(([question]) => text(question).toLowerCase())).size !== pairs.length) throw Error('Provide unique questions.');
      return ld('FAQPage', {mainEntity: pairs.map(([question, answer]) => ({
        '@type': 'Question', name: text(question), acceptedAnswer: {'@type': 'Answer', text: text(answer)},
      }))});
    },
  },
  {
    id: 'breadcrumb-structured-data',
    title: localized('面包屑结构化数据生成', 'Breadcrumb structured data'),
    description: localized('根据从首页到当前页的路径输出 BreadcrumbList JSON-LD。', 'Turn the path from home to the current page into BreadcrumbList JSON-LD.'),
    inputs: [str('trail', '层级名称 | 绝对 URL，每行一组', 'Level name | absolute URL per line', 5000, true)],
    example: {trail: 'Home | https://example.org/\nTools | https://example.org/tools/\nText | https://example.org/tools/text'},
    run({trail}) {
      const entries = rows(trail, 16, 2);
      if (entries.length < 2) throw Error('Provide at least two breadcrumb levels.');
      const links = entries.map(([, url]) => httpUrl(url));
      if (new Set(links.map(url => url.href)).size !== links.length) throw Error('Use a distinct URL for each breadcrumb level.');
      return ld('BreadcrumbList', {itemListElement: entries.map(([name], index) => ({
        '@type': 'ListItem', position: index + 1, name: text(name), item: links[index].href,
      }))});
    },
  },
  {
    id: 'article-structured-data',
    title: localized('文章结构化数据生成', 'Article structured data'),
    description: localized('核对发布日期、修订日期和作者字段，并生成 Article JSON-LD。', 'Validate article dates and author details and generate Article JSON-LD.'),
    inputs: [
      str('headline', '文章标题', 'Headline', 240),
      str('url', '文章 URL', 'Article URL', 1500),
      str('author', '作者姓名', 'Author name', 180),
      str('published', '发布日期 YYYY-MM-DD', 'Published date YYYY-MM-DD', 10),
      str('modified', '修改日期 YYYY-MM-DD', 'Modified date YYYY-MM-DD', 10),
    ],
    example: {headline: 'Getting started with page metadata', url: 'https://example.org/metadata', author: 'Lin Chen', published: '2026-07-03', modified: '2026-08-01'},
    run({headline, url, author, published, modified}) {
      if (day(modified) < day(published)) throw Error('Modified date must be on or after the published date.');
      const page = httpUrl(url);
      return ld('Article', {headline: text(headline), mainEntityOfPage: page.href, author: {'@type': 'Person', name: text(author)}, datePublished: published, dateModified: modified});
    },
  },
  {
    id: 'hreflang-reciprocity-check',
    title: localized('Hreflang 互链检查', 'Hreflang reciprocal link check'),
    description: localized('检查语言版本清单中的自指、回链缺失和同语言冲突。', 'Find missing self-references, missing return links and conflicting language targets.'),
    inputs: [str('mapping', '页面 URL | 语言标签 | 对应 URL，每行一条', 'Page URL | language tag | alternate URL per line', 8000, true)],
    example: {mapping: 'https://example.org/en | en | https://example.org/en\nhttps://example.org/en | zh-CN | https://example.org/zh\nhttps://example.org/zh | en | https://example.org/en\nhttps://example.org/zh | zh-CN | https://example.org/zh'},
    run({mapping}) {
      const sources = new Map();
      const conflicts = [];
      for (const [page, tag, alternate] of rows(mapping, 50, 3)) {
        const source = httpUrl(page).href;
        const target = httpUrl(alternate).href;
        const language = validLocale(tag);
        if (!sources.has(source)) sources.set(source, new Map());
        const sub = sources.get(source);
        if (sub.has(language) && sub.get(language) !== target) conflicts.push({source, language});
        else sub.set(language, target);
      }
      const missingSelf = [];
      const missingReturn = [];
      for (const [source, alternates] of sources) {
        const selfTags = Array.from(alternates).filter(([tag, target]) => tag !== 'x-default' && target === source).map(([tag]) => tag);
        if (!selfTags.length) missingSelf.push(source);
        for (const [language, target] of alternates) {
          if (language === 'x-default' || target === source) continue;
          const targetLinks = sources.get(target);
          const reciprocal = selfTags.some(tag => targetLinks?.get(tag) === source);
          if (!reciprocal) missingReturn.push({source, language, target});
        }
      }
      return {pages: sources.size, conflicts, missingSelf, missingReturn};
    },
  },
  {
    id: 'responsive-image-check',
    title: localized('响应式图片 srcset 检查', 'Responsive image srcset check'),
    description: localized('检查 srcset 尺寸标记的重复、混用及 sizes 设置。', 'Check simple HTTP image candidates for duplicate or mixed descriptors and a missing sizes attribute.'),
    inputs: [
      str('srcset', 'srcset 属性值（逗号分隔）', 'srcset attribute value (comma-separated)', 5600, true),
      str('sizes', 'sizes 属性值（可为空）', 'sizes attribute value (may be blank)', 1000),
    ],
    example: {srcset: 'https://example.org/cover-480.webp 480w, https://example.org/cover-960.webp 960w', sizes: '(max-width: 600px) 100vw, 600px'},
    run({srcset, sizes}) {
      const fields = srcset.split(',').map(value => value.trim());
      if (!fields.length || fields.length > 30) throw Error('Provide between 1 and 30 srcset candidates.');
      const candidates = fields.map(field => {
        const tokens = field.split(/\s+/);
        if (tokens.length > 2) throw Error('Each candidate accepts one HTTP URL and one optional descriptor.');
        const [url, descriptor = '1x'] = tokens;
        if (!/^(?:[1-9]\d{0,6}w|(?:\d{1,4}(?:\.\d{1,4})?|\.\d{1,4})x)$/.test(descriptor)) throw Error('Use a positive width or pixel density descriptor.');
        const value = Number(descriptor.slice(0, -1));
        if (value <= 0) throw Error('Use a positive width or pixel density descriptor.');
        return {url: httpUrl(url).href, value, unit: descriptor.at(-1)};
      });
      const types = new Set(candidates.map(candidate => candidate.unit));
      const descriptors = candidates.map(candidate => candidate.value + candidate.unit);
      return {candidates, mixedDescriptorTypes: types.size > 1, duplicateDescriptors: [...new Set(descriptors.filter((key, i) => descriptors.indexOf(key) !== i))], missingSizesForWidthDescriptors: types.has('w') && !sizes.trim()};
    },
  },
  {
    id: 'image-frame-fit',
    title: localized('图片比例与裁切估算', 'Image crop and contain fit'),
    description: localized('用图片和目标容器尺寸估算 cover 裁切、contain 留白与 CSS 比例。', 'Estimate cover cropping, contain letterboxing and a CSS aspect ratio from supplied dimensions.'),
    inputs: [
      integer('width', '原图宽度', 'Source width', 1, 40000),
      integer('height', '原图高度', 'Source height', 1, 40000),
      integer('targetWidth', '容器宽度', 'Frame width', 1, 40000),
      integer('targetHeight', '容器高度', 'Frame height', 1, 40000),
    ],
    example: {width: 1920, height: 1080, targetWidth: 1200, targetHeight: 630},
    run({width, height, targetWidth, targetHeight}) {
      const factors = [targetWidth / width, targetHeight / height];
      const cover = Math.max(...factors);
      const contain = Math.min(...factors);
      const px = n => Number(Math.max(0, n).toFixed(2));
      return {cssAspectRatio: targetWidth + ' / ' + targetHeight, cover: {cropHorizontal: px(width * cover - targetWidth), cropVertical: px(height * cover - targetHeight)}, contain: {paddingHorizontal: px(targetWidth - width * contain), paddingVertical: px(targetHeight - height * contain)}};
    },
  },
  {
    id: 'page-transfer-budget',
    title: localized('网页传输量预算', 'Page transfer budget'),
    description: localized('按压缩后的 KiB 汇总页面资源，定位超预算和体积最大的项目。', 'Total measured compressed KiB and identify the largest resources and any budget overage.'),
    inputs: [
      str('assets', '资源名 | 压缩体积 KiB，每行一项', 'Resource name | compressed KiB per line', 6000, true),
      integer('budget', '预算 KiB', 'Budget in KiB', 1, 1000000),
    ],
    example: {assets: 'HTML | 17.1\nCSS | 23.7\nHero image | 115.5\nJavaScript | 84', budget: 200},
    run({assets, budget}) {
      const entries = rows(assets, 50, 2).map(([name, size]) => {
        if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(size)) throw Error('Use a nonnegative decimal KiB size with up to two decimals.');
        return {name, hundredths: Math.round(Number(size) * 100)};
      });
      const total = entries.reduce((sum, item) => sum + item.hundredths, 0);
      const largest = [...entries].sort((a, b) => b.hundredths - a.hundredths).slice(0, 5);
      return {totalKiB: total / 100, overBudgetKiB: Math.max(0, total - budget * 100) / 100, largest: largest.map(item => ({name: item.name, kiB: item.hundredths / 100}))};
    },
  },
  {
    id: 'campaign-utm-link',
    title: localized('UTM 推广链接生成', 'UTM campaign link'),
    description: localized('生成带来源、媒介和活动标签的链接，保留原有其他参数和锚点。', 'Set campaign, medium and source tags while preserving other query parameters and anchors.'),
    inputs: [
      str('url', '页面 URL', 'Page URL', 1800),
      str('source', '来源', 'Source', 160),
      str('medium', '媒介', 'Medium', 160),
      str('campaign', '活动名称', 'Campaign', 160),
    ],
    example: {url: 'https://example.org/guide?lang=zh#download', source: 'newsletter', medium: 'email', campaign: 'first release'},
    run({url, source, medium, campaign}) {
      const link = httpUrl(url);
      const tags = {utm_source: text(source), utm_medium: text(medium), utm_campaign: text(campaign)};
      for (const [key, value] of Object.entries(tags)) link.searchParams.set(key, value);
      return {url: link.href, tags};
    },
  },
  {
    id: 'claim-evidence-checklist',
    title: localized('发布事实与证据时效检查', 'Publication evidence freshness'),
    description: localized('按查询日期和更新周期检查已记录的来源，列出过期或未来的核查日期。', 'Review logged sources for stale or future-dated checks against a supplied review date and freshness window.'),
    inputs: [
      str('claims', '事实摘要 | 来源 URL | 核查日期，每行一条', 'Claim | source URL | checked date per line', 7500, true),
      str('asOf', '评估日期 YYYY-MM-DD', 'Review date YYYY-MM-DD', 10),
      integer('maxAgeDays', '最长核查间隔（天）', 'Maximum evidence age in days', 0, 2000),
    ],
    example: {claims: 'Pricing guidance | https://example.org/pricing | 2026-10-06\nHTML feature guide | https://example.org/docs | 2026-11-15', asOf: '2026-11-20', maxAgeDays: 30},
    run({claims, asOf, maxAgeDays}) {
      const reference = day(asOf);
      const evidence = rows(claims, 40, 3).map(([claim, source, checked]) => {
        const ageDays = (reference - day(checked)) / 86400000;
        return {claim, source: httpUrl(source).href, checked, ageDays, status: ageDays < 0 ? 'future_date' : ageDays > maxAgeDays ? 'review_due' : 'within_review_window'};
      });
      return {evidence, needsReview: evidence.filter(item => item.status !== 'within_review_window').length};
    },
  },
  {
    id: 'llms-txt-builder',
    title: localized('llms.txt 导航生成', 'llms.txt index builder'),
    description: localized('用精选标题、摘要和链接生成适合交给 AI 读取的文本导航。', 'Build a curated text index for AI readers using a site title, summary and reference links.'),
    inputs: [
      str('title', '站点名', 'Site title', 180),
      str('summary', '站点摘要', 'Site summary', 900),
      str('resources', '资源标题 | 绝对 URL | 简述，每行一组', 'Resource title | absolute URL | summary per line', 7600, true),
    ],
    example: {title: 'BPJ tools', summary: 'Browser utilities with documented inputs.', resources: 'Getting started | https://example.org/start | First-time guide\nTools | https://example.org/tools/ | Public utility catalogue'},
    run({title, summary, resources}) {
      const items = rows(resources, 32, 3).map(([label, url, description]) => {
        const link = httpUrl(url).href.replace(/[()]/g, ch => ch === '(' ? '%28' : '%29');
        return '- [' + markdownLabel(label) + '](' + link + '): ' + markdownLabel(description);
      });
      return {text: '# ' + markdownLabel(title) + '\n\n> ' + markdownLabel(summary) + '\n\n## Resources\n\n' + items.join('\n') + '\n', links: items.length};
    },
  },
  {
    id: 'reading-length-estimate',
    title: localized('中英文阅读时长估算', 'Bilingual reading time estimate'),
    description: localized('分别统计汉字和其他词段，根据输入速度估算阅读时长。', 'Estimate reading time using separate Chinese character and other word counts plus your chosen speeds.'),
    inputs: [
      str('content', '正文', 'Body text', 12000, true),
      integer('hanPerMinute', '每分钟阅读汉字数', 'Han characters per minute', 1, 2000),
      integer('wordsPerMinute', '每分钟阅读其他词数', 'Other words per minute', 1, 2000),
    ],
    example: {content: '打开工具后先选择文件。 Export your result after checking the preview.', hanPerMinute: 350, wordsPerMinute: 210},
    run({content, hanPerMinute, wordsPerMinute}) {
      const han = content.match(/\p{Script=Han}/gu) ?? [];
      const words = content.replace(/\p{Script=Han}/gu, ' ').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
      return {hanCharacters: han.length, otherWords: words.length, approximateSeconds: Math.ceil(60 * (han.length / hanPerMinute + words.length / wordsPerMinute))};
    },
  },
  {
    id: 'cache-control-reader',
    title: localized('缓存响应头解读', 'Cache-Control header reader'),
    description: localized('根据 Cache-Control 指令计算浏览器与共享缓存的明示新鲜期，并标出冲突。', 'Read explicit browser and shared freshness from Cache-Control and flag conflicting directives.'),
    inputs: [str('header', 'Cache-Control 响应头的值', 'Cache-Control value', 600)],
    example: {header: 'public, max-age=120, s-maxage=300, must-revalidate'},
    run({header}) {
      const values = new Map();
      const duplicates = new Set();
      for (const token of header.trim().split(',')) {
        const match = /^([a-z-]+)(?:\s*=\s*(?:"([^"]*)"|([^\s"]+)))?$/i.exec(token.trim());
        if (!match) throw Error('Use comma-separated Cache-Control directives and optional values.');
        const key = match[1].toLowerCase();
        if (values.has(key)) duplicates.add(key);
        values.set(key, match[2] ?? match[3] ?? null);
      }
      const seconds = name => {
        if (!values.has(name) || duplicates.has(name)) return null;
        const value = values.get(name);
        if (value === null || !/^\d{1,10}$/.test(value)) throw Error('Use whole seconds for max-age and s-maxage.');
        return Number(value);
      };
      const browser = seconds('max-age');
      const shared = values.has('s-maxage') ? seconds('s-maxage') : browser;
      const noStore = values.has('no-store');
      const validate = values.has('no-cache');
      return {
        browserFreshnessSeconds: noStore || validate ? 0 : browser,
        sharedFreshnessSeconds: noStore || validate || values.has('private') ? 0 : shared,
        storageProhibited: noStore,
        revalidateEachUse: validate,
        mustRevalidateWhenStale: values.has('must-revalidate'),
        conflictingVisibility: values.has('public') && values.has('private'),
        repeatedDirectives: [...duplicates],
      };
    },
  },
];
