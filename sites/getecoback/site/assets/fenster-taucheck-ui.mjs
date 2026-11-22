import {checkWindowCondensation} from './fenster-taucheck.mjs';

const calculator = document.getElementById('fenster-taucheck');
const form = calculator.querySelector('form');
const result = calculator.querySelector('[data-result]');
const number = new Intl.NumberFormat('de-DE', {maximumFractionDigits: 1});
const guidance = {
  unter_taupunkt: 'An dieser Stelle passt Kondenswasser zu den Messwerten. Tropfen aufnehmen und den Ort und Zeitpunkt bei erneutem Beschlag prüfen.',
  nahe_am_taupunkt: 'Die Werte liegen nahe beieinander. Miss die Raumluft und die Innenscheibe gleichzeitig noch einmal, auch am kalten Rand.',
  ueber_taupunkt: 'Hier liegt die gemessene Oberfläche über dem Taupunkt. Prüfe bei sichtbarer Nässe kältere Stellen, frühere Messzeiten oder eine andere Wasserquelle.',
};

form.addEventListener('input', () => {
  result.textContent = '';
  delete result.dataset.messlage;
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries([...form.querySelectorAll('input[type="number"]')]
    .map(input => [input.name, input.valueAsNumber]));
  const check = checkWindowCondensation(values);
  result.dataset.messlage = check.messlage;
  result.textContent = `Geschätzter Taupunkt: ${number.format(check.dew_point_c)} °C. ${guidance[check.messlage]}`;
  if (event.isTrusted) window.dispatchEvent(new CustomEvent('fleet:business', {
    detail: {name: 'eco_window_condensation_check'},
  }));
});
calculator.hidden = false;
