export function compareSocketWatts(applianceWatts, socketWatts) {
  if (![applianceWatts, socketWatts].every(value => Number.isFinite(value) && value >= 0.01)) {
    return null;
  }
  const difference = applianceWatts - socketWatts;
  return {difference, condition: difference > 0 ? 'above' : difference < 0 ? 'below' : 'equal'};
}

const form = globalThis.document?.getElementById('auto-12v-check');
if (form) {
  const fields = Array.from(form.querySelectorAll('input'));
  const output = form.querySelector('output');
  const decimal = new Intl.NumberFormat('de-DE', {maximumSignificantDigits:6});
  const scientific = new Intl.NumberFormat('de-DE', {notation:'scientific', maximumSignificantDigits:6});
  form.addEventListener('input', () => { output.value = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const checked = compareSocketWatts(...fields.map(field => field.valueAsNumber));
    if (!checked) {
      output.value = 'Gib beide dokumentierten Wattwerte ein.';
      return;
    }
    const difference = Math.abs(checked.difference);
    const watts = (difference < 0.001 || difference >= 1e6 ? scientific : decimal).format(difference);
    const answers = {
      above: `Das Gerät liegt ${watts} W über der Steckdosengrenze. Verwende es dort nicht.`,
      equal: 'Das Gerät erreicht genau die angegebene Grenze. Anschluss und Nutzungsdauer separat in beiden Anleitungen prüfen.',
      below: `Das Gerät liegt rechnerisch ${watts} W unter der Grenze. Anschluss und Nutzungsdauer separat in beiden Anleitungen prüfen.`,
    };
    output.value = answers[checked.condition];
  });
  form.hidden = false;
}
