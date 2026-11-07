// TDS planning arithmetic only. No revenue, traffic or conversion is observed here.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const keys=new Set(['targetUsd','commissionableBasketUsd','commissionRate','merchantOrderRate','landingOutboundRate','qualificationRate','refundRate']);
function positive(value,name){if(!Number.isFinite(value)||value<=0)throw new RangeError(name+' must be positive and finite');return value;}
function rate(value,name,{zero=false,one=true}={}){if(!Number.isFinite(value)||(zero?value<0:value<=0)||(one?value>1:value>=1))throw new RangeError(name+' is outside its rate boundary');return value;}
// Avoid one extra order from floating-point residue at an exact integer boundary.
function roundRequired(value){if(!Number.isFinite(value)||value>Number.MAX_SAFE_INTEGER)throw new RangeError('Required volume exceeds safe arithmetic');const nearest=Math.round(value);return Math.max(1,Math.abs(value-nearest)<=Number.EPSILON*Math.max(1,value)*4?nearest:Math.ceil(value));}
export function tdsGoal(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.has(k)))throw new TypeError('Supply only supported scenario inputs');
 const {targetUsd=100,commissionableBasketUsd,commissionRate,merchantOrderRate,landingOutboundRate,qualificationRate=1,refundRate=0}=input;
 positive(targetUsd,'targetUsd');positive(commissionableBasketUsd,'commissionableBasketUsd');
 for(const [name,value] of Object.entries({commissionRate,merchantOrderRate,landingOutboundRate,qualificationRate}))rate(value,name);
 rate(refundRate,'refundRate',{zero:true,one:false});
 const commissionPerQualifyingOrderUsd=commissionableBasketUsd*commissionRate;
 positive(commissionPerQualifyingOrderUsd,'commissionPerQualifyingOrderUsd');
 const retainedQualificationRate=qualificationRate*(1-refundRate);
 positive(retainedQualificationRate,'retainedQualificationRate');
 const requiredNetQualifyingOrders=roundRequired(targetUsd/commissionPerQualifyingOrderUsd);
 const requiredPlacedOrders=roundRequired(requiredNetQualifyingOrders/retainedQualificationRate);
 const requiredMerchantClicks=roundRequired(requiredPlacedOrders/merchantOrderRate);
 const requiredEligibleLandingVisits=roundRequired(requiredMerchantClicks/landingOutboundRate);
 return {
  kind:'hypothesis_not_forecast',currency:'USD',target:{amount:targetUsd,period:'calendar_month',status:'owner_confirmed_monthly_site_total_goal',siteTotalGoalUsd:100,measure:'Modeled affiliate contribution to TDS total site revenue; confirmed net after reversals; before operating costs; cash separate'},
  inputs:{targetUsd,commissionableBasketUsd,commissionRate,merchantOrderRate,landingOutboundRate,qualificationRate,refundRate},
  commissionPerQualifyingOrderUsd,expectedNetCommissionPerPlacedOrderUsd:commissionPerQualifyingOrderUsd*retainedQualificationRate,
  requiredAttributableNetCommissionUsd:targetUsd,requiredNetQualifyingOrders,requiredPlacedOrders,requiredMerchantClicks,requiredEligibleLandingVisits,
  attribution:'pending_real_TDS_exclusive_tracking_ID_and_merchant_report',
  caveats:[
   'Basket is commissionable revenue after excluded taxes, shipping and adjustments, not the consumer retail total. One modeled category per order is a simplifying assumption.',
   'Category rate and product classification must be checked with Amazon; a guide category or search term does not establish an eligible category or account-specific rate.',
   'Every conversion, qualification and refund rate is an assumption. Counts are successive rounded planning volumes, not guaranteed results or a time-to-revenue forecast.',
   'Qualification rate is the fraction of placed merchant orders eligible before returns; refund rate applies to that subset. Required merchant clicks use merchant-reported clicks, not site click events.',
   'The confirmed goal is USD100 total site revenue per calendar month. This scenario models affiliate contribution only. Shared US/DE tags establish account totals, not TDS earnings.',
   'Zero observed conversion cannot be inverted into a finite forecast. Per-item rounding, mixed baskets and later reversals require actual merchant reports.'
  ]
 };
}
export const affiliateScenario=tdsGoal;

const channelTypes=['affiliate','direct_sale','membership','sponsorship'];
function validDay(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
// Manual evidence normalization, never a claim that this script verified the source.
// Omitted/unknown channels leave the total unknown, while retaining a known subtotal.
export function totalRevenue({periodStart,periodEnd,channels,periodKind='calendar_month'}={}){
 if(!validDay(periodStart)||!validDay(periodEnd)||periodStart>periodEnd||!Array.isArray(channels))throw new TypeError('Valid report dates and a channel array are required');
 if(!['calendar_month','rolling_30_day_comparison'].includes(periodKind))throw new RangeError('Unsupported reporting period');
 if(periodKind==='calendar_month'){const end=new Date(periodStart);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);if(!periodStart.endsWith('-01')||periodEnd!==end.toISOString().slice(0,10))throw new RangeError('The primary target uses one complete calendar month');}
 else if((Date.parse(periodEnd)-Date.parse(periodStart))/86400000+1!==30)throw new RangeError('Operational comparison requires 30 inclusive dates');
 const seen=new Set(),known=[],unknown=[];
 for(const row of channels){
  if(!row||typeof row!=='object'||Object.keys(row).some(k=>!['type','currency','scope','evidenceStatus','evidenceRef','periodStart','periodEnd','confirmedGrossUsd','reversalsUsd'].includes(k))||!channelTypes.includes(row.type)||seen.has(row.type))throw new TypeError('One supported record per revenue channel');
  seen.add(row.type);
  if(row.currency!=='USD')throw new RangeError('Only documented USD amounts are accepted; no implicit FX conversion');
  if(row.scope!=='tds_exclusive')throw new RangeError('Shared-account revenue cannot be attributed to TDS');
  if(row.periodStart!==periodStart||row.periodEnd!==periodEnd)throw new RangeError('Every channel must use the same reporting window');
  if(row.evidenceStatus==='unknown'){unknown.push(row.type);continue;}
  if(row.evidenceStatus!=='confirmed'||typeof row.evidenceRef!=='string'||!row.evidenceRef.trim()||row.evidenceRef.length>500)throw new TypeError('Confirmed source reference required');
  for(const field of ['confirmedGrossUsd','reversalsUsd'])if(!Number.isFinite(row[field])||row[field]<0||row[field]*100>Number.MAX_SAFE_INTEGER)throw new RangeError(field+' must be a nonnegative finite documented amount');
  const grossCents=Math.round(row.confirmedGrossUsd*100),reversalCents=Math.round(row.reversalsUsd*100);
  if(Math.abs(row.confirmedGrossUsd*100-grossCents)>1e-6||Math.abs(row.reversalsUsd*100-reversalCents)>1e-6)throw new RangeError('Documented USD amounts must use cents');
  known.push({type:row.type,netUsd:(grossCents-reversalCents)/100});
 }
 for(const type of channelTypes)if(!seen.has(type))unknown.push(type);
 const sumCents=known.reduce((sum,row)=>sum+Math.round(row.netUsd*100),0);
 if(!Number.isSafeInteger(sumCents))throw new RangeError('Revenue total exceeds safe arithmetic');
 return {kind:'manual_evidence_summary_not_external_verification',currency:'USD',periodStart,periodEnd,periodKind,siteTotalGoalUsd:100,knownChannels:known,unknownChannels:unknown,knownNetSubtotalUsd:sumCents/100,totalNetRevenueUsd:unknown.length?null:sumCents/100,goalReached:unknown.length||periodKind!=='calendar_month'?null:sumCents>=10000,note:'Calendar-month totals determine the owner goal; rolling 30-day results are comparisons only. Caller-supplied confirmation is not independently verified. Missing channels stay unknown; explicit zero requires evidence. Gross channel amounts must exclude pass-through taxes and duplicate receipts. Net revenue is after reversals, before operating costs; cash receipt is separate.'};
}
export const tdsExamples=[
 {name:'Small accessory, weak unverified funnel',commissionableBasketUsd:25,commissionRate:.03,merchantOrderRate:.02,landingOutboundRate:.10,qualificationRate:.9,refundRate:.05},
 {name:'Mid-size purchase, working hypothesis',commissionableBasketUsd:50,commissionRate:.03,merchantOrderRate:.04,landingOutboundRate:.15,qualificationRate:.9,refundRate:.05},
 {name:'Larger purchase, stronger unverified funnel',commissionableBasketUsd:100,commissionRate:.03,merchantOrderRate:.06,landingOutboundRate:.20,qualificationRate:.9,refundRate:.05}
];
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const custom=process.argv[2]?JSON.parse(readFileSync(process.argv[2],'utf8')):null;
 const result=custom?tdsGoal(custom):{scope:'TDS scenario planning, not measured earnings',examples:tdsExamples.map(({name,...input})=>({name,...tdsGoal(input)}))};
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
