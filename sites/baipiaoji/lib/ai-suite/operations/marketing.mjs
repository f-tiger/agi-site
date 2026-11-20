import { number as n, count as c, percent as p, divide, subset, requireThat, toolBuilder } from './core.mjs';
const make = toolBuilder({
  budget: n('媒体总预算', 'Media budget', 12000),
  cpm: n('千次展示价格', 'Cost per thousand impressions', 8, 0.00001),
  frequency: n('平均每人展示次数', 'Average impressions per reached person', 3, 1, 10000),
  audience: c('可投放受众人数', 'Eligible audience', 45000, 1),
  cap: c('每人周期展示上限', 'Frequency cap per person for period', 4, 1, 1000),
  allowance: n('允许的每笔订单获客成本', 'Allowable acquisition cost per order', 30),
  conversion: p('点击至订单转化率', 'Click-to-order conversion', 4),
  valid: p('有效且保留订单的比例', 'Share of orders valid and retained', 92),
  testPre: c('测试区投放前转化', 'Test conversions before launch', 200, 1),
  testPost: c('测试区投放后转化', 'Test conversions after launch', 260),
  controlPre: c('对照区投放前转化', 'Control conversions before launch', 180, 1),
  controlPost: c('对照区投放后转化', 'Control conversions after launch', 198),
  exposed: c('投放实验组人数', 'Treatment audience', 5000, 1),
  conversionsA: c('投放组转化人数', 'Converting treatment users', 150),
  holdout: c('未投放对照人数', 'Holdout audience', 1000, 1),
  conversionsB: c('对照组转化人数', 'Converting holdout users', 20),
  spend: n('当前已花费', 'Spend to date', 5000),
  totalDays: c('总投放天数', 'Campaign calendar days', 30, 1, 366),
  elapsed: c('已过完整投放天数', 'Completed campaign days', 12),
  sample: c('进入实验的总人数', 'Total experiment users', 10000),
  groupShare: p('测试组份额', 'Treatment allocation', 45),
  excluded: p('先划出的保留份额', 'Reserved holdout share before allocation', 10),
  fee: n('赞助固定报价', 'Flat sponsorship quote', 1500),
  impressions: c('保证展示次数', 'Guaranteed impressions', 170000, 1),
  touches: c('同一转化路径触点数', 'Touchpoints on one converting path', 5, 2, 100),
  first: p('首触点分配比例', 'First-touch credit', 40),
  last: p('末触点分配比例', 'Last-touch credit', 40),
  value: n('归因订单价值', 'Conversion value to attribute', 250),
  sent: c('邮件发送量', 'Messages sent', 10000, 1),
  bounced: c('硬退或软退数量', 'Bounced messages', 400),
  clicked: c('唯一点击邮件数', 'Delivered messages with unique clicks', 320),
  buying: c('点击后购买人数', 'Purchasers among unique clickers', 28),
  subscribers: c('当前可触达订阅数', 'Current mailable subscribers', 15000),
  unsub: p('每轮取消订阅比例', 'Unsubscribe share per send', 0.3),
  rounds: c('连续发送轮数', 'Consecutive sends', 8, 1, 100),
  paid: n('销售额归因给推广伙伴', 'Revenue attributed to partner', 18000),
  reversed: n('退款或撤销归因额', 'Refunded or reversed attributed sales', 1200),
  commission: p('佣金比例', 'Partner commission', 8),
  invitations: n('每名新用户邀请数', 'Invitations per new user', 2.5),
  activation: p('受邀者激活比例', 'Invite-to-activation rate', 20),
  seed: c('首批推荐发起用户', 'Initial referring users', 800),
  generations: c('推广代数', 'Referral generations', 3, 1, 12),
  registrations: c('报名人数', 'Webinar registrants', 700),
  attend: p('预计出席比例', 'Expected attendance', 48),
  qualify: p('出席者成为线索比例', 'Attendees qualifying as leads', 22),
  perRep: c('每人每日可跟进线索数', 'Leads handled per representative per day', 16, 1),
  early: n('早期商机总额', 'Early-stage opportunity value', 120000),
  late: n('晚期商机总额', 'Late-stage opportunity value', 80000),
  earlyWin: p('早期商机成交概率', 'Early-stage close probability', 18),
  lateWin: p('晚期商机成交概率', 'Late-stage close probability', 65),
  target: n('目标成交收入', 'Booking target', 100000),
  promoters: c('推荐者数（9 至 10 分）', 'Promoters (scores 9–10)', 70),
  passives: c('中立者数（7 至 8 分）', 'Passives (scores 7–8)', 30),
  detractors: c('贬损者数（0 至 6 分）', 'Detractors (scores 0–6)', 20),
  online: c('线上收集的唯一线索', 'Unique online leads', 130),
  events: c('活动收集的唯一线索', 'Unique event leads', 100),
  overlap: c('两渠道重复线索', 'Leads present in both channels', 35),
  paidOrders: c('付费渠道归因订单', 'Paid-attributed orders', 160),
  organic: p('无广告也会自然成交的份额', 'Share expected to buy organically', 35),
  profit: n('每个新增订单的投放前贡献', 'Pre-ad contribution per incremental order', 45),
  carry: n('期初残留广告影响单位', 'Opening adstock units', 240),
  halfLife: n('半衰期（天）', 'Adstock half-life in days', 7, 0.001),
  days: n('已过天数', 'Days elapsed', 14),
  pulse: n('期末新增广告影响单位', 'New exposure units at period end', 80),
  own: n('本品牌展示量', 'Brand impressions', 35000),
  other: n('同期其他品牌展示总量', 'Other brands’ impressions in period', 165000),
  desired: p('目标展示份额', 'Target impression share', 25, 0, 99.99),
});
export default [
  make(
    'media-reach-frequency-plan',
    '媒体覆盖与频次预算',
    'Media Reach and Frequency Plan',
    '按千次展示成本反推展示量，并按平均频次估算去重覆盖。',
    'Translate media budget and CPM to impressions and estimate unique reach at the supplied average frequency.',
    'budget cpm frequency',
    (budget, cpm, frequency) => ({
      plannedImpressions: (1000 * budget) / cpm,
      estimatedReach: (1000 * budget) / cpm / frequency,
    }),
  ),
  make(
    'frequency-cap-budget-ceiling',
    '频次上限可消耗预算',
    'Frequency Cap Budget Ceiling',
    '以有限受众和频控估算可购买展示及相应的最大媒体预算。',
    'Calculate the theoretical impression ceiling from audience size and per-person frequency cap and value it at the supplied CPM.',
    'audience cap cpm',
    (audience, cap, cpm) => ({ maximumImpressions: audience * cap, maximumSpend: (audience * cap * cpm) / 1000 }),
  ),
  make(
    'paid-search-bid-ceiling',
    '搜索广告点击出价上限',
    'Paid Search Bid Ceiling',
    '用可接受的订单获客成本、点击转化率与有效订单比例计算最高平均点击成本。',
    'Derive the maximum average CPC from allowed cost per retained order, click conversion and order validity.',
    'allowance conversion valid',
    (allowance, conversion, valid) => ({
      retainedOrderProbability: (conversion * valid) / 10000,
      maxAverageCpc: (allowance * conversion * valid) / 10000,
    }),
  ),
  make(
    'geo-control-adjusted-lift',
    '地区对照校正增量',
    'Geo Control-Adjusted Lift',
    '以对照区的前后变化校正测试区基线，估算超出基线的转化。',
    'Scale the test market’s baseline by the control market trend and compare observed conversions with the counterfactual.',
    'testPre testPost controlPre controlPost',
    (testPre, testPost, controlPre, controlPost) => {
      const expected = (testPre * controlPost) / controlPre;
      return {
        baselineAdjusted: expected,
        incrementalConversions: testPost - expected,
        liftPercent: expected ? (100 * (testPost - expected)) / expected : null,
      };
    },
  ),
  make(
    'holdout-incremental-acquisition-cost',
    '留出实验增量获客成本',
    'Holdout Incremental Acquisition Cost',
    '按对照组转化率估算实验组自然转化，得到新增转化及其单位成本。',
    'Use the holdout conversion rate to estimate baseline treatment conversions and calculate cost per positive incremental conversion.',
    'exposed conversionsA holdout conversionsB spend',
    (exposed, converted, holdout, control, spend) => {
      subset(converted, exposed);
      subset(control, holdout);
      const lift = converted - (exposed * control) / holdout;
      return {
        incrementalConversions: lift,
        rateLiftPoints: 100 * (converted / exposed - control / holdout),
        costPerIncrementalConversion: lift > 0 ? spend / lift : null,
      };
    },
  ),
  make(
    'campaign-budget-pacing',
    '投放预算消耗节奏',
    'Campaign Budget Pacing',
    '比较实际累计消耗与均匀进度的预算，估算剩余日均额度。',
    'Compare spend to a uniform calendar pacing line and calculate the allowable daily spend over remaining days.',
    'budget spend totalDays elapsed',
    (budget, spend, days, elapsed) => {
      subset(elapsed, days);
      const remaining = days - elapsed;
      return {
        plannedSpendToDate: (budget * elapsed) / days,
        aheadOfPlan: spend - (budget * elapsed) / days,
        budgetRemaining: budget - spend,
        remainingDailyAllowance: remaining ? Math.max(0, budget - spend) / remaining : null,
      };
    },
  ),
  make(
    'experiment-cohort-allocation',
    '实验三组名额分配',
    'Experiment Cohort Allocation',
    '先为长期留出组分配整人数，再在剩余人群中划分实验与对照，合计守恒。',
    'Reserve a whole-person holdout first, then split the remaining audience between treatment and control while preserving the total.',
    'sample excluded groupShare',
    (sample, excluded, split) => {
      const holdout = Math.floor((sample * excluded) / 100),
        treatment = Math.floor(((sample - holdout) * split) / 100);
      return { holdout, treatment, control: sample - holdout - treatment };
    },
  ),
  make(
    'sponsorship-flat-rate-benchmark',
    '赞助固定价对标千展成本',
    'Sponsorship Flat Rate Benchmark',
    '用赞助报价与保证曝光比较标准千次展示报价，并反算对标所需曝光。',
    'Compare a flat sponsorship quote against a benchmark CPM and calculate guaranteed impressions needed to match the benchmark.',
    'fee impressions cpm',
    (fee, impressions, cpm) => ({
      effectiveCpm: (1000 * fee) / impressions,
      benchmarkCost: (impressions * cpm) / 1000,
      impressionsForParity: Math.ceil((1000 * fee) / cpm),
    }),
  ),
  make(
    'position-based-attribution-credit',
    '位置归因权重分配',
    'Position-Based Attribution Credit',
    '按自定首末权重分配成交额，其余归中间触点均分；双触点须分满全部权重。',
    'Allocate conversion value to first and last touches and spread residual credit evenly over middle touches; a two-touch path must use all credit at its ends.',
    'touches first last value',
    (touches, first, last, value) => {
      subset(first + last, 100);
      requireThat(
        touches > 2 || Math.abs(100 - first - last) < 1e-8,
        'A two-touch path must allocate all credit to its ends.',
      );
      return {
        firstTouch: (value * first) / 100,
        lastTouch: (value * last) / 100,
        middleTouchCount: touches - 2,
        creditPerMiddle: touches > 2 ? (value * (100 - first - last)) / 100 / (touches - 2) : 0,
      };
    },
  ),
  make(
    'email-delivery-purchase-funnel',
    '邮件送达至购买漏斗',
    'Email Delivery to Purchase Funnel',
    '以送达数为唯一点击率分母，再计算点击后购买率及整批发送转化率。',
    'Compute delivered messages, click rate among deliveries, click-to-purchase conversion and purchase rate per send.',
    'sent bounced clicked buying',
    (sent, bounced, clicked, buying) => {
      const delivered = sent - subset(bounced, sent);
      subset(clicked, delivered);
      subset(buying, clicked);
      return {
        delivered,
        deliveredClickPercent: delivered ? (100 * clicked) / delivered : null,
        purchasesPerClickPercent: clicked ? (100 * buying) / clicked : null,
        purchasesPerSendPercent: (100 * buying) / sent,
      };
    },
  ),
  make(
    'email-list-fatigue-projection',
    '连续发送名单衰减',
    'Email List Fatigue Projection',
    '不引入新增联系人，按每轮固定退订率外推多轮后的可触达名单。',
    'Project mailable list size and total sends across recurring campaigns assuming constant unsubscribe probability and no new contacts.',
    'subscribers unsub rounds',
    (subscribers, unsub, rounds) => {
      const r = 1 - unsub / 100;
      return {
        expectedRemaining: subscribers * r ** rounds,
        expectedUnsubscribed: subscribers * (1 - r ** rounds),
        expectedMessagesAcrossRounds: unsub
          ? (subscribers * -Math.expm1(rounds * Math.log1p(-unsub / 100))) / (unsub / 100)
          : subscribers * rounds,
      };
    },
  ),
  make(
    'affiliate-commission-clawback',
    '推广佣金退款冲回',
    'Affiliate Commission Clawback',
    '从推广伙伴归因销售中扣除退款和撤销额，计算佣金冲回和净佣金。',
    'Reconcile partner commissions charged on gross attributed sales with the reversals due for refunds and canceled sales.',
    'paid reversed commission',
    (sales, reversed, rate) => ({
      grossCommission: (sales * rate) / 100,
      reversal: (subset(reversed, sales) * rate) / 100,
      netCommission: ((sales - reversed) * rate) / 100,
    }),
  ),
  make(
    'referral-generation-forecast',
    '逐代推荐增长预测',
    'Referral Generation Forecast',
    '以每用户邀请数和激活率推演指定代数，假设无重复与市场饱和。',
    'Project referral generations from invitations and activation probability, assuming distinct recipients and no audience saturation.',
    'seed invitations activation generations',
    (seed, invites, activation, generations) => {
      const coefficient = (invites * activation) / 100;
      let current = seed,
        total = 0;
      for (let i = 0; i < generations; i++) {
        current *= coefficient;
        total += current;
      }
      return { viralCoefficient: coefficient, lastGeneration: current, cumulativeReferred: total };
    },
  ),
  make(
    'webinar-followup-capacity',
    '线上活动跟进容量',
    'Webinar Follow-Up Capacity',
    '从报名人数预测出席及合格线索，并换算一个工作日内所需跟进员工。',
    'Convert registrations to expected attendance and qualified leads, then estimate staffing for one-day follow-up.',
    'registrations attend qualify perRep',
    (registrations, attend, qualify, perRep) => {
      const attendees = (registrations * attend) / 100,
        leads = (attendees * qualify) / 100;
      return {
        expectedAttendees: attendees,
        expectedQualifiedLeads: leads,
        oneDayFollowupStaff: Math.ceil(leads / perRep),
      };
    },
  ),
  make(
    'weighted-sales-pipeline',
    '商机阶段加权预测',
    'Stage-Weighted Sales Pipeline',
    '按早期和晚期商机各自成交概率加权，计算期望成交额及目标缺口。',
    'Weight opportunity value in two disjoint pipeline stages by their close probabilities and compare expected bookings with target.',
    'early earlyWin late lateWin target',
    (early, a, late, b, target) => {
      const expected = (early * a + late * b) / 100;
      return {
        unweightedPipeline: early + late,
        expectedBookings: expected,
        expectedShortfall: Math.max(0, target - expected),
      };
    },
  ),
  make(
    'net-promoter-mix',
    '净推荐值与样本构成',
    'Net Promoter Score Mix',
    '按推荐者、中立者与贬损者三类样本计算 NPS 和极端评分占比。',
    'Compute NPS from promoter, passive and detractor counts and show the shares of promoters and detractors among all respondents.',
    'promoters passives detractors',
    (promoters, passives, detractors) => {
      const total = promoters + passives + detractors;
      return {
        respondents: total,
        promoterPercent: 100 * divide(promoters, total),
        detractorPercent: (100 * detractors) / total,
        netPromoterScore: (100 * (promoters - detractors)) / total,
      };
    },
  ),
  make(
    'cross-channel-lead-deduplication',
    '双渠道线索去重计数',
    'Cross-Channel Lead Deduplication',
    '用已知重叠人数合并线上与活动线索，分别列出渠道独占与总覆盖。',
    'Reconcile unique online and event lead counts using the known overlap to quantify their exclusive and total reach.',
    'online events overlap',
    (online, events, overlap) => {
      subset(overlap, Math.min(online, events));
      return {
        onlineOnly: online - overlap,
        eventOnly: events - overlap,
        shared: overlap,
        uniqueTotal: online + events - overlap,
      };
    },
  ),
  make(
    'paid-organic-cannibalization',
    '付费对自然订单的替代',
    'Paid Organic Cannibalization',
    '用估计的自然成交份额扣除替代订单，仅将新增贡献与付费投入比较。',
    'Deduct the paid-attributed orders expected to convert organically and value only incremental contribution against media spend.',
    'paidOrders organic profit spend',
    (orders, organic, profit, spend) => ({
      replacedOrganicOrders: (orders * organic) / 100,
      incrementalOrders: orders * (1 - organic / 100),
      incrementalNetContribution: orders * (1 - organic / 100) * profit - spend,
    }),
  ),
  make(
    'advertising-adstock-decay',
    '广告残留影响衰减',
    'Advertising Adstock Decay',
    '按指定半衰期衰减期初影响，再于期末叠加本期新增曝光影响。',
    'Decay opening adstock by the supplied half-life and add a new exposure pulse at period end.',
    'carry halfLife days pulse',
    (carry, halfLife, days, pulse) => {
      const remaining = carry * 2 ** (-days / halfLife);
      return { carryoverAtEnd: remaining, decayedUnits: carry - remaining, closingAdstock: remaining + pulse };
    },
  ),
  make(
    'share-of-voice-impression-gap',
    '展示声量份额缺口',
    'Share of Voice Impression Gap',
    '固定竞争对手展示量，计算本品牌达到目标展示份额所需的增量。',
    'Hold competitors’ impressions fixed and solve for the brand impressions required to reach a target share of category impressions.',
    'own other desired',
    (own, other, desired) => {
      const target = (other * desired) / (100 - desired);
      return {
        currentSharePercent: 100 * divide(own, own + other),
        brandImpressionsNeeded: Math.ceil(target),
        extraImpressions: Math.max(0, Math.ceil(target - own)),
      };
    },
  ),
];
