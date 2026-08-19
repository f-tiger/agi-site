#!/usr/bin/env node
// sitemap.xml → IndexNow 批量提交（Bing / Yandex / Naver 等共享该协议）。
//
// 为什么需要它:密钥文件 16507d8e1997c4be371f5fbaf7ac1985.txt 早就躺在站点根目录,
// 但站上从来没有任何东西去 ping IndexNow —— 2026-08-16 从 Bing Site Explorer 看出来:
// sitemap 191 条、Bing 只索引了 122 条。被引用的前提是先被索引,而新发布的多语言页
// 恰恰是搜索引擎最不着急抓的那一类。
//
// 会话沙箱的出网代理挡住 IndexNow(已实测),所以这件事只能在 runner 上做。
const KEY = '16507d8e1997c4be371f5fbaf7ac1985';
const HOST = 'agiscorecard.com';

const xml = await (await fetch(`https://${HOST}/sitemap.xml`, { signal: AbortSignal.timeout(20000) })).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) { console.log('❌ sitemap 里没有 URL,不提交'); process.exit(1); }

// IndexNow 单次上限 10000,这里远低于;仍分批,便于逐批看结果。
const BATCH = 500;
let ok = 0;
for (let i = 0; i < urls.length; i += BATCH) {
  const list = urls.slice(i, i + BATCH);
  const r = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: list }),
    signal: AbortSignal.timeout(25000),
  });
  // 200/202 都算受理;IndexNow 不返回逐条结果,只回状态码。
  console.log(`${r.ok ? '✅' : '❌'} 第 ${i / BATCH + 1} 批 ${list.length} 条 → HTTP ${r.status}`);
  if (r.ok) ok += list.length;
}
console.log(`\n共 ${urls.length} 条,受理 ${ok} 条`);
process.exit(ok ? 0 : 1);
