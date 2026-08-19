#!/usr/bin/env node
// YouTube 选题采集：只找选题，不写正文。
//
// 为什么要这么设计——见 docs/competitor-research-money.md 第四节：
// 「AI 赚钱」这个品类最泛滥的做法就是把没核实的东西自动转述出去。本站唯一的护城河是
// 「每条都核实过」，所以这个脚本的输出只有一份**候选清单**，作业正文永远由人写。
// 它不会改动 data/hustles.json，也不会碰任何已发布内容。
//
// 用法：
//   YOUTUBE_API_KEY=xxx node scripts/yt-ingest.mjs
//   YOUTUBE_API_KEY=xxx node scripts/yt-ingest.mjs "AI 副业" "AI 接单"
//
// 没配 YOUTUBE_API_KEY 时直接跳过并说明原因，不让流水线失败。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data/yt-candidates.json');
const KEY = process.env.YOUTUBE_API_KEY;

// 默认检索词：对准「普通人怎么用 AI 挣到第一笔钱」，不是「AI 新闻」
const DEFAULT_QUERIES = ['AI 副业', 'AI 接单', 'AI 赚钱 普通人', 'AI 变现 实操', 'AI side hustle beginner'];
const DAYS = 90;          // 只看近三个月，这个赛道的玩法过期极快
const PER_QUERY = 25;
const MIN_VIEWS = 5000;   // 低于这个量级的视频谈不上被验证过

if (!KEY) {
  console.log(`⏭  未配置 YOUTUBE_API_KEY，跳过 YouTube 选题采集。

配置方法：Google Cloud Console → 启用 YouTube Data API v3 → 创建 API 密钥，
然后加到仓库 Secret（名字 YOUTUBE_API_KEY）或本地环境变量里。

注意：配好之后本脚本也只产出**选题候选**（data/yt-candidates.json），
作业正文仍然由人写、由人核实。理由见 docs/competitor-research-money.md。`);
  process.exit(0);
}

const api = async (path, params) => {
  const u = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) u.searchParams.set(k, v);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

const publishedAfter = new Date(Date.now() - DAYS * 864e5).toISOString();
const queries = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_QUERIES;

const seen = new Map();
for (const q of queries) {
  let search;
  try {
    search = await api('search', {
      part: 'snippet', q, type: 'video', order: 'viewCount',
      maxResults: PER_QUERY, publishedAfter, relevanceLanguage: 'zh-Hans',
    });
  } catch (err) {
    console.warn(`⚠ 检索「${q}」失败，跳过：${err.message}`);
    continue;
  }
  const ids = (search.items || []).map((i) => i.id.videoId).filter(Boolean);
  if (!ids.length) continue;

  const detail = await api('videos', { part: 'snippet,statistics', id: ids.join(',') });
  for (const v of detail.items || []) {
    const views = Number(v.statistics?.viewCount || 0);
    if (views < MIN_VIEWS) continue;
    const ageDays = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt)) / 864e5);
    const prev = seen.get(v.id);
    const row = {
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      published: v.snippet.publishedAt.slice(0, 10),
      views,
      likes: Number(v.statistics?.likeCount || 0),
      // 日均播放而不是总播放：新视频不会被老视频的存量埋掉
      views_per_day: Math.round(views / ageDays),
      url: `https://www.youtube.com/watch?v=${v.id}`,
      queries: [...new Set([...(prev?.queries || []), q])],
    };
    seen.set(v.id, row);
  }
}

const rows = [...seen.values()].sort((a, b) => b.views_per_day - a.views_per_day).slice(0, 60);

// 已经写过的作业不再重复提示
const hustles = JSON.parse(readFileSync(join(root, 'data/hustles.json'), 'utf8'));
const covered = hustles.flatMap((h) => h.keywords || []);
const isCovered = (t) => covered.some((k) => t.includes(k));

const out = {
  generated_at: new Date().toISOString().slice(0, 10),
  window_days: DAYS,
  queries,
  note: '这是选题候选，不是内容。每条都需要人工看完视频、核实说法、只保留能用站内免费工具跑通的路子，才可以写成作业。',
  candidates: rows.map((r) => ({ ...r, maybe_covered: isCovered(r.title) })),
};

const prevRaw = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

const fresh = out.candidates.filter((c) => !c.maybe_covered);
console.log(`✅ YouTube 选题采集完成：${rows.length} 条候选（其中 ${fresh.length} 条看起来还没被现有作业覆盖）→ data/yt-candidates.json`);
console.log(prevRaw === JSON.stringify(out, null, 2) + '\n' ? '   （与上次结果一致）' : '   （已更新）');
for (const c of fresh.slice(0, 10)) console.log(`   · ${c.views_per_day}/天  ${c.title}  — ${c.channel}`);
console.log('\n下一步是人工的：看完视频 → 核实说法 → 只保留 0 元能跑通的 → 写进 data/hustles.json（必须带失败原因与骗局提醒）。');
