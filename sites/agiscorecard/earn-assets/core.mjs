export function parseVideo(value){
 let u;try{u=new URL(value.trim());}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 const host=u.hostname.toLowerCase();let id;
 if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})\/?$/)?.[1];
 else if(host==='youtu.be')id=u.pathname.slice(1);
 if(id&&/^[\w-]{11}$/.test(id))return {platform:'youtube',id,url:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=0'};
 if(['www.tiktok.com','tiktok.com'].includes(host)){const m=u.pathname.match(/^\/@([\w.-]{1,40})\/video\/(\d{15,25})\/?$/);if(m)return {platform:'tiktok',id:m[2],creator:'@'+m[1],url:'https://www.tiktok.com/@'+m[1]+'/video/'+m[2],embed:'https://www.tiktok.com/player/v1/'+m[2]+'?autoplay=0&controls=1&description=1&music_info=1'};}
 return null;
}
export function quote(values){
 const bounds={hours:[0,10000],rate:[0,100000],tools:[0,1000000],revisions:[0,10000],fee:[0,99],margin:[0,95],price:[0,10000000]};const v={};
 for(const [k,[min,max]]of Object.entries(bounds)){if(values[k]===''||values[k]===null||values[k]===undefined)throw Error('invalid');const n=Number(values[k]);if(!Number.isFinite(n)||n<min||n>max)throw Error('invalid');v[k]=n;}
 const cost=(v.hours+v.revisions)*v.rate+v.tools,denom=1-(v.fee+v.margin)/100;
 if(denom<=0)throw Error('margin');const floor=cost/(1-v.fee/100),target=cost/denom,contribution=v.price*(1-v.fee/100)-cost;
 return {cost,floor,target,contribution,margin:v.price?contribution/v.price*100:0};
}
export function safeFilename(id){return /^[a-z0-9-]+$/.test(id)?id:'project';}
