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
  en: ['Optional analytics', 'Allow Google Analytics cookies to measure visits and fixed tool actions on this public page? Only public page details, fixed actions and recognised campaign tags are shared; files, form entries and other URL parameters are excluded. Basic site counts remain separate.', 'Allow analytics', 'Decline', 'Analytics settings'],
  zh: ['可选访问统计', '是否允许 Google Analytics 使用统计 Cookie 记录此公开页面的访问与固定工具操作？仅分享公开页面、固定操作和已登记的营销标签；不采集文件、表单输入或其他网址参数。基础站内计数保持独立。', '允许统计', '拒绝', '统计设置'],
  de: ['Optionale Nutzungsanalyse', 'Darf Google Analytics mit Analyse-Cookies Besuche und festgelegte Werkzeugaktionen auf dieser öffentlichen Seite messen? Nur öffentliche Seitendaten, feste Aktionen und bekannte Kampagnenkennungen werden übertragen; keine Dateien, Formulareingaben oder sonstigen URL-Parameter. Die eigenen Website-Zählungen bleiben getrennt.', 'Analyse erlauben', 'Ablehnen', 'Analyse-Einstellungen'],
  it: ['Statistiche facoltative', 'Consentire i cookie di Google Analytics per misurare le visite e le azioni predefinite degli strumenti in questa pagina pubblica? Sono condivisi solo dati pubblici della pagina, azioni predefinite e tag di campagne riconosciute; sono esclusi file, dati dei moduli e altri parametri URL. I conteggi del sito restano separati.', 'Consenti statistiche', 'Rifiuta', 'Impostazioni statistiche'],
  fr: ['Statistiques facultatives', 'Autoriser les cookies Google Analytics pour mesurer les visites et les actions prédéfinies des outils de cette page publique ? Seuls les pages publiques, actions prédéfinies et tags de campagne reconnus sont transmis ; fichiers, saisies et autres paramètres sont exclus. Les compteurs du site restent séparés.', 'Autoriser', 'Refuser', 'Paramètres des statistiques'],
  es: ['Estadísticas opcionales', '¿Permitir cookies de Google Analytics para medir visitas y acciones predefinidas de herramientas en esta página pública? Solo se comparten páginas públicas, acciones predefinidas y etiquetas de campaña reconocidas; se excluyen archivos, formularios y otros parámetros URL. Los contadores propios se mantienen separados.', 'Permitir', 'Rechazar', 'Ajustes de estadísticas']
};
let choice = '';
try { choice = localStorage.getItem(key) || ''; } catch {}
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
if (!excluded && !document.getElementById('fleet-analytics-choice')) {
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
  const panel = document.createElement('section'); panel.id = 'fleet-analytics-choice'; panel.setAttribute('aria-label',t[0]);
  const description = document.createElement('p'); description.textContent = t[1];
  panel.append(description);
  for (const [value,label] of [['granted',t[2]],['denied',t[3]]]) {
    const button = document.createElement('button'); button.type='button'; button.textContent=label; button.dataset.analyticsChoice=value;
    button.addEventListener('click', () => {
      choice=value; try { localStorage.setItem(key,choice); } catch {}
      panel.hidden=true; if (choice==='granted') start(); else stop();
    });
    panel.append(button);
  }
  panel.hidden = ['granted','denied'].includes(choice); document.body.append(panel);
  const settings = document.createElement('button'); settings.id='fleet-analytics-settings'; settings.type='button'; settings.textContent=t[4];
  settings.addEventListener('click',()=>{panel.hidden=false;panel.querySelector('button').focus();});
  (document.querySelector('footer') || document.body).append(settings);
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    choice=event.newValue || ''; panel.hidden=['granted','denied'].includes(choice);
    if (choice==='granted') start(); else stop();
  });
  if (choice === 'granted') start(); else stop();
}
