import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copy, languages, toolSlugs, guideSlugs, references } from './copy.mjs';
import { fixture } from './fixtures.mjs';
import { deliveryCopy, deliveryPage } from './delivery-copy.mjs';
import { verifyCopy, verifyPage } from './verify-copy.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const args = process.argv.slice(2), output = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : root;
const origin = 'https://thedollscout.com', edition = '2026-09-25.8', updated = '2026-09-25';
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const write = (name, data) => { const file = path.join(output, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const urls = [], records = [];
const route = (lang, slug = '') => languages[lang].prefix + '/' + slug;
const image = '<svg viewBox="0 0 36 44" fill="none" aria-hidden="true"><path d="M7 2h15l9 9v30H7z" fill="#fff5f7" stroke="#e4002b" stroke-width="2"/><path d="M22 2v10h9M12 20h14M12 26h14M12 32h8" stroke="#e4002b" stroke-width="2"/></svg>';
const textRoute = (lang, slug) => '/document-assets/text/' + lang + '/' + (slug || 'home') + '.txt';
const pageShare = (lang, slug) => {
  const c = copy[lang];
  return `<section class="share-section" aria-labelledby="share-heading"><div><h2 id="share-heading">${esc(c.shareTitle)}</h2><p>${esc(c.shareBody)}</p></div><div class="share-controls"><label for="page-share-url">${esc(c.shareUrl)}</label><input id="page-share-url" readonly value="${origin + route(lang, slug)}?via=share"><div class="actions"><button data-native-share="page" hidden>${esc(c.sharePage)}</button><button data-copy-share="page">${esc(c.copyPage)}</button></div><p id="page-share-status" role="status" class="small"></p></div></section>`;
};
const breadcrumb = (lang, slug, title) => slug ? `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">${esc(copy[lang].home)}</a><span aria-hidden="true"> / </span>${slug.startsWith('learn/') ? `<a href="${route(lang)}#guides">${esc(copy[lang].guides)}</a><span aria-hidden="true"> / </span>` : ''}<span aria-current="page">${esc(title)}</span></nav>` : '';
function shell(lang, slug, title, description, body, mode = '') {
  const c = copy[lang], url = origin + route(lang, slug), toolIndex = toolSlugs.indexOf(slug);
  const searchTitle = toolIndex < 0 ? title : c.toolSeoTitles[toolIndex];
  const guide = slug.startsWith('learn/'), socialImage = origin + '/img/document-scout-brand.png';
  const org = { '@type':'Organization', '@id':origin + '/#publisher', name:'TDS Document Scout', url:origin + '/', logo:origin + '/document-assets/favicon.svg' };
  const website = { '@type':'WebSite', '@id':origin + '/#website', name:'TDS Document Scout', alternateName:'TDS', url:origin + '/', publisher:{ '@id':org['@id'] }, inLanguage:Object.values(languages).map(v => v.tag) };
  const schema = [org, website, { '@type':'WebPage', '@id':url + '#page', name:searchTitle, description, url, inLanguage:languages[lang].tag, dateModified:updated, isPartOf:{ '@id':website['@id'] }, publisher:{ '@id':org['@id'] } }];
  if (mode) schema.push({ '@type':'WebApplication', '@id':url + '#tool', name:title, url, applicationCategory:'UtilitiesApplication', operatingSystem:'Modern web browser', browserRequirements:'JavaScript enabled', isAccessibleForFree:true, offers:{ '@type':'Offer', price:'0', priceCurrency:'USD' }, softwareVersion:edition, description, publisher:{ '@id':org['@id'] }, ...(toolIndex >= 0 ? { featureList:[c.outputs[toolIndex], c.limitations[toolIndex]] } : {}) });
  if (slug) {
    const items = [{ name:c.home, item:origin + "/" }];
    if (guide) items.push({ name:c.guides, item:origin + route(lang) + '#guides' });
    items.push({ name:title, item:url });
    schema.push({ '@type':'BreadcrumbList', itemListElement:items.map((item, i) => ({ '@type':'ListItem', position:i+1, ...item })) });
  }
  if (guide) schema.push({ '@type':'Article', headline:title, description, inLanguage:languages[lang].tag, datePublished:updated, dateModified:updated, author:{ '@id':org['@id'] }, publisher:{ '@id':org['@id'] }, mainEntityOfPage:{ '@id':url + '#page' }, citation:references.map(([,href]) => href) });
  if (slug === '' || toolIndex >= 0) schema.push({ '@type':'FAQPage', mainEntity:c.faq.map(([name, text]) => ({ '@type':'Question', name, acceptedAnswer:{ '@type':'Answer', text } })) });
  const ogLocales = { en:'en_US', de:'de_DE', zh:'zh_CN' };
  const navItem = (href, label, active) => `<a href="${href}"${active ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  return `<!doctype html><html lang="${languages[lang].tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="theme-color" content="#e4002b"><title>${esc(searchTitle)} | TDS Document Scout</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">${Object.entries(languages).map(([l, v]) => `<link rel="alternate" hreflang="${v.tag}" href="${origin + route(l, slug)}">`).join('')}<link rel="alternate" hreflang="x-default" href="${origin + route('en', slug)}"><meta property="og:site_name" content="TDS Document Scout"><meta property="og:title" content="${esc(searchTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:type" content="${guide ? 'article' : 'website'}"><meta property="og:locale" content="${ogLocales[lang]}">${Object.entries(ogLocales).filter(([l]) => l !== lang).map(([,v]) => `<meta property="og:locale:alternate" content="${v}">`).join('')}<meta property="og:image" content="${socialImage}"><meta property="og:image:alt" content="TDS Document Scout — PDF tools"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(searchTitle)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${socialImage}"><meta name="twitter:image:alt" content="TDS Document Scout — PDF tools"><link rel="icon" href="/document-assets/favicon.svg?v=${edition}" type="image/svg+xml"><link rel="alternate" type="text/plain" href="${textRoute(lang,slug)}" title="${esc(c.plainText)}"><link rel="stylesheet" href="/document-assets/style.css?v=${edition}">${mode === 'verify' ? `<link rel="stylesheet" href="/document-assets/verify.css?v=${edition}-picker1">` : ''}${mode === 'delivery' ? `<link rel="stylesheet" href="/document-assets/delivery.css?v=${edition}-picker1">` : ''}<script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org', '@graph':schema }).replace(/</g, '\\u003c')}</script></head><body data-document-edition="${edition}" data-document-mode="${mode || 'content'}"><a class="skip" href="#main">${esc(c.skip)}</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="TDS ${esc(c.brand)} — ${esc(c.home)}">${image}<span><small>TDS</small>${esc(c.brand)}</span></a><nav class="main-nav" aria-label="${esc(c.tools)}">${navItem("/",c.home,lang === "en" && !slug)}${navItem(route(lang)+'#tools',c.tools,toolIndex >= 0)}${navItem(route(lang)+'#guides',c.guides,guide)}${navItem(route(lang,'methodology'),c.method,slug === 'methodology')}</nav><nav class="languages" aria-label="${esc(c.language)}">${Object.entries(languages).map(([l, v]) => `<a lang="${v.tag}" hreflang="${v.tag}" href="${route(l, slug)}" ${l === lang ? 'aria-current="page"' : ''}>${v.label}</a>`).join('')}</nav></div></header><main id="main" class="wrap">${breadcrumb(lang,slug,title)}${body}${pageShare(lang,slug)}</main><footer class="site-footer"><div class="wrap footer-inner"><div>${esc(c.footer)}<br><span>${esc(c.release)}</span></div><nav aria-label="TDS"><a href="/">${esc(c.home)}</a><a href="${route(lang, 'methodology')}">${esc(c.method)}</a><a href="${route(lang, 'document-privacy')}">${esc(c.privacy)}</a><a href="${route(lang, 'collectors')}">${esc(c.archive)}</a><a href="${textRoute(lang,slug)}">${esc(c.plainText)}</a></nav></div></footer><script id="document-copy" type="application/json">${JSON.stringify(c).replace(/</g, '\\u003c')}</script><script type="module" src="/document-assets/app.mjs?v=${edition}"></script></body></html>`;
}
function putPage(lang, slug, title, description, body, mode) {
  const url = origin + route(lang, slug), rel = languages[lang].prefix.replace(/^\//, '') + (languages[lang].prefix ? '/' : '') + (slug ? slug + '.html' : 'index.html');
  write(rel, shell(lang, slug, title, description, body, mode)); urls.push(url); records.push({ url, lang, title, description, slug, textUrl:origin + textRoute(lang,slug) });
}
function workspace(c, mode, home = false) {
  const input = mode === 'compare' ? `<div class="compare-inputs">${['before', 'after'].map((key, index) => `<section class="compare-slot"><h3>${esc(c[key])}</h3><label class="upload-label">${esc(index ? c.chooseAfter : c.chooseBefore)}<input type="file" accept="application/pdf,.pdf" data-slot="${index}" aria-label="${esc(c[key])}"></label><p id="${key}-name">${esc(c.noFile)}</p></section>`).join('')}</div><p class="small">${esc(c.diffLimit)}</p>` : `<div class="drop-zone" id="drop-zone"><span class="document-icon">${image}</span><strong>${esc(c.drop)}</strong><p>${esc(c.limits)}</p><label class="upload-label">${esc(c.choose)}<input id="pdf-files" type="file" accept="application/pdf,.pdf" multiple aria-label="${esc(c.choose)}"></label></div><ul class="file-list" id="file-list" aria-label="${esc(c.selected)}"></ul>`;
  return `<section id="workspace" class="work-panel ${home ? '' : 'tool-workspace'}" aria-busy="false">${home ? `<h2>${esc(c.toolNames[0])}</h2><p class="sub">${esc(c.local)}</p>` : `<p class="sub">${esc(c.local)}</p>`}${input}<div class="actions"><button id="run" class="primary" disabled data-busy-disable>${esc(mode === 'text' ? c.runText : mode === 'compare' ? c.runDiff : c.run)}</button><button id="sample" data-busy-disable>${esc(c.sample)}</button><button id="cancel" hidden>${esc(c.cancel)}</button></div><p class="sample-hint">${esc(c.sampleHint)}</p><button id="clear" class="text-button">${esc(c.clear)}</button><p id="status" class="status-line" role="status" aria-live="polite">${esc(c.ready)}</p><noscript><p>${esc(c.local)} JavaScript</p></noscript></section>`;
}
const results = '<section id="results" class="result-area" tabindex="-1" hidden></section>';
const faq = c => `<section class="section faq"><h2>${c === copy.de ? 'Häufige Fragen' : c === copy.zh ? '常见问题' : 'Common questions'}</h2>${c.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
const related = (lang, current = '') => `<nav class="related">${toolSlugs.filter(slug => slug !== current).map(slug => `<a href="${route(lang, slug)}">${esc(copy[lang].toolNames[toolSlugs.indexOf(slug)])}</a>`).join('')}</nav>`;
const sources = c => `<h2>${esc(c.sources)}</h2><ul class="source-links">${references.map(([title, url]) => `<li><a href="${url}" rel="noopener">${esc(title)}</a></li>`).join('')}</ul>`;
const meta = c => `<p class="editorial-meta">${esc(c.maintained)} · ${esc(c.reviewed)} <time datetime="${updated}">${updated}</time></p>`;
const guideLinks = lang => `<ul class="guide-list">${guideSlugs.map((slug, i) => `<li><a href="${route(lang, 'learn/' + slug)}">${esc(copy[lang].guideTitles[i])}</a></li>`).join('')}</ul>`;
const facts = (c, index) => `<section class="tool-facts section" aria-labelledby="overview"><h2 id="overview">${esc(c.overview)}</h2><dl>${[[c.forLabel,c.useCases[index]],[c.outputLabel,c.outputs[index]],[c.limitLabel,c.limitations[index]]].map(([label,text]) => `<div><dt>${esc(label)}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl></section>`;
for (const [lang, c] of Object.entries(copy)) {
  const dc = deliveryCopy[lang], vc=verifyCopy[lang];
  putPage(lang,'verify-file',vc.title,vc.intro,verifyPage(vc,esc),'verify');
  const verifyEntry=`<section class="free-band"><h2>${esc(vc.home)}</h2><p>${esc(vc.homeBody)}</p><a class="button primary" href="${route(lang,'verify-file')}">${esc(vc.cta)}</a></section>`;
  putPage(lang, 'delivery-evidence', dc.title, dc.intro, deliveryPage(dc,esc), 'delivery');
  const deliveryEntry = `<section class="free-band"><h2>${esc(dc.home)}</h2><p>${esc(dc.homeBody)}</p><a class="button primary" href="${route(lang,'delivery-evidence')}">${esc(dc.cta)}</a></section>`;
  const toolList = `<section class="section" id="tools"><h2>${esc(c.toolSection)}</h2><div class="tool-grid">${toolSlugs.map((slug, index) => `<article class="tool-entry"><span class="tool-glyph" aria-hidden="true">${['✓', '▤', 'T', '⇄'][index]}</span><div><h3><a href="${route(lang, slug)}">${esc(c.toolNames[index])}</a></h3><p>${esc(c.toolDesc[index])}</p></div></article>`).join('')}</div></section>`;
  const guideList = `<section class="section" id="guides"><h2>${esc(c.guides)}</h2>${guideLinks(lang)}</section>`;
  putPage(lang, '', c.homeTitle, c.intro, `<section class="hero"><div class="hero-copy"><p class="eyebrow">${esc(c.eyebrow)}</p><h1>${c.heroLines.map(line => `<span>${esc(line)}</span>`).join(' ')}</h1><p class="intro">${esc(c.intro)}</p><ul class="benefits">${c.benefits.map(v => `<li>${esc(v)}</li>`).join('')}</ul><p class="trust-line">${esc(c.resultScope)}</p></div>${workspace(c, 'audit', true)}</section>${results}${toolList}${verifyEntry}${deliveryEntry}<section class="section"><h2>${esc(c.workflowTitle)}</h2><div class="workflow">${c.workflow.map(([h, p]) => `<article><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}</div></section><section class="free-band"><h2>${esc(c.freeTitle)}</h2><p>${esc(c.freeBody)}</p></section>${faq(c)}${guideList}`, 'audit');
  for (const [index, slug] of toolSlugs.entries()) {
    const mode = ['audit', 'batch', 'text', 'compare'][index];
    const tabs = `<nav class="tool-tabs" aria-label="${esc(c.tools)}">${toolSlugs.map((s,i) => `<a href="${route(lang,s)}"${s === slug ? ' aria-current="page"' : ''}>${esc(c.toolNames[i])}</a>`).join('')}</nav>`;
    putPage(lang, slug, c.toolNames[index], c.toolDesc[index], `<div class="tool-heading"><p class="eyebrow">${esc(c.eyebrow)}</p><h1>${esc(c.toolNames[index])}</h1><p>${esc(c.toolDesc[index])}</p></div>${tabs}${workspace(c, mode)}${results}${facts(c,index)}<section class="section"><h2>${esc(c.method)}</h2>${meta(c)}<p>${esc(mode === 'compare' ? c.diffScope : c.resultScope)}</p><p>${esc(c.methodology[2])}</p><a href="${route(lang, 'methodology')}">${esc(c.method)}</a></section>${faq(c)}<section class="section"><h2>${esc(c.relatedGuides)}</h2>${guideLinks(lang)}<h3>${esc(c.next)}</h3>${related(lang, slug)}<p><a href="${route(lang,'delivery-evidence')}">${esc(dc.cta)}</a></p></section>`, mode);
  }
  for (const [index, slug] of guideSlugs.entries()) putPage(lang, 'learn/' + slug, c.guideTitles[index], c.guideBodies[index][0], `<article class="prose"><h1>${esc(c.guideTitles[index])}</h1>${meta(c)}${c.guideBodies[index].map((p,i) => `<p${i === 0 ? ' class="answer-lead"' : ''}>${esc(p)}</p>`).join('')}<a class="button primary" href="${route(lang, toolSlugs[index === 1 ? 2 : 0])}">${esc(c.toolNames[index === 1 ? 2 : 0])}</a>${sources(c)}<aside class="citation-note"><h2>${esc(c.citeTitle)}</h2><p>${esc(c.citeBody)}</p><a href="${textRoute(lang,'learn/'+slug)}">${esc(c.plainText)}</a></aside><h2>${esc(c.relatedGuides)}</h2>${guideLinks(lang)}</article>`);
  for (const [slug, title, paragraphs] of [['methodology', c.method, c.methodology], ['document-privacy', c.privacy, c.privacyBody]]) putPage(lang, slug, title, paragraphs[0], `<article class="prose"><h1>${esc(title)}</h1>${meta(c)}${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${slug === 'methodology' ? sources(c) + `<p><a href="/document-assets/tool-capabilities.json">${esc(c.capabilityIndex)}</a></p>` : '<p><a href="/legal/privacy">' + esc(c.privacy) + '</a></p>'}${related(lang)}</article>`);
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
// Release date reflects actual content changes, never the daily build time.
for (const url of urls) {
  const node = `<url><loc>${url}</loc><lastmod>${updated}</lastmod></url>`;
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = new RegExp('<url>\\s*<loc>' + escaped + '</loc>[\\s\\S]*?</url>');
  xml = existing.test(xml) ? xml.replace(existing,node) : xml.replace('</urlset>',node + '\n</urlset>');
}
write('sitemap.xml', xml);
const texts = records.map(r => {
  const c = copy[r.lang], i = toolSlugs.indexOf(r.slug), gi = guideSlugs.indexOf(r.slug.replace(/^learn\//,''));
  let paragraphs = [];
  if (i >= 0) paragraphs = [c.forLabel + ': ' + c.useCases[i], c.outputLabel + ': ' + c.outputs[i], c.limitLabel + ': ' + c.limitations[i], c.local, c.resultScope, ...c.methodology, ...c.faq.flat()];
  else if (gi >= 0) paragraphs = c.guideBodies[gi];
  else if (r.slug === 'delivery-evidence') { const dc=deliveryCopy[r.lang]; paragraphs=[dc.intro,dc.limits,...dc.steps,dc.scopeBody,dc.sourceBody,dc.plansBody]; }
  else if (r.slug === 'verify-file') { const vc=verifyCopy[r.lang]; paragraphs=[vc.intro,vc.limits,...vc.steps,vc.scope,vc.privacy,vc.independentBody,vc.bitcoinBody]; }
  else if (r.slug === 'methodology') paragraphs = c.methodology;
  else if (r.slug === 'document-privacy') paragraphs = c.privacyBody;
  else if (!r.slug) paragraphs = [c.intro, c.local, c.resultScope, ...c.toolNames.flatMap((name,i) => [name,c.toolDesc[i]]), ...c.faq.flat()];
  else paragraphs = [r.description];
  const text = `# ${r.title}\n\n${r.url}\n${c.maintained}\n${c.reviewed}: ${updated}\n\n${paragraphs.join('\n\n')}\n\n${c.sources}\n${references.map(([title,url]) => `- ${title}: ${url}`).join('\n')}\n`;
  write(textRoute(r.lang,r.slug).slice(1),text);
  return text;
});
const capabilities = { name:'TDS Document Scout', edition, updated, execution:'User-operated browser only. No hosted PDF processing API.', uploads:false, accountRequired:false, cost:'Free', notSupported:['OCR','Tag repair','Visual comparison','Conformance certification'], tools:Object.keys(languages).flatMap(lang => toolSlugs.map((slug,i) => ({ language:languages[lang].tag, name:copy[lang].toolNames[i], url:origin+route(lang,slug), useCase:copy[lang].useCases[i], output:copy[lang].outputs[i], limitations:copy[lang].limitations[i], method:origin+route(lang,'methodology') }))) };
capabilities.deliveryRecord = { urls:Object.keys(languages).map(lang=>origin+route(lang,'delivery-evidence')), format:origin+'/document-assets/delivery-format.txt', output:'Local JSON and HTML file inventory with SHA-256 fingerprints and user notes', verification:'File equality only; no identity, delivery, consent or trusted time attestation', teamPlan:'Research only; not available to purchase' };
capabilities.fileVerification={urls:Object.keys(languages).map(lang=>origin+route(lang,'verify-file')),format:origin+'/document-assets/verify-format.txt',offlineVerifier:origin+'/document-assets/verify-file-cli.mjs',limitBytes:20971520,output:'Sender-generated links and local SHA-256 plus byte-length comparisons',limitations:'No identity, receipt, consent, malware safety or Bitcoin timestamp verification. No hosted processing API.'};
write('document-assets/tool-capabilities.json',JSON.stringify(capabilities,null,2)+'\n');
const index = '# TDS Document Scout\n\nFree PDF preflight, batch review, text extraction and text-version comparison. PDFs stay in the browser. Automated signals do not certify WCAG or PDF/UA conformance. No OCR or tag repair.\n\n' + records.map(r => `- [${r.title}](${r.url}) (${r.lang}): ${r.description}\n  Plain text: ${r.textUrl}`).join('\n') + '\n\nTool capabilities: https://thedollscout.com/document-assets/tool-capabilities.json\n\n## Historical collector material\n\nThe prior collector content and MCP have a separate scope: https://thedollscout.com/collectors\n';
write('llms.txt', index);
write('llms-full.txt', index + '\n\n' + texts.join('\n\n'));
write('document-assets/manifest.json', JSON.stringify({ edition, urls, records, tools:toolSlugs, languages:Object.keys(languages), pdfjs:'6.3.289' }, null, 2) + '\n');
const urlList = path.join(root, 'scripts/urls.txt');
if (output === root && fs.existsSync(urlList)) { const old = fs.readFileSync(urlList, 'utf8').trim().split('\n'); fs.writeFileSync(urlList, [...new Set([...old, ...urls])].join('\n') + '\n'); }
// Label historical content in the assembled release without changing generated
// collector source pages or interfering with the independent member area.
if (output !== root) {
  function annotate(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
      if (['document-assets','workbench-assets','member-assets','functions','scripts','legal','__ci'].includes(entry.name)) continue;
      const file = path.join(dir,entry.name);
      if (entry.isDirectory()) { annotate(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      let html = fs.readFileSync(file,'utf8');
      if (!/<body\b/.test(html)) continue;
      if (!html.includes('/css/brand.css?')) {
        html = html.replace('</head>',`<link rel="stylesheet" href="/css/brand.css?v=${edition}"></head>`);
      } else {
        html = html.replace(/\/css\/brand\.css\?v=[^"']+/g, '/css/brand.css?v=' + edition);
      }
      // TDS-only navigation adapter; shared workbench/member sources stay generic.
      if (/<body\b[^>]*data-(?:site|member-site)="tds"/.test(html) && !html.includes('class="tds-home-link"')) {
        const lang = /<html\b[^>]*lang="([^"]+)"/.exec(html)?.[1] || 'en';
        const home = copy[lang.startsWith('zh') ? 'zh' : lang === 'de' ? 'de' : 'en'].home;
        html = html.replace(/(<header\b[^>]*>[\s\S]*?<\/a>)/,`$1<a class="tds-home-link" href="/">${esc(home)}</a>`);
      }
      fs.writeFileSync(file,html);
      if (html.includes('data-document-edition') || html.includes('data-member-entry') || html.includes('tds-archive-note')) continue;
      const de = file.startsWith(path.join(output,'de') + path.sep);
      const note = de ? 'Sammlerarchiv. TDS bietet jetzt Dokumentwerkzeuge.' : 'Collector archive. TDS now focuses on document tools.';
      html = html.replace('</head>',`<link rel="stylesheet" href="/document-assets/archive.css?v=${edition}"></head>`);
      html = html.replace(/(<body\b[^>]*>)/,`$1<aside class="tds-archive-note">${note} <a href="/">${de ? 'TDS-Startseite' : 'TDS home'}</a></aside>`);
      fs.writeFileSync(file,html);
    }
  }
  annotate(output);
}
console.log(`Document Scout: ${records.length} localized pages, real PDF fixtures and pinned PDF.js runtime built.`);
