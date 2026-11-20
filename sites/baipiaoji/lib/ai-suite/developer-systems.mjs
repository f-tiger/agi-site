import { define as d, number as n, round, requireValue as check } from './developer-common.mjs';

const ratio = (key, zh, en, v) => n(key, zh, en, v, 0, 1);
const positive = (key, zh, en, v, max = 1e9) => n(key, zh, en, v, 0.000001, max);
const nonnegative = (key, zh, en, v, max = 1e9) => n(key, zh, en, v, 0, max);
const whole = (key, zh, en, v, min, max) => n(key, zh, en, v, min, max, true);
const avail = ratio('availability', '单组件可用率', 'Individual availability fraction', 0.99);
const arrival = positive('arrivals', '平均到达率（每秒）', 'Mean arrivals per second', 8);
const service = positive('service', '平均处理率（每秒）', 'Mean service completions per second', 12);
const prob = ratio('failure', '每次独立失败概率', 'Independent failure probability', 0.1);
const attempts = whole('attempts', '最多尝试次数', 'Maximum attempts', 3, 1, 30);
const sys = (id, zh, en, cn, desc, fields, fn) => d('system-' + id, zh, en, cn, desc, fields, fn);
export const tools = [
  sys(
    'slo-downtime',
    'SLO 停机预算',
    'SLO downtime budget',
    '按目标可用率和周期天数计算基于时间的可容忍停机量。',
    'Calculate allowed downtime for a time-based availability objective and window length.',
    [
      ratio('target', '目标可用率', 'Target availability fraction', 0.999),
      positive('days', '周期天数', 'Window days', 30, 366),
    ],
    (t, days) => ({ minutes: round(days * 1440 * (1 - t)), seconds: round(days * 86400 * (1 - t)) }),
  ),
  sys(
    'error-budget-burn',
    '请求错误预算消耗速率',
    'Request error budget burn rate',
    '将观测错误占比与目标允许的错误占比相比，得到预算燃烧倍数。',
    'Divide observed request error fraction by the allowed fraction to obtain the burn multiple.',
    [
      whole('requests', '请求总数', 'Requests', 100000, 1, 1e12),
      whole('errors', '错误请求数', 'Failed requests', 150, 0, 1e12),
      n('target', '目标成功率', 'Target success fraction', 0.999, 0, 0.99999999),
    ],
    (requests, errors, t) => {
      check(errors <= requests, 'Failed requests cannot exceed total requests.');
      return { errorFraction: round(errors / requests), burnMultiple: round(errors / requests / (1 - t)) };
    },
  ),
  sys(
    'serial-availability',
    '串行依赖可用率',
    'Serial dependency availability',
    '独立且全部必需的依赖按乘积计算服务整体可用率。',
    'Multiply independent availability terms for a stack in which every dependency is required.',
    [avail, whole('dependencies', '相同依赖数', 'Identical required dependencies', 4, 1, 1000)],
    (a, n) => ({ availability: round(a ** n), failure: round(1 - a ** n) }),
  ),
  sys(
    'replica-availability',
    '独立副本可用率',
    'Independent replica availability',
    '假定故障独立，计算至少一个等可用率副本在线的概率。',
    'Compute the chance of at least one healthy replica under identical independent failures.',
    [avail, whole('replicas', '副本数', 'Replica count', 3, 1, 100)],
    (a, n) => ({ availability: round(1 - (1 - a) ** n), allDown: round((1 - a) ** n) }),
  ),
  sys(
    'quorum-availability',
    '法定人数可用率',
    'Quorum availability',
    '按二项分布计算达到指定健康副本数的概率。',
    'Compute the binomial probability of having at least the required number of healthy replicas.',
    [
      avail,
      whole('replicas', '总副本数', 'Total replicas', 5, 1, 60),
      whole('required', '所需副本数', 'Required healthy replicas', 3, 1, 60),
    ],
    (p, n, k) => {
      check(k <= n, 'Quorum must not exceed replica count.');
      let successes = 0,
        coefficient = 1;
      for (let i = 0; i <= n; i++) {
        if (i >= k) successes += coefficient * p ** i * (1 - p) ** (n - i);
        coefficient = (coefficient * (n - i)) / (i + 1);
      }
      return { probability: round(Math.min(1, successes)) };
    },
  ),
  sys(
    'single-queue-delay',
    '单服务台排队时延',
    'M/M/1 queue delay',
    '在泊松到达和指数服务时间假设下估算稳态等待与逗留时间。',
    'Estimate steady-state delay and time in system for Poisson arrivals and exponential service.',
    [arrival, service],
    (a, s) => {
      if (a >= s) return { stable: false };
      return {
        stable: true,
        utilization: round(a / s),
        meanWaitSeconds: round(a / (s * (s - a))),
        meanSojournSeconds: round(1 / (s - a)),
      };
    },
  ),
  sys(
    'little-law',
    '利特尔法则并发数',
    'Little’s law concurrency',
    '用稳态吞吐和平均端到端延迟估算在途请求数。',
    'Estimate mean in-flight requests from steady-state throughput and mean end-to-end latency.',
    [arrival, nonnegative('latencyMs', '平均端到端毫秒', 'Mean end-to-end milliseconds', 125)],
    (a, ms) => ({ meanInFlight: round((a * ms) / 1000) }),
  ),
  sys(
    'queue-drain',
    '积压清空时间',
    'Backlog drain time',
    '持续到达的任务与处理器并行工作，按净处理速度估算清空时间。',
    'Estimate recovery time for an existing backlog while new jobs continue arriving.',
    [
      whole('backlog', '积压任务', 'Backlogged jobs', 1000, 0, 1e12),
      nonnegative('incoming', '新任务每秒', 'Incoming jobs per second', 5),
      service,
    ],
    (jobs, a, s) => ({
      drains: !jobs || s > a,
      seconds: !jobs ? 0 : s > a ? round(jobs / (s - a)) : null,
      netPerSecond: round(s - a),
    }),
  ),
  sys(
    'bandwidth-delay-product',
    '带宽时延积',
    'Bandwidth-delay product',
    '按十进制兆比特带宽和往返延迟计算填满链路所需在途字节。',
    'Calculate in-flight bytes needed to fill a link from decimal megabits per second and round-trip delay.',
    [
      positive('mbps', '链路 Mbps', 'Link Mbps', 1000),
      nonnegative('rtt', '往返毫秒', 'Round-trip milliseconds', 40),
    ],
    (rate, rtt) => ({ bytes: round((((rate * 1e6) / 8) * rtt) / 1000) }),
  ),
  sys(
    'worker-count',
    '处理器并发数规划',
    'Size a worker pool',
    '以工作耗时、到达率和目标利用率计算所需并发工作槽。',
    'Size worker concurrency from arrival rate, per-job service time and target utilization.',
    [
      arrival,
      positive('durationMs', '每任务平均处理毫秒', 'Mean service milliseconds per job', 250),
      n('utilization', '目标利用率', 'Target utilization', 0.7, 0.0001, 1),
    ],
    (a, ms, u) => ({ workers: Math.ceil((a * ms) / 1000 / u), offeredLoad: round((a * ms) / 1000) }),
  ),
  sys(
    'cache-latency',
    '分层缓存平均延迟',
    'Expected cache read latency',
    '每次先查缓存，未命中再访问后端，估算平均延迟。',
    'Assume all requests pay cache lookup cost and misses also pay backend cost; calculate expected latency.',
    [
      ratio('hit', '缓存命中率', 'Cache hit fraction', 0.92),
      nonnegative('lookup', '缓存查找毫秒', 'Cache lookup milliseconds', 2),
      nonnegative('backend', '后端额外毫秒', 'Extra backend milliseconds', 70),
    ],
    (h, l, b) => ({ meanMs: round(l + (1 - h) * b) }),
  ),
  sys(
    'bloom-size',
    '布隆过滤器空间',
    'Size a Bloom filter',
    '按目标误判概率和条目数计算位数组大小与近似最佳哈希次数。',
    'Calculate Bloom filter bits and an approximately optimal hash count from item count and false-positive target.',
    [
      whole('items', '预计元素数', 'Expected item count', 100000, 1, 1e9),
      n('falsePositive', '目标误判概率', 'Target false-positive probability', 0.01, 0.000000001, 0.999999),
    ],
    (items, p) => {
      const bits = Math.ceil((-items * Math.log(p)) / Math.log(2) ** 2),
        hashes = Math.max(1, Math.round((bits / items) * Math.log(2)));
      return { bits, bytes: Math.ceil(bits / 8), hashes };
    },
  ),
  sys(
    'birthday-collision',
    '随机标识碰撞概率',
    'Random identifier collision probability',
    '假定独立均匀抽样，逐项计算给定空间中至少一次重复的概率。',
    'Compute the probability of at least one duplicate among independent uniform draws from a finite namespace.',
    [
      whole('draws', '独立抽取数', 'Independent draws', 100, 0, 50000),
      whole('space', '标识空间大小', 'Namespace size', 1000000, 1, 1e12),
    ],
    (n, s) => {
      if (n > s) return { probability: 1 };
      let log = 0;
      for (let i = 1; i < n; i++) log += Math.log1p(-i / s);
      return { probability: -Math.expm1(log) || 0 };
    },
  ),
  sys(
    'backup-chain-storage',
    '备份链空间估算',
    'Backup chain storage',
    '按完整备份大小与固定每日变更量估算一个备份链占用。',
    'Estimate storage for one full backup plus a fixed amount of incremental change per subsequent day.',
    [
      positive('fullGiB', '全量备份 GiB', 'Full backup GiB', 250),
      nonnegative('changedGiB', '每天增量 GiB', 'Incremental GiB per day', 8),
      whole('days', '保留日数', 'Retained days', 14, 1, 3650),
    ],
    (f, c, n) => ({ retainedGiB: round(f + c * (n - 1)), incrementals: n - 1 }),
  ),
  sys(
    'raid-capacity',
    '等容量硬盘 RAID 容量',
    'Usable RAID capacity',
    '对相同容量磁盘计算 RAID 0、1、5、6 与 10 的标准可用容量。',
    'List eligible RAID 0, 1, 5, 6 and 10 capacities for equal-sized drives before filesystem overhead.',
    [
      whole('drives', '硬盘数', 'Drive count', 6, 2, 128),
      positive('driveTiB', '单盘 TiB', 'Capacity per drive in TiB', 4),
    ],
    (n, s) => {
      const layouts = { raid0: n * s, raid1: s };
      if (n >= 3) layouts.raid5 = (n - 1) * s;
      if (n >= 4) layouts.raid6 = (n - 2) * s;
      if (n >= 4 && !(n % 2)) layouts.raid10 = (n / 2) * s;
      return { usableTiB: layouts };
    },
  ),
  sys(
    'shard-capacity',
    '分片容量规划',
    'Plan shard capacity',
    '按存储和吞吐两种独立上限计算最少分片数及主要约束。',
    'Size shards independently for data volume and throughput and identify the binding constraint.',
    [
      nonnegative('volume', '数据量 GiB', 'Data volume GiB', 900),
      positive('shardSize', '每分片 GiB 上限', 'GiB limit per shard', 128),
      nonnegative('traffic', '请求每秒', 'Requests per second', 6000),
      positive('shardRate', '每分片每秒上限', 'Request limit per shard per second', 1000),
    ],
    (v, s, t, r) => {
      const storage = Math.ceil(v / s),
        load = Math.ceil(t / r);
      return {
        shards: Math.max(storage, load),
        storageShards: storage,
        throughputShards: load,
        constraint: storage === load ? 'both' : storage > load ? 'storage' : 'throughput',
      };
    },
  ),
  sys(
    'retry-amplification',
    '重试流量放大',
    'Retry traffic amplification',
    '在独立失败率和尝试上限下计算预期尝试量与最终失败率。',
    'Estimate expected attempts per operation and final failure probability with independent attempts and a cap.',
    [prob, attempts],
    (p, n) => ({ meanAttempts: round(p === 1 ? n : (1 - p ** n) / (1 - p)), eventualFailure: round(p ** n) }),
  ),
  sys(
    'backoff-timeline',
    '生成退避等待时间表',
    'Generate a capped backoff schedule',
    '列出每次重试前的确定性指数退避等待与累计等待时间。',
    'List deterministic exponential backoff waits before retries and their cumulative duration, applying a cap.',
    [
      positive('initial', '初始等待毫秒', 'Initial wait milliseconds', 100),
      n('factor', '倍增系数', 'Multiplier', 2, 1, 10),
      positive('cap', '单次上限毫秒', 'Per-wait cap in milliseconds', 2000),
      attempts,
    ],
    (first, f, cap, n) => {
      const waits = Array.from({ length: n - 1 }, (_, i) => round(Math.min(cap, first * f ** i)));
      return { waitsMs: waits, totalWaitMs: round(waits.reduce((a, b) => a + b, 0)) };
    },
  ),
  sys(
    'origin-transfer',
    '回源流量估算',
    'Estimate origin transfer',
    '按字节命中率计算边缘缓存后仍需回源传输的流量。',
    'Calculate bytes still transferred from origin using the byte-weighted cache hit fraction.',
    [
      nonnegative('delivered', '边缘服务 GiB', 'Edge-delivered GiB', 800),
      ratio('hit', '字节命中率', 'Byte hit fraction', 0.85),
    ],
    (v, h) => ({ originGiB: round(v * (1 - h)), servedFromEdgeGiB: round(v * h) }),
  ),
  sys(
    'compression-savings',
    '存储压缩实测收益',
    'Measured compression savings',
    '对比原始与压缩后文件大小，计算节省量、比例和压缩倍数。',
    'Compare original and compressed byte counts to calculate savings, fractional change and compression ratio.',
    [
      whole('source', '原始字节数', 'Original bytes', 16384, 1, 1e12),
      whole('compressed', '压缩后字节数', 'Compressed bytes', 4096, 1, 1e12),
    ],
    (src, out) => ({ bytesSaved: src - out, savedFraction: round(1 - out / src), ratio: round(src / out) }),
  ),
];
