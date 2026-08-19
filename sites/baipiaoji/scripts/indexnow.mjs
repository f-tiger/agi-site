#!/usr/bin/env node
// IndexNow：部署后把**变更过的** URL 主动推给支持该协议的搜索引擎（Bing/Copilot、Yandex、Naver 等）。
// 这是目前唯一**不需要注册任何账号**就能做的主动分发——密钥文件放在域名下即完成所有权验证，
// 也是本站唯一「小时级」而非「周级」的收录通道（Bing 同时是 Copilot 的检索底座）。
// 谷歌和百度不支持 IndexNow，它们仍然要走 Search Console / 站长平台的人工提交（见 docs/seo-backlinks.md）。
//
// 只提交变更页，是这一版的关键改动：协议的本意就是「告诉我们哪些变了」，
// 每天把全站 762 条原样重推，等于每天说一遍「全都变了」——会被降权甚至忽略。
// 用内容哈希清单比对，只推真正变过的；清单缺失（首次运行）时才整站提交。
//
// 在 CI（网络放开）里于部署之后运行；本地代理会拦 403，失败不阻塞任何流程。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const key = readFileSync(join(root, 'data/indexnow-key.txt'), 'utf8').trim();
const sitemap = readFileSync(join(root, 'dist/sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const host = new URL(urls[0]).hostname;

// 变更判定复用 build.mjs 写出的 data/page-lastmod.json——同一份事实只算一次，
// 也保证「sitemap 里的 lastmod」与「推给 IndexNow 的那批」永远是同一批，不会互相打架。
// 该清单已排除日期戳：只有实质内容变化才会把 d 更新为今天。
// 取「近两天」而非只取今天：构建与本脚本可能跨越午夜，页面变更清单如今用真实时钟盖章
// （build.mjs 的 NOW_D），但严格等于今天仍会在跨日边界漏掉昨晚的变更。重复提交无害，漏提交有害。
const dayMs = 86400000;
const recent = [Date.now(), Date.now() - dayMs].map((t) => new Date(t).toISOString().slice(0, 10));
const lmPath = join(root, 'data/page-lastmod.json');
if (!existsSync(lmPath)) {
  console.log('⚠ 缺少 data/page-lastmod.json（先跑 scripts/build.mjs）——本次跳过提交');
  process.exit(0);
}
const lm = JSON.parse(readFileSync(lmPath, 'utf8'));
// 回填模式（2026-08-16 加，需显式 --all）。起因：Bing Site Explorer 显示它只知道
// 本站 1474 个 URL 里的 160 个——发现面缺口比收录率更致命，因为没被发现的页
// 连被排除的资格都没有，而 Copilot 的引用只能从索引里出。
// 日常仍只推「近两天有实质变更」的（协议本意如此，也守住 CLAUDE.md 关于
// 外部副作用不得滥用的规矩）；--all 是一次性补发现的手动开关，不挂在每日流水线上。
const ALL = process.argv.includes('--all');
const changed = ALL ? urls : urls.filter((u) => recent.includes(lm[u]?.d));
if (ALL) console.log(`↻ 回填模式：本次提交全部 ${urls.length} 个 URL（仅用于补发现，不应常态化）`);
const skipped = urls.length - changed.length;

if (!changed.length) {
  console.log(`ℹ IndexNow：${urls.length} 个 URL 实质内容均未变化，本次不提交（协议只接受变更通知）`);
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: changed }),
}).catch((e) => ({ ok: false, status: 0, statusText: String(e?.cause?.code || e) }));

// 200 = 收到；202 = 收到、密钥待验证。都算成功。
const ok = res.status === 200 || res.status === 202;
console.log(ok
  ? `✅ IndexNow：已提交 ${changed.length} 个变更 URL（跳过未变化 ${skipped} 个，HTTP ${res.status}）`
  : `⚠ IndexNow 提交未成功（HTTP ${res.status} ${res.statusText || ''}）——不阻塞部署，下次运行会再试`);

