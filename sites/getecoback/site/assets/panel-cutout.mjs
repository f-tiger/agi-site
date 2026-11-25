// Shared by the German guide and the registered MCP calculator.
export function panelCutout({breite_mm,hoehe_mm,loch_mm,mitte_x_mm,mitte_y_mm,rand_min_mm}) {
  const clearance = Math.min(mitte_x_mm, breite_mm - mitte_x_mm, mitte_y_mm, hoehe_mm - mitte_y_mm) - loch_mm / 2;
  return {
    kleinster_freier_rand_mm: Number(clearance.toFixed(2)),
    passt_geometrisch: clearance >= rand_min_mm,
    annahme: 'Nur Geometrie der rechteckigen Platte und des kreisförmigen Lochs. Flansch, Material und Befestigung separat nach Anleitung prüfen.'
  };
}

if (typeof document !== 'undefined') {
  const form = document.getElementById('panel-cutout-form');
  if (form) {
    const result = document.getElementById('panel-cutout-result');
    const fields = [...form.querySelectorAll('input[type=number]')];
    const number = new Intl.NumberFormat('de-DE', {maximumFractionDigits:2});
    form.addEventListener('input', () => { result.textContent = ''; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const own = Object.fromEntries(fields.map(field => [field.name, field.valueAsNumber]));
      const check = panelCutout(own);
      result.textContent = `Kleinster freier Rand: ${number.format(check.kleinster_freier_rand_mm)} mm. ` +
        (check.passt_geometrisch
          ? 'Der eingegebene Randabstand ist geometrisch möglich. Prüfe Flansch und Befestigung vor dem Zuschnitt.'
          : 'Der eingegebene Randabstand reicht hier nicht aus. Passe die Position oder Plattengröße an und warte mit dem Zuschnitt.');
      window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name:'eco_panel_cutout_check'}}));
    });
    form.hidden = false;
  }
}
