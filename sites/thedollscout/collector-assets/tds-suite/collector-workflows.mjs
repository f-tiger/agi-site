import { WORKFLOW_EXTRA, WORKFLOW_KERNELS } from './workflow-kernels.mjs';
import { WORKFLOW_PROFILES } from './workflow-profiles.mjs';
import { matchesInputSchema } from './input-schema.mjs';

const triples=(en,de,zh)=>({en,de,zh});
const languages=['en','de','zh'];
const label=(en,de,zh)=>triples(en,de,zh);
const standardLabels={
  insideWidthMm:label('Usable inside width (mm)','Nutzbare Innenbreite (mm)','可用内部宽度（毫米）'),
  insideDepthMm:label('Usable inside depth (mm)','Nutzbare Innentiefe (mm)','可用内部深度（毫米）'),
  insideHeightMm:label('Usable inside height (mm)','Nutzbare Innenhöhe (mm)','可用内部高度（毫米）'),
  insideLengthMm:label('Usable inside length (mm)','Nutzbare Innenlänge (mm)','可用内部长度（毫米）'),
  itemWidthMm:label('Measured item width (mm)','Gemessene Objektbreite (mm)','实测物件宽度（毫米）'),
  itemHeightMm:label('Measured item height (mm)','Gemessene Objekthöhe (mm)','实测物件高度（毫米）'),
  itemDepthMm:label('Measured item depth (mm)','Gemessene Objekttiefe (mm)','实测物件深度（毫米）'),
  itemGapMm:label('Minimum gap between items (mm)','Mindestabstand zwischen Objekten (mm)','物件之间最小间隙（毫米）'),
  openingHeightMm:label('Height at the narrowest opening (mm)','Höhe an der engsten Öffnung (mm)','最窄开口高度（毫米）'),
  baseHeightMm:label('Combined bottom support height (mm)','Gesamthöhe der unteren Träger (mm)','底部支撑总高度（毫米）'),
  doorWidthMm:label('Clear door width (mm)','Freie Türbreite (mm)','门口净宽（毫米）'),
  doorHeightMm:label('Clear door height (mm)','Freie Türhöhe (mm)','门口净高（毫米）'),
  allowsTurn:label('Can insert in the turned orientation','Einschub gedreht möglich','允许按旋转后朝向放入'),
  eyeHeightMm:label('Eye height from shelf base (mm)','Augenhöhe ab Regalboden (mm)','视点距层板高度（毫米）'),
  frontDistanceMm:label('Eye distance to foreground (mm)','Augenabstand zum Vordergrund (mm)','视点距前排遮挡物距离（毫米）'),
  backDistanceMm:label('Eye distance to rear detail (mm)','Augenabstand zum hinteren Detail (mm)','视点距后排可见特征距离（毫米）'),
  frontTopMm:label('Foreground top height from shelf (mm)','Oberkante des Vordergrunds ab Regal (mm)','前排顶端距层板高度（毫米）'),
  rearFeatureMm:label('Rear detail height before adding a riser (mm)','Höhe des hinteren Details vor dem Anheben (mm)','尚未加垫高台时后排特征高度（毫米）'),
  itemCount:label('Number of identical items','Anzahl gleicher Objekte','相同物件件数'),
  massPerItemG:label('Measured mass per item (g)','Gemessene Masse je Objekt (g)','单件实测质量（克）'),
  standMassG:label('Combined mass of stands (g)','Gesamtmasse der Aufsteller (g)','全部支架质量（克）'),
  ratingG:label('Applicable manufacturer mass rating (g)','Zulässige Herstellerlast (g)','适用厂家额定质量（克）'),
  packedLengthMm:label('Protected item length (mm)','Länge des geschützten Objekts (mm)','防护包装后单件长度（毫米）'),
  packedWidthMm:label('Protected item width (mm)','Breite des geschützten Objekts (mm)','防护包装后单件宽度（毫米）'),
  packedHeightMm:label('Protected item height (mm)','Höhe des geschützten Objekts (mm)','防护包装后单件高度（毫米）'),
  itemsToPack:label('Items to pack','Zu verpackende Stücke','待打包件数'),
  sheetWidthMm:label('Sheet width (mm)','Bogenbreite (mm)','片材宽度（毫米）'),
  sheetLengthMm:label('Sheet length (mm)','Bogenlänge (mm)','片材长度（毫米）'),
  pieceWidthMm:label('Finished piece width (mm)','Zuschnittbreite (mm)','成品单件宽度（毫米）'),
  pieceLengthMm:label('Finished piece length (mm)','Zuschnittlänge (mm)','成品单件长度（毫米）'),
  piecesNeeded:label('Pieces needed before reserves','Benötigte Stücke vor Reserve','不含备份的所需件数'),
  cutSpacingMm:label('Cutting gap (mm)','Schnittabstand (mm)','切割留缝（毫米）'),
  lastReviewDate:label('Last review date (YYYY-MM-DD)','Letzte Prüfung (JJJJ-MM-TT)','上次核查日期（年-月-日）'),
  asOfDate:label('As-of date (YYYY-MM-DD)','Stichtag (JJJJ-MM-TT)','基准日期（年-月-日）'),
  expectedIds:label('Expected IDs, one per line','Soll-IDs, je Zeile eine','预期编号，每行一个'),
  countedIds:label('Counted IDs, one per line','Gezählte IDs, je Zeile eine','盘点编号，每行一个'),
  unitsOnHand:label('Counted supply units','Gezählte Verbrauchseinheiten','实盘耗材单位数'),
  unitsPerTask:label('Supply units per task','Verbrauchseinheiten pro Aufgabe','每次任务耗材量'),
  tasksPlanned:label('Tasks planned','Geplante Aufgaben','计划任务数'),
  recordPairs:label('Each line as ID | folder','Je Zeile ID | Ordner','每行填写 编号 | 文件夹'),
  offerACents:label('Delivered quote A (cents)','Gesamtangebot A (Cent)','报价 A 到手价（分）'),
  offerBCents:label('Delivered quote B before adjustment (cents)','Gesamtangebot B vor Aufschlag (Cent)','报价 B 附加前到手价（分）'),
  offerAQuantity:label('Offer A quantity','Menge in Angebot A','报价 A 数量'),
  offerBQuantity:label('Offer B quantity','Menge in Angebot B','报价 B 数量'),
  unitPriceCents:label('Quoted unit price (cents)','Angebotener Stückpreis (Cent)','单件报价（分）'),
  quantity:label('Units purchased','Gekaufte Einheiten','购买件数'),
  shippingCents:label('Quoted shipping (cents)','Angegebener Versand (Cent)','运费报价（分）'),
  confirmedDiscountCents:label('Confirmed discount (cents)','Bestätigter Rabatt (Cent)','已确认折扣（分）'),
  budgetCents:label('Budget cap (cents)','Budgetobergrenze (Cent)','预算上限（分）'),
  committedCents:label('Already committed (cents)','Bereits gebunden (Cent)','已承诺支出（分）'),
  costPerUnitCents:label('All-in cost per unit (cents)','Gesamtkosten je Einheit (Cent)','单件全包成本（分）'),
  originalCostCents:label('Cost to recover (cents)','Auszugleichende Kosten (Cent)','需收回的成本（分）'),
  fixedFeeCents:label('Fixed seller fee (cents)','Feste Verkaufsgebühr (Cent)','固定销售费用（分）'),
  variableFeeBasisPoints:label('Variable seller fee (basis points)','Variable Verkaufsgebühr (Basispunkte)','比例销售费（基点）'),
  cartCents:label('Current cart subtotal (cents)','Aktueller Warenkorbwert (Cent)','当前购物车金额（分）'),
  shippingThresholdCents:label('Shipping price threshold (cents)','Versandpreisgrenze (Cent)','运费门槛（分）'),
  belowThresholdShippingCents:label('Shipping below threshold (cents)','Versand unterhalb der Grenze (Cent)','未达门槛运费（分）'),
  atThresholdShippingCents:label('Shipping at or above threshold (cents)','Versand ab der Grenze (Cent)','达到门槛运费（分）'),
  offerAUpfrontCents:label('Quote A one-time cost (cents)','Einmalkosten Angebot A (Cent)','报价 A 一次性成本（分）'),
  offerBUpfrontCents:label('Quote B one-time cost (cents)','Einmalkosten Angebot B (Cent)','报价 B 一次性成本（分）'),
  offerAMonthlyCents:label('Quote A cost per month (cents)','Monatskosten Angebot A (Cent)','报价 A 每月成本（分）'),
  offerBMonthlyCents:label('Quote B cost per month (cents)','Monatskosten Angebot B (Cent)','报价 B 每月成本（分）'),
  outerLengthCm:label('Parcel outer length (cm)','Paketaußenlänge (cm)','包裹外部长度（厘米）'),
  outerWidthCm:label('Parcel outer width (cm)','Paketaußenbreite (cm)','包裹外部宽度（厘米）'),
  outerHeightCm:label('Parcel outer height (cm)','Paketaußenhöhe (cm)','包裹外部高度（厘米）'),
  grossMassG:label('Parcel gross mass (g)','Paketgesamtmasse (g)','包裹总质量（克）'),
  divisorCm3PerKg:label('Quoted divisor (cm³/kg)','Angegebener Divisor (cm³/kg)','报价体积除数（立方厘米/千克）'),
  plannedIds:label('Planned IDs, one per line','Geplante IDs, je Zeile eine','计划编号，每行一个'),
  departureIds:label('Departure IDs, one per line','Abgangs-IDs, je Zeile eine','出发扫描编号，每行一个'),
  statusRows:label('Each line as ID | ready, pending or blocked','Je Zeile ID | ready, pending oder blocked','每行填写 编号 | ready、pending 或 blocked'),
};
const kinds={review:'days',stock:'tolerance',index:'lines',quotes:'months',billing:'increment',scan:'lines',checklist:'lines'};
const signatures=new Set();
const handlers=new Map();

function makeTools(kind,profiles){
  const kernel=WORKFLOW_KERNELS[kind];
  const extra=WORKFLOW_EXTRA[kinds[kind]??'number'];
  if(!kernel||profiles.length!==10)throw new Error(`Expected ten workflows for ${kind}`);
  return profiles.map(([slug,subjectEn,subjectDe,subjectZh,key,fieldEn,fieldDe,fieldZh,sample])=>{
    const subject=triples(subjectEn,subjectDe,subjectZh);
    const extraLabel=triples(fieldEn,fieldDe,fieldZh);
    if(!slug||!key||!sample||Object.hasOwn(kernel.inputs,key))throw new Error(`Invalid workflow profile ${slug}`);
    const name='tds_'+slug.replaceAll('-','_');
    const inputSchema={type:'object',properties:{...kernel.inputs,[key]:extra},
      required:[...Object.keys(kernel.inputs),key],additionalProperties:false};
    const signature=[...inputSchema.required].sort().join(' ');
    if(signatures.has(signature)||handlers.has(name))throw new Error(`Duplicate workflow input contract ${slug}`);
    signatures.add(signature);
    const title=Object.fromEntries(languages.map(lang=>[lang,`${kernel.title[lang]} · ${subject[lang]}`]));
    const description=Object.fromEntries(languages.map(lang=>[lang,`${kernel.explanation[lang]} ${subject[lang]}. ${extraLabel[lang]}.`]));
    const example={...kernel.sample,[key]:extra.type==='string'?sample.replaceAll('~','\n'):Number(sample)};
    const fieldTitles={...Object.fromEntries(Object.keys(kernel.inputs).map(field=>[field,standardLabels[field]])),[key]:extraLabel};
    if(!matchesInputSchema(example,inputSchema)||Object.values(fieldTitles).some(x=>!x))
      throw new Error(`Invalid workflow schema or example ${slug}`);
    const def={name,slug,category:kernel.category,title,description,inputSchema,example,fieldTitles};
    handlers.set(name,{def,run:a=>kernel.run(a,a[key])});
    return def;
  });
}

export const WORKFLOW_TOOLS=Object.freeze(Object.entries(WORKFLOW_PROFILES).flatMap(([kind,profiles])=>makeTools(kind,profiles)));
if(WORKFLOW_TOOLS.length!==200)throw new Error('Expected 200 collector workflows');

export function runWorkflowTool(name,args,locale='en'){
  const entry=handlers.get(name);
  if(!entry)throw new RangeError('Unknown collector workflow');
  if(!matchesInputSchema(args,entry.def.inputSchema))throw new TypeError('Invalid workflow arguments');
  return {task:entry.def.title[locale]??entry.def.title.en,...entry.run(args)};
}
