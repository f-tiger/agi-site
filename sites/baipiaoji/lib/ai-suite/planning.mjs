const limit = 1_000_000_000;
const cents = n => Number(n.toFixed(2));
const rounded = n => Number(n.toFixed(6));
const ratio = (numerator, denominator) => denominator === 0 ? null : rounded(numerator / denominator);
const pair = (zh, en) => ({zh, en});
const numeric = (key, zh, en, min = 0, max = limit, type = 'number') => ({
  key, label: pair(zh, en), type, min, max,
});
const integer = (key, zh, en, min = 0, max = limit) => numeric(key, zh, en, min, max, 'integer');
const str = (key, zh, en, maxLength, multiline = false) => ({
  key, label: pair(zh, en), type: 'string', maxLength, multiline,
});
function define(id, title, description, inputs, example, calculate) {
  return {
    id, title, description, inputs, example,
    run(args) {
      for (const input of inputs) {
        const value = args?.[input.key];
        if (input.type === 'string') {
          if (typeof value !== 'string' || !value.trim() || value.length > input.maxLength) {
            throw Error('A text input is blank, invalid, or too long.');
          }
        } else if (!Number.isFinite(value) || value < input.min || value > input.max ||
          (input.type === 'integer' && !Number.isInteger(value))) {
          throw Error('A numeric input is outside its permitted range or format.');
        }
      }
      return calculate(args);
    },
  };
}
const amount = (key, zh, en, min = 0) => numeric(key, zh, en, min);
const percent = (key, zh, en, min = 0, max = 100) => numeric(key, zh, en, min, max);
const lines = value => value.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const DAY = 86_400_000;

function dateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0, 4) < '1900') {
    throw Error('Use a valid date in YYYY-MM-DD format (1900 or later).');
  }
  const timestamp = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw Error('Use a valid date in YYYY-MM-DD format (1900 or later).');
  }
  return timestamp;
}
function displayDate(timestamp) {
  const value = new Date(timestamp).toISOString().split('T')[0];
  if (value.startsWith('+') || value.startsWith('-')) throw Error('The result is outside the supported date range.');
  return value;
}
function minutes(value) {
  if (value === '24:00') return 1440;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw Error('Use 24-hour HH:MM time.');
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
function displayTime(value) {
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}
function parseWeights(text, maxCount) {
  const rows = lines(text).map(line => line.split('|').map(value => value.trim()));
  const names = new Set(rows.map(row => row[0]));
  if (rows.length < 2 || rows.length > maxCount || names.size !== rows.length ||
    rows.some(([name, weight, extra]) => extra !== undefined || !name || name.length > 100 ||
      !/^\d+(?:\.\d+)?$/.test(weight || '') || !Number.isFinite(Number(weight)) || Number(weight) > limit)) {
    throw Error('Use unique name|weight rows with nonnegative numbers and the specified row limit.');
  }
  const weights = rows.map(([name, value]) => ({name, weight: Number(value)}));
  if (weights.every(row => row.weight === 0)) throw Error('At least one weight must be positive.');
  return weights;
}

function schedule(tasks) {
  const rows = lines(tasks).map(line => line.split('|').map(value => value.trim()));
  const byId = new Map();
  if (!rows.length || rows.length > 60) throw Error('Provide 1 to 60 tasks.');
  for (const [id, duration, dependencyList = '', extra] of rows) {
    if (extra !== undefined || !/^[A-Za-z0-9_-]{1,40}$/.test(id) || byId.has(id) ||
      !/^\d+$/.test(duration || '') || Number(duration) < 1 || Number(duration) > 3650) {
      throw Error('Use unique id|positive whole days|comma-separated dependency rows.');
    }
    byId.set(id, {
      id, duration: Number(duration), dependencies: [...new Set(dependencyList.split(',').map(s => s.trim()).filter(Boolean))],
    });
  }
  const ordered = [];
  const pending = new Set(byId.keys());
  while (pending.size) {
    const before = pending.size;
    for (const id of pending) {
      const task = byId.get(id);
      if (!task.dependencies.every(dependency => byId.has(dependency))) {
        throw Error('A dependency does not match a task ID.');
      }
      if (task.dependencies.some(dependency => pending.has(dependency))) continue;
      task.start = Math.max(0, ...task.dependencies.map(dependency => byId.get(dependency).finish));
      task.finish = task.start + task.duration;
      ordered.push(task);
      pending.delete(id);
    }
    if (before === pending.size) throw Error('The dependencies contain a cycle.');
  }
  const duration = Math.max(...ordered.map(task => task.finish));
  for (const task of [...ordered].reverse()) {
    task.latestFinish = Math.min(duration, ...ordered.filter(other => other.dependencies.includes(task.id))
      .map(other => other.latestFinish - other.duration));
  }
  return {
    projectDays: duration,
    criticalTasks: ordered.filter(task => task.latestFinish === task.finish).map(task => task.id),
    schedule: ordered.map(task => ({
      id: task.id, startDay: task.start, finishDayExclusive: task.finish, slackDays: task.latestFinish - task.finish,
    })),
  };
}

export const tools = [
  define('gross-margin',
    pair('毛利与毛利率', 'Gross Margin'),
    pair('用营收与直接成本计算毛利润、毛利率和成本加价率。', 'Calculate gross profit, gross margin, and markup from revenue and direct costs.'),
    [amount('revenue', '营收', 'Revenue', 0.01), amount('cost', '直接成本', 'Direct cost')],
    {revenue: 12500, cost: 8100},
    ({revenue, cost}) => ({grossProfit: cents(revenue - cost), marginPercent: ratio(100 * (revenue - cost), revenue),
      markupPercent: ratio(100 * (revenue - cost), cost)})),

  define('break-even-units',
    pair('盈亏平衡销量', 'Break-Even Units'),
    pair('按固定成本、单件价格和变动成本计算最低销量与营收。', 'Find the minimum whole units needed to cover fixed costs at a given price and variable unit cost.'),
    [amount('fixedCost', '固定成本', 'Fixed cost'), amount('price', '单件价格', 'Unit price', 0.01),
      amount('unitCost', '单件变动成本', 'Variable cost per unit')],
    {fixedCost: 12000, price: 49, unitCost: 19},
    ({fixedCost, price, unitCost}) => {
      const contribution = rounded(price - unitCost);
      if (contribution <= 0) throw Error('Unit price must exceed variable cost.');
      const exact = fixedCost / contribution;
      const units = Math.ceil(exact - Number.EPSILON * Math.abs(exact));
      return {contributionPerUnit: contribution, minimumUnits: units, revenueAtMinimumUnits: cents(units * price)};
    }),

  define('cash-runway',
    pair('现金可维持月份', 'Cash Runway'),
    pair('用现金余额和每月收入支出估算现金耗尽时间。', 'Estimate months of runway from a cash balance and constant monthly income and spending.'),
    [amount('cash', '可用现金', 'Cash on hand'), amount('inflow', '月现金流入', 'Monthly cash inflow'),
      amount('outflow', '月现金流出', 'Monthly cash outflow')],
    {cash: 98000, inflow: 12000, outflow: 26000},
    ({cash, inflow, outflow}) => {
      const monthlyBurn = rounded(outflow - inflow);
      return {monthlyNetBurn: monthlyBurn, runwayMonths: monthlyBurn > 0 ? rounded(cash / monthlyBurn) : null,
        burnsCash: monthlyBurn > 0};
    }),

  define('customer-ltv-cac',
    pair('客户终身价值与获客成本', 'Customer LTV and CAC'),
    pair('用月收入、毛利和稳定月流失率估算客户终身贡献与获客回本。', 'Estimate contribution LTV and acquisition payback assuming constant monthly churn, revenue, and gross margin.'),
    [amount('monthlyRevenue', '每客户月收入', 'Monthly revenue per customer', 0.01),
      percent('margin', '毛利率 %', 'Gross margin %', 0.01), percent('churn', '月流失率 %', 'Monthly churn %', 0.01),
      amount('acquisitionCost', '单客获客成本', 'Acquisition cost per customer', 0.01)],
    {monthlyRevenue: 50, margin: 80, churn: 4, acquisitionCost: 180},
    ({monthlyRevenue, margin, churn, acquisitionCost}) => {
      const contribution = monthlyRevenue * margin / 100;
      const ltv = contribution / (churn / 100);
      return {contributionLtv: cents(ltv), ltvToCac: rounded(ltv / acquisitionCost),
        simplePaybackMonths: rounded(acquisitionCost / contribution)};
    }),

  define('funnel-backsolve',
    pair('转化漏斗目标倒推', 'Conversion Funnel Backsolve'),
    pair('按各阶段转化率倒推出满足最终转化目标所需的流量。', 'Backsolve the minimum estimated volume at each stage for a target conversion count.'),
    [integer('target', '目标转化数', 'Target conversions', 1),
      str('rates', '按阶段顺序填写转化率（每行一个百分数，不带 %，最多 8 行）',
        'Conversion rates in stage order (one percentage per line, no %, max 8)', 160, true)],
    {target: 20, rates: '40\n25\n10'},
    ({target, rates}) => {
      const values = lines(rates);
      if (values.length > 8 || values.some(rate =>
        !/^\d+(?:\.\d+)?$/.test(rate) || Number(rate) < 0.01 || Number(rate) > 100)) {
        throw Error('Provide up to eight stage percentages between 0.01 and 100.');
      }
      const stageInputs = [];
      let required = target;
      for (const value of values.reverse()) {
        required = Math.ceil((required * 100) / Number(value));
        if (!Number.isSafeInteger(required)) throw Error('The requested funnel exceeds the supported size.');
        stageInputs.unshift({conversionPercent: Number(value), requiredInputs: required});
      }
      return {target, stageInputs};
    }),

  define('period-growth',
    pair('多期增长率', 'Multi-Period Growth'),
    pair('查看总变化、总增长率及每期复合增长率。', 'Compare starting and ending values and calculate compound growth per period.'),
    [amount('start', '起始值', 'Starting value', 0.000001), amount('end', '末期值', 'Ending value'),
      integer('periods', '期数', 'Number of periods', 1, 1200)],
    {start: 32000, end: 54000, periods: 4},
    ({start, end, periods}) => ({absoluteChange: rounded(end - start), totalGrowthPercent: rounded((end / start - 1) * 100),
      compoundGrowthPerPeriodPercent: rounded((Math.pow(end / start, 1 / periods) - 1) * 100)})),

  define('compound-growth-plan',
    pair('定期追加与复合增长', 'Compound Growth with Contributions'),
    pair('模拟每期先增长、期末再追加的余额变化。', 'Project the balance with periodic growth followed by an end-of-period contribution.'),
    [amount('opening', '起始余额', 'Opening balance'), amount('contribution', '每期期末追加额', 'End-of-period contribution'),
      percent('rate', '每期增长率 %', 'Growth per period %', -50, 100), integer('periods', '期数', 'Number of periods', 1, 120)],
    {opening: 5000, contribution: 250, rate: 0.5, periods: 24},
    ({opening, contribution, rate, periods}) => {
      let balance = opening;
      const timeline = [];
      for (let period = 1; period <= periods; period++) {
        balance = balance * (1 + rate / 100) + contribution;
        timeline.push({period, closingBalance: cents(balance)});
      }
      const contributed = opening + periods * contribution;
      return {endingBalance: cents(balance), totalContributed: cents(contributed), totalGrowth: cents(balance - contributed), timeline};
    }),

  define('proportional-budget',
    pair('预算按权重分摊', 'Proportional Budget Allocation'),
    pair('把总额按权重分配到各项目，分配结果精确加总到分。', 'Allocate a budget by weights, rounding with largest remainders so the shares sum to the total cents.'),
    [amount('total', '预算总额', 'Total budget'),
      str('weights', '项目|权重（每行一项，最多 50 行）', 'Name|weight (one per line, max 50)', 4200, true)],
    {total: 1000, weights: 'Design|2\nBuild|5\nQA|3'},
    ({total, weights}) => {
      const rows = parseWeights(weights, 50);
      const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
      const totalCents = Math.round(Number(total.toFixed(2)) * 100);
      const shares = rows.map(row => {
        const ideal = totalCents * (row.weight / totalWeight);
        return {name: row.name, units: Math.floor(ideal), remainder: ideal % 1};
      });
      const unused = totalCents - shares.reduce((sum, row) => sum + row.units, 0);
      const ranked = [...shares].sort((a, b) => b.remainder - a.remainder);
      if (unused < 0 || unused > ranked.length) throw Error('The weights are outside the supported precision.');
      for (const row of ranked.slice(0, unused)) row.units++;
      return {total: totalCents / 100, allocations: shares.map(row => ({name: row.name, amount: row.units / 100}))};
    }),

  define('sprint-capacity',
    pair('迭代可用工时', 'Sprint Capacity'),
    pair('从团队总工时扣除缺勤、例行事务和缓冲，得到可承诺工时。', 'Estimate sprint hours available for delivery after team absence, recurring duties, and a contingency reserve.'),
    [integer('people', '人数', 'Team members', 1, 1000), integer('days', '工作天数', 'Working days', 1, 90),
      numeric('hoursPerDay', '每人每天工作小时', 'Hours per person per day', 0.25, 24),
      amount('absence', '团队缺勤小时合计', 'Team absence hours'),
      amount('overhead', '例行事务小时合计', 'Recurring overhead hours'),
      percent('reserve', '缓冲比例 %', 'Contingency %')],
    {people: 5, days: 10, hoursPerDay: 8, absence: 32, overhead: 48, reserve: 15},
    ({people, days, hoursPerDay, absence, overhead, reserve}) => {
      const gross = people * days * hoursPerDay;
      if (absence + overhead > gross) throw Error('Absence and overhead cannot exceed total team hours.');
      const net = gross - absence - overhead;
      return {grossHours: rounded(gross), reserveHours: rounded(net * reserve / 100),
        deliveryHours: rounded(net * (1 - reserve / 100))};
    }),

  define('business-day-offset',
    pair('工作日日期推算', 'Business Day Offset'),
    pair('按周一至周五向前或向后移动日期。可填跳过的节假日，起始日不计。', 'Add or subtract weekdays, excluding listed holidays and the starting day.'),
    [str('start', '起始日期 YYYY-MM-DD', 'Start date YYYY-MM-DD', 10),
      integer('offset', '工作日偏移量（可为负数）', 'Business days to move (can be negative)', -2600, 2600),
      str('holidays', '节假日每行一个 YYYY-MM-DD，没有填 none', 'Holidays one YYYY-MM-DD per line, or none', 1200, true)],
    {start: '2026-11-20', offset: 3, holidays: '2026-11-23'},
    ({start, offset, holidays}) => {
      const exclusions = new Set(holidays.trim().toLowerCase() === 'none' ? [] : lines(holidays).map(dateOnly));
      let current = dateOnly(start);
      const step = Math.sign(offset);
      let remaining = Math.abs(offset);
      while (remaining > 0) {
        current += step * DAY;
        const day = new Date(current).getUTCDay();
        if (day > 0 && day < 6 && !exclusions.has(current)) remaining--;
      }
      return {date: displayDate(current), calendarDayOffset: (current - dateOnly(start)) / DAY};
    }),

  define('time-window-overlap',
    pair('同日时间段交集', 'Same-Day Time Window Overlap'),
    pair('比较同一时区的两段同日时间，找出重叠区间与分钟数。', 'Find the overlap of two same-day time windows in one time zone.'),
    [str('startA', '时段 A 开始 HH:MM', 'Window A start HH:MM', 5), str('endA', '时段 A 结束 HH:MM', 'Window A end HH:MM', 5),
      str('startB', '时段 B 开始 HH:MM', 'Window B start HH:MM', 5), str('endB', '时段 B 结束 HH:MM', 'Window B end HH:MM', 5)],
    {startA: '09:00', endA: '12:15', startB: '11:30', endB: '14:30'},
    ({startA, endA, startB, endB}) => {
      const [a, aEnd, b, bEnd] = [startA, endA, startB, endB].map(minutes);
      if (a >= aEnd || b >= bEnd) throw Error('Each window must end after it starts on the same day.');
      const start = Math.max(a, b), end = Math.min(aEnd, bEnd);
      return {overlapMinutes: Math.max(0, end - start), start: end > start ? displayTime(start) : null,
        end: end > start ? displayTime(end) : null};
    }),

  define('meeting-labor-cost',
    pair('会议总工时与人力成本', 'Recurring Meeting Cost'),
    pair('用参与人数、会议时长和准备时间估算重复会议的总成本。', 'Calculate participant-hours and labor cost for recurring meetings, including preparation.'),
    [integer('participants', '每次人数', 'People per meeting', 1, 5000),
      integer('count', '开会次数', 'Meetings in period', 1, 1000),
      integer('meetingMinutes', '会议分钟数', 'Meeting minutes', 1, 1440),
      integer('preparationMinutes', '每人会前准备分钟数', 'Preparation minutes per person', 0, 1440),
      amount('hourlyCost', '每人平均每小时成本', 'Average cost per labor hour')],
    {participants: 7, count: 4, meetingMinutes: 45, preparationMinutes: 10, hourlyCost: 55},
    ({participants, count, meetingMinutes, preparationMinutes, hourlyCost}) => {
      const hours = participants * (meetingMinutes + preparationMinutes) / 60;
      return {laborHoursPerMeeting: rounded(hours), laborHoursTotal: rounded(hours * count),
        costPerMeeting: cents(hours * hourlyCost), totalCost: cents(hours * count * hourlyCost)};
    }),

  define('rice-priority',
    pair('RICE 优先级计算', 'RICE Priority Score'),
    pair('将覆盖人数、影响系数、置信度和人月投入合成可比较的优先级。', 'Calculate a comparable RICE score using reach, impact, confidence and person-months of effort.'),
    [integer('reach', '同周期覆盖人数', 'Reach in the same period'),
      numeric('impact', '影响系数（0–3）', 'Impact multiplier (0–3)', 0, 3),
      percent('confidence', '置信度 %', 'Confidence %'), numeric('effort', '投入人月', 'Effort in person-months', 0.01, 100000)],
    {reach: 1500, impact: 1.5, confidence: 80, effort: 3},
    ({reach, impact, confidence, effort}) => ({riceScore: rounded(reach * impact * confidence / (100 * effort))})),

  define('weighted-choice',
    pair('多方案加权评分', 'Weighted Decision Matrix'),
    pair('用同一组指标权重为多个方案加权排序。同行分数和权重按相同顺序填写。', 'Rank alternatives against weighted criteria. Enter each row in the same criterion order.'),
    [str('criteria', '指标|权重（每行一个，最多 12 个）', 'Criterion|weight (one per line, max 12)', 1500, true),
      str('options', '方案|逗号分隔的 0–10 分（每行一个，最多 20 个）',
        'Option|comma-separated scores 0–10 (one per line, max 20)', 2400, true)],
    {criteria: 'Ease|3\nReliability|7', options: 'A|9,7\nB|6,9'},
    ({criteria, options}) => {
      const weights = parseWeights(criteria, 12);
      const normalizer = weights.reduce((sum, row) => sum + row.weight, 0);
      const rows = lines(options).map(line => line.split('|').map(s => s.trim()));
      const names = new Set(rows.map(row => row[0]));
      if (rows.length < 2 || rows.length > 20 || names.size !== rows.length) {
        throw Error('Provide 2 to 20 uniquely named options.');
      }
      const ranked = rows.map(([name, scoreList, extra]) => {
        const scores = scoreList?.split(',').map(score => score.trim()) || [];
        if (extra !== undefined || !name || name.length > 100 || scores.length !== weights.length ||
          scores.some(score => !/^\d+(?:\.\d+)?$/.test(score) || Number(score) > 10)) {
          throw Error('Each option must supply one score from 0 to 10 per criterion.');
        }
        return {name, score: rounded(scores.reduce((sum, value, i) => sum + Number(value) * weights[i].weight, 0) / normalizer)};
      });
      ranked.sort((a, b) => b.score - a.score);
      return {ranking: ranked, tiedForFirst: ranked.filter(row => row.score === ranked[0].score).map(row => row.name)};
    }),

  define('earned-value',
    pair('项目挣值分析', 'Earned Value Analysis'),
    pair('用计划价值、挣值与实际成本计算进度偏差、成本偏差和两项绩效指数。', 'Calculate schedule and cost variance and performance indices from planned value, earned value, and actual cost.'),
    [amount('planned', '计划价值', 'Planned value'), amount('earned', '挣值', 'Earned value'),
      amount('actual', '实际成本', 'Actual cost')],
    {planned: 40000, earned: 34000, actual: 38200},
    ({planned, earned, actual}) => ({scheduleVariance: cents(earned - planned), costVariance: cents(earned - actual),
      schedulePerformanceIndex: ratio(earned, planned), costPerformanceIndex: ratio(earned, actual)})),

  define('pert-estimate',
    pair('PERT 三点工期估算', 'PERT Three-Point Estimate'),
    pair('按乐观、最可能和悲观三个工期计算 PERT 加权估算和离散程度。', 'Calculate the PERT weighted duration and spread from optimistic, most likely, and pessimistic durations.'),
    [numeric('optimistic', '乐观工期', 'Optimistic duration', 0, 1000000),
      numeric('likely', '最可能工期', 'Most likely duration', 0, 1000000),
      numeric('pessimistic', '悲观工期', 'Pessimistic duration', 0, 1000000)],
    {optimistic: 4, likely: 8, pessimistic: 16},
    ({optimistic, likely, pessimistic}) => {
      if (optimistic > likely || likely > pessimistic) throw Error('Durations must be in optimistic, likely, pessimistic order.');
      const deviation = (pessimistic - optimistic) / 6;
      return {weightedDuration: rounded((optimistic + 4 * likely + pessimistic) / 6),
        standardDeviation: rounded(deviation), variance: rounded(deviation ** 2)};
    }),

  define('inventory-reorder-point',
    pair('库存补货点', 'Inventory Reorder Point'),
    pair('按平均日销量、补货提前期、安全库存和在途订单判断是否需要下单。', 'Compare inventory position with expected lead-time demand and safety stock to flag a reorder.'),
    [numeric('dailyDemand', '平均每天销售件数', 'Average units sold per day'),
      numeric('leadTime', '提前期天数', 'Lead time in days', 0, 3650),
      integer('safetyStock', '安全库存件数', 'Safety stock units'), integer('inStock', '现有库存', 'On-hand units'),
      integer('onOrder', '在途库存', 'Units on order'), integer('backorder', '欠交件数', 'Backordered units')],
    {dailyDemand: 16, leadTime: 7, safetyStock: 40, inStock: 80, onOrder: 50, backorder: 4},
    ({dailyDemand, leadTime, safetyStock, inStock, onOrder, backorder}) => {
      const leadTimeDemand = dailyDemand * leadTime;
      const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);
      const inventoryPosition = inStock + onOrder - backorder;
      return {leadTimeDemand: rounded(leadTimeDemand), reorderPoint, inventoryPosition, reorder: inventoryPosition <= reorderPoint};
    }),

  define('inventory-order-quantity',
    pair('经济订货批量', 'Economic Order Quantity'),
    pair('按年需求、每次订货成本和单位年持有成本估算经济订货批量。适用于稳定需求且无阶梯折扣。', 'Estimate the economic order quantity for steady demand, fixed order cost, and no quantity discounts.'),
    [amount('annualDemand', '年需求量', 'Annual unit demand', 1),
      amount('orderCost', '每次订货成本', 'Cost per order', 0.01),
      amount('holdingCost', '单位年持有成本', 'Annual holding cost per unit', 0.01)],
    {annualDemand: 12000, orderCost: 35, holdingCost: 2.5},
    ({annualDemand, orderCost, holdingCost}) => {
      const optimal = Math.sqrt(2 * annualDemand * orderCost / holdingCost);
      const lower = Math.max(1, Math.floor(optimal)), upper = Math.ceil(optimal);
      const cost = units => annualDemand / units * orderCost + units / 2 * holdingCost;
      const quantity = cost(lower) <= cost(upper) ? lower : upper;
      return {recommendedUnits: quantity, estimatedOrdersPerYear: rounded(annualDemand / quantity),
        estimatedAnnualOrderingAndHoldingCost: cents(cost(quantity))};
    }),

  define('conversion-confidence',
    pair('转化率置信区间', 'Conversion Rate Confidence Interval'),
    pair('用成功数和样本量计算 95% Wilson 区间，适用于独立二元观测。', 'Compute a 95% Wilson confidence interval for a conversion rate from independent binary observations.'),
    [integer('successes', '成功次数', 'Successes'), integer('trials', '样本数', 'Trials', 1)],
    {successes: 18, trials: 240},
    ({successes, trials}) => {
      if (successes > trials) throw Error('Successes cannot exceed trials.');
      const p = successes / trials, z = 1.95996398454, z2 = z * z;
      const center = (p + z2 / (2 * trials)) / (1 + z2 / trials);
      const halfWidth = z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials ** 2)) / (1 + z2 / trials);
      return {observedPercent: rounded(100 * p), lower95Percent: rounded(100 * Math.max(0, center - halfWidth)),
        upper95Percent: rounded(100 * Math.min(1, center + halfWidth))};
    }),

  define('survey-sample-size',
    pair('比例调查样本量', 'Proportion Survey Sample Size'),
    pair('用估计比例和允许误差，按 95% 置信水平估算简单随机抽样的样本量。', 'Estimate the size of a simple random sample for an expected proportion and a 95% margin of error.'),
    [percent('expectedPercent', '预期比例 %，未知填 50', 'Expected proportion %, use 50 if unknown', 0.01, 99.99),
      percent('marginPoints', '允许误差（百分点）', 'Margin of error (percentage points)', 0.01, 49.99),
      integer('population', '总体人数，未知填 0', 'Population size, or 0 if unknown')],
    {expectedPercent: 50, marginPoints: 5, population: 2500},
    ({expectedPercent, marginPoints, population}) => {
      const p = expectedPercent / 100, error = marginPoints / 100;
      const base = 1.95996398454 ** 2 * p * (1 - p) / error ** 2;
      return {sampleSize: Math.ceil(population ? base / (1 + (base - 1) / population) : base),
        usesFinitePopulationCorrection: population > 0};
    }),

  define('fixed-loan-payment',
    pair('固定利率等额月供', 'Fixed-Rate Loan Payment'),
    pair('按固定年利率和期限估算等额月供及总利息，未计手续费。', 'Estimate fixed monthly loan payments and total interest using a nominal annual rate, excluding fees.'),
    [amount('principal', '借款本金', 'Principal', 0.01), percent('annualRate', '名义年利率 %', 'Nominal annual rate %'),
      integer('months', '还款月数', 'Term in months', 1, 600)],
    {principal: 120000, annualRate: 4.5, months: 120},
    ({principal, annualRate, months}) => {
      const rate = annualRate / 1200;
      const payment = rate ? principal * rate / -Math.expm1(-months * Math.log1p(rate)) : principal / months;
      return {monthlyPayment: cents(payment), totalPayments: cents(payment * months), totalInterest: cents(payment * months - principal)};
    }),

  define('reverse-sales-tax',
    pair('含税价拆分', 'Tax-Inclusive Price Split'),
    pair('按指定税率从含税价倒推税前价和税额。', 'Back out the pre-tax amount and tax from a gross price and a user-supplied tax rate.'),
    [amount('gross', '含税总价', 'Tax-inclusive amount'), percent('rate', '税率 %', 'Tax rate %')],
    {gross: 108.25, rate: 8.25},
    ({gross, rate}) => {
      const net = cents(gross / (1 + rate / 100));
      return {gross: cents(gross), netBeforeTax: net, tax: cents(cents(gross) - net)};
    }),

  define('invoice-due-date',
    pair('发票付款日与早付折扣', 'Invoice Due Date and Early Discount'),
    pair('按发票日期和日历日账期计算截止日期、早付折扣及付款额。', 'Apply calendar-day invoice terms and an early-payment discount to calculate deadlines and amounts.'),
    [str('issued', '发票日期 YYYY-MM-DD', 'Invoice date YYYY-MM-DD', 10),
      integer('netDays', '账期天数', 'Net days', 0, 730),
      integer('discountDays', '折扣期限天数', 'Discount window days', 0, 730),
      percent('discount', '早付折扣 %', 'Early-payment discount %'), amount('total', '发票总额', 'Invoice total')],
    {issued: '2026-11-20', netDays: 30, discountDays: 10, discount: 2, total: 1500},
    ({issued, netDays, discountDays, discount, total}) => {
      if (discountDays > netDays) throw Error('The discount deadline must be on or before the due date.');
      const date = dateOnly(issued);
      const earlyAmount = cents(total * (1 - discount / 100));
      return {dueDate: displayDate(date + netDays * DAY),
        discountDeadline: displayDate(date + discountDays * DAY), standardAmountDue: cents(total),
        amountDueWithDiscount: earlyAmount, discountSavings: cents(cents(total) - earlyAmount)};
    }),

  define('campaign-break-even-roas',
    pair('广告投放回本测算', 'Campaign Break-Even ROAS'),
    pair('对比实际与盈亏平衡广告回报，使用扣除变动成本后的贡献率。', 'Compare campaign ROAS with break-even ROAS using the contribution margin before ad spend.'),
    [amount('sales', '归因营收', 'Attributed revenue'), amount('adSpend', '广告花费', 'Ad spend', 0.01),
      percent('contributionMargin', '投放前贡献率 %', 'Contribution margin before ads %', 0.01)],
    {sales: 7800, adSpend: 2500, contributionMargin: 43},
    ({sales, adSpend, contributionMargin}) => {
      const contribution = contributionMargin / 100;
      return {revenueToSpend: rounded(sales / adSpend), breakEvenRevenueToSpend: rounded(1 / contribution),
        contributionAfterAdSpend: cents(sales * contribution - adSpend),
        revenueNeededToBreakEven: cents(adSpend / contribution)};
    }),

  define('schedule-critical-path',
    pair('项目依赖与关键路径', 'Project Critical Path'),
    pair('为最多 60 个有前置依赖的任务计算最早可行排程、总工期和浮动时间。', 'Compute the earliest schedule, project duration, and slack for up to 60 tasks with finish-to-start dependencies.'),
    [str('tasks', '任务ID|整数天数|逗号分隔的前置任务ID（每行一个，最多 60 行）',
      'Task ID|whole days|comma-separated predecessor IDs (one per line, max 60)', 5000, true)],
    {tasks: 'brief|2|\ndesign|4|brief\nbuild|7|design\ncopy|2|brief\nlaunch|1|build,copy'},
    ({tasks}) => schedule(tasks)),
];
