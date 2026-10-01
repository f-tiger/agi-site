// Supplements pages that lack GA4; never wraps or replaces first-party gtag events.
// The Google tag runs in an empty frame, not alongside user forms or file inputs.
const script = document.querySelector('script[data-ga4-id][data-ga4-host]');
const id = script?.dataset.ga4Id, host = script?.dataset.ga4Host;
const query = new URLSearchParams(location.search);
const excluded = !/^G-[A-Z0-9]+$/.test(id || '') || location.hostname !== host || window.top !== window.self ||
  ['ci','__ci','__probe'].some(k => query.has(k)) || query.get('utm_source') === 'verify' || location.pathname.startsWith('/__ci') ||
  navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const key = host === 'thedollscout.com' ? 'tds_analytics_choice_v1' : 'fleet_ga4_choice_v1';
const copy = {
  en: ['Optional analytics', 'Allow Google Analytics cookies to measure visits to this public page? This analytics channel does not collect your files, form entries or URL parameters. Basic site counts remain separate.', 'Allow analytics', 'Decline', 'Analytics settings'],
  zh: ['可选访问统计', '是否允许 Google Analytics 使用统计 Cookie 记录此公开页面的访问？此统计通道不采集文件、表单输入或网址参数。基础站内计数保持独立。', '允许统计', '拒绝', '统计设置'],
  de: ['Optionale Nutzungsanalyse', 'Darf Google Analytics mit Analyse-Cookies Besuche dieser öffentlichen Seite messen? Dieser Analysekanal erfasst keine Dateien, Formulareingaben oder URL-Parameter. Die eigenen Website-Zählungen bleiben getrennt.', 'Analyse erlauben', 'Ablehnen', 'Analyse-Einstellungen'],
  it: ['Statistiche facoltative', 'Consentire i cookie di Google Analytics per misurare le visite a questa pagina pubblica? Questo canale non raccoglie file, dati dei moduli o parametri URL. I conteggi del sito restano separati.', 'Consenti statistiche', 'Rifiuta', 'Impostazioni statistiche'],
  fr: ['Statistiques facultatives', 'Autoriser les cookies Google Analytics pour mesurer les visites de cette page publique ? Ce canal ne collecte pas vos fichiers, champs de formulaire ou paramètres URL. Les compteurs du site restent séparés.', 'Autoriser', 'Refuser', 'Paramètres des statistiques'],
  es: ['Estadísticas opcionales', '¿Permitir cookies de Google Analytics para medir visitas a esta página pública? Este canal no recoge archivos, datos de formularios ni parámetros URL. Los contadores propios se mantienen separados.', 'Permitir', 'Rechazar', 'Ajustes de estadísticas']
};
let choice = '';
try { choice = localStorage.getItem(key) || ''; } catch {}
let frame, frameData, pageViewSent = false;
const canonical = script?.dataset.ga4Page;
function start() {
  if (excluded || frame || choice !== 'granted' || !canonical) return;
  const url = new URL(canonical);
  if (url.hostname !== host || url.protocol !== 'https:') return;
  url.search = ''; url.hash = '';
  let referrer = '';
  try { referrer = new URL(document.referrer).origin + '/'; } catch {}
  frameData = { id, host, page:url.href, title:script.dataset.ga4Title, referrer, sendPageView:!pageViewSent };
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
  if (frame) {
    try { frame.contentWindow['ga-disable-' + id] = true; } catch {}
    frame.remove(); frame = null;
  }
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of ['', '; domain=' + host, '; domain=.' + host]) document.cookie = name + '=; Max-Age=0; path=/' + domain;
  }
}
if (!excluded && !document.getElementById('fleet-analytics-choice')) {
  window.addEventListener('message', event => {
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
  start();
}
