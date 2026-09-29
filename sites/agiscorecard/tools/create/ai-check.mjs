// One fixed, non-user inference through the same public bounded API. No quota bypass,
// publishing, analytics events or free-form user data in CI logs.
import {validateStory} from '../../create-assets/core.mjs';
const origin='https://agiscorecard.com';
const r=await fetch(origin+'/api/create',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'generate',lang:'en',consent:true,prompt:'Two fictional robots open a café on the moon. Write a short, warm, playful story with three decisions.'}),signal:AbortSignal.timeout(90000)});
const d=await r.json();if(!r.ok||!d.ok){console.log(JSON.stringify({http:r.status,code:d.code,stage:d.stage,reason:d.reason,provider_code:d.provider_code,detail:d.detail,shape:d.shape}));throw Error('Real Relay AI generation failed; binding presence is not proof of inference.');}
const s=validateStory(d.story);console.log(JSON.stringify({ok:true,model:d.model,rounds:s.rounds.length,endings:s.endings.length,language:s.lang}));
