// A relevant BPJ task at the point where a reader has finished checking a tool.
export function catalogTaskLink(slug, locale, base) {
  const zh = locale === 'zh';
  let title, label, href;
  if (slug === 'kimi' && zh) {
    title = '用 Kimi 读文档之前';
    label = '整理阅读步骤和提问清单';
    href = '#kimi-task';
  } else if (slug === 'chatgpt' || slug === 'kimi') {
    title = zh ? '只想让 ChatGPT 读几页 PDF？' : 'Only need a few pages for ' + (slug === 'kimi' ? 'Kimi' : 'ChatGPT') + '?';
    label = zh ? '在浏览器里选页，导出一份新 PDF' : 'Select pages and export a new PDF locally';
    href = base + '/studio/pdf-tools';
  } else if (slug === 'qingying') {
    title = zh ? '已有清影生成的素材？' : 'Have footage from Qingying?';
    label = zh ? '用自己的素材制作多画幅视频' : 'Create video variants with your own footage';
    href = base + '/studio/video-variants';
  } else {
    return '';
  }
  return `<section class="panel" aria-labelledby="catalog-task-title"><h2 id="catalog-task-title">${title}</h2><a data-catalog-task="${slug}" href="${href}">${label} →</a></section><script defer src="/catalog-task.js?v=1"></script>`;
}
