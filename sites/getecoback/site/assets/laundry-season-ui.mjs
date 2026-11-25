import {checkLaundrySeason} from './laundry-season.mjs?v=2201ab0e594b';

const form = document.querySelector('[data-laundry-season]');
const result = form.querySelector('[data-season-result]');
const fields = form.elements;
const measured = ['trockner_kwh', 'entfeuchter_kwh', 'tarif_eur_kwh', 'anschaffung_eur'];
const euros = new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'});
const measurementsConfirmed = () => fields.ladungen_vergleichbar.checked && fields.zusatzstrom_erfasst.checked;

function refresh() {
  const confirmed = measurementsConfirmed();
  for (const name of measured) fields[name].required = confirmed;
  fields.ladungen_ersetzbar.setCustomValidity('');
  result.textContent = '';
  delete result.dataset.status;
}

function answer(data) {
  const remaining = 'Weitere Trocknerladungen pro Saison: ' + data.trocknerladungen_weiter + '.';
  if (data.status === 'erst_vergleichbar_messen') {
    return remaining + ' Erst vergleichbar messen und den Zusatzstrom erfassen. Der Kostenvergleich bleibt offen.';
  }
  const costs = 'Bisher: ' + euros.format(data.bisher_saison_eur) + '. Mit Wechsel: ' +
    euros.format(data.gemischt_saison_eur) + ' pro Saison.';
  const difference = 'Stromkostenersparnis: ' + euros.format(data.stromersparnis_saison_eur) + ' pro Saison.';
  const payback = {
    kein_stromkostenvorteil: 'Mit diesen Werten ergibt sich kein Stromkostenvorteil.',
    vorhandene_option_stromguenstiger: 'Ohne zusätzliche Anschaffung sind die Stromkosten hier geringer.',
    rechnerische_kostendeckung: 'Rechnerische Kostendeckung ab ' + data.kostendeckung_saisons + ' ' +
      (data.kostendeckung_saisons === 1 ? 'Saison.' : 'Saisons.'),
    kostendeckung_ausserhalb_zahlenbereich: 'Die rechnerische Kostendeckung liegt außerhalb des darstellbaren Bereichs.',
  };
  return [remaining, costs, difference, payback[data.status]].join(' ');
}

form.addEventListener('input', refresh);
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const total = fields.ladungen_saison.valueAsNumber;
  const replacing = fields.ladungen_ersetzbar.valueAsNumber;
  if (replacing > total) {
    fields.ladungen_ersetzbar.setCustomValidity('Die ersetzbaren Ladungen dürfen die Gesamtzahl nicht überschreiten.');
    fields.ladungen_ersetzbar.reportValidity();
    return;
  }
  const confirmed = measurementsConfirmed();
  const input = Object.fromEntries(measured.map(name => [name, confirmed ? fields[name].valueAsNumber : 0]));
  const data = checkLaundrySeason({
    ...input,
    ladungen_saison: total,
    ladungen_ersetzbar: replacing,
    ladungen_vergleichbar: fields.ladungen_vergleichbar.checked,
    zusatzstrom_erfasst: fields.zusatzstrom_erfasst.checked,
  });
  result.dataset.status = data.status;
  result.textContent = answer(data);
  if (event.isTrusted && confirmed) window.dispatchEvent(new CustomEvent('fleet:business', {
    detail:{name:'eco_laundry_season_check'},
  }));
});

refresh();
form.removeAttribute('inert');
form.hidden = false;
