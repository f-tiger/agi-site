export function calculateGasHeatThreshold(electricity, gas, efficiencyPercent) {
  if (![electricity, gas, efficiencyPercent].every(value => Number.isFinite(value) && value >= 0.01) ||
      efficiencyPercent > 100) {
    return null;
  }
  const efficiency = efficiencyPercent / 100;
  const gasHeatCost = gas / efficiency;
  const threshold = electricity / gasHeatCost;
  return Number.isFinite(gasHeatCost) && Number.isFinite(threshold) && threshold > 0 ? {gasHeatCost, threshold} : null;
}

const form = globalThis.document?.getElementById('heizkosten-gas-form');
if (form) {
  const fields = Array.from(form.querySelectorAll('input'));
  const output = form.querySelector('output');
  const decimal = new Intl.NumberFormat('de-DE', {maximumSignificantDigits: 5});
  const scientific = new Intl.NumberFormat('de-DE', {notation:'scientific', maximumSignificantDigits:5});
  const format = value => (value < 0.001 || value >= 1e6 ? scientific : decimal).format(value);
  form.addEventListener('input', () => { output.value = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const result = calculateGasHeatThreshold(...fields.map(field => field.valueAsNumber));
    output.value = result
      ? `Gleiche Energiekosten bei etwa COP ${format(result.threshold)}. Gas kostet rund ${format(result.gasHeatCost)} ct/kWh Nutzwärme.`
      : 'Bitte prüfe die drei Eingaben. Mit diesen Werten lässt sich keine Kostenschwelle berechnen.';
  });
  form.hidden = false;
}
