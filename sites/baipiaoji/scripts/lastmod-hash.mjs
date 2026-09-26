// Content hash behind sitemap <lastmod> and the IndexNow change list (see build.mjs 「真实 lastmod」).
// Everything removed here is page chrome that moves without the page's own content moving.
import { createHash } from 'node:crypto';

// Three kinds of chrome sit on every page and move with any single edit: the rail's per-section and per-category counts, the footer's
// directory size ("共收录 N 个…" / "Listing N AI tools…") and the subscribe box's "latest entry: <tool> … moved on <date>" line. Together
// they restamped all 1 700 pages on 2026-09-25 (two coding agents added, Cursor re-verified), which would re-push the whole site to
// IndexNow and bury the pages that really changed. The hash ignores them (item 24's "900+" badge fixed one of these by display; the
// rest are exact numbers readers use, so they stay on the page and leave the hash instead). The manifest committed with this change was migrated once to the new formula (dates kept where only these moved).
export const FOOTER_COUNT = /(共收录|Listing) \d+ (个真有免费额度的 AI 工具|AI tools with a real free tier)<\/p>/g;
export const lmNormalize = (s) => s
      .replace(/(<nav class="rail-(?:jump|nav)">)([\s\S]*?)(<\/nav>)/g, (m, a, b, c) => a + b.replace(/<span>[\d,+]+<\/span>/g, '<span>N</span>') + c)
      .replace(FOOTER_COUNT, '$1 N $2</p>')
      .replace(/<p class="sub-proof">[\s\S]*?<\/p>/g, '')
      .replace(/<script>[\s\S]*?<\/script>/g, '')
      // Global discovery chrome does not make every existing article newly updated.
      .replace(/\n    <a data-studio-nav[^>]*>[\s\S]*?<\/a>/g, '')
      .replace(/\n    <a data-video-nav[^>]*>[\s\S]*?<\/a>/g, '')
      .replace(/<a data-studio-footer[^>]*>[\s\S]*?<\/a> · /g, '')
      // Asset cache-busters (?v=EDITION) are not page content: a studio EDITION bump must not restamp ~50 pages (2026-09-25 audit V5).
      .replace(/(\/studio-assets\/[^"?]+)\?v=[^"]*/g, '$1')
      .replace(/(\/(?:site-shell\.(?:css|js)|account\.(?:css|js)|bpj\.js))\?v=[^"]*/g, '$1')
      .replace(/\d{4}-\d{2}-\d{2}/g, 'D');
export const lmHashOf = (html) => createHash('sha1').update(lmNormalize(html)).digest('hex').slice(0, 16);
