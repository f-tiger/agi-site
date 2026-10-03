import {parseObject} from '../../jarvis-assets/core.mjs';

export function modelOutput(value,maxTokens){
 const choice=value?.choices?.[0];
 const raw=value?.response??choice?.message?.content;
 const type=raw===null?'null':Array.isArray(raw)?'array':typeof raw;
 let chars=0,object=null;
 try{chars=(typeof raw==='string'?raw:JSON.stringify(raw))?.length||0;object=parseObject(raw);}catch{}
 // Only fixed labels/counts: never persist raw model text or arbitrary keys in diagnostics.
 const reason=choice?.finish_reason??value?.finish_reason;
 return {raw,diagnostic:{envelope:value?.response!==undefined?'response':choice?'choices':'unknown',type,characters:chars,jsonObject:!!object&&typeof object==='object'&&!Array.isArray(object),reportFields:['summary','findings','nextActions','uncertainties'].filter(k=>Object.hasOwn(object||{},k)),finishReason:['stop','length','tool_calls','content_filter'].includes(reason)?reason:'unknown',atTokenLimit:Number(value?.usage?.completion_tokens)>=maxTokens}};
}
