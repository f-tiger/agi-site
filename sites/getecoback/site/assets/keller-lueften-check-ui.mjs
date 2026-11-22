import {checkCellarVentilation} from './keller-lueften-check.mjs';

const button = document.getElementById('go');
const result = document.getElementById('res');
const verdict = document.getElementById('verdict');
const details = document.getElementById('sub');
const inputs = {ta:'aussen_c', rh:'aussen_rh_prozent', tk:'innen_c', rhin:'innen_rh_prozent', wall:'wand_c'};
const number = new Intl.NumberFormat('de-DE', {minimumFractionDigits:1, maximumFractionDigits:1});

function clearResult() {
  result.className = 'res';
  verdict.textContent = '';
  details.textContent = '';
}
for (const id of Object.keys(inputs)) {
  const input = document.getElementById(id);
  input.addEventListener('input', clearResult);
  input.addEventListener('change', clearResult);
}

button.addEventListener('click', () => {
  const values = Object.fromEntries(Object.entries(inputs).map(([id, key]) => {
    const raw = document.getElementById(id).value;
    return [key, raw.trim() === '' ? NaN : Number(raw)];
  }));

  let check;
  try {
    check = checkCellarVentilation(values);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    clearResult();
    result.style.display = 'none';
    return;
  }

  const favorable = check.status === 'probeweise_lueften';
  const retry = check.status === 'grenzbereich_nachmessen';
  const advice = favorable ? 'Kurz probeweise lüften und anschließend erneut messen.'
    : retry ? 'Innen, außen und an der kältesten Wand zeitgleich nachmessen.'
    : 'Für die Trocknung auf passendere Messwerte warten.';
  verdict.className = 'verdict ' + (favorable ? 'v-good' : 'v-bad');
  verdict.textContent = check.antwort;
  details.textContent = 'Taupunkt außen ' + number.format(check.aussen_taupunkt_c) + ' °C. '
    + 'Taupunkt innen ' + number.format(check.innen_taupunkt_c) + ' °C. '
    + 'Gemessene Wand ' + number.format(values.wand_c) + ' °C. ' + advice
    + (check.kondensation_innen_moeglich ? ' Auch die vorhandene Kellerluft kann an dieser Wand kondensieren.' : '')
    + ' Bei sichtbarer Nässe die Ursache prüfen. Notwendige Lüftung bleibt separat.';
  result.className = 'res on';

  const probe = new URLSearchParams(location.search).has('__probe');
  if (!probe && navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl && !window.__ecoToolExample) {
    window.gtag?.('event', 'taupunkt_check', {source:'keller-lueften'});
  }
});
