import {HOME_PURCHASE_EVIDENCE} from './home-purchase-evidence.mjs';
import {matchesInputSchema} from './input-schema.mjs';

const words = (en,de,zh) => ({en,de,zh});
const field = (titles, schema, sample) => ({titles,schema,sample});
const number = (en,de,zh,sample,min=0,max=100000) => field(words(en,de,zh), {type:'number', minimum:min, maximum:max}, sample);
const integer = (en,de,zh,sample,min=0,max=10000) => field(words(en,de,zh), {type:'integer', minimum:min, maximum:max}, sample);
const text = (en,de,zh,sample,max=240) => field(words(en,de,zh), {type:'string', minLength:1, maxLength:max}, sample);
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const normalize = (text) => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const family = (titles, limits, fields, calculate) => ({titles,limits,fields,calculate});

const length = (en,de,zh,sample) => number(en,de,zh,sample,0.01,100000);
const price = (en,de,zh,sample) => number(en,de,zh,sample,0,1000000);
const duration = (en,de,zh,sample,max=12) => integer(en,de,zh,sample,1,max);
const moneyLimit = words('Enter prices in the same currency. Use the amount that will appear on the order.',
  'Alle Preise in derselben Währung und mit den tatsächlich berechneten Beträgen angeben.',
  '请使用同一种币种，并填写订单实际计费的金额。');
const measurementLimit = words('Use measurements for the exact variant, including required clearances.',
  'Maße für die genaue Variante verwenden und die vorgeschriebenen Abstände berücksichtigen.',
  '请核对该版本的实际尺寸，同时计入要求的预留空间。');
const powerLimit = words('Estimate from measured power or the exact variant’s documentation and your local electricity tariff.',
  'Mit gemessener Leistung oder den Angaben zur genauen Variante sowie dem eigenen Stromtarif rechnen.',
  '请使用实测功率或该版本的资料，并填写当地电价。');
const categoryFamilies = {
  storage: family(
    words('Check storage fit', 'Stauraum prüfen', '核算收纳尺寸'), measurementLimit,
    {
      itemWidthCm:length('Item width (cm)','Breite des Gegenstands (cm)','物品宽度（厘米）',31),
      itemDepthCm:length('Item depth (cm)','Tiefe des Gegenstands (cm)','物品深度（厘米）',19),
      itemHeightCm:length('Item height (cm)','Höhe des Gegenstands (cm)','物品高度（厘米）',8),
      innerWidthCm:length('Usable inner width (cm)','Nutzbare Innenbreite (cm)','可用内宽（厘米）',36),
      innerDepthCm:length('Usable inner depth (cm)','Nutzbare Innentiefe (cm)','可用内深（厘米）',25),
      innerHeightCm:length('Usable inner height (cm)','Nutzbare Innenhöhe (cm)','可用内高（厘米）',13),
      paddingCm:number('Padding on each side (cm)','Polster pro Seite (cm)','每侧衬垫（厘米）',1,0,1000),
    },
    ({itemWidthCm,itemDepthCm,itemHeightCm,innerWidthCm,innerDepthCm,innerHeightCm,paddingCm}) => {
      const widths = [itemWidthCm,itemDepthCm,itemHeightCm].map(value => value+2*paddingCm);
      const remaining = [innerWidthCm,innerDepthCm,innerHeightCm].map((value,i) => value-widths[i]);
      return {fitsMeasuredSpace:remaining.every(value=>value>=-1e-8),
        remainingWidthCm:round(remaining[0]),remainingDepthCm:round(remaining[1]),remainingHeightCm:round(remaining[2])};
    },
  ),
  display: family(
    words('Plan display space','Stellfläche planen','规划展示容量'),
    words('Use one upright layer of rectangular footprints. Check weight, height and stability separately.',
      'Mit rechteckigen Stellflächen in einer Lage rechnen. Gewicht, Höhe und Stabilität separat prüfen.',
      '按一层矩形底座估算，承重、高度和稳定性需另行核对。'),
    {
      usableWidthCm:length('Usable shelf width (cm)','Nutzbare Regalbreite (cm)','层板可用宽度（厘米）',36),
      usableDepthCm:length('Usable shelf depth (cm)','Nutzbare Regaltiefe (cm)','层板可用深度（厘米）',23),
      footprintWidthCm:length('Figure or stand width (cm)','Breite der Figur mit Fuß (cm)','含底座宽度（厘米）',6),
      footprintDepthCm:length('Figure or stand depth (cm)','Tiefe der Figur mit Fuß (cm)','含底座深度（厘米）',5),
      gapCm:number('Gap between footprints (cm)','Abstand zwischen Stellflächen (cm)','底座间隔（厘米）',1,0,500),
    },
    ({usableWidthCm,usableDepthCm,footprintWidthCm,footprintDepthCm,gapCm})=>{
      const row = Math.floor((usableWidthCm+gapCm)/(footprintWidthCm+gapCm)+1e-10);
      const columns = Math.floor((usableDepthCm+gapCm)/(footprintDepthCm+gapCm)+1e-10);
      return {itemsPerRow:row,rows:columns,oneLayerCapacity:row*columns};
    },
  ),
  desk: family(
    words('Plan working clearance','Arbeitsabstand prüfen','核算桌面余量'), measurementLimit,
    {
      desktopWidthCm:length('Available width (cm)','Verfügbare Breite (cm)','桌面可用宽度（厘米）',75),
      productWidthCm:length('Product width (cm)','Produktbreite (cm)','产品宽度（厘米）',49),
      leftMarginCm:number('Left working margin (cm)','Freiraum links (cm)','左侧操作余量（厘米）',8,0,500),
      rightMarginCm:number('Right working margin (cm)','Freiraum rechts (cm)','右侧操作余量（厘米）',8,0,500),
    },
    ({desktopWidthCm,productWidthCm,leftMarginCm,rightMarginCm}) => {
      const required=productWidthCm+leftMarginCm+rightMarginCm;
      return {requiredWidthCm:round(required),remainingWidthCm:round(desktopWidthCm-required),withWorkingClearance:desktopWidthCm>=required};
    },
  ),
  lighting: family(
    words('Estimate lighting electricity cost','Stromkosten für Beleuchtung berechnen','估算照明电费'), powerLimit,
    {
      powerWatts:number('Power while on (W)','Leistung im Betrieb (W)','亮灯功率（瓦）',9,0,4000),
      hoursPerDay:number('Hours on per day','Betriebsstunden pro Tag','每日运行小时数',5,0,24),
      daysPerYear:integer('Days in use per year','Betriebstage pro Jahr','每年运行天数',330,0,366),
      tariffPerKwh:price('Price per kWh','Preis pro kWh','每千瓦时电价',0.30),
    },
    ({powerWatts,hoursPerDay,daysPerYear,tariffPerKwh})=>{
      const annualKwh=powerWatts*hoursPerDay*daysPerYear/1000;
      return {annualKwh:round(annualKwh),estimatedAnnualEnergyCost:round(annualKwh*tariffPerKwh)};
    },
  ),
  'smart-home': family(
    words('Estimate smart-home setup cost','Einrichtungskosten für Smart Home berechnen','估算智能家居部署费用'), moneyLimit,
    {
      unitPrice:price('Price per device','Preis je Gerät','单件金额',28),
      deviceCount:integer('Number of devices','Anzahl der Geräte','设备数量',3,1,500),
      hubAndAccessories:price('Hub and adapters, total','Zentrale und Adapter gesamt','网关及配件合计',40),
      monthlyServicePrice:price('Monthly service price','Monatspreis für Dienste','每月服务费',4),
      months:duration('Months to compare','Vergleichsmonate','比较周期（月）',12,120),
    },
    ({unitPrice,deviceCount,hubAndAccessories,monthlyServicePrice,months}) => ({
      hardwareCost:round(unitPrice*deviceCount+hubAndAccessories),serviceCost:round(monthlyServicePrice*months),
      totalPlanningCost:round(unitPrice*deviceCount+hubAndAccessories+monthlyServicePrice*months),
    }),
  ),
  electronics: family(
    words('Compare power allowance','Leistungsreserve vergleichen','核算功率余量'),
    words('This arithmetic compares a declared continuous allowance with provided device loads. Check voltage, connectors, per-port limits and the setup guide.',
      'Die Rechnung vergleicht die angegebene Dauerleistung mit den Gerätelasten. Spannung, Anschlüsse, Einzelportgrenzen und Anleitung prüfen.',
      '仅比较已填写的连续功率与使用负荷。还需核对电压、接口、单端口限制与使用说明。'),
    {
      continuousBudgetW:number('Documented continuous output (W)','Dokumentierte Dauerleistung (W)','资料所示连续输出（瓦）',65,0,30000),
      primaryDeviceW:number('Primary device requirement (W)','Leistungsbedarf des Hauptgeräts (W)','主设备所需功率（瓦）',30,0,30000),
      otherDevicesW:number('Other simultaneous loads (W)','Weitere gleichzeitige Lasten (W)','其他同时负荷（瓦）',18,0,30000),
      reservedWatts:number('Allowance to keep free (W)','Gewünschte Leistungsreserve (W)','希望预留功率（瓦）',10,0,30000),
    },
    ({continuousBudgetW,primaryDeviceW,otherDevicesW,reservedWatts}) => {
      const planned=primaryDeviceW+otherDevicesW+reservedWatts;
      return {plannedWatts:round(planned),remainingWatts:round(continuousBudgetW-planned),withinNumericalBudget:planned<=continuousBudgetW};
    },
  ),
  photo: family(
    words('Measure photo support payload','Traglast beim Fotoaufbau vergleichen','核算摄影支撑载荷'),
    words('Compare weights with a manufacturer rating for the exact configuration. Dynamic loads, balance and mounting still need a separate check.',
      'Gewichte mit der Herstellerangabe für den genauen Aufbau vergleichen. Dynamik, Balance und Befestigung separat prüfen.',
      '请填写厂家对该配置的额定载荷。仍需核对动态负载、平衡和安装方式。'),
    {
      ratingGrams:length('Documented payload rating (g)','Dokumentierte Traglast (g)','资料所示额定载荷（克）',1200),
      cameraGrams:length('Camera or phone weight (g)','Gewicht von Kamera oder Smartphone (g)','相机或手机重量（克）',365),
      attachmentsGrams:number('Total accessories weight (g)','Gesamtgewicht des Zubehörs (g)','附加配件总重（克）',180,0,100000),
      desiredReserveGrams:number('Desired extra allowance (g)','Gewünschte Reserve (g)','希望预留载荷（克）',250,0,100000),
    },
    ({ratingGrams,cameraGrams,attachmentsGrams,desiredReserveGrams}) => {
      const payload=cameraGrams+attachmentsGrams;
      return {payloadGrams:round(payload),remainingAfterReserveGrams:round(ratingGrams-payload-desiredReserveGrams),
        withinDocumentedWeightBudget:payload+desiredReserveGrams<=ratingGrams};
    },
  ),
  kitchen: family(
    words('Check kitchen space','Stellplatz in der Küche prüfen','核算厨房摆放空间'), measurementLimit,
    {
      shelfDepthCm:length('Available counter or shelf depth (cm)','Tiefe der Arbeitsplatte oder des Fachs (cm)','台面或层板可用深度（厘米）',60),
      productDepthCm:length('Product depth (cm)','Produkttiefe (cm)','产品深度（厘米）',34),
      useClearanceCm:number('Required space behind the product (cm)','Vorgeschriebener Abstand hinter dem Produkt (cm)','产品后部要求预留（厘米）',12,0,1000),
      frontClearanceCm:number('Extra space needed to open or handle (cm)','Platz zum Öffnen oder Greifen (cm)','开合或操作所需余量（厘米）',5,0,1000),
    },
    ({shelfDepthCm,productDepthCm,useClearanceCm,frontClearanceCm}) => {
      const total=productDepthCm+useClearanceCm+frontClearanceCm;
      return {requiredDepthCm:round(total),remainingDepthCm:round(shelfDepthCm-total),withinMeasuredDepth:total<=shelfDepthCm};
    },
  ),
  cleaning: family(
    words('Estimate cleaning upkeep cost','Pflegekosten von Reinigungszubehör berechnen','估算清洁用品维护费用'), moneyLimit,
    {
      starterPrice:price('Order price including initial supplies','Preis mit der Erstausstattung','包含首批耗材的购买价',25),
      replacementPackPrice:price('Price per replacement pack','Preis des Nachfüllpacks','每包替换耗材价格',10),
      usesPerPack:integer('Usable cleanings per pack','Reinigungsvorgänge pro Pack','每包可支持的次数',6,1,10000),
      remainingUses:integer('Planned cleanings after initial supplies','Reinigungen nach Verbrauch der Erstausstattung','首批耗材之后的计划清洁次数',31,0,10000),
    },
    ({starterPrice,replacementPackPrice,usesPerPack,remainingUses}) => {
      const replacementPacks=Math.ceil(remainingUses/usesPerPack);
      return {replacementPacks,replacementCost:round(replacementPacks*replacementPackPrice),
        totalCleaningBudget:round(starterPrice+replacementPacks*replacementPackPrice)};
    },
  ),
  climate: family(
    words('Project measured climate-device energy','Gemessenen Verbrauch eines Raumklimageräts hochrechnen','按实测估算环境设备能耗'),
    words('The estimate assumes the same use and conditions as your measured period.',
      'Die Schätzung setzt dieselbe Nutzung und dieselben Bedingungen wie im Messzeitraum voraus.',
      '估算假设后续使用方式与环境条件和测量期间一致。'),
    {
      measuredKwh:number('Metered energy (kWh)','Gemessene Energie (kWh)','实测用电量（千瓦时）',3.2,0,10000),
      measuredDays:duration('Days covered by the reading','Tage im Messzeitraum','实测天数',7,366),
      projectedDays:duration('Days to project','Tage für die Hochrechnung','估算天数',90,366),
      tariffPerKwh:price('Price per kWh','Preis pro kWh','每千瓦时电价',0.32),
    },
    ({measuredKwh,measuredDays,projectedDays,tariffPerKwh}) => {
      const energy=measuredKwh*projectedDays/measuredDays;
      return {kwhPerDay:round(measuredKwh/measuredDays),projectedKwh:round(energy),projectedEnergyCost:round(energy*tariffPerKwh)};
    },
  ),
  'personal-care': family(
    words('Plan personal-care refill purchases','Nachfüllbedarf für die Körperpflege planen','估算个护替换装采购'), moneyLimit,
    {
      pricePerPack:price('Price per compatible refill pack','Preis je passendem Nachfüllpack','每包兼容替换装价格',17),
      unitsPerPack:integer('Usable units per pack','Verwendbare Einheiten pro Pack','每包可用件数',3,1,10000),
      alreadyIncluded:integer('Compatible units already included','Passende Einheiten im Lieferumfang','已有兼容件数',1,0,10000),
      totalUnitsNeeded:integer('Compatible units needed for your plan','Benötigte passende Einheiten','计划所需兼容件数',7,0,10000),
    },
    ({pricePerPack,unitsPerPack,alreadyIncluded,totalUnitsNeeded})=>{
      const extraUnitsNeeded=Math.max(0,totalUnitsNeeded-alreadyIncluded);
      const packs=Math.ceil(extraUnitsNeeded/unitsPerPack);
      return {extraUnitsNeeded,packs,spareUnitsAfterPurchase:alreadyIncluded+packs*unitsPerPack-totalUnitsNeeded,
        refillBudget:round(packs*pricePerPack)};
    },
  ),
  bath: family(
    words('Check bathroom mounting clearance','Montageabstand im Bad prüfen','核算浴室安装空间'), measurementLimit,
    {
      availableWidthCm:length('Clear mounting width (cm)','Freie Montagebreite (cm)','安装位置可用宽度（厘米）',42),
      availableHeightCm:length('Clear mounting height (cm)','Freie Montagehöhe (cm)','安装位置可用高度（厘米）',46),
      mountedWidthCm:length('Installed width (cm)','Breite montiert (cm)','安装后宽度（厘米）',31),
      mountedHeightCm:length('Installed height (cm)','Höhe montiert (cm)','安装后高度（厘米）',36),
      serviceMarginCm:number('Minimum service margin on each side (cm)','Mindestfreiraum pro Seite (cm)','每边检修预留（厘米）',4,0,500),
    },
    ({availableWidthCm,availableHeightCm,mountedWidthCm,mountedHeightCm,serviceMarginCm})=>{
      const width=availableWidthCm-mountedWidthCm-2*serviceMarginCm;
      const height=availableHeightCm-mountedHeightCm-2*serviceMarginCm;
      return {remainingWidthCm:round(width),remainingHeightCm:round(height),withinMeasuredOpening:width>=0&&height>=0};
    },
  ),
  creative: family(
    words('Plan materials and spare stock','Kreativmaterial und Reserve planen','核算手作材料与备份'),
    words('Use one consistent unit for the material and checked values for the exact pack or accessory.',
      'Für das Material dieselbe Einheit und geprüfte Mengen für die genaue Packung verwenden.',
      '材料请使用统一计量单位，采购量请以核实过的该包装为准。'),
    {
      projects:integer('Number of projects','Anzahl der Projekte','项目数量',8,1,10000),
      amountPerProject:length('Material units per project','Materialeinheiten pro Projekt','每个项目所需材料量',13),
      unitsPerPack:length('Material units per pack','Materialeinheiten pro Packung','每包材料量',40),
      sparePercent:number('Allowance percentage','Prozentuale Reserve','备份比例（%）',10,0,100),
    },
    ({projects,amountPerProject,unitsPerPack,sparePercent})=>{
      const total=projects*amountPerProject*(1+sparePercent/100);
      const packs=Math.ceil((total-1e-8)/unitsPerPack);
      return {materialUnitsIncludingAllowance:round(total),packs,materialUnitsRemaining:round(packs*unitsPerPack-total)};
    },
  ),
  stationery: family(
    words('Plan paper or media use','Papier- oder Medienbedarf berechnen','核算文具使用量'),
    words('Use the same measured unit for your task and the package. Confirm the exact type, dimensions and compatibility.',
      'Für Aufgabe und Packung dieselbe Einheit verwenden. Typ, Maße und Kompatibilität bestätigen.',
      '任务量和包装量须使用相同单位，同时核对类型、尺寸与兼容性。'),
    {
      monthlyUse:integer('Sheets or compatible units per month','Blätter oder passende Einheiten im Monat','每月纸张或兼容件数',45,0,10000),
      months:duration('Months to plan','Planungsmonate','计划月数',6,120),
      unitsOnHand:integer('Usable units already on hand','Verwendbarer Bestand','已有可用件数',30,0,10000),
      unitsPerPack:integer('Usable units in one pack','Verwendbare Einheiten je Packung','每包可用件数',60,1,10000),
    },
    ({monthlyUse,months,unitsOnHand,unitsPerPack})=>{
      const demand=monthlyUse*months;
      const packs=Math.ceil(Math.max(0,demand-unitsOnHand)/unitsPerPack);
      return {plannedUse:demand,packs,remainingStock:unitsOnHand+packs*unitsPerPack-demand};
    },
  ),
};

const MODEL = text('Exact model shown on the offer','Genaues Modell des Angebots','报价中显示的准确型号','',400);
const identityWords = words('Use the seller’s model field or exact variant name.', 'Die Modellangabe oder den genauen Variantennamen des Angebots verwenden.', '请填写卖家给出的型号或准确款式名称。');
const recordedLabel = words('Recorded model','Erfasstes Modell','来源记录的型号');
const statusWords = {
  match:words('The offered model matches the recorded label. The calculation uses your inputs.', 'Das Modell im Angebot stimmt mit der erfassten Bezeichnung überein. Die Rechnung nutzt deine Angaben.', '报价型号与记录一致。计算采用你填写的数据。'),
  mismatch:words('The offered model does not match the recorded label. Verify the variant with the official source.', 'Die Modellangabe im Angebot stimmt nicht mit dem erfassten Modell überein. Variante anhand der offiziellen Quelle prüfen.', '报价型号与记录不一致。请用厂家资料核对款式。'),
  invalid:words('Check the required inputs and their ranges.', 'Pflichtangaben und Wertebereiche prüfen.', '请核对必填项及其取值范围。'),
};

function modelFor(row, locale) {
  const [,name,brand,model,category,url,checked,, , ,deVariant] = row;
  const [modelName,modelLabel,sourceUrl,sourceChecked] = locale === 'de' && deVariant ? deVariant : [name,model,url,checked];
  return {name:modelName,brand,model:modelLabel,category,sourceUrl,sourceChecked};
}

function buildDefinition(row) {
  const [id,,,,category] = row;
  const task = categoryFamilies[category];
  if (!task) throw Error(`No runnable task for category "${category}"`);
  const fields = {offeredModel:MODEL,...task.fields};
  const names=Object.keys(fields);
  const sample=Object.fromEntries(names.filter(name=>name!=='offeredModel').map(name=>[name,fields[name].sample]));
  const localized = (fn) => Object.fromEntries(['en','de','zh'].map(locale=>[locale,fn(locale,modelFor(row,locale))]));
  const enModel=modelFor(row,'en');
  const examples=localized((_,model)=>({offeredModel:model.model,...sample}));
  return {
    name:'tds_purchase_'+id.replace(/-/g,'_'),
    slug:'purchase-'+id,
    category,
    title:localized((l,model)=>`${task.titles[l]} · ${model.name}`),
    description:localized((l,model)=>`${recordedLabel[l]} ${model.model}. ${identityWords[l]} ${task.limits[l]}`),
    inputSchema:{type:'object',properties:Object.fromEntries(names.map(name=>[name,fields[name].schema])),
      required:names,additionalProperties:false},
    example:examples.en,
    examples,
    fieldTitles:Object.fromEntries(names.map(name=>[name,fields[name].titles])),
    evidence:{url:enModel.sourceUrl,checked:enModel.sourceChecked},
    evidenceByLocale:localized((_,model)=>({url:model.sourceUrl,checked:model.sourceChecked})),
  };
}

export const HOME_TOOLS = HOME_PURCHASE_EVIDENCE.map(buildDefinition);
const profiles = new Map(HOME_TOOLS.map((tool,index)=>[tool.name,{tool,row:HOME_PURCHASE_EVIDENCE[index]}]));

export function runHomeTool(name,args,locale='en') {
  const view=['en','de','zh'].includes(locale)?locale:'en';
  const profile = profiles.get(name);
  if (!profile) throw new RangeError('Unknown shopping tool');
  const {tool,row}=profile;
  const model=modelFor(row,view);
  const task=categoryFamilies[model.category];
  const productId=row[0];
  const check={en:row[7],de:row[8],zh:row[9]}[view];
  const modelDetails={productId,name:model.name,brand:model.brand,model:model.model,
    officialSource:model.sourceUrl,sourceChecked:model.sourceChecked,productCheck:check};
  if (!matchesInputSchema(args,tool.inputSchema) || !args.offeredModel.trim()) return {status:'invalid_input',message:statusWords.invalid[view],model:modelDetails};
  if (normalize(args.offeredModel)!==normalize(model.model)) return {
    status:'model_mismatch',message:statusWords.mismatch[view],model:modelDetails,
  };
  return {status:'model_matched',message:statusWords.match[view],model:modelDetails,
    calculation:task.calculate(args),scope:task.limits[view]};
}
