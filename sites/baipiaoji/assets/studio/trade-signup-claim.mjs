export async function requestTradeSignupClaim(path, timeout=4000) {
  const response = await fetch('/api/account', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'issue_trade_signup_source'}),
    referrer: location.origin + path, referrerPolicy: 'same-origin',
    signal: AbortSignal.timeout(timeout),
  });
  if (response.ok) {
    const {claim} = await response.json();
    if (typeof claim === 'string' && /^[A-Za-z0-9_-]{43}$/.test(claim)) return claim;
  }
}
