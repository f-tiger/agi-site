import {track} from './telemetry.mjs?v=2026-09-27.2';
import {SUMMARY_SAMPLE,sentencesForSummary,speechHasSignal,subtitleFile} from './ai-core.mjs?v=2026-09-27.3';
import {imageHeader,fitImage} from './utility-core.mjs?v=2026-09-27.2';
const $=id=>document.getElementById(id),{task,ui,errors}=JSON.parse($('ai-copy').textContent);
const panel=$('ai-panel'),form=$('ai-form'),result=$('ai-result');
let worker=null,ready=false,busy=false,timer,serial=0,file=null,sample=false,duration=0;
const urls=new Set();
function status(text,error=false){$('ai-status').textContent=text;$('ai-status').classList.toggle('error',error);}
function sync(){panel.setAttribute('aria-busy',String(busy));for(const el of form.querySelectorAll('input,textarea,select,button'))el.disabled=busy;$('ai-load').disabled=busy||ready;$('ai-run').disabled=busy||!ready;$('ai-stop').disabled=!worker&&!busy;}
function resetResult(){result.replaceChildren();result.hidden=true;for(const u of urls)URL.revokeObjectURL(u);urls.clear();}
function stop(message=ui.stopped){serial++;clearTimeout(timer);if(worker)worker.terminate();worker=null;ready=false;busy=false;status(message);sync();}
function fail(code){clearTimeout(timer);busy=false;status(errors[code]||errors.inferenceError,true);sync();}
function deadline(){clearTimeout(timer);timer=setTimeout(()=>{stop(errors.timeout);$('ai-status').classList.add('error')},180000);}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function link(blob,name,label){const u=URL.createObjectURL(blob);urls.add(u);const a=node('a',ui.download+' '+label,'button');a.href=u;a.download=name;a.addEventListener('click',()=>{if(!sample)track('doc_ai_'+task+'_export')});return a;}
function show(out){
 resetResult();result.append(node('h2',ui.result));
 const actions=node('div',undefined,'actions');
 if(task==='portrait'){
  if(!(out.blob instanceof Blob)||out.blob.size===0)throw Error('result');
  const u=URL.createObjectURL(out.blob);urls.add(u);const img=node('img');img.src=u;img.alt=ui.preview;img.width=out.width;img.height=out.height;img.className='ai-cutout';result.append(img,node('p',`${out.width} × ${out.height} · ${ui.portraitDraft}`));actions.append(link(out.blob,'tds-portrait.png','PNG'));
 }else if(task==='speech'){
  result.append(node('p',ui.audioDraft),node('pre',out.text,'ai-transcript'));actions.append(link(new Blob([out.text.trim()+'\n'],{type:'text/plain;charset=utf-8'}),'tds-transcript.txt','TXT'));
  const srt=subtitleFile(out.chunks||[],duration);if(srt)actions.append(link(new Blob([srt],{type:'text/plain;charset=utf-8'}),'tds-subtitles.srt','SRT'));
 }else{
  result.append(node('p',ui.summaryDraft),node('h3',ui.output));const ol=node('ol');
  for(const row of out.highlights){const li=node('li',row.text+' '),a=node('a',ui.sentence+' '+row.sentence);a.href='#ai-sentence-'+row.sentence;li.append(a);ol.append(li);}result.append(ol);
  const details=node('details'),original=node('ol');details.open=true;details.append(node('summary',ui.source));for(let i=0;i<out.sentences.length;i++){const li=node('li',out.sentences[i]);li.id='ai-sentence-'+(i+1);original.append(li);}details.append(original);result.append(details);
  actions.append(link(new Blob([out.highlights.map(r=>`[${r.sentence}] ${r.text}`).join('\n\n')+'\n'],{type:'text/plain;charset=utf-8'}),'tds-extractive-summary.txt','TXT'));
 }
 result.append(actions);result.hidden=false;result.focus();track(`doc_ai_${task}_${sample?'sample':'complete'}`);
}
$('ai-load').addEventListener('click',()=>{
 if(!window.Worker||!window.WebAssembly){fail('unsupported');return;}
 resetResult();busy=true;ready=false;status(ui.working);sync();deadline();
 try{
  const instance=new Worker(new URL('./ai-worker.mjs?v=2026-09-27.3',import.meta.url),{type:'module'});worker=instance;sync();
  instance.onmessage=({data})=>{
   if(instance!==worker)return;
   if(data.type==='progress')status(ui.loading+': '+data.percent+'%');
   if(data.type==='inference')status(ui.working+' '+data.percent+'%');
   if(data.type==='ready'){clearTimeout(timer);ready=true;busy=false;status(ui.loaded);sync();}
   if(data.type==='result'){clearTimeout(timer);busy=false;sync();try{show(data.result);status(ui.done);}catch{fail('result');}}
   if(data.type==='error'){if(data.code==='loadError'){stop();}fail(data.code);}
  };
  instance.onerror=()=>{stop();fail('loadError');};instance.postMessage({action:'load',task});
 }catch{stop();fail('unsupported');}
});
$('ai-stop').addEventListener('click',()=>stop());
$('ai-clear').addEventListener('click',()=>{stop(ui.ready);resetResult();form.reset();file=null;sample=false;duration=0;if($('ai-selected'))$('ai-selected').textContent=ui.empty;});
form.addEventListener('input',event=>{if(event.target.id==='ai-text')sample=event.target.value===SUMMARY_SAMPLE;resetResult();});
$('ai-file')?.addEventListener('change',()=>{file=$('ai-file').files[0]||null;sample=false;resetResult();$('ai-selected').textContent=file?ui.selected+': '+file.name:ui.empty;});
$('ai-sample')?.addEventListener('click',()=>{resetResult();$('ai-text').value=SUMMARY_SAMPLE;sample=true;status(ui.sampleLabel);});
$('ai-audio-sample')?.addEventListener('click',async()=>{
 const run=++serial;resetResult();busy=true;sync();deadline();status(ui.working);
 try{const response=await fetch('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/fbe92bd97d48f3ec17779d8d8f2964e1c6bc7634/jfk.wav',{signal:AbortSignal.timeout(30000),referrerPolicy:'no-referrer'});if(!response.ok)throw Error('loadError');const blob=await response.blob();if(run!==serial)return;file=new File([blob],'public-speech-example.wav',{type:'audio/wav'});sample=true;$('ai-file').value='';$('ai-selected').textContent=ui.sampleLabel;status(ui.sampleLabel);}catch{if(run===serial)fail('loadError');}finally{if(run===serial){clearTimeout(timer);busy=false;sync();}}
});
async function portraitInput(){
 if(!file)throw Error('file');if(file.size>10*1024*1024)throw Error('imageLimit');
 try{
  const bytes=new Uint8Array(await file.arrayBuffer()),header=imageHeader(bytes);
  if(header.animated||header.width*header.height>20000000)throw Error('imageLimit');
  const bitmap=await createImageBitmap(file);
  try{if(bitmap.width*bitmap.height>20000000)throw Error('imageLimit');const size=fitImage(bitmap.width,bitmap.height,1600,1600),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,size.width,size.height);const pixels=ctx.getImageData(0,0,size.width,size.height).data.buffer;canvas.width=canvas.height=1;return {width:size.width,height:size.height,pixels};}finally{bitmap.close();}
 }catch{throw Error('imageLimit');}
}
async function audioInput(){
 if(!file)throw Error('file');if(file.size>10*1024*1024||!/(?:\.wav|\.mp3)$/i.test(file.name))throw Error('audioLimit');
 const audio=document.createElement('audio'),url=URL.createObjectURL(file);let context;
 try{
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('audioLimit')),15000);audio.onloadedmetadata=()=>{clearTimeout(t);resolve()};audio.onerror=()=>{clearTimeout(t);reject(Error('audioLimit'))};audio.preload='metadata';audio.src=url;});
  if(!Number.isFinite(audio.duration)||audio.duration>60||audio.duration<.1)throw Error('audioLimit');
  context=new AudioContext({sampleRate:16000});const decoded=await context.decodeAudioData(await file.arrayBuffer());
  if(decoded.duration>60||decoded.duration<.1||decoded.numberOfChannels>8)throw Error('audioLimit');
  const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const mono=(await offline.startRendering()).getChannelData(0);
  if(!speechHasSignal(mono))throw Error('audioSignal');duration=mono.length/16000;return {audio:mono.buffer};
 }finally{audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);if(context)await context.close();}
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!ready||busy)return;resetResult();busy=true;sync();status(ui.working);deadline();const run=++serial;
 try{
  let payload;if(task==='summary'){const text=$('ai-text').value;sentencesForSummary(text);payload={text,count:Number($('ai-count').value)};}else if(task==='portrait')payload=await portraitInput();else payload=await audioInput();
  if(run!==serial||!worker)return;
  worker.postMessage({action:'run',...payload},payload.pixels?[payload.pixels]:payload.audio?[payload.audio]:[]);
 }catch(e){if(run===serial)fail(e.message);}
});
window.addEventListener('pagehide',()=>{stop();resetResult()});sync();
