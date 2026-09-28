import {SIZES,sceneAt,caption,duration} from './video-core.mjs';
export const chooseMime=()=>typeof MediaRecorder==='undefined'?'':['video/mp4;codecs=avc1.42001f,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
const font='system-ui, -apple-system, "Noto Sans CJK SC", sans-serif';
function lines(ctx,text,width){
 const out=[];let line='';const tokens=text.replace(/[\r\n]+/g,' ').match(/[A-Za-z0-9]+(?:['’/-][A-Za-z0-9]+)*|\s+|[^\s]/gu)||[];
 for(const token of tokens){
  if(!line&&/^\s+$/.test(token))continue;
  if(line&&ctx.measureText(line+token).width>width){out.push(line.trimEnd());line='';}
  const part=line?token:token.trimStart();
  if(ctx.measureText(part).width>width){for(const ch of Array.from(part)){if(line&&ctx.measureText(line+ch).width>width){out.push(line);line='';}line+=ch;}}
  else line+=part;
 }
 if(line.trim())out.push(line.trimEnd());return out;
}
function fitText(ctx,text,x,y,width,height,max,weight=700){let size=max,a=[];for(;size>=10;size-=1){ctx.font=`${weight} ${size}px ${font}`;a=lines(ctx,text,width);if(a.length*size*1.28<=height)break;}ctx.textBaseline='top';a.forEach((s,i)=>ctx.fillText(s,x,y+i*size*1.28));return a.length*size*1.28;}
function sample(ctx,x,y,w,h,index){
 ctx.fillStyle=['#e8dfcb','#e2e4d9','#e4dcd0'][index];ctx.fillRect(x,y,w,h);const scale=Math.min(w/600,h/530);ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(scale,scale);
 ctx.fillStyle=['#e8dfcb','#e2e4d9','#e4dcd0'][index];ctx.fillRect(-300,-265,600,530);
 ctx.strokeStyle='#cec6b7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-300,155);ctx.lineTo(300,155);ctx.stroke();
 ctx.fillStyle='#cec4b3';ctx.beginPath();ctx.ellipse(5,146,206,20,0,0,Math.PI*2);ctx.fill();
 if(index===2){
  ctx.fillStyle='#efece6';ctx.beginPath();ctx.ellipse(-170,-151,45,33,-.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#bbb5a6';ctx.stroke();
  ctx.strokeStyle='#97826b';ctx.lineWidth=8;ctx.beginPath();ctx.arc(141,-171,18,0,Math.PI*2);ctx.moveTo(154,-157);ctx.lineTo(185,-125);ctx.lineTo(197,-134);ctx.moveTo(178,-132);ctx.lineTo(187,-143);ctx.stroke();
  ctx.fillStyle='#b77c56';ctx.save();ctx.translate(-15,-155);ctx.rotate(.1);ctx.fillRect(-42,-24,84,48);ctx.strokeStyle='#efe6d5';ctx.lineWidth=2;ctx.strokeRect(-34,-17,68,34);ctx.restore();
 }
 ctx.save();if(index===0)ctx.rotate(-.065);
 if(index===1){ctx.fillStyle='#20362f';ctx.beginPath();ctx.ellipse(0,-75,182,71,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f0eadb';ctx.fillRect(-95,-134,69,78);ctx.fillStyle='#ab7854';ctx.fillRect(45,-142,14,93);ctx.fillStyle='#7c9783';ctx.fillRect(72,-125,9,74);}
 ctx.fillStyle='#435d50';ctx.strokeStyle='#263e34';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-176,-88);ctx.quadraticCurveTo(0,index===1?-24:-112,176,-88);ctx.lineTo(190,116);ctx.quadraticCurveTo(185,139,159,142);ctx.lineTo(-158,142);ctx.quadraticCurveTo(-185,140,-190,118);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#8eaa96';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(-162,-67);ctx.lineTo(-174,113);ctx.quadraticCurveTo(-168,125,-153,125);ctx.lineTo(153,125);ctx.quadraticCurveTo(167,124,172,112);ctx.lineTo(161,-68);ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle='#bec3a5';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-166,-65);ctx.quadraticCurveTo(0,index===1?-10:-80,166,-65);ctx.stroke();
 ctx.strokeStyle='#e5d8b8';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(148,-67);ctx.lineTo(151,-34);ctx.lineTo(139,-31);ctx.lineTo(138,-57);ctx.stroke();
 ctx.fillStyle='#e8e3d6';ctx.fillRect(-53,18,112,55);ctx.fillStyle='#354b41';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 16px ${font}`;ctx.fillText('FIELD / 01',3,38);ctx.font=`10px ${font}`;ctx.fillText('EVERYDAY OBJECTS',3,58);
 ctx.strokeStyle='#263e34';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-185,-49);ctx.quadraticCurveTo(-230,-65,-219,-8);ctx.lineTo(-186,5);ctx.stroke();ctx.restore();ctx.restore();
}
export function drawDemoAsset(canvas,index=0){const ctx=canvas.getContext('2d',{alpha:false});sample(ctx,0,0,canvas.width,canvas.height,index);}
export function draw(canvas,p,assets,t=0,variant=0){const [w,h]=SIZES[p.ratio];if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d',{alpha:false}),{index,local}=sceneAt(p,t),land=w>h,pad=Math.round(Math.min(w,h)*.065);ctx.fillStyle='#f1efe8';ctx.fillRect(0,0,w,h);ctx.fillStyle='#171916';fitText(ctx,p.brand||'BPJ',pad,pad,w-pad*2,pad*.65,Math.round(pad*.55));
const x=pad,y=pad*2.1,iw=land?w*.54:w-pad*2,ih=land?h-pad*3.4:h*.51;ctx.fillStyle='#e2e3dc';ctx.fillRect(x,y,iw,ih);const a=assets[index];
if(a){const el=a.el,sw=el.videoWidth||el.naturalWidth,sh=el.videoHeight||el.naturalHeight,scale=Math.min(iw/sw,ih/sh)*(a.kind==='image'?.96+.04*(local/p.scenes[index].seconds):1);if(sw&&sh)ctx.drawImage(el,x+(iw-sw*scale)/2,y+(ih-sh*scale)/2,sw*scale,sh*scale);}else if(p.demo)sample(ctx,x,y,iw,ih,index);else{ctx.fillStyle='#555c50';fitText(ctx,p.lang==='zh'?'添加你的商品素材':'Add your product media',x+pad,y+ih/2-pad,iw-pad*2,pad*2,Math.round(pad*.55),500);}
const tx=land?w*.64:pad,ty=land?y+pad:y+ih+pad*.7,tw=land?w-tx-pad:w-pad*2,th=land?h-ty-pad*2.2:h-ty-pad*2.5;
ctx.fillStyle='#171916';fitText(ctx,caption(p,index,variant),tx,ty,tw,th,Math.round(Math.min(w,h)*.053));ctx.fillStyle=p.accent;ctx.fillRect(tx,h-pad*1.6,Math.min(tw,Math.max(24,tw*(t/duration(p)))),5);ctx.fillStyle='#52574b';fitText(ctx,p.name,tx,h-pad*1.25,tw,pad*.65,Math.round(pad*.42),500);
if(p.demo){ctx.fillStyle='#171916';ctx.fillRect(w-pad*3.3,pad*.7,pad*2.5,pad*.72);ctx.fillStyle='#fff';fitText(ctx,p.lang==='zh'?'虚构演示素材':'FICTIONAL DEMO',w-pad*3.12,pad*.86,pad*2.15,pad*.5,Math.round(pad*.28),600);}
}
export async function seekAssets(p,assets,time){const current=sceneAt(p,time);for(let i=0;i<assets.length;i++){const a=assets[i];if(a?.kind!=='video')continue;a.el.pause();const target=i===current.index?Math.min(current.local,Math.max(0,a.el.duration-.05)):0;if(Math.abs(a.el.currentTime-target)<.02&&a.el.readyState>=2)continue;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(Error('MEDIA')),8000);const done=err=>{clearTimeout(timer);a.el.removeEventListener('seeked',ok);a.el.removeEventListener('error',bad);err?reject(err):resolve();};const ok=()=>done(),bad=()=>done(Error('MEDIA'));a.el.addEventListener('seeked',ok,{once:true});a.el.addEventListener('error',bad,{once:true});a.el.currentTime=target;});}}
export async function record({canvas,p,assets,audioBuffer,signal,onProgress,variant=0}){const mime=chooseMime();if(!mime||!canvas.captureStream)throw Error('UNSUPPORTED');if(signal.aborted)throw Error('CANCELLED');await seekAssets(p,assets,0);draw(canvas,p,assets,0,variant);const stream=canvas.captureStream(30),parts=[];let audio,source,recorder,raf,timer,started,previous,active=-1,done=false,wake;
try{if(audioBuffer){audio=new AudioContext();await audio.resume();const destination=audio.createMediaStreamDestination();source=audio.createBufferSource();source.buffer=audioBuffer;source.connect(destination);for(const track of destination.stream.getAudioTracks())stream.addTrack(track);}recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000,audioBitsPerSecond:128000});
try{wake=await navigator.wakeLock?.request('screen');}catch{}
return await new Promise((resolve,reject)=>{const cleanup=()=>{cancelAnimationFrame(raf);clearTimeout(timer);document.removeEventListener('visibilitychange',hidden);signal.removeEventListener('abort',cancel);assets.forEach(a=>a?.kind==='video'&&a.el.pause());};const fail=code=>{if(done)return;done=true;cleanup();if(recorder.state!=='inactive')recorder.stop();reject(Error(code));};const cancel=()=>fail('CANCELLED'),hidden=()=>{if(document.hidden)fail('BACKGROUND');};signal.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',hidden);recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};recorder.onerror=()=>fail('RECORD');recorder.onstop=()=>{if(done)return;done=true;cleanup();const blob=new Blob(parts,{type:recorder.mimeType});if(blob.size<1000){reject(Error('RECORD'));return;}resolve({blob,extension:recorder.mimeType.startsWith('video/mp4')?'mp4':'webm'});};
const frame=now=>{if(done)return;if(previous&&now-previous>1800){fail('SLOW');return;}previous=now;const t=Math.min((now-started)/1000,duration(p)),s=sceneAt(p,t);if(s.index!==active){assets.forEach(a=>a?.kind==='video'&&a.el.pause());active=s.index;const a=assets[active];if(a?.kind==='video')a.el.play().catch(()=>fail('MEDIA'));}const a=assets[active];if(a?.kind==='video'&&a.el.error){fail('MEDIA');return;}if(a?.kind==='video'&&s.local<a.el.duration-.1&&s.local-a.el.currentTime>1.5){fail('SLOW');return;}draw(canvas,p,assets,t,variant);onProgress(t);if(t>=duration(p)){recorder.stop();cancelAnimationFrame(raf);return;}raf=requestAnimationFrame(frame);};
recorder.onstart=()=>{started=performance.now();previous=started;source?.start();raf=requestAnimationFrame(frame);};recorder.start(500);timer=setTimeout(()=>fail('SLOW'),duration(p)*1000+15000);if(document.hidden||signal.aborted)fail(signal.aborted?'CANCELLED':'BACKGROUND');});
}finally{try{source?.stop();}catch{}if(recorder&&recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop());if(audio)await audio.close();try{await wake?.release();}catch{}assets.forEach(a=>a?.kind==='video'&&a.el.pause());}}
