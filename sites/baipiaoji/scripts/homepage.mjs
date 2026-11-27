const categoryOrder = ['chat', 'coding', 'image', 'video', 'office', 'writing'];
const categoryMarks = {chat: 'Aa', coding: '</>', image: '▧', video: '▶', office: '▤', writing: '✎'};

export function homepageModel(lang, base, categories, guidance, countOf) {
  const zh = lang === 'zh';
  const t = (cn, en) => zh ? cn : en;
  const links = rows => rows.map(([path, name, description, mark, block, id]) => ({
    href: base + path, name, description, mark, block, id,
  }));
  const categoryLinks = categories.map(([id, name]) => ({
    id, name, href: base + '/c/' + id, description: guidance(id, lang).question,
    count: countOf(id), mark: categoryMarks[id],
  }));
  return {
    zh,
    canonical: base + '/',
    title: t('AI 工具导航、免费额度对比与实用工具箱 | 白嫖计',
      'AI Tool Directory & Free Tier Comparisons | BPJ'),
    heading: t('找对 AI 工具，查清免费额度', 'Find AI tools. Check the free limits.'),
    description: t('白嫖计（BPJ）是中英双语 AI 工具目录。按用途查找工具，对比免费额度、用量限制与商用条件，并使用 PDF、图片和视频工作台。',
      'Find AI tools by task, compare free-tier limits and commercial-use terms, and use BPJ tools for PDFs, images, and video.'),
    intro: t('按用途找工具，比较免费额度、使用限制和商用条件。核实过的记录附有官方来源和核实日期。',
      'Find tools by task and compare free allowances, usage limits, and commercial-use terms. Verified records include an official source and check date.'),
    examples: links([
      ['/tools/chatgpt', 'ChatGPT'],
      ['/tools/kimi', 'Kimi'],
    ]),
    evidenceTitle: t('先核对，再选工具', 'Check before you choose'),
    evidenceIntro: t('看看免费档能用多少、用完会怎样、产出能不能商用。',
      'See what is included, what happens when it runs out, and how you can use the output.'),
    evidence: links([
      ['/chat-limits-board', t('聊天助手额度', 'Chat assistant limits'), t('对比消息次数、重置周期与限制', 'Compare messages, resets, and limits')],
      ['/coding-quota-board', t('编程工具额度', 'Coding assistant limits'), t('对比请求次数、点数与计费方式', 'Compare request caps, credits, and billing')],
      ['/publish-check', t('AI 产出商用条件', 'Commercial use of AI outputs'), t('查阅已核实的授权条件与出处', 'Check recorded license conditions and sources')],
    ]),
    categoriesTitle: t('按用途浏览', 'Browse by task'),
    categories: categoryOrder.map(id => categoryLinks.find(category => category.id === id)).filter(Boolean),
    moreCategories: categoryLinks.filter(category => !categoryOrder.includes(category.id)),
    toolsTitle: t('用 BPJ 工具直接做事', 'Get work done with BPJ tools'),
    toolbox: {href: base + '/studio/', name: t('全部自研工具', 'All BPJ tools')},
    videoStudio: {href: base + '/video/', name: t('视频工作室', 'Video studio')},
    tools: links([
      ['/studio/pdf-tools', t('PDF 工具', 'PDF tools'), t('合并、拆分和重排页面', 'Merge, split, and reorder pages'), 'PDF'],
      ['/studio/product-images', t('商品图片', 'Product images'), t('批量调整尺寸与导出', 'Resize and export images in batches'), 'IMG'],
      ['/studio/video-variants', t('视频变体', 'Video variants'), t('用现有素材生成多版本视频', 'Create video variants from your assets'), '▶'],
      ['/work-plan', t('AI 工作规划', 'AI work planner'), t('按岗位与工作量选工具', 'Match tools to your role and workload'), 'AI'],
    ]),
    discoverTitle: t('更多目录与工作台', 'Specialized directories and workspaces'),
    discover: [
      zh
        ? {href: '/manju/', name: '帧选漫剧', description: '按题材找漫剧与短剧，查看作品出处。'}
        : {href: base + '/ai-video/', name: 'AI films and shorts', description: 'Discover films and short videos with links to their sources.', block: 'video'},
      ...links([
        ['/github-tools/', t('GitHub 项目', 'GitHub projects'), t('按任务找开源项目和上手指南。', 'Find open-source projects and setup guides by task.'), '', 'github-tools', 'github-tools'],
        ['/agents/', t('Agent 与 MCP', 'Agents and MCP'), t('查智能体、MCP 服务和接入要求。', 'Find agents, MCP servers, and setup requirements.'), '', 'agents', 'agents'],
        ['/studio/ai/', t('AI 工作工具', 'AI workflow tools'), t('处理数据、文档和业务任务。', 'Work with data, documents, and business workflows.'), '', 'ai-tools', 'ai-tools'],
        ['/studio/trade-tools/', t('外贸工作台', 'Export workbench'), t('核报价、核单证、算结汇。', 'Review quotes and documents, and estimate currency proceeds.')],
        ['/ai-solo/', t('AI Solo 商业案例', 'AI Solo business cases'), t('查看创业案例与可复用的工作流。', 'Explore business cases and reusable workflows.'), '', 'ai-solo', 'ai-solo'],
      ]),
    ],
    methodTitle: t('免费额度是怎样核实的？', 'How does BPJ verify free-tier limits?'),
    method: t('额度记录来自厂商的定价页、文档或条款，每条附核实日期。上限未公开时会标明。有些目录条目仍待核实；链接巡检只确认链接可访问。',
      'Allowance records cite vendor pricing pages, documentation, or terms and carry a check date. Unpublished caps are marked. Some listings are awaiting review; a link check confirms only that the page is reachable.'),
    sources: [
      ...links([
        ['/method', t('核实方法', 'Verification method')],
        ['/changes', t('额度变更', 'Allowance changes')],
      ]),
      {href: '/limits.json', name: t('额度数据 JSON', 'Free-tier data JSON')},
      {href: base + '/agents/', name: t('Agent 与 MCP 监测', 'Agent & MCP watch'), block: 'agent-watch'},
    ],
  };
}

export function renderHomepage({model, esc, search, limitCheck, account}) {
  const {zh, canonical} = model;
  const t = (cn, en) => zh ? cn : en;
  const arrow = '<span class="home-arrow" aria-hidden="true">›</span>';
  const url = href => esc(new URL(href, canonical).href);
  const category = ({id, href, name, description, count, mark}) => `
    <a class="home-category" id="${esc(id)}" href="${url(href)}">
      <span class="home-icon" aria-hidden="true">${esc(mark)}</span>
      <span class="home-category-copy"><strong>${esc(name)}</strong><span>${esc(description)}</span></span>
      <span class="home-count">${count} ${t('项', count === 1 ? 'tool' : 'tools')}</span>
    </a>`;
  return `<main class="stage bpj-home bpj-home-refresh">
  <section class="bpj-home-hero" data-home-block="hero" aria-labelledby="home-title">
    <div class="bpj-home-copy">
      <h1 id="home-title">${esc(model.heading)}</h1>
      <p class="home-lead">${esc(model.intro)}</p>
      ${search}
      <div class="bpj-quick">
        <a class="bpj-primary-cta" href="${canonical}#directory">${t('浏览工具分类', 'Browse categories')}</a>
        <a class="home-direct" href="${canonical}studio/">${t('直接用工具', 'Use a tool')}</a>
        ${model.examples.map(({href, name}) => `<a href="${url(href)}">${esc(name)}</a>`).join('')}
      </div>
    </div>
    <aside class="home-evidence" aria-labelledby="home-evidence-title">
      <div class="home-evidence-heading">
        <h2 id="home-evidence-title">${esc(model.evidenceTitle)}</h2>
        <p>${esc(model.evidenceIntro)}</p>
      </div>
      <div class="home-evidence-links">${model.evidence.map(({href, name, description}) => `
        <a href="${url(href)}"><div><strong>${esc(name)}</strong><span>${esc(description)}</span></div>${arrow}</a>`).join('')}
      </div>
      <a class="home-evidence-foot" href="${canonical}method">${t('查看核实方法', 'See how BPJ verifies limits')}</a>
    </aside>
  </section>
  <section class="home-section" id="directory" data-home-block="directory" aria-labelledby="home-directory-title">
    <div class="home-section-heading"><div>
      <h2 id="home-directory-title">${esc(model.categoriesTitle)}</h2>
      <p>${t('从聊天、编程、视频等任务开始。', 'Start with chat, coding, video, and other everyday tasks.')}</p>
    </div></div>
    <div class="home-category-grid" id="dirs">${model.categories.map(category).join('')}</div>
    <nav class="home-more" aria-label="${t('更多工具分类', 'More tool categories')}">
      ${model.moreCategories.map(({id, href, name}) => `<a id="${esc(id)}" href="${url(href)}">${esc(name)}</a>`).join('')}
    </nav>
  </section>
  <section class="home-section" id="studio" data-home-block="featured-tools" aria-labelledby="home-studio-title">
    <div class="home-section-heading">
      <div><h2 id="home-studio-title">${esc(model.toolsTitle)}</h2>
      <p>${t('PDF 和商品图片工具在浏览器本机处理文件。', 'PDF and product image tools process your files locally in the browser.')}</p></div>
      <nav class="home-section-actions" aria-label="${t('浏览自研工作台', 'Browse BPJ workspaces')}">
        <a data-video-nav href="${url(model.videoStudio.href)}">${esc(model.videoStudio.name)}</a>
        <a class="bpj-home-toolbox" href="${url(model.toolbox.href)}">${esc(model.toolbox.name)}</a>
      </nav>
    </div>
    <div class="home-tool-grid">${model.tools.map(({href, name, description, mark}) => `
      <a class="home-tool bpj-feature-tile" href="${url(href)}" data-bpj-next>
        <span class="home-icon" aria-hidden="true">${esc(mark)}</span>
        <div><strong>${esc(name)}</strong><p>${esc(description)}</p></div>${arrow}
      </a>`).join('')}
    </div>
  </section>
  <section class="home-section" id="plans" data-home-block="task-lanes" aria-labelledby="home-explore-title">
    <div class="home-section-heading">
      <div><h2 id="home-explore-title">${esc(model.discoverTitle)}</h2></div>
      <a href="${canonical}discover/">${t('全部功能', 'Explore all features')}</a>
    </div>
    <div class="home-explore-grid">${model.discover.map(({href, name, description, block, id}) => `
      <a class="home-explore-link" href="${url(href)}"${id ? ` id="${esc(id)}"` : ''}${block ? ` data-home-block="${esc(block)}"` : ''}>
        <strong>${esc(name)}</strong><p>${esc(description)}</p>${arrow}
      </a>`).join('')}
    </div>
  </section>
  ${limitCheck}
  <section class="home-method" id="verification" data-home-block="directory" aria-labelledby="home-method-title">
    <div><h2 id="home-method-title">${esc(model.methodTitle)}</h2><p>${esc(model.method)}</p></div>
    <div class="home-method-links">${model.sources.map(({href, name, block}) => `<a href="${url(href)}"${block ? ` data-home-block="${esc(block)}"` : ''}>${esc(name)}</a>`).join('')}</div>
  </section>
  ${account}
</main>`;
}

export function homepageMarkdown(model) {
  const {zh} = model;
  const label = (cn, en) => zh ? cn : en;
  const link = ({href, name}) => `[${name}](${new URL(href, model.canonical).href})`;
  const list = rows => rows.map(item => `- ${link(item)}${item.description ? ` — ${item.description}` : ''}`);
  return [
    `# ${model.heading}`,
    '', model.intro,
    '', `${label('HTML 正典', 'Canonical HTML')}: ${model.canonical}`,
    '', `## ${model.evidenceTitle}`, '', model.evidenceIntro, '', ...list(model.evidence),
    '', `## ${model.categoriesTitle}`, '', ...list([...model.categories, ...model.moreCategories]),
    '', `## ${model.toolsTitle}`, '', ...list(model.tools), ...list([model.videoStudio, model.toolbox]),
    '', `## ${model.discoverTitle}`, '', ...list(model.discover),
    '', `## ${model.methodTitle}`, '', model.method, '', ...list(model.sources),
    '',
  ].join('\n');
}
