const classification = ['海关总署商品归类管理规定', 'GACC Order 252 on tariff classification', 'https://www.moj.gov.cn/pub/sfbgw/flfggz/flfggzbmgz/202112/t20211202_442987.html'];
const declaration = ['海关总署货物申报管理规定', 'GACC Order 277 on goods declarations', 'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2025/art_703b3595d0b540a3aec57766577e5481.html'];
const merchandise = ['中国海关货物申报办事指南', 'China Customs goods declaration guide', 'https://online.customs.gov.cn/static/pages/guides/000629002001/000629002001.html'];
const ecommerce = ['海关总署跨境电商出口监管公告', 'GACC Announcement 167 of 2024 on e-commerce exports', 'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2025/art_e1cce9589ee8459f9093653fba1d6356.html'];
const rcep = ['海关总署 RCEP 原产地管理办法', 'GACC Order 255 on RCEP rules of origin', 'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2022/art_70cad1c8be58476684376a8bd3732462.html'];

const n = (key, zh, en, example) => [key, 'number', zh, en, example];
const i = (key, zh, en, example) => [key, 'integer', zh, en, example];
const t = (key, zh, en, example) => [key, 'text', zh, en, example];
const d = (key, zh, en, example) => [key, 'date', zh, en, example];
const p = (key, zh, en, example) => [key, 'percent', zh, en, example];
const c = (key, zh, en, example = 'yes') => [key, 'choice', zh, en, example];

function missingRecords(fields, values) {
  const missing = fields.filter(([key]) => values[key] !== 'yes');
  return [
    ['已确认项数', 'Confirmed items', fields.length - missing.length],
    ['缺少的记录', 'Missing records', missing.filter(([key]) => values[key] === 'no').length],
    ['待核记录', 'Unconfirmed records', missing.filter(([key]) => values[key] === 'unknown').length],
    ['需处理的资料', 'Records needing action', missing.length
      ? [missing.map(field => field[2]).join('、'), missing.map(field => field[3]).join(', ')]
      : ['已填写项目均有记录', 'Records are available for the selected checks']],
  ];
}

function checklist(fields) {
  return {
    inputs: fields,
    run: values => missingRecords(fields, values),
  };
}

function hsCode(value) {
  const normalized = value.replace(/[.\s-]/g, '');
  if (!/^\d{6,12}$/.test(normalized)) throw new RangeError('expected six to twelve digits');
  return normalized;
}

const atMidnight = value => new Date(value + 'T00:00:00Z');
const dayMs = 86_400_000;

function isoDate(date) {
  const iso = date.toISOString();
  if (!/^\d{4}-/.test(iso)) throw new RangeError('date outside supported range');
  return iso.slice(0, 10);
}

function monthsBefore(date, months) {
  const target = atMidnight(date);
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() - months);
  const lastDay = new Date(target);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  target.setUTCDate(Math.min(day, lastDay.getUTCDate()));
  return target;
}

const compareExactly = (left, right) => left === right
  ? ['一致', 'Match']
  : ['请核对差异', 'Resolve the discrepancy'];

function shipmentIdentifier(value) {
  const normalized = value.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{1,32}$/.test(normalized)) throw new RangeError('invalid shipment identifier');
  return normalized;
}

export default [
  {
    id: 'hs-classification-dossier',
    zh: 'HS 归类资料缺口检查',
    en: 'HS classification evidence checklist',
    purpose: ['把商品规格、用途和候选归类依据整理成提交报关行前的待办。', 'Prepare product facts and supporting references for a broker’s classification review.'],
    scope: ['用于中国进出口货物准备。对混合材质、成套品和零部件应保留组成及使用证据。商品编码由适用税则、注释和归类规则确定。', 'For preparing a China import or export classification review. Retain composition and use evidence for mixtures, sets and parts. The applicable tariff, notes and classification rules determine the code.'],
    source: classification,
    ...checklist([
      c('description', '规范品名及规格型号', 'Product name and model'),
      c('composition', '材料成分及比例', 'Materials and proportions', 'unknown'),
      c('function', '主要功能与实际用途', 'Principal function and actual use'),
      c('visual', '照片、结构图或样品资料', 'Photos, drawings or sample evidence'),
      c('notes', '候选税目、注释和归类依据', 'Candidate headings, notes and rationale', 'no'),
    ]),
  },
  {
    id: 'hs-six-digit-comparison',
    zh: '两地 HS 六位前缀比对',
    en: 'Cross-market six-digit HS comparison',
    purpose: ['对比出口及进口两地已取得的编码，定位六位前缀与本国扩展位的差异。', 'Compare known export and import tariff references at the six-digit HS level.'],
    scope: ['输入两地权威来源给出的编码。点、空格及连字符按格式符处理。六位一致仍须核对使用的 HS 版本和各地的扩展位。', 'Enter codes obtained from both authorities. Dots, spaces and hyphens are treated as separators. Verify the HS edition and national suffixes even if the first six digits match.'],
    source: ['世界海关组织 HS 公约说明', 'WCO Harmonized System FAQ', 'https://www.wcoomd.org/en/faq/harmonized_system_faq'],
    inputs: [
      t('exportCode', '出口端已核对编码', 'Reviewed export code', '8504.40.9999'),
      t('importCode', '进口端已核对编码', 'Reviewed import code', '8504.40.9580'),
    ],
    run: values => {
      const from = hsCode(values.exportCode);
      const to = hsCode(values.importCode);
      return [
        ['出口端六位前缀', 'Export HS prefix', from.slice(0, 6)],
        ['进口端六位前缀', 'Import HS prefix', to.slice(0, 6)],
        ['六位比对结果', 'Prefix comparison', compareExactly(from.slice(0, 6), to.slice(0, 6))],
        ['完整编码比对结果', 'Complete code comparison', compareExactly(from, to)],
      ];
    },
  },
  {
    id: 'cn-classification-ruling-timing',
    zh: '中国归类预裁定申请排期',
    en: 'China advance classification ruling planner',
    purpose: ['根据预计进出口日期倒排普通归类预裁定申请，并识别计划递交时点是否接近边界。', 'Plan a regular advance classification ruling request around the intended trade date.'],
    scope: ['以海关指南的普通三个月时点做日历估算。临界日期、可获批的特殊情形和实际受理日期需向注册地直属海关确认。', 'Calendar planning uses the normal three-month timing in the customs guide. Confirm borderline dates, any approved exceptions and actual acceptance timing with the competent customs office.'],
    source: ['中国海关归类预裁定办事指南', 'China Customs advance classification ruling guide', 'https://online.customs.gov.cn/static/pages/guides/000729004001/000729004001.html'],
    inputs: [
      d('tradeDate', '预计进出口日期', 'Intended import or export date', '2027-05-31'),
      d('plannedFiling', '计划递交日期', 'Planned submission date', '2027-02-22'),
      c('dossier', '申请与说明文件已准备', 'Application and supporting file prepared', 'unknown'),
    ],
    run: values => {
      const target = monthsBefore(values.tradeDate, 3);
      const margin = (target - atMidnight(values.plannedFiling)) / dayMs;
      const timing = margin > 0
        ? ['计划早于普通时点', 'Planned before the normal threshold']
        : margin === 0
          ? ['计划处于边界日，宜尽早确认', 'Borderline day, confirm early']
          : ['计划晚于普通时点，请核对特殊情形或调整', 'Planned after the normal threshold, check exceptions or revise'];
      return [
        ['普通申请时点估算', 'Estimated normal threshold', isoDate(target)],
        ['距估算时点的余量（天）', 'Days before estimated threshold', margin],
        ['排期核对', 'Timing check', timing],
        ['资料准备提示', 'Document readiness', values.dossier === 'yes'
          ? ['按主管海关要求复核后提交', 'Review the competent customs office’s filing instructions']
          : ['先补齐商品说明与申请附件', 'Prepare the description and supporting attachments']],
      ];
    },
  },
  {
    id: 'cn-export-declaration-packet',
    zh: '中国出口报关资料清单',
    en: 'China export declaration packet',
    purpose: ['检查合同、发票、运输单据、装箱清单和适用证件的交接状态。', 'Check the status of commercial and transport records for a China export declaration.'],
    scope: ['用于给经办人或报关行分派补件。证件一栏无适用要求时，核对后可选“是”。凭据提交时间以对应申报方式和主管海关要求为准。', 'Use this to assign documents to the declarant or broker. Mark permits Yes after checking that they are available or inapplicable. Submission timing depends on the declaration procedure and customs office.'],
    source: merchandise,
    ...checklist([
      c('contract', '销售合同或订单', 'Sales contract or order'),
      c('invoice', '商业发票', 'Commercial invoice'),
      c('transport', '运输单据或舱单记录', 'Transport document or manifest record', 'unknown'),
      c('packing', '装箱清单', 'Packing list'),
      c('permits', '适用许可证或随附单证已核对', 'Applicable permits and attachments reviewed', 'no'),
    ]),
  },
  {
    id: 'cn-export-invoice-reconcile',
    zh: '出口商业发票金额复核',
    en: 'Export commercial invoice reconciliation',
    purpose: ['从数量、单价、折扣与附加项复算同一票商业发票金额。', 'Reconstruct an invoice amount from quantity, unit price, discounts and other charges.'],
    scope: ['输入一条发票行或统一单价的一组货物，所有金额使用同币种。容差为内部复核设定，税费计价和申报价格需按适用规则另行核对。', 'Use one line or a group with the same unit price and currency. The tolerance is an internal review setting. Check any tax or declared-value treatment separately.'],
    source: declaration,
    inputs: [
      n('quantity', '开票数量', 'Invoiced quantity', 120),
      n('unit', '开票单价', 'Unit price', 19.5),
      n('discount', '该行折扣金额', 'Line discount amount', 40),
      n('charges', '发票额外费用', 'Additional invoice charges', 15),
      n('stated', '发票列示金额', 'Stated invoice amount', 2310),
      n('tolerance', '内部核对容差', 'Internal review tolerance', 0.01),
    ],
    run: values => {
      const predicted = values.quantity * values.unit - values.discount + values.charges;
      if (predicted < 0) throw new RangeError('expected invoice amount below zero');
      const difference = values.stated - predicted;
      return [
        ['复算金额', 'Reconstructed amount', predicted],
        ['列示金额减复算金额', 'Stated minus reconstructed', difference],
        ['容差核对', 'Tolerance check', Math.abs(difference) <= values.tolerance
          ? ['在设定容差内', 'Within the entered tolerance']
          : ['超过容差，核对折扣或附加项', 'Outside tolerance, check discounts or charges']],
      ];
    },
  },
  {
    id: 'cn-export-packing-count',
    zh: '装箱单票货数量对账',
    en: 'Packing and declaration quantity check',
    purpose: ['用整箱数量和尾箱件数重算总件数，与发票及申报单交叉复核。', 'Rebuild the packed count and reconcile it with invoice and declaration quantities.'],
    scope: ['适用于整箱定装量一致且最多一个尾箱的 SKU。三张单据均用同一件数单位，多 SKU 应逐项复核。', 'For one SKU with a uniform full-carton pack and at most one partial box. Enter the same piece-count unit on all three records and review each SKU separately.'],
    source: merchandise,
    inputs: [
      i('fullCartons', '整箱箱数', 'Full cartons', 18),
      i('piecesPerCarton', '整箱每箱件数', 'Pieces per full carton', 24),
      i('tailPieces', '尾箱件数', 'Pieces in partial carton', 10),
      i('invoiced', '发票件数', 'Invoiced pieces', 442),
      i('declared', '申报件数', 'Declared pieces', 440),
    ],
    run: values => {
      if (!values.piecesPerCarton || values.tailPieces >= values.piecesPerCarton) throw new RangeError('invalid carton counts');
      const cartons = values.fullCartons + Number(values.tailPieces > 0);
      const pieces = values.fullCartons * values.piecesPerCarton + values.tailPieces;
      return [
        ['复算箱数', 'Reconstructed cartons', cartons],
        ['复算件数', 'Reconstructed pieces', pieces],
        ['发票件数减装箱件数', 'Invoice minus packed', values.invoiced - pieces],
        ['申报件数减装箱件数', 'Declaration minus packed', values.declared - pieces],
      ];
    },
  },
  {
    id: 'cn-cargo-seal-handoff',
    zh: '箱号封志交接比对',
    en: 'Container and seal handoff comparison',
    purpose: ['核对拟申报运输资料与现场记录的箱号、封志号，提前定位不一致字段。', 'Compare container and seal identifiers on transport documents against loading records.'],
    scope: ['适用于每次一箱一封志。比较时统一大小写并忽略空格。差异需由物流或经办人核实，尤其是经授权换封的情况。', 'Review one container and one seal at a time. The comparison normalizes case and spaces. Ask logistics staff or the declarant to resolve discrepancies, particularly documented reseals.'],
    source: declaration,
    inputs: [
      t('docContainer', '单证箱号', 'Document container ID', 'ABCU 123456 7'),
      t('actualContainer', '现场记录箱号', 'Recorded container ID', 'ABCU1234567'),
      t('docSeal', '单证封志号', 'Document seal ID', 'SEAL-105'),
      t('actualSeal', '现场记录封志号', 'Recorded seal ID', 'SEAL-150'),
    ],
    run: values => {
      const container = shipmentIdentifier(values.docContainer) === shipmentIdentifier(values.actualContainer);
      const seal = shipmentIdentifier(values.docSeal) === shipmentIdentifier(values.actualSeal);
      return [
        ['箱号核对', 'Container comparison', compareExactly(container, true)],
        ['封志号核对', 'Seal comparison', compareExactly(seal, true)],
        ['不一致字段数', 'Fields with discrepancies', Number(!container) + Number(!seal)],
      ];
    },
  },
  {
    id: 'cn-export-prefiling-window',
    zh: '中国出口提前申报日期检查',
    en: 'China advance export declaration window',
    purpose: ['以预计运抵海关监管区的日期倒排提前申报窗口，联动检查货物事实与运输资料。', 'Work backward from expected customs-area arrival and check the readiness of freight and goods details.'],
    scope: ['适用于符合海关规定的中国出口提前申报。按日历估算运抵前七日，口岸受理要求、当天时点与运输数据以实际确认为准。', 'For China export advance declarations that meet customs conditions. Estimates the seven days before customs-area arrival. Confirm exact timing, transport data and port acceptance separately.'],
    source: declaration,
    inputs: [
      d('arrival', '预计运抵监管区日期', 'Expected customs-area arrival', '2026-12-18'),
      d('filing', '计划申报日期', 'Planned declaration date', '2026-12-13'),
      c('goods', '品名、规格型号和数量已确定', 'Description, model and quantity confirmed'),
      c('transport', '已有适用提单、运单或舱单数据', 'Eligible transport document or manifest data obtained', 'unknown'),
    ],
    run: values => {
      const arrival = atMidnight(values.arrival);
      const delta = (arrival - atMidnight(values.filing)) / dayMs;
      const within = delta >= 1 && delta <= 7;
      return [
        ['估算窗口起日', 'Estimated first day', isoDate(new Date(arrival.getTime() - 7 * dayMs))],
        ['计划提前日数', 'Planned days before arrival', delta],
        ['日期核对', 'Date check', within
          ? ['日期落在运抵前七日内', 'Date falls within seven days before arrival']
          : ['日期需与口岸另行核对', 'Confirm timing with the port']],
        ['货物与运输数据', 'Goods and transport evidence', values.goods === 'yes' && values.transport === 'yes'
          ? ['两项记录已确认', 'Both records confirmed']
          : ['还有资料需要补齐或核对', 'Records still need completion or confirmation']],
      ];
    },
  },
  {
    id: 'cn-nonpreferential-origin-evidence',
    zh: '非优惠原产地证据整理',
    en: 'China non-preferential origin evidence',
    purpose: ['依生产是否跨国，列出申请或复核中国非优惠原产地证书前要整理的生产证据。', 'Build an evidence checklist for a non-preferential certificate of origin based on where production took place.'],
    scope: ['仅用于整理中国非优惠原产地材料。多国生产须按具体商品审查最后实质性改变和目的市场要求。', 'For preparing non-preferential origin evidence in China. Involve the applicable product-specific substantial transformation rule and destination requirements for multi-country production.'],
    source: ['司法部国家行政法规库进出口货物原产地条例', 'MOJ regulations on the origin of imported and exported goods', 'https://xzfg.moj.gov.cn/front/law/detail?LawID=1523'],
    inputs: [
      c('singleCountry', '生产及取得过程只涉及一地', 'Production and obtaining took place in one territory', 'no'),
      c('processMap', '生产场所与工序记录完备', 'Production locations and process records available'),
      c('supplier', '材料来源与供应商证据齐备', 'Materials and supplier records available', 'unknown'),
      c('originRule', '已核对具体货物的改制判据', 'Product-specific transformation criterion reviewed', 'no'),
    ],
    run: values => {
      const common = [
        c('processMap', '按场所记录生产与工序', 'Production and process records by location'),
        c('supplier', '整理材料与供应商证据', 'Materials and supplier evidence'),
      ];
      const multiCountry = c('originRule', '核对实质性改变判据及证据', 'Substantial transformation criterion and evidence');
      const records = values.singleCountry === 'yes' ? common : [...common, multiCountry];
      return [
        ['取证路径', 'Evidence track', values.singleCountry === 'yes'
          ? ['单一地点资料路径，请核对完全获得条件', 'Single-territory evidence, review wholly obtained rules']
          : values.singleCountry === 'no'
            ? ['多地生产资料路径', 'Multi-territory production evidence']
            : ['生产地待核，暂按多地准备', 'Production locations unconfirmed, prepare both sets of records']],
        ...missingRecords(records, values),
      ];
    },
  },
  {
    id: 'rcep-build-down-regional-value',
    zh: 'RCEP 区域价值成分倒扣试算',
    en: 'RCEP build-down regional value test',
    purpose: ['用离岸价格和已核对的非原产材料价格试算区域价值成分及阈值余量。', 'Model regional value content and threshold headroom using the build-down formula.'],
    scope: ['适用于货物的产品特定规则允许该 RCEP 算式时。统一币种，由经办人查证非原产材料计价口径和适用阈值。样例阈值用于演示。', 'Use when the applicable product-specific rule allows this RCEP formula. Enter amounts in one currency and check the non-originating valuation basis and applicable threshold. Example rates are illustrative.'],
    source: rcep,
    inputs: [
      n('fob', '货物离岸价格', 'FOB value', 20000),
      n('nonOriginating', '非原产材料价格', 'Non-originating materials value', 11800),
      p('threshold', '已核对的最低 RVC（%）', 'Reviewed minimum RVC (%)', 40),
    ],
    run: values => {
      if (values.fob <= 0) throw new RangeError('FOB value must be positive');
      const share = (values.fob - values.nonOriginating) / values.fob * 100;
      const maxMaterials = values.fob * (100 - values.threshold) / 100;
      return [
        ['测算区域价值成分（%）', 'Modelled regional value content (%)', share],
        ['超过所填阈值的幅度（百分点）', 'Headroom above threshold (percentage points)', share - values.threshold],
        ['非原产材料价格余量', 'Non-originating material headroom', maxMaterials - values.nonOriginating],
      ];
    },
  },
  {
    id: 'rcep-transit-evidence',
    zh: 'RCEP 经第三地中转证据检查',
    en: 'RCEP transit evidence checklist',
    purpose: ['梳理经第三地中转时，为核对 RCEP 直接运输条件可提交的单据。', 'Check the evidence available to review direct consignment for shipments transiting a third territory.'],
    scope: ['只覆盖 RCEP 货物中转材料准备。运输轨迹、海关监管状态及经过的操作需闭环核对，目的地进口主管机关审查优惠待遇。', 'For preparing RCEP transit evidence. Reconcile the transport chain, customs supervision and work performed during transit. The importing authority reviews eligibility.'],
    source: rcep,
    ...checklist([
      c('route', '全程运输单据能够串联各段', 'Transport records link all journey legs'),
      c('supervision', '能证明中转期间处于海关监管下', 'Evidence of customs supervision during transit', 'unknown'),
      c('operations', '操作记录能证明仅有必要的物流或保全操作', 'Records support only necessary transit or preservation operations'),
      c('sameGoods', '货物标识和数量可与原运输单据核对', 'Goods identifiers and quantities reconcile across records', 'no'),
    ]),
  },
  {
    id: 'cn-9610-export-data-readiness',
    zh: '9610 零售出口数据交接',
    en: 'China 9610 retail export data handoff',
    purpose: ['按跨境零售出口清单流程，检查交易和物流电子数据的交接准备。', 'Prepare the electronic transaction and logistics handoff for a China 9610 retail export list.'],
    scope: ['仅覆盖跨境电商零售出口的清单准备。2024 年第 167 号公告对相关清单申报取消传输收款单电子信息。应按实际口岸核对申报条件。', 'For China cross-border e-commerce retail export list preparation. GACC Announcement 167 of 2024 removes the payment-slip data transmission requirement for the specified list declarations. Confirm local filing conditions.'],
    source: ecommerce,
    ...checklist([
      c('tradeData', '交易电子信息已与订单对齐', 'Electronic transaction data reconciled with orders'),
      c('logisticsData', '物流电子信息已与运单对齐', 'Electronic logistics data reconciled with waybills', 'unknown'),
      c('goodsRecord', '商品和数量已与申报清单核对', 'Goods and quantities checked against the list'),
      c('owners', '平台、企业或代理及物流的传输职责已确认', 'Transmission responsibilities agreed with platform, enterprise or agent and logistics', 'no'),
    ]),
  },
  {
    id: 'cn-9710-9810-route-check',
    zh: '9710／9810 出口路径初筛',
    en: 'China 9710 and 9810 route scoping',
    purpose: ['根据境外企业订单、跨境电商交易和海外仓发运安排，列出下一步应核对的监管方式。', 'Use B2B orders, e-commerce activity and overseas warehouse plans to identify a procedure for review.'],
    scope: ['限于已核对跨境电商业务背景的中国出口。输出用于向口岸或报关行确认监管方式及适用单证。', 'For China exports with a documented cross-border e-commerce context. Use the result to ask the port or broker about the correct procedure and records.'],
    source: ['海关总署跨境电商 B2B 出口监管公告', 'GACC Announcement 75 of 2020 on B2B e-commerce exports', 'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2020/art_e6c6c609ff3541e19d01631f2ba02bd7.html'],
    inputs: [
      c('platform', '已掌握跨境电商平台交易或业务资料', 'Cross-border e-commerce platform activity or transaction evidence available'),
      c('direct', '该批货直接发给境外企业买方', 'Shipment goes directly to an overseas business buyer', 'no'),
      c('warehouse', '该批货先出口至海外仓后再履约', 'Inventory goes to an overseas warehouse before fulfilment'),
    ],
    run: values => {
      let route = ['资料不足或两种路径重叠，先拆分本批业务', 'Clarify the records or separate overlapping shipment types'];
      let followUp = ['核对境外收货方、成交时点与库存归属', 'Confirm the recipient, sale timing and stock ownership'];
      if (values.platform === 'yes' && values.direct === 'yes' && values.warehouse === 'no') {
        route = ['向口岸核对 9710 B2B 直接出口', 'Review 9710 direct B2B export with the port'];
        followUp = ['准备平台交易记录、企业买方与直发物流资料', 'Prepare platform transactions, business buyer records and direct shipment evidence'];
      } else if (values.platform === 'yes' && values.warehouse === 'yes' && values.direct === 'no') {
        route = ['向口岸核对 9810 跨境电商出口海外仓', 'Review 9810 e-commerce overseas warehouse export with the port'];
        followUp = ['准备海外仓及后续履约记录，核对现行单证要求', 'Prepare warehouse and fulfilment records and confirm current documentation rules'];
      }
      return [['建议核对的路径', 'Procedure to review', route], ['下一步资料', 'Next records to collect', followUp]];
    },
  },
  {
    id: 'cn-9610-return-triage',
    zh: '9610 出口退货资料初核',
    en: 'China 9610 export return checklist',
    purpose: ['在准备零售出口退货前，核对原清单、商品识别和拟退入的监管作业场所。', 'Match original export records, returned goods and the proposed supervised receiving location.'],
    scope: ['适用于原为 9610 模式的零售出口退货。全国跨关区退货规则自 2026 年 4 月 1 日起实施，拟选监管场所与企业安排仍需核对。税务与时限另行审核。', 'For retail returns originally exported using 9610. The nationwide cross-district return rules took effect on April 1, 2026. Verify the proposed site and business arrangements. Review tax and timing separately.'],
    source: ['海关总署全国跨关区退货公告', 'GACC Announcement 24 of 2026 on nationwide cross-district returns', 'https://fec.mofcom.gov.cn/article/ggfw/zcfg/zcfgdwmy/zcfgdwmyxx/202603/4173.html'],
    ...checklist([
      c('original', '原 9610 出口清单可追溯', 'Original 9610 export list retrievable'),
      c('quantity', '退回商品与原出口品名和数量可对应', 'Returned goods and quantities reconcile with the original export'),
      c('receiving', '已核对承接退货的监管作业场所', 'Supervised receiving location confirmed', 'unknown'),
      c('returnRoute', '退运物流及跨关区安排已与经办方对齐', 'Return logistics and any cross-district arrangements agreed', 'no'),
      c('dedicatedArea', '独立作业区及生产数据对接已核对', 'Dedicated work area and operations data access reviewed', 'unknown'),
    ]),
  },
  {
    id: 'eu-customs-transaction-value',
    zh: '欧盟进口成交估价试算',
    en: 'EU import transaction value estimate',
    purpose: ['调整到欧盟关境入境地点的费用及相关计入项目，得到一份欧盟成交估价工作底稿。', 'Build an EU transaction value worksheet by adjusting costs around the point of entry.'],
    scope: ['仅适用经确认能采用成交价值法的情况，输入同一币种。加计项以依法应计且未包含为限，扣减项仅使用已含且符合要求可区分的金额。', 'Use for scenarios where the transaction value method is applicable and all figures share one currency. Add only required amounts not already included, and deduct only eligible amounts separately distinguished in the price.'],
    source: ['欧盟委员会 UCC 成交价值法指南', 'European Commission UCC transaction value guide', 'https://taxation-customs.ec.europa.eu/system/files/2019-03/06_taxud_ucc_customs_valuation_quick_info_en.pdf'],
    inputs: [
      n('invoice', '实付或应付价格', 'Price paid or payable', 19500),
      n('freight', '应加计的入境前运费及相关费用', 'Addable transport and related costs to EU entry', 820),
      n('insurance', '应加计的入境前保险', 'Addable insurance up to EU entry', 110),
      n('assists', '应加计的协助、包装与容器', 'Addable assists, packing and containers', 250),
      n('other', '应加计的其他法定调整', 'Other required additions', 120),
      n('postEntry', '已含且可扣减的入境后运费等', 'Included and deductible post-entry costs', 90),
    ],
    run: values => {
      if (values.postEntry > values.invoice) throw new RangeError('included deductions exceed price');
      const additions = values.freight + values.insurance + values.assists + values.other;
      return [
        ['加计金额合计', 'Total additions', additions],
        ['扣减后实付价', 'Price net of deductions', values.invoice - values.postEntry],
        ['成交价值估算', 'Estimated transaction value', values.invoice + additions - values.postEntry],
      ];
    },
  },
  {
    id: 'us-customs-invoice-value',
    zh: '美国进口发票估价核算',
    en: 'US invoice transaction value worksheet',
    purpose: ['按美国成交价格口径检查发票中可排除的费用及未计入的加价项。', 'Reconcile excluded freight-related charges and omitted additions when estimating US transaction value.'],
    scope: ['限能用美国成交价格法的情形。仅扣除价格中已包含并有实际费用证据的合格国际运保等项目。关联交易、无销售和特殊价款需要进口方另行核查。', 'Use only where the US transaction value method is available. Subtract qualified international shipping and insurance already in the price and supported by cost records. Related-party, no-sale and special price cases require review.'],
    source: ['美国海关与边境保护局商业发票计价指南', 'US CBP commercial invoice value guidance', 'https://www.help.cbp.gov/s/article/Article-1162?language=en_US'],
    inputs: [
      n('invoice', '实付或应付价格（USD）', 'Price paid or payable (USD)', 25000),
      n('excluded', '已含且有证据的可排除费用（USD）', 'Included and documented excludable charges (USD)', 940),
      n('packing', '未含且应计入的包装（USD）', 'Addable packing (USD)', 150),
      n('assists', '未含且应计入的协助（USD）', 'Addable assists (USD)', 300),
      n('commission', '未含且应计入的销售佣金（USD）', 'Addable selling commissions (USD)', 175),
      n('royalties', '未含且应计入的许可费（USD）', 'Addable royalties or licence fees (USD)', 0),
      n('proceeds', '未含且应计入的卖方后续收益（USD）', 'Addable proceeds accruing to seller (USD)', 0),
    ],
    run: values => {
      if (values.excluded > values.invoice) throw new RangeError('included exclusions exceed price');
      const additions = values.packing + values.assists + values.commission + values.royalties + values.proceeds;
      return [
        ['可排除费用调整后金额（USD）', 'Price after stated exclusions (USD)', values.invoice - values.excluded],
        ['应计入金额合计（USD）', 'Total additions (USD)', additions],
        ['美国成交价值估算（USD）', 'Estimated US transaction value (USD)', values.invoice - values.excluded + additions],
      ];
    },
  },
  {
    id: 'compound-customs-duty-estimate',
    zh: '从价与从量组合关税试算',
    en: 'Compound customs duty estimate',
    purpose: ['对同时计收从价税与从量税的税目拆分两项，算出关税合计与等效税率。', 'Break a compound duty into its value-based and quantity-based components and compute the total.'],
    scope: ['仅用于税则明确要求相加的从价加从量组合。按明确适用的计量单位与税率手填。税率样例只作演示，先核对税目、原产地和附加措施。', 'Use only when the tariff explicitly adds a value-based charge and a specific charge. Enter the applicable duty units and rates. Example rates are illustrative. Verify the tariff line, origin and additional measures.'],
    source: ['欧盟委员会关税计算说明', 'European Commission customs duty calculation', 'https://taxation-customs.ec.europa.eu/customs/common-customs-tariff-cct/calculation-customs-duties_en'],
    inputs: [
      n('value', '经核对的完税价格', 'Reviewed customs value', 12000),
      n('rate', '适用从价税率（%）', 'Applicable ad valorem rate (%)', 7.5),
      n('units', '从量征税计量单位数', 'Quantity in the specific duty unit', 600),
      n('specific', '每单位从量税金额', 'Specific duty per unit', 0.42),
    ],
    run: values => {
      const adValorem = values.value * values.rate / 100;
      const specific = values.units * values.specific;
      const total = adValorem + specific;
      return [
        ['从价税金额', 'Ad valorem component', adValorem],
        ['从量税金额', 'Specific component', specific],
        ['组合关税合计', 'Total compound duty', total],
        ['等效税率（%）', 'Equivalent duty rate (%)', values.value ? total / values.value * 100 : ['无法计算', 'Unavailable with a zero value']],
      ];
    },
  },
  {
    id: 'eu-eori-declarant-handoff',
    zh: '欧盟进口 EORI 与报关授权交接',
    en: 'EU importer EORI and representation handoff',
    purpose: ['在发货前理清欧盟进口经营者身份、EORI 核验及报关代表的授权记录。', 'Check the EU importer identity, EORI verification and authority for customs representation before shipping.'],
    scope: ['供中国出口商与欧盟进口方交接使用。先确认谁是相关经营者及申报人，EORI 的适用与有效性由对应欧盟官方渠道核对。', 'For handoff between a China exporter and EU importer. Identify the relevant operator and declarant, then use official EU channels to verify the applicable EORI.'],
    source: ['欧盟委员会海关业务和 EORI 说明', 'European Commission customs operations and EORI guidance', 'https://taxation-customs.ec.europa.eu/customs/customs-procedures-import-and-export/customs-operations_en'],
    ...checklist([
      c('importer', '已确认欧盟进口主体及登记名称', 'EU importer and registered name confirmed'),
      c('eori', '已通过官方渠道核验适用的 EORI', 'Applicable EORI verified with an official service', 'unknown'),
      c('declarant', '已确认实际申报人和其申报角色', 'Actual declarant and capacity confirmed'),
      c('authority', '委托申报所需授权已核对', 'Customs representation authority reviewed', 'no'),
    ]),
  },
  {
    id: 'container-vgm-method-two',
    zh: '集装箱 VGM 方法二估重',
    en: 'Packed container VGM method 2 worksheet',
    purpose: ['将货物、包装加固材料和箱体皮重合计，并与箱体铭牌最大总重比较。', 'Add cargo, packaging, securing materials and tare, then compare with the container’s plated gross limit.'],
    scope: ['单位统一用公斤。输出供配载复核。正式 VGM 需要主管机构认可的方法、设备及责任人签署。', 'Enter every weight in kilograms. Use the result to review loading. Formal VGM requires an approved procedure and equipment and sign-off by the responsible party.'],
    source: ['国际海事组织集装箱核实总重指南', 'IMO packed container gross mass verification', 'https://www.imo.org/en/ourwork/safety/pages/verification-of-the-gross-mass.aspx'],
    inputs: [
      n('cargo', '货物净重（公斤）', 'Net cargo (kg)', 18000),
      n('packing', '包装与托盘（公斤）', 'Packing and pallets (kg)', 720),
      n('securing', '衬垫和加固材料（公斤）', 'Dunnage and securing (kg)', 140),
      n('tare', '箱体皮重（公斤）', 'Container tare (kg)', 3900),
      n('plated', '箱体铭牌最大总重（公斤）', 'Maximum plated gross mass (kg)', 30480),
    ],
    run: values => {
      if (values.tare <= 0 || values.plated <= values.tare) throw new RangeError('invalid container plate values');
      const gross = values.cargo + values.packing + values.securing + values.tare;
      const headroom = values.plated - gross;
      return [
        ['估算箱货总重（公斤）', 'Estimated packed gross mass (kg)', gross],
        ['相对铭牌的剩余载重（公斤）', 'Headroom against the plate (kg)', headroom],
        ['配载提示', 'Load planning', headroom < 0
          ? ['测算超出铭牌上限，调整配载', 'Estimate exceeds the plate limit, revise loading']
          : ['测算在铭牌范围内，仍需核实总重', 'Estimate within plate limit, obtain verified mass']],
      ];
    },
  },
  {
    id: 'eu-ics2-linked-filing-handoff',
    zh: '欧盟 ICS2 分段申报资料交接',
    en: 'EU ICS2 linked filing data handoff',
    purpose: ['多方分段提交欧盟 ENS 时，复核承运人和分运单申报方可用于关联的数据。', 'Review the carrier and house-filer data used to link partial EU entry summary declarations.'],
    scope: ['仅用于 ICS2 多方分段申报的资料交接。具体数据集、时限及责任主体依运输模式和约定由承运人或申报方查证。', 'For information handoff in ICS2 multiple filing. The carrier or filer should verify the exact dataset, cutoff and responsibilities for its mode and arrangements.'],
    source: ['欧盟委员会 ICS2 常见问题', 'European Commission ICS2 FAQ', 'https://taxation-customs.ec.europa.eu/customs/customs-security/import-control-system-2/faq_en'],
    ...checklist([
      c('responsibility', '各方已确认使用多方分段申报', 'Parties agreed on multiple filing'),
      c('linkedParties', '相关承运人及分运单申报方 EORI 已对齐', 'Carrier and applicable house-filer EORI aligned'),
      c('transportRef', '运输合同号等关联引用已对齐', 'Transport contract and linking references aligned', 'unknown'),
      c('partyData', '各方所需货物及买卖方数据已分工', 'Responsibilities for goods and buyer/seller data agreed', 'no'),
    ]),
  },
];
