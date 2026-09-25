import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copy, languages, toolSlugs, guideSlugs, references } from './copy.mjs';
import { fixture } from './fixtures.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const args = process.argv.slice(2), output = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : root;
const origin = 'https://thedollscout.com', edition = '2026-09-25.1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const write = (name, data) => { const file = path.join(output, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const urls = [], records = [];
const route = (lang, slug = '') => languages[lang].prefix + '/' + slug;
const image = '<svg viewBox="0 0 36 44" fill="none" aria-hidden="true"><path d="M7 2h15l9 9v30H7z" fill="#e3eff1" stroke="#116a72" stroke-width="2"/><path d="M22 2v10h9M12 20h14M12 26h14M12 32h8" stroke="#116a72" stroke-width="2"/></svg>';
function shell(lang, slug, title, description, body, mode = '') {
  const c = copy[lang], url = origin + route(lang, slug);
  const schema = [{ '@type':'WebPage', name:title, description, url, inLanguage:languages[lang].tag, isPartOf:{ '@type':'WebSite', name:'TDS Document Scout', url:origin + '/' } }];
  if (mode) schema.push({ '@type':'WebApplication', name:title, url, applicationCategory:'UtilitiesApplication', operatingSystem:'Modern web browser', isAccessibleForFree:true, offers:{ '@type':'Offer', price:'0', priceCurrency:'USD' }, softwareVersion:edition, description });
  if (slug && !slug.startsWith('learn/')) schema.push({ '@type':'BreadcrumbList', itemListElement:[{ '@type':'ListItem', position:1, name:c.home, item:origin + route(lang) }, { '@type':'ListItem', position:2, name:title, item:url }] });
  const faq = (slug === '' || toolSlugs.includes(slug)) ? { '@type':'FAQPage', mainEntity:c.faq.map(([name, text]) => ({ '@type':'Question', name, acceptedAnswer:{ '@type':'Answer', text } })) } : null;
  if (faq) schema.push(faq);
  return `<!doctype html><html lang="${languages[lang].tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)} | TDS</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${url}">${Object.entries(languages).map(([l, v]) => `<link rel="alternate" hreflang="${v.tag}" href="${origin + route(l, slug)}">`).join('')}<link rel="alternate" hreflang="x-default" href="${origin + route('en', slug)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:type" content="website"><meta property="og:image" content="${origin}/img/document-scout-og.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/document-assets/favicon.svg" type="image/svg+xml"><link rel="alternate" type="text/plain" href="/llms.txt" title="TDS machine-readable index"><link rel="stylesheet" href="/document-assets/style.css?v=${edition}"><script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org', '@graph':schema }).replace(/</g, '\\u003c')}</script></head><body data-document-edition="${edition}" data-document-mode="${mode || 'content'}"><a class="skip" href="#main">${esc(c.skip)}</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="${route(lang)}">${image}<span><small>TDS</small>${esc(c.brand)}</span></a><nav class="main-nav" aria-label="${esc(c.tools)}"><a href="${route(lang)}#tools">${esc(c.tools)}</a><a href="${route(lang)}#guides">${esc(c.guides)}</a><a href="${route(lang, 'methodology')}">${esc(c.method)}</a></nav><nav class="languages" aria-label="${esc(c.language)}">${Object.entries(languages).map(([l, v]) => `<a lang="${v.tag}" hreflang="${v.tag}" href="${route(l, slug)}" ${l === lang ? 'aria-current="page"' : ''}>${v.label}</a>`).join('')}</nav></div></header><main id="main" class="wrap">${body}</main><footer class="site-footer"><div class="wrap footer-inner"><div>${esc(c.footer)}<br><span>${esc(c.release)}</span></div><nav><a href="${route(lang, 'methodology')}">${esc(c.method)}</a><a href="${route(lang, 'document-privacy')}">${esc(c.privacy)}</a><a href="${route(lang, 'collectors')}">${esc(c.archive)}</a></nav></div></footer><script id="document-copy" type="application/json">${JSON.stringify(c).replace(/</g, '\\u003c')}</script><script type="module" src="/document-assets/app.mjs?v=${edition}"></script></body></html>`;
}
function putPage(lang, slug, title, description, body, mode) {
  const url = origin + route(lang, slug), rel = languages[lang].prefix.replace(/^\//, '') + (languages[lang].prefix ? '/' : '') + (slug ? slug + '.html' : 'index.html');
  write(rel, shell(lang, slug, title, description, body, mode)); urls.push(url); records.push({ url, lang, title, description, slug });
}
function workspace(c, mode, home = false) {
  const input = mode === 'compare' ? `<div class="compare-inputs">${['before', 'after'].map((key, index) => `<section class="compare-slot"><h3>${esc(c[key])}</h3><label class="upload-label">${esc(index ? c.chooseAfter : c.chooseBefore)}<input type="file" accept="application/pdf,.pdf" data-slot="${index}" aria-label="${esc(c[key])}"></label><p id="${key}-name">${esc(c.noFile)}</p></section>`).join('')}</div><p class="small">${esc(c.diffLimit)}</p>` : `<div class="drop-zone" id="drop-zone"><span class="document-icon">${image}</span><strong>${esc(c.drop)}</strong><p>${esc(c.limits)}</p><label class="upload-label">${esc(c.choose)}<input id="pdf-files" type="file" accept="application/pdf,.pdf" multiple aria-label="${esc(c.choose)}"></label></div><ul class="file-list" id="file-list" aria-label="${esc(c.selected)}"></ul>`;
  return `<section id="workspace" class="work-panel ${home ? '' : 'tool-workspace'}" aria-busy="false">${home ? `<h2>${esc(c.toolNames[0])}</h2><p class="sub">${esc(c.local)}</p>` : `<p class="sub">${esc(c.local)}</p>`}${input}<div class="actions"><button id="run" class="primary" disabled data-busy-disable>${esc(mode === 'text' ? c.runText : mode === 'compare' ? c.runDiff : c.run)}</button><button id="sample" data-busy-disable>${esc(c.sample)}</button><button id="cancel" hidden>${esc(c.cancel)}</button></div><p class="sample-hint">${esc(c.sampleHint)}</p><button id="clear" class="text-button">${esc(c.clear)}</button><p id="status" class="status-line" role="status" aria-live="polite">${esc(c.ready)}</p><noscript><p>${esc(c.local)} JavaScript</p></noscript></section>`;
}
const results = '<section id="results" class="result-area" tabindex="-1" hidden></section>';
const faq = c => `<section class="section faq"><h2>${c === copy.de ? 'Häufige Fragen' : c === copy.zh ? '常见问题' : 'Common questions'}</h2>${c.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
const related = (lang, current = '') => `<nav class="related">${toolSlugs.filter(slug => slug !== current).map(slug => `<a href="${route(lang, slug)}">${esc(copy[lang].toolNames[toolSlugs.indexOf(slug)])}</a>`).join('')}</nav>`;
const sources = c => `<h2>${esc(c.sources)}</h2><ul class="source-links">${references.map(([title, url]) => `<li><a href="${url}" rel="noopener">${esc(title)}</a></li>`).join('')}</ul>`;
for (const [lang, c] of Object.entries(copy)) {
  const toolList = `<section class="section" id="tools"><h2>${esc(c.toolSection)}</h2><div class="tool-grid">${toolSlugs.map((slug, index) => `<article class="tool-entry"><span class="tool-glyph" aria-hidden="true">${['✓', '▤', 'T', '⇄'][index]}</span><div><h3><a href="${route(lang, slug)}">${esc(c.toolNames[index])}</a></h3><p>${esc(c.toolDesc[index])}</p></div></article>`).join('')}</div></section>`;
  const guideList = `<section class="section" id="guides"><h2>${esc(c.guides)}</h2><ul class="guide-list">${guideSlugs.map((slug, i) => `<li><a href="${route(lang, 'learn/' + slug)}">${esc(c.guideTitles[i])}</a></li>`).join('')}</ul></section>`;
  putPage(lang, '', c.homeTitle, c.intro, `<section class="hero"><div class="hero-copy"><h1>${esc(c.hero)}</h1><p class="intro">${esc(c.intro)}</p><p class="trust-line">${esc(c.resultScope)}</p></div>${workspace(c, 'audit', true)}</section>${results}${toolList}<section class="section"><h2>${esc(c.workflowTitle)}</h2><div class="workflow">${c.workflow.map(([h, p]) => `<article><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}</div></section><section class="free-band"><h2>${esc(c.freeTitle)}</h2><p>${esc(c.freeBody)}</p></section>${faq(c)}${guideList}`, 'audit');
  for (const [index, slug] of toolSlugs.entries()) {
    const mode = ['audit', 'batch', 'text', 'compare'][index];
    putPage(lang, slug, c.toolNames[index], c.toolDesc[index], `<nav class="breadcrumb"><a href="${route(lang)}">${esc(c.home)}</a> / ${esc(c.toolNames[index])}</nav><div class="tool-heading"><h1>${esc(c.toolNames[index])}</h1><p>${esc(c.toolDesc[index])}</p></div>${workspace(c, mode)}${results}<section class="section"><h2>${esc(c.method)}</h2><p>${esc(mode === 'compare' ? c.diffScope : c.resultScope)}</p><p>${esc(c.methodology[2])}</p><a href="${route(lang, 'methodology')}">${esc(c.method)}</a><div class="actions"><button data-copy-link>${esc(c.copyLink)}</button></div></section>${faq(c)}<section class="section"><h2>${esc(c.next)}</h2>${related(lang, slug)}</section>`, mode);
  }
  for (const [index, slug] of guideSlugs.entries()) putPage(lang, 'learn/' + slug, c.guideTitles[index], c.guideBodies[index][0], `<article class="prose"><a href="${route(lang)}">${esc(c.home)}</a><h1>${esc(c.guideTitles[index])}</h1>${c.guideBodies[index].map(p => `<p>${esc(p)}</p>`).join('')}<a class="button primary" href="${route(lang, toolSlugs[index === 1 ? 2 : 0])}">${esc(c.toolNames[index === 1 ? 2 : 0])}</a>${sources(c)}</article>`);
  for (const [slug, title, paragraphs] of [['methodology', c.method, c.methodology], ['document-privacy', c.privacy, c.privacyBody]]) putPage(lang, slug, title, paragraphs[0], `<article class="prose"><a href="${route(lang)}">${esc(c.home)}</a><h1>${esc(title)}</h1>${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${slug === 'methodology' ? sources(c) : '<p><a href="/legal/privacy">' + esc(c.privacy) + '</a></p>'}${related(lang)}</article>`);
  const oldPrefix = lang === 'de' ? '/de' : '';
  const archiveText = lang === 'en' ? 'The original collecting guides remain available below. TDS now focuses on document tools. These historical tools have a separate scope and do not assess PDFs.' : lang === 'de' ? 'Die bisherigen Sammelratgeber bleiben verfügbar. TDS konzentriert sich nun auf Dokumentwerkzeuge. Die historischen Werkzeuge prüfen keine PDFs.' : '原收藏品指南仍可在下方访问。TDS 现在聚焦文档处理；这些历史工具属于独立主题，不检查 PDF。';
  putPage(lang, 'collectors', c.archive, archiveText, `<article class="prose"><h1>${esc(c.archive)}</h1><p>${esc(archiveText)}</p><ul><li><a href="${oldPrefix}/rarity">Labubu ${lang === 'de' ? 'Seltenheit und Chancen' : lang === 'zh' ? '稀有度与概率（英文）' : 'rarity and odds'}</a></li><li><a href="${oldPrefix}/collection-tracker">${lang === 'de' ? 'Sammlung verwalten' : lang === 'zh' ? '收藏清单（英文）' : 'Collection tracker'}</a></li><li><a href="${oldPrefix}/display-calculator">${lang === 'de' ? 'Vitrinenplatz berechnen' : lang === 'zh' ? '展示空间计算（英文）' : 'Display fit calculator'}</a></li><li><a href="${oldPrefix}/fake-check">${lang === 'de' ? 'Echtheit prüfen' : lang === 'zh' ? '真伪检查（英文）' : 'Authenticity checklist'}</a></li></ul></article>`);
}
// Public browser dependencies are copied at build time, not committed as vendor blobs.
const vendor = path.join(here, 'node_modules/pdfjs-dist');
for (const name of ['pdf.mjs', 'pdf.worker.mjs']) write('document-assets/vendor/' + name, fs.readFileSync(path.join(vendor, 'legacy/build', name)));
write('document-assets/vendor/LICENSE.txt', fs.readFileSync(path.join(vendor, 'LICENSE')));
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) fs.cpSync(path.join(vendor, folder), path.join(output, 'document-assets/vendor', folder), { recursive:true });
write('document-assets/favicon.svg', image.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"'));
for (const [file, kind] of [['sample-before', 'before'], ['sample-after', 'after'], ['sample-image', 'image']]) write('document-assets/samples/' + file + '.pdf', await fixture(kind));
const sitemap = path.join(output, 'sitemap.xml');
let xml = fs.existsSync(sitemap) ? fs.readFileSync(sitemap, 'utf8') : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
for (const url of urls) if (!xml.includes('<loc>' + url + '</loc>')) xml = xml.replace('</urlset>', `<url><loc>${url}</loc><lastmod>2026-09-25</lastmod></url>\n</urlset>`);
write('sitemap.xml', xml);
const index = '# TDS Document Scout\n\nFree PDF preflight, batch review, text extraction and text-version comparison. PDFs stay in the browser. Automated signals do not certify WCAG or PDF/UA conformance. No OCR or tag repair.\n\n' + records.map(r => `- [${r.title}](${r.url}) (${r.lang}): ${r.description}`).join('\n') + '\n\n## Historical collector material\n\nThe prior collector content has a separate scope: https://thedollscout.com/collectors\n';
write('llms.txt', index);
write('llms-full.txt', index + '\n\n' + Object.entries(copy).map(([lang, c]) => `## ${lang}: ${c.method}\n\n${c.methodology.join('\n\n')}\n\n${c.guideTitles.map((title, i) => `### ${title}\n\n${c.guideBodies[i].join('\n\n')}`).join('\n\n')}`).join('\n\n'));
write('document-assets/manifest.json', JSON.stringify({ edition, urls, records, tools:toolSlugs, languages:Object.keys(languages), pdfjs:'6.3.289' }, null, 2) + '\n');
const urlList = path.join(root, 'scripts/urls.txt');
if (output === root && fs.existsSync(urlList)) { const old = fs.readFileSync(urlList, 'utf8').trim().split('\n'); fs.writeFileSync(urlList, [...new Set([...old, ...urls])].join('\n') + '\n'); }
// Label historical content in the assembled release without changing generated
// collector source pages or interfering with the independent member area.
if (output !== root) {
  function annotate(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
      if (['document-assets','workbench-assets','member-assets','functions','scripts','legal'].includes(entry.name)) continue;
      const file = path.join(dir,entry.name);
      if (entry.isDirectory()) { annotate(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      let html = fs.readFileSync(file,'utf8');
      if (html.includes('data-document-edition') || html.includes('data-member-entry') || html.includes('tds-archive-note') || !/<body\b/.test(html)) continue;
      const de = file.startsWith(path.join(output,'de') + path.sep);
      const note = de ? 'Sammlerarchiv. TDS bietet jetzt Dokumentwerkzeuge.' : 'Collector archive. TDS now focuses on document tools.';
      html = html.replace('</head>','<link rel="stylesheet" href="/document-assets/archive.css"></head>');
      html = html.replace(/(<body\b[^>]*>)/,`$1<aside class="tds-archive-note">${note} <a href="${de ? '/de/' : '/'}">TDS Document Scout</a></aside>`);
      fs.writeFileSync(file,html);
    }
  }
  annotate(output);
}
console.log(`Document Scout: ${records.length} localized pages, real PDF fixtures and pinned PDF.js runtime built.`);
