// Internal planning primitive for ECO. Assumptions are never reported as earnings.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function scenario({targetUsd,approvedCommissionUsd,merchantConversion,eligibleVisitClickRate}){
 for(const n of [targetUsd,approvedCommissionUsd,merchantConversion,eligibleVisitClickRate])if(!Number.isFinite(n)||n<=0)throw new RangeError('Positive finite assumptions required');
 if(merchantConversion>1||eligibleVisitClickRate>1)throw new RangeError('Rates must be <= 1');
 const merchantClicks=targetUsd/(approvedCommissionUsd*merchantConversion);
 return {kind:'hypothesis_not_forecast',currency:'USD',targetUsd,approvedTransactions:Math.ceil(targetUsd/approvedCommissionUsd),merchantClicks:Math.ceil(merchantClicks),eligibleLandingVisits:Math.ceil(merchantClicks/eligibleVisitClickRate),expectedCommissionPerMerchantClick:approvedCommissionUsd*merchantConversion};
}
export function verifiedEpc(report){
 const required=['market','start','end','currency','clicks','commission','siteExclusive'];
 if(!report||Object.keys(report).some(k=>!required.includes(k)))throw new TypeError('Only an aggregate report is accepted');
 if(!/^[A-Z]{3}$/.test(report.currency||'')||!['de','us'].includes(report.market))throw new RangeError('Market and currency required');
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s).toISOString().slice(0,10)===s;
 if(!date(report.start)||!date(report.end)||report.start>report.end)throw new RangeError('Comparable dates required');
 if(!Number.isSafeInteger(report.clicks)||report.clicks<0||!Number.isFinite(report.commission)||typeof report.siteExclusive!=='boolean')throw new RangeError('Invalid report values');
 return {...report,commissionPerClick:report.clicks?report.commission/report.clicks:null,scope:report.siteExclusive?'site_exclusive_report':'account_only_not_eco_attributable',note:'Reported commission, not cash received. Preserve refunds. No FX conversion or purchase rate is inferred.'};
}
export const assumptions=[
 {name:'Low commission',targetUsd:1000,approvedCommissionUsd:3,merchantConversion:.04,eligibleVisitClickRate:.12},
 {name:'Working hypothesis',targetUsd:1000,approvedCommissionUsd:9,merchantConversion:.05,eligibleVisitClickRate:.15},
 {name:'Stronger economics',targetUsd:1000,approvedCommissionUsd:18,merchantConversion:.06,eligibleVisitClickRate:.20}
];
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result={assumptions:assumptions.map(x=>({...x,...scenario(x)})),measured:null,notes:['Rates and commissions are hypothetical, not Amazon category rates.','Landing visits, pageviews, site click events and merchant clicks are different denominators.','Revenue target is approved commissions after reversals, before operating costs; cash received is separate.']};
 if(process.argv[2])result.measured=verifiedEpc(JSON.parse(readFileSync(process.argv[2],'utf8')));
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
