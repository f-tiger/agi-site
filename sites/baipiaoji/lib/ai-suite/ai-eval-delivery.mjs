import { decimalIntegers, fromDecimalInteger } from './operations/core.mjs';
import { json, label, make, number, parse, readArray } from './tables-core.mjs';

const maxUsageTokens = 1_000_000_000_000;
const maxWindowTokens = 10_000_000;

function requireFields(value, fields) {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).length !== fields.length || !fields.every(field => Object.hasOwn(value, field))) {
    throw Error('Expected an object with exactly these fields: ' + fields.join(', ') + '.');
  }
}

function requireId(value) {
  if (typeof value !== 'string' || !value.length || value.length > 80 ||
      value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw Error('Use nonempty IDs up to 80 characters with no surrounding whitespace or control characters.');
  }
}

function requireCount(value, min, max, name) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw Error(name + ' must be an integer between ' + min + ' and ' + max + '.');
  }
}

function currencyCode(value) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw Error('Supply a three-letter currency code.');
  return code;
}

function tokenBilling({
  currency, inputTokens, cachedInputTokens, unpricedInputTokens, billedOutputTokens,
  uncachedInputRate, cachedInputRate, outputRate,
}) {
  const code = currencyCode(currency);
  const uncachedInputTokens = inputTokens - cachedInputTokens - unpricedInputTokens;
  if (uncachedInputTokens < 0) {
    throw Error('Cached and unpriced input are disjoint subsets of total input. Their sum cannot exceed total input.');
  }
  const { values: rates, places } = decimalIntegers([uncachedInputRate, cachedInputRate, outputRate]);
  const uncached = BigInt(uncachedInputTokens) * rates[0];
  const cached = BigInt(cachedInputTokens) * rates[1];
  const output = BigInt(billedOutputTokens) * rates[2];
  const perMillionPlaces = places + 6;
  function charge(value) {
    const amount = fromDecimalInteger(value, perMillionPlaces);
    if (amount === 0 && value > 0n) throw Error('Token charge is below supported numeric precision.');
    return amount;
  }
  return {
    currency: code,
    uncachedInputTokens,
    cachedInputTokens,
    unpricedInputTokens,
    billedOutputTokens,
    uncachedInputCharge: charge(uncached),
    cachedInputCharge: charge(cached),
    outputCharge: charge(output),
    estimatedTotal: charge(uncached + cached + output),
    partialEstimate: unpricedInputTokens > 0,
  };
}

function routeDeliveryCost({ currency, routesJson, minimumPassPercent }) {
  const code = currencyCode(currency);
  const routes = readArray(routesJson, 8);
  if (routes.length < 2) throw Error('Supply results for at least two routes.');
  const routeIds = new Set();
  let referenceTasks;
  const metrics = routes.map(route => {
    requireFields(route, ['route', 'samples']);
    requireId(route.route);
    if (routeIds.has(route.route)) throw Error('Route IDs must be unique.');
    routeIds.add(route.route);
    if (!Array.isArray(route.samples) || !route.samples.length || route.samples.length > 200) {
      throw Error('Supply 1 to 200 evaluated samples per route.');
    }
    const ids = new Set();
    let passed = 0;
    let totalCostMinor = 0;
    for (const sample of route.samples) {
      requireFields(sample, ['id', 'passed', 'costMinor']);
      requireId(sample.id);
      if (ids.has(sample.id)) throw Error('Sample IDs must be unique within each route.');
      if (typeof sample.passed !== 'boolean') throw Error('Each sample must have a boolean passed field.');
      requireCount(sample.costMinor, 0, 1_000_000_000, 'costMinor');
      ids.add(sample.id);
      if (sample.passed) passed++;
      totalCostMinor += sample.costMinor;
    }
    if (referenceTasks && (ids.size !== referenceTasks.size || [...ids].some(id => !referenceTasks.has(id)))) {
      throw Error('Every route must be evaluated on exactly the same sample IDs.');
    }
    referenceTasks ??= ids;
    return {
      route: route.route,
      passed,
      failed: ids.size - passed,
      passPercent: 100 * passed / ids.size,
      totalCostMinor,
      costPerPassedMinor: passed ? totalCostMinor / passed : null,
      eligible: passed > 0 && 100 * passed >= minimumPassPercent * ids.size,
    };
  });
  const lowest = metrics.filter(route => route.eligible).sort((a, b) =>
    a.totalCostMinor * b.passed - b.totalCostMinor * a.passed)[0];
  const lowestCostRoutes = lowest
    ? metrics.filter(route => route.eligible &&
      route.totalCostMinor * lowest.passed === lowest.totalCostMinor * route.passed).map(route => route.route)
    : [];
  return { currency: code, pairedSamplesPerRoute: referenceTasks.size, minimumPassPercent, routes: metrics, lowestCostRoutes };
}

function contextBudget({ windowTokens, reservedTokens, chunksJson }) {
  if (reservedTokens > windowTokens) throw Error('Reserved tokens cannot exceed the context window.');
  const chunks = parse(chunksJson);
  if (!Array.isArray(chunks) || chunks.length > 200) throw Error('Supply an array of at most 200 evidence chunks.');
  const seen = new Map();
  const duplicates = new Set();
  const includedIds = [];
  const skippedIds = [];
  const evidenceBudgetTokens = windowTokens - reservedTokens;
  let includedEvidenceTokens = 0;
  for (const chunk of chunks) {
    requireFields(chunk, ['id', 'tokens']);
    requireId(chunk.id);
    requireCount(chunk.tokens, 1, maxWindowTokens, 'Chunk tokens');
    if (seen.has(chunk.id)) {
      if (seen.get(chunk.id) !== chunk.tokens) throw Error('Repeated chunk IDs must have the same token count.');
      duplicates.add(chunk.id);
      continue;
    }
    seen.set(chunk.id, chunk.tokens);
    if (chunk.tokens > evidenceBudgetTokens - includedEvidenceTokens) {
      skippedIds.push(chunk.id);
    } else {
      includedIds.push(chunk.id);
      includedEvidenceTokens += chunk.tokens;
    }
  }
  return {
    windowTokens, reservedTokens, evidenceBudgetTokens, includedEvidenceTokens,
    remainingTokens: evidenceBudgetTokens - includedEvidenceTokens,
    includedIds, skippedIds, duplicateIds: [...duplicates],
  };
}

const quantity = (key, zh, en, example) => number(key, zh, en, example, 0, maxUsageTokens, true);
const rate = (key, zh, en, example) => number(key, zh, en, example, 0, 100_000);
const sampleRoutes = [
  { route: 'route-a', samples: [{ id: 'task-1', passed: true, costMinor: 4 }, { id: 'task-2', passed: false, costMinor: 2 }] },
  { route: 'route-b', samples: [{ id: 'task-2', passed: true, costMinor: 8 }, { id: 'task-1', passed: true, costMinor: 8 }] },
];

export const tools = [
  make('llm-token-billing', '模型用量费用核算', 'Model token cost breakdown',
    '按每百万 token 的费率计算费用。缓存输入和未计价输入是总输入中互不重叠的部分。输出填实际计费数量。有未计价输入时，结果只是部分估算。',
    'Price supplied usage at rates per million tokens. Cached and unpriced input are disjoint subsets of total input. Supply billed output tokens. Unpriced input makes the estimate partial.',
    [
      label('currency', '结算币种', 'Billing currency', 'USD'),
      quantity('inputTokens', '输入 token 总数', 'Total input tokens', 1_000_000),
      quantity('cachedInputTokens', '缓存输入 token 数', 'Cached input tokens', 250_000),
      quantity('unpricedInputTokens', '未计价输入 token 数', 'Unpriced input tokens', 100_000),
      quantity('billedOutputTokens', '实际计费输出 token 数', 'Billed output tokens', 100_000),
      rate('uncachedInputRate', '每百万普通输入单价', 'Uncached input rate per million', 2),
      rate('cachedInputRate', '每百万缓存输入单价', 'Cached input rate per million', 0.5),
      rate('outputRate', '每百万计费输出单价', 'Output rate per million', 8),
    ], tokenBilling),
  make('llm-route-delivery-cost', '同批任务的模型路由成本对比', 'Paired model route delivery cost',
    '用同一批任务的通过结果和实际费用比较模型路由。每条任务费用应含重试，失败任务也计费。使用同币种的最小金额单位，并指定最低通过率。',
    'Compare model routes on the same task IDs using observed pass results and costs. Include retries and failed tasks in costs. Use integer minor units of one currency and set a minimum pass rate.',
    [
      label('currency', '结算币种', 'Billing currency', 'USD'),
      json('routesJson', '各路由的任务结果（JSON）', 'Task results by route (JSON)', sampleRoutes),
      number('minimumPassPercent', '最低通过率（%）', 'Minimum pass rate (%)', 75, 0, 100),
    ], routeDeliveryCost),
  make('llm-context-budget', '模型上下文证据预算', 'Context window evidence budget',
    '扣除指令和输出预留，按给定顺序装入已计数的证据。每个编号最多计一次。装不下的证据会跳过并列出。请使用目标模型的实际 token 数。',
    'Reserve space for instructions and output, then fit already-counted evidence in supplied priority order. Count each ID once and report chunks skipped for size. Use counts from the target model.',
    [
      number('windowTokens', '上下文窗口 token 数', 'Context window tokens', 4096, 1, maxWindowTokens, true),
      number('reservedTokens', '指令与输出预留 token 数', 'Reserved instruction and output tokens', 1024, 0, maxWindowTokens, true),
      json('chunksJson', '按优先级排序的证据（JSON）', 'Evidence in priority order (JSON)',
        [{ id: 'policy', tokens: 1400 }, { id: 'manual', tokens: 1800 }, { id: 'policy', tokens: 1400 }, { id: 'example', tokens: 900 }]),
    ], contextBudget),
];
