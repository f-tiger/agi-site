// Model revisions are pinned. Inference runs inside a user-started Web Worker.
export const AI_TOOLS=Object.freeze({portrait:'ai-portrait-background-remover',speech:'ai-audio-to-text',summary:'ai-text-summarizer'});
export const AI_MODELS=Object.freeze({
 portrait:{id:'Xenova/modnet',revision:'fa2fa546052fba4c08921230a26cc69a333fca12',task:'background-removal',dtype:'q8',weights:6632188},
 speech:{id:'Xenova/whisper-tiny.en',revision:'79fb389fc764e7c395bd330e9531d9d32ada7049',task:'automatic-speech-recognition',dtype:'q8',weights:40852295},
 summary:{id:'Xenova/all-MiniLM-L6-v2',revision:'751bff37182d3f1213fa05d7196b954e230abad9',task:'feature-extraction',dtype:'q8',weights:22972370},
});
export const SUMMARY_SAMPLE='Our library will open a quiet study room next month. The new room will provide twenty desks and reliable Wi-Fi for local students. Visitors can reserve a desk online for up to two hours each day. The library will keep its existing opening hours. Volunteers will offer a weekly workshop on finding trustworthy research sources. The workshop is free, but visitors need to book a place. Staff will review feedback after three months before deciding whether to add more desks.';
export function sentencesForSummary(text){
 if(typeof text!=='string'||text.trim().length<80||text.length>12000)throw Error('textLimit');
 const sentences=Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(text.trim()),s=>s.segment.trim()).filter(Boolean);
 if(sentences.length<3||sentences.length>60)throw Error('sentenceLimit');
 return sentences;
}
export function selectHighlights(sentences,vectors,count){
 if(![3,5].includes(count)||sentences.length!==vectors.length||!vectors.length||!vectors[0]?.length)throw Error('result');
 const dims=vectors[0].length;
 if(vectors.some(v=>v.length!==dims||v.some(n=>!Number.isFinite(n))))throw Error('result');
 const norm=v=>{const length=Math.hypot(...v);if(!length)throw Error('result');return v.map(x=>x/length)};
 const vv=vectors.map(norm),center=norm(vv[0].map((_,i)=>vv.reduce((n,v)=>n+v[i],0)/vv.length));
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),chosen=[];
 for(let k=0;k<Math.min(count,sentences.length-1);k++){
  let best=-1,score=-Infinity;
  for(let i=0;i<sentences.length;i++)if(!chosen.includes(i)){
   const rank=.7*dot(vv[i],center)-.3*(chosen.length?Math.max(...chosen.map(j=>dot(vv[i],vv[j]))):0);
   if(rank>score){score=rank;best=i;}
  }
  chosen.push(best);
 }
 return chosen.sort((a,b)=>a-b).map(i=>({sentence:i+1,text:sentences[i]}));
}
export function speechHasSignal(samples){let total=0;for(const x of samples){if(!Number.isFinite(x))return false;total+=x*x;}return samples.length>=1600&&Math.sqrt(total/samples.length)>.003;}
export function subtitleFile(chunks,duration){
 const stamp=n=>{const ms=Math.round(Math.max(0,n)*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`};
 return chunks.filter(c=>c.text?.trim()&&Number.isFinite(c.timestamp?.[0])).map((c,i)=>`${i+1}\n${stamp(Math.min(duration,c.timestamp[0]))} --> ${stamp(Math.min(duration,Math.max(c.timestamp[0],Number.isFinite(c.timestamp[1])?c.timestamp[1]:duration)))}\n${c.text.trim().replace(/\r?\n/g,' ')}\n`).join('\n');
}
