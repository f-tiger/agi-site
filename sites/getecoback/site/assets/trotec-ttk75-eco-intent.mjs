export function namesTrotecTtk75Eco(query) {
  return /\bttk[ -]*75[ -]*eco\b/.test(query) &&
    !/\bnicht\s+(?:(?:den|der|das|dem|die|trotec)\s+)*ttk[ -]*75[ -]*eco\b/.test(query) &&
    !/\bttk[ -]*75[ -]*eco[ -]+(?:pro|plus|mini|ii|2(?:[.,]0)?)\b/.test(query);
}

export function asksForTrotecTtk75EcoConditions(query) {
  if (!namesTrotecTtk75Eco(query) ||
      /\b(?:filter\w*|ersatzteil\w*|wartung\w*|reinig\w*|preis\w*|lieferbar\w*|repar\w*|lautstaerke\w*|geraeusch\w*)\b/.test(query)) return false;
  const capacity = /\b(?:liter\w*|entfeuchtungsleist\w*|entfeuchtungsmenge\w*|entzieht|pruefpunkt\w*|pruefbeding\w*|betriebsbereich\w*|betriebstemperatur\w*)\b/.test(query) ||
    /\b\d+(?:[.,]\d+)?\s*l\s*(?:\/\s*(?:tag|24\s*h)|pro\s+tag)\b/.test(query);
  const temperature = /\b(?:kalt\w*|ungeheizt\w*|temperatur\w*|keller\w*)\b|\b\d{1,2}\s*(?:°\s*c|grad)\b/.test(query);
  const otherTask = /\b(?:strom\w*|watt\w*|kosten\w*|kwh|schlauch\w*|ablauf\w*)\b/.test(query);
  return capacity || (temperature && !otherTask);
}

export function asksForTrotecTtk75EcoOffer(query) {
  const exactLabel = namesTrotecTtk75Eco(query);
  const labelledVariant = /\bttk[ -]*75[ -]*eco\b/.test(query) && !exactLabel;
  const exactModel = exactLabel || /\b1120001110\b/.test(query);
  const merchant = /\b(?:kauf\w*|bestell\w*|angebot\w*|preis\w*|haendler\w*|amazon|artikelnummer)\b/;
  const anotherModel = /\b(?:75[ -]*e|ttk[ -]*(?:52|70|72)\b|1120001003|meaco|comfee)\b/;
  const technical = /\b(?:\w*(?:filter|schlauch|pumpe|tank)\w*|zubehoer|ersatzteil\w*|repar\w*|ablauf\w*|strom\w*|kwh|keller\w*|kalt\w*|liter\w*|entzug\w*|leist\w*|geraeusch\w*|temperatur\w*)\b|\b\d{1,2}\s*(?:°\s*c|grad)\b/;
  return exactModel && !labelledVariant && merchant.test(query) && !anotherModel.test(query) && !technical.test(query) &&
    !asksForTrotecTtk75EcoConditions(query);
}
