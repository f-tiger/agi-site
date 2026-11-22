import {shellToolShare} from './site-shell.mjs';

const featured = [
  {
    path: '/studio/ai/ai-eval-export-pair',
    title: {zh: '对比两轮 AI 评测', en: 'Compare two AI evaluation runs'},
    description: {
      zh: '按样本 ID 对齐两份 CSV 或 Promptfoo 结果，为回退检查生成配对数据。',
      en: 'Match two CSV or Promptfoo exports by case ID and prepare paired results for a regression check.',
    },
  },
  {
    path: '/studio/table-review',
    title: {zh: '按编号核对改写后的 CSV', en: 'Review a rewritten CSV by ID'},
    description: {
      zh: '找出漏行和错改，恢复锁定字段，导出保留了允许修改的 CSV。',
      en: 'Find missing rows and unwanted edits, restore locked fields, and export the reviewed CSV.',
    },
  },
  {
    path: '/studio/ai/answer-citation-coverage',
    title: {zh: '检查 AI 回答的引用覆盖', en: 'Check citations in an AI answer'},
    description: {
      zh: '找出缺引用的段落，以及引用了哪些未登记的来源。',
      en: 'Find passages without citations and citations that point to unlisted sources.',
    },
  },
  {
    path: '/studio/ai/ai-human-review-queue',
    title: {zh: '整理 AI 评测人审队列', en: 'Build a human review queue'},
    description: {
      zh: '先看评审意见不一致的样本，再补齐缺失的判断。',
      en: 'Prioritize cases where reviewers disagree and surface missing judgments.',
    },
  },
  {
    path: '/studio/ai/ai-json-output-contract',
    title: {zh: '检查 AI 输出是否符合 JSON 约定', en: 'Check AI output against a JSON contract'},
    description: {
      zh: '按约定核对必填字段和类型，定位不合格的输出。',
      en: 'Check required fields and types, then locate outputs that fail the contract.',
    },
  },
].map(tool => ({...tool, id: tool.path.split('/').at(-1)}));

export const aiSuiteLead = featured[0];
export const aiSuiteFeaturedCss = '<link rel="stylesheet" href="/studio-assets/ai-suite-directory.css?v=3">';

export function aiSuiteFeaturedTool(path) {
  return featured.find(tool => tool.path === path.replace(/\/$/, ''));
}

export function aiSuiteTaskLinks(base, lang) {
  return featured.map(tool => ({href: base + tool.path, label: tool.title[lang]}));
}

export function renderAiFeatured({BASE, lang, esc, heading = 'h2'}) {
  const zh = lang === 'zh';
  const cardHeading = heading === 'h2' ? 'h3' : 'h4';
  const example = `<div class="suite-featured-example">
    <span>${zh ? '示例 · 同一条评测样本' : 'Example · Same evaluation case'}</span>
    <div><code>001</code><strong>${zh ? '通过' : 'Pass'}</strong><span>→</span><strong>${zh ? '失败' : 'Fail'}</strong></div>
  </div>`;
  return `<section class="suite-featured" data-suite-featured aria-labelledby="suite-featured-title">
    <${heading} id="suite-featured-title">${zh ? 'AI 精品工具' : 'Featured AI tools'}</${heading}>
    <div class="suite-featured-grid">
      ${featured.map((tool, index) => {
        const url = BASE + tool.path;
        return `<article class="suite-featured-card${index === 0 ? ' suite-featured-lead' : ''}" data-suite-featured-tool="${tool.id}">
          <div class="suite-featured-copy">
            <${cardHeading}><a href="${url}">${esc(tool.title[lang])} <span aria-hidden="true">↗</span></a></${cardHeading}>
            <p>${esc(tool.description[lang])}</p>
            ${shellToolShare(lang, url, tool.title[lang], {compact: true})}
          </div>
          ${index === 0 ? example : ''}
        </article>`;
      }).join('')}
    </div>
  </section>`;
}
