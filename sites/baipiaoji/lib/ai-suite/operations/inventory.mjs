import { number as n, count as c, percent as p, divide, subset, requireThat, toolBuilder } from './core.mjs';
const make = toolBuilder({
  deviation: n('日需求标准差（件）', 'Daily unit-demand standard deviation', 12),
  lead: n('固定补货提前期（天）', 'Fixed replenishment lead time (days)', 9),
  z: n('目标服务水平对应正态分位数', 'Normal quantile for target service level', 1.645, 0, 5),
  review: n('订货复查间隔（天）', 'Review interval (days)', 7),
  daily: n('日均需求（件）', 'Average daily demand (units)', 20),
  buffer: c('目标缓冲库存', 'Target buffer units', 35),
  stock: c('可用现货件数', 'Usable units on hand', 160),
  pipeline: c('确认在途件数', 'Confirmed inbound units', 90),
  back: c('欠交件数', 'Backordered units', 15),
  fast: c('高频清点品种数', 'Frequent-count SKUs', 60),
  slow: c('低频清点品种数', 'Other SKUs', 180),
  fastFreq: c('高频品种每年清点次数', 'Frequent counts per SKU annually', 12),
  slowFreq: c('其他品种每年清点次数', 'Other counts per SKU annually', 3),
  days: c('年度工作日', 'Working days per year', 250, 1, 366),
  first: c('较早批次数量', 'Older lot units', 100),
  second: c('较新批次数量', 'Newer lot units', 160),
  firstCost: n('较早批次单位成本', 'Older lot unit cost', 12),
  secondCost: n('较新批次单位成本', 'Newer lot unit cost', 15),
  issue: c('本次出库件数', 'Issue quantity', 125),
  demand: c('待采购净需求', 'Net purchasing requirement', 140),
  minimum: c('最小起订量', 'Supplier minimum order', 100),
  pack: c('整箱件数', 'Units per case', 24, 1),
  annual: c('年度需求件数', 'Annual unit demand', 8000, 1),
  standard: n('常规采购单价', 'Standard purchase unit price', 18),
  discount: n('备选采购单价', 'Alternative purchase unit price', 16.5),
  freightA: n('常规方案年度运费', 'Annual freight under standard quote', 1200),
  freightB: n('备选方案年度运费', 'Annual freight under alternative quote', 3200),
  extra: n('备选方案额外年仓储费', 'Extra annual storage under alternative quote', 4000),
  setup: n('自制年度专属固定成本', 'Annual fixed cost specific to making', 28000),
  makeCost: n('自制单位变动成本', 'Unit variable cost to make', 11),
  consigned: c('期初及新收寄售件数', 'Consigned units available', 220),
  returned: c('已退还供应商件数', 'Units returned to supplier', 12),
  remain: c('期末寄存件数', 'Remaining consigned units', 90),
  settlement: n('寄售售出单位结算价', 'Remittance per consigned unit sold', 19),
  actualQty: c('实际采购数量', 'Actual purchase units', 160),
  fraction: p('主供份额', 'Primary supplier share', 70),
  delayed: p('主供预计延迟比例', 'Primary share delayed', 40),
  emergency: c('备用供应商额外可供件数', 'Extra units backup supplier can deliver', 20),
  outDays: n('预计断货天数', 'Projected stockout days', 4),
  substitute: p('会改买替代品的比例', 'Share switching to a substitute', 25),
  margin: n('流失每件贡献额', 'Contribution per forgone unit', 9),
  book: c('系统库存', 'Book units', 170),
  physical: c('盘点库存', 'Physical units', 160),
  expiry: c('到期前剩余可售天数', 'Selling days until expiry', 12, 1, 3650),
  profit: n('期间毛利润', 'Period gross profit', 26000, -1e10),
  average: n('同期平均库存成本', 'Average inventory at cost', 16000, 0.01),
  planSales: n('计划销售零售额', 'Planned retail sales', 35000),
  markdown: n('计划零售减价额', 'Planned retail markdowns', 1500),
  ending: n('计划期末零售库存', 'Planned ending inventory at retail', 20000),
  opening: n('期初零售库存', 'Opening inventory at retail', 22000),
  ordered: n('已订货零售金额', 'Outstanding orders at retail', 7000),
  finished: c('成品净需求', 'Required finished units', 600),
  per: c('每件成品所需部件数', 'Components per finished unit', 3, 1),
  yield: p('预期部件可用率', 'Expected usable component yield', 95, 0.01),
  componentA: c('甲部件库存', 'Component A on hand', 140),
  componentB: c('乙部件库存', 'Component B on hand', 80),
  reqA: c('每套甲部件数', 'Component A per kit', 3, 1),
  reqB: c('每套乙部件数', 'Component B per kit', 2, 1),
  invoice: n('整批商品货值', 'Merchandise invoice value', 5000),
  carriage: n('整批运保费', 'Freight and insurance', 750),
  duty: p('给定关税率', 'Specified duty rate', 5),
  handling: n('报关及处理费', 'Brokerage and handling', 120),
  carry: p('年度综合持有成本率', 'Annual inventory carrying rate', 18),
  period: n('持有月数', 'Holding period in months', 4),
});
export default [
  make(
    'fixed-lead-safety-stock',
    '固定提前期安全库存',
    'Fixed Lead-Time Safety Stock',
    '假设各日需求独立且提前期固定，按给定正态分位数向上取整安全库存。',
    'Estimate safety stock for independent daily demand and constant lead time using the supplied normal service quantile.',
    'deviation lead z',
    (deviation, lead, z) => ({
      leadTimeStandardDeviation: deviation * Math.sqrt(lead),
      safetyStockUnits: Math.ceil(z * deviation * Math.sqrt(lead)),
    }),
  ),
  make(
    'periodic-review-order-up-to',
    '周期复查补足库存',
    'Periodic Review Order-Up-To',
    '覆盖提前期和复查间隔，加目标缓冲，再扣除净库存位置。',
    'Cover demand through both lead time and review interval, then deduct on-hand and inbound stock net of backorders.',
    'daily lead review buffer stock pipeline back',
    (daily, lead, review, buffer, stock, pipeline, back) => {
      const target = Math.ceil(daily * (lead + review) + buffer),
        position = stock + pipeline - back;
      return { targetUnits: target, inventoryPosition: position, orderUnits: Math.max(0, target - position) };
    },
  ),
  make(
    'cycle-count-workload',
    '循环盘点每日工作量',
    'Cycle Count Workload',
    '按两个品种组的复盘次数计算全年清点行数和每日排程。',
    'Translate two SKU groups and annual count frequencies into yearly count lines and daily workload.',
    'fast fastFreq slow slowFreq days',
    (fast, a, slow, b, days) => ({
      annualSkuCounts: fast * a + slow * b,
      averageCountsPerWorkday: (fast * a + slow * b) / days,
    }),
  ),
  make(
    'weighted-average-stock-issue',
    '加权平均库存出库计价',
    'Weighted Average Stock Issue',
    '将两批库存合并为加权均价，核算本次出库及结存金额。',
    'Pool two stock lots at weighted-average cost before allocating the issue cost and residual inventory value.',
    'first firstCost second secondCost issue',
    (a, ac, b, bc, issue) => {
      subset(issue, a + b);
      const avg = divide(a * ac + b * bc, a + b);
      return { weightedUnitCost: avg, costIssued: issue * avg, remainingValue: (a + b - issue) * avg };
    },
  ),
  make(
    'fifo-lot-issue',
    '先进先出批次结转',
    'FIFO Lot Issue',
    '从最早批次开始出库，计算各批消耗和剩余成本。',
    'Consume the older lot first and show the quantity issued from each lot and the remaining inventory cost.',
    'first firstCost second secondCost issue',
    (a, ac, b, bc, issue) => {
      subset(issue, a + b);
      const old = Math.min(a, issue),
        recent = issue - old;
      return {
        olderUnits: old,
        newerUnits: recent,
        costIssued: old * ac + recent * bc,
        remainingValue: (a - old) * ac + (b - recent) * bc,
      };
    },
  ),
  make(
    'purchase-case-rounding',
    '最小起订与整箱取整',
    'Purchase Case Rounding',
    '将正净需求同时满足起订量及整箱倍数并计算超买量。',
    'Raise positive net demand to the supplier minimum and then round to a whole case, reporting excess units.',
    'demand minimum pack',
    (demand, minimum, pack) => {
      const cases = demand ? Math.ceil(Math.max(demand, minimum) / pack) : 0;
      return { cases, orderedUnits: cases * pack, excessUnits: cases * pack - demand };
    },
  ),
  make(
    'supplier-delivered-quote-comparison',
    '供应商年度到货成本比较',
    'Supplier Delivered Quote Comparison',
    '比较两个采购报价，计入年度运费及备选方案新增仓储成本。',
    'Compare annual delivered purchasing costs including freight and incremental alternative storage.',
    'annual standard discount freightA freightB extra',
    (units, a, b, freightA, freightB, extra) => ({
      standardAnnualCost: units * a + freightA,
      alternativeAnnualCost: units * b + freightB + extra,
      savingWithAlternative: units * (a - b) + freightA - freightB - extra,
    }),
  ),
  make(
    'make-buy-crossover',
    '自制或外购临界量',
    'Make or Buy Crossover',
    '以专属固定成本和单位节省估算自制首次不贵于外购的整件数。',
    'Find the minimum whole-unit volume at which internal production covers its extra fixed cost, and compare at annual demand.',
    'setup makeCost standard annual',
    (setup, makeCost, buy, units) => ({
      makeCost: setup + units * makeCost,
      buyCost: units * buy,
      crossoverUnits: buy > makeCost ? Math.ceil(setup / (buy - makeCost)) : setup === 0 ? 0 : null,
    }),
  ),
  make(
    'consignment-remittance',
    '寄售结算金额',
    'Consignment Remittance',
    '扣除未售库存及已退回件数，按实际售出的寄售件数结算。',
    'Reconcile consigned units available, returned and still held to the remittance due on sold units.',
    'consigned returned remain settlement',
    (available, returned, remain, price) => {
      const sold = available - subset(returned + remain, available);
      return { soldUnits: sold, remittanceDue: sold * price };
    },
  ),
  make(
    'purchase-price-variance',
    '采购价格差异',
    'Purchase Price Variance',
    '以实际采购量计算采购价偏离标准成本的金额，正值代表成本增加。',
    'Apply the difference between actual and standard prices to actual purchasing volume; a positive variance represents extra cost.',
    'actualQty standard discount',
    (units, standard, actual) => ({
      standardSpend: units * standard,
      actualSpend: units * actual,
      unfavorableVariance: units * (actual - standard),
    }),
  ),
  make(
    'dual-source-interruption-gap',
    '双供应源中断缺口',
    'Dual-Source Interruption Gap',
    '按主供份额和延误比例估算受影响件数，并计入备用供应商额外产能。',
    'Model disruption to the primary share of an order and deduct additional units available from a backup source.',
    'demand fraction delayed emergency',
    (demand, primary, delayed, backup) => {
      const exposed = Math.ceil((demand * primary * delayed) / 10000);
      return {
        delayedUnits: exposed,
        coveredByBackup: Math.min(exposed, backup),
        uncoveredUnits: Math.max(0, exposed - backup),
      };
    },
  ),
  make(
    'stockout-opportunity-cost',
    '断货贡献损失',
    'Stockout Opportunity Cost',
    '估算断货期需求，扣除站内替代购买后计算未实现贡献。',
    'Estimate stockout demand and forgone contribution, assuming customers switching to an in-house substitute retain equivalent contribution.',
    'daily outDays substitute margin',
    (daily, days, substitute, margin) => ({
      exposedDemand: daily * days,
      expectedLostUnits: daily * days * (1 - substitute / 100),
      lostContribution: daily * days * (1 - substitute / 100) * margin,
    }),
  ),
  make(
    'stock-count-adjustment',
    '实盘库存调整金额',
    'Stock Count Adjustment',
    '比较实盘与系统库存，按单位成本计算调账数量和金额。',
    'Compare physical count with book inventory and value the signed quantity correction at unit cost.',
    'book physical standard',
    (book, physical, cost) => ({
      adjustmentUnits: physical - book,
      adjustmentValue: (physical - book) * cost,
      shortageUnits: Math.max(0, book - physical),
    }),
  ),
  make(
    'expiry-sell-through-pace',
    '临期库存清货速度',
    'Expiry Sell-Through Pace',
    '根据剩余天数计算所需日销，并与当前销售速度比较。',
    'Find the daily sales pace needed to clear stock by expiry and project unsold units at the existing pace.',
    'stock expiry daily',
    (stock, days, daily) => ({
      requiredDailyUnits: stock / days,
      additionalDailyUnits: Math.max(0, stock / days - daily),
      expectedUnsold: Math.max(0, stock - daily * days),
    }),
  ),
  make(
    'inventory-margin-return',
    '库存毛利投资回报',
    'Inventory Margin Return',
    '同一期间内用毛利润衡量每单位平均库存成本取得的回报。',
    'Measure gross margin return on inventory investment by comparing period gross profit with average inventory at cost.',
    'profit average',
    (profit, inventory) => ({
      grossMarginReturnMultiple: profit / inventory,
      periodReturnPercent: (100 * profit) / inventory,
    }),
  ),
  make(
    'retail-open-to-buy',
    '零售采购可用额度',
    'Retail Open-to-Buy',
    '按零售价口径，从计划销售、减价和期末目标扣除期初库存与已订货。',
    'Calculate open-to-buy at retail by balancing planned sales, markdowns and ending stock against opening stock and orders.',
    'planSales markdown ending opening ordered',
    (sales, markdown, ending, opening, ordered) => ({
      plannedReceipts: sales + markdown + ending - opening,
      openToBuy: sales + markdown + ending - opening - ordered,
    }),
  ),
  make(
    'yield-adjusted-component-order',
    '考虑损耗的物料需求',
    'Yield-Adjusted Component Demand',
    '按成品需求及部件用量折算采购投入，按部件可用率补足损耗。',
    'Convert finished demand to component requirements and gross up for expected usable yield before rounding to whole pieces.',
    'finished per yield',
    (finished, per, yieldPct) => ({
      netComponents: finished * per,
      grossComponents: Math.ceil((finished * per * 100) / yieldPct),
    }),
  ),
  make(
    'two-part-kit-availability',
    '双部件套装可组数量',
    'Two-Part Kit Availability',
    '按两种部件的单位用量寻找限制件，并列出组装后余量。',
    'Calculate complete kits possible with two components and report remaining units of both after assembly.',
    'componentA reqA componentB reqB',
    (a, requiredA, b, requiredB) => {
      const kits = Math.min(Math.floor(a / requiredA), Math.floor(b / requiredB));
      return { completeKits: kits, leftoverA: a - kits * requiredA, leftoverB: b - kits * requiredB };
    },
  ),
  make(
    'import-landed-unit-cost',
    '进口单件到岸成本',
    'Import Landed Unit Cost',
    '按货值加运保费为给定关税基数，计入处理费并分摊至整批。',
    'Apply a supplied duty rate to merchandise plus freight and insurance, then spread handling and duty over purchased units.',
    'invoice carriage duty handling actualQty',
    (invoice, freight, rate, handling, quantity) => {
      const duty = ((invoice + freight) * rate) / 100,
        total = invoice + freight + duty + handling;
      return { duty, totalLandedCost: total, landedUnitCost: divide(total, quantity) };
    },
  ),
  make(
    'inventory-carrying-cost',
    '库存期间持有成本',
    'Inventory Carrying Cost',
    '按平均库存成本及年度综合费率，线性分摊到指定持有月份。',
    'Apply a combined annual carrying rate to average inventory cost for the stated fraction of a year.',
    'average carry period',
    (average, rate, months) => ({
      annualCost: (average * rate) / 100,
      periodCost: (((average * rate) / 100) * months) / 12,
    }),
  ),
];
