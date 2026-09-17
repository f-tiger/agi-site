#!/usr/bin/env node
// /api/reach 国家面的隐私形状单测（2026-09-17）。零网络、零 D1。
//
// 为什么存在
// ----------
// `functions/api/reach.js` 的文件头原本明确写着「不出国家分布」。2026-09-17 有意推翻了
// 那句话，理由是这个端点存在的全部目的是「会话没 MCP 也看得见流量」，而当天
// 「中国流量是不是更大」这个问题**只能靠手接 MCP 查 D1 才答得出来**——四周里中国从 0
// 涨到最近 14 天 60 次带来源真人（同窗美国 63），reach.json 里一个字都没有。
//
// 但原来那句顾虑是对的，所以只开到安全的最小粒度，并且由这个文件守住：
//   ① 只出**站点级**计数，永不与 path / ref / 事件交叉（交叉才是重识别风险）;
//   ② **k 匿名下限 K_COUNTRY**，不足 k 次的国家并进 `other`，不单独出现。
//
// ②是真正会被无声破坏的那条：把 k 调成 1、或者写成 `> k` 而不是 `>= k`，
// 页面看上去一模一样，而一个 28 天里只来过一次的国家就单独挂在公开端点上了。
// 所以下面对边界值逐个断言，而不是「跑通了就算」。
//
// 运行：node scripts/test-reach-shape.mjs
import { foldSmallCountries, K_COUNTRY } from '../functions/api/reach.js';

let bad = 0;
const ck = (cond, msg) => { if (!cond) { console.error(`❌ ${msg}`); bad++; } };
const get = (rows, cc) => (rows.find((r) => r.country === cc) || {}).n;

// 取自 2026-09-17 的真实 28 天分布（US 162 / CN 92 / JP 12 / DE 7 / …长尾）。
const REAL = [
  { country: 'US', n: 162 }, { country: 'CN', n: 92 }, { country: 'JP', n: 12 },
  { country: 'DE', n: 7 }, { country: 'CA', n: 7 }, { country: 'FR', n: 6 },
  { country: 'GB', n: 5 }, { country: 'ES', n: 4 }, { country: 'SG', n: 3 },
  { country: 'IN', n: 3 }, { country: 'HK', n: 3 }, { country: 'TW', n: 1 },
  { country: 'BR', n: 1 }, { country: 'MX', n: 1 }, { country: 'PL', n: 1 },
];
const out = foldSmallCountries(REAL);

// ── ①下限必须真的生效 ──────────────────────────────────────────────
ck(K_COUNTRY >= 5, `k 匿名下限不得低于 5（实为 ${K_COUNTRY}）`);
ck(out.every((r) => r.country === 'other' || r.n >= K_COUNTRY),
   `除 other 外不得出现任何 < ${K_COUNTRY} 的国家：${JSON.stringify(out)}`);
ck(get(out, 'TW') === undefined && get(out, 'SG') === undefined,
   '长尾国家（1–3 次）绝不能单独出现——那正是可指认到个人的那一格');
ck(get(out, 'GB') === 5, `恰好等于下限的国家应保留（>= 而不是 >），实得 ${get(out, 'GB')}`);
ck(get(out, 'ES') === undefined, '恰好低于下限一位的国家必须并入 other');

// ── ②合计不能丢，也不能重复计 ───────────────────────────────────────
const sumIn = REAL.reduce((a, r) => a + r.n, 0);
const sumOut = out.reduce((a, r) => a + r.n, 0);
ck(sumIn === sumOut, `折叠前后总数必须相等：${sumIn} vs ${sumOut}`);
ck(get(out, 'other') === REAL.filter((r) => r.n < K_COUNTRY).reduce((a, r) => a + r.n, 0),
   'other 必须正好等于被折叠掉的那部分之和');

// ── ③顺序与形状 ─────────────────────────────────────────────────────
ck(out[0].country === 'US' && out[1].country === 'CN', '按计数降序');
ck(out[out.length - 1].country === 'other', 'other 恒定排最后（它不是一个国家）');
ck(out.every((r) => Object.keys(r).length === 2 && 'country' in r && 'n' in r),
   '每行只有 country 与 n —— 多一个字段就是多一个维度，交叉才是重识别风险');

// ── ④脏输入不能把隐私门冲开 ─────────────────────────────────────────
const dirty = foldSmallCountries([
  { country: '', n: 40 },            // Cloudflare 认不出国家时的空串
  { country: 'de', n: 9 },           // 小写
  { country: ' cn ', n: 11 },        // 带空格
  { country: 'XYZ', n: 30 },         // 不是两位国家码
  { country: 'JP', n: 0 },           // 计数为 0
  null, undefined,                    // 行本身是空的
]);
ck(get(dirty, 'DE') === 9 && get(dirty, 'CN') === 11, '大小写与空格应被归一化');
ck(get(dirty, 'XYZ') === undefined, '非两位国家码不得单独出现');
ck(get(dirty, 'other') === 70, `空国家码与非法码应并入 other（40+30），实得 ${get(dirty, 'other')}`);
ck(get(dirty, 'JP') === undefined, '计数为 0 的行不出现');
ck(foldSmallCountries([]).length === 0 && foldSmallCountries(null).length === 0,
   '空输入返回空数组，不抛错（端点整体不能因为这一格陪葬）');

if (bad) { console.error(`\ntest-reach-shape: ${bad} 项失败`); process.exit(1); }
console.log(`✅ test-reach-shape 通过（k=${K_COUNTRY} 下限双向 / 合计守恒 / 只有两个字段 / 脏输入不破门）`);
