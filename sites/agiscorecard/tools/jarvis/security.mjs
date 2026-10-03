// Bounds apply to the actual stream, not just an untrusted Content-Length.
export async function boundedText(body,{maxBytes,timeoutMs,tooLarge,timeout,invalid}){
 if(!body)throw Error(invalid);
 const reader=body.getReader(),parts=[];let length=0,timer,finished=false;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(timeout)),timeoutMs);});
 try{
  while(true){
   const {done,value}=await Promise.race([reader.read(),deadline]);
   if(done){finished=true;break;}
   length+=value.byteLength;if(length>maxBytes)throw Error(tooLarge);parts.push(value);
  }
  const all=new Uint8Array(length);let at=0;for(const part of parts){all.set(part,at);at+=part.byteLength;}
  try{return new TextDecoder('utf-8',{fatal:true}).decode(all);}catch{throw Error(invalid);}
 }finally{
  clearTimeout(timer);
  // An uncooperative peer must not hold the request open through cancel().
  if(!finished)reader.cancel().catch(()=>{});
 }
}
export async function bodyOf(request,{timeoutMs=5000}={}){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw Error('invalid_request');
 const size=request.headers.get('content-length');if(size&&/^\d+$/.test(size)&&Number(size)>16000)throw Error('too_large');
 const text=await boundedText(request.body,{maxBytes:16000,timeoutMs,tooLarge:'too_large',timeout:'request_timeout',invalid:'invalid_request'});
 try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw Error('invalid_request');}
}
export function isJarvisPage(path){try{return /^\/(?:zh\/)?jarvis(?:\.html|\/)?$/.test(decodeURIComponent(path));}catch{return false;}}
export function secureJarvisPage(response,nonce){
 if(!/^[a-f0-9]{32}$/.test(nonce))throw Error('invalid_nonce');
 const headers=new Headers(response.headers);
 headers.set('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`);
 headers.set('X-Frame-Options','DENY');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');
 headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 // Each HTML response has a fresh nonce; conditional caches must not reuse it.
 headers.set('Cache-Control','no-store');for(const name of ['etag','last-modified','content-length'])headers.delete(name);
 return new Response(response.body,{status:response.status,headers});
}
