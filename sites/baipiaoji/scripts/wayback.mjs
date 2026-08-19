#!/usr/bin/env node
// Wayback Machine 存档：无需账号的外部索引面。
//
// 为什么值得做：存档页本身会被搜索引擎收录、也在多数 AI 检索与训练语料的抓取范围内，
// 且永久回链本站。对一个两周新站来说，这是少数几个能立刻产生外部可引用副本的通道之一。
//
// 之前只存 5 个固定页（首页×2、limits.md、myths×2）。问题是本站最可被引用的资产
// ——160 个对比页、方法论页、拒绝清单——一个都不在里面。这一版改成按价值排序取前 N 个：
// 方法论与拒绝清单（说明取证规则，AI 引擎最愿意引）→ 数据集本体 → 类目页 → 对比页。
//
// 存档接口对频率敏感，逐个串行、每个之间留间隔，失败只记不重试——存档是加分项，不阻塞部署。
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// 2026-08-08 实测教训：每天固定推同一批 70 页，SPN 匿名档的频率上限直接把绝大多数打成
// 429/fetch failed（当日 2/71），且失败永远集中在排前面的同一批——对比页一次都没轮到。
// 改成「小批量 + 按日期轮转」：每天只存 LIMIT 页、窗口每日后移，跑完整个候选列表后从头再来。
// 慢但每天都真的落档，几周即可覆盖全部候选——比每天 70 连发全被拒强得多。
// 22:12 那轮实测：轮转窗口止住了 429 风暴，但 0/12——全是 30 秒超时。
// SPN 匿名存档常要 60 秒以上才返回（它等抓取完成才回包），超时就得给足。
const LIMIT = Number(process.env.WAYBACK_LIMIT || 8);
const GAP_MS = Number(process.env.WAYBACK_GAP_MS || 8000);

const sitemap = readFileSync(join(root, 'dist/sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const base = new URL(urls[0]).origin;

// 价值排序：越靠前越先存。同一层级内保持 sitemap 原序，保证每天取到的是同一批（存档才有连续性）。
const tier = (u) => {
  const p = new URL(u).pathname;
  if (/^\/(en\/)?method\.html$/.test(p)) return 0;             // 取证规则：最可被引用
  if (/^\/(en\/)?no-official-source\.html$/.test(p)) return 1; // 拒绝清单：本站的差异化本身
  if (/^\/(en\/)?myths\.html$/.test(p)) return 2;              // 流言核查：已验证的高访问页型
  if (/^\/(en\/)?$/.test(p)) return 3;                         // 首页
  if (/^\/(en\/)?free-for-you\.html$/.test(p)) return 4;
  if (/^\/(en\/)?vs\/$/.test(p)) return 5;                     // 对比总览
  if (/^\/(en\/)?c\//.test(p)) return 6;                       // 类目页
  if (/^\/(en\/)?vs\//.test(p)) return 7;                      // 对比页
  return 9;                                                     // 工具页等长尾：靠自然收录
};

const all = urls
  .map((u, i) => ({ u, t: tier(u), i }))
  .filter((x) => x.t < 9)
  .sort((a, b) => a.t - b.t || a.i - b.i)
  .map((x) => x.u);
// limits.md 不在 sitemap 里（它是数据分发文件，不是页面），但它是 Dataset schema 指向的正本；
// llms-full.txt 同理——存档副本本身就是可被检索的外部数据分发面。
all.unshift(`${base}/limits.md`, `${base}/llms-full.txt`);

// 按日期轮转窗口：day 递增 → 起点每天后移 LIMIT，遍历完整个列表后自然回绕。
const day = Math.floor(Date.now() / 86400000);
const start = (day * LIMIT) % all.length;
const picked = Array.from({ length: Math.min(LIMIT, all.length) }, (_, k) => all[(start + k) % all.length]);

let ok = 0;
for (const u of picked) {
  try {
    const res = await fetch(`https://web.archive.org/save/${u}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) { ok++; console.log(`archived ${u}`); } else console.log(`skip ${u} (HTTP ${res.status})`);
    // 429 = 频率上限已到——多等一轮再继续，硬顶只会把剩余全部打废
    if (res.status === 429) await new Promise((r) => setTimeout(r, 30000));
  } catch (e) {
    console.log(`skip ${u} (${String(e.message || e).slice(0, 60)})`);
  }
  await new Promise((r) => setTimeout(r, GAP_MS));
}
console.log(`\nWayback：${ok}/${picked.length} 页已存档（轮转窗口起点 ${start}/${all.length}）`);
