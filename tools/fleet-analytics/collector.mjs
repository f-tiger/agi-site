// This module only runs in the empty, consent-created same-origin frame.
const {businessEvent} = await import('./business.mjs' + location.search);
const allowed = {'agiscorecard.com':'G-FZXLMBB5QB','getecoback.com':'G-E2V0Q9SJ9V','baipiaoji.com':'G-H79D948F4Z','thedollscout.com':'G-2SEHFY33H8'};
let started = false;
let send, page;
const sent = new Set();
window.addEventListener('message', event => {
if (event.source !== window.parent || event.origin !== location.origin) return;
if (started && event.data?.type === 'fleet-ga4-business') {
  const action = businessEvent(page.host, new URL(page.page).pathname, event.data.detail);
  if (!action || (!action.repeat && sent.has(action.name))) return;
  sent.add(action.name);
  const fields = action.name === 'home_click' ? {home_block:action.home_block, home_destination:action.home_destination, site_edition:action.site_edition} : {tool_id:action.tool_id};
  send('event', action.name, {send_to:page.id, ...fields, page_location:page.page, page_title:page.title, page_referrer:page.referrer});
  return;
}
if (started || event.data?.type !== 'fleet-ga4-page') return;
const data = event.data.data || {};
let url;
try { url = new URL(data.page); } catch { return; }
if (window !== window.parent && allowed[data.host] === data.id && url.hostname === data.host &&
    window.parent.location.hostname === data.host && url.protocol === 'https:' && !url.search && !url.hash) {
  started = true;
  window.dataLayer = [];
  function gtag(){window.dataLayer.push(arguments);}
  send = gtag; page = data;
  gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('js',new Date());
  const fields = {page_location:url.href,page_title:data.title,page_referrer:data.referrer,
    send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:data.host,cookie_flags:'SameSite=Lax;Secure'};
  gtag('config',data.id,fields);
  if (data.sendPageView) gtag('event','page_view',{send_to:data.id,page_location:url.href,page_title:data.title,page_referrer:data.referrer});
  if (data.sendPageView && data.host === 'baipiaoji.com' && ['/', '/en/', '/en'].includes(url.pathname)) gtag('event','home_view',{send_to:data.id,site_edition:url.pathname.startsWith('/en')?'en':'zh',page_location:url.href,page_title:data.title,page_referrer:data.referrer});
  const tag = document.createElement('script'); tag.async=true;
  tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(data.id);
  document.head.append(tag);
  window.parent.postMessage({type:'fleet-ga4-started'},location.origin);
}
});
if (window !== window.parent) window.parent.postMessage({type:'fleet-ga4-ready'},location.origin);
