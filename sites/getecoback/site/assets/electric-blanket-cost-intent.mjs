const blanket = /\b(?:heiz[ -]?(?:decke|zudecke)n?|waermezudecken?|(?:beurer\s+)?hd[ -]*75)\b/;
const compound = /\b(?:heiz(?:decke|zudecke)n?|waermezudecken?)(?:strom|energie)(?:kosten|verbrauch)\b/;
const otherAppliance = /\b(?:klimaanlagen?|delonghi|pinguino|pac[ -]*n90|n90|8004399512351|heizluefter|waermeunterbetten?|heizkissen|fusswaermer)\b/;

export function isElectricBlanketQuestion(query) {
  return (blanket.test(query) || compound.test(query)) && !otherAppliance.test(query);
}

// Input is normalized German text. A model or a timer alone is not a running-cost request.
export function asksForElectricBlanketCost(query) {
  if (!isElectricBlanketQuestion(query) ||
      /\b(?:kaufpreis\w*|anschaffung\w*|kaufen|amazon|angebot\w*|test\s?sieger|reparier\w*|wasch\w*|reinig\w*|einschlaf\w*|schlaf\w*|nachts|ueber nacht|sicher|darf|erlaubt|brand\w*|vergleich\w*|versus|vs|gasheizung|raumheizung|heizkosten sparen|gemessen\w*|messgeraet|zwischenzaehler)\b/.test(query)) return false;
  const explicitlyElectric = compound.test(query) ||
    /\b(?:stromkosten|stromverbrauch|energieverbrauch|energiekosten|betriebskosten|strom (?:verbrauch\w*|braucht|zieht))\b/.test(query);
  const cost = /\b(?:kost\w*|verbrauch\w*|preis\w*|cent|ct|eur|euro|chf)\b/.test(query);
  const usage = /\b(?:kwh|kilowattstunden?|watt|stunden?|minuten?|abend(?:s|e|en)?|betrieb|nutzung\w*|pro tag|an strom)\b|\d\s?(?:h|w)\b/.test(query);
  return explicitlyElectric || (cost && usage);
}

export const beurerWarmthModelGuide = {
  path:'/guide/heizdecke-stromverbrauch.html',
  id:'beurer-hd75-ub30',
};

export function asksForBeurerWarmthModelFit(query) {
  const hd75 = /\b(?:hd[ -]*75|424[ .-]*00|4211125424008)\b/;
  const ub30 = /\b(?:ub[ -]*30|306[ .-]*00|4211125306007)\b/;
  const blanketModel = hd75.test(query);
  const mattressModel = ub30.test(query);
  const other = /\b(?:nordic|ocean|dark[ -]*grey|felloptik|421[ .-]*(?:06|03)|400[ .-]*(?:00|19)|ub[ -]*(?:33|60|66|74|90|100|101|190)|ersatz\w*|defekt\w*|repar\w*|kaputt|blink\w*|wasch\w*|stecker\w*|fehler\w*)\b/;
  const article = /\b(?:art(?:ikel)?[ .-]*(?:nr|nummer)\.?|artikel)\s*[:.#-]?\s*(\d{3})[ .-]*(\d{2})\b/g;
  const wrongArticle = [...query.matchAll(article)].some(([, prefix, suffix]) =>
    prefix+suffix !== '42400' && prefix+suffix !== '30600');
  const broken = /\b(?:schaltet|startet|geht|heizt|waermt|wird)\s+(?:nicht\s+(?:mehr\b|ein\b|an\b|warm\b)|(?:gleich|sofort|direkt)\b)|\b(?:sofort|direkt|gleich)\s+nach dem einschalten\b/;
  const part = /\b(?:schalter|bedienteil|kabel)\w*\b/.test(query) &&
    /\b(?:neu\w*|kauf\w*|bestell\w*|wechsel\w*|pass\w*)\b/.test(query);
  if ((!blanketModel && !mattressModel) || other.test(query) || wrongArticle || broken.test(query) || part) return false;
  if (blanketModel && mattressModel) return true;
  if (asksForElectricBlanketCost(query)) return false;
  const decision = /\b(?:abschalt\w*|abschaltet|schaltet|timer|ueber nacht|nachts|schlaf\w*|bett\w*|matratz\w*|waermeunterbett\w*|zudeck\w*|liegen|unterlage\w*|unter mir|unterschie\w*|vergleich\w*)\b/;
  return decision.test(query) ||
    (mattressModel && /\b(?:stromverbrauch|stromkosten|nennleistung|watt)\b/.test(query));
}
