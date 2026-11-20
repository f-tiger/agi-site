// Deterministic bounded calculators shared by the collector workflows.
const triple = (en, de, zh) => ({en,de,zh});
const whole = (minimum=0, maximum=100000000) => ({type:'integer',minimum,maximum});
const text = (maxLength=1600) => ({type:'string',maxLength});
const days = whole(0,730);
const mm = whole(1,1000000);
const gap = whole(0,1000000);
const money = whole();
const count = whole(1,10000);
const ratios = whole(0,10000);
const date = {type:'string',minLength:10,maxLength:10};
const rule = (category, title, explanation, inputs, sample, run) =>
  ({category,title,explanation,inputs,sample,run});
const times = value => Math.round(value * 1000) / 1000;

function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>'2099-12-31')
    throw new RangeError('A date must be YYYY-MM-DD between 1900 and 2099.');
  const t = Date.parse(value+'T00:00:00.000Z');
  if (!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==value)
    throw new RangeError('A calendar date was not valid.');
  return t;
}
const DAY = 86400000;
const utc = timestamp => new Date(timestamp).toISOString().slice(0,10);
function lines(value, max=100) {
  const split = value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if (split.length>max || split.some(x=>x.length>160))
    throw new RangeError(`At most ${max} nonempty lines of no more than 160 characters are allowed.`);
  return split;
}
function tally(value) {
  const counts=new Map();
  for (const id of lines(value)) counts.set(id,(counts.get(id)??0)+1);
  return counts;
}
function groupedRows(value, columns) {
  return lines(value,80).map((line,index)=>{
    const fields=line.split('|').map(x=>x.trim());
    if(fields.length!==columns || fields.some(x=>!x))
      throw new RangeError(`Line ${index+1} must have ${columns} nonempty fields separated by |.`);
    return fields;
  });
}
const idOrder=(a,b)=>a<b?-1:a>b?1:0;

export const WORKFLOW_KERNELS = {
  row: rule('display',triple('Calculate row spacing','Reihenabstand berechnen','计算单排间距'),
    triple('Compute usable row width, whole-item capacity and remaining clearance from measurements.',
      'Nutzbreite, Anzahl ganzer Plätze und verbleibenden Abstand anhand der Maße berechnen。',
      '按实测数据计算单排可用宽度、能容纳的整数件数及剩余间隙。'),
    {insideWidthMm:mm,itemWidthMm:mm,itemGapMm:gap},
    {insideWidthMm:600,itemWidthMm:82,itemGapMm:8},(a,reserved)=>{
      const usableWidthMm=Math.max(0,a.insideWidthMm-reserved);
      const slots=Math.floor((usableWidthMm+a.itemGapMm)/(a.itemWidthMm+a.itemGapMm));
      const occupiedWidthMm=slots*a.itemWidthMm+Math.max(0,slots-1)*a.itemGapMm;
      return {usableWidthMm,slots,occupiedWidthMm,remainingWidthMm:usableWidthMm-occupiedWidthMm,method:'One straight row with the measured width and uniform gaps.'};
    }),
  height: rule('storage',triple('Check vertical clearance','Höhenfreiraum prüfen','核对纵向净空'),
    triple('Compare measured opening height with the item, the stand or base and the working clearance.',
      'Öffnungshöhe, Objekt, Sockel und Arbeitsfreiraum vergleichen。',
      '比较实测开口高度、物件和底座高度，以及操作所需净空。'),
    {openingHeightMm:mm,itemHeightMm:mm,baseHeightMm:gap},
    {openingHeightMm:350,itemHeightMm:244,baseHeightMm:16},(a,clearance)=>{
      const requiredHeightMm=a.itemHeightMm+a.baseHeightMm+clearance;
      const clearanceMarginMm=a.openingHeightMm-requiredHeightMm;
      return {requiredHeightMm,clearanceMarginMm,passesMeasuredHeight:clearanceMarginMm>=0,method:'Vertical dimensions only; take measurements at the narrowest point.'};
    }),
  entry: rule('display',triple('Check straight-in case fit','Einschub und Innenmaß prüfen','核对直线入柜与内尺寸'),
    triple('Compare the entry and case interior in both allowed horizontal orientations.',
      'Öffnung und Innenmaß in den beiden zulässigen waagerechten Ausrichtungen prüfen。',
      '核对两种允许的水平朝向能否通过开口并进入柜体。'),
    {doorWidthMm:mm,doorHeightMm:mm,insideWidthMm:mm,insideDepthMm:mm,insideHeightMm:mm,itemWidthMm:mm,itemDepthMm:mm,itemHeightMm:mm,allowsTurn:{type:'boolean'}},
    {doorWidthMm:360,doorHeightMm:330,insideWidthMm:410,insideDepthMm:270,insideHeightMm:370,itemWidthMm:300,itemDepthMm:242,itemHeightMm:295,allowsTurn:true},(a,margin)=>{
      const orientations=[{rotationDegrees:0,widthMm:a.itemWidthMm,depthMm:a.itemDepthMm}];
      if(a.allowsTurn) orientations.push({rotationDegrees:90,widthMm:a.itemDepthMm,depthMm:a.itemWidthMm});
      for (const row of orientations) {
        row.openingMarginMm=Math.min(a.doorWidthMm-row.widthMm,a.doorHeightMm-a.itemHeightMm)-margin;
        row.interiorMarginMm=Math.min(a.insideWidthMm-row.widthMm,a.insideDepthMm-row.depthMm,a.insideHeightMm-a.itemHeightMm)-margin;
        row.passes=row.openingMarginMm>=0&&row.interiorMarginMm>=0;
      }
      return {passesAnyOrientation:orientations.some(x=>x.passes),orientations,method:'Rigid axis-aligned bounds. No tilting, turn-in-place or handle clearance is assumed.'};
    }),
  sightline: rule('display',triple('Estimate the rear riser','Höhe der hinteren Stufe schätzen','估算后排垫高'),
    triple('Project a straight line from eye height to a rear detail past the front silhouette.',
      'Gerade vom Auge zum hinteren Detail an der vorderen Silhouette vorbei projizieren。',
      '计算从视点到后排特征的直线能否避开前排遮挡。'),
    {eyeHeightMm:gap,frontDistanceMm:mm,backDistanceMm:mm,frontTopMm:mm,rearFeatureMm:gap},
    {eyeHeightMm:420,frontDistanceMm:660,backDistanceMm:860,frontTopMm:165,rearFeatureMm:98},(a,margin)=>{
      if (a.backDistanceMm<=a.frontDistanceMm) throw new RangeError('Back distance must exceed front distance.');
      const requiredFeatureMm=a.eyeHeightMm+(a.frontTopMm+margin-a.eyeHeightMm)*a.backDistanceMm/a.frontDistanceMm;
      return {minimumRiserMm:Math.max(0,Math.ceil(requiredFeatureMm-a.rearFeatureMm)),requiredFeatureMm:times(requiredFeatureMm),method:'One vertical sightline and one sample eye position. Confirm physical measurements from the intended viewpoint.'};
    }),
  load: rule('display',triple('Compare measured shelf load','Gemessene Regallast vergleichen','比较实测层板载荷'),
    triple('Sum the item mass, supports and named extra load against a rating supplied by the user.',
      'Objektmasse, Träger und benannte Zusatzmasse mit der angegebenen Nennlast vergleichen。',
      '把物件、支撑物和指定额外质量相加，与用户提供的额定载荷比较。'),
    {itemCount:count,massPerItemG:money,standMassG:money,ratingG:money},
    {itemCount:6,massPerItemG:320,standMassG:540,ratingG:3500},(a,extra)=>{
      const totalMassG=a.itemCount*a.massPerItemG+a.standMassG+extra;
      const statedRatingMarginG=a.ratingG-totalMassG;
      return {totalMassG,statedRatingMarginG,withinStatedMass:statedRatingMarginG>=0,method:'Arithmetic comparison against the supplied rating. Installation, concentrated loads and stability require their own checks.'};
    }),
  cartons: rule('transport',triple('Plan packing carton quantities','Anzahl der Kartons planen','规划打包箱数量'),
    triple('Calculate identical-item grid capacity and cartons needed with a reserved slot allowance.',
      'Rasterkapazität und benötigte Kartons mit reservierten Plätzen berechnen。',
      '按同尺寸物件的排布与预留格位计算所需箱数。'),
    {insideLengthMm:mm,insideWidthMm:mm,insideHeightMm:mm,packedLengthMm:mm,packedWidthMm:mm,packedHeightMm:mm,itemsToPack:count},
    {insideLengthMm:500,insideWidthMm:400,insideHeightMm:300,packedLengthMm:120,packedWidthMm:100,packedHeightMm:140,itemsToPack:28},(a,reserve)=>{
      const gridCapacity=Math.floor(a.insideLengthMm/a.packedLengthMm)*Math.floor(a.insideWidthMm/a.packedWidthMm)*Math.floor(a.insideHeightMm/a.packedHeightMm);
      const usableSlots=Math.max(0,gridCapacity-reserve);
      return {gridCapacity,usableSlots,cartonsNeeded:usableSlots?Math.ceil(a.itemsToPack/usableSlots):null,method:'Straight identical rectangular packing using already-protected dimensions, one declared orientation.'};
    }),
  sheets: rule('storage',triple('Estimate sheet supply','Benötigte Bögen schätzen','估算片材用量'),
    triple('Count rectangular pieces per sheet and reserve extra pieces before rounding up.',
      'Rechteckige Zuschnitte je Bogen zählen, Reserve ergänzen und auf ganze Bögen runden。',
      '按每张片材可排出的矩形件数计入备用件，再向上取整。'),
    {sheetWidthMm:mm,sheetLengthMm:mm,pieceWidthMm:mm,pieceLengthMm:mm,piecesNeeded:count,cutSpacingMm:gap},
    {sheetWidthMm:500,sheetLengthMm:700,pieceWidthMm:180,pieceLengthMm:240,piecesNeeded:12,cutSpacingMm:4},(a,reserve)=>{
      const grid=(w,l)=>Math.floor((a.sheetWidthMm+a.cutSpacingMm)/(w+a.cutSpacingMm))*Math.floor((a.sheetLengthMm+a.cutSpacingMm)/(l+a.cutSpacingMm));
      const piecesPerSheet=Math.max(grid(a.pieceWidthMm,a.pieceLengthMm),grid(a.pieceLengthMm,a.pieceWidthMm));
      return {piecesPerSheet,totalPieces:a.piecesNeeded+reserve,sheetsNeeded:piecesPerSheet?Math.ceil((a.piecesNeeded+reserve)/piecesPerSheet):null,method:'Alternately orient all pieces as one rectangular grid; pattern direction and mixed orientations are excluded.'};
    }),
  review: rule('care',triple('Calculate the review date','Prüftermin berechnen','计算复查日期'),
    triple('Add a schedule supplied by you to a known review date and compare it with your as-of date.',
      'Den selbst gewählten Rhythmus zum letzten Termin addieren und mit dem Stichtag vergleichen。',
      '把自行设定的复查间隔加到已知日期，再与核查基准日比较。'),
    {lastReviewDate:date,asOfDate:date},
    {lastReviewDate:'2026-01-03',asOfDate:'2026-01-20'},(a,interval)=>{
      const last=dateValue(a.lastReviewDate),asOf=dateValue(a.asOfDate);
      if(asOf<last)throw new RangeError('The as-of date precedes the last review.');
      const next=last+interval*DAY;
      return {reviewDueOn:utc(next),daysToReview:(next-asOf)/DAY,reviewDue:asOf>=next,method:'Elapsed UTC calendar days using your own interval; no schedule is inferred for the material.'};
    }),
  stock: rule('inventory',triple('Reconcile item counts','Stückzahlen abgleichen','核对物件数量'),
    triple('Compare two bounded lists on exact line IDs and show shortages, extras and repeat scans.',
      'Zwei begrenzte Listen nach exakten Zeilen-IDs vergleichen und Fehl-, Mehr- und Mehrfacherfassungen zeigen。',
      '按逐行精确编号比较两份有界清单，列出短缺、额外与重复扫描。'),
    {expectedIds:text(),countedIds:text()},
    {expectedIds:'A010\nA011\nA012',countedIds:'A010\nA011\nA011'},(a,tolerance)=>{
      const before=tally(a.expectedIds),after=tally(a.countedIds);
      const ids=[...new Set([...before.keys(),...after.keys()])].sort(idOrder);
      const differences=ids.flatMap(id=>{
        const expected=before.get(id)??0,counted=after.get(id)??0;
        return expected===counted?[]:[{id,expected,counted,delta:counted-expected}];
      });
      return {differences,shortfall:differences.reduce((n,x)=>n+Math.max(0,-x.delta),0),extra:differences.reduce((n,x)=>n+Math.max(0,x.delta),0),
        exceedsReviewTolerance:differences.some(x=>Math.abs(x.delta)>tolerance),
        repeatedCountedIds:[...after].filter(([,n])=>n>1).map(([id])=>id).sort(idOrder),method:'Each nonempty line is one explicit observation. Repeats remain visible.'};
    }),
  depletion: rule('inventory',triple('Estimate remaining supplies','Restbestand an Verbrauchsmitteln schätzen','估算耗材剩余'),
    triple('Use counted stock, units per task and reserved supplies to calculate throughput and shortfall.',
      'Mit gezähltem Bestand, Verbrauch je Aufgabe und Reserven Reichweite und Fehlmenge berechnen。',
      '按盘点库存、单次用量与备用量计算可完成次数及缺口。'),
    {unitsOnHand:money,unitsPerTask:count,tasksPlanned:count},
    {unitsOnHand:48,unitsPerTask:3,tasksPlanned:20},(a,reserve)=>{
      const available=Math.max(0,a.unitsOnHand-reserve);
      return {availableAfterReserve:available,tasksCovered:Math.floor(available/a.unitsPerTask),unitsToReplenish:Math.max(0,a.tasksPlanned*a.unitsPerTask+reserve-a.unitsOnHand),method:'Whole supply units and one user-entered consumption rate.'};
    }),
  index: rule('documents',triple('Build an archive index','Archivindex erstellen','创建归档索引'),
    triple('Sort explicit ID and folder pairs and separate duplicate IDs and entries missing from the expected set.',
      'Explizite ID- und Ordnerpaare sortieren sowie doppelte und in der Soll-Liste fehlende IDs ausweisen。',
      '整理明确提供的编号与文件夹，并列出重复编号和未完成的预期项。'),
    {recordPairs:text(2600)},
    {recordPairs:'A010 | front\nA011 | labels'},(a,expected)=>{
      const pairs=groupedRows(a.recordPairs,2).map(([id,folder])=>({id,folder}));
      pairs.sort((a,b)=>idOrder(a.id,b.id)||idOrder(a.folder,b.folder));
      const seen=new Map();
      for(const x of pairs)seen.set(x.id,(seen.get(x.id)??0)+1);
      const expectedIds=new Set(lines(expected));
      return {records:pairs,missingIds:[...expectedIds].filter(x=>!seen.has(x)).sort(idOrder),duplicatedIds:[...seen].filter(([,n])=>n>1).map(([id])=>id),method:'Index supplied metadata only. No files or folders are accessed.'};
    }),
  units: rule('shopping',triple('Compare unit offers','Angebote je Einheit vergleichen','比较单件价格'),
    triple('Compare delivered prices in one currency using matching quantity units and an explicit adjustment.',
      'Gelieferte Preise einer Währung mit passenden Mengeneinheiten und einem ausdrücklichen Aufschlag vergleichen。',
      '在同一币种下，按一致的数量单位和明确附加费比较到手单价。'),
    {offerACents:money,offerAQuantity:count,offerBCents:money,offerBQuantity:count},
    {offerACents:2350,offerAQuantity:6,offerBCents:3100,offerBQuantity:8},(a,extra)=>{
      const b=a.offerBCents+extra;
      const comparison=a.offerACents*a.offerBQuantity-b*a.offerAQuantity;
      return {offerAUnitCents:times(a.offerACents/a.offerAQuantity),offerBUnitCents:times(b/a.offerBQuantity),lowerCostOffer:comparison<0?'A':comparison>0?'B':'tie',method:'Exact price ordering by cross-multiplication. All costs and quantities must use the same currency and unit.'};
    }),
  landed: rule('budget',triple('Add up landed cost','Gesamtkosten ermitteln','计算到手总成本'),
    triple('Add specified circulation costs and subtract the confirmed discount.',
      'Angegebene Bezugskosten addieren und den bestätigten Rabatt abziehen。',
      '汇总明确的交付成本并扣除已确认的折扣。'),
    {unitPriceCents:money,quantity:count,shippingCents:money,confirmedDiscountCents:money},
    {unitPriceCents:1420,quantity:3,shippingCents:650,confirmedDiscountCents:500},(a,extra)=>{
      const itemSubtotalCents=a.unitPriceCents*a.quantity;
      const deliveredCents=itemSubtotalCents+a.shippingCents+extra-a.confirmedDiscountCents;
      if(deliveredCents<0)throw new RangeError('Discount exceeds the specified total.');
      return {itemSubtotalCents,deliveredCents,perUnitCents:times(deliveredCents/a.quantity),method:'One currency, integer cents; any taxes or fees included here must be supplied by the caller.'};
    }),
  budget: rule('budget',triple('Check remaining purchase budget','Restliches Kaufbudget prüfen','核对剩余采购预算'),
    triple('Reserve the named cost, subtract commitments, then calculate whole affordable units.',
      'Benannte Kosten reservieren, Verpflichtungen abziehen und finanzierbare ganze Einheiten berechnen。',
      '预留指定成本并扣除已承诺开支，再算可负担的整数件数。'),
    {budgetCents:money,committedCents:money,costPerUnitCents:whole(1)},
    {budgetCents:15800,committedCents:4900,costPerUnitCents:1250},(a,reserve)=>{
      const unallocatedCents=a.budgetCents-a.committedCents-reserve;
      return {unallocatedCents,affordableUnits:Math.floor(Math.max(0,unallocatedCents)/a.costPerUnitCents),overcommittedCents:Math.max(0,-unallocatedCents),method:'Works with a single capped budget and the specified all-in unit cost.'};
    }),
  breakeven: rule('budget',triple('Calculate a break-even price','Mindestpreis zum Kostenausgleich berechnen','计算盈亏平衡价格'),
    triple('Find the lowest gross amount covering declared costs after fixed and proportional fees.',
      'Den kleinsten Bruttobetrag nach festen und prozentualen Gebühren ermitteln, der die angegebenen Kosten deckt。',
      '计算扣除固定费和比例费后足以覆盖已输入成本的最低毛额。'),
    {originalCostCents:money,fixedFeeCents:money,variableFeeBasisPoints:whole(0,9999)},
    {originalCostCents:3200,fixedFeeCents:35,variableFeeBasisPoints:800},(a,extra)=>{
      const required=a.originalCostCents+a.fixedFeeCents+extra;
      const gross=Math.ceil(required*10000/(10000-a.variableFeeBasisPoints));
      const variableFeeCents=Math.ceil(gross*a.variableFeeBasisPoints/10000);
      return {minimumGrossCents:gross,variableFeeCents,netAfterFeesAndExtraCents:gross-variableFeeCents-a.fixedFeeCents-extra,method:'Variable fee rounds upward to the nearest cent. Actual platform and tax rules are external.'};
    }),
  threshold: rule('shopping',triple('Compare a shipping threshold','Versandgrenze vergleichen','比较运费门槛'),
    triple('Compare your cart and the cart after adding a needed item under a quoted shipping rule.',
      'Warenkorb mit und ohne benötigten Zusatzartikel nach der angegebenen Versandregel vergleichen。',
      '按提供的运费规则对比当前购物车与加入一件所需商品后的成本。'),
    {cartCents:money,shippingThresholdCents:money,belowThresholdShippingCents:money,atThresholdShippingCents:money},
    {cartCents:3820,shippingThresholdCents:4500,belowThresholdShippingCents:650,atThresholdShippingCents:0},(a,extra)=>{
      const cost=x=>x+(x>=a.shippingThresholdCents?a.atThresholdShippingCents:a.belowThresholdShippingCents);
      const baselineCents=cost(a.cartCents),withItemCents=cost(a.cartCents+extra);
      return {baselineCents,withItemCents,additionalCents:withItemCents-baselineCents,qualifiesWithItem:a.cartCents+extra>=a.shippingThresholdCents,method:'Uses the provided shipping amounts on each side of the threshold and one nominated item.'};
    }),
  quotes: rule('comparison',triple('Compare two all-in quotes','Zwei Gesamtangebote vergleichen','比较两份全包报价'),
    triple('Add each recurring cost over your chosen comparison period to the one-time quote.',
      'Laufende Kosten über den gewählten Zeitraum zu jedem einmaligen Angebot addieren。',
      '按选定比较期累加两份报价中的经常费用，并与一次性价格合并。'),
    {offerAUpfrontCents:money,offerBUpfrontCents:money,offerAMonthlyCents:money,offerBMonthlyCents:money},
    {offerAUpfrontCents:4900,offerBUpfrontCents:7400,offerAMonthlyCents:380,offerBMonthlyCents:170},(a,months)=>{
      const offerATotalCents=a.offerAUpfrontCents+a.offerAMonthlyCents*months,offerBTotalCents=a.offerBUpfrontCents+a.offerBMonthlyCents*months;
      return {offerATotalCents,offerBTotalCents,differenceCents:offerBTotalCents-offerATotalCents,lowerCostOffer:offerATotalCents===offerBTotalCents?'tie':offerATotalCents<offerBTotalCents?'A':'B',method:'Constant quoted monthly costs, one currency and the same comparison period.'};
    }),
  billing: rule('transport',triple('Estimate billable parcel weight','Abrechnungsgewicht schätzen','计算包裹计费重量'),
    triple('Compare actual weight and dimensional weight under your quoted divisor and rounding increment.',
      'Tatsächliche und volumetrische Masse mit dem angegebenen Divisor und Rundungsmaß vergleichen。',
      '按报价给出的除数和取整单位比较实重与体积重量。'),
    {outerLengthCm:whole(1,1000),outerWidthCm:whole(1,1000),outerHeightCm:whole(1,1000),grossMassG:money,divisorCm3PerKg:whole(1,1000000)},
    {outerLengthCm:40,outerWidthCm:30,outerHeightCm:25,grossMassG:2400,divisorCm3PerKg:5000},(a,quantum)=>{
      const cube=a.outerLengthCm*a.outerWidthCm*a.outerHeightCm*1000;
      const dimensionalMassG=cube/a.divisorCm3PerKg;
      const increments=Math.max(Math.ceil(a.grossMassG/quantum),Math.ceil(cube/(a.divisorCm3PerKg*quantum)));
      return {dimensionalMassG:times(dimensionalMassG),billableMassG:increments*quantum,method:'Compares user-entered physical mass with rounded dimensional mass. Carrier rules and surcharges are separate.'};
    }),
  scan: rule('transport',triple('Compare three handoff scans','Drei Übergabe-Scans vergleichen','核对三阶段交接扫描'),
    triple('Match planned, departure and arrival IDs, then report units absent at each handoff.',
      'Plan-, Abgangs- und Ankunfts-IDs vergleichen und Fehlmengen je Übergabe melden。',
      '对照计划、出发和到达编号，列出每一交接点缺少的单位。'),
    {plannedIds:text(),departureIds:text()},
    {plannedIds:'A001\nA002\nA003',departureIds:'A001\nA002'},(a,arrived)=>{
      const plan=tally(a.plannedIds),departed=tally(a.departureIds),arrival=tally(arrived);
      const ids=[...new Set([...plan.keys(),...departed.keys(),...arrival.keys()])].sort(idOrder);
      return {observations:ids.map(id=>{
        const planned=plan.get(id)??0,departure=departed.get(id)??0,arrived=arrival.get(id)??0;
        return {id,planned,departure,arrived,departureShortfall:Math.max(0,planned-departure),arrivalShortfall:Math.max(0,departure-arrived),unplannedArrival:Math.max(0,arrived-planned)};
      }),method:'Comparison of exact user-supplied scan records only. It does not identify the cause of a discrepancy.'};
    }),
  checklist: rule('inventory',triple('Check preflight readiness','Vorbereitung prüfen','核对准备状态'),
    triple('Read explicit ready, pending and blocked entries and identify required items missing from the checklist.',
      'Erledigte, offene und blockierte Einträge prüfen und fehlende Pflichtpunkte der Liste ausweisen。',
      '读取明确标记的已准备、待办、受阻项目，并列出清单中缺失的必需项。'),
    {statusRows:text(2600)},
    {statusRows:'A010 | ready\nA011 | pending\nA012 | blocked'},(a,required)=>{
      const statuses=new Map();
      for (const [id,status] of groupedRows(a.statusRows,2)){
        if (!['ready','pending','blocked'].includes(status)||statuses.has(id))throw new RangeError('Use each ID once and one status: ready, pending or blocked.');
        statuses.set(id,status);
      }
      const missing=[...new Set(lines(required))].sort(idOrder).flatMap(id=>statuses.get(id)==='ready'?[]:[{id,status:statuses.get(id)??'missing'}]);
      return {requiredItemsCleared:missing.length===0,notReady:missing,readyCount:[...statuses.values()].filter(v=>v==='ready').length,method:'Compares statuses you supplied against your explicit required lines.'};
    }),
};

export const WORKFLOW_EXTRA = {number: whole(),days:whole(1,730),months:whole(1,120),increment:whole(1,1000000),lines:text(2600),tolerance:whole(0,100)};
