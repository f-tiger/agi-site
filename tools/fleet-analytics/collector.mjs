// This module only runs in the empty, consent-created same-origin frame.
const allowed = {'agiscorecard.com':'G-FZXLMBB5QB','getecoback.com':'G-E2V0Q9SJ9V','baipiaoji.com':'G-H79D948F4Z','thedollscout.com':'G-2SEHFY33H8'};
let started = false;
window.addEventListener('message', event => {
if (started || event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'fleet-ga4-page') return;
const data = event.data.data || {};
const url = new URL(data.page || 'https://invalid.invalid');
if (window !== window.parent && allowed[data.host] === data.id && url.hostname === data.host &&
    window.parent.location.hostname === data.host && url.protocol === 'https:' && !url.search && !url.hash) {
  started = true;
  window.dataLayer = [];
  function gtag(){window.dataLayer.push(arguments);}
  gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('js',new Date());
  const fields = {page_location:url.href,page_title:data.title,page_referrer:data.referrer,
    send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:data.host,cookie_flags:'SameSite=Lax;Secure'};
  gtag('config',data.id,fields);
  if (data.sendPageView) gtag('event','page_view',{send_to:data.id,page_location:url.href,page_title:data.title,page_referrer:data.referrer});
  const tag = document.createElement('script'); tag.async=true;
  tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(data.id);
  document.head.append(tag);
}
});
if (window !== window.parent) window.parent.postMessage({type:'fleet-ga4-ready'},location.origin);
