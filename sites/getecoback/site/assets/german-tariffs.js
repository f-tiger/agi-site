/* Tariffs are user-selected examples. Leave the model's initial and personal inputs intact. */
(() => {
  const reference = 'https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/09/PD26_345_61243.html';
  function add(field) {
    const labelText = Array.from(field.labels || [], label => label.textContent).join(' ').trim();
    const electricity = /Strompreis|Stromarbeitspreis|Strom-Arbeitspreis|Stromtarif|(?:Strompreis|Preis|Arbeitspreis).*?(?:€|EUR).*?kWh/i.test(labelText);
    if (!electricity || /Gasarbeitspreis|Grundpreis|Wärmeenergie|Gaspreis/i.test(labelText)) return;
    const cents = /cent|ct\s*\/\s*kWh/i.test(labelText);
    const group = document.createElement('div');
    group.className = 'cro-tariffs';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Deutsche Strompreis-Beispiele');
    for (const [ct, text] of [[30, 'Neukunden-Tarif · Beispiel 30 ct/kWh'], [38, 'Haushaltsdurchschnitt · rund 38 ct/kWh']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.addEventListener('click', () => {
        field.value = String(cents ? ct : ct / 100);
        field.dispatchEvent(new Event('input', {bubbles: true}));
        field.dispatchEvent(new Event('change', {bubbles: true}));
      });
      group.append(button);
    }
    const note = document.createElement('small');
    note.textContent = 'Richtwerte für Deutschland, individuell anpassbar. ';
    const source = document.createElement('a');
    source.href = reference;
    source.textContent = 'Destatis: 37,97 ct/kWh im 1. Halbjahr 2026 (alle Haushaltsverträge).';
    note.append(source);
    group.append(note);
    (field.closest('label') || field).after(group);
    const form = field.form || field.closest('section');
    const markets = Array.from(form?.querySelectorAll('select[name=currency],select[name=country],select[name=market]') || []);
    function showForGermany() {
      group.hidden = markets.some(select => !['DE','EUR','GERMANY','DEUTSCHLAND'].includes(select.value.toUpperCase()));
    }
    markets.forEach(select => select.addEventListener('change', showForGermany));
    showForGermany();
  }
  document.querySelectorAll('input[type=number]').forEach(add);
})();
