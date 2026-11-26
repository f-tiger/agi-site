const policy = ['财政部、税务总局公告 2026 年第 11 号', 'MOF and STA Announcement No. 11 of 2026', 'https://guangdong.chinatax.gov.cn/gdsw/zjfg/2026-02/02/content_a761ec677dbb47bda83ce41928d9ff1f.shtml'];
const procedure = ['国家税务总局公告 2026 年第 5 号', 'STA Announcement No. 5 of 2026', 'https://fgk.chinatax.gov.cn/zcfgk/c100012/c5247423/content.html'];
const vatLaw = ['中华人民共和国增值税法', 'VAT Law of the People’s Republic of China', 'https://m.mof.gov.cn/zcfb/202412/t20241225_3950494.htm'];

const money = amount => Math.sign(amount) * Math.round((Math.abs(amount) + Number.EPSILON) * 100) / 100;
const cny = (zh, en, amount) => [`${zh}（元）`, `${en} (CNY)`, money(amount)];
const share = (amount, rate) => amount * rate / 100;
const percent = (n, total) => total > 0 ? money(n / total * 100) : ['分母为零，无法计算', 'Unavailable because the denominator is zero'];
const quantity = value => Number(value.toFixed(6));
const dayMs = 86400000;
const daysBetween = (from, to) => (Date.parse(to) - Date.parse(from)) / dayMs;
const filingFields = [
  ['filing', 'choice', '出口退（免）税备案', 'Export refund filing registration', 'yes'],
  ['returnTable', 'choice', '免退税申报明细表', 'Exemption and refund schedule', 'yes'],
  ['declaration', 'choice', '自营出口货物报关单', 'Self-operated export declaration', 'yes'],
  ['purchase', 'choice', '购进退税凭证', 'Purchase VAT evidence', 'no'],
  ['attachments', 'choice', '适用的附送资料与补充要求', 'Applicable attachments and additional requirements', 'unknown'],
];
const agencyFields = [
  ['certificate', 'choice', '代理出口货物证明', 'Agency Export Goods Certificate', 'no'],
  ['contract', 'choice', '委托出口协议及双方角色已核对', 'Export agency agreement and party roles checked', 'yes'],
  ['records', 'choice', '代理证明与原始业务单据已对应', 'Certificate and transaction records matched', 'unknown'],
  ['filing', 'choice', '本企业申报凭证与所需附件', 'Own filing evidence and applicable attachments', 'yes'],
];

function evidenceChecklist(fields, values) {
  function labels(answer) {
    const items = fields.filter(([name]) => values[name] === answer);
    return [items.map(([, , zh]) => zh).join('、') || '无', items.map(([, , , en]) => en).join(', ') || 'None'];
  }
  return [
    ['已核对项数', 'Items checked', fields.filter(([name]) => values[name] === 'yes').length],
    ['缺少的资料', 'Evidence to gather', labels('no')],
    ['待确认事项', 'Items to confirm', labels('unknown')],
  ];
}

export default [
  {
    id: 'tax-trader-refund-estimate', zh: '外贸企业免退税测算', en: 'Trading company VAT refund estimate',
    purpose: ['按已确认的购进计税依据和退税率，测算一笔出口货物的应退税额。', 'Estimate a goods-export refund using the verified purchase tax base and refund rate.'],
    scope: ['适用于中国大陆外贸企业已确认按免退税办法出口的购进货物。委托加工、委托修理修配和特殊计税口径应分别核定。', 'For mainland China trading companies with eligible purchased goods covered by the exemption and refund method. Verify contract processing, repair and special tax bases separately.'], source: policy,
    inputs: [['base', 'number', '购进计税依据（元）', 'Purchase tax base (CNY)', 100000], ['rate', 'percent', '已核实退税率（%）', 'Verified refund rate (%)', 9]],
    run: v => [cny('应退税额测算', 'Estimated VAT refund', share(v.base, v.rate))],
  },
  {
    id: 'tax-manufacturer-offset-refund', zh: '生产企业免抵退与留抵测算', en: 'Manufacturer VAT offset and cash refund',
    purpose: ['对照期末留抵，拆分免抵退额度中的预计现金退税和免抵税额。', 'Split the estimated exemption, offset and refund cap between cash refund and offset using the closing VAT credit.'],
    scope: ['使用同一申报期、同一退税率的人民币出口计税依据。抵减额和增值税申报表期末留抵税额须事先核定。', 'Use one filing period and one CNY export tax base at a single refund rate. Verify the reduction amount and the VAT return’s closing credit first.'], source: policy,
    inputs: [['base', 'number', '抵减前出口计税依据（元）', 'Export tax base before reductions (CNY)', 150000], ['rate', 'percent', '已核实退税率（%）', 'Verified refund rate (%)', 9], ['reduction', 'number', '免抵退税额抵减额（元）', 'Verified reduction of the cap (CNY)', 1800], ['credit', 'number', '申报表期末留抵税额（元）', 'Closing VAT credit from the return (CNY)', 6800]],
    run(v) {
      const rawCap = share(v.base, v.rate) - v.reduction;
      if (rawCap < 0) throw new RangeError();
      const cap = money(rawCap);
      const cash = money(Math.min(cap, v.credit));
      return [cny('免抵退税额测算', 'Estimated exemption, offset and refund cap', cap), cny('预计现金退税', 'Estimated cash refund', cash), cny('预计免抵税额', 'Estimated offset', cap - cash)];
    },
  },
  {
    id: 'tax-refund-rate-scenario', zh: '出口退税率变化情景对比', en: 'Export refund rate scenario comparison',
    purpose: ['给待签单或待出货的项目评估两种退税率对测算结果的影响。', 'Compare how two refund-rate assumptions affect a pending order or shipment.'],
    scope: ['两个情景使用同一计税依据，且均适用“计税依据乘退税率”的测算口径。生效日和适用退税率以官方资料为准。', 'Both scenarios use the same tax base and the base-times-rate method. Check effective dates and applicable rates against official evidence.'], source: policy,
    inputs: [['base', 'number', '同一计税依据（元）', 'Tax base held constant (CNY)', 300000], ['baseline', 'percent', '基准情景退税率（%）', 'Baseline refund rate (%)', 13], ['alternative', 'percent', '替代情景退税率（%）', 'Alternative refund rate (%)', 9]],
    run(v) {
      const baseline = money(share(v.base, v.baseline));
      const alternative = money(share(v.base, v.alternative));
      return [cny('基准退税测算', 'Baseline refund estimate', baseline), cny('替代退税测算', 'Alternative refund estimate', alternative), cny('替代减基准', 'Alternative minus baseline', alternative - baseline)];
    },
  },
  {
    id: 'tax-refund-cash-calendar', zh: '三批出口退税现金日历', en: 'Three-batch export refund cash calendar',
    purpose: ['汇总三个预计回款批次，分开截止日前后可列入预算的退税现金。', 'Split three expected refund receipts into cash planned on or before the cutoff and cash planned later.'],
    scope: ['日期与金额由经办人按已掌握的进度录入，用于资金计划。截止日当天的预计到账计入窗口。', 'Enter amounts and dates based on your own case updates. The planning window includes the cutoff day.'], source: procedure,
    inputs: [['cutoff', 'date', '现金预算截止日', 'Cash budget cutoff', '2026-12-15'], ['first', 'number', '第一批预计金额（元）', 'Batch one expected amount (CNY)', 25000], ['firstDate', 'date', '第一批预计到账日', 'Batch one expected receipt date', '2026-12-05'], ['second', 'number', '第二批预计金额（元）', 'Batch two expected amount (CNY)', 17000], ['secondDate', 'date', '第二批预计到账日', 'Batch two expected receipt date', '2026-12-15'], ['third', 'number', '第三批预计金额（元）', 'Batch three expected amount (CNY)', 11000], ['thirdDate', 'date', '第三批预计到账日', 'Batch three expected receipt date', '2026-12-24']],
    run(v) {
      const batches = [[v.first, v.firstDate], [v.second, v.secondDate], [v.third, v.thirdDate]];
      const byCutoff = batches.filter(([, date]) => date <= v.cutoff).reduce((sum, [amount]) => sum + amount, 0);
      const total = v.first + v.second + v.third;
      return [cny('截至预算日预计到账', 'Expected by cutoff', byCutoff), cny('预算日后预计到账', 'Expected after cutoff', total - byCutoff), cny('预计现金合计', 'Total expected cash', total)];
    },
  },
  {
    id: 'tax-refund-funding-cost', zh: '出口退税等款资金成本', en: 'Cost of financing a refund delay',
    purpose: ['按预期占用资金和等款天数，比较正常与延迟到账的垫资费用。', 'Compare financing costs for the normal and delayed cash receipt scenarios.'],
    scope: ['财务计划按年化单利和一年 365 日计。一次性费用在两种情景各计一次。', 'Planning uses simple annual interest on a 365-day basis. Include the one-off cost once in each scenario.'], source: procedure,
    inputs: [['principal', 'number', '占用本金（元）', 'Financed principal (CNY)', 100000], ['annual', 'percent', '年化资金成本（%）', 'Annual financing rate (%)', 6], ['days', 'integer', '预计占用自然日', 'Expected calendar days', 45], ['delay', 'integer', '额外延迟自然日', 'Additional calendar days', 20], ['fees', 'number', '一次性融资费用（元）', 'One-off financing fees (CNY)', 250]],
    run(v) {
      const ordinary = money(share(v.principal, v.annual) * v.days / 365 + v.fees);
      const delayed = money(share(v.principal, v.annual) * (v.days + v.delay) / 365 + v.fees);
      return [cny('正常情景成本', 'Normal scenario cost', ordinary), cny('延迟情景成本', 'Delayed scenario cost', delayed), cny('延迟增加成本', 'Additional delay cost', delayed - ordinary)];
    },
  },
  {
    id: 'tax-purchase-vat-invoice-check', zh: '购进发票价税拆分核对', en: 'Purchase invoice VAT split check',
    purpose: ['把单税率行的价税合计拆成不含税金额和税额，并对照发票实际税额。', 'Split a single-rate invoice line into net amount and VAT and compare it with the recorded tax.'],
    scope: ['用于同一张购进发票的单税率合计或单行，允许实际开票时存在逐行舍入差。', 'Use a single invoice line or one subtotal at a single VAT rate. Per-line invoice rounding may create small differences.'], source: vatLaw,
    inputs: [['gross', 'number', '价税合计（元）', 'VAT-inclusive total (CNY)', 11300], ['rate', 'percent', '发票对应增值税率（%）', 'Invoice VAT rate (%)', 13], ['reported', 'number', '实际税额（元）', 'Recorded VAT (CNY)', 1300]],
    run(v) {
      const net = money(v.gross / (1 + v.rate / 100));
      const vat = money(v.gross - net);
      return [cny('不含税金额测算', 'Estimated net amount', net), cny('税额测算', 'Estimated VAT', vat), cny('实际税额减测算', 'Recorded minus estimated VAT', v.reported - vat)];
    },
  },
  {
    id: 'tax-refund-filing-base-reconcile', zh: '出口退税申报计税依据对账', en: 'Export refund filing base reconciliation',
    purpose: ['检查已核口径的凭证小计和已录入申报基数的差额。', 'Check the difference between reconciled source evidence and the tax base entered in a filing.'],
    scope: ['用于财务已确定可合并口径的同一申报组。各凭证小计清除重复记录后再录入，更正量用带符号金额表示。', 'For one filing group with compatible tax bases confirmed by finance. Enter deduplicated subtotals and a signed correction.'], source: policy,
    inputs: [['purchase', 'number', '购进凭证小计（元）', 'Domestic purchase evidence subtotal (CNY)', 125000], ['imported', 'number', '进口完税凭证小计（元）', 'Import tax evidence subtotal (CNY)', 25000], ['adjustment', 'signed', '已核实计税依据调整（元）', 'Verified base adjustment (CNY)', -5000], ['filed', 'number', '申报表已录基数（元）', 'Entered filing base (CNY)', 144800]],
    run(v) {
      const base = money(v.purchase + v.imported + v.adjustment);
      if (base < 0) throw new RangeError();
      return [cny('凭证调整后小计', 'Adjusted evidence subtotal', base), cny('申报基数减凭证小计', 'Entered base minus evidence subtotal', v.filed - base)];
    },
  },
  {
    id: 'tax-refund-evidence-base-split', zh: '多货项退税基数证据分层', en: 'Multi-item refund base evidence split',
    purpose: ['把计划出口的同批货项金额按证据状态分桶，量化优先补齐资料所涉金额。', 'Group planned items in one batch by evidence status and quantify the amount that needs verification.'],
    scope: ['同币种、同一计价基础下录入互斥金额。政策适用结果由经办核实后填入。', 'Enter nonoverlapping amounts on a single currency and price basis. Fill in policy classifications after an authorized review.'], source: policy,
    inputs: [['verified', 'number', '已核实纳入范围的金额（元）', 'Amount within confirmed scope (CNY)', 70000], ['pending', 'number', '范围或资料待核实金额（元）', 'Amount needing scope or evidence checks (CNY)', 18000], ['excluded', 'number', '已确认排除金额（元）', 'Amount confirmed out of scope (CNY)', 12000]],
    run(v) {
      const total = v.verified + v.pending + v.excluded;
      return [cny('本批金额合计', 'Total batch amount', total), cny('待核实金额', 'Amount to verify', v.pending), ['证据待核实比例（%）', 'Share requiring verification (%)', percent(v.pending, total)], ['已核实纳入比例（%）', 'Share within confirmed scope (%)', percent(v.verified, total)]];
    },
  },
  {
    id: 'tax-exempt-export-margin', zh: '出口免税不退税毛利测算', en: 'VAT-exempt export margin estimate',
    purpose: ['把财务已确认不可回收的购进税额计入报价成本，测算免税出口项目毛利。', 'Estimate gross margin by including the purchase VAT confirmed as unrecoverable in the quote cost.'],
    scope: ['用于已确认适用出口免税、相关进项税额已确认不可回收的报价估算。收入和成本统一折算为人民币。', 'For quotations where export VAT exemption and unrecoverable input VAT have already been confirmed. Use CNY for revenue and each cost.'], source: policy,
    inputs: [['revenue', 'number', '预计销售收入（元）', 'Expected sales revenue (CNY)', 100000], ['purchase', 'number', '购货不含税成本（元）', 'Purchase cost excluding VAT (CNY)', 72000], ['vat', 'number', '确认不可回收进项税额（元）', 'Confirmed unrecoverable input VAT (CNY)', 9360], ['other', 'number', '其他直接成本（元）', 'Other direct costs (CNY)', 4300]],
    run(v) {
      const cost = money(v.purchase + v.vat + v.other);
      const margin = money(v.revenue - cost);
      return [cny('直接成本合计', 'Total direct cost', cost), cny('预计毛利', 'Estimated gross profit', margin), ['预计毛利率（%）', 'Estimated gross margin (%)', percent(margin, v.revenue)]];
    },
  },
  {
    id: 'tax-refund-filing-readiness', zh: '自营出口免退税申报材料检查', en: 'Self-operated export refund filing checklist',
    purpose: ['在财务发起免退税申报前，列出已核对、需补齐和适用性待确认的材料。', 'List checked, missing and unconfirmed evidence before filing under the exemption and refund method.'],
    scope: ['面向按免退税办法自营出口货物的中国大陆外贸企业。按该笔业务适用的附送清单和主管税务机关要求复核。', 'For mainland China trading companies filing for self-operated goods exports under the exemption and refund method. Review applicable attachments and the competent tax authority’s requirements.'], source: procedure,
    inputs: filingFields,
    run: v => evidenceChecklist(filingFields, v),
  },
  {
    id: 'tax-refund-invoice-quantity-check', zh: '退税发票与报关数量勾稽', en: 'Refund invoice and declaration quantity check',
    purpose: ['核对同一货项的发票、报关和退款申请数量，找出待复核的超量或余额。', 'Compare invoice, declaration and claimed quantities for one product and surface excesses or remaining quantities.'],
    scope: ['先统一计量单位，仅对照同一货项和同一申报范围。当前数量应剔除已用于其他申请的份额。输出保留最多六位小数。', 'Normalize units and use one product and one filing scope. Remove quantities already allocated to other claims. Results use up to six decimal places.'], source: procedure,
    inputs: [['invoice', 'number', '购进凭证可核对数量', 'Available purchase evidence quantity', 600], ['declared', 'number', '出口报关可核对数量', 'Available export declaration quantity', 590], ['claim', 'number', '本次拟申报数量', 'Quantity proposed for this claim', 595]],
    run(v) {
      const reference = Math.min(v.invoice, v.declared);
      return [['两份来源数量差（购进减报关）', 'Source quantity gap (purchase minus declaration)', quantity(v.invoice - v.declared)], ['申报超出双凭证覆盖的数量', 'Proposed quantity beyond both sources', quantity(Math.max(0, v.claim - reference))], ['双凭证覆盖内未使用数量', 'Quantity supported by both sources and unused', quantity(Math.max(0, reference - v.claim))]];
    },
  },
  {
    id: 'tax-refund-filing-buffer', zh: '出口退税申报截止日缓冲测算', en: 'Export refund filing deadline buffer',
    purpose: ['把资料最晚齐备日、内部复核时间和已确认的申报截止日放在同一时间轴。', 'Compare the evidence-ready date plus review time with a verified filing deadline.'],
    scope: ['录入该笔业务已确认适用的日期，统一按自然日做内部倒排计划。节假日和正式申报期按主管机关公布口径确认。', 'Enter verified dates for the individual case. Internal planning uses calendar days. Check the competent authority’s holiday and filing calendar.'], source: procedure,
    inputs: [['ready', 'date', '预计资料齐备日', 'Expected evidence-ready date', '2026-12-08'], ['deadline', 'date', '已确认申报截止日', 'Verified filing deadline', '2026-12-15'], ['review', 'integer', '内部复核所需自然日', 'Internal review calendar days', 5]],
    run(v) {
      const available = daysBetween(v.ready, v.deadline);
      return [['资料齐备日至截止日的自然日', 'Calendar days from evidence readiness to deadline', available], ['扣除复核后的剩余自然日', 'Calendar-day buffer after review', available - v.review], ['距满足复核计划的缺口自然日', 'Additional calendar days needed for review', Math.max(0, v.review - available)]];
    },
  },
  {
    id: 'tax-refund-archive-calendar', zh: '出口退税备案单证归档日历', en: 'Export refund evidence archive calendar',
    purpose: ['根据申报日期生成备案单证的内部归档检查日期，并算出距离目标的时间。', 'Calculate a document archive checkpoint from the filing date and see the time available.'],
    scope: ['针对适用备案单证管理的出口货物和对外修理修配业务。按公告第四十五条的申报后十五日做自然日排程，具体期间口径及保存期按所列条款复核。', 'For goods and outward repairs covered by document retention rules. Use the 15 days after filing in Article 45 for calendar planning and check the article for applicable period and retention details.'], source: procedure,
    inputs: [['filed', 'date', '实际申报日', 'Actual filing date', '2026-11-18'], ['checked', 'date', '内部检查日', 'Internal check date', '2026-11-26']],
    run(v) {
      const target = new Date(Date.parse(v.filed) + 15 * dayMs).toISOString().split('T')[0];
      if (target.length !== 10 || v.checked < v.filed) throw new RangeError();
      return [['自然日口径归档目标日', 'Calendar-based archive checkpoint', target], ['内部检查日至目标日的自然日', 'Calendar days from check to checkpoint', daysBetween(v.checked, target)]];
    },
  },
  {
    id: 'tax-refund-receipt-reconciliation', zh: '核准退税与银行到账核对', en: 'Approved refund and bank receipt reconciliation',
    purpose: ['把同一核准批次的多笔银行到账合并，算出未到账或多列入的金额。', 'Sum bank receipts for one approval batch and flag unpaid or overallocated amounts.'],
    scope: ['按同一批次匹配税务机关核准金额和银行实际入账。金额口径包含该批次的已核实调整。', 'Match the approval amount to actual bank deposits for a single batch using amounts that incorporate verified adjustments.'], source: procedure,
    inputs: [['approved', 'number', '核准退税金额（元）', 'Approved refund amount (CNY)', 35000], ['first', 'number', '第一笔到账（元）', 'First bank receipt (CNY)', 16000], ['second', 'number', '第二笔到账（元）', 'Second bank receipt (CNY)', 15000], ['other', 'number', '其余到账合计（元）', 'Other bank receipts total (CNY)', 0]],
    run(v) {
      const receipts = v.first + v.second + v.other;
      return [cny('匹配到账合计', 'Matched bank receipts', receipts), cny('核准减实际到账', 'Approved amount minus receipts', v.approved - receipts), ['到账比例（%）', 'Receipts as share of approval (%)', percent(receipts, v.approved)]];
    },
  },
  {
    id: 'tax-refund-receivable-rollforward', zh: '出口退税应收月度滚动对账', en: 'Monthly export refund receivable roll-forward',
    purpose: ['从期初结转、当期新增、银行到账和冲减汇总期末应收，并与账面数对照。', 'Roll opening receivables forward using new items, receipts and adjustments, then compare with the ledger.'],
    scope: ['同一主体、同一账期和应收确认口径。冲减与到账分别录入，期末负数提示复核账期或分配。', 'Use one entity, period and receivable recognition method. Enter reductions and receipts separately. Review the cutoff and allocation if the closing amount is negative.'], source: procedure,
    inputs: [['opening', 'number', '期初退税应收（元）', 'Opening refund receivable (CNY)', 60000], ['added', 'number', '本期新增应收（元）', 'New receivables in period (CNY)', 42000], ['paid', 'number', '本期匹配到账（元）', 'Matched receipts in period (CNY)', 37000], ['reduction', 'number', '本期冲减额（元）', 'Reductions in period (CNY)', 4000], ['ledger', 'signed', '总账期末应收（元）', 'Closing receivable per ledger (CNY)', 60900]],
    run(v) {
      const closing = money(v.opening + v.added - v.paid - v.reduction);
      return [cny('计算的期末应收', 'Calculated closing receivable', closing), cny('总账期末减计算应收', 'Closing ledger minus calculated receivable', v.ledger - closing)];
    },
  },
  {
    id: 'tax-export-collection-proof-gap', zh: '退税收汇举证覆盖缺口', en: 'Export refund collection evidence gap',
    purpose: ['为一笔出口退税整理收汇证据时，核对实收和已核实视同收汇举证对应的金额。', 'Compare actual receipts and verified deemed-receipt evidence when preparing one export refund file.'],
    scope: ['用于已确定适用收汇规则的出口货物及对外修理修配。实收与视同收汇部分需互斥，所有金额使用同一已确认折算口径。', 'For goods and outward repairs where collection rules apply. Actual and deemed receipts must cover distinct amounts and use the same verified conversion basis.'], source: procedure,
    inputs: [['expected', 'number', '待证明收汇金额（元）', 'Total collection amount to substantiate (CNY)', 85000], ['actual', 'number', '实收凭证覆盖金额（元）', 'Amount supported by actual receipt evidence (CNY)', 63000], ['deemed', 'number', '已核实视同收汇证据覆盖金额（元）', 'Amount supported by verified deemed-receipt evidence (CNY)', 15000]],
    run(v) {
      const covered = v.actual + v.deemed;
      return [cny('仍需补证或核对金额', 'Amount still needing evidence or reconciliation', Math.max(0, v.expected - covered)), cny('覆盖超出待证明金额部分', 'Evidence above amount to substantiate', Math.max(0, covered - v.expected)), ['覆盖比例（%）', 'Evidence coverage (%)', percent(covered, v.expected)]];
    },
  },
  {
    id: 'tax-refund-returned-goods-exposure', zh: '出口退货退税调整准备金估算', en: 'Refund adjustment reserve for returned goods',
    purpose: ['按退回货物比例预留可能涉及的已退税金额，供财务准备冲减复核。', 'Plan a reserve for the portion of a prior refund associated with returned goods.'],
    scope: ['只有同一退税批次、每单位已退税额一致时才适用按数量分摊。实际冲减、缴回或结转按原申报口径及税务规定核对。', 'Use quantity apportionment only for one refund batch with uniform refund per unit. Review the original filing for the actual adjustment, repayment or carryforward.'], source: procedure,
    inputs: [['original', 'number', '原批次已退税额（元）', 'Cash refund issued for original batch (CNY)', 36000], ['units', 'number', '原批次同口径数量', 'Original batch quantity in matching units', 400], ['returned', 'number', '已确认退回货物数量', 'Confirmed returned quantity', 35]],
    run(v) {
      if (v.units <= 0 || v.returned > v.units) throw new RangeError();
      return [['退回数量比例（%）', 'Returned quantity share (%)', percent(v.returned, v.units)], cny('财务准备金测算', 'Planning reserve estimate', v.original * (v.returned / v.units))];
    },
  },
  {
    id: 'tax-entrusted-export-refund-evidence', zh: '委托出口退税证明交接检查', en: 'Entrusted export refund evidence handoff',
    purpose: ['把受托方提供的代理出口证明和委托方申报材料对齐，生成待交接事项。', 'Match the agency’s export certificate to the principal’s filing evidence and identify handoff gaps.'],
    scope: ['面向中国大陆以委托方式报关且已确定适用出口退（免）税的业务。按申报主体和适用业务逐项复核清单。', 'For mainland China agency-declared exports with a confirmed refund or exemption pathway. Check the list for the filing entity and specific business.'], source: procedure,
    inputs: agencyFields,
    run: v => evidenceChecklist(agencyFields, v),
  },
  {
    id: 'tax-processing-refund-input-adjustment', zh: '进料加工免抵退料件抵减对比', en: 'Processing trade input reduction comparison',
    purpose: ['对比计划与已确认分配率对保税料件计税基数及免抵退抵减测算的影响。', 'Compare how the planned and confirmed allocation rates change the bonded input base and estimated refund-cap reduction.'],
    scope: ['用于实耗法下同一批出口销售额和单一退税率的情景对比。正式核销使用主管税务机关确认口径。', 'Compare scenarios under the actual consumption method for identical export proceeds and a single refund rate. Use the tax authority’s confirmed basis for formal reconciliation.'], source: policy,
    inputs: [['fob', 'number', '进料加工货物离岸价折人民币（元）', 'Processing exports FOB converted to CNY', 380000], ['plan', 'percent', '原计划分配率（%）', 'Previous planned allocation rate (%)', 42], ['actual', 'percent', '已确认分配率（%）', 'Confirmed allocation rate (%)', 44], ['refund', 'percent', '适用的退税率（%）', 'Applicable refund rate (%)', 9]],
    run(v) {
      const plannedBase = money(share(v.fob, v.plan));
      const confirmedBase = money(share(v.fob, v.actual));
      return [cny('原计划料件基数', 'Planned bonded input base', plannedBase), cny('已确认情景料件基数', 'Bonded input base using confirmed rate', confirmedBase), cny('免抵退抵减额测算差异', 'Estimated change in cap reduction', money(share(confirmedBase, v.refund)) - money(share(plannedBase, v.refund)))];
    },
  },
  {
    id: 'tax-refund-correction-triage', zh: '出口退税申报更正路径检查', en: 'Export refund filing correction triage',
    purpose: ['根据核准状态、原申报错误和后续销售变化，找出需要复核的处理路径。', 'Identify the correction path to review based on approval, filing errors and subsequent sales changes.'],
    scope: ['覆盖公告第二十七至三十条的申报错误和已办理业务后续调整场景。正式处理前核对业务发生期、机关通知和适用办法。', 'Covers filing errors and post-processing adjustments under Articles 27 to 30. Verify the event period, any authority notice and the applicable method before acting.'], source: procedure,
    inputs: [['approved', 'choice', '税务机关已核准原申报', 'Original filing has been approved', 'yes'], ['incorrect', 'choice', '原申报资料已确认有误', 'Original filing contains a confirmed error', 'no'], ['changed', 'choice', '后续发生退回、折让或计税依据变化', 'Return, discount or tax-base change occurred later', 'yes'], ['processed', 'choice', '税务机关已办完原退（免）税', 'Original refund or exemption has been processed', 'yes']],
    run(v) {
      if (v.processed === 'yes' && v.approved === 'no') throw new RangeError();
      const filing = v.incorrect !== 'yes'
        ? ['核对原申报资料与凭证', 'Recheck original filing and supporting documents']
        : v.approved === 'yes'
          ? ['复核负数冲减原申报数据的处理', 'Review offsetting the original filing with a negative entry']
          : v.approved === 'no'
            ? ['复核能否申请因申报错误撤回', 'Review eligibility to request withdrawal for a filing error']
            : ['先核实是否已核准原申报', 'Verify approval status of the original filing first'];
      const sale = v.changed !== 'yes'
        ? ['核对有无销售调整或计税依据变化', 'Check whether a sales or tax-base adjustment occurred']
        : v.processed === 'yes'
          ? ['复核发生当月或次月负数冲减事项', 'Review a negative adjustment in the event month or following month']
          : ['先向主管税务机关核对原业务办理状态和申报口径', 'Confirm the processing status and filing treatment with the competent tax authority'];
      return [['原申报资料复核路径', 'Original filing review path', filing], ['后续销售变化复核路径', 'Subsequent sales change review path', sale]];
    },
  },
];
