const {laundrySingle, laundrySingleShareText} = await import('./laundry-math.mjs' + new URL(import.meta.url).search);

const root = document.getElementById('luftentfeuchter-waesche-kosten');
const form = root?.querySelector('[data-laundry-single]');
if (form) {
  const fields = form.querySelector('[data-single-fields]');
  const measured = form.querySelector('[data-single-measured]');
  const estimated = form.querySelector('[data-single-estimate]');
  const error = form.querySelector('[data-single-error]');
  const result = form.querySelector('[data-single-result]');
  const copy = form.querySelector('[data-single-copy]');
  const copyStatus = form.querySelector('[data-single-copy-status]');
  const copyFallback = form.querySelector('[data-single-copy-fallback]');
  const copyField = copyFallback.querySelector('textarea');
  const energy = new Intl.NumberFormat('de-DE', {maximumFractionDigits:4});
  const euros = new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'});
  let hasTrustedInput = false;
  let currentInput = null;

  function updateMode() {
    const estimate = form.elements.method.value === 'estimate';
    measured.hidden = measured.disabled = estimate;
    estimated.hidden = estimated.disabled = !estimate;
  }

  function onChange(event) {
    hasTrustedInput ||= event.isTrusted;
    updateMode();
    result.textContent = '';
    error.textContent = '';
    resetCopy();
  }

  function resetCopy() {
    currentInput = null;
    copy.hidden = copyStatus.hidden = copyFallback.hidden = true;
    copyStatus.textContent = copyField.value = '';
  }

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  copy.addEventListener('click', async () => {
    if (!currentInput) return;
    const input = currentInput;
    const text = laundrySingleShareText(input);
    try {
      await navigator.clipboard.writeText(text);
      if (currentInput !== input) return;
      copyStatus.textContent = 'Zusammenfassung mit deinen Werten kopiert.';
    } catch {
      if (currentInput !== input) return;
      copyFallback.hidden = false;
      copyField.value = text;
      copyField.focus();
      copyField.select();
      copyStatus.textContent = 'Markierten Text manuell kopieren.';
    }
    copyStatus.hidden = false;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    resetCopy();
    if (!form.reportValidity()) return;
    const {method, dehum, watts, hours, price} = form.elements;
    const input = method.value === 'measured'
      ? {method:'measured', dehum:dehum.valueAsNumber, price:price.valueAsNumber}
      : {method:'estimate', watts:watts.valueAsNumber, hours:hours.valueAsNumber, price:price.valueAsNumber};
    let calculated;
    try {
      calculated = laundrySingle(input);
    } catch {
      result.textContent = '';
      error.textContent = 'Bitte prüfe die Werte und die gewählte Berechnungsgrundlage.';
      return;
    }
    const kwh = calculated.kwh > 0 && calculated.kwh < 0.0001
      ? 'unter 0,0001 kWh' : `${energy.format(calculated.kwh)} kWh`;
    const cost = calculated.cost > 0 && calculated.cost < 0.005
      ? 'unter 0,01 €' : euros.format(calculated.cost);
    const provenance = input.method === 'measured' ? 'Mit deinem Messwert' : 'Mit deiner Schätzung';
    result.textContent = `${provenance}: ${kwh} und ${cost} pro Durchgang.`;
    error.textContent = '';
    currentInput = input;
    copy.hidden = false;

    const query = new URLSearchParams(location.search);
    if (!event.isTrusted || !hasTrustedInput || navigator.webdriver ||
        navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true || window.__probe ||
        ['__probe','__ci','ci','qa','__qa'].some(key => query.has(key)) ||
        query.get('utm_source') === 'verify') return;
    try {
      if (localStorage.getItem('fleet_ga4_choice_v1') === 'denied') return;
    } catch {
      return;
    }
    window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name:'eco_laundry_single_calculate'}}));
  });

  updateMode();
  fields.disabled = false;
  form.removeAttribute('inert');
  form.hidden = false;
}
