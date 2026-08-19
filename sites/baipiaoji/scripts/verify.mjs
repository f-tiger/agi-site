#!/usr/bin/env node
// 每日自动巡检：检查每个工具官网是否可达，可达则刷新 last_verified 日期，
// 不可达的记入 data/health.json 供人工（或后续 AI 任务）复核。永不阻塞构建。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const toolsPath = join(root, 'data/tools.json');
const tools = JSON.parse(readFileSync(toolsPath, 'utf8'));
const today = process.env.VERIFY_DATE || new Date().toISOString().slice(0, 10);

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIYangmaoBot/1.0; +link-health-check)' },
    });
    return { ok: res.status < 500, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: String(err?.cause?.code || err?.name || err) };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const tool of tools) {
  const r = await check(tool.url);
  results.push({ slug: tool.slug, url: tool.url, ...r, checked_at: today });
  if (r.ok) tool.last_verified = today;
  console.log(`${r.ok ? '✅' : '❌'} ${tool.slug} (${r.status}${r.error ? ' ' + r.error : ''})`);
}

writeFileSync(toolsPath, JSON.stringify(tools, null, 2) + '\n');
writeFileSync(join(root, 'data/health.json'), JSON.stringify({ checked_at: today, results }, null, 2) + '\n');

const dead = results.filter((r) => !r.ok);
console.log(`\n巡检完成：${results.length - dead.length}/${results.length} 可达${dead.length ? `，待复核：${dead.map((d) => d.slug).join(', ')}` : ''}`);
