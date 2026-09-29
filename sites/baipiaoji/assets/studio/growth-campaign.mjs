// Runs only on two eligible pages AND a registered campaign link. No cookies,
// fingerprint, cross-site identifier or changes to account/legacy event tracking.
export function campaignInput(win, doc, script) {
  const url = new URL(win.location.href), params = url.searchParams;
  if (win.navigator.webdriver || win.navigator.doNotTrack==='1' || win.navigator.globalPrivacyControl || ['__ci','__probe','qa'].some(k=>params.has(k))) return null;
  const campaign = script?.dataset.bpjGrowth, source = params.get('utm_source');
  if (!campaign || params.get('utm_campaign')!==campaign || !script.dataset.growthSources.split(',').includes(source)) return null;
  let referrer_host = '';
  try { referrer_host = new URL(doc.referrer).hostname; } catch {}
  return {campaign,source,path:url.pathname,referrer_host};
}
export function officialTarget(href, base) {
  try {
    const u = new URL(href,base);
    return u.protocol==='https:' && !u.port && !u.username && !u.password &&
      (u.hostname==='aistudio.google.com' || (u.hostname==='ai.google.dev' && u.pathname.startsWith('/gemini-api/')));
  } catch { return false; }
}
export function startGrowthTracker(win, doc, script) {
  if (!['baipiaoji.com','www.baipiaoji.com'].includes(win.location.hostname)) return null;
  const input = campaignInput(win,doc,script);
  if (!input) return null;
  const now = Date.now(), key = 'bpj-growth-v1';
  let state;
  try { state=JSON.parse(win.sessionStorage.getItem(key)); } catch {}
  if (!state || !/^[a-f0-9]{32}$/.test(state.sid || '') || state.campaign!==input.campaign || state.source!==input.source || !Number.isFinite(state.started) || now-state.started>=1800000 || state.started>now) {
    const bytes = new Uint8Array(16); win.crypto.getRandomValues(bytes);
    state = {sid:[...bytes].map(n=>n.toString(16).padStart(2,'0')).join(''),started:now,campaign:input.campaign,source:input.source};
  }
  const persist = () => { try { win.sessionStorage.setItem(key,JSON.stringify(state)); } catch {} };
  persist();
  // Start is always replayed after a reload; the server deduplicates it. A lost
  // response can be retried without creating another arrival or action.
  let chain = Promise.resolve(), arrived=false, activeMs=0, last=Date.now(), qualified=!!state.qualified, acted=!!state.acted;
  const post = async kind => {
    const response = await win.fetch('/api/growth',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,sid:state.sid,kind})});
    const result = await response.json();
    if (!response.ok || !result.ok || !result.accepted || result.ignored) throw Error('measurement_unavailable');
  };
  const send = kind => {
    chain = chain.catch(()=>{}).then(async () => {
      if (Date.now()-state.started>=1800000) return;
      if (!arrived) {await post('arrival');arrived=true;}
      if (kind!=='arrival') await post(kind);
      if (kind==='qualified') state.qualified=true;
      if (kind==='official_click') {state.qualified=true;state.acted=true;}
      persist();
    });
    chain.catch(()=>{
      if (kind==='qualified') qualified=!!state.qualified;
      if (kind==='official_click') { acted=!!state.acted; qualified=!!state.qualified; }
    });
    return chain;
  };
  send('arrival');
  const tick = () => {
    const t=Date.now();
    if (doc.visibilityState==='visible') activeMs += Math.min(t-last,1500);
    last=t;
    if (!qualified && activeMs>=10000) {qualified=true;send('qualified');}
    if (Date.now()-state.started>=1800000) win.clearInterval(timer);
  };
  const timer=win.setInterval(tick,1000);
  doc.addEventListener('visibilitychange',()=>{last=Date.now();});
  doc.addEventListener('click',event=>{
    const a=event.target?.closest?.('a[href]');
    if (!event.isTrusted || doc.visibilityState!=='visible' || !a || acted || !officialTarget(a.href,win.location.href)) return;
    acted=true;qualified=true;send('official_click');
  });
  return {flush:()=>chain};
}
if (typeof window!=='undefined') startGrowthTracker(window,document,document.querySelector('script[data-bpj-growth]'));
