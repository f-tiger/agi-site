(() => {
  const link = document.querySelector('a[data-catalog-task]');
  if (!link || location.hostname !== 'baipiaoji.com') return;
  const slug = link.dataset.catalogTask;
  link.addEventListener('click', event => {
    if (!event.isTrusted || navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    const query = new URLSearchParams(location.search);
    if (['ci','__ci','qa','__qa','__probe'].some(key => query.has(key))) return;
    try { if (localStorage.getItem('fleet_ga4_choice_v1') === 'denied') return; } catch { return; }
    window.bpjEv?.('catalog_task', '/catalog-task/' + slug);
    window.dispatchEvent(new CustomEvent('fleet:business', {detail: {name: 'catalog_task_open'}}));
  });
})();
