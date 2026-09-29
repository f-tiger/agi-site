// One fixed, non-user inference through the same public bounded API. No quota bypass,
// publishing, analytics events or free-form user data in CI logs.
import {validateStory,VERSION} from '../../create-assets/core.mjs';
const origin='https://agiscorecard.com';
for(const lang of ['en','zh']){
const started=Date.now();
const r=await fetch(origin+'/api/create',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'generate',lang,release:VERSION,consent:true,prompt:lang==='zh'?'两位虚构机器人在月球开了一家咖啡馆，请写一个温暖有趣的三轮选择故事。':'Two fictional robots open a café on the moon. Write a short, warm, playful story with three decisions.'}),signal:AbortSignal.timeout(90000)});
const d=await r.json();if(!r.ok||!d.ok){console.log(JSON.stringify({http:r.status,code:d.code,stage:d.stage,reason:d.reason,provider_code:d.provider_code,detail:d.detail,field:d.field,shape:d.shape}));throw Error('Real Relay AI generation failed; binding presence is not proof of inference.');}
const s=validateStory(d.story);if(lang==='zh'&&!/[\u4e00-\u9fff]/u.test(s.title+s.intro))throw Error('Chinese request did not produce Chinese story text.');console.log(JSON.stringify({ok:true,model:d.model,rounds:s.rounds.length,endings:s.endings.length,language:s.lang,language_checked:true,elapsed_ms:Date.now()-started}));

}
