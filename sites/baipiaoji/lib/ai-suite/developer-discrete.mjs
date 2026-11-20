import { define as d, string, number, requireValue as check, json } from './developer-common.mjs';

const integer = (key, zh, en, v, min, max) => number(key, zh, en, v, min, max, true);
const a = integer('a', '整数 A', 'Integer A', 35, 1, 1000000000),
  b = integer('b', '整数 B', 'Integer B', 12, 1, 1000000000);
const n = integer('n', '非负整数', 'Nonnegative integer', 12, 0, 150);
const modulus = integer('modulus', '模数', 'Modulus', 97, 2, 1000000000);
function gcdex(a, b) {
  let x = 1n,
    y = 0n,
    u = 0n,
    v = 1n;
  while (b) {
    const q = a / b;
    [a, b] = [b, a % b];
    [x, u] = [u, x - q * u];
    [y, v] = [v, y - q * v];
  }
  return { g: a, x, y };
}
const mod = (n, m) => ((n % m) + m) % m;
function choose(n, k) {
  if (k > n) return 0n;
  k = Math.min(k, n - k);
  let c = 1n;
  for (let i = 1; i <= k; i++) c = (c * BigInt(n - i + 1)) / BigInt(i);
  return c;
}
function factors(n) {
  const entries = [];
  for (let p = 2; p * p <= n; p = p === 2 ? 3 : p + 2) {
    let e = 0;
    while (n % p === 0) {
      n /= p;
      e++;
    }
    if (e) entries.push({ prime: p, exponent: e });
  }
  if (n > 1) entries.push({ prime: n, exponent: 1 });
  return entries;
}
function fib(n) {
  if (!n) return [0n, 1n];
  const [a, b] = fib(Math.floor(n / 2)),
    p = a * (2n * b - a),
    q = a * a + b * b;
  return n % 2 ? [q, p + q] : [p, q];
}
const algorithm = (id, zh, en, cn, ds, fields, fn) => d('discrete-' + id, zh, en, cn, ds, fields, fn);
export const tools = [
  algorithm(
    'bezout',
    '贝祖系数',
    'Bézout coefficients',
    '求最大公约数和满足 Ax + By = gcd(A,B) 的整数系数。',
    'Find the greatest common divisor and integer coefficients satisfying Ax + By = gcd(A,B).',
    [a, b],
    (a, b) => {
      const { g, x, y } = gcdex(BigInt(a), BigInt(b));
      return { gcd: String(g), x: String(x), y: String(y) };
    },
  ),
  algorithm(
    'lcm-list',
    '整数列表最小公倍数',
    'Least common multiple of a list',
    '对一组正整数逐次约分并求精确的最小公倍数。',
    'Reduce a list of positive integers to its exact least common multiple.',
    [string('values', '正整数 JSON 数组', 'Positive integer JSON array', '[6,8,10]', 1500, json)],
    (v) => {
      check(
        Array.isArray(v) &&
          v.length > 0 &&
          v.length <= 60 &&
          v.every((n) => Number.isSafeInteger(n) && n >= 1 && n <= 1e9),
        'Use 1 to 60 positive integers up to a billion.',
      );
      return { lcm: String(v.reduce((result, n) => (result / gcdex(result, BigInt(n)).g) * BigInt(n), 1n)) };
    },
  ),
  algorithm(
    'modular-inverse',
    '模乘逆元',
    'Modular multiplicative inverse',
    '判断整数与模数是否互素，并计算规范的非负逆元。',
    'Determine coprimality and return the least nonnegative multiplicative inverse when it exists.',
    [a, modulus],
    (a, m) => {
      const { g, x } = gcdex(BigInt(a), BigInt(m));
      return { exists: g === 1n, inverse: g === 1n ? String(mod(x, BigInt(m))) : null };
    },
  ),
  algorithm(
    'modular-power',
    '快速模幂',
    'Modular exponentiation',
    '以平方乘法计算大指数整数幂对模数的余数。',
    'Use repeated squaring to calculate a large integer power modulo a supplied base modulus.',
    [a, integer('exponent', '指数', 'Exponent', 17, 0, 1e9), modulus],
    (a, k, m) => {
      let base = BigInt(a),
        product = 1n;
      const divisor = BigInt(m);
      while (k) {
        if (k % 2) product = (product * base) % divisor;
        base = (base * base) % divisor;
        k = Math.floor(k / 2);
      }
      return { residue: String(product) };
    },
  ),
  algorithm(
    'congruence-pair',
    '合并同余条件',
    'Combine two congruences',
    '用广义中国剩余定理合并两个模条件并检测无解。',
    'Combine two congruences using the generalized Chinese remainder theorem and detect incompatible residues.',
    [
      integer('r1', '余数一', 'First residue', 2, 0, 1e9),
      integer('m1', '模数一', 'First modulus', 3, 1, 1e9),
      integer('r2', '余数二', 'Second residue', 3, 0, 1e9),
      integer('m2', '模数二', 'Second modulus', 5, 1, 1e9),
    ],
    (...values) => {
      const [a, m, b, n] = values.map(BigInt),
        { g, x } = gcdex(m, n);
      if ((b - a) % g) return { exists: false };
      const period = (m / g) * n;
      return {
        exists: true,
        residue: String(mod(a + m * mod(((b - a) / g) * x, n / g), period)),
        period: String(period),
      };
    },
  ),
  algorithm(
    'continued-fraction',
    '有理数连分数',
    'Expand a rational continued fraction',
    '通过欧几里得除法返回正有理数的有限连分数系数。',
    'Use Euclidean quotients to produce the finite continued fraction of a positive rational.',
    [a, b],
    (a, b) => {
      const terms = [];
      while (b) {
        terms.push(Math.floor(a / b));
        [a, b] = [b, a % b];
      }
      return { terms };
    },
  ),
  algorithm(
    'farey-sequence',
    '生成法里数列',
    'Generate a Farey sequence',
    '列出分母不超过给定阶数、位于零和一之间的所有既约分数。',
    'List all reduced fractions from zero through one with denominators up to a supplied order.',
    [integer('order', '阶数', 'Order', 5, 1, 32)],
    (n) => {
      const fractions = ['0/1'];
      let a = 0,
        b = 1,
        c = 1,
        d = n;
      while (c <= n) {
        fractions.push(c + '/' + d);
        const k = Math.floor((n + b) / d);
        [a, b, c, d] = [c, d, k * c - a, k * d - b];
      }
      return { fractions };
    },
  ),
  algorithm(
    'roman-numeral',
    '生成罗马数字',
    'Format Roman numerals',
    '将 1 至 3999 的整数转换为标准减法写法。',
    'Format an integer from 1 through 3999 in canonical subtractive Roman notation.',
    [integer('integer', '整数', 'Integer', 1984, 1, 3999)],
    (n) => {
      let roman = '';
      for (const [v, s] of [
        [1000, 'M'],
        [900, 'CM'],
        [500, 'D'],
        [400, 'CD'],
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I'],
      ])
        while (n >= v) {
          roman += s;
          n -= v;
        }
      return { roman };
    },
  ),
  algorithm(
    'integer-square-root',
    '整数平方根和余数',
    'Integer square root and remainder',
    '精确计算十进制非负大整数的向下平方根与剩余量。',
    'Find the exact floor square root of a nonnegative decimal integer and its remainder.',
    [string('value', '非负十进制整数', 'Nonnegative decimal integer', '12345678901234567890', 100)],
    (s) => {
      check(/^\d{1,100}$/.test(s), 'Supply up to 100 decimal digits.');
      const v = BigInt(s);
      let lo = 0n,
        hi = v + 1n;
      while (hi - lo > 1n) {
        const mid = (lo + hi) / 2n;
        if (mid * mid <= v) lo = mid;
        else hi = mid;
      }
      return { root: String(lo), remainder: String(v - lo * lo) };
    },
  ),
  algorithm(
    'align-offset',
    '地址边界对齐',
    'Align a byte offset',
    '将给定非负偏移量向上对齐至指定字节边界，报告填充大小。',
    'Round a byte offset up to an alignment boundary and report the required padding.',
    [
      integer('offset', '字节偏移量', 'Byte offset', 19, 0, 1e12),
      integer('alignment', '对齐字节数', 'Alignment bytes', 8, 1, 1e9),
    ],
    (o, a) => {
      const aligned = Math.ceil(o / a) * a;
      return { aligned, padding: aligned - o };
    },
  ),
  algorithm(
    'prime-factors',
    '分解质因数',
    'Factor an integer',
    '将十亿范围内的整数分解为不同素数与指数。',
    'Factor a positive integer up to one billion into prime powers.',
    [a],
    (v) => ({ factors: factors(v) }),
  ),
  algorithm(
    'prime-sieve',
    '筛选区间素数',
    'Sieve primes in a range',
    '用分段筛找出指定闭区间中的素数，最多检查一千个整数。',
    'Use a segmented sieve to find primes within an inclusive interval of up to 1,000 integers.',
    [integer('first', '起始值', 'First value', 20, 0, 1e8), integer('last', '结束值', 'Last value', 50, 0, 1e8)],
    (a, b) => {
      check(b >= a && b - a < 1000, 'Use an increasing interval of up to 1000 integers.');
      const flags = Array(b - a + 1).fill(true);
      for (let p = 2; p * p <= b; p++)
        for (let j = Math.max(p * p, Math.ceil(a / p) * p); j <= b; j += p) flags[j - a] = false;
      return { primes: flags.flatMap((ok, i) => (ok && i + a >= 2 ? [i + a] : [])) };
    },
  ),
  algorithm(
    'euler-totient',
    '欧拉函数',
    'Euler totient',
    '计算一至 n 中与 n 互素的整数数量，并列出质因子。',
    'Count positive integers up to n that are coprime to n using its distinct prime factors.',
    [a],
    (n) => {
      const primes = factors(n).map((f) => f.prime);
      return { totient: primes.reduce((x, p) => (x / p) * (p - 1), n), primes };
    },
  ),
  algorithm(
    'binomial',
    '无序组合数',
    'Binomial coefficient',
    '精确计算从 n 个不同元素中无序选 k 个的组合数。',
    'Count unordered selections of k distinct elements from n without replacement.',
    [n, integer('k', '选取数量', 'Selection size', 3, 0, 150)],
    (n, k) => ({ combinations: String(choose(n, k)) }),
  ),
  algorithm(
    'catalan',
    '卡特兰数',
    'Catalan number',
    '计算含 n 对括号的有效配对方式数。',
    'Calculate the number of balanced bracket strings with n pairs.',
    [n],
    (n) => ({ balancedStrings: String(choose(2 * n, n) / BigInt(n + 1)) }),
  ),
  algorithm(
    'derangements',
    '全错排个数',
    'Count derangements',
    '计算不同元素在全部离开原位置时的排列数。',
    'Count permutations in which every element moves away from its original index.',
    [n],
    (n) => {
      let prior = 1n,
        current = 0n;
      if (!n) return { derangements: '1' };
      for (let i = 2; i <= n; i++) [prior, current] = [current, BigInt(i - 1) * (current + prior)];
      return { derangements: String(current) };
    },
  ),
  algorithm(
    'integer-partitions',
    '整数拆分计数',
    'Count integer partitions',
    '按加数不计顺序计算一个非负整数的正整数拆分数。',
    'Count additive partitions of a nonnegative integer without distinguishing term order.',
    [n],
    (n) => {
      const ways = Array(n + 1).fill(0n);
      ways[0] = 1n;
      for (let k = 1; k <= n; k++) for (let j = k; j <= n; j++) ways[j] += ways[j - k];
      return { partitions: String(ways[n]) };
    },
  ),
  algorithm(
    'fibonacci',
    '快速倍增斐波那契数',
    'Fast-doubling Fibonacci number',
    '以 F0 为零、F1 为一计算精确整数项。',
    'Compute an exact Fibonacci term by fast doubling with F0 = 0 and F1 = 1.',
    [integer('index', '序号', 'Index', 100, 0, 2000)],
    (n) => ({ value: String(fib(n)[0]) }),
  ),
  algorithm(
    'permutation-rank',
    '排列的字典序编号',
    'Rank a permutation',
    '给出互异整数排列在零起始字典序中的精确编号。',
    'Rank a permutation of distinct integers in zero-based lexicographic order.',
    [string('values', '互异整数数组', 'Distinct integer array', '[3,1,2]', 1024, json)],
    (v) => {
      check(
        Array.isArray(v) && v.length <= 40 && v.every(Number.isSafeInteger) && new Set(v).size === v.length,
        'Use at most 40 distinct integers.',
      );
      let index = 0n;
      for (let i = 0; i < v.length; i++)
        index = index * BigInt(v.length - i) + BigInt(v.slice(i + 1).filter((n) => n < v[i]).length);
      return { rank: String(index) };
    },
  ),
  algorithm(
    'josephus',
    '循环报数剩余位置',
    'Josephus survivor position',
    '从第一人开始循环报数，每第 k 人出列，计算最后的一起始位置。',
    'Count from the first person and eliminate every kth to obtain the one-based surviving position.',
    [integer('people', '人数', 'People', 7, 1, 100000), integer('step', '步长', 'Counting step', 3, 1, 1000000)],
    (n, k) => {
      let j = 0;
      for (let i = 2; i <= n; i++) j = (j + k) % i;
      return { survivor: j + 1 };
    },
  ),
];
