import {asksForDehumidifierDrainRoute} from './dehumidifier-drain-intent.mjs?v=f6bce24817e8';

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
export const showerFlow = {
  path:'/guide/duschen-kosten-rechner.html',
  id:'durchlauferhitzer-mindestdurchfluss',
  tool:'sparbrause_mindestdurchfluss',
};

function asksForShowerFlow(query) {
  const device = /\bdurchlauferhitzer\w*\b/;
  const showerhead = /\b(?:spar[ -]?(?:duschkopf|duschkoepf|braus)|dusch(?:kopf|koepf|braus)|handbraus|kopfbraus)\w*\b/;
  const fit = /\b(?:pass\w*|funktionier\w*|geeignet\w*|vertraeg\w*|(?:mindest|einschalt)\w+|(?:genueg|reich)\w*)\b/;
  const flow = /\b\d+(?:[.,]\d+)?\s*(?:l\s*\/\s*min|liter\s+(?:pro|je)\s+minute)\b/;
  const buying = /\b(?:kauf\w*|bestell\w*)\b/;
  const otherTask = /\b(?:entkalk\w*|reinig\w*|reparier\w*|defekt\w*|[a-z]*gewinde\w*|[a-z]*halter\w*|wandmontage)\b/;
  return device.test(query) && showerhead.test(query) && !otherTask.test(query) &&
    (fit.test(query) || (flow.test(query) && buying.test(query)));
}

const dishwashing = {
  path:'/geraete-austausch-rechner.html',
  id:'geschirrspueler-handabwasch',
  tool:'spuelmaschine_handspuelen_kosten',
};
const danfossValve = {
  path:'/guide/smarte-heizkoerperthermostate-lohnen-sich.html',
  id:'danfoss-altventil',
  tool:'thermostat_ventilabgleich',
};
export const vacuumOffer = {
  path:'/produkte.html',
  id:'beutelstaubsauger-angebote',
  tool:'beutelstaubsauger_angebot_kosten_pruefen',
};

export const boschDry = {
  path:'/guide/luftentfeuchter-ratgeber.html',
  id:'modell-bosch-d4000-eu',
  tool:'ratgeber_suche',
};

function asksForBoschDry(query) {
  const model = /\b(?:bosch(?:[ -]+(?:home[ -]+comfort|thermotechnik))?[ -]+dry[ -]*4000|d[ -]*4000[ -]+eu|7733703558|4069143047774)\b/;
  if (!model.test(query)) return false;

  const wrongModel = /\b(?:air[ -]*4000i?|dry[ -]*(?:1000|2000|4000i)|d[ -]*4000[ -]+uk|7733703561|4069143047804)\b/;
  const otherIdentifier = /\b(?:(?!7733703558\b)773370\d{4}|(?!4069143047774\b)\d{13})\b/;
  const coldRoom = /\b(?:kalt\w*|kaelt\w*|unbeheiz\w*|pruefpunkt\w*)\b|\b\d{1,2}\s*(?:grad\b|°\s*c\b)/;
  return !wrongModel.test(query) && !otherIdentifier.test(query) &&
    !coldRoom.test(query) && !asksForDehumidifierDrainRoute(query);
}

export const festiveLights = {
  path:'/guide/lichterkette-stromkosten.html',
  id:'zeitschaltuhr-strombilanz',
  tool:'lichterkette_timer_netto',
};

function asksForFestiveLightingCost(query) {
  const lights = /\b(?:(?:advents?|weihnachts?|christbaum|baum)[ -]+beleuchtung|(?:advents?|weihnachts?|christbaum|baum)beleuchtung|lichterkett\w*)\b/;
  const costOrTimer = /\b(?:strom\w*|kost\w*|verbrauch\w*|watt|kwh|zeitschaltuhr\w*|timer|spar\w*|lohnt)\b/;
  const otherTask = /\b(?:anschliess\w*|repar\w*|defekt\w*|brandschutz|ip[ -]?\d{2}|installier\w*|einschaltfenster|einschaltminut\w*|programmier\w*|tageszyklus)\b/;
  return lights.test(query) && costOrTimer.test(query) && !otherTask.test(query);
}

export const comfeeVariant = {
  path:'/guide/luftentfeuchter-keller.html',
  id:'modell-comfee-mddf20',
  tool:'comfee_mddf20_wf_beleggrenze',
};

function asksForComfeeVariant(query) {
  const exactModel = /\b(?:mddf[ -]*20[ -]*den[ -]*7(?:[ -]*wf)?|10000651|10000726|40[ -]*48164[ -]*(?:10301[ -]*0|10348[ -]*5))\b/;
  const otherModel = /\b(?:mddf[ -]*16[ -]*den[ -]*7|mddf3[ -]*\d{2}[ -]*den[ -]*7|10000650|10000725|4048164103003|4048164103478)\b/;
  const coldRoom = /\b(?:kalt\w*|kaelt\w*|unbeheiz\w*|pruefpunkt\w*)\b|\b\d{1,2}\s*(?:grad\b|°\s*c\b)/;
  return exactModel.test(query) && !otherModel.test(query) && !coldRoom.test(query) &&
    !asksForDehumidifierDrainRoute(query + ' luftentfeuchter');
}

function asksForVacuumOffer(query) {
  const s1 = /\b(?:guard[ -]+s1|12558410)\b/.test(query);
  const m1 = /\b(?:guard[ -]+m1|m1[ -]+parquet|12560320)\b/.test(query) ||
    (s1 && /\bm1\b/.test(query));
  const bosch = /\bbgbs2ba1p\b/.test(query);
  const blocked = /\b(?:performance|cat\s*(?:&|und|and)?\s*dog|guard[ -]+l1|repar\w*|defekt\w*|wechselanzeig\w*)\b/.test(query);
  const packagePart = /\b(?:parkett(?:buerst\w*|dues\w*)|(?:boden|universal)?dues\w*|lieferumfang)\b/.test(query);
  const offer = /\b(?:angebot\w*|aufpreis|gesamtpreis|paketpreis|kost\w*|preisvergleich)\b/.test(query);
  return !blocked && ((s1 && m1 && (packagePart || offer)) ||
    (m1 && packagePart && /\b(?:parquet|12560320)\b/.test(query)) || (bosch && packagePart));
}

function humidifierAccessoryTask(query) {
  const buying = /\b(?:welch\w*|wieviel\w*|wie\s+viel\w*|artikelnummer|bestell\w*|kauf\w*|pass\w*|pack\w*|filterpack\w*|reicht)\b/.test(query);
  if (!buying || /\b(?:reinig\w*|entkalk\w*|stromverbrauch|stromkosten|oskar[ -]+big)\b/.test(query)) return null;

  const destination = {path:'/guide/luftbefeuchter-ratgeber.html', id:'ersatzteile-zuordnen'};
  const filter = /\b(?:ersatz|verdunster|befeuchtungs)?filter\w*\b|\b(?:verdunster)?kassett\w*\b/.test(query);
  const pads = /\b(?:kalk)?pads?\b/.test(query);
  const oskar = /\b(?:oskar[ -]+little|o[ -]?(?:020|060|030))\b/.test(query);
  const otherOskar = /\bo[ -]?(?!(?:020|060|030)\b)\d{3}\b/.test(query);
  const lb200 = /\b(?:lb[ -]?200|10069|110[ .]?005)\b/.test(query);
  const lb55 = /\b(?:lb[ -]?55|68605|163[ .]?141)\b/.test(query);
  const otherBeurer = /\blb[ -]?(?!(?:200|55)\b)\d+\b/.test(query);

  if (oskar && (filter || /\bo[ -]?030\b/.test(query)) && !otherOskar && !lb200 && !lb55 && !otherBeurer) {
    return {...destination, tool:'oskar_filtermatten_gemeinsamer_vorrat'};
  }
  if (lb200 && filter && !pads && !oskar && !lb55 && !otherBeurer) {
    return {...destination, tool:'beurer_lb200_filter_frist_auslastung'};
  }
  if (lb55 && pads && !filter && !oskar && !lb200 && !otherBeurer) {
    return {...destination, tool:'beurer_lb55_kalkpad_packungswiderspruch'};
  }
  return null;
}

// Consumers pass their normalized German query. Match a task, not a category.
export function exactGermanHouseholdTask(query) {
  if (asksForShowerFlow(query)) return showerFlow;
  if (asksForVacuumOffer(query)) return vacuumOffer;
  if (asksForBoschDry(query)) return boschDry;
  if (asksForComfeeVariant(query)) return comfeeVariant;
  if (asksForFestiveLightingCost(query)) return festiveLights;
  const accessory = humidifierAccessoryTask(query);
  if (accessory) return accessory;

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

  const machine = /\b(?:geschirrspueler\w*|(?:geschirr)?spuelmaschin\w*)\b/;
  const byHand = /\b(?:handabwasch\w*|handspuel\w*|(?:per|von|mit der) hand)\b/;
  const useOrCost = /\b(?:kost\w*|billig\w*|guenstig\w*|teuer\w*|spar\w*|strom\w*|wasserverbrauch\w*|liter|kwh|lohnt)\b/;
  if (machine.test(query) && byHand.test(query) && useOrCost.test(query)) return dishwashing;

  const radiatorValve = /\b(?:heizkoerper\w*|thermostat\w*|(?:klick|klemm)(?:ventil|anschluss)\w*|ra|rav|ravl)\b/;
  const valveFit = /\b(?:pass\w*|adapter\w*|unterscheid\w*|erkenn\w*|identifizier\w*|montier\w*|anschluss\w*)\b/;
  const exactHead = /\b(?:fritz!?\w*|dect\w*|avm|bosch\w*|tado\w*|oventrop|homematic\w*|netatmo|tapo|kasa|20003120|875000[0-9]+)\b/;
  const repair = /\b(?:tropf\w*|undicht\w*|leck\w*|reparier\w*|reinigen|ersetzen\s+ohne\s+adapter)\b/;
  if (/\bdanfoss\b/.test(query) && radiatorValve.test(query) && valveFit.test(query) &&
      !exactHead.test(query) && !repair.test(query)) return danfossValve;
  return null;
}
