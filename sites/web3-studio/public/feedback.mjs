// One request identity per set of choices in this tab, including uncertain retries.
export function feedbackSender(send=globalThis.fetch,uuid=()=>crypto.randomUUID()) {
 const attempts=new Map();
 return async choices=>{
  const fields=['frequency','usefulness','interest','ownCompleted','qa'];
  const payload=Object.fromEntries(fields.map(key=>[key,choices[key]]));
  const key=JSON.stringify(payload);
  let attempt=attempts.get(key);
  if(!attempt){attempt={id:uuid(),saved:false,pending:null};attempts.set(key,attempt);}
  if(attempt.saved)return;
  if(attempt.pending)return attempt.pending;
  attempt.pending=(async()=>{
   const response=await send('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:attempt.id,...payload})});
   if(!response.ok)throw Error('Feedback could not be saved. You can retry; every tool is still available.');
   const result=await response.json();
   if(result.saved!==true)throw Error('Feedback was not confirmed. Please retry.');
   attempt.saved=true;
  })();
  try{await attempt.pending;}finally{attempt.pending=null;}
 };
}
