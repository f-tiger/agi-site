import {AI_MODELS,sentencesForSummary,selectHighlights,speechHasSignal} from './ai-core.mjs?v=2026-09-27.3';
let pipe,task,busy=false;
self.onmessage=async({data})=>{
 if(busy)return;
 busy=true;
 try{
  if(data.action==='load'){
   if(!Object.hasOwn(AI_MODELS,data.task))throw Error('result');
   task=data.task;
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
   env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
   const m=AI_MODELS[task];
   pipe=await pipeline(m.task,m.id,{revision:m.revision,dtype:m.dtype,device:'wasm',progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'progress',percent:Math.round(p.progress||0)});}});
   self.postMessage({type:'ready'});
  }else if(data.action==='run'&&pipe){
   let result;
   if(task==='summary'){
    const sentences=sentencesForSummary(data.text);
    // Never silently truncate a long sentence at the model's 256-token limit.
    for(const sentence of sentences){if(pipe.tokenizer.encode(sentence).length>256)throw Error('tokenLimit');}
    const vectors=[];
    for(let i=0;i<sentences.length;i++){
     const tensor=await pipe(sentences[i],{pooling:'mean',normalize:true});vectors.push(tensor.tolist()[0]);tensor.dispose();
     self.postMessage({type:'inference',percent:Math.round((i+1)/sentences.length*100)});
    }
    result={highlights:selectHighlights(sentences,vectors,Number(data.count)),sentences};
   }else if(task==='portrait'){
    const {RawImage}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
    const image=new RawImage(new Uint8ClampedArray(data.pixels),data.width,data.height,4);
    const [output]=await pipe(image);result={blob:await output.toBlob('image/png'),width:output.width,height:output.height};
   }else{
    const audio=new Float32Array(data.audio);
    if(audio.length>16000*60||!speechHasSignal(audio))throw Error('audioSignal');
    result=await pipe(audio,{return_timestamps:true,chunk_length_s:30,stride_length_s:5,max_new_tokens:256});
    if(!result.text?.trim())throw Error('audioSignal');
   }
   self.postMessage({type:'result',result});
  }
 }catch(error){self.postMessage({type:'error',code:['textLimit','sentenceLimit','tokenLimit','audioSignal','result'].includes(error.message)?error.message:(pipe?'inferenceError':'loadError')});}
 finally{busy=false;}
};
