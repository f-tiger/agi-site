// Fixed public guide paths and merchant hosts. Never include user inputs or searches.
export const MARKET_PATHS=Object.freeze({
 '/uk/':'uk','/uk/storage-boxes':'uk','/uk/indoor-laundry':'uk','/uk/smart-plugs':'uk',
 '/nl/':'nl','/nl/opbergboxen':'nl','/nl/binnenklimaat':'nl','/nl/slimme-stekkers':'nl'
});
export const MARKET_HOSTS=Object.freeze({uk:'amazon.co.uk',nl:'amazon.nl'});
export const MARKET_SOURCE_HOSTS=Object.freeze(['www.reallyusefulproducts.co.uk','www.ikea.com','www.which.co.uk','www.consumentenbond.nl','www.milieucentraal.nl','www.meaco.com','www.meaco.nl','eu.switch-bot.com','www.tapo.com','www.tp-link.com']);
export const MARKET_EVENTS=Object.freeze(['market_shop_click','market_source_click']);
export function marketMeasurement(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['p','e','r'].includes(k))||!Object.hasOwn(MARKET_PATHS,body.p)||!MARKET_EVENTS.includes(body.e))return null;
 let u;try{u=new URL(body.r);}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)return null;
 const ok=body.e==='market_shop_click'?u.hostname===MARKET_HOSTS[MARKET_PATHS[body.p]]:MARKET_SOURCE_HOSTS.includes(u.hostname);
 return ok?{ref:u.hostname}:null;
}
