#!/usr/bin/env node
// 触发器数据面(2026-08-20,owner:「欧洲的 Google Trends…应该成为站点的触发器,
// 否则站点没有任何触发进化的支点」)。
//
// 会话沙箱够不到 trends.google.com(出网代理拦),GitHub runner 够得到——
// 与 EDGAR/glama/IndexNow 同一个「替身执行器」模式。每日一次,公开仓分钟免费。
//
// 输出 data/trends-de.json:德国当日热搜全量 top 25 + 命中本站 niche 词表的子集。
// 它是每日 v4 循环的输入(触发器),不是发布物——robots 不收录 data/。
// 诚实规则:抓不到就写 ok:false + 原因,绝不复用旧数据冒充今天的。
const NICHE = [
  // 家居气候/能源核心
  'heiz', 'strom', 'energie', 'gas', 'klima', 'wärmepumpe', 'waermepumpe',
  'balkonkraftwerk', 'solar', 'photovoltaik', 'infrarot',
  // 天气事件(触发设备需求)
  'wetter', 'hitze', 'kälte', 'kaelte', 'frost', 'schnee', 'sturm', 'unwetter',
  'hochwasser', 'flut', 'gewitter', 'dürre', 'duerre',
  // 症状与设备
  'schimmel', 'feucht', 'entfeuchter', 'ventilator', 'lüft', 'lueft',
  // 价格/政策/宏观传导(金融与地缘只认能源价格这条传导链)
  'strompreis', 'gaspreis', 'energiekrise', 'nebenkosten', 'blackout', 'stromausfall',
  'strompreisbremse', 'heizungsgesetz', 'ölpreis', 'oelpreis',
];

const url = 'https://trends.google.com/trending/rss?geo=DE';
const out = 'data/trends-de.json';
const { writeFileSync } = await import('node:fs');
const today = new Date().toISOString().slice(0, 10);

let payload;
try {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; getecoback-trend-probe; +https://getecoback.com)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const g = (tag) => (m[1].match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [])[1]?.trim() || '';
    const cd = (s) => s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
    return { title: cd(g('title')), traffic: cd(g('ht:approx_traffic')) };
  }).filter((i) => i.title);
  if (!items.length) throw new Error('RSS parsed but zero items — format may have changed');
  const matched = items.filter((i) => {
    const t = i.title.toLowerCase();
    return NICHE.some((k) => t.includes(k));
  });
  payload = { ok: true, fetched: today, source: url, matched, top: items.slice(0, 25) };
  console.log(`✅ ${items.length} 条德国热搜,niche 命中 ${matched.length} 条` +
    (matched.length ? `:${matched.map((m) => m.title).join(' | ')}` : ''));
} catch (e) {
  payload = { ok: false, fetched: today, source: url, reason: String(e.message || e).slice(0, 120) };
  console.log(`❌ 抓取失败:${payload.reason}(写入 ok:false,不复用旧数据)`);
}
writeFileSync(out, JSON.stringify(payload, null, 1) + '\n');
