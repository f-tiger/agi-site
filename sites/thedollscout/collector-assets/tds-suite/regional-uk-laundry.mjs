import {matchesInputSchema} from './input-schema.mjs';

const words = (en, de, zh) => ({en, de, zh});
const manufacturerUrl = 'https://www.meaco.com/products/meacodryarete1-12l';
const guideUrl = 'https://thedollscout.com/uk/indoor-laundry#model-1';
const locales = ['en', 'de', 'zh'];

export const UK_LAUNDRY_TOOL = Object.freeze({
  name: 'tds_uk_laundry_session',
  slug: 'uk-laundry-session',
  category: 'climate',
  title: words(
    'Compare measured UK laundry-session electricity costs',
    'UK-Wäsche: Stromkosten ganzer Trocknungsgänge vergleichen',
    '英国室内晾衣：比较实测整次用电费用',
  ),
  description: words(
    'Enter measured kWh for two complete sessions and your own tariff in pence/kWh. Get electricity costs in GBP; compare only similar loads, conditions and drying endpoints. MeacoDry Arete One 12L UK is a manufacturer reference, not a tested recommendation.',
    'Gemessene kWh zweier vollständiger Trocknungsgänge und den eigenen Tarif in Pence/kWh eingeben. Stromkosten in GBP berechnen; nur ähnliche Beladung, Bedingungen und Endtrocknung vergleichen. MeacoDry Arete One 12L UK dient als Herstellerreferenz, nicht als getestete Empfehlung.',
    '填写两次完整过程的实测千瓦时，以及自己的便士/千瓦时电价，计算英镑电费。只比较衣物量、条件和最终干燥程度接近的过程。MeacoDry Arete One 12L 英国版仅为厂家资料示例，并非实测推荐。',
  ),
  inputSchema: {
    type: 'object',
    properties: {
      sessionAKwh: {type: 'number', minimum: 0, maximum: 50},
      sessionBKwh: {type: 'number', minimum: 0, maximum: 50},
      tariffPencePerKwh: {type: 'number', minimum: 0, maximum: 200},
      sessionsPerWeek: {type: 'integer', minimum: 1, maximum: 21},
      comparableSessions: {type: 'boolean'},
    },
    required: ['sessionAKwh', 'sessionBKwh', 'tariffPencePerKwh', 'sessionsPerWeek', 'comparableSessions'],
    additionalProperties: false,
  },
  example: {sessionAKwh: 1.2, sessionBKwh: 0.8, tariffPencePerKwh: 27.5, sessionsPerWeek: 5, comparableSessions: true},
  fieldTitles: {
    sessionAKwh: words('Session A: measured kWh for the whole session', 'Durchgang A: gemessene kWh des ganzen Durchgangs', '过程 A：完整一次的实测用电量（千瓦时）'),
    sessionBKwh: words('Session B: measured kWh for the whole session', 'Durchgang B: gemessene kWh des ganzen Durchgangs', '过程 B：完整一次的实测用电量（千瓦时）'),
    tariffPencePerKwh: words('Your electricity tariff (pence per kWh, not pounds)', 'Dein Stromtarif (Pence pro kWh, nicht Pfund)', '你的电价（便士/千瓦时，不是英镑）'),
    sessionsPerWeek: words('Comparable sessions per week', 'Vergleichbare Durchgänge pro Woche', '每周可比较的过程次数'),
    comparableSessions: words('I have checked similar loads, conditions and final dryness', 'Ich habe ähnliche Beladung, Bedingungen und Endtrocknung geprüft', '我已确认衣物量、条件及最终干燥程度相近'),
  },
  evidence: {url: manufacturerUrl, checked: '2026-11-22'},
});

const copy = {
  en: {
    pending: 'Individual electricity costs are shown. Check similar loads, conditions and final dryness before comparing the sessions.',
    equal: 'The entered sessions have the same weekly electricity cost to the nearest penny. This does not establish equal drying performance.',
    cheaper: amount => `For your entered readings, session B costs ${amount} less in electricity per week. This is not proof of better drying or a reason by itself to buy an appliance.`,
    dearer: amount => `For your entered readings, session B costs ${amount} more in electricity per week. Check the drying outcome as well as the electricity bill.`,
    scope: 'Electricity only, using your measured kWh and tariff. Weekly totals use unrounded session costs; displayed amounts are rounded to pennies, and differences compare those displayed costs. Purchase price, standing charges, maintenance and heating effects are excluded. A lower electricity cost does not prove equal dryness or fix persistent damp.',
    reference: 'Manufacturer example only; it does not identify or measure either entered session. Published power is not a whole-session energy reading or a guaranteed drying time.',
    condition: 'Manufacturer table: 20°C and 60% relative humidity',
    guide: 'Check the UK model and buying conditions',
  },
  de: {
    pending: 'Die einzelnen Stromkosten werden angezeigt. Vor dem Vergleich ähnliche Beladung, Bedingungen und Endtrocknung prüfen.',
    equal: 'Die eingegebenen Durchgänge haben auf den Penny gerundet dieselben wöchentlichen Stromkosten. Das belegt keine gleiche Trocknungsleistung.',
    cheaper: amount => `Mit deinen Messwerten kostet Durchgang B pro Woche ${amount} weniger Strom. Das belegt weder bessere Trocknung noch allein einen sinnvollen Gerätekauf.`,
    dearer: amount => `Mit deinen Messwerten kostet Durchgang B pro Woche ${amount} mehr Strom. Neben der Stromrechnung auch das Trocknungsergebnis prüfen.`,
    scope: 'Nur Stromkosten aus deinen gemessenen kWh und deinem Tarif. Wochensummen verwenden ungerundete Kosten je Durchgang; angezeigte Beträge werden auf Pence gerundet und Differenzen aus diesen Beträgen gebildet. Kaufpreis, Grundpreis, Wartung und Heizeffekte sind ausgeschlossen. Niedrigere Stromkosten belegen weder gleiche Endtrocknung noch eine Lösung für dauerhafte Feuchte.',
    reference: 'Nur ein Herstellerbeispiel; es identifiziert oder misst keinen der eingegebenen Durchgänge. Veröffentlichte Leistung ist kein Energie-Messwert für einen ganzen Durchgang und garantiert keine Trocknungszeit.',
    condition: 'Herstellertabelle: 20°C und 60% relative Luftfeuchtigkeit',
    guide: 'UK-Modell und Kaufbedingungen prüfen',
  },
  zh: {
    pending: '已显示各次过程的电费。比较前请先确认衣物量、条件及最终干燥程度相近。',
    equal: '按便士取整后，输入的两种过程每周电费相同。这不能证明干燥效果相同。',
    cheaper: amount => `按你输入的实测数据，过程 B 每周电费少 ${amount}。这不能证明干燥更好，也不能单独作为购买设备的理由。`,
    dearer: amount => `按你输入的实测数据，过程 B 每周电费多 ${amount}。请同时核对最终干燥效果和用电费用。`,
    scope: '仅按你的实测用电量和电价计算电费。每周金额以未取整的单次电费计算；显示金额按便士取整，差额比较显示金额。不含购置费、电费固定费用、维护费或供暖影响。电费更低不证明干燥程度相同，也不能据此解决持续潮湿问题。',
    reference: '仅为厂家资料示例，不能识别或测量你输入的任何一次过程。公布的瓦数不等于整次实测用电量，也不能保证干燥时间。',
    condition: '厂家表格条件：20°C、相对湿度 60%',
    guide: '核对英国型号与购买条件',
  },
};

// Work from the decimal values supplied by the form/API, so a half-penny
// such as 0.29 kWh × 50p rounds correctly instead of inheriting binary float error.
function decimalFraction(value) {
  const [coefficient, exponent = '0'] = String(value).split('e');
  const decimalPlaces = coefficient.split('.')[1]?.length || 0;
  const scale = decimalPlaces - Number(exponent);
  return {numerator: BigInt(coefficient.replace('.', '')) * (scale < 0 ? 10n ** BigInt(-scale) : 1n),
    denominator: scale > 0 ? 10n ** BigInt(scale) : 1n};
}
function roundedPence(numerator, denominator) {
  const whole = numerator / denominator;
  return Number(whole + (numerator % denominator * 2n >= denominator ? 1n : 0n));
}
function sessionCost(kwh, tariffPence, sessionsPerWeek) {
  const energy = decimalFraction(kwh), tariff = decimalFraction(tariffPence);
  const numerator = energy.numerator * tariff.numerator;
  const denominator = energy.denominator * tariff.denominator;
  const sessionPence = roundedPence(numerator, denominator);
  const weeklyPence = roundedPence(numerator * BigInt(sessionsPerWeek), denominator);
  return {measuredKwhPerSession: kwh, electricityGbpPerSession: sessionPence / 100,
    electricityGbpPerWeek: weeklyPence / 100, sessionPence, weeklyPence};
}

export function runUkLaundryTool(args, locale = 'en') {
  if (!matchesInputSchema(args, UK_LAUNDRY_TOOL.inputSchema)) throw new TypeError('Invalid UK laundry-session inputs');
  const view = locales.includes(locale) ? locale : 'en', c = copy[view];
  const a = sessionCost(args.sessionAKwh, args.tariffPencePerKwh, args.sessionsPerWeek);
  const b = sessionCost(args.sessionBKwh, args.tariffPencePerKwh, args.sessionsPerWeek);
  const comparison = args.comparableSessions ? {
    sessionBMinusAGbpPerSession: (b.sessionPence - a.sessionPence) / 100,
    sessionBMinusAGbpPerWeek: (b.weeklyPence - a.weeklyPence) / 100,
  } : null;
  const difference = comparison?.sessionBMinusAGbpPerWeek;
  const money = value => new Intl.NumberFormat({en: 'en-GB', de: 'de-DE', zh: 'zh-CN'}[view], {style: 'currency', currency: 'GBP'}).format(value);
  const message = comparison === null ? c.pending : difference === 0 ? c.equal : difference < 0 ? c.cheaper(money(-difference)) : c.dearer(money(difference));
  const publicCost = ({sessionPence, weeklyPence, ...result}) => result;
  return {
    status: args.comparableSessions ? 'comparison_ready' : 'needs_comparable_sessions',
    message,
    market: 'UK',
    currency: 'GBP',
    calculation: {tariffPencePerKwh: args.tariffPencePerKwh, sessionsPerWeek: args.sessionsPerWeek,
      sessionA: publicCost(a), sessionB: publicCost(b), comparison},
    referenceModel: {
      name: 'MeacoDry Arete One 12L · UK',
      manufacturerSource: manufacturerUrl,
      sourceChecked: UK_LAUNDRY_TOOL.evidence.checked,
      publishedPowerWatts: 151,
      publishedPowerConditions: c.condition,
      scope: c.reference,
    },
    scope: c.scope,
    ...(args.comparableSessions ? {buyerGuide:{label:c.guide,url:guideUrl}} : {}),
  };
}
