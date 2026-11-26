const pair = (zh, en) => [zh, en];
const row = (zh, en, value) => [zh, en, value];
const check = (key, zh, en, sample = 'yes') => [key, 'choice', zh, en, sample];
const number = (key, zh, en, sample) => [key, 'number', zh, en, sample];
const date = (key, zh, en, sample) => [key, 'date', zh, en, sample];

function firstGap(values, inputs) {
  const gap = inputs.find(([key]) => values[key] !== 'yes');
  return gap ? pair(gap[2], gap[3]) : pair('已核对所列材料', 'Listed evidence reviewed');
}

function evidence(values, inputs) {
  const count = status => inputs.filter(([key]) => values[key] === status).length;
  return [
    row('已有证据项', 'Evidence items ready', count('yes')),
    row('缺少证据项', 'Evidence items missing', count('no')),
    row('待核实项', 'Items to verify', count('unknown')),
    row('优先补齐', 'First item to resolve', firstGap(values, inputs)),
  ];
}

const present = values => values.every(value => value === 'yes');
const positive = value => {
  if (value <= 0) throw new RangeError('positive_value_required');
  return value;
};
const rounded = (value, places = 2) => Number(value.toFixed(places));
const day = value => Date.parse(value + 'T00:00:00Z');

const endUse = [
  check('identity', '最终用户法定身份和地址已核实', 'End user’s legal identity and address verified'),
  check('facility', '实际接收地点和转运链已核实', 'Receiving location and intermediaries verified'),
  check('use', '最终用途与商品规格相符', 'Intended use matches the product specifications'),
  check('certificate', '已取得适用的最终用户及用途证明', 'Applicable end-user and end-use certificate obtained', 'no'),
];

const ceFile = [
  check('legislation', '已列出适用的欧盟产品法规及采用标准', 'Applicable EU legislation and standards mapped'),
  check('technical', '技术文件覆盖设计、材料及风险分析', 'Technical documentation covers design, materials and risk'),
  check('test', '测试报告型号与拟售产品一致', 'Test reports match the model for sale'),
  check('body', '已完成适用的评定程序及机构核查', 'Applicable conformity assessment and body checks complete', 'unknown'),
  check('declaration', '适用的欧盟符合性声明可提供', 'Applicable EU declaration of conformity available'),
  check('marking', '标签和说明书版本已核对', 'Marking and instructions reviewed for this version'),
];

const gpsrOffer = [
  check('maker', '网页显示制造商名称、邮政地址和电子地址', 'Offer shows manufacturer name, postal and electronic address'),
  check('operator', '网页显示适用的欧盟负责人名称、邮政地址和电子地址', 'Offer shows required EU responsible person details', 'no'),
  check('model', '网页显示商品图片、型号和识别信息', 'Offer shows image, type and product identifier'),
  check('warnings', '网页使用市场要求的语言展示适用警示', 'Offer displays applicable warnings in required languages', 'unknown'),
];

const batteryFile = [
  check('role', '已核实产品类别和本方经营者角色', 'Battery category and economic operator role reviewed'),
  check('technical', '型号与技术文件及支持试验对应', 'Model matches technical documentation and supporting tests'),
  check('declaration', '适用的符合性声明和 CE 标志已核对', 'Applicable declaration and CE marking reviewed'),
  check('traceability', '制造商、进口商及批次标识可查', 'Manufacturer, importer and batch identifiers traceable'),
  check('dates', '已核对本型号的分阶段标签和信息要求', 'Model-specific phased labelling and information requirements reviewed', 'unknown'),
];

const childrensCertificate = [
  check('rules', '已逐项确定产品适用的 CPSC 规则', 'Applicable CPSC rules mapped for the product'),
  check('lab', '已核对适用检测实验室的 CPSC 认可范围', 'Applicable lab’s CPSC acceptance scope verified'),
  check('reports', '现有测试报告覆盖拟进口型号和规则', 'Test reports cover the model and applicable rules', 'no'),
  check('details', '证书具备产品、责任方及生产检测信息', 'Certificate has product, responsible-party, production and testing details'),
  check('provide', '证书可随批次向客户和主管机关提供', 'Certificate can be furnished for the shipment'),
];

export default [
  {
    id: 'china-dual-use-license',
    zh: '中国两用物项出口许可材料预检',
    en: 'China dual-use export licence readiness',
    purpose: pair('核对拟出口型号、最新管制清单、许可证记录和适用范围。', 'Check the export model, current control-list review and licence coverage.'),
    scope: pair('适用于中国大陆出口前交接。需要人工核实最新清单、临时管制和其他适用条件。', 'For Mainland China pre-export handoff. Review the current list, temporary measures and other requirements separately.'),
    source: ['商务部两用物项出口管制清单', 'MOFCOM dual-use export control list', 'https://exportcontrol.mofcom.gov.cn/article/zcfg/gnzcfg/zcfggzqd/202411/1067.html'],
    inputs: [
      check('identified', '规格、型号及技术参数均有依据', 'Model, specification and technical parameters documented'),
      check('reviewed', '已核对最新清单及临时管制措施', 'Current list and temporary controls reviewed'),
      check('listed', '人工核对发现可能纳入管制', 'Manual review indicates possible control coverage'),
      check('licence', '已有适用且有效的许可证', 'Applicable, valid licence is on record', 'no'),
      check('covered', '许可证覆盖本票物项、数量和拟议交易', 'Licence covers this item, quantity and proposed transaction', 'unknown'),
    ],
    run: v => {
      let stage;
      if (!present([v.identified, v.reviewed]) || v.listed === 'unknown') stage = pair('暂停放行并补齐分类依据', 'Hold for supporting classification evidence');
      else if (v.listed === 'no') stage = pair('复核最终用途、最终用户和其他适用管制', 'Review end use, end user and other applicable controls');
      else if (!present([v.licence, v.covered])) stage = pair('暂停放行并核对许可及覆盖范围', 'Hold for licence and coverage review');
      else stage = pair('许可材料可交出口管制负责人复核', 'Licence evidence ready for the export-controls reviewer');
      return [row('当前交接步骤', 'Next workflow step', stage)];
    },
  },
  {
    id: 'end-user-use-evidence',
    zh: '最终用户和最终用途核验',
    en: 'End-user and end-use evidence review',
    purpose: pair('对照实际收件人、目的场所、用途和用途中转限制整理证据。', 'Review the actual recipient, facility, use and handoff evidence.'),
    scope: pair('用于中国大陆两用物项的交易级材料准备，变更最终用户或用途后重新核验。', 'Supports China dual-use transaction files. Recheck after a change of end user or end use.'),
    source: ['商务部《两用物项出口管制条例》', 'MOFCOM Regulations on Dual-Use Export Control', 'https://www.mofcom.gov.cn/zcfb/dwmygl/art/2024/art_6ed1d5c0336843c493bd45a1911eab17.html'],
    inputs: [...endUse, check('redFlag', '发现用途、转运地点或收件人存在疑点', 'A concern exists about use, routing or the recipient', 'no')],
    run: v => [
      ...evidence(v, endUse),
      row('交易复核', 'Transaction review', v.redFlag === 'no'
        ? pair('按已列材料交接复核', 'Send the listed evidence for review')
        : pair('先交复核人员处理疑点', 'Escalate the concern before release')),
    ],
  },
  {
    id: 'us-csl-match-triage',
    zh: '美国 CSL 名单相似命中复核',
    en: 'US Consolidated Screening List match triage',
    purpose: pair('记录筛查日期，分流名称相近、身份有冲突和待核名单来源的交易方。', 'Record the screening date and triage similar names using identity and source-list evidence.'),
    scope: pair('适用于已有美国 CSL 检索结果的交易。核对源名单及其适用限制后才能处置命中。', 'For an existing US CSL search result. Verify the source list and its restrictions before resolving a match.'),
    source: ['美国国际贸易管理局 CSL', 'US International Trade Administration CSL', 'https://www.trade.gov/consolidated-screening-list'],
    inputs: [
      date('screened', '筛查日期', 'Screening date', '2026-11-20'),
      date('shipment', '计划发运日期', 'Planned dispatch date', '2026-11-25'),
      check('match', '有名称或别名相近结果', 'A name or alias comes back similar'),
      check('identity', '地址、国家或登记号支持系同一主体', 'Address, country or registration ID supports the same identity', 'unknown'),
      check('agency', '已查看该机构原名单及限制说明', 'Underlying agency list and restrictions reviewed', 'no'),
    ],
    run: v => {
      const age = (day(v.shipment) - day(v.screened)) / 86400000;
      let stage = pair('按计划发运日前复查名单', 'Recheck the lists before the planned dispatch');
      if (age < 0) stage = pair('核对日期，筛查晚于计划发运', 'Check dates. Screening follows planned dispatch');
      else if (v.match === 'unknown') stage = pair('完成筛查后再进入交易复核', 'Complete screening before transaction review');
      else if (v.match === 'yes') {
        if (v.identity !== 'no' || v.agency !== 'yes') stage = pair('保留待核状态并升级复核', 'Keep open and escalate for review');
        else stage = pair('留存同名排除依据并由复核人确认', 'Retain evidence of the false positive for reviewer signoff');
      }
      return [
        row('从筛查到计划发运（天）', 'Days from screening to planned dispatch', age),
        row('名单复核动作', 'Screening action', stage),
      ];
    },
  },
  {
    id: 'eu-sanctions-ownership-review',
    zh: '欧盟制裁交易方控制关系复核',
    en: 'EU sanctions ownership and control review',
    purpose: pair('为欧盟客户或物流节点依赖的交易整理股权、控制权、主体及转运线材料。', 'Prepare ownership, control, partner and routing evidence for an EU-linked transaction.'),
    scope: pair('按具体制裁方案人工核实受益所有人、实际控制关系和间接供货风险。', 'Check ultimate ownership, effective control and indirect-supply risks under the specific EU regime.'),
    source: ['欧盟委员会制裁防规避尽职调查指引', 'European Commission sanctions due diligence guidance', 'https://finance.ec.europa.eu/publications/guidance-due-diligence_en'],
    inputs: [
      check('officialList', '已检查相关欧盟制裁方案和名单', 'Relevant EU regimes and lists reviewed'),
      check('owners', '已查明所有权链和实际控制人', 'Ownership chain and effective controllers established', 'unknown'),
      check('intermediaries', '已查明付款方、收款方和转运方', 'Paying, receiving and transit counterparties identified'),
      check('routingConcern', '存在不透明受益所有权或异常转运', 'Beneficial ownership or routing presents a concern', 'yes'),
    ],
    run: v => {
      const open = [v.officialList, v.owners, v.intermediaries].filter(value => value !== 'yes').length;
      return [
        row('未完成的核查分支', 'Review branches still open', open),
        row('处理优先级', 'Review priority', v.routingConcern !== 'no'
          ? pair('升级制裁与转运复核', 'Escalate sanctions and routing review')
          : open ? pair('补齐所有权和交易链证据', 'Finish ownership and transaction evidence')
            : pair('将尽调记录交指定复核人', 'Hand the diligence record to the designated reviewer')),
      ];
    },
  },
  {
    id: 'eu-ce-technical-file',
    zh: '欧盟 CE 技术文件缺口检查',
    en: 'EU CE technical file gap check',
    purpose: pair('逐项核查 CE 产品型号的法规、测试、风险、声明及型式评定材料。', 'Review legislation, tests, risk evidence, declaration and assessment for a CE-marked model.'),
    scope: pair('仅面向已确定适用 CE 标志的产品，评定程序和公告机构要求按适用产品法规核对。', 'For products confirmed to require CE marking. Use the product legislation to establish the assessment route and any notified-body requirement.'),
    source: ['欧盟 Your Europe CE 标志指引', 'EU Your Europe CE marking guidance', 'https://europa.eu/youreurope/business/product-rules-compliance/general-product-compliance/ce-marking/index_en.htm'],
    inputs: ceFile,
    run: v => [
      ...evidence(v, ceFile),
      row('技术档交接', 'Technical file handoff', v.legislation !== 'yes'
        ? pair('先确认适用法规和评定程序', 'Establish the applicable legislation and assessment route')
        : !present([v.technical, v.test, v.body]) ? pair('补齐评定和测试证据', 'Complete assessment and test evidence')
          : !present([v.declaration, v.marking]) ? pair('将声明和标签退回版本核对', 'Reconcile declaration and marking versions')
            : pair('将完整型号技术档交合规复核', 'Hand the model-specific file to the compliance reviewer')),
    ],
  },
  {
    id: 'eu-gpsr-online-offer',
    zh: '欧盟 GPSR 网售页面信息核验',
    en: 'EU GPSR online offer information check',
    purpose: pair('对照实际商品页面，按第 19 条核查适用的制造商、负责人、产品识别和安全信息。', 'Check the live offer against the applicable manufacturer, responsible person, identification and safety information in Article 19.'),
    scope: pair('面向 GPSR 适用的欧盟消费者远程销售页面。制造商在欧盟境外时核对欧盟负责人信息。', 'For EU distance offers covered by the GPSR. Review EU responsible-person details for a manufacturer established outside the EU.'),
    source: ['EUR-Lex 欧盟通用产品安全条例第 19 条', 'EUR-Lex General Product Safety Regulation Article 19', 'https://eur-lex.europa.eu/eli/reg/2023/988'],
    inputs: gpsrOffer,
    run: v => [
      ...evidence(v, gpsrOffer),
      row('发布检查', 'Offer publication check', !present([v.maker, v.operator])
        ? pair('在发布页补齐适用经营者的联系信息', 'Complete the applicable operator contact details')
        : !present([v.model, v.warnings]) ? pair('检查商品识别和警示的买方可见性', 'Review buyer visibility of identifiers and warnings')
          : pair('留存同一页面的上线截图', 'Retain a screenshot of the reviewed offer')),
    ],
  },
  {
    id: 'eu-safety-gate-match',
    zh: '欧盟 Safety Gate 警报型号匹配',
    en: 'EU Safety Gate recall match triage',
    purpose: pair('把已经找到的官方警报与现货型号、批次及在售状态交叉比较。', 'Compare an official alert with the model, affected batch and current offer status.'),
    scope: pair('适用于已获得 Safety Gate 警报的人工作业，以原警报范围和主管机关指示为准。', 'For manual triage of an alert already found in Safety Gate. Use the original alert scope and authority instructions.'),
    source: ['欧盟委员会 Safety Gate 召回目录', 'European Commission Safety Gate recalls', 'https://ec.europa.eu/safety-gate/screen/pages/effectiveRecalls'],
    inputs: [
      check('model', '商品或包装型号与警报一致', 'Product or packaging model matches the alert'),
      check('batch', '库存批次、流水号或日期落入警报范围', 'Stock batch, serial number or date is in scope', 'unknown'),
      check('offered', '该库存仍在售或待发运', 'Stock is still offered or awaiting dispatch'),
      check('severity', '警报要求停止销售或召回', 'The alert calls for stopping sales or recall'),
    ],
    run: v => {
      const match = v.model === 'no' || v.batch === 'no'
        ? pair('至少一项标识与警报不符，留证复核', 'Retain evidence of the differing identifier for review')
        : present([v.model, v.batch]) ? pair('型号及批次相符', 'Model and batch match')
          : pair('型号或批次待确认', 'Model or batch requires confirmation');
      const action = v.model === 'no' || v.batch === 'no'
        ? pair('复核排除理由和原警报覆盖范围', 'Verify exclusion rationale and original alert scope')
        : v.offered !== 'no' || v.severity !== 'no'
          ? pair('隔离相关库存并交召回复核', 'Segregate affected stock and escalate recall review')
          : pair('核对既往销售和追溯记录', 'Review prior sales and traceability records');
      return [row('匹配结果', 'Identifier comparison', match), row('库存处置下一步', 'Next inventory action', action)];
    },
  },
  {
    id: 'eu-reach-svhc-article',
    zh: '欧盟 REACH 候选物质含量初算',
    en: 'EU REACH SVHC article concentration',
    purpose: pair('根据单个构成物品的重量计算候选物质质量分数，并提示交给欧盟供应链复核。', 'Calculate a Candidate List substance concentration for the individual article and flag EU supply-chain review.'),
    scope: pair('按单个构成物品及同一候选物质计算质量分数。向欧盟供应链核对第 33 条和 SCIP 的主体及情形。', 'Use the constituent article and one Candidate List substance. Check the party and circumstances for Article 33 and SCIP with the EU supply chain.'),
    source: ['ECHA 候选清单义务说明', 'ECHA Candidate List obligations', 'https://echa.europa.eu/candidate-list-obligations'],
    inputs: [
      number('articleGrams', '单个物品质量（克）', 'Individual article mass (g)', 40),
      number('substanceMg', '其中单一物质质量（毫克）', 'Mass of the one substance in the article (mg)', 60),
      check('listed', '已按最新 ECHA 候选清单确认该物质在列', 'Substance confirmed on the current ECHA Candidate List'),
    ],
    run: v => {
      const mass = positive(v.articleGrams);
      const percentage = v.substanceMg / mass / 10;
      if (percentage > 100) throw new RangeError('substance_exceeds_article_mass');
      let flag = pair('先核对物质身份和当前候选清单', 'Verify substance identity and current list status');
      if (v.listed === 'yes') {
        flag = v.substanceMg > mass
          ? pair('超过 0.1%，交欧盟供应链复核信息义务', 'Above 0.1%. Escalate for supply-chain obligations review')
          : pair('输入含量未超过 0.1%，保留物料证据', 'Retain evidence for the entered concentration at or below 0.1%');
      }
      return [row('该物品中的质量分数（%）', 'Concentration in this article (%)', rounded(percentage, 6)), row('下一步', 'Next step', flag)];
    },
  },
  {
    id: 'eu-rohs-material-limit',
    zh: '欧盟 RoHS 均质材料限值对照',
    en: 'EU RoHS homogeneous material limit check',
    purpose: pair('按单个已识别的 RoHS 受限物质，把均质材料报告浓度和附件 II 的基准限值对照。', 'Compare a reported concentration with the Annex II baseline for one identified RoHS substance in one homogeneous material.'),
    scope: pair('适用于已确认落在 RoHS 范围的电气电子设备，按单一受限物质和均质材料比较。适用豁免需按所涉用途与有效期人工确认。', 'Use one restricted substance and one homogeneous material for in-scope electrical equipment. Confirm any exemption against its application and validity.'),
    source: ['EUR-Lex RoHS 指令 2011/65/EU 附件 II', 'EUR-Lex RoHS Directive 2011/65/EU Annex II', 'https://eur-lex.europa.eu/eli/dir/2011/65'],
    inputs: [
      number('ppm', '报告浓度（mg/kg，等同 ppm）', 'Reported concentration (mg/kg, equivalent to ppm)', 135),
      check('cadmium', '报告物质为镉', 'The reported substance is cadmium'),
      check('exemption', '存在待复核的特定用途豁免文件', 'An application-specific exemption is documented for review', 'no'),
    ],
    run: v => {
      if (v.ppm > 1000000) throw new RangeError('reported_concentration_exceeds_material');
      if (v.cadmium === 'unknown') return [row('物质核验', 'Substance identification', pair('先确认是否为镉', 'Confirm whether the substance is cadmium first'))];
      const limit = v.cadmium === 'yes' ? 100 : 1000;
      return [
        row('附件 II 基准限值（mg/kg）', 'Annex II baseline limit (mg/kg)', limit),
        row('报告值减基准限值（mg/kg）', 'Reported value minus baseline (mg/kg)', rounded(v.ppm - limit, 6)),
        row('材料复核', 'Material review', v.ppm <= limit
          ? pair('当前输入在基准限值内，留存报告', 'Retain the report for a value within baseline')
          : v.exemption === 'yes' ? pair('超过基准限值，复核豁免范围和有效期', 'Above baseline. Review exemption scope and validity')
            : pair('超过基准限值，升级材料复核', 'Above baseline. Escalate material review')),
      ];
    },
  },
  {
    id: 'eu-cbam-emissions-handoff',
    zh: '欧盟 CBAM 批次排放数据交接估算',
    en: 'EU CBAM shipment emissions handoff estimate',
    purpose: pair('把同一产线同周期的已归属排放量除以合格产量，再估算计划交货量对应的排放数据。', 'Divide allocated emissions by output for the same production boundary and use the intensity for a shipment estimate.'),
    scope: pair('用于与欧盟进口商核对排放数据。适用商品、系统边界、前体、核证方法和申报值按当期规则确认。', 'Use for data reconciliation with the EU importer. Confirm goods scope, system boundaries, precursors, verification method and reportable values under the applicable rules.'),
    source: ['欧盟委员会 CBAM 机制及申报资料', 'European Commission CBAM and reporting guidance', 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en'],
    inputs: [
      number('outputTonnes', '同周期归属产量（吨）', 'Output within the allocation boundary (tonnes)', 200),
      number('direct', '同周期归属直接排放（吨 CO₂e）', 'Allocated direct emissions (tCO₂e)', 260),
      number('indirect', '同周期归属间接排放（吨 CO₂e）', 'Allocated indirect emissions (tCO₂e)', 40),
      number('shipmentTonnes', '拟交货净重（吨）', 'Net shipment weight (tonnes)', 22),
      check('usesIndirect', '已确认所用方法纳入间接排放', 'Selected method confirmed to include indirect emissions', 'unknown'),
    ],
    run: v => {
      const direct = v.direct / positive(v.outputTonnes);
      const indirect = v.indirect / v.outputTonnes;
      return [
        row('直接排放强度（吨 CO₂e／吨产品）', 'Direct intensity (tCO₂e per tonne of goods)', rounded(direct, 6)),
        row('间接排放强度（吨 CO₂e／吨产品）', 'Indirect intensity (tCO₂e per tonne of goods)', rounded(indirect, 6)),
        row('拟交货排放估算（吨 CO₂e）', 'Shipment estimate (tCO₂e)', v.usesIndirect === 'unknown'
          ? pair('先与进口商核对间接排放口径', 'Confirm the indirect-emissions treatment with the importer')
          : rounded(v.shipmentTonnes * (direct + (v.usesIndirect === 'yes' ? indirect : 0)), 6)),
      ];
    },
  },
  {
    id: 'eu-battery-product-evidence',
    zh: '欧盟电池产品合规文件核查',
    en: 'EU battery product evidence check',
    purpose: pair('核对独立销售或装入设备中的电池型号、技术档和追溯凭证。', 'Check battery model, technical evidence and traceability for standalone or installed batteries.'),
    scope: pair('先识别欧盟电池法规下的类别、角色及生效日期，再按该组合核对义务。', 'Identify the category, operator role and effective dates under the EU Batteries Regulation before reviewing obligations.'),
    source: ['EUR-Lex 欧盟电池和废电池法规', 'EUR-Lex EU Batteries Regulation', 'https://eur-lex.europa.eu/eli/reg/2023/1542/ojn'],
    inputs: batteryFile,
    run: v => [
      ...evidence(v, batteryFile),
      row('批次交接重点', 'Priority for shipment handoff', v.role !== 'yes' || v.dates !== 'yes'
        ? pair('先复核经营者义务和适用日期', 'Verify operator obligations and effective dates')
        : v.traceability !== 'yes' ? pair('核对批次标识与供货方', 'Verify batch identifiers and suppliers')
          : pair('将批次标识与对应技术档同时交接', 'Hand over batch identifiers with the technical file')),
    ],
  },
  {
    id: 'eu-weee-market-coverage',
    zh: '欧盟 WEEE 销售国注册覆盖',
    en: 'EU WEEE selling-market registration coverage',
    purpose: pair('按实际销售国评估 WEEE 登记数量和回收安排缺口。', 'Measure WEEE registration and take-back evidence across the actual selling countries.'),
    scope: pair('仅统计已确认适用 WEEE 生产者责任的目标国，具体主体、授权代表和回收安排分国核查。', 'Count only target countries where WEEE producer responsibility was confirmed. Review the producer, authorised representative and collection duties country by country.'),
    source: ['欧盟 Your Europe WEEE 生产者责任', 'EU Your Europe WEEE producer responsibilities', 'https://europa.eu/youreurope/business/product-rules-compliance/recycling-waste-management/weee-responsibilities/index_en.htm'],
    inputs: [
      ['markets', 'integer', '已核实需登记的目标国数量', 'Target countries confirmed to require registration', 3],
      ['registered', 'integer', '其中已取得有效登记的国家数', 'Of these, countries with valid registration', 2],
      check('takeback', '已按各销售国核验回收安排', 'Take-back coverage reviewed for each selling country', 'unknown'),
    ],
    run: v => {
      if (v.registered > v.markets) throw new RangeError('registered_exceeds_markets');
      return [
        row('尚缺登记的销售国', 'Selling countries missing registration', v.markets - v.registered),
        row('登记覆盖率（%）', 'Registration coverage (%)', v.markets
          ? rounded(v.registered / v.markets * 100)
          : pair('输入未列需登记市场', 'No registration markets entered')),
        row('回收安排', 'Take-back review', v.takeback === 'yes'
          ? pair('保留逐国回收凭证', 'Retain country-level take-back evidence')
          : pair('逐国核对责任方和回收凭证', 'Review responsible parties and take-back evidence by country')),
      ];
    },
  },
  {
    id: 'germany-lucid-packaging-volume',
    zh: '德国 LUCID 包材重量交接',
    en: 'Germany LUCID packaging volume handoff',
    purpose: pair('把同规格发货件的纸和塑料重量折算成年度量，核对登记及系统参与。', 'Estimate annual paper and plastic weights for identical packaging and check registration and system participation.'),
    scope: pair('为已核实适用系统参与义务的德国流通包装准备估算。不同包装规格和材料分别记录。', 'Supports estimates for packaging confirmed in scope for German system participation. Separate packaging formats and materials.'),
    source: ['德国中央包装登记机构系统参与与数据报告', 'German Packaging Register system participation and reporting', 'https://www.verpackungsregister.org/en/information-system-participation-and-data-reporting'],
    inputs: [
      ['shipments', 'integer', '同规格包装年发货件数', 'Identical packages sent per year', 8000],
      number('paper', '每件纸及纸板（克）', 'Paper and cardboard per package (g)', 80),
      number('plastic', '每件塑料（克）', 'Plastic per package (g)', 15),
      check('registered', '已取得适用的 LUCID 登记号', 'Applicable LUCID registration is available'),
      check('contract', '已按材料和数量核对系统参与及申报安排', 'System participation and filing checked by material and volume', 'no'),
    ],
    run: v => [
      row('年度纸及纸板（千克）', 'Annual paper and cardboard (kg)', rounded(v.shipments * v.paper / 1000, 3)),
      row('年度塑料（千克）', 'Annual plastic (kg)', rounded(v.shipments * v.plastic / 1000, 3)),
      row('申报交接', 'Filing handoff', v.registered !== 'yes' ? pair('先核对 LUCID 登记', 'Verify LUCID registration first')
        : v.contract !== 'yes' ? pair('核对系统合同和数据申报范围', 'Review system contract and reporting coverage')
          : pair('把材料估算与对应周期记录交叉核对', 'Reconcile material estimates with period records')),
    ],
  },
  {
    id: 'us-fcc-grant-band-review',
    zh: '美国 FCC 认证频段与型号对照',
    en: 'US FCC certification band and model comparison',
    purpose: pair('把一个实际工作频段与 FCC 授权记录对应频段比较，复核标识、型号和集成条件。', 'Compare one operating band with its FCC grant band and review identification, model and integration conditions.'),
    scope: pair('仅用于已有认证授权记录且可对应单一频段的设备。不同授权行、集成条件和适用设备规则分别核对。', 'Use an existing certification grant and one corresponding frequency range. Review each grant line and equipment or integration condition separately.'),
    source: ['eCFR 47 CFR § 2.925 设备标识', 'eCFR 47 CFR § 2.925 equipment identification', 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-2/subpart-J/subject-group-ECFR491b8ce5b4e7963/section-2.925'],
    inputs: [
      number('deviceFrom', '设备工作频段下限（MHz）', 'Operating band lower edge (MHz)', 2412),
      number('deviceTo', '设备工作频段上限（MHz）', 'Operating band upper edge (MHz)', 2462),
      number('grantFrom', '对应授权记录频段下限（MHz）', 'Grant band lower edge (MHz)', 2412),
      number('grantTo', '对应授权记录频段上限（MHz）', 'Grant band upper edge (MHz)', 2462),
      check('identifier', '设备 FCC ID、型号及必要的模块条件均已核实', 'FCC ID, model and applicable module conditions verified', 'unknown'),
    ],
    run: v => {
      if (v.deviceTo < positive(v.deviceFrom) || v.grantTo < positive(v.grantFrom)) throw new RangeError('frequency_edges_out_of_order');
      const below = Math.max(0, v.grantFrom - v.deviceFrom);
      const above = Math.max(0, v.deviceTo - v.grantTo);
      return [
        row('低于授权下限（MHz）', 'Amount below grant band (MHz)', rounded(below, 6)),
        row('超过授权上限（MHz）', 'Amount above grant band (MHz)', rounded(above, 6)),
        row('下一步', 'Next step', below || above
          ? pair('存在超出输入授权范围的频率，升级核对', 'Escalate the frequency outside the entered grant range')
          : v.identifier === 'yes' ? pair('留存对应授权行及型号依据', 'Retain the matching grant line and model evidence')
            : pair('确认 FCC ID、型号和集成条件', 'Confirm FCC ID, model and integration conditions')),
      ];
    },
  },
  {
    id: 'us-cpsc-cpc-evidence',
    zh: '美国儿童产品 CPC 凭证预检',
    en: 'US children’s product CPC evidence check',
    purpose: pair('按适用规则、实验室覆盖、测试报告和证书信息核对儿童产品交付档。', 'Review rules, lab coverage, reports and certificate details for children’s products.'),
    scope: pair('用于已确定需出具 CPC 的产品，由负责的美国进口商或美国国内生产商核对具体规则及例外。', 'For products confirmed to require a CPC. The responsible US importer or domestic manufacturer reviews rules and exceptions.'),
    source: ['美国消费品安全委员会儿童产品证书说明', 'US Consumer Product Safety Commission CPC guidance', 'https://www.cpsc.gov/Business--Manufacturing/Testing-Certification/Childrens-Product-Certificate'],
    inputs: childrensCertificate,
    run: v => [
      ...evidence(v, childrensCertificate),
      row('证书材料交接', 'Certificate handoff', !present([v.rules, v.lab, v.reports])
        ? pair('先按适用规则和型号补齐检测材料', 'Complete testing evidence by rule and model')
        : !present([v.details, v.provide]) ? pair('核对证书签发信息和提供方式', 'Review the certificate details and distribution method')
          : pair('将证书和测试报告交责任方复核', 'Hand the certificate and reports to the responsible certifier')),
    ],
  },
  {
    id: 'us-origin-claim-review',
    zh: '美国 FTC 原产地宣传用语预审',
    en: 'US FTC origin marketing claim review',
    purpose: pair('把拟使用的美国原产地宣传与最终加工和零件来源证据对照。', 'Compare proposed US-origin marketing with final processing and component sourcing evidence.'),
    scope: pair('适用于面向美国市场的 Made in USA 宣传。无保留声明需核对 FTC 的全部或几乎全部标准与佐证。', 'For Made in USA marketing to the US. Substantiate the FTC’s all-or-virtually-all standard for unqualified claims.'),
    source: ['美国联邦贸易委员会 Made in USA 标准指引', 'US Federal Trade Commission Made in USA guidance', 'https://www.ftc.gov/business-guidance/resources/complying-made-usa-standard'],
    inputs: [
      check('unqualified', '宣传用语拟使用无保留的美国原产声明', 'The planned claim is unqualified US origin'),
      check('usAssembly', '最终组装或加工在美国完成', 'Final assembly or processing takes place in the US', 'no'),
      check('usProcessing', '所有重要加工环节均在美国完成', 'All significant processing occurs in the US', 'unknown'),
      check('domesticContent', '有证据支持全部或几乎全部零件及原材料为美国来源', 'Evidence supports all or virtually all US components and ingredients', 'unknown'),
      check('qualifier', '拟用限定用语能具体说明经过核实的美国部分', 'Any qualified wording specifies the verified US part', 'no'),
    ],
    run: v => {
      let step;
      if (v.unqualified === 'unknown') step = pair('先明确文案属于哪一类原产地声明', 'Identify the type of origin claim first');
      else if (v.unqualified === 'yes') step = present([v.usAssembly, v.usProcessing, v.domesticContent])
        ? pair('将无保留声明与完整证据交复核', 'Send the unqualified claim and evidence for review')
        : pair('暂停使用无保留声明并升级文案复核', 'Hold the unqualified claim for copy review');
      else step = v.qualifier === 'yes' ? pair('复核限定用语和经证实的事实', 'Review the qualified wording and substantiated facts')
        : pair('补充声明所指的具体已证实美国部分', 'Identify the specific, substantiated US part');
      return [row('文案下一步', 'Next copy-review step', step)];
    },
  },
  {
    id: 'us-uflpa-chain-traceability',
    zh: '美国 UFLPA 供应链溯源缺口',
    en: 'US UFLPA supply-chain traceability gaps',
    purpose: pair('量化已取得证据的供应环节，并核对投入品与本票货物的一致性。', 'Measure documented supply-chain stages and review evidence linking inputs to the shipment.'),
    scope: pair('用于向美国进口商准备溯源交接。环节数量由本批次的原料、加工及物流图确定，海关要求和证明标准按 CBP 指引核对。', 'For preparing evidence for the US importer. Count nodes from the shipment’s raw-material, processing and shipping map and review CBP evidentiary requirements.'),
    source: ['美国海关 CBP 强迫劳动执法进口商操作指引发布说明', 'US CBP Forced Labor Enforcement Operational Guidance for Importers notice', 'https://content.govdelivery.com/accounts/USDHSCBP/bulletins/41bbeed'],
    inputs: [
      ['nodes', 'integer', '该批次已映射的来源及加工节点数', 'Mapped sourcing and production nodes', 6],
      ['documented', 'integer', '能提供连续凭证的节点数', 'Nodes with traceable supporting records', 4],
      check('lotLink', '投入品、生产批次和货件编号能够互相追溯', 'Input, production lot and shipment references reconcile', 'unknown'),
      check('origin', '生产地或原料产地发现需升级复核的疑点', 'Production or material origin raises a concern', 'no'),
    ],
    run: v => {
      positive(v.nodes);
      if (v.documented > v.nodes) throw new RangeError('documented_exceeds_nodes');
      return [
        row('缺少连续凭证的节点', 'Nodes without continuous evidence', v.nodes - v.documented),
        row('有连续证据的节点（%）', 'Nodes with evidence (%)', rounded(v.documented / v.nodes * 100)),
        row('提交前复核', 'Review before filing', v.origin !== 'no'
          ? pair('先升级复核来源疑点', 'Escalate concerns about origin')
          : v.documented < v.nodes || v.lotLink !== 'yes' ? pair('补齐证据链和货件匹配记录', 'Complete the evidence chain and shipment matching')
            : pair('由美国进口商复核凭证和适用要求', 'Have the US importer review the evidence and requirements')),
      ];
    },
  },
  {
    id: 'cites-permit-handoff',
    zh: 'CITES 物种贸易许可材料复核',
    en: 'CITES species trade permit handoff',
    purpose: pair('按标本学名、现行附录、来源和进出口文件准备许可复核。', 'Prepare species identity, appendix, provenance and permit evidence for review.'),
    scope: pair('适用于疑似含动物或植物标本的跨境货件。实际义务由物种、附录、标本来源和进出口国规则共同确定。', 'For shipments that may contain animal or plant specimens. Obligations depend on species, appendix, provenance and the countries’ rules.'),
    source: ['CITES 公约秘书处许可制度说明', 'CITES Secretariat explanation of the permit system', 'https://cites.org/eng/disc/how.php'],
    inputs: [
      check('taxonomy', '已用学名确认标本或成分的物种', 'Scientific name confirms the species present'),
      check('listed', '最新适用 CITES 附录列有该标本', 'Specimen is covered by a current CITES appendix', 'unknown'),
      check('provenance', '已记录取得来源、人工繁殖或其他适用信息', 'Source and applicable breeding or acquisition evidence documented'),
      check('export', '已核查适用的出口或再出口文件', 'Applicable export or re-export documents verified', 'no'),
      check('import', '已核查目的地所需的进口许可或其他文件', 'Destination import permits or other required documents verified', 'unknown'),
    ],
    run: v => {
      let step;
      if (v.taxonomy !== 'yes' || v.listed === 'unknown') step = pair('先核对学名、部位及附录注释', 'Confirm scientific name, part and appendix annotations');
      else if (v.listed === 'no') step = pair('保留检索依据并核对两国其他规定', 'Retain search evidence and review other national rules');
      else if (!present([v.provenance, v.export, v.import])) step = pair('暂停放行并由两地管理机构复核文件', 'Hold for document review with the relevant national authorities');
      else step = pair('提交逐票标本、来源及许可文件供复核', 'Send specimen, provenance and permit records for shipment-level review');
      return [row('许可复核步骤', 'Permit review step', step)];
    },
  },
  {
    id: 'us-food-prior-notice-buffer',
    zh: '美国 FDA 食品预先通知时点检查',
    en: 'US FDA food Prior Notice timing check',
    purpose: pair('比较拟通知到抵达的提前量与已核实的运输方式要求，并查看确认回执。', 'Compare the planned lead time with the verified transport requirement and check the confirmation receipt.'),
    scope: pair('用于确认适用 FDA Prior Notice 的货件。提前量由用户按 FDA 对运输方式和提交渠道的现行规则输入。', 'For shipments confirmed to require FDA Prior Notice. Enter the minimum for the relevant mode and filing channel from current FDA guidance.'),
    source: ['美国 FDA 进口食品预先通知指引', 'US FDA Prior Notice of Imported Foods guidance', 'https://www.fda.gov/industry/fda-import-process/prior-notice-imported-foods'],
    inputs: [
      number('requiredHours', '已向 FDA 核实的最低提前量（小时）', 'Minimum lead time verified against FDA guidance (hours)', 4),
      number('plannedHours', '拟通知到预计抵达的间隔（小时）', 'Planned time between notification and arrival (hours)', 5.5),
      check('receipt', '已收到适用批次的预先通知确认', 'Prior Notice confirmation received for the shipment', 'no'),
    ],
    run: v => {
      const time = v.plannedHours - v.requiredHours;
      return [
        row('按输入计算的时间余量（小时）', 'Lead-time buffer from entered values (hours)', rounded(time)),
        row('时间复核', 'Timing review', time < 0
          ? pair('少于输入的最低提前量，重新安排', 'Reschedule to meet the entered minimum')
          : pair('比对确认时间和运输变更', 'Check actual confirmation time and routing changes')),
        row('确认回执', 'Confirmation status', v.receipt === 'yes'
          ? pair('归档该批次确认和编号', 'Archive the shipment confirmation and its reference')
          : pair('需要获取实际确认后再交接', 'Obtain actual confirmation before handoff')),
      ];
    },
  },
  {
    id: 'air-lithium-battery-wh',
    zh: '锂电池空运额定瓦时与资料核对',
    en: 'Air cargo lithium battery watt-hours and evidence',
    purpose: pair('从标称电压和毫安时计算额定瓦时，并核对空运支持资料。', 'Convert nominal volts and milliamp-hours to watt-hours and check air-cargo evidence.'),
    scope: pair('适用于以电压和容量标注的可充电锂电芯或电池组。包装、荷电状态和承运条件依适用分类、说明及航司规则另行核对。', 'For rechargeable cells or batteries labelled with voltage and capacity. Review packing, state of charge and carrier conditions under the applicable classification and instructions.'),
    source: ['国际航空运输协会电池运输指引', 'International Air Transport Association battery shipping guidance', 'https://www.iata.org/en/programs/cargo/dangerous-goods/lithium-batteries/'],
    inputs: [
      number('voltage', '单个电芯或电池组标称电压（伏）', 'Nominal voltage of one cell or battery pack (V)', 11.1),
      number('capacity', '同一电芯或电池组标称容量（mAh）', 'Nominal capacity of the same cell or pack (mAh)', 5200),
      check('summary', '已有适用的 UN 38.3 测试摘要', 'Applicable UN 38.3 test summary available', 'no'),
      check('carrier', '已向承运方核查分类、包装、标记及条件', 'Classification, packing, marks and conditions reviewed with carrier', 'unknown'),
    ],
    run: v => [
      row('单个电芯或电池组（Wh）', 'Watt-hours per cell or pack (Wh)', rounded(positive(v.voltage) * positive(v.capacity) / 1000, 4)),
      row('测试摘要', 'Test summary', v.summary === 'yes'
        ? pair('留存对应型号的摘要', 'Retain the matching model’s summary')
        : pair('补齐适用型号的测试摘要', 'Obtain the applicable model’s test summary')),
      row('运输接收条件', 'Transport acceptance', v.carrier === 'yes'
        ? pair('交危险品运输负责人复核', 'Send to the dangerous-goods reviewer')
        : pair('按电池和设备配置核实承运条件', 'Verify carrier conditions for the battery and equipment configuration')),
    ],
  },
];
