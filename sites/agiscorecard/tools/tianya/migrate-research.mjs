#!/usr/bin/env node
// One-time import/re-import of the frozen research site. --check needs no old checkout.
import {readFile, writeFile, readdir, mkdir} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {siteHeader, navAssets} from '../../site-nav/render.mjs';

const siteRoot = fileURLToPath(new URL('../../', import.meta.url));
const destination = path.join(siteRoot, 'tianya-research');
const pagePath = path.join(siteRoot, 'zh/tianya-research.html');
const canonical = 'https://agiscorecard.com/zh/tianya-research';
const snapshot = '2026-10-05';
const excluded = new Set(['index.html', 'robots.txt', 'sitemap.xml', 'llms.txt']);
const sha = value => createHash('sha256').update(value).digest('hex');
const phoneLike = /(?<!\d)1[3-9]\d{9}(?!\d)/;
const privatePatterns = [
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['credential', /(?:sk-(?:proj-|live-)[\w-]+|ghp_[\w]+|github_pat_[\w]+|AIza[\w-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|Bearer [A-Za-z0-9._-]{16,})/],
  ['credential assignment', /["']?(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)["']?\s*[:=]\s*["'][^"']{8,}["']/i],
  ['private local path', /\/(?:Users|home)\/[^\s/"']+\//],
];

function privacyCheck(name, content) {
  for (const [kind, pattern] of privatePatterns) {
    assert(!pattern.test(content), `${name}: review ${kind} before publishing (value suppressed)`);
  }
  if (name.endsWith('.json')) {
    const inspect = value => {
      if (!value || typeof value !== 'object') return;
      for (const [key, item] of Object.entries(value)) {
        if (typeof item === 'string' && /^(author|username|userName|phone|mobile|email)$/i.test(key)) {
          assert(!phoneLike.test(item), `${name}: phone-like account field requires anonymization`);
        }
        inspect(item);
      }
    };
    inspect(JSON.parse(content));
  }
}

function rewritePaths(text, names) {
  return text.replace(/(["'`])\/([A-Za-z0-9_.-]+)(?=["'`?#])/g,
    (full, quote, filename) => names.has(filename) ? `${quote}/tianya-research/${filename}` : full);
}

function renderPage(source, names) {
  let html = rewritePaths(source, names);
  html = html.replace(/<header\b[\s\S]*?<\/header>/,
    siteHeader('zh', {pathname: '/zh/tianya-research', alternate: '/', translation: false, current: 'evidence'}));
  html = html.replaceAll('https://tianya-prediction-lab.thomasedisonfault.chatgpt.site/', canonical)
    .replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">')
    .replace('<meta name="theme-color" content="#102842">', '<meta name="theme-color" content="#ffffff">')
    .replace(/<title>.*?<\/title>/, '<title>天涯研究资料库：60 条历史判断与时序核验｜AGI 记分牌</title>')
    .replace('content="天涯回声 · 预测证据实验室"', 'content="天涯研究资料库｜AGI 记分牌"')
    .replace(/<link rel="icon"[^>]*>/, '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'6\' fill=\'%23002FA7\'/%3E%3Ctext x=\'16\' y=\'24\' text-anchor=\'middle\' fill=\'white\' font-family=\'sans-serif\' font-weight=\'700\' font-size=\'23\'%3EA%3C/text%3E%3C/svg%3E">')
    .replace('</head>', `<link rel="stylesheet" href="/tianya-research/agi-research.css">${navAssets()}</head>`)
    .replace('<body>', '<body class="agi-research-page"><a class="research-skip" href="#research-content">跳到研究资料</a>')
    .replace('<main class="page">', `<main class="page" id="research-content"><aside class="research-context" aria-label="研究资料版本"><div><span class="research-kicker">AGI 记分牌 · 天涯回声</span><strong>研究资料库</strong><p>资料与模型快照：<time datetime="${snapshot}">${snapshot}</time>。本页保留当时的 60 条资料、算法结果与实践工具；迁入 AGI 不代表重新核验或更新预测。公开索引中的手机号形态账号已匿名化。</p></div><a class="research-workbench" href="/zh/tianya">返回天涯验证工作台 <span aria-hidden="true">→</span></a></aside>`)
    .replace('<a href="/llms.txt" target="_blank" rel="noopener">来源与方法摘要</a>', '<a href="/tianya-research/future.txt" target="_blank" rel="noopener">研究结论文本</a>')
    .replace('<footer>', '<footer class="research-footer">')
    .replace('天涯回声 · 本轮人工核对语料 / 证据门控 v1.1 / 语料 R3', `AGI 记分牌 · 天涯研究资料 / 证据门控 v1.1 / 快照 ${snapshot}`);
  // Structured data describes the frozen snapshot; the move does not freshen its date.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebApplication',
      name: '天涯研究资料库｜AGI 记分牌', url: canonical, inLanguage: 'zh-CN',
      applicationCategory: 'EducationalApplication', operatingSystem: 'Web',
      dateModified: snapshot, isAccessibleForFree: true,
      description: '保留 2026-10-05 研究快照：60 条历史判断、证据门控、语料索引、时序比较与实践核验工具。',
      isPartOf: {'@type': 'WebSite', name: 'AGI Scorecard', url: 'https://agiscorecard.com/'},
      offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
    })}</script>`);
  return html;
}

async function migrate(source) {
  const names = (await readdir(source)).filter(name => !excluded.has(name) && /\.(?:mjs|json|txt|csv|css)$/.test(name)).sort();
  assert.equal(names.length, 54, 'Unexpected source inventory: review additions before making them public');
  const nameSet = new Set(names);
  const manifest = {version: 1, snapshotDate: snapshot, canonical, files: [], privacy: {phoneLikeAuthorRowsAnonymized: 0, privatePracticeRecords: 0}};
  const outputs = [];
  const anonymousAuthors = new Map();
  for (const name of names) {
    const original = await readFile(path.join(source, name));
    let content = original.toString('utf8');
    if (name === 'processed-floors.json') {
      // Public forum handles can themselves be phone numbers. Preserve research fields,
      // but never republish those values or reversible hashes of them in the manifest.
      const data = JSON.parse(content);
      for (const row of data.rows) {
        if (phoneLike.test(row.author || '')) {
          if (!anonymousAuthors.has(row.author)) anonymousAuthors.set(row.author, `匿名账号 ${String(anonymousAuthors.size + 1).padStart(3, '0')}`);
          row.author = anonymousAuthors.get(row.author);
          manifest.privacy.phoneLikeAuthorRowsAnonymized++;
        }
      }
      content = JSON.stringify(data);
    }
    if (name.endsWith('.mjs') || name.endsWith('.css')) content = rewritePaths(content, nameSet);
    privacyCheck(name, content);
    manifest.files.push({name, sourceSha256: sha(original), publishedSha256: sha(content), changed: sha(original) !== sha(content)});
    outputs.push([name, content]);
  }
  const html = renderPage(await readFile(path.join(source, 'index.html'), 'utf8'), nameSet);
  privacyCheck('tianya-research.html', html);
  // Validate everything before writing any source research into the public checkout.
  const experiment = JSON.parse(outputs.find(([name]) => name === 'practice-experiment.json')[1]);
  const investment = JSON.parse(outputs.find(([name]) => name === 'investment-protocol.json')[1]);
  assert.equal(experiment.status, 'not_started');
  assert.equal(experiment.realResults.length, 0);
  assert.equal(experiment.owner, null);
  assert.equal(investment.actualCapitalCommitted, 0);
  assert.equal(investment.positions.length + investment.trades.length, 0);
  await mkdir(destination, {recursive: true});
  for (const [name, content] of outputs) await writeFile(path.join(destination, name), content);
  await writeFile(path.join(destination, 'migration-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(pagePath, html);
}

async function check() {
  const manifest = JSON.parse(await readFile(path.join(destination, 'migration-manifest.json'), 'utf8'));
  assert.equal(manifest.snapshotDate, snapshot);
  assert.equal(manifest.files.length, 54);
  assert.equal(manifest.privacy.phoneLikeAuthorRowsAnonymized, 34);
  const names = new Set(manifest.files.map(file => file.name));
  assert.deepEqual((await readdir(destination)).sort(), [...names, 'agi-research.css', 'migration-manifest.json'].sort(), 'Unexpected files in public research assets');
  const page = await readFile(pagePath, 'utf8');
  assert(page.includes(`rel="canonical" href="${canonical}"`));
  assert(page.includes('id="agi-nav"') && page.includes('href="/zh/tianya"'));
  assert(page.includes(`datetime="${snapshot}"`));
  assert(!page.includes('noindex') && !/hreflang="en"/.test(page));
  assert(!page.includes('tianya-prediction-lab.thomasedisonfault.chatgpt.site'));
  for (const tab of ['future', 'conclusions', 'frontiers', 'dossiers', 'audit', 'history', 'patterns', 'archive', 'processing', 'method']) {
    assert(page.includes(`data-tab="${tab}"`), `Missing original research tab: ${tab}`);
  }
  privacyCheck('tianya-research.html', page);
  for (const file of manifest.files) {
    assert(!excluded.has(file.name));
    const content = await readFile(path.join(destination, file.name), 'utf8');
    assert.equal(sha(content), file.publishedSha256, `Unexpected asset change: ${file.name}`);
    if (!file.name.endsWith('.mjs') && file.name !== 'processed-floors.json') {
      assert.equal(file.publishedSha256, file.sourceSha256, `Frozen research data changed: ${file.name}`);
    }
    privacyCheck(file.name, content);
    for (const match of content.matchAll(/(?:from\s*|import\s*)["']\.\/([^"']+)["']/g)) assert(names.has(match[1]), `${file.name}: missing module ${match[1]}`);
    if (/\.(?:mjs|css)$/.test(file.name)) assert.equal(rewritePaths(content, names), content, `${file.name}: root-relative legacy resource remains`);
  }
  assert.equal(rewritePaths(page, names), page, 'HTML root-relative legacy resource remains');
  for (const match of page.matchAll(/(?:href|src)="(\/tianya-research\/[^"?#]+)(?:[^"\s]*)?"/g)) {
    await readFile(path.join(siteRoot, match[1]));
  }
  const {records, snapshotDate} = await import(pathToFileURL(path.join(destination, 'data.mjs')));
  const {summarize} = await import(pathToFileURL(path.join(destination, 'engine.mjs')));
  assert.equal(snapshotDate, snapshot);
  assert.equal(records.length, 60);
  assert.equal(summarize(records).u, 60);
  const ledger = JSON.parse(await readFile(path.join(destination, 'practice-ledger.json'), 'utf8'));
  assert.equal(ledger.frozenAt, '2026-10-05T15:50:39Z');
  assert.equal(ledger.entries.length, 20);
  assert(ledger.entries.every(entry => entry.actual === null && entry.score === null));
  for (const [file, count] of [['processed-floors.json', 14110], ['processed-pdf-pages.json', 348]]) {
    assert.equal(JSON.parse(await readFile(path.join(destination, file), 'utf8')).rows.length, count);
  }
  console.log(`Research migration checked: 54 assets; 60 unknown records; snapshot ${snapshot}; 20 unscored forecasts; ${manifest.privacy.phoneLikeAuthorRowsAnonymized} phone-like author rows anonymized.`);
}

const args = process.argv.slice(2);
if (args.includes('--check')) await check();
else {
  const index = args.indexOf('--source');
  if (index >= 0) assert(args[index + 1], '--source requires a directory');
  await migrate(index >= 0 ? path.resolve(args[index + 1]) : '/workspace/tianya-lab/dist');
  await check();
}
