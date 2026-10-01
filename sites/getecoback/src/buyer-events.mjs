export const BUYER_EVENTS=['buyer_view','buyer_result','buyer_next'];
export const BUYER_PATHS=[
 '/guide/luftentfeuchter-ratgeber.html','/guide/waesche-trocknen-wohnung.html',
 '/guide/luftentfeuchter-20-qm.html','/guide/luftentfeuchter-keller.html',
 '/en/guide/dehumidifier-20-sqm.html','/en/guide/dehumidifier-drying-clothes-cost.html'
];
export function validBuyerEvent(body){
 const m=body.m;if(!m||typeof m!=='object'||Array.isArray(m)||!BUYER_PATHS.includes(body.p))return false;
 if(Object.keys(m).sort().join(',')!=='action,choice,lang')return false;
 if(m.lang!==(body.p.startsWith('/en/')?'en':'de'))return false;
 const choices=['measure','wait','cold','compare','laundry','cause'];
 if(body.n==='buyer_view')return m.choice==='none'&&m.action==='none';
 if(body.n==='buyer_result')return choices.includes(m.choice)&&m.action==='none';
 if(body.n==='buyer_next')return [...choices,'none'].includes(m.choice)&&['guide','cost','shop','share'].includes(m.action)&&(m.choice!=='none'||m.action==='share');
 return false;
}
