// learn worker 单测:假 D1 跑通 page_view 落表 jev / ci 排除 / 白名单 / pulse。
import worker from "../worker.js";
class FakeD1 { constructor(){ this.rows=[]; } prepare(sql){ const self=this; return { sql, args:[], bind(...a){ this.args=a; return this; }, async run(){ return self.exec(this.sql,this.args); }, async first(){ return self.exec(this.sql,this.args); }, async all(){ return { results: await self.exec(this.sql,this.args) }; } }; } async batch(s){ return s.map(()=>({})); }
  exec(sql,a){ if(/^CREATE/.test(sql)) return {}; if(sql.startsWith("INSERT INTO jev")) { this.rows.push(a); return {}; } if(sql.startsWith("INSERT INTO jua_audit")) return {}; if(sql.startsWith("SELECT '_total'")) return [{host:"_total", n: this.rows.filter(r=>r[0]==="page_view"&&r[5]==="human").length}]; throw new Error("unhandled "+sql.slice(0,40)); } }
const db=new FakeD1(); const waits=[]; const ctx={ waitUntil:p=>waits.push(p) };
const env={ EV:db, ASSETS:{ fetch: async ()=> new Response("<html>ok</html>", { headers:{ "content-type":"text/html" } }) } };
const call=(path,opts={})=>worker.fetch(new Request("https://fanzha.agiscorecard.com"+path,{ ...opts, headers:{ "content-type":"application/json", "user-agent":"Mozilla/5.0 test", ...(opts.headers||{}) } }),env,ctx);
let n=0; const ok=(c,m)=>{ n++; if(!c){ console.error("FAIL "+n+": "+m); process.exit(1);} console.log("ok   "+n+"  "+m); };
let r=await call("/ai-face-voice-scam"); await Promise.all(waits);
ok(r.status===200 && db.rows.some(x=>x[0]==="page_view"&&x[3]==="/ai-face-voice-scam"&&x[5]==="human"), "静态页透传 + page_view(human) 落 jev");
await call("/ai-face-voice-scam?ci=1"); await Promise.all(waits);
ok(db.rows.filter(x=>x[0]==="page_view"&&x[3]==="/ai-face-voice-scam").length===1, "?ci=1 不计");
await call("/e",{ method:"POST", body: JSON.stringify({ n:"tool_result", l:"check:red", p:"/check" }) }); await Promise.all(waits);
ok(db.rows.some(x=>x[0]==="tool_result"&&x[1]==="check:red"), "/e 白名单事件落库");
await call("/e",{ method:"POST", body: JSON.stringify({ n:"evil" }) }); await Promise.all(waits);
ok(!db.rows.some(x=>x[0]==="evil"), "非白名单丢弃");
const j=await call("/api/pulse").then(x=>x.json());
ok(j.ok===true && j.human_pv===1 && typeof j.ai_ref==="number", "/api/pulse 聚合");
console.log("\nall "+n+" assertions pass");
