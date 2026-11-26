const rates = ['中国银行外汇牌价', 'Bank of China exchange-rate table', 'https://www.boc.cn/sourcedb/whpj/index.html'];
const spot = ['中国银行即期结售汇', 'Bank of China spot FX settlement', 'https://www.boc.cn/cbservice/cb4/cb41/200807/t20080707_906.html'];
const remittance = ['中国银行对公汇入汇款', 'Bank of China corporate inward remittance', 'https://www.boc.cn/cbservice/cb3/cb33/200807/t20080702_866.html'];
const fees = ['中国银行国际结算业务资费说明', 'Bank of China international settlement fee schedule', 'https://www.boc.cn/cbservice/cb3/cb33/200807/t20080701_852.html'];
const forward = ['中国银行远期结售汇', 'Bank of China FX forwards', 'https://www.boc.cn/cbservice/cb4/cb41/202511/t20251114_25569754.html'];
const risk = ['国家外汇管理局企业汇率风险管理资料', 'SAFE corporate foreign-exchange risk guidance', 'https://www.safe.gov.cn/safe/2024/0522/24438.html'];
const roster = ['国家外汇管理局汇发〔2024〕11号', 'SAFE trade FX notice, Circular 11 of 2024', 'https://www.safe.gov.cn/safe/2024/0407/24204.html'];
const ecommerce = ['国家外汇管理局汇发〔2025〕47号', 'SAFE trade settlement notice, Circular 47 of 2025', 'https://www.safe.gov.cn/safe/2025/1027/26742.html'];

function positive(value) {
  if (value <= 0) throw new RangeError('positive_input_required');
  return value;
}

function afterDeductions(amount, deductions) {
  const remainder = amount - deductions;
  if (remainder < -Number.EPSILON * Math.max(amount, deductions)) throw new RangeError('deductions_exceed_amount');
  return Math.max(0, remainder);
}

function money(value) {
  return Number(value.toFixed(2));
}

function quote(value) {
  return Number(value.toFixed(8));
}

function elapsed(start, end) {
  return (Date.parse(end) - Date.parse(start)) / 86400000;
}

function orderedDays(start, end) {
  const days = elapsed(start, end);
  if (days < 0) throw new RangeError('date_order');
  return days;
}

function readiness(value) {
  if (value === 'yes') return ['已核对', 'Checked'];
  if (value === 'no') return ['需补齐', 'Missing'];
  return ['待确认', 'Unconfirmed'];
}

function balanceStatus(value) {
  if (value === 0) return ['账面已匹配', 'Matched'];
  if (value > 0) return ['仍有差额待核对', 'Shortfall to reconcile'];
  return ['多收金额待核对', 'Overage to reconcile'];
}

export default [
  {
    id: 'fx-bank-quote-unit',
    zh: '外币牌价单位折算',
    en: 'Bank FX quote unit converter',
    purpose: ['把银行按每 100 或其他外币单位公布的现汇买入报价统一折成单价，再估算一笔结汇额。', 'Normalize a bank buy quote per 100 or another foreign-currency lot to one unit and estimate the CNY proceeds.'],
    scope: ['适用于境内出口方卖出现汇。原报价和报价单位均由经办银行提供，估算为未扣费的人民币金额。', 'For a mainland exporter selling foreign currency. Use the handling bank’s quote and lot size. Estimated CNY proceeds are before fees.'],
    source: rates,
    inputs: [
      ['amount', 'number', '待结汇金额（外币）', 'Foreign-currency amount to sell', 18000],
      ['buyQuote', 'number', '银行现汇买入报价（人民币）', 'Bank buy quote (CNY per quoted lot)', 718.25],
      ['lot', 'integer', '报价对应的外币单位数', 'Foreign currency units per quoted lot', 100],
    ],
    run: v => {
      const rate = positive(v.buyQuote) / positive(v.lot);
      return [
        ['每 1 外币单位折合人民币', 'CNY per one foreign currency unit', quote(rate)],
        ['未扣费折算额（人民币）', 'Gross proceeds (CNY)', money(v.amount * rate)],
      ];
    },
  },
  {
    id: 'fx-remittance-net',
    zh: '入账与结汇净收款',
    en: 'Net inward remittance proceeds',
    purpose: ['逐层扣除中转费、入账费和结汇环节手续费，预估到账外币及可用人民币。', 'Deduct intermediary, receiving and conversion charges in order to estimate credited FX and usable CNY.'],
    scope: ['外币手续费先从本金扣除，人民币比例费按结汇毛额计收。各费率由银行或支付商实际报价提供。', 'Foreign-currency deductions reduce principal first. The percentage CNY fee is applied to gross conversion proceeds. Use provider quotes.'],
    source: remittance,
    inputs: [
      ['invoice', 'number', '汇出本金（外币）', 'Principal sent (foreign currency)', 12500],
      ['intermediary', 'number', '中转扣费（外币）', 'Intermediary deduction (foreign currency)', 20],
      ['receiveFee', 'number', '入账扣费（外币）', 'Receiving deduction (foreign currency)', 8],
      ['rate', 'number', '结汇报价（人民币／1 外币）', 'Settlement quote (CNY per one foreign unit)', 7.16],
      ['fixedFee', 'number', '结汇固定费（人民币）', 'Fixed conversion fee (CNY)', 25],
      ['feePct', 'percent', '结汇比例费（%）', 'Percentage conversion fee (%)', 0.1],
    ],
    run: v => {
      const credit = afterDeductions(v.invoice, v.intermediary + v.receiveFee);
      const gross = credit * positive(v.rate);
      const cost = v.fixedFee + gross * v.feePct / 100;
      return [
        ['入账外币', 'Foreign currency credited', money(credit)],
        ['结汇环节扣费（人民币）', 'Conversion charges (CNY)', money(cost)],
        ['结汇净款（人民币）', 'Net settlement proceeds (CNY)', money(afterDeductions(gross, cost))],
      ];
    },
  },
  {
    id: 'fx-transfer-fee-bounds',
    zh: '电汇比例费与上下限',
    en: 'Wire fee minimum and cap',
    purpose: ['依据经办行报价，计算比例手续费经最低、最高限制后的金额及附加费用。', 'Calculate a bank’s percentage wire charge after its minimum and cap, plus other billed fees.'],
    scope: ['金额与费用统一输入人民币或已折算的人民币等值。按比例费先夹在上下限之间，再加单独列出的附加费。', 'Provide the payment and fees in CNY or their CNY equivalents. Clamp the percentage fee to its bounds before adding separately listed fees.'],
    source: fees,
    inputs: [
      ['base', 'number', '计费本金（人民币）', 'Fee base (CNY)', 82000],
      ['pct', 'percent', '银行比例费（%）', 'Quoted fee rate (%)', 0.1],
      ['floor', 'number', '最低比例手续费（人民币）', 'Minimum percentage charge (CNY)', 50],
      ['ceiling', 'number', '最高比例手续费（人民币）', 'Maximum percentage charge (CNY)', 1000],
      ['extra', 'number', '电讯等额外费用（人民币）', 'Telecom and other fees (CNY)', 60],
    ],
    run: v => {
      const base = positive(v.base);
      if (v.floor > v.ceiling) throw new RangeError('invalid_fee_limits');
      const proportional = base * v.pct / 100;
      const fee = Math.max(v.floor, Math.min(v.ceiling, proportional));
      const total = fee + v.extra;
      return [
        ['限额前比例手续费（人民币）', 'Unbounded percentage charge (CNY)', money(proportional)],
        ['总手续费（人民币）', 'Total fees (CNY)', money(total)],
        ['总手续费占本金（%）', 'Total fees as a share of principal (%)', quote(total / base * 100)],
      ];
    },
  },
  {
    id: 'fx-payout-channel-comparison',
    zh: '跨境收款渠道净额对比',
    en: 'Payout channel net proceeds comparison',
    purpose: ['对同一张外币账单比较两条已报价渠道的汇差、费用和预计净收款。', 'Compare FX spread, fees and actual estimated CNY proceeds for two quoted rails on one foreign-currency invoice.'],
    scope: ['每个渠道的人民币费应包含本次报价中的全部费用。外币扣费先按对应渠道报价折算并归入该费用。参考汇率由使用人输入。', 'Enter all costs per rail in CNY, converting any foreign-currency deductions at that rail’s quote. Provide a CNY-per-foreign-unit reference rate.'],
    source: spot,
    inputs: [
      ['invoice', 'number', '同一笔本金（外币）', 'Common principal (foreign currency)', 15000],
      ['reference', 'number', '参考价（人民币／1 外币）', 'Reference rate (CNY per foreign unit)', 7.18],
      ['rateA', 'number', '渠道 A 报价（人民币／1 外币）', 'Rail A quote (CNY per foreign unit)', 7.15],
      ['feeA', 'number', '渠道 A 总费用（人民币）', 'Rail A fees (CNY)', 45],
      ['rateB', 'number', '渠道 B 报价（人民币／1 外币）', 'Rail B quote (CNY per foreign unit)', 7.17],
      ['feeB', 'number', '渠道 B 总费用（人民币）', 'Rail B fees (CNY)', 210],
    ],
    run: v => {
      const amount = positive(v.invoice);
      const reference = amount * positive(v.reference);
      const a = afterDeductions(amount * positive(v.rateA), v.feeA);
      const b = afterDeductions(amount * positive(v.rateB), v.feeB);
      return [
        ['渠道 A 净收款（人民币）', 'Rail A net proceeds (CNY)', money(a)],
        ['渠道 B 净收款（人民币）', 'Rail B net proceeds (CNY)', money(b)],
        ['A 净额减 B 净额（人民币）', 'Rail A less rail B (CNY)', money(a - b)],
        ['A 较参考毛额少收（人民币）', 'Rail A shortfall vs. reference gross proceeds (CNY)', money(reference - a)],
        ['B 较参考毛额少收（人民币）', 'Rail B shortfall vs. reference gross proceeds (CNY)', money(reference - b)],
      ];
    },
  },
  {
    id: 'fx-break-even-rate',
    zh: '目标净收款反算结汇价',
    en: 'Break-even settlement rate',
    purpose: ['从人民币净回款目标、可结汇本金和收费结构出发，反算达到目标的报价。', 'Derive the FX quote needed to meet a net CNY target at the stated eligible principal and fee structure.'],
    scope: ['按单次结汇、固定费加按毛结汇额计收的比例费计算。目标可包含由企业自行确认的成本与利润。', 'Assumes one settlement, a fixed charge and a percentage charge on gross CNY proceeds. The target can reflect your own cost and margin.'],
    source: spot,
    inputs: [
      ['invoice', 'number', '外币本金', 'Foreign-currency principal', 20000],
      ['deduct', 'number', '已知外币扣费', 'Known foreign-currency deductions', 30],
      ['goal', 'number', '目标净回款（人民币）', 'Target net proceeds (CNY)', 140000],
      ['fixed', 'number', '固定费用（人民币）', 'Fixed charge (CNY)', 80],
      ['pct', 'percent', '按毛额收取的比例费（%）', 'Charge on gross proceeds (%)', 0.12],
    ],
    run: v => {
      const credit = positive(afterDeductions(v.invoice, v.deduct));
      const gross = (v.goal + v.fixed) / positive(1 - v.pct / 100);
      return [
        ['可结汇本金（外币）', 'Available principal (foreign currency)', money(credit)],
        ['所需结汇毛额（人民币）', 'Required gross proceeds (CNY)', money(gross)],
        ['达到目标所需报价（人民币／1 外币）', 'Minimum required quote (CNY per foreign unit)', Math.ceil(gross / credit * 1e8) / 1e8],
      ];
    },
  },
  {
    id: 'fx-receivable-stress',
    zh: '出口应收汇率压力测试',
    en: 'Export receivable FX stress test',
    purpose: ['用预算汇率和自定波动幅度计算同笔应收在升降情景下的人民币回款及预算缺口。', 'Use a budget rate and a specified shock to quantify CNY collection and budget shortfalls for an export receivable.'],
    scope: ['以人民币／1 外币报价为基准上下各移动输入百分比。假定应收本金不变，费用与违约风险单独评估。', 'Apply the selected shock in both directions to a CNY-per-foreign-unit rate. The receivable principal is fixed. Evaluate charges and credit risk separately.'],
    source: risk,
    inputs: [
      ['amount', 'number', '预计出口应收（外币）', 'Expected export receivable (foreign currency)', 42000],
      ['rate', 'number', '预算汇率（人民币／1 外币）', 'Budget rate (CNY per foreign unit)', 7.15],
      ['shock', 'percent', '报价变化幅度（%）', 'Rate movement stress (%)', 3],
      ['floor', 'number', '现金流警戒额（人民币）', 'Cash-flow threshold (CNY)', 290000],
    ],
    run: v => {
      const base = v.amount * positive(v.rate);
      const low = base * (1 - v.shock / 100);
      const high = base * (1 + v.shock / 100);
      return [
        ['基准回款（人民币）', 'Base proceeds (CNY)', money(base)],
        ['低报价回款（人民币）', 'Lower-rate proceeds (CNY)', money(low)],
        ['高报价回款（人民币）', 'Higher-rate proceeds (CNY)', money(high)],
        ['低报价情景短缺额（人民币）', 'Lower-rate shortfall vs. threshold (CNY)', money(Math.max(v.floor - low, 0))],
      ];
    },
  },
  {
    id: 'fx-realized-cash-difference',
    zh: '单笔结汇与记账差额',
    en: 'Realized FX cash reconciliation',
    purpose: ['将实际结汇收入对照应收账面金额，并列出另扣费用后的资金差额。', 'Compare a realized conversion with the book value of the settled receivable and show the cash difference after separately charged fees.'],
    scope: ['同一结汇批次的期初账面金额与实际未扣费兑换金额以人民币输入。科目确认或会计列报由企业按适用制度另行处理。', 'Enter the same settled lot’s book value and actual gross conversion in CNY. Accounting classification follows the entity’s applicable rules.'],
    source: risk,
    inputs: [
      ['book', 'number', '本批应收账面额（人民币）', 'Book value of the settled lot (CNY)', 105000],
      ['proceeds', 'number', '实际结汇毛额（人民币）', 'Actual gross proceeds (CNY)', 106200],
      ['fee', 'number', '另扣费用（人民币）', 'Separately booked fees (CNY)', 120],
    ],
    run: v => {
      const net = afterDeductions(v.proceeds, v.fee);
      return [
        ['未扣费汇兑差额（人民币）', 'Gross FX difference (CNY)', money(v.proceeds - v.book)],
        ['实际净收款（人民币）', 'Net CNY credited', money(net)],
        ['扣费后资金差额（人民币）', 'Net cash difference vs. book value (CNY)', money(net - v.book)],
      ];
    },
  },
  {
    id: 'fx-natural-offset',
    zh: '同币种应收应付敞口',
    en: 'Same-currency natural FX offset',
    purpose: ['在同一交割时段内匹配同币种应收与应付，量化尚未覆盖的外币净敞口。', 'Match same-currency receivables and payables in one time bucket to quantify remaining net foreign-currency exposure.'],
    scope: ['输入应为同一主体、同一币种、同期可用的现金流。结果供内部资金预算，实际收付仍按银行和交易条款办理。', 'Use cash flows of one entity, currency and time bucket. The output is for treasury planning. Actual settlement follows bank and transaction terms.'],
    source: risk,
    inputs: [
      ['receivable', 'number', '同期预计应收（外币）', 'Receivables in the time bucket (foreign currency)', 32000],
      ['payable', 'number', '同期预计应付（同一外币）', 'Payables in the same currency and bucket', 11000],
      ['rate', 'number', '折算参考价（人民币／1 外币）', 'Conversion reference (CNY per foreign unit)', 7.16],
    ],
    run: v => {
      const gap = v.receivable - v.payable;
      return [
        ['金额可匹配部分（外币）', 'Matched portion (foreign currency)', money(Math.min(v.receivable, v.payable))],
        ['敞口净额（外币，应收为正）', 'Net exposure (foreign currency, positive for a receivable)', money(gap)],
        ['敞口人民币等值', 'CNY equivalent of net exposure', money(gap * positive(v.rate))],
      ];
    },
  },
  {
    id: 'fx-installment-match',
    zh: '分批收款与发票对账',
    en: 'Installment-to-invoice reconciliation',
    purpose: ['核对两笔外币分批入账和有凭证的扣款是否匹配同一发票。', 'Reconcile up to two foreign-currency credits and documented deductions against one invoice.'],
    scope: ['同一发票、同一币种。未收到的批次填零。仅将有对应凭证的扣款计入已解释金额。', 'Use one invoice and one currency. Enter zero for an unreceived installment. Count only deductions with supporting evidence.'],
    source: remittance,
    inputs: [
      ['invoice', 'number', '发票金额（外币）', 'Invoice amount (foreign currency)', 24000],
      ['first', 'number', '第一笔实入外币', 'First net bank credit (foreign currency)', 7200],
      ['second', 'number', '第二笔实入外币', 'Second net bank credit (foreign currency)', 16775],
      ['deductions', 'number', '凭证能解释的扣款（外币）', 'Documented deductions (foreign currency)', 25],
    ],
    run: v => {
      const credit = v.first + v.second;
      const difference = money(v.invoice - credit - v.deductions);
      return [
        ['实际合计入账（外币）', 'Total net credits (foreign currency)', money(credit)],
        ['仍需核对的差额（外币）', 'Unexplained difference (foreign currency)', difference],
        ['发票核对状态', 'Invoice reconciliation status', balanceStatus(difference)],
      ];
    },
  },
  {
    id: 'fx-invoice-age',
    zh: '出口应收逾期和回款缺口',
    en: 'Export receivable ageing',
    purpose: ['对未完结的出口应收计算剩余本金、内部账龄及相对合同到期日的拖延。', 'Calculate the remaining principal, internal age and delay beyond the contractual due date for an open export invoice.'],
    scope: ['按自然日计算合同账龄。核对日取财务实际结账日，银行或监管申报时限按适用业务另行核对。', 'Uses calendar days for contractual ageing. Use your actual accounting cut-off. Check bank and reporting deadlines for the applicable transaction separately.'],
    source: risk,
    inputs: [
      ['invoiceDate', 'date', '发票日期', 'Invoice date', '2026-10-01'],
      ['dueDate', 'date', '合同到期日', 'Contractual due date', '2026-11-01'],
      ['asOf', 'date', '账龄核对日', 'Ageing cut-off date', '2026-11-26'],
      ['amount', 'number', '应收金额（外币）', 'Invoice principal (foreign currency)', 30000],
      ['paid', 'number', '累计已收且已核销（外币）', 'Credited amount applied (foreign currency)', 20000],
    ],
    run: v => {
      orderedDays(v.invoiceDate, v.dueDate);
      const age = orderedDays(v.invoiceDate, v.asOf);
      const open = money(afterDeductions(v.amount, v.paid));
      const delta = elapsed(v.dueDate, v.asOf);
      return [
        ['未核销本金（外币）', 'Open principal (foreign currency)', open],
        ['发票账龄（自然日）', 'Invoice age (calendar days)', age],
        ['未结清本金逾期（自然日）', 'Days overdue for open principal', open > 0 ? Math.max(0, delta) : 0],
      ];
    },
  },
  {
    id: 'fx-transfer-timing',
    zh: '跨境汇款处理时长排查',
    en: 'Cross-border payment timing check',
    purpose: ['按汇出回执、银行实际入账和观察时间，跟踪一笔汇入款的实际延迟。', 'Track the elapsed time of an inward payment from the sender’s confirmation to value date or the review date.'],
    scope: ['已入账时填实际入账日期，待入账时填观察日期。与用户填报的内部时长目标比较，天数均为自然日。', 'Use the actual credit date for a posted transfer, or the review date for a pending transfer. Compare against your own calendar-day target.'],
    source: remittance,
    inputs: [
      ['sent', 'date', '汇出回执日期', 'Sender receipt date', '2026-11-18'],
      ['ref', 'date', '实际入账或观察日期', 'Credit or review date', '2026-11-23'],
      ['budget', 'integer', '内部处理目标（自然日）', 'Internal target (calendar days)', 3],
      ['credited', 'choice', '银行已确认入账', 'Bank credit confirmed', 'no'],
    ],
    run: v => {
      const days = orderedDays(v.sent, v.ref);
      return [
        ['经过自然日', 'Elapsed calendar days', days],
        ['超内部目标天数', 'Calendar days over internal target', Math.max(0, days - v.budget)],
        ['入账核实状态', 'Credit confirmation status', readiness(v.credited)],
      ];
    },
  },
  {
    id: 'fx-forward-spot-parity',
    zh: '全额远期与即期情景对照',
    en: 'Full forward vs. spot scenario',
    purpose: ['对同一笔未来应收，比较全额远期交割和假设即期价的净回款，并反算净额相等的即期价。', 'Compare net proceeds for a fully covered forward vs. a hypothetical spot quote and derive their net-proceeds parity rate.'],
    scope: ['计算假定交易同日且本金全额匹配。汇率和费用均填写已获银行报价或内部假设。', 'Assumes matched principal and the same settlement date. Enter an indicative bank quote or your own scenario for each rate and fee.'],
    source: forward,
    inputs: [
      ['amount', 'number', '到期结汇本金（外币）', 'Maturity principal (foreign currency)', 28000],
      ['forwardRate', 'number', '远期价（人民币／1 外币）', 'Forward quote (CNY per foreign unit)', 7.13],
      ['possibleSpot', 'number', '情景即期价（人民币／1 外币）', 'Hypothetical spot quote (CNY per foreign unit)', 7.08],
      ['forwardFee', 'number', '远期固定费（人民币）', 'Forward fixed charge (CNY)', 75],
      ['spotFee', 'number', '即期固定费（人民币）', 'Spot fixed charge (CNY)', 30],
    ],
    run: v => {
      const amount = positive(v.amount);
      const contracted = afterDeductions(amount * positive(v.forwardRate), v.forwardFee);
      const alternative = afterDeductions(amount * positive(v.possibleSpot), v.spotFee);
      return [
        ['远期情景净收款（人民币）', 'Forward scenario net proceeds (CNY)', money(contracted)],
        ['即期情景净收款（人民币）', 'Spot scenario net proceeds (CNY)', money(alternative)],
        ['两情景净额差（人民币，远期减即期）', 'Net difference (CNY, forward less spot)', money(contracted - alternative)],
        ['两情景净额相等的即期价', 'Net-proceeds parity spot rate (CNY per foreign unit)', quote((contracted + v.spotFee) / amount)],
      ];
    },
  },
  {
    id: 'fx-partial-forward',
    zh: '部分锁汇净回款测算',
    en: 'Partial-forward proceeds',
    purpose: ['拆分同一笔应收的已锁汇和未锁汇部分，计算组合回款与有效结汇价。', 'Split an export receivable into forward-covered and unfilled portions to estimate combined proceeds and the effective rate.'],
    scope: ['假定两部分到期均可交割，分别按约定远期价和假设即期价折算，最后扣整笔合计人民币费用。', 'Assume both portions can settle on maturity. Apply the contracted forward and hypothetical spot quotes, then subtract combined CNY fees.'],
    source: forward,
    inputs: [
      ['amount', 'number', '应收总本金（外币）', 'Total principal (foreign currency)', 45000],
      ['hedged', 'number', '已锁汇本金（同一外币）', 'Forward-covered principal (same currency)', 25000],
      ['forwardRate', 'number', '锁汇率（人民币／1 外币）', 'Contracted rate (CNY per foreign unit)', 7.14],
      ['spotRate', 'number', '未锁部分假设汇率（人民币／1 外币）', 'Hypothetical residual rate (CNY per foreign unit)', 7.07],
      ['fees', 'number', '两部分合计费用（人民币）', 'Combined charges (CNY)', 140],
    ],
    run: v => {
      const amount = positive(v.amount);
      const residual = afterDeductions(amount, v.hedged);
      const locked = v.hedged * positive(v.forwardRate);
      const floating = residual * positive(v.spotRate);
      const net = afterDeductions(locked + floating, v.fees);
      return [
        ['远期折算额（人民币）', 'Forward-covered proceeds (CNY)', money(locked)],
        ['未锁汇本金（外币）', 'Residual principal (foreign currency)', money(residual)],
        ['预计组合净额（人民币）', 'Combined net proceeds (CNY)', money(net)],
        ['含费有效结汇价（人民币／1 外币）', 'All-in effective rate (CNY per foreign unit)', quote(net / amount)],
      ];
    },
  },
  {
    id: 'fx-forward-delivery-shortfall',
    zh: '远期交割本金缺口',
    en: 'Forward delivery principal shortfall',
    purpose: ['将待交割本金与已有和预计可用外币相匹配，给出需同经办行核对的资金缺口。', 'Match delivery principal with funds on hand and additional funds due before expiry to identify any gap for the handling bank.'],
    scope: ['仅合计可用于同币种交割的可用余额和到期前确认入账的预计资金，避免把同一笔回款重复计入。', 'Include available same-currency cash and additional incoming funds due before delivery. Count each inflow once.'],
    source: forward,
    inputs: [
      ['delivery', 'number', '待交割合约本金（外币）', 'Contract principal due for delivery (foreign currency)', 36000],
      ['available', 'number', '当前可用余额（同一外币）', 'Cash currently available (same currency)', 22000],
      ['expected', 'number', '到期前额外预计可用资金（同一外币）', 'Additional cash expected before delivery (same currency)', 9500],
    ],
    run: v => {
      const delivery = positive(v.delivery);
      const available = v.available + v.expected;
      return [
        ['可覆盖交割本金（外币）', 'Principal covered (foreign currency)', money(Math.min(available, delivery))],
        ['待核对本金缺口（外币）', 'Delivery shortfall to review (foreign currency)', money(Math.max(delivery - available, 0))],
        ['预计本金覆盖率（%）', 'Estimated principal coverage (%)', quote(Math.min(available / delivery, 1) * 100)],
      ];
    },
  },
  {
    id: 'fx-forward-window-check',
    zh: '远期交割窗口与回款日核对',
    en: 'Forward window and receipt date check',
    purpose: ['核对约定交割窗口能否覆盖预计回款日，并列出距离末日的时间余量。', 'Check whether a contracted delivery window covers an expected receipt and calculate the room before its last date.'],
    scope: ['按经办行约定的起止日期计自然日。固定到期合约可将两端填为同一日，节假日顺延或修改按合约处理。', 'Enter the bank’s agreed start and end dates. For fixed maturity, enter the same date twice. Holiday adjustments and contract changes follow the agreement.'],
    source: forward,
    inputs: [
      ['start', 'date', '约定交割窗口首日', 'First allowed delivery date', '2026-12-01'],
      ['end', 'date', '约定交割窗口末日', 'Last allowed delivery date', '2026-12-12'],
      ['receipt', 'date', '预计外币回款日', 'Expected foreign-currency receipt date', '2026-12-08'],
    ],
    run: v => {
      const windowDays = orderedDays(v.start, v.end) + 1;
      const toEnd = elapsed(v.receipt, v.end);
      const fromStart = elapsed(v.start, v.receipt);
      const status = fromStart < 0
        ? ['预计回款早于窗口', 'Expected receipt before window']
        : toEnd < 0
          ? ['预计回款晚于窗口', 'Expected receipt after window']
          : ['预计回款落在窗口内', 'Expected receipt within window'];
      return [
        ['交割窗口长度（含首末日）', 'Calendar days in window (inclusive)', windowDays],
        ['回款日至末日余量（自然日）', 'Days from receipt to window end', toEnd],
        ['日期匹配状态', 'Receipt timing status', status],
      ];
    },
  },
  {
    id: 'fx-first-receipt-file',
    zh: '首笔货物贸易收汇准备表',
    en: 'First goods-export receipt readiness',
    purpose: ['为中国境内企业的常规首笔收汇检查名录、经办行收款信息和业务凭证是否已核对。', 'Check directory registration, bank receiving instructions and transaction evidence before a mainland company’s first conventional goods-export receipt.'],
    scope: ['适用于采用常规名录登记流程的货物贸易出口企业。小微跨境电商等特殊情形，按经办行确认的办理路径准备。', 'For goods exporters using the conventional directory registration process. Micro cross-border e-commerce and special cases follow the path confirmed by the handling bank.'],
    source: roster,
    inputs: [
      ['roster', 'choice', '已在境内银行核对名录登记结果', 'Directory entry confirmed with domestic bank', 'yes'],
      ['bankInfo', 'choice', '已与银行确认本笔收款信息', 'Bank receiving instructions confirmed for this payment', 'yes'],
      ['tradeFiles', 'choice', '按银行要求备齐本笔交易凭证', 'Transaction evidence prepared as requested by bank', 'unknown'],
      ['reference', 'choice', '可用约定订单或发票对应本笔汇款', 'Remittance tied to an agreed order or invoice', 'no'],
    ],
    run: v => [
      ['名录登记', 'Directory registration', readiness(v.roster)],
      ['银行收款信息', 'Bank receiving instructions', readiness(v.bankInfo)],
      ['经办行所需交易凭证', 'Bank-requested transaction evidence', readiness(v.tradeFiles)],
      ['收款与交易编号匹配', 'Receipt and transaction reference match', readiness(v.reference)],
    ],
  },
  {
    id: 'fx-roster-change-clock',
    zh: '货贸外汇名录变更时间核对',
    en: 'Trade FX directory change clock',
    purpose: ['对名录信息变更事项计算经过日期、与 30 日节点的间距和需要跟进的记录状态。', 'Count elapsed calendar days since a directory detail changed, compare with the 30-day checkpoint and flag record follow-up.'],
    scope: ['汇发〔2024〕11号涉及企业名称、统一社会信用代码、法定代表人、联系方式、注册地址变更。按日期相减做内部提醒，具体起算与顺延向银行核对。', 'Circular 11 of 2024 covers changes to company name, unified credit code, legal representative, contact information and registered address. Date subtraction is an internal check. Confirm counting rules with your bank.'],
    source: roster,
    inputs: [
      ['changeDate', 'date', '相关信息变更日期', 'Date of covered change', '2026-11-04'],
      ['reviewDate', 'date', '更新送件或当前核对日期', 'Filing date or current review date', '2026-11-26'],
      ['complete', 'choice', '名录变更完成状态已核实', 'Directory update confirmed complete', 'no'],
    ],
    run: v => {
      const days = orderedDays(v.changeDate, v.reviewDate);
      return [
        ['自变更经过天数（自然日）', 'Calendar days since the change', days],
        ['至 30 日内部核对节点的余量', 'Days remaining to internal 30-day checkpoint', 30 - days],
        ['变更记录完成状态', 'Directory update status', readiness(v.complete)],
      ];
    },
  },
  {
    id: 'fx-trade-refund-evidence',
    zh: '出口收款退汇材料核对',
    en: 'Goods-export FX refund evidence check',
    purpose: ['整理退汇与原交易的日期间隔、金额和退款原因凭证，准备向经办行核对。', 'Reconcile dates and amounts for an export-receipt refund and prepare evidence of its stated reason for the handling bank.'],
    scope: ['原收款和拟退金额应为同一笔交易、同一币种。输出是材料与差额核对。退汇渠道和受理条件由经办行判断。', 'Enter the original receipt and proposed refund for the same transaction and currency. The output checks the records and amounts. The handling bank determines routing and eligibility.'],
    source: roster,
    inputs: [
      ['receiptDate', 'date', '原收款日期', 'Original credit date', '2026-06-01'],
      ['refundDate', 'date', '拟退汇日期', 'Proposed refund date', '2026-11-24'],
      ['received', 'number', '原实收金额（外币）', 'Original amount received (foreign currency)', 12000],
      ['refund', 'number', '拟退金额（同一外币）', 'Proposed refund (same currency)', 3000],
      ['linked', 'choice', '退款申请已关联原交易和回单', 'Refund request linked to original transaction and bank receipt', 'yes'],
      ['files', 'choice', '退款原因及相关凭证已核对', 'Refund reason and supporting evidence checked', 'unknown'],
    ],
    run: v => [
      ['距原收款自然日', 'Calendar days since original credit', orderedDays(v.receiptDate, v.refundDate)],
      ['预计退回后剩余金额（外币）', 'Remaining foreign amount after proposed refund', money(afterDeductions(v.received, v.refund))],
      ['原交易与回单关联', 'Original transaction and receipt linkage', readiness(v.linked)],
      ['原因凭证核对', 'Refund reason evidence', readiness(v.files)],
    ],
  },
  {
    id: 'fx-marketplace-payout-reconcile',
    zh: '跨境电商平台净收款对账',
    en: 'Cross-border marketplace payout reconciliation',
    purpose: ['拆分境外平台订单毛额、退款、各类费用与实际结算净款，检查尚未解释的差额。', 'Break marketplace gross orders into refunds, documented fees and actual net settlement to identify unexplained variance.'],
    scope: ['同一结算周期和同一币种。实付给企业时填正数，平台向企业扣款时填负数。费用按凭证填写，外汇收付、轧差或申报的办理条件由经办行确认。', 'Use one statement period and currency. Enter a positive credit or a negative debit. Use documented charges and confirm FX, netting and reporting requirements with your bank.'],
    source: ecommerce,
    inputs: [
      ['gross', 'number', '结算期订单毛额（外币）', 'Gross orders in statement period (foreign currency)', 35000],
      ['refunds', 'number', '退款与冲销（同一外币）', 'Documented refunds and reversals (same currency)', 800],
      ['platform', 'number', '平台及支付费（同一外币）', 'Platform and payment fees (same currency)', 725],
      ['other', 'number', '其他有凭证扣款（同一外币）', 'Other evidenced deductions (same currency)', 530],
      ['payout', 'signed', '银行或支付机构净结算（同一外币）', 'Actual net settlement (same currency)', 32925],
    ],
    run: v => {
      const expected = v.gross - v.refunds - v.platform - v.other;
      const gap = money(expected - v.payout);
      return [
        ['凭证推算的净应收（外币）', 'Expected net proceeds from evidence (foreign currency)', money(expected)],
        ['预计净额减实付差额（外币）', 'Expected less actual payout (foreign currency)', gap],
        ['差额处理提示', 'Reconciliation status', balanceStatus(gap)],
      ];
    },
  },
  {
    id: 'fx-transfer-trace-prep',
    zh: '跨境汇款查款材料准备',
    en: 'Missing wire trace preparation',
    purpose: ['在收款延误时检查转交经办行的查款信息是否准备妥当。', 'Check whether the evidence needed to ask the receiving or sending bank about a delayed wire is ready.'],
    scope: ['记录核对状态即可，请把汇款人和账户详情通过银行指定通道提交。各银行接受的查款编号和凭证类型可能不同。', 'Record readiness only. Share remitter and account details through the bank’s designated channel. Accepted tracking references and documents vary by bank.'],
    source: remittance,
    inputs: [
      ['receipt', 'choice', '已索取汇出银行回单', 'Sending bank receipt obtained', 'yes'],
      ['tracking', 'choice', '已取得经办行认可的查款参考号', 'Trace reference accepted by bank is available', 'unknown'],
      ['payee', 'choice', '已复核受益人资料与收款指示', 'Beneficiary details checked against receiving instructions', 'yes'],
      ['credit', 'choice', '已查询收款行账户流水与待入账记录', 'Receiving bank statement and pending credits checked', 'no'],
    ],
    run: v => [
      ['汇出回单', 'Payment remittance receipt', readiness(v.receipt)],
      ['查款参考号', 'Trace reference', readiness(v.tracking)],
      ['受益人资料核对', 'Beneficiary verification', readiness(v.payee)],
      ['收款行待入账与流水检查', 'Receiving bank credit review', readiness(v.credit)],
    ],
  },
];
