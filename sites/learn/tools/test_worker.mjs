// learn worker 单测:假 D1 跑通 page_view 落表 lev / ci 排除 / 白名单 / pulse。
import worker from "../worker.js";
class FakeD1 { constructor(){ this.rows=[]; } prepare(sql){ const self=this; return { sql, args:[], bind(...a){ this.args=a; return this; }, async run(){ return self.exec(this.sql,this.args); }, async first(){ return self.exec(this.sql,this.args); }, async all(){ return { results: await self.exec(this.sql,this.args) }; } }; } async batch(s){ return s.map(()=>({})); }
  exec(sql,a){ if(/^CREATE/.test(sql)) return {}; if(sql.startsWith("INSERT INTO lev")) { this.rows.push(a); return {}; } if(sql.startsWith("INSERT INTO lua_audit")) return {}; if(sql.startsWith("SELECT '_total'")) return [{host:"_total", n: this.rows.filter(r=>r[0]==="page_view"&&r[5]==="human").length}]; if(sql.startsWith("SELECT COUNT(*) n FROM lev WHERE label")) return { n: this.rows.filter(r=>r[1]===a[0]).length }; if(sql.startsWith("SELECT ref AS host")) { const g={}; for(const r of this.rows) if(r[0]==="page_view"&&r[5]==="human"){ const k=r[4]||""; g[k]=(g[k]||0)+1; } return Object.entries(g).map(([host,n])=>({host,n})); } throw new Error("unhandled "+sql.slice(0,40)); } }
const db=new FakeD1(); const waits=[]; const ctx={ waitUntil:p=>waits.push(p) };
const env={ EV:db, ASSETS:{ fetch: async ()=> new Response("<html>ok</html>", { headers:{ "content-type":"text/html" } }) } };
const call=(path,opts={})=>worker.fetch(new Request("https://learn.agiscorecard.com"+path,{ ...opts, headers:{ "content-type":"application/json", "user-agent":"Mozilla/5.0 test", ...(opts.headers||{}) } }),env,ctx);
let n=0; const ok=(c,m)=>{ n++; if(!c){ console.error("FAIL "+n+": "+m); process.exit(1);} console.log("ok   "+n+"  "+m); };
let r=await call("/kids-coding"); await Promise.all(waits);
ok(r.status===200 && db.rows.some(x=>x[0]==="page_view"&&x[3]==="/kids-coding"&&x[5]==="human"), "静态页透传 + page_view(human) 落 lev");
await call("/kids-coding?ci=1"); await Promise.all(waits);
ok(db.rows.filter(x=>x[0]==="page_view"&&x[3]==="/kids-coding").length===1, "?ci=1 不计");
await call("/e",{ method:"POST", body: JSON.stringify({ n:"tool_result", l:"worth:12", p:"/worth" }) }); await Promise.all(waits);
ok(db.rows.some(x=>x[0]==="tool_result"&&x[1]==="worth:12"), "/e 白名单事件落库");
await call("/e",{ method:"POST", body: JSON.stringify({ n:"evil" }) }); await Promise.all(waits);
ok(!db.rows.some(x=>x[0]==="evil"), "非白名单丢弃");
const j=await call("/api/pulse").then(x=>x.json());
ok(j.ok===true && j.human_pv===1 && typeof j.ai_ref==="number", "/api/pulse 聚合");
await call("/e",{ method:"POST", body: JSON.stringify({ n:"tool_result", l:"__ci", p:"/__ci" }) }); await Promise.all(waits);
const st=await call("/api/selftest?label=__ci").then(x=>x.json());
ok(st.ok===true && st.n>=1, "/api/selftest 读回信标真值(证明 /e → D1 没断)");
// 渠道构成(2026-09-15 舰队相互学习):用真实 Referer 头驱动 worker,断言的是分桶结果,
// 不是「有这个字段」。分类表见 tools/fleet/ref_sources.txt(唯一权威,逐字断言在 check_ref_sources.py)。
const before=(await call("/api/pulse").then(x=>x.json())).human_pv;
for (const ref of ["https://www.google.com/search?q=x","https://www.google.com/","https://chatgpt.com/",
                   "https://play.agiscorecard.com/","https://learn.agiscorecard.com/details","https://netflix.com/"]) {
  await call("/", { headers: { referer: ref } });
}
await Promise.all(waits);
const p2=await call("/api/pulse").then(x=>x.json());
ok(p2.by_source.search===2 && p2.by_search["google.com"]===2, "google 两次计入 search");
ok(p2.by_source.ai===1, "chatgpt 计入 ai");
ok(p2.by_source.fleet===1 && p2.by_fleet["play.agiscorecard.com"]===1, "兄弟子站计 fleet");
ok(p2.by_source.self===1, "本域跳转计 self,不污染 fleet");
ok(p2.by_source.other===1, "netflix.com 计 other —— 裸 includes 会把它误判成 x.com(social)");
ok(p2.by_other && p2.by_other["netflix.com"] === 1, "by_other 记下是哪个域链过来的 —— 舰队第一方外链监测靠它");
ok(p2.by_source.direct===before, "无 referer 的旧行仍在 direct");
ok(Object.values(p2.by_source).reduce((a,b)=>a+b,0)===p2.human_pv, "分桶之和 = human_pv");
// D1 读预算(2026-09-26):/api/pulse 经 cachedJson 从 Cache API 出。装一个假 caches 全局断言三件事:
// ①第一次算完会 put(经 ctx.waitUntil);②第二次直接命中,不再打 D1;③错误响应不入缓存且带 no-store。
{
  const store = new Map(); let puts = 0;
  globalThis.caches = { default: { async match(k) { return store.get(k.url); }, async put(k, r) { puts++; store.set(k.url, r); } } };
  const origExec = db.exec.bind(db); let scans = 0;
  db.exec = (sql, a) => { if (sql.startsWith("SELECT ref AS host")) scans++; return origExec(sql, a); };
  const r1 = await call("/api/pulse"); await Promise.all(waits);
  ok(r1.status === 200 && r1.headers.get("cache-control") === "public, max-age=3600" && scans === 1 && puts === 1, "pulse 首次:打一次 D1 并写入 Cache API");
  const r2 = await call("/api/pulse"); const j2 = await r2.json();
  ok(r2.headers.get("x-fleet-cache") === "store" && scans === 1 && j2.ok === true && j2.human_pv === p2.human_pv, "pulse 二次:直接命中缓存,D1 扫描次数不变,数字相同");
  store.clear();
  db.exec = (sql, a) => { if (sql.startsWith("SELECT ref AS host")) throw new Error("d1 down"); return origExec(sql, a); };
  const r3 = await call("/api/pulse"); await Promise.all(waits);
  ok(r3.status === 500 && r3.headers.get("cache-control") === "no-store" && store.size === 0, "pulse 出错:500 带 no-store,不入缓存");
  db.exec = origExec; delete globalThis.caches;
}
console.log("\nall "+n+" assertions pass");
