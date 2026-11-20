import { number as n, count as c, percent as p, divide, subset, requireThat, toolBuilder } from './core.mjs';
const make = toolBuilder({
  workload: n('每周所需工时', 'Workload hours per week', 325),
  week: n('每名全职每周工时', 'Standard full-time weekly hours', 40, 0.01, 168),
  productive: p('可用于交付的工时比例', 'Share available for delivery', 80, 0.01),
  actual: n('个人本周付薪小时', 'Paid hours this week', 46, 0, 168),
  threshold: n('给定的加班起计小时', 'Supplied overtime threshold hours', 40, 0, 168),
  rate: n('基本时薪', 'Base hourly rate', 24),
  factor: n('加班时薪倍数', 'Overtime hourly multiplier', 1.5, 1, 10),
  night: n('夜班小时', 'Night-shift hours', 16, 0, 168),
  premium: n('夜班每小时津贴', 'Extra allowance per night hour', 3.5),
  hoursA: n('甲组工时', 'Group A hours', 120),
  hoursB: n('乙组工时', 'Group B hours', 80),
  rateB: n('乙组时薪', 'Group B hourly rate', 36),
  salary: n('当前基本年薪合计', 'Current annual base payroll', 500000),
  eligible: p('符合调薪的薪资份额', 'Eligible share of payroll', 80),
  raise: p('拟调薪幅度', 'Proposed raise', 4),
  months: c('本年生效月数', 'Effective months this year', 8, 0, 12),
  leave: n('期初休假小时', 'Opening leave hours', 32),
  accrue: n('每期新增休假小时', 'Leave hours accrued per period', 6),
  periods: c('经过的计提期数', 'Accrual periods', 4, 0, 366),
  used: n('本次结算前已休小时', 'Leave used before the closing cap', 8),
  cap: n('期末可结转小时上限', 'End-of-period carry cap in hours', 48),
  absent: n('需覆盖的缺勤小时', 'Absence hours to cover', 80),
  covered: p('用临时人员补班比例', 'Share covered by temporary staff', 75),
  temp: n('临时代班时薪', 'Temporary replacement hourly cost', 32),
  lost: n('无人值守每小时损失贡献', 'Contribution lost per uncovered hour', 45),
  start: c('期初员工数', 'Opening headcount', 100, 1),
  end: c('期末员工数', 'Closing headcount', 106, 1),
  exits: c('期内离职数', 'Departures during period', 8),
  offers: c('目标实际入职数', 'Target starts', 12, 1),
  accepts: p('录用通知接受率', 'Offer acceptance rate', 80, 0.01),
  starts: p('接受后入职率', 'Start rate among acceptances', 90, 0.01),
  finalists: p('终面至发出录用率', 'Offer rate among final interviews', 40, 0.01),
  vacancy: c('空缺岗位数', 'Vacancies', 4),
  days: c('平均空缺天数', 'Average days open', 30),
  daily: n('每岗日贡献缺口', 'Contribution gap per vacant role-day', 100),
  recruited: n('招聘直接开支', 'Direct recruiting expense', 2500),
  first: n('首件任务小时', 'First unit task hours', 6, 0.01),
  learning: p('每次产量翻倍时单件耗时比例', 'Unit-time fraction at each doubling', 85, 1),
  unit: c('要估算的第几件', 'Unit sequence number', 8, 1),
  full: n('熟练期员工月贡献', 'Monthly contribution at proficiency', 8000),
  loaded: n('员工每月综合成本', 'Fully loaded monthly employee cost', 4000),
  ramp: p('入职磨合期产出比例', 'Productivity during ramp', 60),
  rampMonths: c('磨合期月数', 'Ramp months', 3, 0, 120),
  induction: n('一次性入职成本', 'Upfront onboarding cost', 3000),
  shifts: c('每日班次数', 'Shifts per day', 3, 1, 24),
  posts: c('每班同时在岗人数', 'Posts per shift', 4, 1),
  openDays: c('每周营业天数', 'Operating days per week', 7, 1, 7),
  cover: c('每名员工每周可上班次数', 'Shifts available per employee per week', 5, 1, 21),
  target: c('目标期末人数', 'Target closing headcount', 120),
  departures: c('预计离职人数', 'Expected departures', 10),
  transfers: c('已确认内部净调入（可负）', 'Confirmed net internal transfers', 2, -1e8),
  team: c('业务人员数', 'Individual contributors', 85),
  span: c('每主管最多直属人数', 'Maximum reports per manager', 8, 1),
  managers: c('现有主管数', 'Existing managers', 9),
  unused: n('可兑现休假小时合计', 'Total payable unused leave hours', 820),
  burden: p('额外雇主附加费率', 'Employer on-cost rate', 12),
  benefits: n('年度固定福利合计', 'Annual fixed benefits', 48000),
  payrollTax: p('给定薪资附加费率', 'Payroll on-cost on base pay', 9),
  agency: n('外包小时报价', 'Agency hourly quote', 75),
  agencyHours: n('每月所需服务小时', 'Monthly service hours required', 100),
  employee: n('内部员工每月固定成本', 'Internal monthly fixed cost', 5000),
  variable: n('内部每小时增量成本', 'Internal variable cost per hour', 10),
  bill: n('客户小时费率', 'Client billing rate', 85),
  billable: p('预计可计费工时占比', 'Expected billable utilization', 70),
  holiday: c('节假日营业天数', 'Holiday operating days', 3, 0, 366),
  shiftLength: n('单班付薪小时', 'Paid hours per shift', 8, 0.01, 24),
  holidayExtra: p('节假日附加工资比例', 'Holiday pay premium above base', 50, 0, 300),
});
export default [
  make(
    'courier-workload-fte',
    '工时需求折算全职人数',
    'Delivery Workload FTE',
    '按每周工时与可交付工时占比，换算所需全职当量和最低人数。',
    'Convert weekly workload to full-time equivalents after reserving non-delivery time and show whole-person headcount.',
    'workload week productive',
    (workload, week, productive) => {
      const fte = workload / ((week * productive) / 100);
      return { deliveryHoursPerFte: (week * productive) / 100, requiredFte: fte, wholePeople: Math.ceil(fte) };
    },
  ),
  make(
    'weekly-overtime-pay',
    '每周加班工资',
    'Weekly Overtime Pay',
    '依给定工时门槛和倍率把工时拆成基本工资与加班工资。',
    'Split weekly pay into regular and overtime hours using the threshold and premium multiplier supplied by the caller.',
    'actual threshold rate factor',
    (hours, threshold, rate, factor) => {
      const over = Math.max(0, hours - threshold);
      return {
        regularHours: hours - over,
        overtimeHours: over,
        overtimePay: over * rate * factor,
        totalPay: (hours - over) * rate + over * rate * factor,
      };
    },
  ),
  make(
    'night-shift-differential',
    '夜班岗位津贴',
    'Night Shift Differential',
    '对夜班小时追加固定津贴并计算本周含津贴平均时薪。',
    'Add a fixed differential for night hours and compute the effective pay rate across all paid hours.',
    'actual night rate premium',
    (hours, night, rate, premium) => {
      subset(night, hours);
      return {
        shiftPremium: night * premium,
        totalPay: hours * rate + night * premium,
        effectiveHourlyRate: divide(hours * rate + night * premium, hours),
      };
    },
  ),
  make(
    'mixed-team-labor-rate',
    '混合团队综合时薪',
    'Blended Team Labor Rate',
    '按两组实际投入工时加权时薪，形成统一项目成本率。',
    'Weight the pay rates of two labor groups by hours worked to calculate project cost and a blended hourly rate.',
    'hoursA rate hoursB rateB',
    (a, ra, b, rb) => ({ totalLaborCost: a * ra + b * rb, blendedHourlyRate: divide(a * ra + b * rb, a + b) }),
  ),
  make(
    'merit-raise-budget',
    '年度调薪预算',
    'Merit Raise Budget',
    '只对符合资格的薪资份额调薪，分开计算全年与本年生效支出。',
    'Apply a merit increase to eligible base payroll and prorate the incremental cash expense over effective months.',
    'salary eligible raise months',
    (salary, eligible, raise, months) => ({
      annualizedIncrease: (salary * eligible * raise) / 10000,
      currentYearIncrease: (((salary * eligible * raise) / 10000) * months) / 12,
    }),
  ),
  make(
    'capped-leave-accrual',
    '休假计提与结转上限',
    'Capped Leave Accrual',
    '先计提假期并扣除已休小时，再按结算日上限计算作废小时。',
    'Accrue leave and deduct hours used before applying a closing carry cap, reporting any forfeited hours.',
    'leave accrue periods used cap',
    (opening, accrual, periods, used, cap) => {
      const available = opening + accrual * periods,
        net = available - subset(used, available);
      return {
        hoursEarned: accrual * periods,
        carryHours: Math.min(net, cap),
        forfeitedHours: Math.max(0, net - cap),
      };
    },
  ),
  make(
    'absence-cover-cost',
    '缺勤替班成本',
    'Absence Cover Cost',
    '拆分临时人员工资与无人补班时的损失贡献，核算两者合计。',
    'Model temporary cover expense and forgone contribution for unstaffed hours to quantify the combined absence impact.',
    'absent covered temp lost',
    (hours, covered, temp, lost) => ({
      tempHours: (hours * covered) / 100,
      replacementCost: ((hours * covered) / 100) * temp,
      uncoveredContributionLoss: hours * (1 - covered / 100) * lost,
      combinedImpact: hours * ((covered * temp) / 100 + (1 - covered / 100) * lost),
    }),
  ),
  make(
    'headcount-turnover-reconciliation',
    '员工人数与离职率',
    'Headcount Turnover Reconciliation',
    '用期初、期末和离职人数倒推出新增人数，以平均人数为离职率分母。',
    'Reconcile closing headcount to hires and departures and calculate period turnover using average opening and closing headcount.',
    'start end exits',
    (start, end, exits) => {
      requireThat(end - start + exits >= 0, 'Implied hires cannot be negative.');
      return {
        impliedHires: end - start + exits,
        averageHeadcount: (start + end) / 2,
        turnoverPercent: (200 * exits) / (start + end),
      };
    },
  ),
  make(
    'recruiting-offer-backsolve',
    '招聘终面与录用量倒推',
    'Recruiting Offer Backsolve',
    '从入职目标依次向上取整，估算所需接受数、发出录用数和终面人数。',
    'Work back from target starts through attendance, acceptance and final-interview offer rates, rounding each stage to whole people.',
    'offers starts accepts finalists',
    (target, start, accept, offer) => {
      const accepted = Math.ceil((100 * target) / start),
        offers = Math.ceil((100 * accepted) / accept);
      return {
        acceptancesNeeded: accepted,
        offersNeeded: offers,
        finalInterviewsNeeded: Math.ceil((100 * offers) / offer),
      };
    },
  ),
  make(
    'vacancy-contribution-drag',
    '岗位空缺贡献损失',
    'Vacancy Contribution Drag',
    '累计所有空缺岗位天数，叠加招聘直接成本，估算总经济影响。',
    'Combine vacant role-days and their daily contribution gap with direct recruiting expense to estimate vacancy impact.',
    'vacancy days daily recruited',
    (roles, days, gap, expense) => ({
      vacantRoleDays: roles * days,
      contributionGap: roles * days * gap,
      impactIncludingRecruitment: roles * days * gap + expense,
    }),
  ),
  make(
    'wright-unit-learning-time',
    '单件学习曲线工时',
    'Unit Learning Curve Time',
    '按每翻倍一次单件耗时下降的模型，估算指定序号任务工时。',
    'Use a unit-time learning curve in which each doubling of cumulative output multiplies the individual unit time by a fixed fraction.',
    'first learning unit',
    (first, learning, unit) => ({
      learningExponent: Math.log2(learning / 100),
      projectedUnitHours: first * unit ** Math.log2(learning / 100),
    }),
  ),
  make(
    'new-hire-ramp-payback',
    '新员工磨合回收期',
    'New Hire Ramp Payback',
    '将入职成本和磨合期净贡献计入，再按熟练期贡献估算回收月数。',
    'Estimate when cumulative contribution covers onboarding and payroll using one ramp productivity level followed by full productivity.',
    'induction full loaded ramp rampMonths',
    (induction, full, loaded, ramp, months) => {
      const early = (full * ramp) / 100 - loaded,
        later = full - loaded,
        net = early * months - induction;
      return {
        rampMonthlyNet: early,
        postRampMonthlyNet: later,
        paybackMonths:
          induction === 0
            ? 0
            : early > 0 && net >= 0
              ? induction / early
              : later > 0
                ? months - net / later
                : null,
      };
    },
  ),
  make(
    'weekly-shift-post-coverage',
    '每周在岗班次覆盖',
    'Weekly Shift Post Coverage',
    '按营业日、每日班次和每班岗位数折算最少排班人数。',
    'Estimate a lower bound on roster size from weekly post-shifts and shifts available per employee, before rest-day constraints.',
    'openDays shifts posts cover',
    (days, shifts, posts, cover) => ({
      weeklyPostShifts: days * shifts * posts,
      minimumRoster: Math.max(posts, Math.ceil((days * shifts * posts) / cover)),
    }),
  ),
  make(
    'headcount-hiring-gap',
    '期末编制招聘缺口',
    'Headcount Hiring Gap',
    '从期初人数扣除预计离职并加入净调动，对照目标编制计算需招聘或超配人数。',
    'Reconcile starting headcount, forecast exits and net transfers against a target to identify external hiring needs or excess positions.',
    'start departures transfers target',
    (start, departures, transfers, target) => {
      const before = start - subset(departures, start) + transfers;
      requireThat(before >= 0, 'Transfers exceed projected headcount.');
      return {
        beforeExternalHiring: before,
        hiresNeeded: Math.max(0, target - before),
        rolesAboveTarget: Math.max(0, before - target),
      };
    },
  ),
  make(
    'management-span-capacity',
    '主管管理跨度',
    'Management Span Capacity',
    '按每主管直属人数上限，计算所需主管及现有管理容量缺口。',
    'Size the manager layer to a maximum direct-report span and compare required manager count with current coverage.',
    'team span managers',
    (members, span, managers) => ({
      managersRequired: Math.ceil(members / span),
      additionalManagers: Math.max(0, Math.ceil(members / span) - managers),
      openReportSlots: Math.max(0, managers * span - members),
    }),
  ),
  make(
    'leave-payout-liability',
    '未休假期兑付负债',
    'Unused Leave Payout Liability',
    '以平均时薪估算可兑现假期工资和相应雇主附加成本。',
    'Value payable accrued leave at an average hourly wage and add the specified employer on-cost.',
    'unused rate burden',
    (hours, rate, burden) => ({
      grossLeavePay: hours * rate,
      employerOnCost: (hours * rate * burden) / 100,
      totalLiability: hours * rate * (1 + burden / 100),
    }),
  ),
  make(
    'employee-cost-load',
    '雇主综合薪酬成本',
    'Employer Compensation Load',
    '在基本薪资上计雇主附加费与固定福利，折算全口径雇佣成本。',
    'Add payroll on-costs assessed on base pay and fixed benefits to calculate annual employment cost and its loading factor.',
    'salary payrollTax benefits',
    (salary, tax, benefits) => ({
      annualEmploymentCost: salary * (1 + tax / 100) + benefits,
      loadingMultiple: divide(salary * (1 + tax / 100) + benefits, salary),
    }),
  ),
  make(
    'agency-hire-crossover',
    '外包与自建团队成本比较',
    'Agency or Internal Staffing Crossover',
    '对比外包工时费和内部固定加变动成本，识别内部方案临界工时。',
    'Compare hourly agency billing with a fixed-plus-variable internal team and find the service-hour crossover.',
    'agency agencyHours employee variable',
    (agency, hours, fixed, variable) => ({
      agencyMonthlyCost: agency * hours,
      internalMonthlyCost: fixed + variable * hours,
      crossoverHours: agency > variable ? fixed / (agency - variable) : null,
    }),
  ),
  make(
    'billable-capacity-contribution',
    '计费团队工时贡献',
    'Billable Capacity Contribution',
    '按全部付薪工时计成本，仅按可计费比例计客户收入。',
    'Apply client billing only to utilized hours while charging labor cost on all paid hours to estimate delivery contribution.',
    'workload billable bill rate',
    (hours, utilization, bill, cost) => ({
      billedHours: (hours * utilization) / 100,
      projectedFees: (hours * utilization * bill) / 100,
      contributionAfterWages: hours * ((utilization * bill) / 100 - cost),
    }),
  ),
  make(
    'holiday-roster-payroll',
    '节假日排班工资预算',
    'Holiday Roster Payroll',
    '以节假日班次数与每班岗位计算总工时，并加计指定工资溢价。',
    'Budget gross payroll for holiday opening using staffed shifts, paid hours and the supplied premium above base wages.',
    'holiday shifts posts shiftLength rate holidayExtra',
    (days, shifts, posts, hours, rate, premium) => {
      const paid = days * shifts * posts * hours;
      return {
        paidHours: paid,
        basePay: paid * rate,
        holidaySupplement: (paid * rate * premium) / 100,
        totalPay: paid * rate * (1 + premium / 100),
      };
    },
  ),
];
