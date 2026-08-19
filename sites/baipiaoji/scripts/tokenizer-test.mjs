#!/usr/bin/env node
// 自研分词器的回归检验：零依赖，跑在 CI 里。
//
// assets/tokenizer.js 的 BPE 合并算法是我们自己写的。写自己的实现，就得自己证明它对——
// 否则这个工具只是把「让用户猜 token 数」换成了「让我们猜 token 数」，一点没改善。
//
// data/tokenizer-golden.json 是金标准：420 例文本与它们的正确 token 数，
// 由 gpt-tokenizer(MIT) 的参考实现在 2026-08-14 生成，覆盖中日韩、ZWJ emoji、
// 重音字符、空白边界与 400 条确定性随机串。此后本仓库不再需要那个包。
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRanks, countTokens } from '../assets/tokenizer.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const golden = JSON.parse(readFileSync(join(root, 'data/tokenizer-golden.json'), 'utf8'));
const ranks = {
  cl100k: parseRanks(readFileSync(join(root, 'assets/tok/cl100k_base.bin')).buffer),
  o200k: parseRanks(readFileSync(join(root, 'assets/tok/o200k_base.bin')).buffer),
};

let bad = 0;
for (const c of golden.cases) {
  for (const [name, want] of [['cl100k', c.cl], ['o200k', c.o2]]) {
    const got = countTokens(c.t, ranks[name], name);
    if (got !== want) {
      bad++;
      if (bad <= 5) console.log(`❌ ${name}：得 ${got}，应为 ${want} ← ${JSON.stringify(c.t.slice(0, 60))}`);
    }
  }
}
console.log(`tokenizer: 比对 ${golden.cases.length * 2} 例，不一致 ${bad} 例`);
process.exit(bad ? 1 : 0);
