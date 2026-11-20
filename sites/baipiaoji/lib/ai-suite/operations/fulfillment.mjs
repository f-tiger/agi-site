import { number as n, count as c, percent as p, divide, subset, requireThat, toolBuilder } from './core.mjs';
const make = toolBuilder({
  length: n('包裹长（厘米）', 'Parcel length (cm)', 60, 0.01),
  width: n('宽（厘米）', 'Width (cm)', 40, 0.01),
  height: n('高（厘米）', 'Height (cm)', 30, 0.01),
  divisor: n('承运商体积系数（立方厘米/公斤）', 'Carrier divisor (cm³/kg)', 5000, 0.01),
  weight: n('实际重量（公斤）', 'Scale weight (kg)', 10),
  step: n('计费重量进位（公斤）', 'Weight billing increment (kg)', 0.5, 0.001),
  units: c('需发运件数', 'Units to ship', 230),
  available: c('本地可发件数', 'Local available units', 180),
  backup: c('异地仓可发件数', 'Secondary warehouse units', 45),
  palletL: n('托盘长（厘米）', 'Pallet length (cm)', 120, 0.01),
  palletW: n('托盘宽（厘米）', 'Pallet width (cm)', 100, 0.01),
  stack: n('可用堆货高度（厘米）', 'Allowed cargo stack height (cm)', 150, 0.01),
  trucks: c('到达车辆', 'Arriving trucks', 25),
  unload: n('每车平均卸货分钟', 'Unload minutes per truck', 36),
  shift: n('每班可作业分钟', 'Available minutes per shift', 420, 0.01),
  docks: c('可用月台数', 'Active dock doors', 3, 1),
  picks: c('本波次需拣货行数', 'Pick lines in wave', 900),
  pace: n('每人每小时拣货行数', 'Lines picked per person-hour', 48, 0.01),
  hours: n('波次可用小时', 'Hours available for wave', 4, 0.01),
  stops: c('一条路线停靠点', 'Stops per route', 50),
  stopMin: n('每个停靠点平均分钟', 'Average minutes at each stop', 4),
  km: n('行驶里程（公里）', 'Driving distance (km)', 120),
  speed: n('平均车速（公里/小时）', 'Average driving speed (km/h)', 40, 0.01),
  capacity: c('每箱最大件数', 'Maximum units per carton', 18, 1),
  base: n('基础运费', 'Base freight', 180),
  fuel: p('燃油附加比例', 'Fuel surcharge on base freight', 12),
  residential: n('住宅附加费', 'Residential surcharge', 8),
  area: n('偏远地区附加费', 'Remote-area fee', 15),
  shipments: c('发货包裹数', 'Packages dispatched', 500),
  fail: p('首次派送失败率', 'First-attempt failure rate', 8),
  retryCost: n('重新派送单价', 'Cost of redelivery per package', 6),
  returnRate: p('重派仍失败比例', 'Share of retries returned', 15),
  returnCost: n('退回发件地费用/件', 'Cost per return to sender', 12),
  restored: p('翻新后可售比例', 'Expected recoverable share', 70),
  resale: n('翻新净售价/件', 'Net resale proceeds per recovered unit', 22),
  repair: n('每个退件翻新成本', 'Refurbishment cost per returned unit', 6),
  salvage: n('直接处置净收入/件', 'Net immediate salvage per unit', 5),
  planned: n('计划生产分钟', 'Planned production minutes', 480, 0.01),
  run: n('实际运行分钟', 'Actual running minutes', 420, 0.01),
  ideal: n('理想单件周期（分钟）', 'Ideal cycle minutes per unit', 0.5, 0.00001),
  total: c('生产总数', 'Units produced', 720, 1),
  good: c('合格件数', 'Accepted good units', 690),
  a: p('工序一首检通过率', 'Stage one first-pass yield', 95),
  b: p('工序二首检通过率', 'Stage two first-pass yield', 97),
  d: p('工序三首检通过率', 'Stage three first-pass yield', 98),
  demand: c('班次需求件数', 'Required units per shift', 350, 1),
  throughput: n('平均每小时完成件数', 'Average throughput units per hour', 45, 0.01),
  wip: n('平均在制件数', 'Average work in process units', 90),
  stationA: n('前工位每小时产能', 'Upstream station units per hour', 65, 0.01),
  stationB: n('后工位每小时产能', 'Downstream station units per hour', 50, 0.01),
  scrap: c('直接报废件数', 'Units scrapped', 12),
  rework: c('需返工件数', 'Units requiring rework', 40),
  wasteCost: n('报废单位净损失', 'Net loss per scrapped unit', 18),
  reworkCost: n('返工单件成本', 'Cost per reworked unit', 5),
  dwell: n('实际占用小时', 'Actual dwell hours', 62),
  free: n('免收小时', 'Free time allowance in hours', 48),
  perDay: n('每开始一天的费用', 'Fee per started day', 95),
  po: c('订单批准件数', 'Purchase order quantity', 200),
  receipt: c('已验收件数', 'Accepted receipt quantity', 180),
  billed: c('发票件数', 'Invoiced quantity', 190),
  agreed: n('订单单位价格', 'Agreed unit price', 15),
  invoiced: n('发票单位价格', 'Invoiced unit price', 15.5),
  aWeight: n('甲批次重量（公斤）', 'Shipment A weight (kg)', 24),
  bWeight: n('乙批次重量（公斤）', 'Shipment B weight (kg)', 36),
  orders: c('订单总数', 'Total orders', 200, 1),
  late: c('迟交订单', 'Orders delivered late', 18),
  short: c('未足额订单', 'Orders not delivered in full', 12),
  both: c('既迟交又未足额的订单', 'Orders both late and short', 5),
});
export default [
  make(
    'carrier-billable-weight',
    '承运商计费重量',
    'Carrier Billable Weight',
    '按指定体积系数比较体积重与实重，再进位到承运商计费步长。',
    'Compare dimensional and scale weight using the carrier divisor, then round up to its billing increment.',
    'length width height divisor weight step',
    (length, width, height, divisor, weight, step) => {
      const dimensional = (length * width * height) / divisor;
      return { dimensionalKg: dimensional, billableKg: Math.ceil(Math.max(dimensional, weight) / step) * step };
    },
  ),
  make(
    'multi-warehouse-order-split',
    '双仓拆单分配',
    'Two-Warehouse Order Split',
    '优先本地库存，继而分配异地库存，列出仍欠交的数量。',
    'Allocate a shipment to the local warehouse first and the secondary warehouse next, then report unfilled units.',
    'units available backup',
    (units, available, backup) => {
      const local = Math.min(units, available),
        secondary = Math.min(units - local, backup);
      return { local, secondary, backordered: units - local - secondary };
    },
  ),
  make(
    'uniform-pallet-layer-plan',
    '同向整层托盘装箱',
    'Uniform Pallet Layer Plan',
    '比较每层统一摆向的两个方向并按限高算可装箱数。',
    'Compare two uniform carton orientations per layer, without overhang or mixed patterns, and stack within the specified cargo height.',
    'palletL palletW stack length width height',
    (l, w, stack, cl, cw, ch) => {
      const normal = Math.floor(l / cl) * Math.floor(w / cw),
        rotated = Math.floor(l / cw) * Math.floor(w / cl),
        layers = Math.floor(stack / ch);
      return {
        cartonsPerLayer: Math.max(normal, rotated),
        rotateCartons: rotated > normal,
        layers,
        totalCartons: Math.max(normal, rotated) * layers,
      };
    },
  ),
  make(
    'dock-door-shift-load',
    '卸货月台班次负荷',
    'Dock Door Shift Load',
    '用车次和平均卸货时间推算所需月台数及当前月台时间缺口。',
    'Convert inbound truck unload time into required parallel dock doors and excess minutes over available door capacity.',
    'trucks unload shift docks',
    (trucks, minutes, shift, doors) => ({
      requiredDoorMinutes: trucks * minutes,
      doorsNeeded: Math.ceil((trucks * minutes) / shift),
      uncoveredDoorMinutes: Math.max(0, trucks * minutes - shift * doors),
    }),
  ),
  make(
    'pick-wave-staffing',
    '拣货波次排班',
    'Pick Wave Staffing',
    '按波次行数和每人拣货速度规划限时完成所需人数。',
    'Translate a picking wave into labor-hours and the minimum whole pickers needed in the available window.',
    'picks pace hours',
    (lines, pace, hours) => ({ pickLaborHours: lines / pace, pickersRequired: Math.ceil(lines / pace / hours) }),
  ),
  make(
    'courier-route-time-budget',
    '配送路线时间预算',
    'Delivery Route Time Budget',
    '将路上行驶与停靠服务时间合并，并与可用班次比较。',
    'Combine travel time at average driving speed with service time at each stop and compare with the route shift.',
    'km speed stops stopMin shift',
    (km, speed, stops, minutes, shift) => ({
      drivingMinutes: (60 * km) / speed,
      onSiteMinutes: stops * minutes,
      routeMinutes: (60 * km) / speed + stops * minutes,
      shiftHeadroomMinutes: shift - ((60 * km) / speed + stops * minutes),
    }),
  ),
  make(
    'balanced-carton-packout',
    '同款分箱均装',
    'Balanced Carton Packout',
    '满足每箱件数上限的前提下，按最少箱数把件数尽量均分。',
    'Use the fewest cartons within the unit limit and spread identical units as evenly as possible among those cartons.',
    'units capacity',
    (units, capacity) => {
      const cartons = Math.ceil(units / capacity),
        small = cartons ? Math.floor(units / cartons) : 0,
        larger = cartons ? units % cartons : 0;
      return {
        cartons,
        smallerCartons: cartons - larger,
        unitsPerSmallerCarton: small,
        largerCartons: larger,
        unitsPerLargerCarton: larger ? small + 1 : 0,
      };
    },
  ),
  make(
    'freight-surcharge-stack',
    '运费附加项汇总',
    'Freight Surcharge Stack',
    '只按基础运费计燃油附加，再加固定地点附加费。',
    'Apply the fuel percentage only to base freight, then add fixed residential and remote-area charges.',
    'base fuel residential area',
    (base, fuel, residential, area) => ({
      fuelCharge: (base * fuel) / 100,
      fixedSurcharges: residential + area,
      freightInvoice: base * (1 + fuel / 100) + residential + area,
    }),
  ),
  make(
    'failed-delivery-cost',
    '配送失败处置成本',
    'Failed Delivery Cost',
    '预测首次派送失败后产生的重派费用及第二次失败退回费。',
    'Project redelivery costs after first-attempt failures and return-to-sender costs for the share failing again.',
    'shipments fail retryCost returnRate returnCost',
    (shipments, fail, retryCost, returnRate, returnCost) => {
      const retries = (shipments * fail) / 100,
        returns = (retries * returnRate) / 100;
      return {
        expectedRetries: retries,
        expectedReturns: returns,
        incrementalCost: retries * retryCost + returns * returnCost,
      };
    },
  ),
  make(
    'return-disposition-economics',
    '退件翻新或处置比较',
    'Return Disposition Economics',
    '比较直接处置与逐件翻新后售卖的期望净收入，翻新失败按零残值。',
    'Compare immediate salvage with attempting refurbishment on every return, assuming zero recovery on failed refurbishment.',
    'restored resale repair salvage',
    (restored, resale, repair, salvage) => ({
      expectedRefurbishNet: (restored * resale) / 100 - repair,
      immediateSalvageNet: salvage,
      incrementalValue: (restored * resale) / 100 - repair - salvage,
    }),
  ),
  make(
    'overall-equipment-effectiveness',
    '设备综合效率',
    'Overall Equipment Effectiveness',
    '分别计算开动率、速度达成率和良率，再计算 OEE。',
    'Calculate availability, performance and quality from actual runtime, ideal cycle time and accepted output to obtain OEE.',
    'planned run ideal total good',
    (planned, run, ideal, total, good) => {
      subset(run, planned);
      subset(good, total);
      requireThat(ideal * total <= run + 1e-9, 'Ideal output time exceeds measured runtime.');
      return {
        availabilityPercent: (100 * run) / planned,
        performancePercent: (100 * ideal * total) / run,
        qualityPercent: (100 * good) / total,
        oeePercent: (100 * ideal * good) / planned,
      };
    },
  ),
  make(
    'rolled-first-pass-yield',
    '多工序一次通过率',
    'Rolled First-Pass Yield',
    '将三道串行工序的条件首检良率相乘，估算无返工通过的产量。',
    'Multiply conditional first-pass yields across three sequential stages to estimate output passing all stages without rework.',
    'total a b d',
    (total, a, b, d) => ({
      rolledYieldPercent: (a * b * d) / 10000,
      expectedFirstPassUnits: (total * a * b * d) / 1e6,
    }),
  ),
  make(
    'customer-demand-takt',
    '客户需求生产节拍',
    'Customer Demand Takt',
    '用班次净可用生产时间和需求量求每件应有的节拍。',
    'Translate demand per shift and net production minutes into takt seconds per unit and required hourly output.',
    'shift demand',
    (shift, demand) => ({
      taktSecondsPerUnit: (60 * shift) / demand,
      requiredUnitsPerHour: (60 * demand) / shift,
    }),
  ),
  make(
    'little-law-flow-time',
    '在制品平均流动时间',
    'Little’s Law Flow Time',
    '用同一稳定工序的平均在制品与完成速度估算件均流动时间。',
    'Apply Little’s law to average work in process and completion rate over the same stable process boundary.',
    'wip throughput',
    (wip, throughput) => ({ averageFlowHours: wip / throughput, averageFlowMinutes: (60 * wip) / throughput }),
  ),
  make(
    'line-bottleneck-capacity',
    '串行工位瓶颈产能',
    'Serial Station Bottleneck Capacity',
    '比较两串行工位稳定产能，估算满负荷投放时的排队增量。',
    'Compare two serial stations at steady rates and estimate queue accumulation when the upstream station runs at full speed.',
    'stationA stationB hours',
    (a, b, hours) => ({
      bottleneck: a === b ? 'balanced' : a < b ? 'upstream' : 'downstream',
      lineUnitsPerHour: Math.min(a, b),
      queueIncreaseUnits: Math.max(0, a - b) * hours,
    }),
  ),
  make(
    'scrap-rework-loss',
    '报废与返工损失',
    'Scrap and Rework Loss',
    '分开估算直接报废和需返工产品的质量成本。',
    'Value disjoint scrapped and reworked units using net scrap loss and incremental rework cost per unit.',
    'total scrap wasteCost rework reworkCost',
    (total, scrap, loss, rework, cost) => {
      subset(scrap + rework, total);
      return {
        scrapLoss: scrap * loss,
        reworkExpense: rework * cost,
        qualityCostPerProducedUnit: (scrap * loss + rework * cost) / total,
      };
    },
  ),
  make(
    'freight-dwell-demurrage',
    '滞箱超时费用',
    'Freight Dwell Demurrage',
    '超过免费时间后，按每个开始的 24 小时计费。',
    'Deduct the free dwell allowance, then bill each started 24-hour period at the agreed flat daily fee.',
    'dwell free perDay',
    (dwell, free, fee) => {
      const overdue = Math.max(0, dwell - free),
        days = Math.ceil(overdue / 24);
      return { overdueHours: overdue, billedDays: days, demurrageFee: days * fee };
    },
  ),
  make(
    'purchase-three-way-match',
    '采购收货发票三方核对',
    'Purchase Three-Way Match',
    '核对订单、收货与发票的数量及价格；按三者最小数量和约定价计算匹配金额。',
    'Match purchase order, receipt and invoice quantities at the agreed price and identify quantity and unit-price exceptions.',
    'po receipt billed agreed invoiced',
    (ordered, received, billed, agreed, invoiced) => ({
      matchedUnits: Math.min(ordered, received, billed),
      quantityOverVerified: Math.max(0, billed - Math.min(ordered, received)),
      unitPriceDifference: invoiced - agreed,
      matchedAtOrderPrice: Math.min(ordered, received, billed) * agreed,
    }),
  ),
  make(
    'freight-allocation-by-weight',
    '共享运费按重量分摊',
    'Freight Allocation by Weight',
    '将一笔合并运费按两批货物的实际重量比例分配。',
    'Allocate a consolidated freight bill between two shipments in proportion to their measured weights.',
    'base aWeight bWeight',
    (base, a, b) => {
      const first = base * divide(a, a + b);
      return { shipmentACharge: first, shipmentBCharge: base - first, costPerKg: divide(base, a + b) };
    },
  ),
  make(
    'on-time-in-full-orders',
    '订单准时足量交付率',
    'On-Time In-Full Orders',
    '用迟交和缺量订单的交集扣除重叠，算出同时准时且足量的订单。',
    'Deduplicate late and short orders using their overlap to count orders delivered both on time and in full.',
    'orders late short both',
    (orders, late, short, both) => {
      subset(both, Math.min(late, short));
      const failed = subset(late + short - both, orders);
      return {
        failedOrders: failed,
        onTimeInFullOrders: orders - failed,
        otifPercent: (100 * (orders - failed)) / orders,
      };
    },
  ),
];
