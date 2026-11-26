import {asksForDehumidifierDrainRoute} from './dehumidifier-drain-intent.mjs?v=f6bce24817e8';
import {asksForSiemensWaterFilter} from './kaffee-wasserfilter-intent.mjs?v=99bfa4094412';

const laundryDryer = '(?:(?:waesche|waermepumpen|kondens|abluft)[ -]?)?trockner(?:s|n)?';
const namedLaundryDryer = new RegExp(`\\b${laundryDryer}\\b`);
const excludedLaundryDryer = new RegExp(`\\b(?:kein(?:e[nmrs]?)?|ohne(?:\\s+(?:den|einen|meinen))?)\\s+${laundryDryer}\\b`,'g');

export function mentionsLaundryDryer(query) {
  return namedLaundryDryer.test(query.replace(excludedLaundryDryer,''));
}

export function asksForLaundryCostComparison(query) {
  const anotherDecision = /\b(?:kaufpreis|anschaffung\w*|amortis\w*|rentier\w*|rechnet|gleichzeitig|parallel|zusammen|ausgeschaltet|abgeschaltet)\b/;
  return mentionsLaundryDryer(query) &&
    /\b(?:luft)?entfeuchter(?:s|n)?\b/.test(query) &&
    /\b(?:(?:waesche|wasch)?ladung(?:en)?|trocknungsgang|trocknungsgaenge)\b/.test(query) &&
    /\b(?:kosten|kostet|stromkosten|stromgeld|euro|billiger|guenstiger|stromverbrauch|kwh)\b/.test(query) &&
    !anotherDecision.test(query);
}

const unavailableLaundryDryer = new RegExp(
  '\\b'+laundryDryer+'\\b\\s+(?:kommt\\b[^.!?;,]{0,65}\\bnicht\\s+in\\s*frage\\b|passt\\b[^.!?;,]{0,45}\\bnicht\\b)', 'g'
);
const singleLaundryPage = '/waeschetrockner-oder-luftentfeuchter.html';
const singleLaundrySection = 'luftentfeuchter-waesche-kosten';
export const laundryWithoutDryer = {path:singleLaundryPage,id:singleLaundrySection,tool:'luftentfeuchter_waesche_einzelkosten'};
export const laundryRatedPower = {path:singleLaundryPage,id:singleLaundrySection,tool:'ratgeber_suche'};

function exactLaundrySingleCost(query) {
  const dehumidifier = /\b(?:luft)?entfeuchter(?:s|n)?\b/;
  const laundry = /\b(?:waesch\w*|waschladung\w*|trocknungsgang|trocknungsdurchgang)\b/;
  const runningCost = /\b(?:kostet|kosten|stromkosten|stromverbrauch|strompreis|stromgeld|teuer|eur|euro|cent)\b/;
  const separateDecision = /\b(?:kaufpreis|anschaffung\w*|amortis\w*|rentier\w*|rechnet|gleichzeitig|parallel|zusammen|abgeschaltet|ausgeschaltet|betriebskosten pro monat)\b/;
  if (!dehumidifier.test(query) || !laundry.test(query) || !runningCost.test(query) || separateDecision.test(query)) return null;
  const available = query.replace(unavailableLaundryDryer,'');
  if (mentionsLaundryDryer(available)) return null;

  const namedRating = /\b(?:typenschild|datenblatt|nenn(?:leistung|watt)|herstellerangab\w*)\b/;
  const wattage = /\b\d{2,4}\s*(?:w|watt)\b/;
  const measured = /\b(?:gemess\w*|verbrauchsmess\w*|durchschnitt\w*|mittler\w*|im mittel)\b|\b\d+(?:[.,]\d+)?\s*kwh\b/;
  if ((namedRating.test(query) || wattage.test(query)) && !measured.test(query)) return laundryRatedPower;
  return query !== available ? laundryWithoutDryer : null;
}

const floorcareGuide = '/guide/saugwischer-kaufberatung.html';
export const tinecoS7Variant = {path:floorcareGuide,id:'tineco-s7-modellwahl',tool:'ratgeber_suche'};
export const tinecoS7FlashDry = {path:floorcareGuide,id:'tineco-s7-flashdry',tool:'ratgeber_suche'};

function exactTinecoS7Task(query) {
  const family = /\bs[ -]?7\b/;
  const manufacturer = /\b(?:tineco|floor[ -]+one)\b/;
  const service = /\b(?:saug\w*\s+(?:gar\s+)?nicht|keine\s+saugkraft|repar\w*|defekt\w*|wart\w*|ersatzteil\w*|fehler\w*|stinkt|laedt\s+nicht)\b/;
  if (!manufacturer.test(query) || !family.test(query) || service.test(query)) return null;
  if (/\b(?:dreame|roborock|s[ -]?(?:5|6|9))\b/.test(query)) return null;

  const flashdry = /\bs[ -]?7[ -]+flash[ -]?dry\b/;
  const pro = /\bs[ -]?7[ -]+pro\b|\b(?:oder|gegen|versus|vs)\s+pro\b/;
  const anotherVariant = /\bs[ -]?7[ -]+(?:stretch|steam|max|ultra|pet|plus|combo)\b|\bflash[ -]?dry[ -]+(?:pet|pro|plus)\b/;
  if (anotherVariant.test(query)) return null;
  if (flashdry.test(query)) return pro.test(query) ? tinecoS7Variant : tinecoS7FlashDry;
  if (pro.test(query)) return null;

  const exactFamily = /^(?:(?:tineco|floor[ -]+one) +)+s[ -]?7$/;
  const buyingOrIdentity = /\b(?:kauf\w*|preis\w*|angebot\w*|modell\w*|variant\w*|unterschied\w*|vergleich\w*)\b/;
  return exactFamily.test(query) || buyingOrIdentity.test(query) ? tinecoS7Variant : null;
}

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
export const ventilationRebound = {...ventilation,tool:'ratgeber_suche'};

function asksWhyIndoorMoistureReturns(query) {
  const humidity = /\b(?:(?:luft|raum)feucht(?:e|igkeit)|feuchtigkeit)\b/;
  const despiteAiring = /\btrotz\s+(?:regelmaessig(?:em|en)\s+)?(?:stoss[ -]?|quer[ -]?)?lueften\b/;
  const afterAiring = /\bnach\s+(?:dem\s+)?(?:stoss[ -]?|quer[ -]?)?lueften\b/;
  const risesAgain = /\bwieder\s+(?:an(?:steig|gestieg)\w*|hoch|hoeher|feuchter|steig\w*)\b|\b(?:steig\w*|geht|klettert)\b[^.?!]{0,85}\bwieder\b/;
  const otherTask = /\b(?:keller\w*|souterrain|draussen|aussen(?:luft|temperatur|feuchte)|wohnmobil\w*|pkw|auto|granulat\w*|ablauf\w*|taupunkt|oberflaechen\w*)\b/;
  const visibleDamage = /\b(?:leck(?:age)?|wasserschaden|nass\w*\s+wand|schimmel\s+an\s+der\s+wand)\b/;
  return humidity.test(query) && !otherTask.test(query) && !visibleDamage.test(query) &&
    (despiteAiring.test(query) || (afterAiring.test(query) && risesAgain.test(query)));
}

export const thermostatReferenceRoom = {
  path:'/guide/heizkoerper-wird-nicht-warm.html',
  id:'referenzraum-warm-nebenraum-kalt',
  tool:'ratgeber_suche',
};

function asksAboutThermostatReferenceRoom(query) {
  const centralControl = /\b(?:zentral\w*\s+(?:raum[ -]?)?thermostat\w*|wand[ -]?thermostat\w*|raumthermostat\w*|raumregler\w*|referenzraum\w*|fuehrungsraum\w*|gasetagenheizung\w*)\b|\bthermostat\b[^.?!]{0,25}\b(?:wohn|schlaf)zimmer\b/;
  const coldRoom = /\b(?:schlafzimmer|kinderzimmer|wohnzimmer|bad(?:ezimmer)?|kueche|nebenraum|ander\w*\s+(?:zimmer|raum|raeum\w*))\b/;
  const tooCold = /\b(?:kalt\w*|kuehl\w*|nicht (?:mehr |richtig )?warm|heiz\w*\s+nicht mehr)\b/;
  const satisfied = /\b(?:schaltet\s+ab|schaltet\b[^.?!]{0,30}\bab|abschaltet|geht aus|stoppt|warm genug|(?:schon|bereits) warm|dort ist es warm|solltemperatur (?:ist )?erreicht)\b|\berreicht\b[^.?!]{0,20}(?:\bsolltemperatur\b|\b\d{2}\s*(?:grad\b|°))/;
  const anotherJob = /\b(?:danfoss|oventrop|adapter\w*|batterie\w*|amortisier\w*|amortisation|ersparnis\w*|stromverbrauch|glucker\w*|wettergefuehrt\w*|aussentemperaturregelung|heizkurve\w*)\b/;
  return centralControl.test(query) && coldRoom.test(query) && tooCold.test(query) &&
    satisfied.test(query) && !anotherJob.test(query);
}

export const stadlerLukasColdEvidence = {
  path:'/guide/luftentfeuchter-keller.html',
  id:'modell-stadler-lukas',
  tool:'entfeuchter_kalt_modellbeleg',
};

function asksForStadlerLukasColdEvidence(query) {
  const exactModel = /\blukas\b/.test(query) && /\bl[ \p{Pd}]?031e\b/u.test(query);
  const coldConditions = /\b(?:keller\w*|kalt\w*|kaelt\w*|niedrig\w* temperatur\w*)\b|\b(?:[5-9]|1[0-5])\s*(?:grad\b|°)/;
  const capability = /\b(?:liter|luftfeuchte\w*|entzieh\w*|entzug\w*|entfeuchtungsleist\w*|leist\w*|betriebsgrenz\w*|mindesttemperatur\w*|betreib\w*|benutz\w*)\b/;
  const otherVariantOrTask = /\blukas\s+(?:little|pro)\b|\b(?:l[ \p{Pd}]?(?!031e\b)\d{3}[a-z0-9]*|filter\w*|pumpe\w*|schlauch\w*|ablauf\w*|reinig\w*|wartung\w*|app|ersatzteil\w*)\b/u;
  return exactModel && coldConditions.test(query) && capability.test(query) && !otherVariantOrTask.test(query);
}

const glazing = {
  path:'/guide/fenster-beschlagen-aussen.html',
  id:'aussen-innen-oder-dazwischen',
  tool:'fenster_beschlag_einordnen',
};
export const wetWindowDiagnosis = {
  path:'/guide/fenster-beschlagen-innen.html',
  id:'fenstersauger-gegen-kondenswasser',
  tool:'ratgeber_suche',
};

const wetWindowNoun = '(?:[a-z]*fenster|(?:innen|fenster)?scheiben?|(?:fenster)?glas)';
const wetWindowArticle = '(?:das|die|mein(?:e)?|unser(?:e)?|dies(?:es|e)|ein(?:e)?)';
const sweatingWindowSubject = new RegExp(
  '(?:^|\\b'+wetWindowArticle+'\\s+)'+wetWindowNoun+'\\s+(?:(?:innen|unten|morgens)\\s+){0,2}schwitz(?:t|en)\\b|' +
  '\\bschwitz(?:t|en)\\s+(?:'+wetWindowArticle+'\\s+)?'+wetWindowNoun+'\\b'
);
const otherWetWindowTask = /\b(?:auto\w*|pkw|fahrzeug\w*|wohnmobil\w*|windschutzscheib\w*|heckscheib\w*|kaercher|fenstersaug\w*|duese\w*|klimaanlag\w*|abluftschlauch|ablaufschlauch|plissee\w*|(?:innen)?rollo\w*|rolll?aden\w*|gardin\w*|vorh(?:ang|aeng)\w*)\b/;

export function asksAboutSweatingIndoorWindow(query) {
  const inside = /\b(?:innen(?:seite|scheiben?|fenster)?|raumseit(?:e|ig)|wohnungsseite)\b/;
  const deniesInside = /\b(?:nicht|nie)\s+(?:von\s+)?innen\w*\b/;
  return inside.test(query) && !deniesInside.test(query) && sweatingWindowSubject.test(query) &&
    !hasOtherWindowSurface(query) && !otherWetWindowTask.test(query);
}

function asksAboutMorningWetWindow(query) {
  const morning = /\b(?:morgens|jeden morgen|am morgen)\b/;
  const wetPane = /\b(?:[a-z]*fenster|(?:innen)?scheiben?)\b(?:\s+(?:ist|sind|morgens|jetzt|immer|heute|komplett|ganz|richtig)){0,6}\s+(?:nass|klatschnass)\b/;
  return morning.test(query) && wetPane.test(query) && !hasOtherWindowSurface(query) && !otherWetWindowTask.test(query);
}

export const balconyThresholdMoisture = {
  path:'/guide/fenster-beschlagen-innen.html',
  id:'balkontuer-schwelle-kondenswasser',
  tool:'ratgeber_suche',
};

function asksAboutBalconyThresholdMoisture(query) {
  const door = /\b(?:balkon|terrassen?)[ -]?tuer\w*\b/;
  const wet = /\b(?:kondens\w*|tauwasser|wasser\w*|nass\w*|feucht\w*|tropf\w*)\b/;
  const threshold = /\b(?:(?:(?:metall|alu|boden|tuer)[ -]?)?(?:schwelle\w*|schiene\w*)|(?:metall|alu)[ -]?leist\w*|unter(?:halb)?\s+(?:(?:der|meiner|einer|eurer)\s+)?(?:balkon|terrassen?)[ -]?tuer\w*)\b/;
  const anotherSurface = /\b(?:zwisch\w*\s+(?:den\s+)?scheib\w*|aussenscheib\w*|windschutzscheib\w*)\b/;
  const doorBottom = /\bunten\b/.test(query) && !/\b(?:innen)?scheib\w*\b/.test(query);
  return door.test(query) && wet.test(query) && (threshold.test(query) || doorBottom) && !anotherSurface.test(query);
}

const boschStacking = {
  path:'/produkte.html',
  id:'waeschesaeule-zubehoer',
};

export function exactBoschStackingGuide(query) {
  const dryer = /\bwqg[ -]?241001\b/;
  const kit = /\bwtz[ -]?274(?:00|10)\b/;
  const otherModel = /\b(?:wqg[ -]?(?!241001\b)[0-9][a-z0-9]+|wtz[ -]?(?!274(?:00|10)\b)\d+)\b/;
  const stacking = /\b(?:zwischenbau|verbindungs|stapel)\w*\b|\b(?:uebereinander|auszug|arbeitsplattentiefe|auf\s+(?:der|einer|meiner)\s+waschmaschine)\b/;
  const otherTask = /\b(?:repar\w*|defekt\w*|kondensat\w*|ablauf\w*|schlauch\w*|energieverbrauch|stromverbrauch|stromkost\w*)\b/;
  return !otherModel.test(query) && !otherTask.test(query) &&
    (kit.test(query) || (dryer.test(query) && stacking.test(query))) ? boschStacking : null;
}

export const boschDryerDrain = {
  path:'/produkte.html',
  id:'bosch-wth83v03-kondensatablauf',
  tool:'bosch_wth83v03_ablaufschlauch_nein_bezug',
};

export const boschDryerCare = {
  path:'/produkte.html',
  id:'bosch-wqg235d00-filterpflege',
  tool:'bosch_wqg235d00_kondensatorpflege_zahl_inventur',
};

export const boschDryerCareComparison = {
  path:'/produkte.html',
  id:'entscheidung-waeschetrockner',
  tool:'ratgeber_suche',
};

function exactBoschDryerCare(query) {
  const model = /\bwqg[ -]?235[ -]?d00\b/;
  const care = /\b(?:flusen[ -]?(?:sieb|filter)\w*|selbstreinig\w*|kondensator\w*|waermetausch\w*|pflege\w*|reinig\w*|saeuber\w*)\b/;
  const another = /\b(?:wqg[ -]?(?!235[ -]?d00\b|241[ -]?001\b)[a-z0-9]{6,}|wth[ -]?\d[a-z0-9]+)\b/;
  const differentTask = /\b(?:ersatzteil\w*|teilenummer|wtz[ -]?\d+|ablauf[ -]?schlauch\w*|kondensat[ -]?ablauf\w*|kondenswasser[ -]?ablauf\w*)\b/;
  if (!model.test(query) || !care.test(query) || another.test(query) || differentTask.test(query)) return null;
  const peer = /\bwqg[ -]?241[ -]?001\b/;
  if (!peer.test(query)) return boschDryerCare;
  return /\b(?:oder|vergleich\w*|unterschied\w*|gegenueber|beide\w*|welch\w*)\b/.test(query) ? boschDryerCareComparison : null;
}

function asksForBoschDryerDrain(query) {
  const model = /\bwth[ -]?83[ -]?v03\b/;
  const otherModel = /\b(?:wth[ -]?83[ -]?v(?!03\b)[a-z0-9]+|wqg[ -]?[a-z0-9]{5,})\b/;
  const drain = /\b(?:(?:wasser)?ablauf[ -]?schlauch\w*|kondens(?:at|wasser)[ -]?(?:ablauf\w*|behaelter\w*)?|wasserbehaelter\w*|wassertank\w*|wtz[ -]?1110)\b/;
  return model.test(query) && !otherModel.test(query) && drain.test(query);
}

export const klarsteinPackage = {
  path:'/guide/klarstein-kraftwerk-smart-12k-test.html',
  id:'kraftwerk-10034664-lieferumfang',
  tool:'ratgeber_suche',
};

function asksForKlarsteinPackage(query) {
  const article = /\b10034664\b/;
  const family = /\bkraftwerk[ -]+smart\b/;
  const twelve = /\b(?:12[ -]?k|12[ .]?000[ -]*btu)\b/;
  const buying = /\b(?:lieferumfang|beilieg\w*|dabei|enthalten|mitgeliefert|zubehoer|fensterabdicht\w*)\b/;
  const different = /\b(?:100(?!34664\b)\d{5}|11[ .]?500|eco[ -]+smart|anthrazit|rosegold|blau)\b/;
  const otherTask = /\b(?:repar\w*|defekt\w*|ersatzteil\w*|kondens\w*|stromverbrauch|stromkost\w*|lautstaerk\w*|dezibel|db|heizfunktion|wie\s+laut)\b|\bstrom\b[^.?!]{0,35}\b(?:verbrauch|brauch|kost)\w*\b/;
  return !different.test(query) && !otherTask.test(query) &&
    (article.test(query) || (family.test(query) && twelve.test(query) &&
      (/\bklarstein\b/.test(query) || buying.test(query))));
}

export const directHeat = {
  path:'/guide/heizkosten-vergleich-rechner.html',
  id:'heizluefter-oder-infrarot',
  tool:'ratgeber_suche',
};

export const gasHeatCost = {
  path:'/guide/klimaanlage-mit-heizfunktion.html',
  id:'heizkosten-klimaanlage-gas',
  tool:'ratgeber_suche',
};

export const infraredAnnualCost = {
  path:'/guide/infrarotheizung-ratgeber.html',
  id:'jahreskosten-hauptheizung',
  tool:'ratgeber_suche',
};

export const infraredRoomWatts = {
  path:'/guide/infrarotheizung-watt-rechner.html',
  id:'watt-rechner-raumgroesse-und-daemmung-eingeben',
  tool:'heizleistung_watt',
};

export const infraredThermostatFit = {
  path:'/guide/infrarotheizung-thermostat.html',
  id:'belastbarkeit-die-zahl-auf-dem-thermostat',
  tool:'ratgeber_suche',
};

function asksForInfraredThermostatFit(query) {
  const device = /\b(?:infrarot[ -]?(?:heiz\w*|panel\w*|paneel\w*)|(?:heidenfeld\s+)?(?:ih[ -]?100|hp[ -]?100[ -]?1))\b/;
  const regulator = /\b(?:(?:steckdosen|funk)[ -]?)?thermostat\w*\b|\b(?:schaltsteckdose\w*|w[ -]?2022)\b/;
  const compatibility = /\b(?:passt|passend\w*|funktionier\w*|kompatib\w*|vertraeg\w*|anschl(?:uss|iess)\w*|erlaub\w*|standby|wiederanlauf\w*|stromausfall\w*|nachruest\w*|unterbrech\w*)\b|\bwieder\s+(?:an|ein)\b/;
  return device.test(query) && regulator.test(query) && compatibility.test(query);
}

function statedRoomAreas(query) {
  return new Set(Array.from(
    query.matchAll(/(?<![\d.,-])\b(\d{1,3}(?:[.,]\d+)?)\s*(?:m²|m2|qm|quadratmetern?)(?![\p{L}\p{N}])/gu),
    match => Number(match[1].replace(',','.')),
  ));
}

function asksForInfraredRoomWatts(query) {
  const heater = /\b(?:infrarot(?:[ -]?(?:heiz\w*|paneel\w*|panel\w*))?|elektroheiz\w*|direktheiz\w*|heizleistung)\b/;
  const sizing = /\b(?:wie viel(?:e)?\s+(?:watt|heizleistung|leistung)|welche\s+(?:wattzahl|heizleistung)|wattzahl\s+(?:brauch\w*|berechn\w*)|heizleistung\s+(?:in watt|berechn\w*))\b/;
  const otherTask = /\b(?:waermepump\w*|gaskessel\w*|gasheiz\w*|heizluefter\w*|heizdecke\w*|klimaanlag\w*|pro jahr|im jahr|jaehrlich\w*|jahres\w*|energieausweis\w*|repar\w*|ersatzteil\w*|reichweite\w*|abstand\w*|punktuell\w*|dusch\w*|am schreibtisch|auf dem sofa|sitzplatz\w*)\b/;
  if (otherTask.test(query) || !heater.test(query) || !sizing.test(query)) return false;
  const areas = statedRoomAreas(query);
  const [area] = areas;
  return areas.size === 1 && area >= 1 && area <= 100;
}

function asksForInfraredAnnualCost(query) {
  const infrared = /\binfrarot(?:[ -]*(?:elektro[ -]*)?(?:heiz\w*|paneel\w*|panel\w*))?\b/;
  const annual = /\b(?:jahreskost\w*|jahresverbrauch\w*|jaehrlich\w*|pro jahr|im jahr|energieausweis\w*|heizwaermebedarf\w*|endenergie\w*)\b/;
  const cost = /\b(?:kosten|kostet|jahreskost\w*|stromkost\w*|verbrauch\w*|jahresverbrauch\w*|stromverbrauch\w*|heizstrom|arbeitspreis|euro|rechnung\w*|berechn\w*|abschaetz\w*)\b/;
  const otherTask = /\b(?:heizluefter|heizdecke|montag\w*|befestig\w*|anschl(?:uss|iess)\w*|waermepumpe\w*)\b/;
  return infrared.test(query) && annual.test(query) && cost.test(query) && !otherTask.test(query);
}

export const carHeaterOutlet = {
  path:'/guide/akku-heizluefter.html',
  id:'auto-12v-steckdose',
  tool:'ratgeber_suche',
};

function asksForCarHeaterOutlet(query) {
  const voltage = /\b12[ -]*(?:v|volt)\b/;
  const vehicle = /\b(?:auto(?=\b|heiz)|pkw\b|kfz\b|fahrzeug\w*|zigarettenanzuend\w*|bordsteckdos\w*)/;
  const heater = /\b(?:[a-z]*heiz[ -]?luefter|auto[ -]?heizer)\w*\b/;
  const otherTask = /\b(?:24|16|48|230)[ -]*(?:v|volt)\b|\b(?:repar\w*|defekt\w*|umbau\w*|ueberbrueck\w*)\b/;
  return voltage.test(query) && vehicle.test(query) && heater.test(query) && !otherTask.test(query);
}

function asksForGasHeatCost(query) {
  const gas = /\b(?:gas|gasheiz\w*|gaskessel\w*|gastherm\w*|erdgas\w*|gas(?:arbeits)?preis\w*|gaskosten)\b/;
  const heatPump = /\b(?:klimaanlag\w*|klimageraet\w*|split[ -]?klima\w*|waermepump\w*|cop)\b/;
  const cost = /\b(?:gaskosten|gas(?:arbeits)?preis\w*|strom(?:arbeits)?preis\w*|vergleich\w*|guenstig\w*|billig\w*|teuer\w*|arbeitspreis\w*|rechn\w*|lohnt|kost\w*|(?:grenz|mindest|break[ -]?even)[ -]?cop)\b|\b\d+(?:[.,]\d+)?\s*(?:ct|cent)\b/;
  const otherTask = /\b(?:repar\w*|defekt\w*|gasgeruch\w*|klimagas\w*|kaeltemittel\w*|warmwasser\w*|foerder\w*|angebot\w*|amorti\w*|anschaffung\w*|investition\w*|austausch\w*|tausch\w*|ersetz\w*|umruest\w*)\b/;
  return gas.test(query) && heatPump.test(query) && cost.test(query) && !otherTask.test(query);
}

function asksForDirectHeatComparison(query) {
  const fan = /\b(?:[a-z]*heiz[ -]?luefter|heizgeblaese)\w*\b/;
  const radiant = /\binfrarot(?:[ -]?(?:heiz\w*|panel\w*))?\b/;
  const comparison = /\b(?:oder|vergleich\w*|billig\w*|guenstig\w*|kost\w*|verbrauch\w*|welch\w*)\b/;
  const otherTask = /\b(?:klimaanlag\w*|waermepump\w*|cop|scop|akku\w*|sicherung\w*|repar\w*|defekt\w*|wandmontag\w*|deckenmontag\w*|ip[ -]?\d{2}|feuchtraum\w*|schimmel\w*)\b/;
  return fan.test(query) && radiant.test(query) && comparison.test(query) && !otherTask.test(query);
}

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

export const windowShadeMeasurement = {
  path:'/guide/luftfeuchtigkeit-richtig-messen.html',
  id:'kondenswasser-hinter-plissee',
  tool:'ratgeber_suche',
};

export const granulateDryingChoice = {
  path:'/guide/luftentfeuchter-granulat-oder-elektrisch.html',
  id:'granulat-waesche-entscheidung',
  tool:'ratgeber_suche',
};

const emptyDehumidifierTank = {
  path:'/guide/luftentfeuchter-zieht-kein-wasser.html',
  id:'pruefen-bevor-du-ein-neues-geraet-kaufst',
  tool:'entfeuchter_leerer_tank_check',
};

export const lowLoadMeterGuide = {
  path:'/strommess-protokoll.html',
  id:'kleine-lasten-messen',
  tool:'ratgeber_suche',
};
const lowLoadMeterDuration = {...lowLoadMeterGuide,tool:'steckdosenmessung_mindestdauer'};
const lowLoadMeterUnchanged = {...lowLoadMeterGuide,tool:'messung_nullanzeige_obergrenze'};

function exactLowLoadMeterTask(query) {
  const meter = /\b(?:(?:strom|energie(?:kosten)?|steckdosen)[ -]*mess(?:geraet|ung)\w*|messsteckdose\w*|smart[ -]*plug\w*|tapo[ -]*p110|pm[ -]*231[ -]*e)\b/;
  const lowLoad = /\b(?:stand[ -]*by|klein\w*\s+(?:last\w*|leistung\w*)|niedrig\w*\s+(?:last\w*|leistung\w*)|mindestlast\w*|messuntergrenze|eigenverbrauch|0[.,]\d+\s*(?:w|watt))\b/;
  const excludes = /\b(?:oekodesign|verordnung|gesetz\w*|maximale\s+last|2300\s*(?:w|watt))\b/;
  if (!meter.test(query) || excludes.test(query)) return null;
  if (/\b(?:leih\w*|ausleih\w*|ausborg\w*)\b/.test(query)) return lowLoadMeterGuide;
  const unchanged = /(?<![\d.,])0(?:[.,]0+)?\s*kwh\b|\b(?:unveraendert|nullanzeige)\b[^.?!]{0,30}\bkwh\b/;
  if (unchanged.test(query)) {
    if (/\bvon\s+0(?:[.,]0+)?\s*(?:kwh\s+)?auf\s+\d/.test(query)) return null;
    const repeated = /\b(?:immer noch|weiterhin|weiter|bleibt|unveraendert)\b/;
    const reset = /\b(?:reset|zurueckgesetz\w*|zuruecksetzen|mitternacht|(?:heute\s+)?um\s+0\s+uhr)\b/;
    const noNegatedReset = query.replace(/\bohne\s+(?:(?:einen|erneuten)\s+)?(?:reset|zuruecksetzen)\b/g,'');
    return repeated.test(query) && !reset.test(noNegatedReset) ? lowLoadMeterUnchanged : lowLoadMeterGuide;
  }
  const instantaneousZero = /(?<![\d.,])0(?:[.,]0+)?\s*(?:w|watt)\b/;
  if (instantaneousZero.test(query)) return lowLoadMeterGuide;
  const duration = /\b(?:wie lange|wie viele stunden|messdauer|messzeit)\b/;
  if (duration.test(query) && lowLoad.test(query)) return lowLoadMeterDuration;
  return lowLoad.test(query) ? lowLoadMeterGuide : null;
}

export const portableCoolingStorage = {
  path:'/guide/mobile-klimaanlage-ueberwintern.html',
  id:'schritt-fuer-schritt-so-machst-du-das-geraet-winterfest',
  tool:'mobile_klima_einlagern_check',
};

export function excludesPortableCoolingStorage(query) {
  const otherAppliance = /\b(?:porta[ -]*split|(?:multi[ -]?)?split[ -]*(?:anlagen?|klima\w*|geraet\w*)|wandklima\w*|waermepumpe\w*|luftentfeuchter\w*|kfz|pkw|auto(?:s|klima\w*)?|wohnmobil\w*|wohnwagen\w*)\b/;
  const fixedInstallation = /\bfest\w*\s+(?:installiert\w*|montiert\w*|aussengeraet\w*)\b|\bausseneinheit\b/;
  const otherJob = /\b(?:heizbetrieb|heizen|frostschutzmittel)\b|\bnicht\s+erst\s+vor\s+(?:der\s+)?winterpause\b/;
  return otherAppliance.test(query) || fixedInstallation.test(query) || otherJob.test(query);
}

function asksForPortableCoolingStorage(query) {
  const appliance = /\b(?:klima(?:anlage|geraet)\w*|schlauchklima\w*|monoblock[ -]*klima\w*|mpph[ -]?09crn7|4048164103065)\b/;
  const storage = /\b(?:winterfest|(?:ue|u)berwinter\w*|einlager\w*|einmott\w*|winterpause|winterlager\w*|(?:im|fuer den|ueber den) winter(?:\s+\w+){0,3}\s+(?:lager\w*|wegstell\w*))\b/;
  return appliance.test(query) && storage.test(query) && !excludesPortableCoolingStorage(query);
}

function asksAboutAnEmptyDehumidifierTank(query) {
  const device = /\b(?:luft)?entfeuchter(?:s|n)?\b|\barete[ -]+one[ -]+(?:20|25)\s*l\b/;
  const emptyTank = /\b(?:\w*tank|wasserbehaelter)\s+(?:(?:vom|des) (?:luft)?entfeuchters?\s+)?(?:(?:bleibt|ist|immer|noch|dauerhaft|weiterhin)\s+){0,3}leer\b|\bleerer?\s+(?:\w*tank|wasserbehaelter)\b/;
  const noWater = /\b(?:zieht|sammelt|holt|entzieht)\s+(?:(?:(?:mein|der|ein)\s+)?(?:luft)?entfeuchter\s+)?(?:(?:aber|mehr|fast|trotzdem)\s+){0,3}kein\s+wasser\b/;
  const doesNotFill = /\bim\s+(?:\w*tank|wasserbehaelter)\s+(?:ist|steht)\s+kein\s+wasser\b|\b(?:\w*tank|wasserbehaelter)\s+(?:(?:meines|meinem|des|vom)\s+(?:luft)?entfeuchters?\s+)?fuellt\s+sich\s+nicht\b/;
  const otherProblem = /\b(?:granulat\w*|[a-z]*entfeuchter[ -]*box\w*|luftentfeuchter[ -]*tabs?|tank[ -]*voll)\b/;
  return device.test(query) && (emptyTank.test(query) || noWater.test(query) || doesNotFill.test(query)) &&
    !otherProblem.test(query) && !asksForDehumidifierDrainRoute(query);
}

export const coolingDiscountReference = {
  path:'/guide/klimaanlage-wann-kaufen.html',
  id:'angebot-30-tage-preis',
  tool:'ratgeber_suche',
};

export const offlineThermostatChoice = {
  path:'/guide/smarte-heizkoerperthermostate-lohnen-sich.html',
  id:'thermostat-ohne-internet',
  tool:'ratgeber_suche',
};

export const siemensFilterDecision = {
  path:'/produkte.html',
  id:'siemens-eq6-intenza',
  tool:'ratgeber_suche',
};

export const karcherCartridgeDecision = {
  path:'/produkte.html',
  id:'kaercher-sc3-entkalkungskartusche',
  tool:'ratgeber_suche',
};

function asksForKarcherCartridge(query) {
  const part = /\b(?:2[ .-]*863[ .-]*(?:018|104)[ .-]*0|4054278026213|4066529064912)\b/;
  const model = /\b(?:sc[ -]*3[ -]*easy[ -]*fix|sc[ -]*1[ -]*multi|1[ .-]*513[ .-]*650[ .-]*0|1[ .-]*516[ .-]*404[ .-]*0)\b/;
  const buying = /\b(?:(?:entkalkungs|ersatz|kalk)?kartusch\w*|entkalker|kalkfilter)\b/;
  const otherModel = /\b(?:deluxe|upright|premium|anniversary|go[ !-]*further|1[ .-]*512[ .-]*600[ .-]*0|sc[ -]*2|sc[ -]*4)\b|\bsc[ -]*1[ -]*multi\s+(?:&\s*)?(?:comfort|up)\b/;
  const maintenance = /\b(?:reset\w*|zuruecksetz\w*|essig|entkalkungsmittel|entkalkungsprogramm|kaffeevollautomat\w*|nasstrockensaug\w*)\b|\b(?:kein\w*\s+dampf|dampft\s+(?:gar\s+)?nicht)\b|\bwasserhaerte\b[^.?!]{0,50}\b(?:einstell\w*|ein)\b|\beinstell\w*\b[^.?!]{0,50}\bwasserhaerte\b/;
  const fullMachine = /\b(?:komplettgeraet\w*|komplett\w*\s+geraet\w*|ganze\w*\s+geraet\w*)\b/;
  return !otherModel.test(query) && !maintenance.test(query) && !fullMachine.test(query) &&
    (part.test(query) || (model.test(query) && buying.test(query)));
}

export const karcherBagDecision = {
  path:'/produkte.html',
  id:'kaercher-wd3-wd4-filterbeutel',
  tool:'ratgeber_suche',
};

export const laundryMeasuredFollowUp = {
  path:'/waeschetrockner-oder-luftentfeuchter.html',
  id:'waesche-messung-naechster-schritt',
  tool:'ratgeber_suche',
};

export function exactHygrometerPlacement(query) {
  const gauge=/\b(?:hygrometer\w*|feuchtemessgeraet\w*)\b/;
  const window=/\bfenster(?:bank|naehe)?\b/;
  const room=/\b(?:raummitte|zimmermitte|mitte des raums|mitten im zimmer|mitten im raum|im raum)\b/;
  const difference=/\b(?:standort\w*|messort\w*|unterschied\w*|abweich\w*|tausch\w*|vergleich\w*)\b/;
  const other=/\b(?:salztest\w*|kalibrier\w*|plissee\w*|aussensensor\w*)\b/;
  if(gauge.test(query)&&window.test(query)&&room.test(query)&&difference.test(query)&&!other.test(query))
    return {path:'/guide/luftfeuchtigkeit-richtig-messen.html',id:'hygrometer-standorte-tauschen'};
  return null;
}

function asksForLaundryMeasuredFollowUp(query) {
  const laundry = /\b(?:waesche\w*|waschladung\w*)\b/;
  const drying = /\b(?:(?:waesche)?trockn\w*|noch nass|noch feucht)\b/;
  const room = /\b(?:(?:raum|luft)feucht\w*|muffig\w*|feucht\w*\s+keller)\b/;
  const problem = /\b(?:langsam|lange|dauert|steig\w*|bleib\w*|trotz|muffig\w*)\b/;
  const repair = /\b(?:fehlercode|defekt|ersatzteil\w*|reparier\w*|trommel|flusensieb)\b/;
  return laundry.test(query) && drying.test(query) && room.test(query) && problem.test(query) && !repair.test(query);
}

function asksForKarcherBag(query) {
  query = query.replace(/[‐‑‒–—]/g, '-');
  const part = /\b(?:kfi[ -]*(?:357|487)|2[ .-]*863[ .-]*(?:314|006)[ .-]*0|4054278777689|4039784945241)\b/;
  const model = /\b(?:wd[ -]*[34]|1[ .-]*628[ .-]*(?:130|270)[ .-]*0)\b/;
  const bag = /\b(?:(?:vlies|papier|filter|staubsauger|sauger|staub|ersatz)*beutel\w*|filtertuet\w*)\b/;
  const otherModel = /\b(?:premium|battery|akku\w*|car[ -]+vac|anniversary|aeg|bosch|einhell|nilfisk|miele)\b|\bwd[ -]*(?:[2567]|[34][ -]+(?:18|s|control))\b|\bwd[ -]*4\s+v[ -]*\d|\b1[ .-]*628[ .-]*(?!(?:130|270)[ .-]*0\b)\d{3}[ .-]*0\b/;
  const fullMachine = /\b(?:komplettgeraet\w*|komplett\w*\s+geraet\w*|komplette\w*\s+(?:kaercher\s+)?(?:nass|trocken|saug)\w*|ganze\w*\s+geraet\w*)\b/;
  return !otherModel.test(query) && !fullMachine.test(query) && (part.test(query) || (model.test(query) && bag.test(query)));
}

function asksForOfflineThermostat(query) {
  const head = /\b(?:(?:heizkoerper|heiz)?thermostat\w*|heizkoerperregler\w*|fritz[ !-]*(?:smart[ -]+thermo[ -]*)?302)\b/;
  const connection = /\b(?:offline|internet[ -]?ausfall|ohne (?:internet(?:verbindung|zugang)?|zentrale|(?:bosch )?(?:smart home )?controller|hub|gateway|fritz[ !-]*box))\b/;
  return head.test(query) && connection.test(query) && !/\b(?:fussbodenheiz\w*|wandthermostat\w*)\b/.test(query);
}

function asksForCoolingDiscountReference(query) {
  const unit = /\b(?:klimaanlag\w*|klimageraet\w*|portasplit\w*)\b/;
  const salesEvent = /\b(?:black[ -]?friday|black[ -]?week\w*|cyber[ -]?monday)\b/;
  const referencePrice = /\b30[ -]+tage(?:n)?\b/.test(query) && /\b(?:preis\w*|referenzpreis\w*)\b/.test(query);
  return unit.test(query) && (salesEvent.test(query) || referencePrice);
}

function asksForGranulateDryingChoice(query) {
  const absorber = /\b(?:granulat(?:[ -]?(?:box|absorber|entfeuchter|luftentfeuchter))?|luftentfeuchter[ -]?tabs?)\b/;
  const alternative = /\b(?:elektrisch\w*|kompressor\w*|waeschetrockn\w*|waesche\s+(?:(?:zu|drinnen)\s+)?trockn\w*|(?:feucht\w*|nass\w*)\s+waesche)\b/;
  return absorber.test(query) && alternative.test(query);
}

export function hasOtherWindowSurface(query) {
  return /\b(?:aussen\w*|draussen|randverbund|(?:scheiben)?zwischenraum|zwischen\s+(?:(?:den|beiden|zwei|drei)\s+){0,2}(?:\w*scheiben|glaesern))\b/.test(query);
}

export function exactWindowShadeMeasurement(query) {
  const shade = /\b(?:plissee|innenrollo|rollo|rollladen|rolladen|gardin|vorhang|vorhaeng)\w*\b/;
  const window = /\b(?:[a-z]*fenster\w*|(?:innen)?scheib\w*|glas)\b/;
  const moisture = /\b(?:nass\w*|naess\w*|feucht\w*|kondens\w*|beschla(?:g|eg)\w*|schwitz\w*|wassertropfen|wasser)\b/;
  const otherTask = /\b(?:auto\w*|windschutzscheib\w*|pkw|fahrzeug\w*|wohnmobil\w*|kaercher|fenstersaug\w*|duese\w*|klimaanlag\w*|abluftschlauch|ablaufschlauch)\b/;
  return shade.test(query) && window.test(query) && moisture.test(query) &&
    !hasOtherWindowSurface(query) && !otherTask.test(query)
    ? windowShadeMeasurement : null;
}

// Consumers pass their normalized German query. Match a task, not a category.
const ex105Path='/guide/pinguino-pac-ex105-test.html';
export const highCoolingLoadDecision={path:'/guide/btu-rechner.html',id:'hohe-kuehllast',tool:'ratgeber_suche'};
export const ex105Exhaust={path:ex105Path,id:'ex105-ablufteinbau',tool:'ratgeber_suche'};
export const ex105Sound={path:ex105Path,id:'lautstaerke',tool:'ratgeber_suche'};
export const ex105Offer={path:ex105Path,id:'ex105-angebot',tool:'ratgeber_suche'};

function exactEx105Evidence(query) {
  const model=/\b(?:(?:pac[ -]*)?ex[ -]*105a?|0151454026|8004399026445)\b/;
  const another=/\b(?:(?:pac[ -]*)?ex[ -]*(?:100|120|130)a?|(?:pac[ -]*)?n[ -]*90|portasplit)\b/;
  if(!model.test(query)||another.test(query))return null;
  const namesEx93=/\b(?:(?:pac[ -]*)?ex[ -]*93(?:[ -]*extreme)?|0151454025)\b/.test(query);
  if(!namesEx93 && /\b(?:abluftschlauch\w*|schlauchdurchmesser|innen?durchmesser|aussen?durchmesser|fensterhalterung\w*|fensterstutzen\w*|kippfenster\w*|dlsa[ -]*012)\b/.test(query))
    return ex105Exhaust;
  if(!namesEx93 && /\b(?:lautstaerk\w*|wie laut|schalldruck\w*|schallleistung\w*|63\s*db)\b/.test(query))
    return ex105Sound;
  if(/\b(?:8004399026445|ean(?:[ -]*13)?|gtin|artikelnummer\w*|hersteller(?:nummer|kennung)|sku|modell(?:nummer|kennung)|produktcode|barcode|angebot\w*|kauf\w*|haendler\w*|amazon)\b/.test(query))return ex105Offer;
  return null;
}

export function exactGermanHouseholdTask(query) {
  if (asksAboutBalconyThresholdMoisture(query)) return balconyThresholdMoisture;
  if (asksAboutSweatingIndoorWindow(query) || asksAboutMorningWetWindow(query)) return wetWindowDiagnosis;
  if (asksForBoschDryerDrain(query)) return boschDryerDrain;
  const dryerCare = exactBoschDryerCare(query);
  if (dryerCare) return dryerCare;
  const ex105=exactEx105Evidence(query);
  if(ex105)return ex105;
  if(/\b(?:klimaanlag\w*|klimageraet\w*|monoblock\w*|(?:ab)?kuehl\w*|btu)\b/.test(query)){
    const areas=statedRoomAreas(query);
    const [area]=areas;
    if((areas.size===1&&area>=45&&area<=120)||/\bmehrer(?:e|en)\s+(?:raeumen?|zimmern?)\b/.test(query))
      return highCoolingLoadDecision;
  }
  const singleCost = exactLaundrySingleCost(query);
  if (singleCost) return singleCost;
  if (asksForLaundryMeasuredFollowUp(query)) return laundryMeasuredFollowUp;
  const tineco = exactTinecoS7Task(query);
  if (tineco) return tineco;
  if (asksForInfraredAnnualCost(query)) return infraredAnnualCost;
  if (asksForInfraredThermostatFit(query)) return infraredThermostatFit;
  if (asksForInfraredRoomWatts(query)) return infraredRoomWatts;
  const exhaustPanel = /\babluft[ -]?platt\w*\b|(?:\b(?:fenster|acryl|hohlkammer)[ -]?platt\w*\b.*\b(?:klimaanlag\w*|klimageraet\w*|abluft\w*)\b)|(?:\b(?:klimaanlag\w*|klimageraet\w*|abluft\w*)\b.*\b(?:fenster|acryl|hohlkammer)[ -]?platt\w*\b)/;
  const opening = /\b(?:ausschnitt\w*|lochr?and\w*|loch\w*|randabstand\w*|anschlusszeichnung\w*)\b/;
  const irrelevant = /\b(?:rechteckig\w*|oval\w*|sicherung\w*|einbruch\w*|lautstaerk\w*|geraeusch\w*|schlauchlaeng\w*|(?:abluft)?schlauch\s+verlaeng\w*)\b/;
  if (exhaustPanel.test(query) && opening.test(query) && !irrelevant.test(query))
    return {path:'/guide/fensterabdichtung-selber-bauen.html',id:'abluft-ausschnitt-pruefen',tool:'abluftplatte_lochposition_pruefen'};
  if (asksForKlarsteinPackage(query)) return klarsteinPackage;
  if (asksForGranulateDryingChoice(query)) return granulateDryingChoice;
  const meterTask = exactLowLoadMeterTask(query);
  if (meterTask) return meterTask;
  if (asksForPortableCoolingStorage(query)) return portableCoolingStorage;
  if (asksAboutAnEmptyDehumidifierTank(query)) return emptyDehumidifierTank;
  if (asksForCoolingDiscountReference(query)) return coolingDiscountReference;
  if (asksForOfflineThermostat(query)) return offlineThermostatChoice;
  if (asksForSiemensWaterFilter(query)) return siemensFilterDecision;
  if (asksForKarcherCartridge(query)) return karcherCartridgeDecision;
  if (asksForKarcherBag(query)) return karcherBagDecision;
  if (asksForGasHeatCost(query)) return gasHeatCost;
  if (asksForCarHeaterOutlet(query)) return carHeaterOutlet;
  if (asksForDirectHeatComparison(query)) return directHeat;
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

  if (asksWhyIndoorMoistureReturns(query)) return ventilationRebound;

  if (asksAboutThermostatReferenceRoom(query)) return thermostatReferenceRoom;

  if (asksForStadlerLukasColdEvidence(query)) return stadlerLukasColdEvidence;

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
