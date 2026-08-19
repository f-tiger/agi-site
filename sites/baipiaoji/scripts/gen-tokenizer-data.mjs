#!/usr/bin/env node
// 生成自研分词器要用的词表二进制。**手动运行，产物提交进仓库**——
// 这样 CI 与构建期仍然零依赖，浏览器端也不需要任何第三方脚本。
//
//   cd /tmp && npm pack gpt-tokenizer && tar xzf gpt-tokenizer-*.tgz
//   node scripts/gen-tokenizer-data.mjs /tmp/package
//
// 词表本身是公开常量（性质接近字符编码表），来自 gpt-tokenizer（MIT），
// 已在 assets/tok/LICENSE 保留其许可与版权声明。合并算法是我们自己写的
// （assets/tokenizer.js），运行时全部发生在用户设备上，不经过任何人的服务器。
//
// 格式（我们自己定的，越简单越不会错）：
//   [4 字节 LE: 条目数][每条: 1 字节长度 N][N 字节 token 原始字节]
// rank 即条目在文件中的顺序。长度超过 255 的 token 会被拒绝——真出现了要改格式，
// 而不是悄悄截断。
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = process.argv[2];
if (!pkg) {
  console.error('用法：node scripts/gen-tokenizer-data.mjs <解包后的 gpt-tokenizer 目录>');
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets/tok');
mkdirSync(outDir, { recursive: true });

const enc = new TextEncoder();
for (const name of ['cl100k_base', 'o200k_base']) {
  const mod = await import(join(pkg, 'esm/bpeRanks', `${name}.js`));
  const bpe = mod.default;
  const parts = [];
  let bytes = 0, maxLen = 0;
  for (let i = 0; i < bpe.length; i++) {
    const v = bpe[i];
    const b = Array.isArray(v) ? Uint8Array.from(v) : enc.encode(v);
    if (b.length > 255) { console.error(`rank ${i} 长度 ${b.length} 超过 255，格式需要升级`); process.exit(1); }
    maxLen = Math.max(maxLen, b.length);
    parts.push(b);
    bytes += b.length + 1;
  }
  const out = new Uint8Array(4 + bytes);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, parts.length, true);
  let o = 4;
  for (const b of parts) { out[o++] = b.length; out.set(b, o); o += b.length; }
  writeFileSync(join(outDir, `${name}.bin`), out);
  console.log(`${name}.bin：${parts.length} 条，${(out.length / 1024).toFixed(0)} KB，最长 token ${maxLen} 字节`);
}

writeFileSync(join(outDir, 'LICENSE'), `The token tables in this directory (cl100k_base.bin, o200k_base.bin) are derived
from gpt-tokenizer, which is distributed under the MIT License:

  MIT License
  Copyright (c) 2023-2024 Bazyli Brzoska

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

The byte-pair merge implementation in assets/tokenizer.js is our own and is not
derived from that package.
`);
console.log('✅ assets/tok/ 生成完毕（含 LICENSE）');
