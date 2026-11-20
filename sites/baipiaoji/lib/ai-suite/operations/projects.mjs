import { number as n, count as c, percent as p, divide, subset, requireThat, toolBuilder } from './core.mjs';
const make = toolBuilder({
  v1: n('前三轮最早一轮完成点数', 'Completed points three iterations ago', 20),
  v2: n('上上轮完成点数', 'Completed points two iterations ago', 24),
  v3: n('上轮完成点数', 'Last iteration completed points', 28),
  budget: n('完工预算', 'Budget at completion', 100000, 0.01),
  earned: n('累计挣值', 'Earned value to date', 45000, 0.01),
  actual: n('累计实际成本', 'Actual cost to date', 53000, 0.01),
  target: n('允许的完工总成本', 'Target total completion cost', 105000, 0.01),
  scope: n('待完成工作点数', 'Backlog points remaining', 100),
  days: c('剩余工作日', 'Remaining working days', 8, 1, 3660),
  done: n('今日实际完成点数', 'Points actually completed today', 15),
  baseline: n('原范围工作量（小时）', 'Baseline scope (hours)', 460, 0.01),
  changed: n('净新增工时（可负）', 'Net scope change in hours', 75, -1e10),
  capacity: n('团队日交付工时', 'Team delivery hours per workday', 25, 0.01),
  probability: p('风险发生概率', 'Risk probability', 25),
  impact: n('风险发生后的额外支出', 'Incremental cost if event occurs', 30000),
  mitigated: p('缓解后的风险概率', 'Probability after mitigation', 8),
  prevention: n('风险缓解支出', 'Mitigation expense', 3000),
  weeks: n('推迟周数', 'Delay in weeks', 3),
  weekly: n('每周延误损失贡献', 'Contribution lost per week of delay', 2400),
  penalty: n('一次性延期罚金', 'One-time delay penalty', 800),
  business: n('业务价值分', 'Relative business value', 8),
  urgency: n('时间敏感分', 'Relative time criticality', 5),
  opportunity: n('降险或机会分', 'Risk reduction or opportunity score', 3),
  size: n('相对工作量分', 'Relative job size', 4, 0.01),
  normalDays: n('常规工期（天）', 'Normal duration in days', 12, 0.01),
  crashDays: n('赶工工期（天）', 'Crash duration in days', 8),
  normal: n('常规直接成本', 'Normal direct cost', 5000),
  crash: n('赶工直接成本', 'Crash direct cost', 7200),
  buffer: n('配置的项目缓冲天数', 'Allocated project buffer days', 10, 0.01),
  consumed: n('已用缓冲天数', 'Buffer days consumed', 4),
  progress: p('关键链完成比例', 'Critical chain completion', 60, 0.01),
  reserve: n('批准应急预算', 'Approved contingency reserve', 12000),
  draws: n('已支取应急金额', 'Contingency already drawn', 3500),
  pending: n('新申请的应急金额', 'Proposed contingency draw', 4000),
  contract: n('合同总价', 'Contract value', 150000, 0.01),
  completed: p('本次累计验收比例', 'Cumulative certified completion', 40),
  before: p('此前累计验收比例', 'Previously certified completion', 25),
  retention: p('履约保留金比例', 'Retention withheld', 10),
  bill: n('截至本期累计已开票', 'Cumulative billings to date', 70000),
  scheduled: n('预计总体投入成本', 'Forecast final cost', 125000, 0.01),
  authorized: n('工时材料合同总上限', 'Time-and-materials contract cap', 65000),
  prior: n('已开票占用额度', 'Previously billed against cap', 52000),
  hours: n('本期可计费小时', 'Billable hours in period', 120),
  rate: n('合同小时费率', 'Contract rate per hour', 90),
  expenses: n('本期可报销材料费', 'Reimbursable period materials', 4500),
  reimbursable: n('合同允许的成本', 'Allowable incurred cost', 38000),
  fee: p('按成本计的管理费率', 'Fee rate on allowable cost', 12),
  feeCap: n('管理费上限', 'Maximum service fee', 4000),
  targetCost: n('目标成本', 'Target cost', 55000),
  targetFee: n('目标酬金', 'Target fee', 6500),
  share: p('承包方承担的偏差比例', 'Contractor share of variance', 30),
  minFee: n('最低酬金', 'Minimum fee', 2000),
  maxFee: n('最高酬金', 'Maximum fee', 9000),
  pool: n('预算制造间接费', 'Budgeted overhead pool', 90000),
  activity: n('预算工时', 'Budgeted activity hours', 6000, 0.01),
  incurred: n('本期实际间接费', 'Actual period overhead incurred', 7200),
  used: n('本期实际工时', 'Actual period activity hours', 500),
  labor: n('报价预计人力成本', 'Quoted labor cost', 28000),
  materials: n('报价材料成本', 'Quoted materials cost', 4500),
  contingency: p('成本缓冲', 'Cost contingency', 10),
  margin: p('目标报价利润率', 'Target profit margin on quoted revenue', 25, 0, 99.99),
  divider: n('两项目共享资源每周工时', 'Shared resource weekly capacity', 40),
  workA: n('甲项目本周需求小时', 'Project A hours this week', 26),
  workB: n('乙项目本周需求小时', 'Project B hours this week', 22),
  baselineCost: n('已批准基线成本', 'Approved baseline cost', 80000),
  approved: n('已批准变更金额（可负）', 'Approved scope cost changes', 12000, -1e10),
  committed: n('尚未入账履约承诺', 'Open commitments excluding booked costs', 25000),
});
export default [
  make(
    'cost-performance-completion-forecast',
    '成本绩效完工预测',
    'Cost Performance Completion Forecast',
    '假设剩余工作保持当前成本效率，预测完工成本及超支额。',
    'Project final cost assuming the remaining work continues at the cumulative cost performance index.',
    'budget earned actual',
    (budget, earned, actual) => {
      subset(earned, budget);
      const cpi = earned / actual,
        eac = actual + (budget - earned) / cpi;
      return {
        costPerformanceIndex: cpi,
        estimateToComplete: eac - actual,
        estimateAtCompletion: eac,
        forecastOverrun: eac - budget,
      };
    },
  ),
  make(
    'to-complete-performance-index',
    '剩余工作所需绩效',
    'To-Complete Performance Index',
    '用未完成的预算工作量与目标剩余成本额度，计算后续必须达到的成本效率。',
    'Calculate the cost efficiency needed on unfinished budgeted work to meet a target final cost.',
    'budget earned actual target',
    (budget, earned, actual, target) => ({
      remainingBudgetedWork: budget - subset(earned, budget),
      remainingFunding: target - actual,
      requiredCostPerformance: divide(budget - earned, target - actual),
    }),
  ),
  make(
    'velocity-release-forecast',
    '迭代速度交付预测',
    'Velocity Release Forecast',
    '按最近三轮平均完成点数预测剩余迭代，并给出按最近最快轮的估计。',
    'Use the last three completed iteration velocities to estimate remaining iterations at the mean and fastest observed pace.',
    'scope v1 v2 v3',
    (points, a, b, c) => ({
      meanPoints: (a + b + c) / 3,
      iterationsAtMean: Math.ceil(divide(points, (a + b + c) / 3)),
      iterationsAtFastest: Math.ceil(divide(points, Math.max(a, b, c))),
    }),
  ),
  make(
    'daily-burndown-target',
    '每日燃尽目标',
    'Daily Burndown Target',
    '用今日开始时的剩余点数求理想日目标，对照今日实际进展。',
    'Calculate the ideal daily burn from start-of-day backlog and compare the day’s actual completion with that pace.',
    'scope days done',
    (points, days, done) => ({
      idealDailyPoints: points / days,
      remainingAfterToday: points - subset(done, points),
      todayPaceVariance: done - points / days,
    }),
  ),
  make(
    'scope-change-schedule-impact',
    '范围变更工期影响',
    'Scope Change Schedule Impact',
    '保持团队日交付能力不变，估算范围净增减后的工作日变化。',
    'Translate a net change of scope hours into revised effort and delivery days at fixed team capacity.',
    'baseline changed capacity',
    (baseline, change, capacity) => {
      requireThat(baseline + change >= 0, 'Revised scope cannot be negative.');
      return {
        revisedHours: baseline + change,
        baselineDays: Math.ceil(baseline / capacity),
        revisedDays: Math.ceil((baseline + change) / capacity),
      };
    },
  ),
  make(
    'risk-mitigation-value',
    '风险缓解净期望价值',
    'Risk Mitigation Value',
    '对比风险缓解前后的期望损失，并扣除缓解行动支出。',
    'Compare expected loss before and after mitigation and subtract the cost of taking the action.',
    'probability impact mitigated prevention',
    (prior, impact, after, expense) => ({
      originalExpectedLoss: (prior * impact) / 100,
      residualExpectedLoss: (after * impact) / 100,
      netExpectedSaving: ((prior - after) * impact) / 100 - expense,
    }),
  ),
  make(
    'launch-delay-contribution',
    '延期上线贡献损失',
    'Launch Delay Contribution Cost',
    '合并延期期间未实现贡献和触发的一次性罚金。',
    'Combine weekly contribution forgone during a launch delay with a one-time penalty triggered by any delay.',
    'weeks weekly penalty',
    (weeks, weekly, penalty) => ({
      contributionForgone: weeks * weekly,
      penaltyTriggered: weeks > 0 ? penalty : 0,
      costOfDelay: weeks * weekly + (weeks > 0 ? penalty : 0),
    }),
  ),
  make(
    'weighted-shortest-job',
    '加权最短作业优先分',
    'Weighted Shortest Job First',
    '将业务价值、时效、降险与机会分相加，再除以相对工作量。',
    'Combine relative value, urgency and risk or opportunity scores and divide by job size to compute WSJF.',
    'business urgency opportunity size',
    (value, urgency, opportunity, size) => ({
      relativeDelayCost: value + urgency + opportunity,
      wsjf: (value + urgency + opportunity) / size,
    }),
  ),
  make(
    'schedule-crash-cost-slope',
    '工期压缩成本斜率',
    'Schedule Crash Cost Slope',
    '比较常规和赶工方案，计算每压缩一天需要的额外直接成本。',
    'Compare normal and crash duration and cost to estimate incremental direct cost per day shortened.',
    'normalDays crashDays normal crash',
    (regular, shortened, normal, crash) => ({
      daysSaved: regular - shortened,
      incrementalCost: crash - normal,
      costPerDaySaved: divide(crash - normal, regular - shortened),
    }),
  ),
  make(
    'critical-chain-buffer-use',
    '关键链缓冲消耗',
    'Critical Chain Buffer Use',
    '比较缓冲消耗比例与关键链完成比例，并按当前相对速度外推总消耗。',
    'Compare buffer consumption with critical-chain progress and extrapolate buffer use if the same consumption pace continues.',
    'buffer consumed progress',
    (buffer, consumed, progress) => ({
      bufferUsedPercent: (100 * consumed) / buffer,
      remainingDays: buffer - consumed,
      projectedUseDays: (100 * consumed) / progress,
    }),
  ),
  make(
    'contingency-draw-review',
    '项目应急预算支取',
    'Project Contingency Draw Review',
    '结算已批准应急储备扣除历次支取后的余额，查看新申请可覆盖金额。',
    'Reconcile an approved contingency reserve with previous draws and determine coverage for a proposed draw.',
    'reserve draws pending',
    (reserve, draws, pending) => {
      const left = reserve - subset(draws, reserve);
      return {
        availableBeforeDraw: left,
        fundableNow: Math.min(left, pending),
        unfundedRequest: Math.max(0, pending - left),
        remainingAfterFundedDraw: Math.max(0, left - pending),
      };
    },
  ),
  make(
    'milestone-billing-retainage',
    '进度款与履约保留金',
    'Progress Billing and Retainage',
    '按两次累计验收进度的差额计算本次签证款，扣除合同保留金。',
    'Bill only the newly certified share of contract value and deduct the specified retention from the current certificate.',
    'contract completed before retention',
    (contract, current, prior, retention) => {
      subset(prior, current);
      const gross = (contract * (current - prior)) / 100;
      return {
        grossCertificate: gross,
        retainage: (gross * retention) / 100,
        currentPayable: gross * (1 - retention / 100),
      };
    },
  ),
  make(
    'project-wip-billings',
    '完工进度与开票差额',
    'Project WIP Versus Billings',
    '以成本投入法估算累计履约收入，与累计账单比较形成未结算差额。',
    'Estimate earned contract revenue under a cost-to-cost input method and compare it with cumulative billings.',
    'contract actual scheduled bill',
    (contract, actual, estimate, bill) => {
      const fraction = subset(actual, estimate) / estimate;
      return {
        percentComplete: 100 * fraction,
        estimatedEarnedRevenue: contract * fraction,
        earnedLessBilled: contract * fraction - bill,
      };
    },
  ),
  make(
    'capped-time-material-invoice',
    '工时材料合同封顶账单',
    'Capped Time and Materials Invoice',
    '将本期工时费和材料费与合同剩余额度比较，计算可开票款和超限额。',
    'Compare time and reimbursable material charges with the unused contract cap to determine invoiceable and excess amounts.',
    'authorized prior hours rate expenses',
    (cap, prior, hours, rate, expenses) => {
      const remaining = cap - subset(prior, cap),
        charge = hours * rate + expenses;
      return {
        claimedCharge: charge,
        invoiceable: Math.min(remaining, charge),
        aboveCap: Math.max(0, charge - remaining),
      };
    },
  ),
  make(
    'cost-plus-capped-fee',
    '成本加成管理费封顶',
    'Cost Plus Capped Fee',
    '根据允许报销的成本计算管理费，并应用固定费用上限。',
    'Calculate a percentage fee on allowable costs, apply the fee ceiling and combine it with reimbursement.',
    'reimbursable fee feeCap',
    (cost, rate, cap) => ({
      uncappedFee: (cost * rate) / 100,
      payableFee: Math.min(cap, (cost * rate) / 100),
      totalPayable: cost + Math.min(cap, (cost * rate) / 100),
    }),
  ),
  make(
    'incentive-contract-sharing',
    '目标成本奖惩分成',
    'Target Cost Incentive Sharing',
    '以目标成本节超调整承包方酬金，并限制在约定上下限内。',
    'Adjust the target fee by the contractor’s share of cost underruns or overruns and apply the fee floor and ceiling.',
    'targetCost reimbursable targetFee share minFee maxFee',
    (target, cost, fee, share, min, max) => {
      requireThat(min <= max, 'Minimum fee cannot exceed maximum fee.');
      const revised = fee + ((target - cost) * share) / 100,
        paid = Math.min(max, Math.max(min, revised));
      return { unboundedFee: revised, adjustedFee: paid, totalPrice: cost + paid };
    },
  ),
  make(
    'overhead-absorption-variance',
    '间接费用吸收差异',
    'Overhead Absorption Variance',
    '按预算费率向实际工时分配间接费，比较实际发生额并列出少计或多计。',
    'Apply a predetermined overhead rate to actual activity hours and reconcile applied overhead to incurred overhead.',
    'pool activity used incurred',
    (pool, activity, used, incurred) => ({
      predeterminedHourlyRate: pool / activity,
      appliedOverhead: (pool * used) / activity,
      underAbsorbedCost: incurred - (pool * used) / activity,
    }),
  ),
  make(
    'fixed-fee-project-quote',
    '固定价项目含缓冲报价',
    'Fixed Fee Project Quote',
    '为预计人工及材料成本加入应急缓冲，再按目标收入利润率反算报价。',
    'Add contingency to estimated labor and materials, then gross up the cost base for a target margin on quoted revenue.',
    'labor materials contingency margin',
    (labor, materials, contingency, margin) => {
      const cost = (labor + materials) * (1 + contingency / 100);
      return {
        riskAdjustedCost: cost,
        quotedFee: cost / (1 - margin / 100),
        includedContingency: ((labor + materials) * contingency) / 100,
      };
    },
  ),
  make(
    'shared-resource-overbooking',
    '跨项目资源超订',
    'Shared Resource Overbooking',
    '合并两项目对同一人员或设备的需求，量化缺口与剩余容量。',
    'Combine two project commitments on a shared weekly resource and quantify overbooking or spare capacity.',
    'workA workB divider',
    (a, b, capacity) => ({
      combinedHours: a + b,
      overbookedHours: Math.max(0, a + b - capacity),
      spareHours: Math.max(0, capacity - a - b),
    }),
  ),
  make(
    'project-commitment-headroom',
    '项目承诺支出余量',
    'Project Commitment Headroom',
    '将批准变更并入基线预算，扣除已发生成本和未入账承诺。',
    'Update the baseline for approved changes and deduct booked costs and non-overlapping open commitments to calculate remaining headroom.',
    'baselineCost approved actual committed',
    (baseline, approved, actual, committed) => {
      requireThat(baseline + approved >= 0, 'Revised budget cannot be negative.');
      return {
        revisedBudget: baseline + approved,
        bookedAndCommitted: actual + committed,
        uncommittedHeadroom: baseline + approved - actual - committed,
      };
    },
  ),
];
