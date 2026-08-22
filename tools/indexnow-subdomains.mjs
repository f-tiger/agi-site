#!/usr/bin/env node
// 新子域 sitemap → IndexNow(play. / source.)。与 sites/agiscorecard/tools/indexnow.mjs
// 同协议;每个 host 必须自己服务密钥文件(两站 site/ 目录已放同名 key.txt)。
// 只在 runner 上跑(会话沙箱出网被挡);只挂 schedule(舰队 CI 纪律第 3 条)。
const KEY = '16507d8e1997c4be371f5fbaf7ac1985';
const HOSTS = ['play.agiscorecard.com', 'source.agiscorecard.com'];

let failures = 0;
for (const HOST of HOSTS) {
  try {
    const xml = await (await fetch(`https://${HOST}/sitemap.xml`, { signal: AbortSignal.timeout(20000) })).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (!urls.length) { console.log(`❌ ${HOST}: sitemap 空,跳过`); failures++; continue; }
    const r = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(25000),
    });
    console.log(`${r.ok ? '✅' : '❌'} ${HOST}: ${urls.length} 条 → HTTP ${r.status}`);
    if (!r.ok) failures++;
  } catch (e) {
    console.log(`❌ ${HOST}: ${e.message}`);
    failures++;
  }
}
process.exit(failures === HOSTS.length ? 1 : 0);
