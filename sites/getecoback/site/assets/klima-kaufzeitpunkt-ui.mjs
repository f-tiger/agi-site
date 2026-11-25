import {checkCoolingOffer} from './klima-kaufzeitpunkt.mjs?v=55687deca41c';

const form = document.querySelector('[data-offer-form]');
const schedule = form.querySelector('[data-offer-schedule]');
const result = form.querySelector('[role="status"]');
const fields = form.elements;

function refreshSchedule() {
  schedule.disabled = !fields.frist_belegt.checked;
  schedule.hidden = schedule.disabled;
}

function timeMessage({zeitlich, reserve_tage}) {
  if (zeitlich === 'lieferfrist_pruefen') return 'Zeitplan offen. Lieferfrist für dieses Angebot bestätigen lassen.';
  if (reserve_tage === 0) return 'Kein Zeitpuffer. Schon eine Verzögerung verschiebt den Einsatz.';
  const days = Math.abs(reserve_tage);
  const duration = days + (days === 1 ? ' Tag' : ' Tage');
  return reserve_tage < 0 ? 'Nach deiner Planung fehlen ' + duration + '.' : 'Geplanter Zeitpuffer: ' + duration + '.';
}

form.addEventListener('input', () => {
  refreshSchedule();
  result.textContent = '';
  delete result.dataset.zeitlich;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const confirmed = fields.frist_belegt.checked;
  const check = checkCoolingOffer({
    preis_eur: fields.preis_eur.valueAsNumber,
    deckel_eur: fields.deckel_eur.valueAsNumber,
    tage_bis_bedarf: confirmed ? fields.tage_bis_bedarf.valueAsNumber : 0,
    lieferdauer_tage: confirmed ? fields.lieferdauer_tage.valueAsNumber : 0,
    einrichten_tage: confirmed ? fields.einrichten_tage.valueAsNumber : 0,
    frist_belegt: confirmed,
  });
  result.dataset.zeitlich = check.zeitlich;
  const price = check.budget_eingehalten ? 'Gesamtpreis im Budget.' : 'Gesamtpreis über deinem Budget.';
  result.textContent = price + ' ' + timeMessage(check);
  if (event.isTrusted) window.dispatchEvent(new CustomEvent('fleet:business', {
    detail: {name: 'eco_cooling_offer_check'},
  }));
});

refreshSchedule();
form.hidden = false;
