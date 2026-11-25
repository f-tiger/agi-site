const curtain = {
  path:'/guide/thermovorhang-ratgeber.html',
  id:'thermovorhang-bahnenbedarf',
  tool:'thermovorhang_bahnenbedarf',
};
const ventilation = {
  path:'/guide/richtig-lueften-im-winter.html',
  id:'lueften-vorher-nachher',
  tool:'lueften_messwirkung',
};
const glazing = {
  path:'/guide/fenster-beschlagen-aussen.html',
  id:'aussen-innen-oder-dazwischen',
  tool:'fenster_beschlag_einordnen',
};

// Consumers pass their normalized German query. Match a task, not a category.
export function exactGermanHouseholdTask(query) {
  const hangingFabric = /\b(?:(?:thermo|waermeschutz)[ -]?)?vorha(?:ng|enge)\w*\b|\bgardin\w*\b/;
  const buyingQuantity = /\bwie\s+viel(?:e)?\s+(?:thermovorha\w*|vorha\w*|gardin\w*|bahnen?|schals?|packungen?|stoff|meter)\b|\b(?:bahnenbedarf|stoffbedarf|stoffbreite\s+berechnen)\b/;
  const sizingWidth = /\bwie\s+breit\b[^.?!]{0,56}\b(?:thermovorha\w*|vorha\w*|gardin\w*|stoff\w*|bahnen?)\b/;
  const labelBasis = /\b(?:etikett\w*|aufgedruckt\w*|packungsbreite|bezieht sich)\b|\bpro\s+(?:schal|bahn)\b[^.?!]{0,80}\boder\b[^.?!]{0,50}\b(?:set|packung|beide)\b/;
  const packContents = /\b(?:stecken|sind|liegen)\s+(?:in\s+|im\s+)[^.?!]{0,40}\b(?:packung|set|lieferumfang)\b/;
  if (hangingFabric.test(query) && (buyingQuantity.test(query) || sizingWidth.test(query)) &&
      !labelBasis.test(query) && !packContents.test(query)) return curtain;

  const airing = /\b(?:(?:stoss|quer)?lueften(?:s)?|gelueftet|lueftung)\b/;
  const moisture = /\b(?:(?:raum|luft)?feucht(?:e|igkeit)|wassergehalt|prozent)\b|%/;
  const paired = /\bvorher\b[\s\S]*\b(?:danach|nachher)\b|\bvor\s+und\s+nach(?:\s+dem)?\s+(?:stoss|quer)?lueften\b/;
  const effect = /\bhat\s+(?:das\s+)?(?:stoss|quer)?lueften\s+geholfen\b|\bnach\s+dem\s+(?:stoss|quer)?lueften\b[^.?!]{0,80}\b(?:trockener|feuchter)\b/;
  const outdoors = /\b(?:draussen|aussen(?:luft|temperatur|feuchte))\b/;
  const indoors = /\b(?:innen|innenraum|raum|raumluft|raumfeuchte|wohnung|zimmer|schlafzimmer|wohnzimmer)\b/;
  const roomMentioned = indoors.test(query);
  const checksRoomMoisture = moisture.test(query) || (roomMentioned && /\b(?:feuchter|trockener)\b/.test(query));
  if (airing.test(query) && checksRoomMoisture && (paired.test(query) || effect.test(query)) &&
      !/\bkeller\w*\b/.test(query) && (!outdoors.test(query) || roomMentioned)) return ventilation;

  const betweenPanes = /\bscheibenzwischenraum\b|\bzwischen\s+(?:(?:den|beiden|zwei|drei)\s+){0,3}(?:fenster|glas)?scheiben\b/;
  const glassMoisture = /\b(?:beschla(?:g|eg)\w*|kondens\w*|feucht\w*|wasser\w*|tropfen\w*|blind\w*|milchig\w*|trueb\w*|schleier\w*)\b/;
  const unrelatedGlass = /\b(?:auto\w*|pkw|fahrzeug\w*|windschutzscheib\w*|heckscheib\w*|backofen\w*|ofentuer\w*|aquari\w*)\b/;
  const photoComparison = /\b(?:foto|bild)(?:paar|vergleich|abgleich)\b|\b(?:fotos?|bilder)\b[^.!?]{0,65}\b(?:vergleich|abgleich)\w*\b|\b(?:vergleich|abgleich)\w*\b[^.!?]{0,65}\b(?:fotos?|bilder)\b/;
  const ruledOut = /\b(?:nicht|nie)\s+(?:im scheibenzwischenraum|zwischen\s+(?:(?:den|beiden|zwei|drei)\s+){0,3}(?:fenster|glas)?scheiben)\b|\bkein(?:en)? beschlag zwischen\b/;
  if (betweenPanes.test(query) && glassMoisture.test(query) && !unrelatedGlass.test(query) &&
      !photoComparison.test(query) && !ruledOut.test(query)) return glazing;
  return null;
}
