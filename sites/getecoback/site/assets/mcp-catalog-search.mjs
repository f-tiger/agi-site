const german = {ä:'ae', ö:'oe', ü:'ue', ß:'ss'};
const normalize = value => String(value).toLowerCase()
  .replace(/[äöüß]/g, letter => german[letter]).normalize('NFD').replace(/\p{Diacritic}/gu, '');
const words = value => normalize(value).match(/[a-z0-9]+/g) || [];

const questionWords = new Set((
  'wie was wann wo welche welcher welches welchen welchem wer weswegen wieso weshalb wieviel ' +
  'kann kannst koennen soll sollte ich du er sie es wir ihr uns mir mein meine meinen meiner meinem unseren unserem unsere unser euren ' +
  'ist sind war waren sei wird werden wurde wurden hat hatte haben habe hast gibt brauche braucht brauchen ' +
  'richtig richtige richtigen geeignet passende viel viele finde finden suche suchen vergleiche ' +
  'den dem der die das des ein eine einen einem einer eines ' +
  'auf aus mit bei beim im in am fuer fuers und oder ins zum zur vom von vor nach an ueber durch ohne unter bis seit ' +
  'darf muss muessen mache machen wenn ob auch noch nur schon dann trotzdem damit dazu dabei hier dort heute gerade ' +
  'dieses dieser diesen dieselbe dasselbe solche beiden beide jeden jedem jeder ihnen jemand ihn diese kommt steckt bitte hilfe helfen ' +
  'what how which can need should does would the my that with and for from but'
).split(' '));

// Common words for tools whose formal identifiers differ from everyday German.
const taskWords = new Map([
  ['dusche_zeit_bei_wasserbudget', 'duschen litern liter wasserbudget duschdauer lange'],
  ['saugroboter_kabelroute_vorbereiten', 'roboter kabel faehrt ueberfaehrt kabelsalat'],
  ['entfeuchter_ablaufcheck', 'abflussschlauch ablaufschlauch abfluss auslass keller oben hoeher fuehren ableiten kondensat'],
  ['luftreiniger_ersatzfilter_zuordnung', 'passt ersatzfilter luftreinigermodell luftreiniger filternummer'],
  ['waesche_trockenweg_sortierplan', 'liegeplaetze leine liegend liegen haengend'],
  ['textil_masshaltigkeit_vor_nach_pflege', 'stoff waschen eingelaufen geschrumpft schrumpfung'],
  ['lueftung_aussenluft_umluftrate_aufteilen', 'frischluft aussenluftanteil'],
  ['stromjournal_mehrfachzahlung_kandidat', 'stromrechnung doppelt zweimal bezahlt doppelzahlung'],
  ['stromrechnung_messfenster_randtage', 'zaehlermessung zaehlerdaten abrechnungszeitraum'],
  ['saugwischer_selbstreinigung_restpflicht_lesen', 'nasssauger waschsauger schmutzwassertank selbstreinigung entleeren leeren restpflege'],
  ['wasch_trockner_zweiladung_uebergabestau', 'waschladung wartezeit wartet nacheinander zweite'],
  ['vergleichstest_teilnoten_spannweite_luecke', 'klimageraetevergleich gesamtnote endnote teilbewertung'],
  ['modellhandbuch_fertigungslos_geltungsgrenze', 'bedienungsanleitung nachtrag serienlos revisionsnachtrag'],
  ['stromablesung_mittleren_wert_korrigieren', 'zaehlerstand zwischenstand ablesung berichtigen verschrieben abschnitt'],
  ['dachfenster_stoffkit_kantenreserve_einzeln', 'stoffabdichtung umfang seitenlaenge randlaenge'],
  ['pflege_uebergabe_rueckfrage_zu_geraeteteil', 'rueckmeldung pflegen geraetepflege pflegestatus bestaetigung'],
  ['querlueften_koordination_zwei_bedienfenster', 'gemeinsam gleichzeitig zeitfenster ueberschneidung'],
  ['warmwasser_parallelzapfung_abweichungsprobe', 'dusche zapfstelle wasserhahn gleichzeitig parallelentnahme'],
  ['pc_chip_und_ansaugluft_abstand_zerlegen', 'cpu prozessor pc raumluft ansaugluft angesaugt waermer temperaturabstand'],
  ['luftkuehler_tankbilanz_ueber_wasserwege', 'luftkuehler tank wasser ruecklauf tropfwasser wasserverlust wasserbilanz'],
  ['heizwaesche_massenplateau_vor_wirklichem_ziel', 'waesche heizwaesche beheizt waeschestaender leichter gewicht trocken stehengeblieben plateau trockenziel'],
  ['gefrierschrank_24h_haushaltsspitze_und_bestandsvolumen', 'gefrierschrank grosseinkauf kilo kilogramm gefriergut liter stunden gefriervermoegen vorrat vorratsvolumen gsn33ewev gsn58dwdv'],
  ['bosch_sbv4ebx00d_nische_tueroeffnung_abgleichen', 'geschirrspueler spuelertuer tueroeffnung gang grad durchgang offen'],
  ['wasch_trocken_saeule_herstellerkombination_beleg', 'waschmaschine trockner miele bosch wtv 501 511 512 t1 classic white chrome stapelsatz verbindungssatz'],
  ['q350_tr_250m3_schallweg_druckpunkte_v0126', 'comfoair zehnder q350 v0126 laut schallleistung kubikmetern stunde pascal zuluftseite abluftseite'],
  ['oekodesign_teilgruppe_rollenweg_de', 'ersatzteil ersatzteile spuelmaschine geschirrspueler waschmaschine ablauffilter pumpe sprueharm reparaturbetrieb verbraucher'],
  ['dunstabzug_de_modell_set_filter_belegkette', 'bosch dwb66bc50 umluftset dwz1dx1i6 dzz1xx1b6 ersatzfilter starterset filter kompatibilitaet'],
  ['backofenzubehoer_reinigungsart_exakter_beleg', 'miele h2861bp 2861 flexiclip hfc70 hfc70c pyrolyse backofen reinigung drin'],
  ['tisken_50400307_zwei_wandfelder_oberflaeche', 'ikea tisken saugnapfhalter saugnapf fliese fliesenspiegel glatt glatten fuge fliesenkante duschhalter'],
  ['elektrog_kleingeraete_dreifach_mass_anzahl', 'toaster klein elektrohandel altgeraete altgeraet abgeben rueckgabe ruecknahme ohne kauf neukauf drei'],
]);

// Group common noun endings while retaining a meaningful root.
function stem(word) {
  const root = word.replace(/(?:ern|en|er|es|e|n|s)$/, '');
  if (root.length < 4) return word;
  // A genitive can still retain the noun's regular ending, as in "Fensters".
  const consistent = root.replace(/(?:er|e)$/, '');
  return consistent.length >= 4 ? consistent : root;
}

function lexicon(value) {
  const exact = new Set(words(value));
  const roots = new Set([...exact].map(stem));
  return {exact, roots};
}

function wordMatch(term, root, field, compound) {
  if (field.exact.has(term)) return 3;
  if (term.length >= 5 && field.roots.has(root)) return 2;
  if (!compound || root.length < 4) return 0;
  for (const fieldRoot of field.roots) {
    const fieldIsShorter = fieldRoot.length < root.length;
    const shorter = fieldIsShorter ? fieldRoot : root;
    const longer = fieldIsShorter ? root : fieldRoot;
    if (shorter.length >= 4 && longer.length - shorter.length >= 3 &&
        (longer.startsWith(shorter) || longer.endsWith(shorter))) return 1;
  }
  return 0;
}

export function indexCatalogue(tools) {
  return tools.map(tool => ({
    tool,
    name: normalize(tool.name),
    identifiers: lexicon(tool.name),
    aliases: lexicon(taskWords.get(tool.name) || ''),
    description: lexicon(tool.description),
    reference: lexicon([tool.category, (tool.page || tool.citation_url || '').split('/').at(-1).replace(/\.html$/, '')].join(' ')),
  }));
}

function matchWeight(term, root, entry) {
  const identifier = wordMatch(term, root, entry.identifiers, true);
  const alias = wordMatch(term, root, entry.aliases, false);
  if (identifier || alias) return Math.max(identifier ? identifier + 4 : 0, alias ? alias + 3 : 0);
  const body = wordMatch(term, root, entry.description, true);
  const reference = wordMatch(term, root, entry.reference, true);
  return Math.max(body, Math.min(reference, 2));
}

export function findCatalogueTools(index, {query='', category='', name=null}={}) {
  const eligible = entry => (!category || category === entry.tool.category) && (name === null || name === entry.tool.name);
  const bounded = query.slice(0, 512);
  const exact = normalize(bounded.trim());
  if (!exact) return query.length === bounded.length ? index.filter(eligible).map(entry => entry.tool) : [];
  if (query.length === bounded.length) {
    const exactEntry = index.find(entry => entry.name === exact);
    if (exactEntry) return eligible(exactEntry) ? [exactEntry.tool] : [];
  }

  const tokens = words(bounded).filter(token =>
    (token.length >= 3 || /^[a-z][0-9]$/.test(token)) && !questionWords.has(token));
  const observed = new Map();
  for (const term of tokens) {
    const root = stem(term);
    if (!observed.has(root)) observed.set(root, {term, root, strongFrequency:0});
  }
  const unique = [...observed.values()];
  if (!unique.length) return [];
  const terms = unique.length > 24 ? [...unique.slice(0, 12), ...unique.slice(-12)] : unique;
  const termCount = terms.length;
  const matches = [];
  for (const entry of index) {
    const weights = terms.map(({term, root}) => matchWeight(term, root, entry));
    const matched = weights.filter(Boolean).length;
    if (!matched) continue;
    for (let i = 0; i < terms.length; i++) {
      if (weights[i] >= 5) terms[i].strongFrequency++;
    }
    if (eligible(entry)) matches.push({tool:entry.tool, weights, matched});
  }

  const required = termCount <= 2 ? termCount : Math.max(3, Math.ceil(termCount / 2));
  const rareLimit = Math.max(4, Math.floor(index.length / 10));
  const ranked = [];
  for (const {tool, weights, matched} of matches) {
    const strong = weights.filter(weight => weight >= 5).length;
    const distinctive = weights.some((weight, i) => weight >= 5 && terms[i].strongFrequency <= rareLimit);
    // A single term needs a full word or an identifier match, not a weak compound fragment.
    const ordinary = termCount === 1 ? weights[0] >= 2 :
      matched >= required && (strong > 0 || matched >= 3);
    const concise = termCount === 3 && matched >= 2 && strong >= 2 && distinctive;
    // Extra context must still contain several corroborating terms, including a rare tool term.
    const contextual = termCount >= 4 && matched >= Math.max(3, Math.ceil(termCount / 5)) && strong >= 2 && distinctive;
    if (!ordinary && !concise && !contextual) continue;
    const score = weights.reduce((sum, weight, i) =>
      sum + weight * (weight >= 5 && terms[i].strongFrequency <= rareLimit ? 2 : 1), 0);
    ranked.push({tool, score});
  }
  return ranked.sort((a, b) => b.score - a.score).map(result => result.tool);
}
