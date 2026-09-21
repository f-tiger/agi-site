// Scenario math only: this does not quote a live rate, execute a payment, or recommend a rail.
const fields=['asset','amount','fixedFee','percentFee','fxSpread','retryRate','settlementFee'];
const number=(v,name,min,max)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(name+' is outside the supported range.');return n;};
export function parseFinanceScenario(raw={}){
 const asset=typeof raw.asset==='string'&&/^[A-Z0-9-]{2,12}$/.test(raw.asset)?raw.asset:'USDC';
 return {asset,amount:number(raw.amount??1000,'Amount',0.01,1e9),fixedFee:number(raw.fixedFee??0.3,'Fixed fee',0,1e5),percentFee:number(raw.percentFee??0.4,'Percentage fee',0,100),fxSpread:number(raw.fxSpread??0.2,'FX spread',0,100),retryRate:number(raw.retryRate??1,'Retry rate',0,100),settlementFee:number(raw.settlementFee??0.05,'Settlement fee',0,1e5)};
}
export function calculateFinanceScenario(raw){
 const s=parseFinanceScenario(raw),fee=s.fixedFee+s.amount*s.percentFee/100,fxCost=s.amount*s.fxSpread/100,retryCost=(s.amount+fee+fxCost)*s.retryRate/100,total=s.amount+fee+fxCost+retryCost+s.settlementFee;
 return {...s,fee,fxCost,retryCost,total,extraCost:total-s.amount,extraPercent:(total/s.amount-1)*100};
}
function encode(value){const bytes=new TextEncoder().encode(JSON.stringify(value)),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0;out+=chars[a>>2]+chars[((a&3)<<4)|(b>>4)]+(i+1<bytes.length?chars[((b&15)<<2)|(c>>6)]:'=')+(i+2<bytes.length?chars[c&63]:'=');}return out.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(value){const s=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4),bin=atob(s);return JSON.parse(new TextDecoder().decode(new Uint8Array([...bin].map(c=>c.charCodeAt(0)))));}
export function financeShareUrl(origin,scenario){return origin+'/market.html?finance='+encode(parseFinanceScenario(scenario));}
export function decodeFinanceShare(value){if(typeof value!=='string'||value.length>1200)throw Error('Invalid finance scenario link.');return parseFinanceScenario(decode(value));}
