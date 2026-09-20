export const VERSION='1.5.0';
export const LIMIT=131072;
export function parse(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMIT)throw Error('Use JSON smaller than 128 KiB.');
 let value;try{value=JSON.parse(text);}catch{throw Error('Invalid JSON. Check quotes, commas and brackets.');}
 const visit=(v,d)=>{if(d>12)throw Error('Input is nested too deeply.');if(typeof v==='number'&&(!Number.isFinite(v)||(Number.isInteger(v)&&!Number.isSafeInteger(v))))throw Error('Unsafe number. Use a decimal string for amounts.');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsupported object key.');visit(x,d+1);}};visit(value,0);return value;
}
export function shape(o,keys,label='Input'){if(!o||typeof o!=='object'||Array.isArray(o))throw Error(label+' must be an object.');for(const k of Object.keys(o))if(!keys.includes(k))throw Error(label+': unknown field '+k);for(const k of keys)if(!Object.hasOwn(o,k))throw Error(label+': missing '+k);return o;}
export function str(v,label,max=120){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(label+' must be nonempty text (max '+max+').');return v.trim();}
export function num(v,label,min=0,max=1e12){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(label+' must be a number from '+min+' to '+max+'.');return v;}
export function int(v,label,min=0,max=1e9){num(v,label,min,max);if(!Number.isSafeInteger(v))throw Error(label+' must be a whole number.');return v;}
export function bool(v,label){if(typeof v!=='boolean')throw Error(label+' must be true or false.');return v;}
export function choice(v,options,label){if(!options.includes(v))throw Error(label+' must be one of: '+options.join(', '));return v;}
export function list(v,label,max=200,min=0){if(!Array.isArray(v)||v.length<min||v.length>max)throw Error(label+' must contain '+min+'–'+max+' records.');return v;}
export function unique(rows,key,label){const seen=new Set();for(const row of rows){const k=key(row);if(seen.has(k))throw Error('Duplicate '+label+': '+k);seen.add(k);}}
export function day(v,label){str(v,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(label+' must be a real YYYY-MM-DD date.');return Date.parse(v);}
export function https(v,label){str(v,label,500);let u;try{u=new URL(v);}catch{throw Error(label+' must be an HTTPS source URL.');}if(u.protocol!=='https:'||u.username||u.password)throw Error(label+' must be an HTTPS source URL without credentials.');return v;}
export const SCALE=100000000n;
export function money(v,label='Amount'){if(typeof v!=='string'||!/^\d{1,12}(\.\d{1,8})?$/.test(v))throw Error(label+' must be a nonnegative decimal string, up to 12 whole and 8 fractional digits.');const[a,b='']=v.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'));}
export function decimal(v){const sign=v<0n?'-':'';v=v<0n?-v:v;const f=(v%SCALE).toString().padStart(8,'0').replace(/0+$/,'');return sign+(v/SCALE).toString()+(f?'.'+f:'');}
export const ceildiv=(a,b)=>b===0n?null:(a+b-1n)/b;
export const round=(v,n=6)=>Number(v.toFixed(n));
export const unit=v=>{str(v,'Currency',12);if(!/^[A-Z][A-Z0-9]{1,11}$/.test(v))throw Error('Currency must be an uppercase unit label.');return v;};
export function report(title,summary,metrics,tables,notes,data){return {version:VERSION,title,summary,metrics,tables,notes,data};}
export const table=(title,columns,rows)=>({title,columns,rows});
export const metric=(label,value)=>({label,value});
export function wilson(k,n){if(!n)return [null,null];const z=1.95996398454,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,w=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [round(Math.max(0,c-w)),round(Math.min(1,c+w))];}
