#!/usr/bin/env node
// hits 表读写契约的零网络测试（2026-09-26，D1 免费额度事故之后）。背景见 lib/hits-schema.js。
//
// 在内存 SQLite 里造一张与线上同形的 hits（真人、事件、API、旧爬虫行、CI 行、窗口内外的日期），然后断言：
//   1. migrations/0002 原样可执行：爬虫行按 天×爬虫×路径×国家 汇总进 bot_daily、计数守恒、hits 里不再有 ev='bot'、
//      重跑不重复累加；
//   2. /api/reach 发出的每一条 hits 查询都走 hits_referred 或 hits_events，没有一条整表扫描——查询是从
//      computeReach 实际发出的 SQL 里截下来的，测的就是线上会跑的那几条；
//   3. 迁移前（旧表、无索引、爬虫行还在）与迁移后，/api/reach 的全部 hits 统计逐字相同；
//   4. 中间件对爬虫只写 bot_daily（表不存在时自己建），普通浏览器与 __probe 自测不写；
//   5. functions/ 与 lib/ 里再没有任何代码往 hits 写 ev='bot'。
// 运行：node scripts/test-hits-schema.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { HUMAN, HUMAN_REFERRED, EVENT_ROWS, HITS_INDEXES, BOT_DAILY_TABLE, recordBot } from '../lib/hits-schema.js';
import { computeReach } from '../functions/api/reach.js';
import { onRequest as middleware } from '../functions/_middleware.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = fs.readFileSync(path.join(root, 'migrations/0002_hits_indexes_bot_daily.sql'), 'utf8');
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

// D1 绑定的最小替身：prepare/bind/run/all/first，与 Workers 里一样到执行时才报错。
function d1(sql, log) {
  return {
    prepare(q) {
      let args = [];
      const st = {
        bind(...v) { args = v; return st; },
        async run() { log && log.push([q, args]); return sql.prepare(q).run(...args); },
        async all() { log && log.push([q, args]); return { results: sql.prepare(q).all(...args) }; },
        async first() { log && log.push([q, args]); return sql.prepare(q).get(...args) ?? null; },
      };
      return st;
    },
  };
}

const day = (back) => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE hits (d TEXT, path TEXT, lang TEXT, country TEXT, ref TEXT, ev TEXT)');
  const add = sql.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)');
  const refs = ['www.google.com', 'cn.bing.com', 'chatgpt.com', 'perplexity.ai', 'duckduckgo.com', 'm.baidu.com', ''];
  const countries = ['US', 'CN', 'DE', 'SG', ''];
  const events = ['go', 'calc', 'star', 'sub_view', 'home', 'video', 'gs', 'earn_open', 'ad_live'];
  let k = 0;
  for (const back of [0, 1, 3, 6, 8, 20, 27, 29, 40, 95]) {
    for (let i = 0; i < 40; i++, k++) {
      const p = ['/tools/grok', '/en/tools/grok', '/c/coding', '/en/c/api', '/', '/en/', '/is-kiro-still-free'][k % 7];
      add.run(day(back), p, k % 3 ? 'zh' : 'en', countries[k % 5], refs[k % 7], '');           // 真人（带或不带来源）
      if (k % 9 === 0) add.run(day(back), p, 'zh', 'US', 'www.baipiaoji.com', '');             // 本站来源,不算
      if (k % 11 === 0) add.run(day(back), '/__ci/beacon', 'ci', 'US', 'www.google.com', '');  // CI 路径,不算
      if (k % 4 === 0) add.run(day(back), `/${events[k % events.length]}/x`, k % 13 ? 'zh' : 'ci', 'US', '', events[k % events.length]);
      if (k % 5 === 0) add.run(day(back), '/biz/trigger/' + ['vendor-view', 'ad-view', 'ad-wallet'][k % 3], 'zh', 'CN', '', 'biz');
      if (k % 3 === 0) add.run(day(back), '/api/mcp', 'api', 'US', 'curl/8.5.0', 'api');
      add.run(day(back), p, 'zh', countries[k % 5], ['GPTBot', 'Bingbot', 'Baiduspider'][k % 3], 'bot');
      if (k % 2 === 0) add.run(day(back), p, 'zh', countries[k % 5], ['GPTBot', 'Bingbot', 'Baiduspider'][k % 3], 'bot'); // 同键第二次
      if (k % 17 === 0) add.run(day(back), '/.env', 'zh', 'NL', 'GPTBot', 'bot_spoofed');
    }
  }
  return sql;
}

// ── 1. 谓词：真人线 A 的文字没变；部分索引的条件就是谓词的前三项 ──
ok(HUMAN === "ev = '' AND ref IS NOT NULL AND ref != '' AND ref NOT LIKE '%baipiaoji%' AND path NOT LIKE '/\\_\\_%' ESCAPE '\\'",
  '真人线 A 的谓词与改动前逐字相同（口径不许悄悄变）');
ok(HUMAN.startsWith(HUMAN_REFERRED) && HITS_INDEXES[0].endsWith(`WHERE ${HUMAN_REFERRED}`), 'hits_referred 的 WHERE 与 HUMAN 前三项逐字相同');
ok(HITS_INDEXES[1].endsWith(`WHERE ${EVENT_ROWS}`), 'hits_events 的 WHERE 就是 EVENT_ROWS');
ok(MIGRATION.includes(HITS_INDEXES[0].replace('CREATE INDEX IF NOT EXISTS', '').trim())
  && MIGRATION.includes(HITS_INDEXES[1].replace('CREATE INDEX IF NOT EXISTS', '').trim()), '迁移文件里的索引与代码里的定义一致');
ok(MIGRATION.replace(/\s+/g, ' ').includes(BOT_DAILY_TABLE.replace('CREATE TABLE IF NOT EXISTS', '').replace(/\s+/g, ' ').trim()),
  '迁移文件里的 bot_daily 与代码里的建表语句一致');

// ── 2. 迁移前后 /api/reach 的 hits 统计逐字相同 ──
const pick = (r) => ({ humans_referred: r.humans_referred, paths: r.paths, referrers: r.referrers, ai_referrals: r.ai_referrals,
  events: r.events, countries: r.countries, commercial_triggers: r.commercial_triggers });
async function reachOf(sql, days, log) {
  const res = await computeReach({ HITS: d1(sql, log) }, days);
  assert.equal(res.status, 200);
  return (await res.json());
}
const before = fixture();
const botBefore = before.prepare("SELECT COUNT(*) c FROM hits WHERE ev='bot'").get().c;
const groupsBefore = before.prepare("SELECT COUNT(*) c FROM (SELECT 1 FROM hits WHERE ev='bot' GROUP BY d, ref, path, country)").get().c;
const r7a = pick(await reachOf(before, 7)), r28a = pick(await reachOf(before, 28)), r90a = pick(await reachOf(before, 90));
ok(r28a.humans_referred > 0 && Object.keys(r28a.events).length > 3 && r28a.commercial_triggers.ok, '夹具产生了真人、事件与商业触发读数');

const after = fixture();
// 部署先于迁移：新代码上线后、迁移执行前，当天的爬虫抓取已经写进 bot_daily。迁移必须累加，不能覆盖。
const early = after.prepare("SELECT d, ref, path, country FROM hits WHERE ev='bot' LIMIT 1").get();
after.exec(BOT_DAILY_TABLE);
after.prepare('INSERT INTO bot_daily (d, bot, path, country, n) VALUES (?,?,?,?,3)').run(early.d, early.ref, early.path, early.country);
after.exec(MIGRATION);
const botAfter = after.prepare('SELECT COALESCE(SUM(n),0) s, COUNT(*) c FROM bot_daily').get();
ok(after.prepare("SELECT COUNT(*) c FROM hits WHERE ev='bot'").get().c === 0, '迁移后 hits 里没有 ev=bot 的行');
ok(botAfter.s === botBefore + 3, `爬虫计数守恒（含迁移前新代码已记的 3 次）：${botAfter.s} == ${botBefore} + 3`);
ok(botAfter.c === groupsBefore, `按 天×爬虫×路径×国家 汇总：${botAfter.c} 组`);
ok(after.prepare("SELECT COUNT(*) c FROM hits WHERE ev='bot_spoofed'").get().c > 0, '旧的 bot_spoofed 行原样留在 hits（迁移只搬 ev=bot）');
after.exec(MIGRATION);
ok(after.prepare('SELECT SUM(n) s FROM bot_daily').get().s === botBefore + 3, '迁移文件重跑一次不会重复累加');
const idx = after.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='hits'").all().map((r) => r.name).sort();
ok(JSON.stringify(idx) === JSON.stringify(['hits_events', 'hits_referred']), `hits 上的索引：${idx}`);

const log = [];
const r7b = pick(await reachOf(after, 7, log)), r28b = pick(await reachOf(after, 28, log)), r90b = pick(await reachOf(after, 90, log));
assert.deepEqual(r7b, r7a); assert.deepEqual(r28b, r28a); assert.deepEqual(r90b, r90a); n += 3;

// ── 3. /api/reach 实际发出的每条 hits 查询都走部分索引 ──
const hitsQueries = log.filter(([q]) => /\bFROM hits\b/.test(q));
ok(hitsQueries.length >= 7 * 3, `截到 ${hitsQueries.length} 条 hits 查询`);
for (const [q, args] of hitsQueries) {
  const plan = after.prepare('EXPLAIN QUERY PLAN ' + q).all(...args).map((r) => r.detail).join(' | ');
  ok(!/\bSCAN hits\b/.test(plan) && /USING (COVERING )?INDEX hits_(referred|events)\b/.test(plan),
    `整表扫描：${q.slice(0, 90)}… → ${plan}`);
}

// ── 4. 中间件：爬虫只写 bot_daily，表不存在时自建；浏览器与 __probe 不写 ──
{
  const sql = new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE hits (d TEXT, path TEXT, lang TEXT, country TEXT, ref TEXT, ev TEXT)');
  const env = { HITS: d1(sql) };
  const hit = async (url, ua) => {
    const waits = [];
    const request = new Request(url, { headers: { 'user-agent': ua } });
    Object.defineProperty(request, 'cf', { value: { country: 'US' } });
    await middleware({ request, env, next: async () => new Response('ok', { status: 200 }), waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
  };
  const GPT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)';
  await hit('https://baipiaoji.com/tools/grok', GPT);
  await hit('https://baipiaoji.com/tools/grok', GPT);
  await hit('https://baipiaoji.com/en/c/coding', GPT);
  await hit('https://baipiaoji.com/tools/grok?__probe=1', GPT);
  await hit('https://baipiaoji.com/tools/grok', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36');
  const rows = sql.prepare('SELECT d, bot, path, country, n FROM bot_daily ORDER BY path').all();
  ok(rows.length === 2 && rows.find((r) => r.path === '/tools/grok').n === 2 && rows.every((r) => r.country === 'US' && r.bot),
    `中间件按键累加：${JSON.stringify(rows)}`);
  ok(sql.prepare('SELECT COUNT(*) c FROM hits').get().c === 0, '中间件不再往 hits 写任何行');
  await recordBot(env.HITS, { d: day(0), bot: 'x'.repeat(99), path: '/p'.repeat(200), country: 'USA' });
  const long = sql.prepare("SELECT length(bot) b, length(path) p, country c FROM bot_daily WHERE bot LIKE 'xx%'").get();
  ok(long.b === 60 && long.p === 200 && long.c === 'US', 'recordBot 截断超长字段');
}

// ── 5. 源码里再没有往 hits 写 ev='bot' 的地方 ──
const files = [];
for (const dir of ['functions', 'lib']) {
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (/\.m?js$/.test(e.name)) files.push(p);
    }
  })(path.join(root, dir));
}
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/INSERT INTO hits[\s\S]{0,400}?\.run\(/g)) ok(!/'bot'/.test(m[0]), `${path.relative(root, f)} 仍往 hits 写 ev='bot'`);
}

console.log(`✅ test-hits-schema: ${n} checks — migration conserves crawler counts, /api/reach reads only the two partial indexes and returns identical numbers, crawlers go to bot_daily only`);
