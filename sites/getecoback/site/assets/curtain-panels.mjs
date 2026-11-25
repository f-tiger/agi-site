const round = value => Math.round(value * 100) / 100;

export function curtainPanels({oeffnung_cm, ueberstand_links_cm, ueberstand_rechts_cm, stofffaktor, bahn_flach_cm}) {
  if (!oeffnung_cm) throw new RangeError('Öffnung');
  const deckbreite = oeffnung_cm + ueberstand_links_cm + ueberstand_rechts_cm;
  const stoff = deckbreite * stofffaktor;
  const needed = stoff / bahn_flach_cm;
  // Do not add a full panel for floating-point rounding at an integer.
  return {
    deckbreite_cm:round(deckbreite),
    stoff_flach_cm:round(stoff),
    bahnen:Math.max(1, Math.ceil(needed - Number.EPSILON * needed)),
    hinweis:'Breiten beziehen sich auf nutzbaren Stoff. Nahtzugaben, Aufhängung und Waschschrumpfung separat prüfen. Die Überdeckung belegt keine Dämmleistung.',
  };
}

const form = typeof document === 'undefined' ? null : document.querySelector('[data-curtain-panels]');
if (form) {
  const result = form.querySelector('[role="status"]');
  const text = new Intl.NumberFormat('de-DE', {maximumFractionDigits:2});
  const numericFields = ['oeffnung_cm','ueberstand_links_cm','ueberstand_rechts_cm','stofffaktor','bahn_flach_cm'];
  let recorded = false;
  form.addEventListener('input', () => { result.textContent = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!form.elements.bahnbreite_bestaetigt.checked) {
      result.textContent = 'Erst im Angebot klären, ob das Maß die flache Breite einer einzelnen Bahn angibt.';
      return;
    }
    const input = Object.fromEntries(numericFields.map(name => [name, form.elements[name].valueAsNumber]));
    const answer = curtainPanels(input);
    const perPack = form.elements.bahnen_je_packung.valueAsNumber;
    const packages = Math.ceil(answer.bahnen / perPack);
    const packText = Number.isFinite(packages)
      ? ' Bei ' + perPack + ' je Packung: ' + packages + (packages === 1 ? ' Packung.' : ' Packungen.')
      : ' Für die Packungszahl den Lieferumfang beim Händler prüfen.';
    result.textContent = text.format(answer.deckbreite_cm) + ' cm Abdeckung · ' +
      text.format(answer.stoff_flach_cm) + ' cm flacher Stoff · ' + answer.bahnen +
      (answer.bahnen === 1 ? ' Bahn.' : ' Bahnen.') + packText;
    if (event.isTrusted && !recorded && !navigator.webdriver && navigator.doNotTrack !== '1' &&
        !navigator.globalPrivacyControl && !/[?&]__(probe|ci|qa)(=|&|$)/.test(location.search)) {
      recorded = true;
      window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name:'eco_curtain_panel_check'}}));
    }
  });
  form.removeAttribute('inert');
  form.hidden = false;
}
