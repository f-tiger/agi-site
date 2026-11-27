const core300s=/\bcore[ -]*300[ -]*s\b/;
const withoutPro=/\bohne\s+(?:den\s+)?pro(?:[ -]zusatz)?\b/g;
const otherLevoitModels=/\b(?:pro|beurer|philips|bosch|xiaomi|dyson|rowenta)\b|\b300s[-/][a-z0-9]|\b300s\s+p\b|\bcore[ -]*(?:200|300(?![ -]*s\b)|400|600)|\bcore[ -]*300[ -]*s\b\s+(?:plus|max|ultra|premium)\b/;

function namesOnlyCore300S(query) {
  const variant=query.replace(withoutPro,'');
  return core300s.test(variant) && !otherLevoitModels.test(variant) &&
    !/\b(?:200s|400s|600s)\b/.test(variant);
}

function asksAboutFilterPackaging(query) {
  const installed=/\b(?:vorinstalliert\w*|im (?:geraet|luftreiniger)|(?:geraet|luftreiniger) im set)\b/;
  const packing=/\b(?:packung\w*|verpackung\w*|mehrfachpack\w*|stueck(?:zahl)?|wie viele filter)\b/;
  const replacement=/\b(?:ersatz|wechsel)filters?\b/;
  const namedPackage=/\b(?:packung|verpackung)\s+(?:des|eines|vom|fuer den)\s+(?:(?:originalen?|passenden?)\s+)?(?:standard|ersatz|wechsel)filters?\b/;
  return !installed.test(query) && (namedPackage.test(query) || (replacement.test(query) && packing.test(query)));
}

export function asksForLevoitCore300SBoxFilter(query) {
  return namesOnlyCore300S(query) && !asksAboutFilterPackaging(query) &&
    /\b(?:standardfilter|filter)\b/.test(query) &&
    /\b(?:lieferumfang|mitgeliefert\w*|enthalten|vorinstalliert\w*|dabei)\b/.test(query) &&
    !/\b(?:gebraucht|nachfuell\w*|haustierfilter|spezialfilter)\b/.test(query);
}

// Input is normalized German text. Return a catalogue model only for an exact filter lookup.
export function exactGermanFilterModel(query) {
  if (asksForLevoitCore300SBoxFilter(query)) return null;
  if (!/\b(?:[a-z]*filter(?:s|nummer|modell)?|69309)\b/.test(query)) return null;
  if (/\b(?:philips|bosch|xiaomi|dyson|rowenta|winix|sharp|honeywell|coway|blueair|miele|samsung|trotec)\b/.test(query)) return null;
  if (/\b(?:wasch[a-z]*|auswasch[a-z]*|abwasch[a-z]*|reinig[a-z]*|gereinigt|wie\s+(?:wechsle|wechsel[a-z]*|tausche)|filterwechselanzeige|pflege|filteranzeige|filterlicht|leucht[a-z]*|reset[a-z]*|zuruecksetzen|wechselintervall|wie\s+(?:oft|lange)|wann|(?:filter)?kosten[a-z]*|kostet|preis[a-z]*|beschaedigt[a-z]*|kaputt|schimmel[a-z]*)\b/.test(query)) return null;
  if (/\b(?:lr[ -]*401|core[ -]*300[ -]*s)\b\s+(?:plus|max|ultra|premium)\b/.test(query)) return null;
  const beurer = /\blr[ -]*401\b/.test(query);
  const levoit = core300s.test(query);
  if (beurer === levoit) return null;
  if (beurer) {
    if (Array.from(query.matchAll(/\blr[ -]*(\d{3})\b/g)).some(model => model[1] !== '401')) return null;
    if (/\blevoit\b|\b(?:lr[ -]*)?(?:400|405|500)\b|\blr[ -]*401[-/][a-z0-9]/.test(query)) return null;
    return 'beurer-lr401';
  }
  const variant = query.replace(withoutPro,'');
  if (!namesOnlyCore300S(query)) return null;
  if (/\b(?:spezialfilter|haustierfilter|haustier|pet|smoke|toxin|allergie[a-z]*|aktivkohlefilter)\b|\b(?:kein(?:en)?|ohne|statt|nicht)\s+(?:den\s+)?standard(?:filter)?\b/.test(variant)) return null;
  return 'levoit-core-300s';
}
