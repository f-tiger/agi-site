const origin = 'https://getecoback.com';

// Stable output excerpts cover the original text-only response contract. Live
// tools describe invariants instead of promising a forecast or result order.
const fixtures = new Map(Object.entries({
  entfeuchter_ablaufcheck: {
    page: '/guide/luftentfeuchter-keller.html',
    args: {drain: 'level_or_uphill', model: 'meaco-one-20'},
    expected_fields: {outcome: 'pump_check'},
    expected_text: ['Schlauchanschluss allein belegt keine Pumpe', 'Arete One 20L'],
    conditions: 'Die Aussage zum optionalen Zubehör stammt von Meaco UK für genau diese Variante. Förderhöhe, Lieferumfang und Freigabe für das deutsche Modell separat prüfen. Tankbetrieb bleibt eine Option.',
  },
  geraet_wahl: {
    page: '/guide/luftentfeuchter-ratgeber.html',
    args: {problem: 'feucht_schimmel', qm: 20},
    expected_text: ['Erst messen, dann entscheiden', 'kein Entfeuchterkauf'],
    conditions: 'Beispiel ohne Temperatur- und Feuchtemessung. Bei sichtbarem Schaden zuerst die Ursache klären. Die Fläche bestimmt keine Literleistung.',
  },
  btu_empfehlung: {
    page: '/guide/btu-rechner.html',
    args: {qm: 20, sonne: 'normal'},
    expected_text: ['ca. 7.000 BTU/h', '/guide/btu-rechner.html'],
    conditions: 'Grobe Orientierung mit 340 BTU/h pro m² und Sonnenfaktor, gerundet auf 500 BTU/h. Deckenhöhe, Personen und sonstige Wärmequellen im vollständigen Rechner prüfen.',
  },
  fensterabdichtung_laenge: {
    page: '/guide/fensterabdichtung-klimaanlage.html',
    args: {breite_cm: 60, hoehe_cm: 140, fenstertyp: 'kipp'},
    expected_text: ['mindestens 4,00 m', '400 cm'],
    conditions: 'Gemessen wird der bewegliche Flügel. Vor dem Kauf Geometrie, Fenstertyp und Messvorgaben des konkreten Kits prüfen.',
  },
  hitzewelle_vorschau: {
    page: '/guide/hitze-check.html',
    args: {},
    expected_fields: {forecast_source_url: 'https://open-meteo.com/en/docs'},
    expected_text: ['Open-Meteo', 'Berlin', 'Frankfurt', 'München'],
    conditions: 'Tagesmaxima aus bis zu drei Tagen in Berlin, Frankfurt und München (Europe/Berlin). forecast_status kann available, partial oder unavailable sein. Höchstwert und Datum hängen von den verfügbaren Vorhersagedaten ab.',
  },
  klimaanlage_stromkosten: {
    page: '/guide/stromkosten-rechner.html',
    args: {watt: 1000, stunden_pro_tag: 8, strompreis_euro_kwh: 0.3, tage: 30, auslastung: 0.65},
    expected_fields: {eur_per_operating_hour: 0.195, eur_for_period: 46.8},
    expected_text: ['46,80 € über 30 Tage'],
    conditions: 'Auslastung ist der eingegebene Modellanteil der aktiven Laufzeit. Rechenmodell mit konstantem Arbeitspreis, ohne Grundpreis und Stand-by-Verbrauch.',
  },
  heizleistung_watt: {
    page: '/guide/infrarotheizung-watt-rechner.html',
    args: {qm: 20, daemmung: 'mittel', strompreis_euro_kwh: 0.3},
    expected_fields: {estimated_watts: 1600, eur_per_full_load_hour: 0.48},
    expected_text: ['ca. 1.600 Watt', '0,48 € pro Stunde Volllast'],
    conditions: '80 W/m² als grober Ansatz für den Bestand. Stromkosten beziehen sich auf eine Stunde Volllast. Maßgeblich für eine Auslegung ist die tatsächliche Heizlast.',
  },
  taupunkt_lueften: {
    page: '/guide/keller-lueften-sommer.html',
    args: {aussen_temp_c: 18, aussen_luftfeuchte_prozent: 60, innen_temp_c: 16},
    expected_text: ['Taupunkt der Außenluft: 10,1 °C', '14,0 °C'],
    conditions: 'Magnus-Näherung für den Außentaupunkt. Die Wandtemperatur wird 2 °C unter der Innenluft geschätzt. Für die Trocknungswirkung sind Innenfeuchte und gemessene kälteste Oberfläche erforderlich.',
  },
  ratgeber_suche: {
    page: '/for-agents.html',
    args: {frage: 'Wäsche trocknen Wohnung Stromkosten', sprache: 'de', max: 3},
    expected_text: ['Tool ratgeber_lesen', 'https://getecoback.com/'],
    conditions: 'Frage, Sprache und aktueller Ratgeberbestand beeinflussen die Treffer. Öffne einen exakten veröffentlichten Treffer mit ratgeber_lesen und zitiere dann dessen HTML-URL.',
  },
  ratgeber_lesen: {
    page: '/waeschetrockner-oder-luftentfeuchter.html',
    args: {pfad: '/waeschetrockner-oder-luftentfeuchter.html'},
    expected_text: [
      'Quelle: https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html',
      'Vollständige Textansicht: https://getecoback.com/waeschetrockner-oder-luftentfeuchter.md',
      'Gekürzt:',
    ],
    conditions: 'Nur exakt veröffentlichte Pfade oder kanonische HTTPS-URLs ohne Suchparameter oder Fragment. Bei gekürztem Ergebnis die vollständige Textansicht und ihre Originalquellen lesen.',
  },
}));

export function legacyCatalogueExample(name) {
  const fixture = fixtures.get(name);
  if (!fixture) return null;
  const {page, args, ...expectations} = fixture;
  const citation_url = origin + page;
  return {
    citation_url,
    citation_markdown_url: citation_url.replace(/\.html$/, '.md'),
    example: {arguments: args, ...expectations},
  };
}
