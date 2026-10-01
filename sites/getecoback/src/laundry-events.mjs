export const LAUNDRY_EVENTS=['laundry_view','laundry_compare','laundry_export','laundry_next'];
export const LAUNDRY_PATHS=['/waeschetrockner-oder-luftentfeuchter.html','/en/guide/dehumidifier-drying-clothes-cost.html'];
export function validLaundryEvent(b){
 const m=b.m;if(!LAUNDRY_PATHS.includes(b.p)||!m||Object.keys(m).sort().join(',')!=='action,equal,evidence,input,lang,method,source')return false;
 if(m.lang!==(b.p.startsWith('/en/')?'en':'de')||!['example','edited'].includes(m.input)||!['estimate','measured'].includes(m.method)||!['yes','no'].includes(m.equal)||!['youtube','tiktok','onsite'].includes(m.source)||!['none','tag_only','referrer','other'].includes(m.evidence))return false;
 if((m.source==='onsite')!==(m.evidence==='none'))return false;
 return ({laundry_view:['view'],laundry_compare:['compare'],laundry_export:['card','csv'],laundry_next:['share','guide']}[b.n]||[]).includes(m.action);
}
