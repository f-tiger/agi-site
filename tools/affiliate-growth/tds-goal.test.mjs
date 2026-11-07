import test from 'node:test';
import assert from 'node:assert/strict';
import {tdsGoal,totalRevenue} from './tds-goal.mjs';
const base={targetUsd:100,commissionableBasketUsd:50,commissionRate:.03,merchantOrderRate:.04,landingOutboundRate:.15};
test('round each funnel stage up and never confuse retail sales with commissions',()=>{
 const r=tdsGoal(base);
 assert.equal(r.commissionPerQualifyingOrderUsd,1.5);
 assert.equal(r.requiredNetQualifyingOrders,67);
 assert.equal(r.requiredPlacedOrders,67);
 assert.equal(r.requiredMerchantClicks,1675);
 assert.equal(r.requiredEligibleLandingVisits,11167);
 assert.equal(r.requiredAttributableNetCommissionUsd,100);
 assert.equal(r.kind,'hypothesis_not_forecast');
 assert.equal(r.target.status,'owner_confirmed_monthly_site_total_goal');
 assert.match(r.attribution,/pending/);
});
test('qualification and returns affect eligible orders before click and visit volumes',()=>{
 const r=tdsGoal({...base,qualificationRate:.8,refundRate:.25});
 assert.ok(Math.abs(r.expectedNetCommissionPerPlacedOrderUsd-.9)<1e-12);
 assert.equal(r.requiredPlacedOrders,112);
 assert.equal(r.requiredMerchantClicks,2800);
 assert.equal(r.requiredEligibleLandingVisits,18667);
 const ideal=tdsGoal({...base,commissionableBasketUsd:100,commissionRate:1,merchantOrderRate:1,landingOutboundRate:1,qualificationRate:1,refundRate:0});
 assert.equal(ideal.requiredNetQualifyingOrders,1);assert.equal(ideal.requiredEligibleLandingVisits,1);
});
test('reject nonfinite, negative, zero-yield and out-of-range assumptions',()=>{
 for(const key of ['targetUsd','commissionableBasketUsd','commissionRate','merchantOrderRate','landingOutboundRate','qualificationRate'])for(const value of [NaN,Infinity,-Infinity,-1,0])assert.throws(()=>tdsGoal({...base,[key]:value}),RangeError,key+' '+value);
 for(const key of ['commissionRate','merchantOrderRate','landingOutboundRate','qualificationRate'])assert.throws(()=>tdsGoal({...base,[key]:1.01}),RangeError,key);
 for(const value of [NaN,Infinity,-.01,1,1.01])assert.throws(()=>tdsGoal({...base,refundRate:value}),RangeError);
 for(const input of [null,[],{...base,siteClickEvents:27},{...base,commissionRate:'0.03'}])assert.throws(()=>tdsGoal(input));
 assert.throws(()=>tdsGoal({...base,merchantOrderRate:Number.MIN_VALUE}),RangeError);
 assert.throws(()=>tdsGoal({...base,commissionableBasketUsd:Number.MIN_VALUE,commissionRate:Number.MIN_VALUE}),RangeError);
});
test('exact integer boundaries and optional USD target are stable',()=>{
 const r=tdsGoal({...base,targetUsd:12,commissionableBasketUsd:10,commissionRate:.1,merchantOrderRate:.3,landingOutboundRate:.5});
 assert.equal(r.requiredNetQualifyingOrders,12);assert.equal(r.requiredMerchantClicks,40);assert.equal(r.requiredEligibleLandingVisits,80);
 assert.equal(tdsGoal({...base,targetUsd:1}).requiredNetQualifyingOrders,1);
 assert.equal(tdsGoal({...base,targetUsd:Number.MIN_VALUE}).requiredNetQualifyingOrders,1);
 assert.equal(tdsGoal({...base,targetUsd:10}).requiredNetQualifyingOrders,7);
});

const period={periodStart:'2026-10-01',periodEnd:'2026-10-31'};
const report=(type,confirmedGrossUsd,reversalsUsd=0)=>({type,currency:'USD',scope:'tds_exclusive',evidenceStatus:'confirmed',evidenceRef:'synthetic test evidence',...period,confirmedGrossUsd,reversalsUsd});
test('site total includes all evidenced revenue channels, deducts reversals and keeps cash separate',()=>{
 const result=totalRevenue({...period,channels:[report('affiliate',40,5),report('direct_sale',60,10),report('membership',0),report('sponsorship',20)]});
 assert.equal(result.totalNetRevenueUsd,105);assert.equal(result.goalReached,true);assert.equal(result.unknownChannels.length,0);
 assert.equal(totalRevenue({...period,channels:[report('affiliate',.1),report('direct_sale',.2),report('membership',0),report('sponsorship',0)]}).totalNetRevenueUsd,.3);
 assert.equal(totalRevenue({...period,channels:[report('affiliate',0,2)]}).knownNetSubtotalUsd,-2);
});
test('missing channels or missing evidence remain unknown, never fabricated zero',()=>{
 const result=totalRevenue({...period,channels:[report('affiliate',12)]});
 assert.equal(result.knownNetSubtotalUsd,12);assert.equal(result.totalNetRevenueUsd,null);assert.equal(result.goalReached,null);
 assert.deepEqual(result.unknownChannels,['direct_sale','membership','sponsorship']);
 const empty=totalRevenue({...period,channels:[]});assert.equal(empty.totalNetRevenueUsd,null);
 const unknown=totalRevenue({...period,channels:[{type:'affiliate',currency:'USD',scope:'tds_exclusive',evidenceStatus:'unknown',...period}]});assert.ok(unknown.unknownChannels.includes('affiliate'));
});
test('reject shared, foreign-currency, overlapping/mismatched and invalid source reports',()=>{
 const good=report('affiliate',1);
 for(const edit of [{currency:'EUR'},{scope:'fleet_shared'},{evidenceStatus:'pending'},{evidenceRef:''},{confirmedGrossUsd:null},{confirmedGrossUsd:NaN},{reversalsUsd:-1},{reversalsUsd:Infinity},{confirmedGrossUsd:1.001},{periodStart:'2026-09-30'}])assert.throws(()=>totalRevenue({...period,channels:[{...good,...edit}]}));
 assert.throws(()=>totalRevenue({...period,channels:[good,good]}));
 assert.throws(()=>totalRevenue({...period,periodEnd:'2026-10-30',channels:[]}));
 assert.throws(()=>totalRevenue({...period,periodStart:'2026-02-30',channels:[]}));
});

test('calendar months define the goal while a 30-day comparison never declares it met',()=>{
 assert.equal(tdsGoal(base).target.period,'calendar_month');
 const comparisonPeriod={periodStart:'2026-10-01',periodEnd:'2026-10-30'};
 const comparison=totalRevenue({...comparisonPeriod,periodKind:'rolling_30_day_comparison',channels:['affiliate','direct_sale','membership','sponsorship'].map(type=>({...report(type,30),...comparisonPeriod}))});
 assert.equal(comparison.totalNetRevenueUsd,120);assert.equal(comparison.goalReached,null);
 assert.throws(()=>totalRevenue({...comparisonPeriod,channels:[]}));
 for(const [periodStart,periodEnd] of [['2026-02-01','2026-02-28'],['2028-02-01','2028-02-29'],['2026-09-01','2026-09-30']])assert.equal(totalRevenue({periodStart,periodEnd,channels:[]}).periodKind,'calendar_month');
});
