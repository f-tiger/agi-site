// Private moderation queue. Public submissions never create public catalogue entries.
export async function onRequestPost({request,env}) {
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({ok:false,code:'origin'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return reply({ok:false,code:'type'},415);
  try {
    const text=await request.text();if(text.length>6000)return reply({ok:false,code:'large'},413);
    let b;try{b=JSON.parse(text);}catch{return reply({ok:false,code:'invalid'},400);}
    if(!b||typeof b!=='object'||Array.isArray(b))return reply({ok:false,code:'invalid'},400);
    if(b.website)return reply({ok:true,code:'ok'});
    const kind=b.kind,name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),note=String(b.note||'').trim();
    if(!['submit','cooperate','correction'].includes(kind)||!name||name.length>80||note.length>1500||email.length>254||!note)return reply({ok:false,code:'fields'},400);
    if((kind==='cooperate'&&!email)||(email&&!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)))return reply({ok:false,code:'email'},400);
    let url;try{const u=new URL(String(b.url||''));if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.href.length>600)throw Error();url=u.href;}catch{return reply({ok:false,code:'url'},400);}
    if(b.consent!==true)return reply({ok:false,code:'consent'},400);
    await env.HITS.prepare("CREATE TABLE IF NOT EXISTS manju_inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', note TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', UNIQUE(kind,url,email,created))").run();
    // Check the real D1 schema without creating an invented lead.
    if(new URL(request.url).searchParams.get('qa')==='1')return reply({ok:true,code:'validated',persisted:false,schemaReady:true});
    const result=await env.HITS.prepare('INSERT OR IGNORE INTO manju_inquiries (kind,name,url,email,note,created) VALUES (?,?,?,?,?,?)').bind(kind,name,url,email,note,new Date().toISOString().slice(0,10)).run();
    return reply({ok:true,code:result.meta?.changes===0?'already':'ok'});
  } catch {return reply({ok:false,code:'unavailable'},503);}
}
