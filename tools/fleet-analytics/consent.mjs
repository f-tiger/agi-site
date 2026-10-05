// One optional Google channel for every public template; first-party callbacks remain independent.
// The Google tag runs in an empty frame, not alongside user forms or file inputs.
const {campaignFields} = await import('./campaign.mjs' + new URL(import.meta.url).search);
const {affiliateAction, legacyEvent} = await import('./legacy.mjs' + new URL(import.meta.url).search);
const script = document.querySelector('script[data-ga4-id][data-ga4-host]');
const id = script?.dataset.ga4Id, host = script?.dataset.ga4Host;
const query = new URLSearchParams(location.search);
const excluded = !/^G-[A-Z0-9]+$/.test(id || '') || location.hostname !== host || window.top !== window.self ||
  ['ci','__ci','__probe'].some(k => query.has(k)) || query.has('qa') || query.has('__qa') || query.get('utm_source') === 'verify' || location.pathname.startsWith('/__ci') ||
  navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const key = host === 'thedollscout.com' ? 'tds_analytics_choice_v1' : 'fleet_ga4_choice_v1';
const {businessEvent} = await import('./business.mjs' + new URL(import.meta.url).search);
const copy = {
 en:['Disable analytics','Enable analytics'], zh:['关闭访问统计','开启访问统计'],
 de:['Analyse deaktivieren','Analyse aktivieren'], it:['Disattiva statistiche','Attiva statistiche'],
 fr:['Désactiver les statistiques','Activer les statistiques'], es:['Desactivar estadísticas','Activar estadísticas']
};
// Default on for new visitors; preserve an explicit existing opt-out.
let choice = 'granted';
try { if (localStorage.getItem(key) === 'denied') choice = 'denied'; } catch {}
let frame, frameData, pageViewSent = false, ready = false;
const sentActions = new Set(), pending = [];
function accept(detail) {
 if (excluded || choice !== 'granted' || !frame) return;
 const action = businessEvent(host, new URL(canonical).pathname, detail);
 if (!action || (!action.repeat && (sentActions.has(action.name) || pending.some(p => p.key === action.name)))) return;
 if (!ready) { if (pending.length < 100) pending.push({key:action.name, detail:{name:detail.name}}); }
 else { sentActions.add(action.name); frame.contentWindow.postMessage({type:'fleet-ga4-business',detail:{name:detail.name}},'https://'+host); }
}
const canonical = script?.dataset.ga4Page;
function start() {
  if (excluded || frame || choice !== 'granted' || !canonical) return;
  const url = new URL(canonical);
  if (url.hostname !== host || url.protocol !== 'https:') return;
  url.search = ''; url.hash = '';
  let referrer = '';
  try { referrer = new URL(document.referrer).origin + '/'; } catch {}
  frameData = { id, host, page:url.href, title:script.dataset.ga4Title, referrer, sendPageView:!pageViewSent, campaign:campaignFields(query) };
  frame = document.createElement('iframe');
  frame.hidden = true; frame.setAttribute('aria-hidden', 'true'); frame.title = 'Optional analytics';
  frame.referrerPolicy = 'no-referrer';
  // Only sanitized, build-time public metadata crosses into the empty frame.
  // The AGI edge collector explicitly excludes this internal asset from D1 counts.
  frame.src = 'https://' + host + '/analytics-assets/frame.html' + new URL(script.src).search;
  document.body.append(frame);
  pageViewSent = true;
}
function stop() {
  ready = false; pending.length = 0;
  if (frame) {
    try { frame.contentWindow['ga-disable-' + id] = true; } catch {}
    frame.remove(); frame = null;
  }
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (!/^_ga(?:_|$)/.test(name) && !name.startsWith('fleet_'+host.replaceAll('.','_')+'_')) continue;
    for (const domain of ['', '; domain=' + host, '; domain=.' + host]) document.cookie = name + '=; Max-Age=0; path=/' + domain;
  }
}
if (!excluded && !document.getElementById('fleet-analytics-settings')) {
  window.addEventListener('fleet:business', event => accept(event.detail));
  // Legacy gtag calls continue through their existing D1 wrappers. Listen to the
  // queue only for NEW fixed actions; never replay pre-consent dataLayer entries.
  window.dataLayer = window.dataLayer || [];
  const push = window.dataLayer.push;
  window.dataLayer.push = function (...entries) {
    for (const args of entries) if (args?.[0] === 'event' && legacyEvent(host, new URL(canonical).pathname, args[1])) accept({name:'legacy:'+args[1]});
    return push.apply(this, entries);
  };
  if (!window.gtag) window.gtag = function () { window.dataLayer.push(arguments); };
  if (!window.dsTrack && host === 'thedollscout.com') window.dsTrack = (name) => accept({name:'legacy:'+name});
  // One capture listener owns GA4 affiliate clicks. Older gtag affiliate calls
  // are intentionally NOT mirrored, eliminating local/global listener doubles.
  document.addEventListener('click', event => {
    if (event.isTrusted === false) return;
    const a=event.target?.closest?.('a[href]');if(!a)return;
    const selectors=[['#eb-herbst','home-herbst'],['#eb-rising','home-rising'],['[data-eb-tp]','toppick'],['#eb-models','models'],['#eb-ac-finder','ac-finder'],['.eb-shop-grid','grid'],['#eb-seal-fit, #eb-heater-cost, [data-tool]','tool'],['.notice-bar','notice-bar'],['.hero','hero'],['.card','card'],['article','article']];
    const placement=selectors.find(([selector])=>a.closest(selector))?.[1]||'other';
    const action=affiliateAction(a.href,placement);if(action)accept(action);
  },true);
  window.addEventListener('message', event => {
    if (choice === 'granted' && frame && event.source === frame.contentWindow && event.origin === 'https://'+host && event.data?.type === 'fleet-ga4-started') {
      ready = true;
      for (const {key:name,detail} of pending) { sentActions.add(name); frame.contentWindow.postMessage({type:'fleet-ga4-business',detail},'https://'+host); }
      pending.length = 0;
    }
    if (choice === 'granted' && frame && event.source === frame.contentWindow && event.origin === 'https://'+host && event.data?.type === 'fleet-ga4-ready') {
      frame.contentWindow.postMessage({type:'fleet-ga4-page',data:frameData},'https://'+host);
    }
  });
  const t = copy[document.documentElement.lang.split('-')[0]] || copy.en;
  const settings = document.createElement('button');
  settings.id='fleet-analytics-settings'; settings.type='button';
  const render = () => {
    settings.textContent = choice === 'granted' ? t[0] : t[1];
    settings.dataset.analyticsChoice = choice === 'granted' ? 'denied' : 'granted';
    settings.setAttribute('aria-pressed', String(choice === 'granted'));
  };
  settings.addEventListener('click', () => {
    choice = choice === 'granted' ? 'denied' : 'granted';
    try { localStorage.setItem(key,choice); } catch {}
    render(); if (choice === 'granted') start(); else stop();
  });
  render(); (document.querySelector('footer') || document.body).append(settings);
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    choice = event.newValue === 'denied' ? 'denied' : 'granted';
    render(); if (choice === 'granted') start(); else stop();
  });
  if (choice === 'granted') start(); else stop();
}
