import { tool, field, whole, splitLines, parseRows, html, webUrl, unique } from './editorial-common.mjs';
const tools = [];
const short = (k, z, e, ex) => field(k, z, e, ex, 240);
const lines = (k, z, e, ex) => field(k, z, e, ex, 3000);
const name = short('name', '名称', 'Name', 'Field Notes');
const url = short('url', '网页网址', 'Page URL', 'https://example.org/notes');
const author = short('author', '作者', 'Author', 'Robin Lane');
const language = short('language', '语言标签', 'Language tag', 'en');
const lang = (s) => Intl.getCanonicalLocales(s)[0];
const lineList = (s) =>
  splitLines(s)
    .map((l) => l.trim())
    .filter(Boolean);
const date = (s) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s + 'T00:00:00Z')) ||
    new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) !== s
  )
    throw Error('Use a valid YYYY-MM-DD date.');
  return s;
};
const org = (name) => ({ '@type': 'Organization', name });
const person = (name) => ({ '@type': 'Person', name });
const add = (id, z, e, zd, ed, fields, fn) => tools.push(tool(id, z, e, zd, ed, fields, fn));
const schema = (id, z, e, zd, ed, type, fields, fn) =>
  add(id, z, e, zd, ed, fields, (a) => ({
    jsonld: { '@context': 'https://schema.org', '@type': type, ...fn(a) },
  }));
function checkGtin(s) {
  if (!/^\d{13}$/.test(s)) throw Error('Use 13 digits.');
  const sum = [...s].reduce((n, c, i) => n + Number(c) * (i % 2 === 1 ? 3 : 1), 0);
  if (sum % 10) throw Error('Invalid check digit.');
  return s;
}
schema(
  'book-isbn-metadata',
  '图书 ISBN 元数据',
  'Book ISBN metadata',
  '校验 ISBN-13 前缀及校验位，再生成含作者与语言的 Book 数据。',
  'Validate an ISBN-13 prefix and check digit and build Book metadata with author and language.',
  'Book',
  [name, author, language, short('isbn', 'ISBN-13', 'ISBN-13', '9780306406157')],
  (a) => {
    const isbn = a.isbn.replace(/[ -]/g, '');
    if (!/^97[89]/.test(isbn)) throw Error('Use an ISBN-13 with 978 or 979 prefix.');
    return {
      name: a.name,
      author: person(a.author),
      inLanguage: lang(a.language),
      isbn: checkGtin(isbn),
    };
  },
);
schema(
  'recipe-ingredient-metadata',
  '食谱用料元数据',
  'Recipe ingredient metadata',
  '按每行一种配料与一个步骤生成 Recipe，并写入分钟制备时间。',
  'Build a Recipe from line-separated ingredients and directions with prep time in minutes.',
  'Recipe',
  [
    name,
    lines('ingredients', '配料，每行一种', 'Ingredients, one per line', 'Mint\nWater'),
    lines('steps', '步骤，每行一项', 'Steps, one per line', 'Rinse mint\nSteep leaves'),
    whole('minutes', '准备时间（分钟）', 'Preparation minutes', 5, 1, 10080),
  ],
  (a) => ({
    name: a.name,
    recipeIngredient: lineList(a.ingredients),
    recipeInstructions: lineList(a.steps).map((text) => ({ '@type': 'HowToStep', text })),
    prepTime: 'PT' + a.minutes + 'M',
  }),
);
schema(
  'in-person-event-metadata',
  '线下活动元数据',
  'In-person event metadata',
  '校验起止日期，生成含会场名称和地址文本的线下 Event。',
  'Check date order and build an in-person Event with a venue and address.',
  'Event',
  [
    name,
    short('start', '开始日期', 'Start date', '2026-10-04'),
    short('end', '结束日期', 'End date', '2026-10-05'),
    short('venue', '会场', 'Venue', 'Town Hall'),
    short('address', '地址', 'Address', '12 Main St'),
  ],
  (a) => {
    const start = date(a.start),
      end = date(a.end);
    if (end < start) throw Error('End date precedes the start.');
    return {
      name: a.name,
      startDate: start,
      endDate: end,
      location: { '@type': 'Place', name: a.venue, address: a.address },
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    };
  },
);
schema(
  'course-syllabus-metadata',
  '课程大纲元数据',
  'Course syllabus metadata',
  '生成课程提供方、语言和按行列出的教学主题。',
  'Build Course metadata with a provider, language and syllabus topics from individual lines.',
  'Course',
  [
    name,
    short('provider', '开课机构', 'Course provider', 'Civic Studio'),
    language,
    lines('topics', '教学主题，每行一项', 'Topics, one per line', 'Editing\nPublishing'),
  ],
  (a) => ({
    name: a.name,
    provider: org(a.provider),
    inLanguage: lang(a.language),
    syllabusSections: lineList(a.topics).map((name) => ({ '@type': 'Syllabus', name })),
  }),
);
schema(
  'dataset-distribution-metadata',
  '数据集下载元数据',
  'Dataset distribution metadata',
  '生成包含授权、下载地址和媒体类型的 Dataset 与 DataDownload。',
  'Build Dataset and DataDownload metadata with license, media type and download location.',
  'Dataset',
  [
    name,
    short('download', '下载地址', 'Download URL', 'https://example.org/notes.csv'),
    short('license', '许可地址', 'License URL', 'https://creativecommons.org/licenses/by/4.0/'),
    short('media', '媒体类型', 'Media type', 'text/csv'),
  ],
  (a) => {
    if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(a.media))
      throw Error('Use a media type such as text/csv.');
    return {
      name: a.name,
      license: webUrl(a.license),
      distribution: { '@type': 'DataDownload', contentUrl: webUrl(a.download), encodingFormat: a.media },
    };
  },
);
schema(
  'podcast-episode-metadata',
  '播客单集元数据',
  'Podcast episode metadata',
  '将节目、集号、音频文件和时长组织为 PodcastEpisode。',
  'Associate a series, episode number, audio file and duration in PodcastEpisode metadata.',
  'PodcastEpisode',
  [
    name,
    short('series', '节目名', 'Series name', 'Civic Radio'),
    whole('episode', '集号', 'Episode number', 3, 1, 100000),
    whole('seconds', '秒数', 'Duration in seconds', 1240, 1, 86400),
    short('audio', '音频网址', 'Audio URL', 'https://example.org/ep3.mp3'),
  ],
  (a) => ({
    name: a.name,
    episodeNumber: a.episode,
    partOfSeries: { '@type': 'PodcastSeries', name: a.series },
    associatedMedia: {
      '@type': 'AudioObject',
      contentUrl: webUrl(a.audio),
      duration: 'PT' + a.seconds + 'S',
    },
  }),
);
schema(
  'software-app-metadata',
  '软件应用发布元数据',
  'Software application metadata',
  '根据支持的操作系统、版本和下载页生成 SoftwareApplication。',
  'Build SoftwareApplication metadata from supported operating systems, version and download URL.',
  'SoftwareApplication',
  [
    name,
    lines('systems', '操作系统，每行一项', 'Operating systems, one per line', 'Windows\nLinux'),
    short('version', '软件版本', 'Software version', '2.4.0'),
    url,
  ],
  (a) => ({
    name: a.name,
    operatingSystem: unique(lineList(a.systems)),
    softwareVersion: a.version,
    downloadUrl: webUrl(a.url),
  }),
);
schema(
  'product-gtin-metadata',
  '商品 GTIN-13 元数据',
  'Product GTIN-13 metadata',
  '校验商品条码并生成带品牌与货号的 Product 数据。',
  'Verify a GTIN-13 check digit and build Product metadata with brand and SKU.',
  'Product',
  [
    name,
    short('brand', '品牌', 'Brand', 'Mint Studio'),
    short('sku', '货号', 'SKU', 'TEA-2'),
    short('gtin', 'GTIN-13', 'GTIN-13', '4006381333931'),
  ],
  (a) => ({
    name: a.name,
    brand: { '@type': 'Brand', name: a.brand },
    sku: a.sku,
    gtin13: checkGtin(a.gtin),
  }),
);
schema(
  'local-business-address-metadata',
  '门店地址元数据',
  'Local business address metadata',
  '按街道、城市、邮编与两位国家代码生成门店邮政地址。',
  'Build LocalBusiness metadata with a PostalAddress, locality, postal code and two-letter country code.',
  'LocalBusiness',
  [
    name,
    short('street', '街道', 'Street address', '12 Main St'),
    short('city', '城市', 'City', 'Boston'),
    short('code', '邮编', 'Postal code', '02108'),
    short('country', '两位国家代码', 'Two-letter country code', 'US'),
  ],
  (a) => {
    if (!/^[A-Z]{2}$/.test(a.country)) throw Error('Use a two-letter uppercase country code.');
    return {
      name: a.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: a.street,
        addressLocality: a.city,
        postalCode: a.code,
        addressCountry: a.country,
      },
    };
  },
);
schema(
  'image-credit-metadata',
  '图片署名与许可元数据',
  'Image credit and license metadata',
  '生成含作者、许可网址与署名文字的 ImageObject。',
  'Build ImageObject metadata with creator, license URL and credit text.',
  'ImageObject',
  [
    url,
    author,
    short('license', '许可网址', 'License URL', 'https://creativecommons.org/licenses/by/4.0/'),
    short('credit', '署名文字', 'Credit line', 'Robin Lane / Civic Studio'),
  ],
  (a) => ({
    contentUrl: webUrl(a.url),
    creator: person(a.author),
    license: webUrl(a.license),
    creditText: a.credit,
  }),
);
schema(
  'scholarly-doi-metadata',
  '学术文章 DOI 元数据',
  'Scholarly DOI metadata',
  '校验 DOI 基本形式并列出作者和发布日期。',
  'Check basic DOI syntax and build scholarly article metadata with authors and publication date.',
  'ScholarlyArticle',
  [
    name,
    short('doi', 'DOI', 'DOI', '10.1234/notes.2'),
    lines('authors', '作者，每行一位', 'Authors, one per line', 'Robin Lane\nTaylor Ray'),
    short('published', '发布日期', 'Publication date', '2026-10-04'),
  ],
  (a) => {
    if (!/^10\.\d{4,9}\/[^\s]+$/i.test(a.doi)) throw Error('Use a DOI beginning with 10.');
    return {
      headline: a.name,
      identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: a.doi },
      author: lineList(a.authors).map(person),
      datePublished: date(a.published),
    };
  },
);
schema(
  'video-thumbnail-metadata',
  '视频缩略图元数据',
  'Video thumbnail metadata',
  '生成包含缩略图、上传日期和时长的视频数据。',
  'Build VideoObject metadata with a thumbnail, upload date and duration in seconds.',
  'VideoObject',
  [
    name,
    short('thumbnail', '缩略图网址', 'Thumbnail URL', 'https://example.org/cover.jpg'),
    short('uploaded', '上传日期', 'Upload date', '2026-10-04'),
    whole('seconds', '视频时长（秒）', 'Duration in seconds', 90, 1, 604800),
  ],
  (a) => ({
    name: a.name,
    thumbnailUrl: webUrl(a.thumbnail),
    uploadDate: date(a.uploaded),
    duration: 'PT' + a.seconds + 'S',
  }),
);
schema(
  'service-area-metadata',
  '服务覆盖范围元数据',
  'Service area metadata',
  '把服务类型、提供方及逐行地区列表组织为 Service 数据。',
  'Build Service metadata with a provider and an explicit list of served administrative areas.',
  'Service',
  [
    short('service', '服务类型', 'Service type', 'Copy editing'),
    short('provider', '服务机构', 'Provider', 'Civic Studio'),
    lines('areas', '服务地区，每行一个', 'Served areas, one per line', 'Boston\nCambridge'),
  ],
  (a) => ({
    serviceType: a.service,
    provider: org(a.provider),
    areaServed: unique(lineList(a.areas)).map((name) => ({ '@type': 'AdministrativeArea', name })),
  }),
);
schema(
  'itemlist-ranked-metadata',
  '排名列表元数据',
  'Ranked item list metadata',
  '将每行名称与网址转换为从一开始排序的 ItemList。',
  'Turn name and URL rows into an ordered ItemList with one-based positions.',
  'ItemList',
  [
    name,
    lines(
      'items',
      '名称|网址，每行一项',
      'Name|URL, one row per item',
      'Guide|https://example.org/guide\nNotes|https://example.org/notes',
    ),
  ],
  (a) => {
    const items = parseRows(a.items, 2).map(([name, url], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      url: webUrl(url),
    }));
    return { name: a.name, numberOfItems: items.length, itemListElement: items };
  },
);
schema(
  'organization-profile-links',
  '组织官方资料链接元数据',
  'Organization identity links',
  '校验并去重组织官网和 sameAs 资料地址，生成 Organization。',
  'Validate and deduplicate identity profile URLs for an Organization and its website.',
  'Organization',
  [
    name,
    url,
    lines(
      'profiles',
      '公开资料网址，每行一个',
      'Public profile URLs, one per line',
      'https://example.org/profile\nhttps://example.net/studio',
    ),
  ],
  (a) => ({ name: a.name, url: webUrl(a.url), sameAs: unique(lineList(a.profiles).map(webUrl)) }),
);
schema(
  'glossary-defined-terms',
  '术语集结构化数据',
  'Defined term set metadata',
  '生成 DefinedTermSet，将逐行术语与释义编码为 DefinedTerm。',
  'Build a DefinedTermSet with term names and definitions from pipe-separated rows.',
  'DefinedTermSet',
  [
    name,
    lines(
      'terms',
      '术语|定义，每行一项',
      'Term|definition, one per line',
      'Proof|A review copy\nEdition|A published version',
    ),
  ],
  (a) => ({
    name: a.name,
    hasDefinedTerm: parseRows(a.terms, 2).map(([name, description]) => ({
      '@type': 'DefinedTerm',
      name,
      description,
    })),
  }),
);
const rowFeeds = lines(
  'items',
  '条目标识|标题|网址，每行一条',
  'Item ID|title|URL, one per line',
  'n1|Menu notes|https://example.org/notes',
);
add(
  'json-feed-channel',
  'JSON Feed 频道生成',
  'JSON Feed channel builder',
  '将带 ID 的条目和纯文本标题生成 JSON Feed 1.1。',
  'Build a JSON Feed 1.1 channel with unique item IDs and text content derived from titles.',
  [name, url, rowFeeds],
  (a) => {
    const items = parseRows(a.items, 3).map(([id, title, url]) => ({
      id,
      title,
      url: webUrl(url),
      content_text: title,
    }));
    if (unique(items.map((i) => i.id)).length !== items.length) throw Error('Item IDs must be unique.');
    return {
      feed: {
        version: 'https://jsonfeed.org/version/1.1',
        title: a.name,
        home_page_url: webUrl(a.url),
        items,
      },
    };
  },
);
add(
  'opml-feed-subscriptions',
  'OPML 订阅导出',
  'OPML subscription export',
  '将订阅名称与 Feed 地址导出为经过 XML 转义的 OPML 2.0 大纲。',
  'Export feed names and XML feed URLs as an escaped OPML 2.0 subscription outline.',
  [name, lines('feeds', '名称|Feed 网址', 'Name|feed URL', 'Field Notes|https://example.org/feed.xml')],
  (a) => ({
    xml:
      '<opml version="2.0"><head><title>' +
      html(a.name) +
      '</title></head><body>' +
      parseRows(a.feeds, 2)
        .map(([n, u]) => '<outline type="rss" text="' + html(n) + '" xmlUrl="' + html(webUrl(u)) + '"/>')
        .join('') +
      '</body></opml>',
  }),
);
add(
  'rss-channel-export',
  'RSS 2.0 频道生成',
  'RSS 2.0 channel export',
  '生成带标题、频道链接、说明及条目永久链接的 RSS XML。',
  'Generate RSS 2.0 XML with channel description and permalink GUIDs for entries.',
  [
    name,
    url,
    short('description', '频道说明', 'Channel description', 'Editorial notes'),
    lines('entries', '标题|永久链接', 'Title|permalink', 'Field guide|https://example.org/guide'),
  ],
  (a) => ({
    xml:
      '<rss version="2.0"><channel><title>' +
      html(a.name) +
      '</title><link>' +
      html(webUrl(a.url)) +
      '</link><description>' +
      html(a.description) +
      '</description>' +
      parseRows(a.entries, 2)
        .map(
          ([t, u]) =>
            '<item><title>' +
            html(t) +
            '</title><link>' +
            html(webUrl(u)) +
            '</link><guid isPermaLink="true">' +
            html(webUrl(u)) +
            '</guid></item>',
        )
        .join('') +
      '</channel></rss>',
  }),
);
const meta = (attr, key, val) => '<meta ' + attr + '="' + html(key) + '" content="' + html(val) + '">';
const link = (rel, extra) => '<link rel="' + rel + '" ' + extra + '>';
const attr = (k, v) => k + '="' + html(v) + '"';
add(
  'dublin-core-page-tags',
  'Dublin Core 页面标签',
  'Dublin Core page tags',
  '生成标题、作者、语言及标识符的 Dublin Core meta 标签。',
  'Generate Dublin Core title, creator, language and identifier meta elements.',
  [name, author, language, url],
  (a) => ({
    html: [
      ['DC.title', a.name],
      ['DC.creator', a.author],
      ['DC.language', lang(a.language)],
      ['DC.identifier', webUrl(a.url)],
    ]
      .map(([k, v]) => meta('name', k, v))
      .join('\n'),
  }),
);
add(
  'citation-highwire-tags',
  '论文 Highwire 引用标签',
  'Highwire citation tags',
  '按多作者、期刊和出版日期生成可供学术索引解析的引文标签。',
  'Generate Highwire citation tags with one author tag per author, a journal and publication date.',
  [
    name,
    lines('authors', '作者，每行一位', 'Authors, one per line', 'Robin Lane\nTaylor Ray'),
    short('journal', '期刊', 'Journal', 'City Studies'),
    short('published', '出版日期', 'Publication date', '2026-10-04'),
  ],
  (a) => ({
    html: [
      ['citation_title', a.name],
      ...lineList(a.authors).map((v) => ['citation_author', v]),
      ['citation_journal_title', a.journal],
      ['citation_publication_date', date(a.published).replaceAll('-', '/')],
    ]
      .map(([k, v]) => meta('name', k, v))
      .join('\n'),
  }),
);
add(
  'og-locale-alternates',
  'Open Graph 语言版本标签',
  'Open Graph locale alternates',
  '校验语言和地区代码形式，输出主语言和去重后的替代语言标签。',
  'Validate language_REGION locale syntax and emit primary and unique alternative Open Graph locale tags.',
  [
    short('primary', '主语言地区', 'Primary locale', 'en_US'),
    lines('alternates', '其他语言地区，每行一个', 'Alternate locales, one per line', 'fr_FR\nen_GB'),
  ],
  (a) => {
    const alt = unique(lineList(a.alternates)).filter((v) => v !== a.primary);
    if ([a.primary, ...alt].some((s) => !/^[a-z]{2,3}_[A-Z]{2}$/.test(s)))
      throw Error('Use language_REGION locale codes.');
    return {
      html: [
        meta('property', 'og:locale', a.primary),
        ...alt.map((v) => meta('property', 'og:locale:alternate', v)),
      ].join('\n'),
    };
  },
);
add(
  'oembed-discovery-tag',
  'oEmbed 发现标签',
  'oEmbed discovery link',
  '根据发布页面和 oEmbed 服务生成 JSON 发现链接，并编码查询参数。',
  'Build a JSON oEmbed discovery link by inserting and URL-encoding the page URL at the provider endpoint.',
  [name, url, short('endpoint', 'oEmbed 服务网址', 'oEmbed endpoint', 'https://example.org/oembed')],
  (a) => {
    const u = new URL(webUrl(a.endpoint));
    u.searchParams.set('url', webUrl(a.url));
    u.searchParams.set('format', 'json');
    return {
      html: link(
        'alternate',
        [attr('type', 'application/json+oembed'), attr('href', u.href), attr('title', a.name)].join(' '),
      ),
    };
  },
);
add(
  'feed-autodiscovery-links',
  'Feed 自动发现入口',
  'Feed autodiscovery links',
  '根据 RSS、Atom 或 JSON Feed 类型生成带正确媒体类型的发现链接。',
  'Generate alternate feed links using the declared RSS, Atom or JSON Feed media type.',
  [
    lines(
      'feeds',
      '类型|标题|网址（rss、atom 或 json）',
      'Type|title|URL (rss, atom or json)',
      'rss|Field Notes|https://example.org/news.rss',
    ),
  ],
  (a) => ({
    html: parseRows(a.feeds, 3)
      .map(([type, title, u]) => {
        const types = {
          rss: 'application/rss+xml',
          atom: 'application/atom+xml',
          json: 'application/feed+json',
        };
        if (!Object.hasOwn(types, type)) throw Error('Use rss, atom or json.');
        return link(
          'alternate',
          [attr('type', types[type]), attr('title', title), attr('href', webUrl(u))].join(' '),
        );
      })
      .join('\n'),
  }),
);
add(
  'hreflang-html-cluster',
  '多语言页面标签生成',
  'Hreflang cluster markup',
  '检验语言标记与重复语言后，为多语言版本生成 alternate 标签。',
  'Validate language tags, reject duplicate locales and generate hreflang alternate links.',
  [
    lines(
      'locales',
      '语言|网址，每行一版',
      'Language|URL, one version per line',
      'en|https://example.org/en\nfr|https://example.org/fr',
    ),
  ],
  (a) => {
    const seen = new Set();
    return {
      html: parseRows(a.locales, 2)
        .map(([l, u]) => {
          const tag = l.toLowerCase() === 'x-default' ? 'x-default' : lang(l);
          if (seen.has(tag)) throw Error('Use one URL per language.');
          seen.add(tag);
          return link('alternate', [attr('hreflang', tag), attr('href', webUrl(u))].join(' '));
        })
        .join('\n'),
    };
  },
);
add(
  'robots-snippet-directives',
  '搜索摘要限制生成',
  'Robots snippet limits',
  '按文字、视频与图片预览限制生成 robots 标签，支持 -1 表示无限制。',
  'Build a robots meta tag from text, video and image preview limits, accepting -1 for unlimited length.',
  [
    whole('snippet', '最大摘要字符', 'Maximum snippet characters', 160, -1, 10000),
    whole('video', '最大视频秒数', 'Maximum preview seconds', 30, -1, 86400),
    short(
      'image',
      '图片预览（none、standard、large）',
      'Image preview (none, standard, large)',
      'large',
    ),
  ],
  (a) => {
    if (!['none', 'standard', 'large'].includes(a.image)) throw Error('Use none, standard or large.');
    return {
      html: meta(
        'name',
        'robots',
        'max-snippet:' + a.snippet + ', max-video-preview:' + a.video + ', max-image-preview:' + a.image,
      ),
    };
  },
);
add(
  'responsive-favicon-links',
  '多尺寸站点图标入口',
  'Sized favicon links',
  '检验方形像素尺寸或 any，再生成多个带 sizes 的 icon 标签。',
  'Validate square pixel sizes or any and build icon links carrying sizes attributes.',
  [
    lines(
      'icons',
      '尺寸或 any|图标网址',
      'Size or any|icon URL',
      '32x32|https://example.org/icon.png\nany|https://example.org/icon.svg',
    ),
  ],
  (a) => ({
    html: parseRows(a.icons, 2)
      .map(([size, u]) => {
        if (size !== 'any' && !/^([1-9]\d{0,4})x\1$/.test(size))
          throw Error('Use square sizes such as 32x32, or any.');
        return link('icon', attr('sizes', size) + ' ' + attr('href', webUrl(u)));
      })
      .join('\n'),
  }),
);
add(
  'opensearch-description-xml',
  '站内搜索描述 XML',
  'OpenSearch description XML',
  '按短名称、站内搜索 URL 和查询参数生成 OpenSearch 1.1 描述。',
  'Build an OpenSearch 1.1 description from a short name, a search URL and a query parameter.',
  [
    short('shortName', '短名称（至多 16 字符）', 'Short name (up to 16 characters)', 'Field Notes'),
    short('description', '说明', 'Description', 'Search Field Notes'),
    short('endpoint', '搜索网址', 'Search endpoint', 'https://example.org/search'),
    short('parameter', '查询参数名', 'Query parameter name', 'q'),
  ],
  (a) => {
    if (
      [...a.shortName].length > 16 ||
      [...a.description].length > 1024 ||
      !/^\w[\w.-]*$/.test(a.parameter)
    )
      throw Error('Check name length and query parameter syntax.');
    const u = new URL(webUrl(a.endpoint));
    u.searchParams.delete(a.parameter);
    u.hash = '';
    const template =
      u.href + (u.search ? '&' : '?') + encodeURIComponent(a.parameter) + '={searchTerms}';
    return {
      xml:
        '<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/"><ShortName>' +
        html(a.shortName) +
        '</ShortName><Description>' +
        html(a.description) +
        '</Description><Url type="text/html" template="' +
        html(template) +
        '"/></OpenSearchDescription>',
    };
  },
);
add(
  'xfn-relationship-link',
  'XFN 关系链接',
  'XFN relationship link',
  '核对 XFN 词表中的关系标记，生成带关系属性的个人资料链接。',
  'Check relationship tokens against the XFN vocabulary and build a linked profile annotation.',
  [
    name,
    url,
    short(
      'relationship',
      '关系词，以空格分隔',
      'Space-separated relationship tokens',
      'friend colleague',
    ),
  ],
  (a) => {
    const valid =
        'contact acquaintance friend met co-worker colleague co-resident neighbor child parent sibling spouse kin muse crush date sweetheart me'.split(
          ' ',
        ),
      rel = unique(a.relationship.toLowerCase().trim().split(/\s+/));
    if (rel.some((x) => !valid.includes(x)) || (rel.includes('me') && rel.length > 1))
      throw Error('Use valid XFN tokens, or me on its own.');
    return {
      html:
        '<a ' +
        attr('href', webUrl(a.url)) +
        ' ' +
        attr('rel', rel.join(' ')) +
        '>' +
        html(a.name) +
        '</a>',
    };
  },
);
add(
  'creative-commons-attribution',
  '创作共用署名片段',
  'Creative Commons attribution snippet',
  '用作品名、作者、出处和 CC 许可链接生成可嵌入的署名段落。',
  'Create an escaped attribution paragraph from work title, creator, source and a Creative Commons license URL.',
  [
    name,
    author,
    url,
    short('license', 'CC 许可网址', 'CC license URL', 'https://creativecommons.org/licenses/by/4.0/'),
  ],
  (a) => {
    const u = new URL(webUrl(a.license));
    if (u.hostname !== 'creativecommons.org' || !/^\/(?:licenses|publicdomain)\//.test(u.pathname))
      throw Error('Use a Creative Commons license or public domain URL.');
    return {
      html:
        '<p><a ' +
        attr('href', webUrl(a.url)) +
        '>' +
        html(a.name) +
        '</a> · ' +
        html(a.author) +
        ' · <a rel="license" ' +
        attr('href', u.href) +
        '>' +
        html(u.pathname) +
        '</a></p>',
    };
  },
);
export { tools };
