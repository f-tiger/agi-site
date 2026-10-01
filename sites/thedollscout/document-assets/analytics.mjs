// GA4 is optional. The existing first-party, cookie-free action counts remain separate.
// Never load Google on probes, automated visits, DNT/GPC, or before a visitor opts in.
const query = new URLSearchParams(location.search);
const excluded = location.hostname !== 'thedollscout.com' || query.has('ci') || query.has('__probe') || query.get('utm_source') === 'verify' || location.pathname.startsWith('/__ci') || navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const key = 'tds_analytics_choice_v1';
const id = window.DS_CONFIG?.ga4Id;
const copy = {
  en: { title:'Optional usage analytics', body:'Allow Google Analytics to measure page visits using analytics cookies? Your files and inputs stay on this device. Basic anonymous site counts work without Google Analytics.', yes:'Allow analytics', no:'Decline', settings:'Analytics settings' },
  de: { title:'Optionale Nutzungsanalyse', body:'Darf Google Analytics Seitenbesuche mit Analyse-Cookies messen? Ihre Dateien und Eingaben bleiben auf diesem Gerät. Anonyme Website-Zählungen funktionieren auch ohne Google Analytics.', yes:'Analyse erlauben', no:'Ablehnen', settings:'Analyse-Einstellungen' },
  zh: { title:'可选的访问统计', body:'是否允许 Google Analytics 使用统计 Cookie 记录页面访问？您的文件和输入仍保留在本机。不启用 Google Analytics，也可进行匿名站内计数。', yes:'允许统计', no:'拒绝', settings:'统计设置' }
};
const c = copy[document.documentElement.lang.split('-')[0]] || copy.en;
let choice = '';
try { choice = localStorage.getItem(key) || ''; } catch {}
let started = false;
function start() {
  if (excluded || started || choice !== 'granted' || !/^G-[A-Z0-9]+$/.test(id || '')) return;
  started = true;
  window['ga-disable-' + id] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied' });
  window.gtag('js', new Date());
  const canonical = new URL(document.querySelector('link[rel="canonical"]').href);
  canonical.search = ''; canonical.hash = '';
  let referrer = '';
  try { referrer = new URL(document.referrer).origin + '/'; } catch {}
  window.gtag('config', id, {
    page_location:canonical.href, page_referrer:referrer, page_title:document.title,
    allow_google_signals:false, allow_ad_personalization_signals:false,
    cookie_flags:'SameSite=Lax;Secure'
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.append(script);
}
function decline() {
  window['ga-disable-' + id] = true;
  if (started) window.gtag('consent', 'update', { analytics_storage:'denied' });
  // Remove only this site's GA cookies when consent is withdrawn.
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of ['', '; domain=thedollscout.com', '; domain=.thedollscout.com']) document.cookie = name + '=; Max-Age=0; path=/' + domain;
  }
}
if (!excluded && /^G-[A-Z0-9]+$/.test(id || '') && !document.getElementById('tds-analytics-choice')) {
  const panel = document.createElement('section');
  panel.id = 'tds-analytics-choice'; panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', c.title);
  const text = document.createElement('p'); text.textContent = c.body;
  const yes = document.createElement('button'); yes.type = 'button'; yes.textContent = c.yes; yes.dataset.analyticsChoice = 'granted';
  const no = document.createElement('button'); no.type = 'button'; no.textContent = c.no; no.dataset.analyticsChoice = 'denied';
  for (const button of [yes,no]) button.addEventListener('click', () => {
    choice = button.dataset.analyticsChoice;
    try { localStorage.setItem(key, choice); } catch {}
    panel.hidden = true;
    if (choice === 'granted') { if (started) { window['ga-disable-' + id] = false; window.gtag('consent', 'update', { analytics_storage:'granted' }); } else start(); }
    else decline();
  });
  panel.append(text,yes,no); panel.hidden = choice === 'granted' || choice === 'denied';
  document.body.append(panel);
  const settings = document.createElement('button'); settings.type = 'button'; settings.className = 'text-button'; settings.textContent = c.settings;
  settings.addEventListener('click', () => { panel.hidden = false; yes.focus(); });
  (document.querySelector('.site-footer nav') || document.body).append(settings);
  start();
}
