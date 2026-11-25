// Approximate water-vapour density in g/m³ using Magnus over water.
export function vapourDensity(celsius, relativeHumidity) {
  const saturation = 6.112 * Math.exp(17.62 * celsius / (243.12 + celsius));
  const pressure = saturation * relativeHumidity / 100;
  return 216.7 * pressure / (273.15 + celsius);
}

export function ventilationEffect({before_c, before_rh_pct, after_c, after_rh_pct, same_position}) {
  if (!same_position) return null;
  const before = vapourDensity(before_c, before_rh_pct);
  const after = vapourDensity(after_c, after_rh_pct);
  return Number((after - before).toFixed(2));
}

const form = typeof document === 'undefined' ? null : document.querySelector('[data-ventilation-effect]');
if (form) {
  const result = form.querySelector('[role="status"]');
  const decimal = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits:2, maximumFractionDigits:2, signDisplay:'exceptZero',
  });
  let recorded = false;
  form.addEventListener('input', () => { result.textContent = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const {before_c, before_rh_pct, after_c, after_rh_pct, same_position} = form.elements;
    const change = ventilationEffect({
      before_c:before_c.valueAsNumber, before_rh_pct:before_rh_pct.valueAsNumber,
      after_c:after_c.valueAsNumber, after_rh_pct:after_rh_pct.valueAsNumber,
      same_position:same_position.checked,
    });
    if (change === null) {
      result.textContent = 'Vergleich offen. Miss erneut am gleichen Ort mit demselben Gerät und warte auf stabile Werte.';
      return;
    }
    result.textContent = 'Rechnerische Änderung am Messpunkt: ' + decimal.format(change) + ' g/m³.';
    if (event.isTrusted && !recorded) {
      recorded = true;
      window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name:'eco_ventilation_effect'}}));
    }
  });
  form.removeAttribute('inert');
  form.hidden = false;
}
