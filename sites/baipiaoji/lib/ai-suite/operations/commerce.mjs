import { number as n, count as c, percent as p, divide, subset, requireThat, toolBuilder } from './core.mjs';
const make = toolBuilder({
  sales: n('商品销售额', 'Merchandise sales', 12000),
  refunds: n('已退商品款', 'Refunded merchandise value', 800),
  commission: p('平台佣金率', 'Marketplace commission', 12),
  ads: n('平台内广告扣款', 'Marketplace ad deductions', 600),
  shipping: n('平台代扣运费', 'Marketplace shipping deductions', 450),
  price: n('商品标价', 'Listed unit price', 50, 0.01),
  quantity: c('本单商品数量', 'Units in basket', 5),
  rateA: p('渠道甲支付费率', 'Processor A percentage', 2.9),
  fixedA: n('渠道甲每笔固定费用', 'Processor A fixed fee per transaction', 0.3),
  rateB: p('渠道乙支付费率', 'Processor B percentage', 3.5),
  fixedB: n('渠道乙每笔固定费用', 'Processor B fixed fee per transaction', 0.1),
  orders: c('支付成功订单数', 'Paid orders', 800, 1),
  basket: n('平均订单金额', 'Average paid order amount', 45, 0.01),
  target: n('目标净入账额', 'Target net proceeds', 40),
  feeRate: p('支付费比例', 'Percentage fee on gross charge', 2.9, 0, 99.99),
  fee: n('每笔支付固定费', 'Fixed charge per transaction', 0.3),
  discount: p('第一重折扣减免比例', 'First percentage discount', 20),
  second: p('第二重折扣减免比例', 'Second percentage discount', 10),
  buy: c('每组须付费件数', 'Paid units required per promotion group', 2, 1),
  gift: c('每组免费件数', 'Free units per group', 1, 1),
  shippingCost: n('卖家承担运费', 'Seller-funded shipping', 6),
  contribution: p('发货前商品贡献率', 'Pre-shipping merchandise contribution margin', 40, 0.01),
  retained: n('希望保留每单贡献', 'Target order contribution after shipping', 10),
  oldQty: c('原价销量', 'Units at original price', 1000),
  newPrice: n('调整后单价', 'Revised selling price', 46, 0.01),
  elasticity: n('给定价格弹性（负值或零）', 'Supplied price elasticity (nonpositive)', -1.5, -20, 0),
  cap: n('折扣金额上限', 'Maximum discount amount', 18),
  threshold: n('用券前最低商品小计', 'Minimum eligible merchandise subtotal', 100),
  returns: p('预期退货比例', 'Expected unit return rate', 8),
  cost: n('商品单位成本', 'Merchandise unit cost', 22),
  reverse: n('每笔退货操作与回运成本', 'Reverse handling and shipping per return', 5),
  recovery: p('退回商品可收回成本比例', 'Share of product cost recoverable on return', 80),
  retain: p('换货后保留商品比例', 'Share of replacement orders kept', 88),
  replacement: n('换货额外履约支出', 'Extra cost of shipping a replacement', 4),
  fixed: n('活动固定执行费', 'Fixed campaign execution cost', 800),
  bundle: n('组合售价', 'Bundle selling price', 75),
  priceB: n('商品乙单价', 'Item B standalone price', 35),
  costB: n('商品乙单位成本', 'Item B unit cost', 14),
  displacement: p('替代原本单买两件的组合销量占比', 'Bundle sales replacing a full-price pair', 45),
  points: c('流通未兑积分', 'Outstanding points', 120000),
  redemption: p('预期积分核销比例', 'Expected point redemption share', 65),
  perPoint: n('每积分履约成本', 'Fulfillment cost per redeemed point', 0.008),
  credit: n('可用购物金余额', 'Available store credit', 35),
  subtotal: n('本单商品小计', 'Basket merchandise subtotal', 150),
  eligible: n('本单允许抵扣商品金额', 'Credit-eligible merchandise value', 80),
  issued: n('礼品卡面额总额', 'Gift card face value issued', 5000, 0.01),
  redeemed: n('此批累计核销', 'Redemptions to date from this cohort', 2200),
  breakage: p('预计终生未兑比例', 'Expected lifetime unredeemed share', 10),
  cashback: p('支付后返现比例', 'Cashback share on amount paid', 5),
  direct: c('直营订单数', 'Direct channel orders', 400),
  market: c('平台订单数', 'Marketplace orders', 600),
  meanDirect: n('直营每单贡献', 'Direct contribution per order', 18, -1e10),
  meanMarket: n('平台每单贡献', 'Marketplace contribution per order', 11, -1e10),
  win: p('提出争议后胜诉概率', 'Estimated dispute win probability', 55),
  recovered: n('胜诉可追回金额', 'Amount recoverable on successful dispute', 60),
  admin: n('提出争议的人工成本', 'Administrative cost of contesting', 12),
  dispute: n('仅败诉时追加费用', 'Extra fee only on failed contest', 6),
  opening: n('备用金期初余额', 'Opening cash float', 200),
  receipts: n('现金收款', 'Cash receipts', 1200),
  cashRefunds: n('现金退款', 'Cash refunds', 60),
  drops: n('已转出现金', 'Cash drops or deposits', 700),
  count: n('实际清点现金', 'Counted cash', 635),
});
export default [
  make(
    'marketplace-settlement-payout',
    '平台结算到款',
    'Marketplace Settlement Payout',
    '平台按退款后的商品销售净额收佣，再扣广告及运费，估算本期转款。',
    'Reconcile a marketplace payout when commission applies to sales after refunds, with ad and shipping deductions taken separately.',
    'sales refunds commission ads shipping',
    (sales, refunds, commission, ads, shipping) => {
      const net = sales - subset(refunds, sales);
      return {
        netSales: net,
        platformCommission: (net * commission) / 100,
        merchantPayout: net * (1 - commission / 100) - ads - shipping,
      };
    },
  ),
  make(
    'merchant-processor-fee-compare',
    '支付渠道费率比较',
    'Payment Processor Fee Comparison',
    '结合平均客单、成功笔数、百分比费率和固定单笔费比较两种报价。',
    'Compare two processor quotes across successful payments using order value, percentage rates and per-transaction fees.',
    'basket orders rateA fixedA rateB fixedB',
    (basket, orders, rateA, fixedA, rateB, fixedB) => {
      const a = orders * ((basket * rateA) / 100 + fixedA),
        b = orders * ((basket * rateB) / 100 + fixedB);
      return { processorACost: a, processorBCost: b, savingWithB: a - b };
    },
  ),
  make(
    'net-proceeds-gross-up',
    '净入账目标反算收款',
    'Net Proceeds Gross-Up',
    '按给定目标净入账和支付渠道固定、比例手续费反推应收价。',
    'Solve for the charge needed to net the target after a fixed payment fee and a percentage of the gross amount.',
    'target feeRate fee',
    (target, rate, fee) => {
      const charge = (target + fee) / (1 - rate / 100);
      return { grossChargeBeforeRounding: charge, processorFee: charge - target };
    },
  ),
  make(
    'sequential-retail-discounts',
    '叠加折扣实付价',
    'Sequential Retail Discounts',
    '两次折扣依次作用于余价，计算实际节省和等效减免比例。',
    'Apply two discounts sequentially to the remaining merchandise price and show the effective combined saving.',
    'price discount second',
    (price, first, second) => {
      const net = price * (1 - first / 100) * (1 - second / 100);
      return { finalPrice: net, saving: price - net, effectiveDiscountPercent: 100 * (1 - net / price) };
    },
  ),
  make(
    'buy-get-promotion-basket',
    '买赠活动结算',
    'Buy and Get Promotion Basket',
    '同价商品每完整促销组赠指定件数，未成组商品正常收费。',
    'Apply a same-price buy-X-get-Y-free promotion to complete groups, charging remaining ungrouped units at list price.',
    'price quantity buy gift',
    (price, quantity, buy, gift) => {
      const free = Math.floor(quantity / (buy + gift)) * gift;
      return { freeUnits: free, chargedUnits: quantity - free, merchandiseCharge: (quantity - free) * price };
    },
  ),
  make(
    'free-shipping-contribution-floor',
    '包邮起点贡献测算',
    'Free Shipping Contribution Floor',
    '按给定商品贡献率，反算覆盖卖家运费并保留目标贡献的订单起点。',
    'Find the merchandise subtotal required to fund shipping while retaining a target order contribution.',
    'shippingCost retained contribution',
    (shipping, retained, margin) => ({
      breakEvenSubtotal: shipping / (margin / 100),
      subtotalForTarget: (shipping + retained) / (margin / 100),
    }),
  ),
  make(
    'constant-elasticity-price-scenario',
    '价格弹性销量情景',
    'Constant Elasticity Price Scenario',
    '以给定恒定价格弹性模拟调价后的销量及商品贡献。',
    'Model new demand with a supplied constant-elasticity power curve and compare contribution at a fixed unit cost.',
    'price newPrice oldQty elasticity cost',
    (price, newPrice, units, elasticity, cost) => {
      const forecast = units * (newPrice / price) ** elasticity;
      return {
        forecastUnits: forecast,
        forecastRevenue: forecast * newPrice,
        contributionChange: forecast * (newPrice - cost) - units * (price - cost),
      };
    },
  ),
  make(
    'capped-threshold-coupon',
    '满额封顶折扣券',
    'Capped Threshold Coupon',
    '先检查商品小计是否达门槛，再将百分比优惠限制在券面上限。',
    'Check the merchandise threshold before applying the percentage coupon and cap the discount at the allowed amount.',
    'subtotal threshold discount cap',
    (subtotal, threshold, rate, cap) => {
      const eligible = subtotal >= threshold,
        discount = eligible ? Math.min(cap, (subtotal * rate) / 100) : 0;
      return {
        eligible,
        discount,
        payable: subtotal - discount,
        spendToQualify: Math.max(0, threshold - subtotal),
      };
    },
  ),
  make(
    'return-adjusted-order-profit',
    '预期退货后的订单贡献',
    'Return-Adjusted Order Contribution',
    '假设退货全额退款，部分商品成本可收回，发货成本发生于每笔订单。',
    'Model full refunds, partial product-cost recovery and reverse handling, with outbound shipping incurred on every order.',
    'price cost returns recovery shippingCost reverse',
    (price, cost, returns, recovery, shipping, reverse) => {
      const kept = price - cost - shipping,
        returned = -cost * (1 - recovery / 100) - shipping - reverse;
      return {
        keptOrderContribution: kept,
        returnedOrderContribution: returned,
        expectedContribution: kept * (1 - returns / 100) + (returned * returns) / 100,
      };
    },
  ),
  make(
    'exchange-offer-increment',
    '换货相较退款的增量价值',
    'Exchange Offer Increment',
    '即时退款为基准，换货成功保留原收入并承担商品成本，失败则退款并损失替换品成本。',
    'Compare offering a replacement with refunding now; a kept exchange retains the sale and every attempt consumes a replacement and shipping.',
    'price cost retain replacement',
    (price, cost, retained, shipping) => ({
      expectedRevenueRetained: (price * retained) / 100,
      incrementalReplacementCost: cost + shipping,
      expectedGainVersusRefund: (price * retained) / 100 - cost - shipping,
    }),
  ),
  make(
    'markdown-volume-hurdle',
    '降价保利所需销量',
    'Markdown Volume Hurdle',
    '用折后单件贡献计算抵平原贡献和新增活动固定费所需的整件销量。',
    'Find whole units needed at the reduced price to preserve original total contribution and recover incremental campaign cost.',
    'price newPrice cost oldQty fixed',
    (price, revised, cost, units, fee) => {
      const target = units * (price - cost) + fee;
      return {
        originalContribution: units * (price - cost),
        revisedUnitContribution: revised - cost,
        requiredUnits: Math.ceil(divide(Math.max(0, target), revised - cost)),
      };
    },
  ),
  make(
    'bundle-cannibalization-impact',
    '套装对原价购买的影响',
    'Bundle Cannibalization Impact',
    '估算每售一套所得贡献，扣除被替代的原价组合贡献。',
    'Calculate bundle contribution per sale net of the expected standalone-pair contribution displaced by the bundle.',
    'price priceB cost costB bundle displacement',
    (a, b, costA, costB, bundle, displacement) => ({
      bundleContribution: bundle - costA - costB,
      fullPairContribution: a + b - costA - costB,
      incrementalContributionPerBundle: bundle - costA - costB - ((a + b - costA - costB) * displacement) / 100,
    }),
  ),
  make(
    'loyalty-redemption-cost',
    '积分核销成本准备',
    'Loyalty Redemption Cost',
    '用未兑积分、预期核销率和每积分履约成本估算履约支出。',
    'Estimate future fulfillment spend on outstanding loyalty points using a redemption assumption and cost per point.',
    'points redemption perPoint',
    (points, redemption, cost) => ({
      expectedRedeemedPoints: (points * redemption) / 100,
      expectedFulfillmentCost: (points * redemption * cost) / 100,
    }),
  ),
  make(
    'store-credit-tender-split',
    '购物金与现金拆分',
    'Store Credit Tender Split',
    '仅对允许抵扣的商品使用购物金，计算现金应付和卡内余额。',
    'Apply store credit only to eligible merchandise and split the basket between redeemed credit and a cash tender.',
    'subtotal eligible credit',
    (subtotal, eligible, credit) => {
      const redeemed = Math.min(subset(eligible, subtotal), credit);
      return { creditRedeemed: redeemed, otherTender: subtotal - redeemed, unusedCredit: credit - redeemed };
    },
  ),
  make(
    'gift-card-redemption-forecast',
    '礼品卡未兑余额预测',
    'Gift Card Redemption Forecast',
    '结合已核销面额与预计终生未兑比例，估算未来尚会核销的金额。',
    'Reconcile gift card face value with actual redemptions and an expected lifetime non-redemption share to project further redemptions.',
    'issued redeemed breakage',
    (issued, redeemed, breakage) => {
      subset(redeemed, issued);
      const predicted = Math.max(redeemed, issued * (1 - breakage / 100));
      return {
        outstandingFaceValue: issued - redeemed,
        furtherExpectedRedemption: predicted - redeemed,
        projectedFinalUnredeemed: issued - predicted,
      };
    },
  ),
  make(
    'discount-cashback-net-spend',
    '折扣返现后净支出',
    'Discount and Cashback Net Spend',
    '先打折付款，再按实付金额返现，分别列出当前支付和最终净支出。',
    'Discount the list price first, then accrue cashback on the actual payment to distinguish checkout payment from eventual net spend.',
    'price discount cashback',
    (price, discount, cashback) => {
      const paid = price * (1 - discount / 100);
      return {
        chargeToday: paid,
        cashbackEarned: (paid * cashback) / 100,
        netAfterCashback: paid * (1 - cashback / 100),
      };
    },
  ),
  make(
    'channel-mix-contribution',
    '直营与平台渠道贡献结构',
    'Channel Mix Contribution',
    '按渠道实际订单数和每单贡献计算总贡献及混合单均贡献。',
    'Combine direct and marketplace order counts and per-order contribution to show channel totals and blended unit economics.',
    'direct meanDirect market meanMarket',
    (direct, dp, market, mp) => ({
      directContribution: direct * dp,
      marketplaceContribution: market * mp,
      blendedContributionPerOrder: divide(direct * dp + market * mp, direct + market),
    }),
  ),
  make(
    'chargeback-dispute-value',
    '拒付申诉期望价值',
    'Chargeback Dispute Value',
    '按胜诉概率估算可追回金额，扣除办理成本及败诉追加费。',
    'Estimate incremental recovery from contesting a chargeback after administrative cost and an extra fee payable only if the contest fails.',
    'win recovered admin dispute',
    (win, recover, admin, fee) => ({
      expectedRecovery: (win * recover) / 100,
      expectedNetAdvantage: (win * recover) / 100 - admin - (1 - win / 100) * fee,
      breakEvenWinPercent: 100 * divide(admin + fee, recover + fee),
    }),
  ),
  make(
    'minimum-cart-upsell-gap',
    '整件凑单最低数量',
    'Minimum Cart Upsell Quantity',
    '用指定加购品的单价反算到达订单门槛所需整件数及超出额。',
    'Find the smallest number of whole add-on items required to cross a basket threshold and quantify the overshoot.',
    'subtotal threshold price',
    (subtotal, threshold, price) => {
      const units = Math.ceil(Math.max(0, threshold - subtotal) / price);
      return {
        addOnUnits: units,
        revisedBasket: subtotal + units * price,
        thresholdHeadroom: subtotal + units * price - threshold,
      };
    },
  ),
  make(
    'cash-drawer-closeout',
    '收银机交班结算',
    'Cash Drawer Closeout',
    '以备用金、现金销售、退款和现金转出对账实盘余额。',
    'Reconcile the starting float, cash receipts, refunds and drops with the final counted drawer balance.',
    'opening receipts cashRefunds drops count',
    (opening, receipts, refunds, drops, count) => ({
      expectedDrawer: opening + receipts - refunds - drops,
      countedCash: count,
      overShort: count - (opening + receipts - refunds - drops),
    }),
  ),
];
