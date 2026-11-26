const sources = {
  dimensions: ['赫伯罗特集装箱规格', 'Hapag-Lloyd container specifications', 'https://static-cf.hapag-lloyd.com/content/dam/website/downloads/local_info/HPL-CONTAINER_SPECIFICATION.pdf'],
  express: ['DHL 计费重量说明', 'DHL weight guidance', 'https://dct.dhl.com/help'],
  lcl: ['马士基海运拼箱条款', 'Maersk less-than-container-load terms', 'https://terms.maersk.com/LCL'],
  cutoff: ['马士基订舱资料提交说明', 'Maersk shipping instruction cutoffs', 'https://www.maersk.com/fr-fr/insights/digitalisation/2024/11/27/spot-documents-faqs'],
  tracking: ['马士基货物跟踪说明', 'Maersk shipment tracking', 'https://www.maersk.com/support/faqs/how-to-track-shipments'],
  freeTime: ['马士基集装箱免用期说明', 'Maersk container free time guidance', 'https://www.maersk.com/support/faqs/container-free-time'],
  detention: ['马士基滞箱与滞期条款', 'Maersk detention and demurrage terms', 'https://terms.maersk.com/dnd'],
  doors: ['赫伯罗特标准箱门洞尺寸', 'Hapag-Lloyd standard container door dimensions', 'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/20-standard.html'],
  reefer: ['赫伯罗特冷藏箱装载指南', 'Hapag-Lloyd reefer cargo handling guidance', 'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/reefer/cargo-handling.html'],
  fuel: ['DHL 快递燃油附加费计费范围', 'DHL Express fuel-surcharge basis', 'https://www.dhl.com/gb-en/home/express/products-and-solutions/products-and-services-overview/surcharges/fuel-surcharge.html'],
  cif: ['国际商会国际贸易术语海运规则', 'ICC Incoterms 2020 rules for sea transport', 'https://library.iccwbo.org/content/tfb/BOOKS/BK_0049/BK_0049_05_RulesSea.htm?AGENT=ICC_HQ'],
  insurance: ['英国商业信息服务运输风险与保险指南', 'Northern Ireland business guidance on goods transport risk', 'https://www.nibusinessinfo.co.uk/content/managing-risk-goods-transport'],
  documents: ['美国国际贸易管理局出口单据指南', 'U.S. International Trade Administration export documents guide', 'https://www.trade.gov/common-export-documents'],
  credit: ['国际商会 UCP 600 跟单信用证规则', 'ICC UCP 600 documentary credit rules', 'https://library.iccwbo.org/content/tfb/RULES/tfb-ucp600-rules.htm?AGENT=ICC_HQ'],
};

const dayMs = 86400000;
const output = (zh, en, value) => [zh, en, value];
const daysBetween = (start, end) => (Date.parse(end) - Date.parse(start)) / dayMs;

function requireInputs(condition) {
  if (!condition) throw new RangeError('invalid_inputs');
}

function addDays(date, count) {
  const result = new Date(Date.parse(date) + count * dayMs).toISOString().slice(0, 10);
  requireInputs(/^\d{4}-\d{2}-\d{2}$/.test(result));
  return result;
}

function money(value) {
  const scaled = Math.abs(value) * 100;
  const floor = Math.floor(scaled);
  const roundingTolerance = Math.min(1e-6, scaled * Number.EPSILON * 2);
  const cents = Math.abs(scaled - floor - 0.5) <= roundingTolerance ? floor + 1 : Math.round(scaled);
  requireInputs(Number.isSafeInteger(cents));
  return Math.sign(value) * cents / 100 || 0;
}

function gridCapacity(length, width, itemLength, itemWidth) {
  const rows = Math.floor(length / itemLength) * Math.floor(width / itemWidth);
  const turned = Math.floor(length / itemWidth) * Math.floor(width / itemLength);
  const capacity = Math.max(rows, turned);
  requireInputs(Number.isSafeInteger(capacity));
  return capacity;
}

export default [
  {
    id: 'carton-cubic-volume', zh: '纸箱总体积计算器', en: 'Carton Cubic Volume Calculator',
    purpose: ['由外箱尺寸和箱数计算每箱体积及整批材积，便于填运费询价。', 'Calculate carton and shipment cubic volume for a freight enquiry.'],
    scope: ['适用于同一箱规的长方体外箱，使用包装后的外尺寸。拼箱拼托后的实际占位以承运人复测为准。', 'For identical rectangular cartons, using packed outer dimensions. The carrier may remeasure consolidated or palletized cargo.'],
    source: sources.lcl,
    inputs: [
      ['length', 'number', '外箱长（厘米）', 'Carton outer length (cm)', 60],
      ['width', 'number', '外箱宽（厘米）', 'Carton outer width (cm)', 40],
      ['height', 'number', '外箱高（厘米）', 'Carton outer height (cm)', 35],
      ['cartons', 'integer', '同箱规箱数', 'Identical cartons', 24],
    ],
    run: ({length, width, height, cartons}) => {
      requireInputs(length > 0 && width > 0 && height > 0 && cartons > 0);
      const volume = length * width * height / 1e6;
      return [output('单箱体积（立方米）', 'Volume per carton (m³)', volume), output('整批体积（立方米）', 'Shipment volume (m³)', volume * cartons)];
    },
  },
  {
    id: 'pallet-layer-capacity', zh: '托盘每层可放箱数', en: 'Pallet Layer Capacity Planner',
    purpose: ['比较整层箱体转向前后的占位，得到每层与整托的计划装箱量。', 'Compare two carton orientations to plan cartons per layer and per pallet.'],
    scope: ['同层按单一方向整齐摆放，每边扣同样的安全距离。实际堆叠层数、承重和稳定性由包装方案确认。', 'Uses a single orientation per layer and equal clearance on every edge. Confirm stack height, load limit and stability with your packing plan.'],
    source: sources.dimensions,
    inputs: [
      ['length', 'number', '托盘长（厘米）', 'Pallet length (cm)', 120],
      ['width', 'number', '托盘宽（厘米）', 'Pallet width (cm)', 100],
      ['cartonLength', 'number', '箱长（厘米）', 'Carton length (cm)', 48],
      ['cartonWidth', 'number', '箱宽（厘米）', 'Carton width (cm)', 38],
      ['gap', 'number', '每边预留（厘米）', 'Clearance per edge (cm)', 2],
      ['layers', 'integer', '已批准的叠放层数', 'Approved stacking layers', 4],
    ],
    run: ({length, width, cartonLength, cartonWidth, gap, layers}) => {
      requireInputs(length > gap * 2 && width > gap * 2 && cartonLength > 0 && cartonWidth > 0 && layers > 0);
      const perLayer = gridCapacity(length - gap * 2, width - gap * 2, cartonLength, cartonWidth);
      const perPallet = perLayer * layers;
      requireInputs(Number.isSafeInteger(perPallet));
      return [output('每层箱数', 'Cartons per layer', perLayer), output('每托计划箱数', 'Planned cartons per pallet', perPallet)];
    },
  },
  {
    id: 'container-floor-loading', zh: '集装箱地板装托估算', en: 'Container Floor Loading Estimate',
    purpose: ['对照集装箱底面与可用载荷，找出单层托盘装载的限制因素。', 'Find whether floor space or payload limits a single-layer pallet plan.'],
    scope: ['输入实际箱体的可用长宽及批准货物载荷。整层同向摆放，另核实箱门、限重、重量分布和系固。', 'Enter usable internal dimensions and approved cargo payload for the actual equipment. Uses a single orientation, with door access, weight distribution and securing checked separately.'],
    source: sources.dimensions,
    inputs: [
      ['floorLength', 'number', '可用内长（厘米）', 'Usable inside length (cm)', 589],
      ['floorWidth', 'number', '可用内宽（厘米）', 'Usable inside width (cm)', 235],
      ['palletLength', 'number', '装货后托盘长（厘米）', 'Loaded pallet length (cm)', 120],
      ['palletWidth', 'number', '装货后托盘宽（厘米）', 'Loaded pallet width (cm)', 100],
      ['payload', 'number', '批准货物载荷（公斤）', 'Approved cargo payload (kg)', 25000],
      ['palletWeight', 'number', '每托总重（公斤）', 'Gross weight per pallet (kg)', 1200],
    ],
    run: ({floorLength, floorWidth, palletLength, palletWidth, payload, palletWeight}) => {
      requireInputs(floorLength > 0 && floorWidth > 0 && palletLength > 0 && palletWidth > 0 && palletWeight > 0);
      const floor = gridCapacity(floorLength, floorWidth, palletLength, palletWidth);
      const weight = Math.floor(payload / palletWeight);
      requireInputs(Number.isSafeInteger(weight));
      return [output('按面积可放托数', 'Pallets allowed by floor area', floor), output('按重量可放托数', 'Pallets allowed by payload', weight), output('两项约束内计划托数', 'Planned pallets within both limits', Math.min(floor, weight))];
    },
  },
  {
    id: 'express-dimensional-weight', zh: '国际快递体积重计算器', en: 'Express Dimensional Weight Calculator',
    purpose: ['比较单件快递的实重与体积重，并按所填档位向上取整。', 'Compare actual and dimensional weight and round to the selected billing increment for one parcel.'],
    scope: ['厘米和公斤口径。样例采用 DHL 常见体积除数，实际除数与进位档位以对应服务报价为准。', 'Uses centimetres and kilograms. The example uses a common DHL divisor, while the quote for the selected service governs divisor and rounding.'],
    source: sources.express,
    inputs: [
      ['length', 'number', '包装长（厘米）', 'Packed length (cm)', 62],
      ['width', 'number', '包装宽（厘米）', 'Packed width (cm)', 40],
      ['height', 'number', '包装高（厘米）', 'Packed height (cm)', 35],
      ['actual', 'number', '单件实重（公斤）', 'Actual weight (kg)', 12],
      ['divisor', 'number', '报价中的体积除数', 'Dimensional divisor in the quote', 5000],
      ['step', 'number', '计费进位档位（公斤）', 'Billing increment (kg)', 0.5],
    ],
    run: ({length, width, height, actual, divisor, step}) => {
      requireInputs(length > 0 && width > 0 && height > 0 && actual > 0 && divisor > 0 && step > 0);
      const dimensional = length * width * height / divisor;
      const billing = Math.max(dimensional, actual) / step;
      const rounded = Math.round(billing);
      const increments = Math.abs(billing - rounded) <= Number.EPSILON * Math.max(1, billing) * 4 && rounded > 0 ? rounded : Math.ceil(billing);
      requireInputs(Number.isSafeInteger(increments));
      return [output('体积重（公斤）', 'Dimensional weight (kg)', dimensional), output('估算计费重（公斤）', 'Estimated billed weight (kg)', increments * step)];
    },
  },
  {
    id: 'lcl-weight-measure-freight', zh: '海运拼箱计费吨与运费', en: 'LCL Weight-or-Measure Freight',
    purpose: ['比较货物体积、毛重与最低计费标准，估算海运拼箱基本运费。', 'Estimate base LCL freight using the greater of volume, gross weight and the quoted minimum.'],
    scope: ['只适用承运人约定 1 立方米等于 1 公吨的 W/M 报价。附加费、港杂费和税费另计。', 'For W/M quotes where one cubic metre equals one metric tonne. Add any surcharges, terminal fees and taxes separately.'],
    source: sources.lcl,
    inputs: [
      ['volume', 'number', '货物体积（立方米）', 'Gross volume (m³)', 3.2],
      ['gross', 'number', '货物毛重（公斤）', 'Gross weight (kg)', 4500],
      ['minimum', 'number', '报价最低计费吨', 'Quoted minimum revenue tonnes', 1],
      ['rate', 'number', '每计费吨单价（同一币种）', 'Rate per revenue tonne (one currency)', 460],
    ],
    run: ({volume, gross, minimum, rate}) => {
      requireInputs(volume > 0 && gross > 0);
      const chargeable = Math.max(volume, gross / 1000, minimum);
      return [output('计费吨', 'Revenue tonnes', chargeable), output('基本运费（报价币种）', 'Base freight (quote currency)', money(chargeable * rate))];
    },
  },
  {
    id: 'shipping-cutoff-calendar', zh: '海运截单截港倒计时', en: 'Ocean Shipping Cutoff Calendar',
    purpose: ['把订舱资料、核实总重和进港三个已知截止日放在一起，标记最先到期的日期。', 'Bring shipping instructions, verified weight and gate-in cutoffs together and identify the earliest date.'],
    scope: ['从同一票货的订舱确认单抄入港口当地日期。负数表示已经过日，到期当天按承运人时刻执行。', 'Use local port dates from the same booking. Negative values mean the cutoff date has passed. Confirm the carrier’s clock time on the day.'],
    source: sources.cutoff,
    inputs: [
      ['today', 'date', '港口当地核对日期', 'Local port review date', '2026-10-05'],
      ['instructions', 'date', '截单日', 'Shipping instructions cutoff date', '2026-10-07'],
      ['vgm', 'date', '核实总重提交截止日', 'Verified gross mass cutoff date', '2026-10-08'],
      ['gate', 'date', '集装箱进港截止日', 'Container gate-in cutoff date', '2026-10-09'],
    ],
    run: ({today, instructions, vgm, gate}) => [
      output('最早截止日', 'Earliest cutoff date', [instructions, vgm, gate].sort()[0]),
      output('距截单（天）', 'Days until shipping instructions cutoff', daysBetween(today, instructions)),
      output('距核实总重截止（天）', 'Days until VGM cutoff', daysBetween(today, vgm)),
      output('距进港截止（天）', 'Days until gate-in cutoff', daysBetween(today, gate)),
    ],
  },
  {
    id: 'door-to-door-transit-calendar', zh: '海运到港及送仓日期估算', en: 'Ocean Port and Door Arrival Estimate',
    purpose: ['把海上、中转、清关和末端配送的预计天数转换成到港和送仓日期。', 'Turn sailing, transshipment, clearance and final delivery allowances into port and warehouse dates.'],
    scope: ['按日历天顺延。海上航行与中转等候须分别填写，承运人实际动态及仓库预约另外核实。', 'Adds calendar days. Enter sailing and transshipment waiting separately and check carrier updates and warehouse availability.'],
    source: sources.tracking,
    inputs: [
      ['departure', 'date', '计划开船日', 'Planned sailing date', '2026-10-10'],
      ['sailing', 'integer', '航行天数', 'Sailing days', 27],
      ['transship', 'integer', '中转等候天数', 'Transshipment waiting days', 3],
      ['clearance', 'integer', '目的港放行预算天数', 'Destination release allowance (days)', 4],
      ['delivery', 'integer', '提货及送仓天数', 'Pickup and delivery days', 2],
      ['buffer', 'integer', '其他缓冲天数', 'Additional buffer days', 2],
    ],
    run: ({departure, sailing, transship, clearance, delivery, buffer}) => {
      const portDays = sailing + transship;
      const totalDays = portDays + clearance + delivery + buffer;
      return [output('预计到港日期', 'Estimated port arrival', addDays(departure, portDays)), output('计划送仓日期', 'Planned warehouse delivery', addDays(departure, totalDays)), output('全程预算天数', 'End-to-end allowance (days)', totalDays)];
    },
  },
  {
    id: 'container-return-free-time', zh: '集装箱免用期返空检查', en: 'Container Return Free Time Check',
    purpose: ['把承运人给出的最后免用日和返空计划直接核对，计算余量或逾期日数。', 'Compare the carrier’s stated last free day with a planned empty return and calculate the date margin.'],
    scope: ['两项日期均以同一票、同一港口时区为准。差值按日历日，计费日历及节假日按对应承运人条款。', 'Use the same shipment and port time zone for both dates. The result is a calendar-day difference, with chargeable days and holidays determined by the applicable carrier terms.'],
    source: sources.freeTime,
    inputs: [
      ['lastFree', 'date', '承运人显示的最后免用日', 'Last free day shown by the carrier', '2026-10-15'],
      ['returned', 'date', '预计或实际还空日', 'Planned or actual empty return date', '2026-10-18'],
    ],
    run: ({lastFree, returned}) => {
      const difference = daysBetween(lastFree, returned);
      return [output('剩余日历天数', 'Calendar days remaining', Math.max(0, -difference)), output('超过免用日的日历天数', 'Calendar days past the last free day', Math.max(0, difference)), output('核对结果', 'Date check', difference > 0 ? ['还空日已超过免用期', 'Return date is past free time'] : ['还空日处于输入的免用期内', 'Return date falls within the entered free time'])];
    },
  },
  {
    id: 'tiered-container-detention', zh: '两档滞箱费估算', en: 'Two-Tier Container Detention Estimate',
    purpose: ['使用已确认的计费天数和两档日费，拆出每档滞箱费用。', 'Break down detention fees into two daily rate tiers using a confirmed number of chargeable days.'],
    scope: ['仅处理同费率、同计费天数的柜。输入承运人确定的计费日，运输条款中的港内外合并或分拆另核。', 'Applies to containers with identical rates and chargeable days. Use carrier-confirmed billable days and check whether detention and demurrage are combined.'],
    source: sources.detention,
    inputs: [
      ['days', 'integer', '核对后的计费日数', 'Confirmed chargeable days', 8],
      ['firstDays', 'integer', '第一档覆盖日数', 'First-tier days', 4],
      ['firstRate', 'number', '第一档每日每柜（同一币种）', 'First-tier daily rate per container (one currency)', 350],
      ['secondRate', 'number', '第二档每日每柜（同一币种）', 'Second-tier daily rate per container (one currency)', 720],
      ['containers', 'integer', '条件相同的柜数', 'Containers under identical terms', 2],
    ],
    run: ({days, firstDays, firstRate, secondRate, containers}) => {
      requireInputs(containers > 0);
      const first = Math.min(days, firstDays) * firstRate * containers;
      const second = Math.max(0, days - firstDays) * secondRate * containers;
      return [output('第一档费用', 'First-tier fees', money(first)), output('第二档费用', 'Second-tier fees', money(second)), output('预计滞箱费合计', 'Estimated total detention fees', money(first + second))];
    },
  },
  {
    id: 'container-door-clearance', zh: '集装箱门洞尺寸余量检查', en: 'Container Door Clearance Check',
    purpose: ['用箱门实际净宽净高检查托货或设备能否在约定姿态下留出过门余量。', 'Use the measured door opening to check side and overhead clearance for a load in its planned orientation.'],
    scope: ['按货物含包装、托盘和托举设备的最大外廓填写，预留值为总量。以实箱复测及装卸方案为准。', 'Enter the largest envelope including packing, pallet and lifting gear. Clearances are totals. Verify equipment measurements and the handling plan.'],
    source: sources.doors,
    inputs: [
      ['doorWidth', 'number', '门洞净宽（厘米）', 'Measured door width (cm)', 234],
      ['doorHeight', 'number', '门洞净高（厘米）', 'Measured door height (cm)', 229],
      ['loadWidth', 'number', '装卸姿态下总宽（厘米）', 'Load width in handling position (cm)', 210],
      ['loadHeight', 'number', '装卸姿态下总高（厘米）', 'Load height in handling position (cm)', 225],
      ['horizontal', 'number', '总横向预留（厘米）', 'Total horizontal allowance (cm)', 8],
      ['vertical', 'number', '总垂直预留（厘米）', 'Total vertical allowance (cm)', 6],
    ],
    run: ({doorWidth, doorHeight, loadWidth, loadHeight, horizontal, vertical}) => {
      requireInputs(doorWidth > 0 && doorHeight > 0 && loadWidth > 0 && loadHeight > 0);
      const widthMargin = doorWidth - loadWidth - horizontal;
      const heightMargin = doorHeight - loadHeight - vertical;
      const status = widthMargin >= 0 && heightMargin >= 0 ? ['所填尺寸满足预留要求', 'Entered dimensions meet the allowances'] : ['尺寸余量不足，调整装卸方案', 'Insufficient clearance. Review the handling plan.'];
      return [output('扣除预留后的横向余量（厘米）', 'Width margin after allowance (cm)', widthMargin), output('扣除预留后的垂直余量（厘米）', 'Height margin after allowance (cm)', heightMargin), output('门洞尺寸核对', 'Door clearance check', status)];
    },
  },
  {
    id: 'shared-freight-line-allocation', zh: '混装货物运费分摊', en: 'Consolidated Freight Line Allocation',
    purpose: ['按同一计费口径把共享运费分摊给一个货品行，并加上专属处理费。', 'Allocate shared freight to one item line on a common basis and add its direct handling cost.'],
    scope: ['分子和分母采用同一单位，如公斤或立方米，币种一致。货物行分摊的四舍五入尾差由财务统一调整。', 'Use the same unit for line and shipment basis, such as kilograms or cubic metres, and one currency. Reconcile rounding residuals across lines separately.'],
    source: sources.lcl,
    inputs: [
      ['shipmentCost', 'number', '整票可分摊运费', 'Total shared shipment freight', 13500],
      ['shipmentBasis', 'number', '整票分摊基数', 'Total shipment allocation basis', 750],
      ['lineBasis', 'number', '本货品行分摊基数', 'Item line allocation basis', 90],
      ['directCost', 'number', '本货品行专属处理费', 'Direct handling cost for this line', 150],
    ],
    run: ({shipmentCost, shipmentBasis, lineBasis, directCost}) => {
      requireInputs(shipmentBasis > 0 && lineBasis <= shipmentBasis);
      const share = lineBasis / shipmentBasis;
      const allocated = shipmentCost * share;
      return [output('本行分摊比例（%）', 'Line allocation share (%)', share * 100), output('本行分摊运费', 'Allocated line freight', money(allocated)), output('本行物流费用', 'Line logistics total', money(allocated + directCost))];
    },
  },
  {
    id: 'cif-cargo-insurance-value', zh: 'CIF 货运险保险金额估算', en: 'CIF Cargo Insurance Value Estimate',
    purpose: ['按 CIF 合同价格和保额比例准备投保金额及基础保费预算。', 'Use the CIF contract price and coverage ratio to prepare the declared insured value and base premium budget.'],
    scope: ['海运或内河 CIF 口径。按合同币种输入，样例保额比例为 110%。险别、实际费率与最低收费按保单确认。', 'For sea or inland waterway CIF. Use the contract currency and replace the example 110% coverage ratio as required. Confirm clauses, actual rate and minimum premium with the insurer.'],
    source: sources.cif,
    inputs: [
      ['contract', 'number', 'CIF 合同金额（合同币种）', 'CIF contract price (contract currency)', 30000],
      ['coverage', 'number', '保额占合同价比例（%）', 'Insured value as share of contract price (%)', 110],
      ['rate', 'percent', '报价中的保费率（%）', 'Quoted premium rate (%)', 0.35],
    ],
    run: ({contract, coverage, rate}) => {
      requireInputs(contract > 0 && coverage > 0);
      const insured = contract * coverage / 100;
      return [output('计划保险金额（合同币种）', 'Planned insured value (contract currency)', money(insured)), output('预计基础保费（合同币种）', 'Estimated base premium (contract currency)', money(insured * rate / 100))];
    },
  },
  {
    id: 'cargo-loss-deductible-scenario', zh: '货损免赔额与自留损失估算', en: 'Cargo Loss and Deductible Scenario',
    purpose: ['区分货损、除外损失、免赔额与赔付限额，估算保单条款下的自留损失。', 'Separate cargo loss, exclusions, deductible and limit to estimate the loss retained under a policy scenario.'],
    scope: ['按先剔除除外损失、再扣固定免赔额、最后套赔付限额的场景估算。同一币种，理赔依据保险人核定。', 'Models exclusions first, then a flat deductible, then an indemnity cap. Use one currency and confirm the actual insurer’s claim assessment.'],
    source: sources.insurance,
    inputs: [
      ['loss', 'number', '货损总额', 'Total cargo loss', 18000],
      ['excluded', 'number', '预计除外损失', 'Estimated excluded loss', 3000],
      ['deductible', 'number', '固定免赔额', 'Flat deductible', 1500],
      ['limit', 'number', '本项赔付限额', 'Indemnity limit for this loss', 11000],
    ],
    run: ({loss, excluded, deductible, limit}) => {
      requireInputs(excluded <= loss);
      const eligible = loss - excluded;
      const recovery = Math.min(limit, Math.max(0, eligible - deductible));
      return [output('预计可纳入的损失', 'Estimated eligible loss', money(eligible)), output('估算赔付', 'Estimated indemnity', money(recovery)), output('估算自留损失', 'Estimated retained loss', money(loss - recovery))];
    },
  },
  {
    id: 'carrier-fuel-surcharge-check', zh: '物流燃油附加费账单复核', en: 'Carrier Fuel Surcharge Invoice Check',
    purpose: ['按报价约定的适用费用和燃油比例重算账单附加费，找到收费差额。', 'Recompute the surcharge using the agreed fuel percentage and eligible charges to find any invoice difference.'],
    scope: ['仅纳入承运人规定计提燃油附加费的费用，币种一致，税费另计。使用对应服务、市场和发运期间适用的比例。', 'Include only charges the carrier classifies as fuel-surcharge eligible. Use one currency and a rate for the relevant service, market and shipping period. Taxes are separate.'],
    source: sources.fuel,
    inputs: [
      ['base', 'number', '净运输费（账单币种）', 'Net transport charge (invoice currency)', 1350],
      ['eligible', 'number', '同样计提的其他服务费', 'Additional eligible charges', 150],
      ['rate', 'percent', '本期适用燃油比例（%）', 'Applicable fuel surcharge rate (%)', 28],
      ['stated', 'number', '账单列明的燃油附加费', 'Invoiced fuel surcharge', 435],
    ],
    run: ({base, eligible, rate, stated}) => {
      const basis = base + eligible;
      const expected = money(basis * rate / 100);
      return [output('燃油费计费基数', 'Fuel surcharge basis', money(basis)), output('重算燃油附加费', 'Recalculated fuel surcharge', expected), output('账单减重算差额', 'Invoice less recalculated', money(money(stated) - expected))];
    },
  },
  {
    id: 'reefer-load-line-height', zh: '冷藏集装箱装载线高度检查', en: 'Reefer Load-Line Height Check',
    purpose: ['根据实箱装载线、托盘和箱高，提前检查计划层数与顶部余量。', 'Check carton layer count and overhead clearance against the actual reefer load line before loading.'],
    scope: ['使用承运人实箱装载线及其要求的额外余量，结果只涉及垂直高度。一起确认承重、气流、地板与温控要求。', 'Use the load line on the actual equipment and any additional carrier allowance. This checks vertical height. Verify load, airflow, flooring and temperature requirements separately.'],
    source: sources.reefer,
    inputs: [
      ['loadLine', 'number', '地板至装载线（厘米）', 'Floor to load line (cm)', 233],
      ['pallet', 'number', '托盘及底部垫料高度（厘米）', 'Pallet and base padding height (cm)', 14],
      ['carton', 'number', '每层外箱实际高度（厘米）', 'Actual carton height per layer (cm)', 37],
      ['reserve', 'number', '装载线下另外预留（厘米）', 'Extra allowance below load line (cm)', 5],
      ['layers', 'integer', '计划层数', 'Planned layers', 6],
    ],
    run: ({loadLine, pallet, carton, reserve, layers}) => {
      requireInputs(loadLine > 0 && carton > 0 && layers > 0);
      const maximumLayers = Math.max(0, Math.floor((loadLine - reserve - pallet) / carton));
      requireInputs(Number.isSafeInteger(maximumLayers));
      const height = pallet + carton * layers;
      const margin = loadLine - reserve - height;
      return [output('按高度可装的最多层数', 'Maximum layers by height', maximumLayers), output('计划装载高度（厘米）', 'Planned load height (cm)', height), output('剩余高度（厘米）', 'Remaining height (cm)', margin)];
    },
  },
  {
    id: 'packing-gross-net-weight-check', zh: '装箱单毛重净重差异检查', en: 'Packing List Gross and Net Weight Check',
    purpose: ['从净重和包装重重算毛重，判断填报差额是否超出内部核对容差。', 'Recompute gross weight from net goods and packing and check the difference against your review tolerance.'],
    scope: ['输入同一货品或包装批次的公斤数，包装重含该批次的外箱和托盘。容差为内控输入，非监管指标。', 'Use kilograms for the same item or packing batch and include cartons and pallets in packing weight. Enter a tolerance set by your own document control team.'],
    source: sources.documents,
    inputs: [
      ['net', 'number', '货物净重（公斤）', 'Net goods weight (kg)', 1400],
      ['packing', 'number', '外箱和托盘重（公斤）', 'Cartons and pallets (kg)', 118],
      ['stated', 'number', '装箱单填写毛重（公斤）', 'Stated packing list gross weight (kg)', 1522],
      ['tolerance', 'number', '内部核对容差（公斤）', 'Internal review tolerance (kg)', 2],
    ],
    run: ({net, packing, stated, tolerance}) => {
      const gross = net + packing;
      const difference = stated - gross;
      return [output('重算毛重（公斤）', 'Recalculated gross weight (kg)', gross), output('填写毛重减重算毛重（公斤）', 'Stated less recalculated (kg)', difference), output('差异核对结果', 'Difference check', Math.abs(difference) <= tolerance ? ['差额在输入的容差内', 'Difference is within the entered tolerance'] : ['差额超限，复核称重及填报', 'Difference exceeds tolerance. Recheck weighing and entry.'])];
    },
  },
  {
    id: 'lc-presentation-date-check', zh: '信用证交单期限核对', en: 'Letter of Credit Presentation Date Check',
    purpose: ['并列比较装船后交单期、信用证到期日和计划交单日，定位最早截止。', 'Compare the post-shipment presentation period, credit expiry and planned presentation date to identify the earlier deadline.'],
    scope: ['交单天数按当前信用证和适用规则填入。按日历日估算，银行营业日、地点和修证由银行核实。', 'Enter the presentation period from the current credit and applicable rules. Uses calendar days, with banking closures, place of presentation and amendments checked separately.'],
    source: sources.credit,
    inputs: [
      ['shipment', 'date', '运输单据装运日', 'Shipment date on transport document', '2026-10-09'],
      ['period', 'integer', '适用的交单期（天）', 'Applicable presentation period (days)', 14],
      ['expiry', 'date', '信用证到期日', 'Credit expiry date', '2026-10-20'],
      ['planned', 'date', '计划向银行交单日', 'Planned bank presentation date', '2026-10-21'],
    ],
    run: ({shipment, period, expiry, planned}) => {
      const postShipment = addDays(shipment, period);
      const deadline = [postShipment, expiry].sort()[0];
      const margin = daysBetween(planned, deadline);
      const status = planned < shipment ? ['计划早于装运日，复核日期', 'Plan precedes shipment. Verify the dates.'] : margin < 0 ? ['计划交单日超过截止日', 'Planned presentation is after the deadline'] : ['计划日期在交单窗口内', 'Planned date falls within the entered window'];
      return [output('按装运日起算的截止日', 'Deadline based on shipment date', postShipment), output('两项中较早截止日', 'Earlier of both deadlines', deadline), output('日期核对结果', 'Date check', status)];
    },
  },
  {
    id: 'lc-available-drawing-balance', zh: '信用证本次支款额复核', en: 'Letter of Credit Drawing Balance Check',
    purpose: ['汇总前次和在途支款，估算新交单的可用余额和超额。', 'Account for prior and pending drawings to estimate remaining credit and any excess on the next presentation.'],
    scope: ['同一信用证币种，额度采用银行已确认的有效总额。在途与已支款分别填，部分支款与自动容差须按具体信用证确认。', 'Use one credit currency and the effective total confirmed by the bank. Keep pending and completed drawings separate. Verify partial drawing permission and tolerance against the actual credit.'],
    source: sources.credit,
    inputs: [
      ['limit', 'number', '银行核对后的有效总额', 'Bank-confirmed effective total', 80000],
      ['drawn', 'number', '已占用的历史支款额', 'Prior drawings already used', 44000],
      ['pending', 'number', '未计入历史的在途支款额', 'Pending drawings excluded from prior draws', 12000],
      ['proposed', 'number', '拟提交的本次支款额', 'Proposed new drawing', 28000],
    ],
    run: ({limit, drawn, pending, proposed}) => {
      const before = limit - drawn - pending;
      return [output('本次前余额', 'Balance before this drawing', money(before)), output('本次后余额', 'Balance after this drawing', money(before - proposed)), output('合计超额', 'Total excess over credit', money(Math.max(0, proposed - before)))];
    },
  },
  {
    id: 'invoice-packing-reference-match', zh: '发票与装箱单单号对照', en: 'Invoice and Packing List Reference Cross-Check',
    purpose: ['逐项对照发票和装箱单的采购订单号及出货参考号，减少找错批次的风险。', 'Check purchase order and shipment references across invoices and packing lists to avoid matching the wrong batch.'],
    scope: ['同一合同要求两份单据填写相同参考号时使用。逐字符比较，符号和大小写不同会提示复核。', 'Use where both documents are expected to share the same references. Compares characters exactly and flags differences in punctuation and case.'],
    source: sources.documents,
    inputs: [
      ['invoiceOrder', 'text', '发票采购订单号', 'Invoice purchase order reference', 'PO-8421'],
      ['packingOrder', 'text', '装箱单采购订单号', 'Packing list purchase order reference', 'PO-8421'],
      ['invoiceShipment', 'text', '发票出货参考号', 'Invoice shipment reference', 'SHIP-07'],
      ['packingShipment', 'text', '装箱单出货参考号', 'Packing list shipment reference', 'SHIP-08'],
    ],
    run: ({invoiceOrder, packingOrder, invoiceShipment, packingShipment}) => {
      const status = (invoice, packing) => invoice && packing && invoice === packing ? ['参考号一致', 'References match'] : ['补齐或核对参考号', 'Complete or review the references'];
      return [output('采购订单号核对', 'Purchase order reference check', status(invoiceOrder, packingOrder)), output('出货参考号核对', 'Shipment reference check', status(invoiceShipment, packingShipment))];
    },
  },
  {
    id: 'order-shipment-fill-rate', zh: '外贸订单发运与签收达成率', en: 'Order Shipment and Acceptance Fill Rate',
    purpose: ['从订单、发运和已签收合格数量分别计算履约进度，找出需补货及未验收部分。', 'Measure fulfillment from ordered, dispatched and accepted units and identify replenishment and acceptance gaps.'],
    scope: ['同一订单行，统一单位。使用累计数据，验收数量不超过已发装运数量，超发也会单独显示。', 'Use cumulative amounts for one order line in a single unit. Accepted quantity cannot exceed dispatches, and any over-shipment is shown separately.'],
    source: sources.documents,
    inputs: [
      ['ordered', 'number', '采购订单数量', 'Purchase order quantity', 1200],
      ['dispatched', 'number', '已发运数量', 'Dispatched quantity', 1140],
      ['accepted', 'number', '已验收合格数量', 'Accepted quantity', 1100],
    ],
    run: ({ordered, dispatched, accepted}) => {
      requireInputs(ordered > 0 && accepted <= dispatched);
      return [output('已发运达成率（%）', 'Dispatch fill rate (%)', dispatched / ordered * 100), output('已验收达成率（%）', 'Acceptance fill rate (%)', accepted / ordered * 100), output('未发余量', 'Undispatched balance', Math.max(0, ordered - dispatched)), output('已发未验收合格数量', 'Dispatched and not yet accepted', dispatched - accepted), output('超订单发运数量', 'Dispatch above order quantity', Math.max(0, dispatched - ordered))];
    },
  },
];
