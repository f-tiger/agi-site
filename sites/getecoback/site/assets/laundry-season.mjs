// Put the accepted JSON numbers on one decimal scale so equivalent meter readings give the same payback.
function laundryDecimalUnits(values) {
  const decimals = values.map(value => {
    const [significand, exponent = '0'] = String(value).split('e');
    const [whole, fraction = ''] = significand.split('.');
    return {digits:BigInt(whole + fraction), places:fraction.length - Number(exponent)};
  });
  const places = Math.max(0, ...decimals.map(decimal => decimal.places));
  return {
    scale:10n ** BigInt(places),
    units:decimals.map(decimal => decimal.digits * 10n ** BigInt(places - decimal.places)),
  };
}

function laundryDisplayEuros(amount, scale) {
  const magnitude = amount < 0n ? -amount : amount;
  // Round a half cent away from zero only when reporting monetary amounts.
  const cents = (200n * magnitude + scale) / (2n * scale);
  return Number(amount < 0n ? -cents : cents) / 100;
}

export function checkLaundrySeason({
  ladungen_saison, ladungen_ersetzbar, trockner_kwh, entfeuchter_kwh,
  tarif_eur_kwh, anschaffung_eur, ladungen_vergleichbar, zusatzstrom_erfasst,
}) {
  if (![ladungen_saison,ladungen_ersetzbar].every(Number.isInteger) || ladungen_ersetzbar>ladungen_saison) {
    throw new RangeError('Vergleichbare und ersetzbare Ladungen je Saison');
  }
  const grenze='Vergleich eigener Messungen. Prüfe Raumfeuchte, Lüftung, Platz und verfügbare Zeit vor dem Kauf. Nicht erfasste Heizwärme, Wartung, Lebensdauer und Tarifänderungen fehlen in der Rechnung.';
  const continued = ladungen_saison-ladungen_ersetzbar;
  if (!ladungen_vergleichbar || !zusatzstrom_erfasst) {
    return {status:'erst_vergleichbar_messen',trocknerladungen_weiter:continued,bisher_saison_eur:null,
      gemischt_saison_eur:null,stromersparnis_saison_eur:null,kostendeckung_saisons:null,grenze};
  }
  const {scale, units:[dryer, dehumidifier, tariff, outlay]} =
    laundryDecimalUnits([trockner_kwh, entfeuchter_kwh, tarif_eur_kwh, anschaffung_eur]);
  const costScale = scale * scale;
  const oldCost = BigInt(ladungen_saison) * dryer * tariff;
  const savings = BigInt(ladungen_ersetzbar) * (dryer - dehumidifier) * tariff;
  let status = 'kein_stromkostenvorteil';
  let seasons = null;
  if (savings > 0n) {
    const purchaseCost = outlay * scale;
    const wholeSeasons = (purchaseCost + savings - 1n) / savings;
    if (wholeSeasons <= BigInt(Number.MAX_SAFE_INTEGER)) {
      seasons = Number(wholeSeasons);
      status = outlay === 0n ? 'vorhandene_option_stromguenstiger' : 'rechnerische_kostendeckung';
    } else {
      status = 'kostendeckung_ausserhalb_zahlenbereich';
    }
  }
  return {status,trocknerladungen_weiter:continued,bisher_saison_eur:laundryDisplayEuros(oldCost, costScale),
    gemischt_saison_eur:laundryDisplayEuros(oldCost - savings, costScale),
    stromersparnis_saison_eur:laundryDisplayEuros(savings, costScale),kostendeckung_saisons:seasons,grenze};
}
