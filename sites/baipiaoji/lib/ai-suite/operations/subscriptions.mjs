import { number as n, count as c, percent as p, divide, subset, requireThat, toolBuilder } from './core.mjs';
const make = toolBuilder({
  opening: n('期初月经常性收入', 'Opening MRR', 10000, 0.01),
  added: n('新客户月经常性收入', 'New-customer MRR', 1400),
  expansion: n('原客户增购月收入', 'Expansion MRR', 800),
  contraction: n('降级月收入损失', 'Contraction MRR', 200),
  churn: n('退订月收入损失', 'Churned MRR', 400),
  returned: n('重新激活月收入', 'Reactivated MRR', 100),
  start: c('期初活跃账户', 'Opening active accounts', 500, 1),
  lost: c('期初账户中本期流失数', 'Lost opening accounts', 20),
  newAccounts: c('每月新增账户', 'New accounts per month', 50),
  churnRate: p('每月账户流失率', 'Monthly account churn', 3, 0.0001),
  monthly: n('按月方案月价', 'Month-to-month price', 30),
  annual: n('按年预付价', 'Annual prepaid price', 300),
  seats: c('已购买席位', 'Purchased seats', 80, 1),
  used: c('已启用席位', 'Activated seats', 68),
  seatPrice: n('单席每月价格', 'Monthly price per seat', 15),
  old: n('变更前月费', 'Previous monthly charge', 40),
  updated: n('变更后月费', 'New monthly charge', 75),
  remaining: c('含变更日在内的剩余天数', 'Days remaining including change day', 12),
  days: c('当前账期天数', 'Billing cycle days', 30, 1, 366),
  consumption: n('本期用量', 'Usage this period', 1250),
  included: n('套餐包含用量', 'Included usage', 1000),
  extra: n('超额每单位价格', 'Price per excess unit', 0.12),
  base: n('固定套餐费', 'Fixed plan fee', 79),
  threshold: n('第一阶上限用量', 'First tier unit limit', 500, 0.01),
  tierOne: n('第一阶单价', 'First tier unit price', 0.8),
  tierTwo: n('第二阶单价', 'Second tier unit price', 0.5),
  minimum: n('最低承诺金额', 'Minimum committed charge', 1000),
  credit: n('期初可用预付余额', 'Opening prepaid credit', 450),
  topup: n('本期充值', 'Credit purchased', 150),
  spend: n('本期应付用量费', 'Usage charge', 380),
  failures: c('首次失败付款数', 'Initially failed payments', 200),
  first: p('首轮重试成功率', 'First retry recovery', 40),
  next: p('剩余失败的第二轮成功率', 'Second retry recovery on remaining failures', 20),
  ticket: n('每笔失败付款均价', 'Mean failed charge', 25),
  due: n('本期应收续约金额', 'Renewal amount due', 5000),
  received: n('期内续约实收金额', 'Cash collected from due renewals', 4200),
  contracts: c('待续合同数量', 'Contracts up for renewal', 25, 1),
  renewed: c('已续合同数量', 'Renewed contracts', 20),
  commitment: n('合同承诺总额', 'Total contract commitment', 24000),
  length: c('合同月数', 'Contract term months', 24, 1, 600),
  delivered: c('已履约整月数', 'Full months delivered', 5),
  active: c('付费活跃账户', 'Active paying accounts', 500, 1),
  support: n('每月每户服务成本', 'Monthly service cost per account', 4),
  months: c('预测月数', 'Projection months', 12, 1, 120),
  saved: n('挽留账户月费', 'Retained account monthly price', 60),
  concession: p('折扣比例', 'Retention discount', 15),
  discountMonths: c('折扣持续月数', 'Discount months', 3, 0, 120),
  baseline: p('无干预留存概率', 'Baseline retention probability', 35),
  treated: p('折扣后留存概率', 'Offer retention probability', 60),
  upgradePrice: n('增购模块月价', 'Monthly add-on price', 10),
  uptake: p('购买增购的账户比例', 'Add-on adoption', 25),
  service: n('单次迁移成本', 'One-time migration cost', 12000),
  saving: n('迁移后每月成本节省', 'Monthly cost saving after migration', 1500),
  overlap: n('双系统每月额外成本', 'Extra monthly parallel running cost', 400),
  overlapMonths: c('双系统并行月数', 'Months of parallel operation', 2, 0, 120),
  acq: n('本月获客支出', 'Monthly acquisition spending', 7000),
  commission: p('新签合同佣金率', 'Commission on new contract value', 8),
  termValue: n('新签合同总额', 'New contract value', 30000),
  leads: c('取得试用资格的账户', 'Eligible free trials', 200, 1),
  activated: c('完成激活的试用账户', 'Activated trials', 120),
  paid: c('激活后转付费账户', 'Activated trials becoming paid', 30),
  daysFree: c('免费服务天数', 'Free service days', 14, 0, 366),
  perDay: n('每试用账户日成本', 'Daily cost per trial account', 0.08),
});
export default [
  make(
    'recurring-revenue-waterfall',
    '经常性月收入变动桥',
    'Recurring Revenue Waterfall',
    '将新增、增购、降级、流失和重新激活对账到期末月收入。',
    'Reconcile opening MRR with new, expansion, contraction, churn and reactivation movements.',
    'opening added expansion contraction churn returned',
    (opening, added, expansion, contraction, churn, returned) => {
      subset(churn + contraction, opening);
      const net = added + expansion + returned - contraction - churn;
      return { netNewMrr: net, closingMrr: opening + net, closingRunRateArr: 12 * (opening + net) };
    },
  ),
  make(
    'gross-net-retention',
    '原有收入毛留存与净留存',
    'Gross and Net Revenue Retention',
    '固定期初客户群，分别计入流失、降级和增购比较留存。',
    'Calculate gross and net dollar retention for the opening customer cohort, excluding new and reactivated accounts.',
    'opening churn contraction expansion',
    (opening, churn, contraction, expansion) => {
      const retained = opening - subset(churn + contraction, opening);
      return {
        grossRetentionPercent: (100 * retained) / opening,
        netRetentionPercent: (100 * (retained + expansion)) / opening,
      };
    },
  ),
  make(
    'customer-logo-survival',
    '账户群留存预测',
    'Customer Cohort Survival',
    '用期初群体本月观测流失率预测同一群体未来存续账户。',
    'Apply observed one-month account churn to project survivors of the same starting cohort at a constant rate.',
    'start lost months',
    (start, lost, months) => {
      const retention = 1 - subset(lost, start) / start;
      return {
        monthlyLogoRetentionPercent: retention * 100,
        expectedCohortSurvivors: start * retention ** months,
      };
    },
  ),
  make(
    'subscriber-steady-state',
    '订阅账户稳态规模',
    'Subscriber Steady State',
    '假定月末固定新客与现有账户固定流失率，推算长期平衡规模。',
    'Estimate the equilibrium subscriber count when a fixed number join each month and a constant share of existing accounts churn.',
    'newAccounts churnRate monthly',
    (added, churn, price) => ({
      equilibriumAccounts: (100 * added) / churn,
      equilibriumMrr: (100 * added * price) / churn,
    }),
  ),
  make(
    'annual-plan-discount',
    '年付优惠与等效月价',
    'Annual Plan Discount',
    '与完整十二个月按月付比较，计算年付节省及折合月数。',
    'Compare prepayment with twelve monthly charges and calculate the effective monthly rate and months saved.',
    'monthly annual',
    (monthly, annual) => ({
      effectiveMonthly: annual / 12,
      annualSaving: 12 * monthly - annual,
      monthsSaved: 12 - divide(annual, monthly),
      discountPercent: 100 * (1 - divide(annual, 12 * monthly)),
    }),
  ),
  make(
    'seat-license-reclamation',
    '闲置席位可回收成本',
    'Unused Seat License Reclamation',
    '按已购买与启用席位数估算可释放数量及月度成本。',
    'Identify unactivated seats and estimate the monthly spend recoverable if those seats can be removed at renewal.',
    'seats used seatPrice',
    (seats, used, price) => ({
      unusedSeats: seats - subset(used, seats),
      utilizationPercent: (100 * used) / seats,
      recoverableMonthlySpend: (seats - used) * price,
    }),
  ),
  make(
    'subscription-proration',
    '套餐变更按日补差',
    'Subscription Change Proration',
    '以剩余账期天数按比例计算旧套餐抵扣和新套餐费用。',
    'Prorate the unused old plan and remaining new plan over the actual days left in the billing cycle.',
    'old updated remaining days',
    (old, updated, remaining, days) => {
      const fraction = subset(remaining, days) / days;
      return {
        oldPlanCredit: old * fraction,
        newPlanCharge: updated * fraction,
        netAdjustment: (updated - old) * fraction,
      };
    },
  ),
  make(
    'metered-overage-bill',
    '套餐外用量账单',
    'Metered Overage Bill',
    '保留套餐固定费，仅对超过内含用量的部分收费。',
    'Add a fixed plan fee and charge the overage rate only on consumption above the included allowance.',
    'consumption included extra base',
    (usage, included, extra, base) => {
      const excess = Math.max(0, usage - included);
      return { excessUnits: excess, overageCharge: excess * extra, totalDue: base + excess * extra };
    },
  ),
  make(
    'graduated-usage-bill',
    '分阶累进用量计费',
    'Graduated Usage Bill',
    '第一阶额度按第一阶单价，超出部分按第二阶单价累加。',
    'Calculate a two-tier graduated bill by pricing the first units at tier one and only the remainder at tier two.',
    'consumption threshold tierOne tierTwo',
    (usage, threshold, first, second) => ({
      firstTierCharge: Math.min(usage, threshold) * first,
      secondTierCharge: Math.max(0, usage - threshold) * second,
      bill: Math.min(usage, threshold) * first + Math.max(0, usage - threshold) * second,
    }),
  ),
  make(
    'usage-commitment-true-up',
    '最低承诺补足额',
    'Minimum Commitment True-Up',
    '比较实耗费用与合同最低承诺，列出需补足的金额。',
    'Compare metered charges with the contractual minimum and determine the shortfall charged at settlement.',
    'spend minimum',
    (usage, minimum) => ({ commitmentShortfall: Math.max(0, minimum - usage), invoice: Math.max(usage, minimum) }),
  ),
  make(
    'prepaid-credit-drawdown',
    '预付额度扣减',
    'Prepaid Credit Drawdown',
    '应用期初余额与充值抵扣费用，结算剩余额度和现金应付。',
    'Apply opening and newly purchased credits against usage, then report unused credit and the payable balance.',
    'credit topup spend',
    (credit, topup, usage) => ({
      creditUsed: Math.min(credit + topup, usage),
      endingCredit: Math.max(0, credit + topup - usage),
      cashPayable: Math.max(0, usage - credit - topup),
    }),
  ),
  make(
    'billing-retry-recovery',
    '失败付款重试回收',
    'Payment Retry Recovery',
    '按两轮连续重试的条件成功率，估算回收笔数及金额。',
    'Estimate expected recovered payments and cash across two retries, applying the second rate only to first-round failures.',
    'failures first next ticket',
    (failures, first, second, ticket) => {
      const recovered = failures * (1 - (1 - first / 100) * (1 - second / 100));
      return {
        expectedRecovered: recovered,
        expectedOutstanding: failures - recovered,
        recoveredCash: recovered * ticket,
      };
    },
  ),
  make(
    'renewal-book-cash-check',
    '续约合同与回款对照',
    'Renewal Book and Cash Check',
    '分别按合同数和到期金额计算续约完成率及未回款余额。',
    'Compare renewal completion by contract count with collection of the amount due and show the unpaid balance.',
    'contracts renewed due received',
    (contracts, renewed, due, received) => ({
      contractRenewalPercent: (100 * subset(renewed, contracts)) / contracts,
      cashCollectionPercent: 100 * divide(subset(received, due), due),
      uncollected: due - received,
    }),
  ),
  make(
    'contract-service-backlog',
    '合同剩余履约金额',
    'Contract Service Backlog',
    '对等额按月履约的固定期合同计算累计履约收入和剩余义务。',
    'Calculate delivered revenue and remaining performance obligation for a fixed contract fulfilled evenly by month.',
    'commitment length delivered',
    (commitment, months, delivered) => ({
      monthlyRevenue: commitment / months,
      deliveredRevenue: (commitment * subset(delivered, months)) / months,
      remainingObligation: commitment * (1 - delivered / months),
    }),
  ),
  make(
    'customer-support-cost-ceiling',
    '客户服务成本上限',
    'Customer Service Cost Ceiling',
    '从账户月费扣除已知服务成本，求当前群体对其他支出的贡献上限。',
    'Calculate the monthly contribution available for other costs after account-level servicing expenses.',
    'active monthly support',
    (accounts, price, cost) => ({
      monthlyServicingSpend: accounts * cost,
      monthlyContribution: accounts * (price - cost),
      contributionPerAccount: price - cost,
    }),
  ),
  make(
    'retention-offer-lift-value',
    '挽留优惠期望收益',
    'Retention Offer Lift Value',
    '比较有无挽留优惠的预期订阅收入，指定期限内使用固定留存概率。',
    'Compare expected horizon revenue with and without a temporary discount using the probability of staying for the full horizon.',
    'saved months discountMonths concession baseline treated',
    (price, months, discountMonths, discount, baseline, treated) => {
      subset(discountMonths, months);
      const a = (price * months * baseline) / 100,
        b = (price * (months - (discountMonths * discount) / 100) * treated) / 100;
      return { expectedWithoutOffer: a, expectedWithOffer: b, incrementalExpectedRevenue: b - a };
    },
  ),
  make(
    'addon-adoption-forecast',
    '订阅增购需求预测',
    'Subscription Add-On Adoption Forecast',
    '给定现有账户、预期采用率和增购价格，预测月度增收。',
    'Apply expected add-on adoption to active accounts and calculate incremental monthly and annual run-rate revenue.',
    'active uptake upgradePrice',
    (accounts, uptake, price) => ({
      expectedBuyers: (accounts * uptake) / 100,
      incrementalMrr: (accounts * uptake * price) / 100,
      incrementalArr: (12 * accounts * uptake * price) / 100,
    }),
  ),
  make(
    'subscription-migration-payback',
    '系统迁移回收期',
    'Subscription Migration Payback',
    '假定节省立即开始，计入并行期重叠成本，估算迁移支出回收月份。',
    'Estimate simple payback from immediate monthly savings, one-time migration cost and temporary parallel running costs.',
    'service saving overlap overlapMonths',
    (cost, saving, overlap, months) => {
      requireThat(saving > 0, 'Monthly savings must be positive.');
      const during = saving - overlap;
      return {
        paybackMonths:
          cost === 0
            ? 0
            : during > 0 && cost <= during * months
              ? cost / during
              : months + (cost - during * months) / saving,
        parallelRunCost: overlap * months,
      };
    },
  ),
  make(
    'fully-loaded-new-account-cost',
    '获客支出与签约佣金',
    'Acquisition Cost Including Commission',
    '将本期获客投入和按新签合同额计提的佣金分摊到新客户。',
    'Allocate acquisition spending plus commissions on new contract value across newly acquired accounts.',
    'acq commission termValue newAccounts',
    (spend, rate, value, accounts) => ({
      commissionExpense: (value * rate) / 100,
      loadedCostPerAcquiredAccount: divide(spend + (value * rate) / 100, accounts),
    }),
  ),
  make(
    'free-trial-subsidy',
    '免费试用补贴成本',
    'Free Trial Subsidy',
    '按试用天数与日成本计入全部试用账户，估算每个成功付费账户的补贴。',
    'Spread the cost of serving all eligible trials over those becoming paid and show activation-to-paid conversion.',
    'leads activated paid daysFree perDay',
    (leads, activated, paid, days, cost) => {
      subset(activated, leads);
      subset(paid, activated);
      return {
        trialCost: leads * days * cost,
        subsidyPerPayingAccount: divide(leads * days * cost, paid),
        activationToPaidPercent: 100 * divide(paid, activated),
      };
    },
  ),
];
