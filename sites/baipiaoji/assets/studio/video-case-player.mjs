import {CASES,caseByID,caseProject} from './video-cases.mjs';
import {SIZES,duration,brief,csv,srt,zip} from './video-core.mjs';
import {draw,drawDemoAsset} from './video-render.mjs';

const $=id=>document.getElementById('vc-'+id),lang=document.documentElement.lang.startsWith('zh')?'zh':'en',zh=lang==='zh';
const qa=new URLSearchParams(location.search).has('__ci');
let selected=CASES[0],p,variant=0,time=0,playing=false,raf,downloadURL;
const track=action=>{if(!qa&&window.bpjEv)window.bpjEv('calc','/video/case-'+action);};
const stamp=s=>'0:'+String(Math.floor(s)).padStart(2,'0');
function stop(){playing=false;cancelAnimationFrame(raf);$('play').textContent=zh?'播放 9 秒示范':'Play the 9-second example';}
function links(){
 const q=new URL(location.href);q.searchParams.set('case',selected.id);q.searchParams.set('ratio',p.ratio);q.searchParams.set('opening',String(variant));history.replaceState(null,'',q);
 const u=new URL((zh?'':'/en')+'/studio/video-variants',location.origin);
 for(const key of ['case','ratio','opening'])u.searchParams.set(key,q.searchParams.get(key));if(qa)u.searchParams.set('__ci','1');
 $('start').href=u.href;$('start').dataset.videoAction='case-start-'+selected.id;
}
function paint(){draw($('canvas'),p,[null,null,null],time,variant);$('frame').dataset.ratio=p.ratio;$('scrub').value=String(time);$('time').textContent=stamp(time)+' / '+stamp(duration(p));}
function choose(id,options={}){
 stop();selected=caseByID(id)||CASES[0];p=caseProject(selected.id,lang);const c=selected[lang];
 variant=[0,1,2].includes(options.variant)?options.variant:selected.variant;if(Object.hasOwn(SIZES,options.ratio||''))p.ratio=options.ratio;time=0;
 for(const key of ['title','task','input','output','change','next'])$(key).textContent=c[key];
 $('ratio').value=p.ratio;$('hook').textContent=p.hooks[variant];
 document.querySelectorAll('[data-video-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.videoCase===selected.id)));
 document.querySelectorAll('[data-case-variant]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.caseVariant)===variant)));
 paint();links();
}
document.querySelectorAll('[data-video-case]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.videoCase);track('select-'+selected.id);}));
document.querySelectorAll('[data-case-variant]').forEach(b=>b.addEventListener('click',()=>{stop();variant=Number(b.dataset.caseVariant);time=0;document.querySelectorAll('[data-case-variant]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('hook').textContent=p.hooks[variant];paint();links();track('opening-'+selected.id);}));
$('ratio').addEventListener('change',()=>{stop();if(Object.hasOwn(SIZES,$('ratio').value))p.ratio=$('ratio').value;paint();links();track('format-'+selected.id);});
$('scrub').addEventListener('input',()=>{stop();time=Number($('scrub').value);paint();});
$('play').addEventListener('click',()=>{
 if(playing){stop();return;}if(time>=duration(p))time=0;const offset=time,start=performance.now();playing=true;$('play').textContent=zh?'暂停示范':'Pause example';track('play-'+selected.id);
 const frame=now=>{if(!playing)return;time=Math.min(duration(p),offset+(now-start)/1000);paint();if(time>=duration(p))stop();else raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
$('pack').addEventListener('click',async()=>{
 $('pack').disabled=true;
 try{
  const snapshot=structuredClone(p),id=selected.id;
  const pack=await zip([{name:'project.json',data:JSON.stringify(snapshot,null,2)},{name:'shot-brief.md',data:brief(snapshot)},{name:'versions.csv',data:csv(snapshot)},...snapshot.hooks.map((_,i)=>({name:'opening-'+String.fromCharCode(65+i)+'.srt',data:srt(snapshot,i)}))]);
  if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(pack);const a=document.createElement('a');a.href=downloadURL;a.download='bpj-demo-'+id+'-project.zip';a.textContent=a.download;$('download').replaceChildren(a);a.click();track('download-'+id);
 }catch{$('download').textContent=zh?'下载未完成，请在工作台打开此案例后重试。':'Download did not finish. Open this example in the editor and try again.';}finally{$('pack').disabled=false;}
});
document.querySelectorAll('[data-case-input]').forEach(c=>drawDemoAsset(c,Number(c.dataset.caseInput)));
const q=new URLSearchParams(location.search);choose(q.get('case'),{ratio:q.get('ratio'),variant:q.has('opening')?Number(q.get('opening')):undefined});
