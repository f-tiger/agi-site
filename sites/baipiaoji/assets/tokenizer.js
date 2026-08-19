// 自研分词器：字节级 BPE，跑在用户的浏览器里。
//
// 为什么自己写：站上唯一一处让用户猜数字的地方，是 /llm-api-calculator.html 的
// 「单次平均多少 tokens」。一个把「不许猜数字」写进每一页的站，旗舰计算器却建在
// 一个猜出来的输入上。要修掉它就得真的能数 token——而真的能数，就不能把用户的
// 文本发给任何人。所以计算全部发生在这一页，零外部请求。
//
// 词表（assets/tok/*.bin）是公开常量，性质接近字符编码表，许可见同目录 LICENSE。
// 下面的合并算法是我们自己实现的。
//
// 诚实边界（页面上也要写）：cl100k / o200k 是 OpenAI 系的分词器。
// Claude、Gemini、通义各有各的分词器，同一段文本的 token 数并不相同——
// 所以对非 OpenAI 系的模型，这里给出的只能是参考量级，不是那家厂商的口径。

const SPLIT = {
  cl100k: /'(?:[sS]|[dD]|[mM]|[tT]|[lL][lL]|[vV][eE]|[rR][eE])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s+$|\s*[\r\n]|\s+(?!\S)|\s/gu,
  o200k: /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sS]|[dD]|[mM]|[tT]|[lL][lL]|[vV][eE]|[rR][eE]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sS]|[dD]|[mM]|[tT]|[lL][lL]|[vV][eE]|[rR][eE]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu,
};
const FILE = { cl100k: 'cl100k_base.bin', o200k: 'o200k_base.bin' };
const cache = new Map();

// 二进制词表：[4 字节 LE 条目数]，随后每条 [1 字节长度][原始字节]。
// key 用 latin1 字符串而不是数组，是为了能直接进 Map——JS 里没有值相等的字节数组。
export function parseRanks(buf) {
  const u = new Uint8Array(buf);
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const n = dv.getUint32(0, true);
  const ranks = new Map();
  let o = 4;
  for (let i = 0; i < n; i++) {
    const len = u[o++];
    let k = '';
    for (let j = 0; j < len; j++) k += String.fromCharCode(u[o + j]);
    o += len;
    ranks.set(k, i);
  }
  return ranks;
}

export async function loadEncoding(name, base = '') {
  if (cache.has(name)) return cache.get(name);
  const p = (async () => {
    const res = await fetch(`${base}/assets/tok/${FILE[name]}`);
    if (!res.ok) throw new Error(`词表加载失败：${res.status}`);
    return parseRanks(await res.arrayBuffer());
  })();
  cache.set(name, p);
  return p;
}

// 一个 piece（正则切出来的片段）内部的字节对合并。
// 标准做法：反复找相邻两段拼起来后 rank 最小的那一对合并，直到没有可合并的对。
function mergePiece(bytes, ranks) {
  if (bytes.length === 1) return 1;
  let parts = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) parts[i] = String.fromCharCode(bytes[i]);
  for (;;) {
    let best = -1, bestRank = Infinity;
    for (let i = 0; i + 1 < parts.length; i++) {
      const r = ranks.get(parts[i] + parts[i + 1]);
      if (r !== undefined && r < bestRank) { bestRank = r; best = i; }
    }
    if (best < 0) break;
    parts.splice(best, 2, parts[best] + parts[best + 1]);
  }
  return parts.length;
}

const utf8 = new TextEncoder();

// 只数个数，不返回 token id——这个工具要回答的是「多少 token」，
// 数 id 反而会让页面误以为自己能替代官方 SDK。
export function countTokens(text, ranks, name) {
  if (!text) return 0;
  const re = SPLIT[name];
  re.lastIndex = 0;
  let total = 0;
  for (const m of text.matchAll(re)) {
    const piece = m[0];
    if (!piece) continue;
    const bytes = utf8.encode(piece);
    let key = '';
    for (let i = 0; i < bytes.length; i++) key += String.fromCharCode(bytes[i]);
    total += ranks.has(key) ? 1 : mergePiece(bytes, ranks);
  }
  return total;
}
