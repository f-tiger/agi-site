/* Anonymous event counts only. Checklist state stays in the current document. */
(() => {
  'use strict';
  const market = document.body.dataset.countryMarket;
  const enabled = ['DE', 'NL', 'AU'].includes(market) && !navigator.webdriver &&
    navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl &&
    !new URLSearchParams(location.search).has('qa');
  function send(name, meta) {
    if (!enabled) return;
    try {
      const body = JSON.stringify({n:name,p:location.pathname,r:document.referrer,m:meta});
      if (navigator.sendBeacon) navigator.sendBeacon('/api/ev', new Blob([body], {type:'text/plain'}));
      else fetch('/api/ev', {method:'POST',headers:{'Content-Type':'text/plain'},body,keepalive:true}).catch(() => {});
    } catch (_) { /* Navigation and the checklist never depend on telemetry. */ }
  }
  send('page_view', {source:'country_categories',market});
  const chooser = document.querySelector('[data-country-chooser]');
  if (chooser) {
    chooser.hidden = false;
    document.getElementById('country-need').addEventListener('change', event => {
      const option = event.target.selectedOptions[0];
      const result = chooser.querySelector('[data-country-result]');
      const link = result.querySelector('a');
      result.querySelector('p').textContent = option.dataset.summary || '';
      link.hidden = !option.value;
      if (!option.value) { link.removeAttribute('href'); return; }
      link.href = option.dataset.path;
      link.textContent = option.dataset.label + ' →';
      send('outbound_choice', {source:'country_categories',market,action:'need_selected',category:option.value});
    });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest && event.target.closest('a');
    if (!link) return;
    if (link.dataset.countryShop) {
      // An ordinary NL/AU merchant link must never become an affiliate event.
      send(market === 'DE' ? 'affiliate_click' : 'outbound_choice', {
        source:'country_categories',market,action:'merchant',link_url:link.href
      });
    } else if (link.dataset.countryAction) {
      send('outbound_choice', {source:'country_categories',market,
        action:link.dataset.countryAction,to:link.getAttribute('href')});
    }
  });
  const print = document.querySelector('[data-country-print]');
  if (print) {
    print.hidden = false;
    print.addEventListener('click', () => {
      send('share', {source:'country_categories',market,action:'print_checklist'});
      window.print();
    });
  }
})();
