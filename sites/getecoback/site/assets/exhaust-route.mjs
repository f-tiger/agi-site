const outcomes = {
  weg_aendern: 'Andere Aufstellung suchen. Prüfe, ob das Gerät mit dem vorgesehenen Schlauch näher am Anschluss stehen kann.',
  handbuch_pruefen: 'Prüfe die Anleitung für die genaue Modellvariante. Warte mit dem Kauf eines Zusatzteils, bis Länge und Freigabe geklärt sind.',
  weiter_nach_anleitung: 'Die Länge reicht rechnerisch. Prüfe Anschluss, Abstände und Führung am Gerät nach seiner Anleitung.',
};

export function assessExhaustRoute({ routeCm, availableCm, approval, kinkFree }) {
  const validLength = value => Number.isFinite(value) && value >= 1 && value <= 1000;
  if (!validLength(routeCm) || (availableCm !== null && !validLength(availableCm)) ||
      !['ja', 'nein', 'unbekannt'].includes(approval) || typeof kinkFree !== 'boolean') {
    throw new RangeError('Prüfe die Längen in Zentimetern und die beiden Angaben zur Aufstellung.');
  }
  const margin = availableCm === null ? null : Math.round((availableCm - routeCm) * 1000) / 1000;

  let state = 'weiter_nach_anleitung';
  if (!kinkFree || approval === 'nein' || (availableCm !== null && routeCm > availableCm)) {
    state = 'weg_aendern';
  } else if (availableCm === null || approval === 'unbekannt') {
    state = 'handbuch_pruefen';
  }
  return { state, marginCm: margin };
}

function initExhaustRoute(section) {
  const form = section.querySelector('form');
  const result = section.querySelector('[data-exhaust-result]');
  const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 });
  const clearResult = () => {
    result.hidden = true;
    result.textContent = '';
    delete result.dataset.state;
  };
  form.addEventListener('input', clearResult);
  form.addEventListener('reset', clearResult);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const { routeCm, availableCm, approval, kinkFree } = form.elements;
    const { state, marginCm } = assessExhaustRoute({
      routeCm: routeCm.valueAsNumber,
      availableCm: availableCm.value === '' ? null : availableCm.valueAsNumber,
      approval: approval.value,
      kinkFree: kinkFree.value === 'ja',
    });
    const distance = marginCm === null ? '' : ` Längendifferenz: ${number.format(marginCm)} cm.`;
    result.dataset.state = state;
    result.textContent = outcomes[state] + distance;
    result.hidden = false;
    result.focus();

    // The existing event contains no distances, inputs or result state.
    const params = new URLSearchParams(window.location.search);
    const qa = window.__probe || ['__probe', '__qa', '__ci', 'qa', 'ci', 'verify'].some(key => params.has(key)) || params.get('utm_source') === 'verify';
    let denied = false;
    try { denied = window.localStorage.getItem('fleet_ga4_choice_v1') === 'denied'; } catch { /* Storage may be unavailable. */ }
    if (event.isTrusted && !qa && !denied && !navigator.webdriver && navigator.doNotTrack !== '1' && navigator.globalPrivacyControl !== true) {
      try { window.gtag?.('event', 'hose_fit'); } catch { /* The local result is already shown. */ }
    }
  });
  form.hidden = false;
}

if (typeof document !== 'undefined') {
  const section = document.querySelector('[data-exhaust-route]');
  if (section) initExhaustRoute(section);
}
