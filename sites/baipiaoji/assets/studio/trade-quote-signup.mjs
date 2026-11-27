const signup = document.querySelector('[data-trade-quote-signup]');
const origin = 'https://baipiaoji.com';
const quotePath = location.pathname;
const quoteRoute = /^\/(?:en\/)?studio\/ai\/trade-export-quote$/;
const claimKey = 'bpj_trade_signup_claim_v1';
const claimFormat = /^[A-Za-z0-9_-]{43}$/;

if (signup && location.origin === origin && quoteRoute.test(quotePath)) {
  const params = new URLSearchParams(location.search);
  const qa = ['qa','__qa','__ci','__probe','ci'].some(key => params.has(key)) || navigator.webdriver;
  const account = new URL(quotePath.startsWith('/en/') ? '/en/account' : '/account', origin);
  account.searchParams.set('next', quotePath);
  if (qa) account.searchParams.set('__ci', '1');
  signup.href = account.href;

  let opening = false;
  signup.addEventListener('click', event => {
    if (!event.isTrusted || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        qa || navigator.doNotTrack === '1' || navigator.globalPrivacyControl || window.bpjAccount?.state?.user) return;
    try {
      if (localStorage.getItem('fleet_ga4_choice_v1') === 'denied') return;
    } catch { return; }
    if (opening) {
      event.preventDefault();
      return;
    }

    const tab = window.open('about:blank', '_blank');
    if (!tab) return;
    try {
      tab.opener = null;
      // An opened blank tab may begin with a copy of this tab's namespace.
      // Drop that independent copy before adding the single-use source claim.
      tab.sessionStorage.clear();
    } catch {
      tab.close();
      return;
    }
    event.preventDefault();
    opening = true;
    void openAccount(tab);
  });

  async function openAccount(tab) {
    try {
      const result = await fetch('/api/account', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'issue_trade_signup_source'}),
        referrer: origin + quotePath, referrerPolicy: 'same-origin',
        signal: AbortSignal.timeout(4000),
      });
      if (result.ok) {
        const {claim} = await result.json();
        if (!tab.closed && tab.location.href === 'about:blank' && typeof claim === 'string' && claimFormat.test(claim)) {
          tab.sessionStorage.setItem(claimKey, claim);
        }
      }
    } catch {
      // Registration still opens when the optional source claim is unavailable.
    } finally {
      opening = false;
      try { if (!tab.closed && tab.location.href === 'about:blank') tab.location.replace(account.href); } catch {}
    }
  }
}
