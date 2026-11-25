// Shared stock calculation for the two models documented in the German guide.
export function oskarFilterStock({oskar_wechsel, little_wechsel, vorhanden}) {
  if (![oskar_wechsel, little_wechsel, vorhanden].every(Number.isInteger)) {
    throw new RangeError('Matten und Wechsel sind Ganzzahlen');
  }
  const need = 2 * oskar_wechsel + little_wechsel;
  const packs = Math.ceil(Math.max(0, need - vorhanden) / 2);
  return {
    bedarf_matten: need,
    zusaetzliche_zweierpacks: packs,
    uebrige_matten: vorhanden + 2 * packs - need,
    grenze: 'O-030 gilt hier für die dokumentierten Oskar/Oskar little Ausführungen. Eigenen Wechselbedarf und tatsächlichen Packungsinhalt prüfen.'
  };
}

if (typeof document !== 'undefined') {
  const form = document.getElementById('oskar-stock-form');
  if (form) {
    const result = document.getElementById('oskar-stock-result');
    const product = document.getElementById('oskar-stock-product');
    const fields = [...form.querySelectorAll('input[type=number]')];
    form.addEventListener('input', () => {
      result.textContent = '';
      product.hidden = true;
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const inputs = Object.fromEntries(fields.map(field => [field.name, field.valueAsNumber]));
      const plan = oskarFilterStock(inputs);
      const packs = plan.zusaetzliche_zweierpacks;
      result.textContent = `Benötigte Matten: ${plan.bedarf_matten}. Zusätzliche Zweierpacks: ${packs}. Übrige Matten nach den Wechseln: ${plan.uebrige_matten}. ` +
        (packs ? 'Gleiche O-030 und die zwei Matten auf der Packung ab.' : 'Dein Vorrat reicht für die eingegebenen Wechsel.');
      product.hidden = packs === 0;
      window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name:'eco_oskar_stock_check'}}));
    });
    form.hidden = false;
  }
}
