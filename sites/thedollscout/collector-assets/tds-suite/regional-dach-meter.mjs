import { matchesInputSchema } from './input-schema.mjs';

const pick = (en, de, zh) => ({ en, de, zh });
const checked = '2026-11-22';
const guide = 'https://thedollscout.com/de/shop/categories/smart-home';
const manufacturer = {
  P110: 'https://de.store.tapo.com/products/tapo-p110-energieuberwachung',
  P110M: 'https://www.tp-link.com/de/home-networking/smart-plug/tapo-p110m/',
};
const swissAuthority = 'https://www.esti.admin.ch/de/themen/faq/elektrische-erzeugnisse-marktueberwachung/';
const text = {
  keep_meter: pick('Use your existing kWh meter for a reading at the socket.',
    'Nutze dein vorhandenes kWh-Messgerät für die Messung an der Steckdose.', '继续用已有的 kWh 电量表测量。'),
  local_plug_check: pick('Check the Swiss plug, socket and load requirements before choosing a locally specified meter.',
    'Prüfe vor der Auswahl einer lokalen Messsteckdose die Schweizer Stecker-, Steckdosen- und Lastvorgaben.',
    '先核对瑞士插头、插座和负载要求，再选当地规格的测量插座。'),
  check_device_load: pick('Check the connected device and the exact meter’s permitted load, including start-up current where applicable.',
    'Prüfe das angeschlossene Gerät und die zulässige Last des genauen Messgeräts, gegebenenfalls einschließlich Einschaltstrom.',
    '先核对电器和该版本测量插座的允许负载，适用时也要核对启动电流。'),
  manual_meter: pick('A local plug-in meter with a cumulative kWh display suits a reading at the socket.',
    'Für die Ablesung an der Steckdose eignet sich ein lokales Messgerät mit Anzeige der kumulierten kWh.',
    '如果只需要现场抄数，可选当地规格、能显示累计 kWh 的电量表。'),
  check_matter_energy: pick('Confirm that the chosen Matter controller and app show energy data for the exact P110M version before buying.',
    'Prüfe vor dem Kauf, ob dein Matter-Controller und deine App Energiedaten für die genaue P110M-Version anzeigen.',
    '购买前先确认 Matter 控制器和 App 能显示该版本 P110M 的能耗数据。'),
  P110: pick('Compare the P110 for kWh readings and control in the Tapo app.',
    'Vergleiche die P110, wenn du kWh in der Tapo-App ablesen und die Steckdose dort steuern willst.',
    '如果希望在 Tapo App 读 kWh 并控制插座，可以比较 P110。'),
  P110M: pick('Compare the P110M if your compatible Matter controller is required. Check which app displays kWh.',
    'Vergleiche die P110M, wenn dein kompatibler Matter-Controller erforderlich ist. Prüfe, welche App kWh anzeigt.',
    '需要接入兼容的 Matter 控制器时，可以比较 P110M。先确认在哪个 App 读取 kWh。'),
};
const marketCheck = {
  DE: pick('Check the German package and the allowed load for the exact model.',
    'Prüfe die deutsche Ausführung und die zulässige Last des genauen Modells.', '核对德国版本和该型号允许的负载。'),
  AT: pick('The linked comparison uses German manufacturer references. Check the Austrian offer, connector and delivery address.',
    'Der Vergleich nutzt deutsche Herstellerangaben. Prüfe österreichisches Angebot, Anschluss und Lieferadresse.',
    '比较页引用德国厂家资料。核对奥地利商品版本、插接规格与送货地址。'),
  CH: pick('Choose a product explicitly marked for the Swiss socket and the connected load.',
    'Wähle eine ausdrücklich für die Schweizer Steckdose und die angeschlossene Last ausgewiesene Ausführung.',
    '选择明确适配瑞士插座和连接负载的版本。'),
};
const modelNotes = pick('Both manufacturer references use 2.4 GHz Wi-Fi. Availability and compatibility depend on the exact version and your setup.',
  'Beide Herstellerangaben nennen 2,4-GHz-WLAN. Prüfe die genaue Ausführung und dein eigenes System.',
  '两个厂家资料均注明 2.4 GHz Wi-Fi。核对具体版本和你自己的系统。');
const bool = { type: 'boolean' };

export const DACH_METER_TOOL = {
  name: 'tds_dach_meter_fit',
  slug: 'dach-meter-fit',
  category: 'smart-home',
  title: pick('Choose a plug-in meter for Germany, Austria or Switzerland',
    'Messsteckdose finden für Deutschland, Österreich oder die Schweiz', '为德国、奥地利或瑞士选择测电方案'),
  description: pick('Decide whether to use an existing kWh meter, compare Tapo P110 and P110M, or check the local socket and app first.',
    'Prüfe, ob dein vorhandener kWh-Zähler reicht, die Tapo P110 oder P110M passt oder Stecker und App zuerst geprüft werden müssen.',
    '判断已有 kWh 电量表是否够用，比较 Tapo P110 和 P110M，或先核对当地插座与 App。'),
  inputSchema: {
    type: 'object',
    properties: {
      market: { type: 'string', enum: ['DE', 'AT', 'CH'] },
      hasKwhMeter: bool,
      wantsPhoneControl: bool,
      needsMatter: bool,
      needsMatterEnergy: bool,
      confirmedMatterEnergy: bool,
      load: { type: 'string', enum: ['confirmed', 'motor-or-compressor', 'unknown'] },
    },
    required: ['market','hasKwhMeter','wantsPhoneControl','needsMatter','needsMatterEnergy','confirmedMatterEnergy','load'],
    additionalProperties: false,
  },
  enumLabels: {
    market: { DE: pick('Germany', 'Deutschland', '德国'), AT: pick('Austria', 'Österreich', '奥地利'), CH: pick('Switzerland', 'Schweiz', '瑞士') },
    load: {
      confirmed: pick('Confirmed for the exact device and meter', 'Last für Gerät und Messsteckdose bestätigt', '已确认电器与测量插座的负载匹配'),
      'motor-or-compressor': pick('Motor or compressor', 'Motor oder Kompressor', '有马达或压缩机'),
      unknown: pick('Have not checked yet', 'Noch ungeprüft', '尚未核对'),
    },
  },
  fieldTitles: {
    market: pick('Market where the meter will be used (DE / AT / CH)', 'Einsatzland (DE / AT / CH)', '实际使用市场（DE／AT／CH）'),
    hasKwhMeter: pick('I already have a suitable kWh meter', 'Ich habe bereits ein geeignetes kWh-Messgerät', '已有适用的 kWh 电量表'),
    wantsPhoneControl: pick('I want to control the plug from my phone', 'Ich möchte die Steckdose per Handy steuern', '想用手机控制插座'),
    needsMatter: pick('My setup requires Matter control', 'Mein System erfordert Matter-Steuerung', '现有系统需要 Matter 控制'),
    needsMatterEnergy: pick('I need kWh in the Matter controller’s app', 'Ich brauche kWh in der App des Matter-Controllers', '需要在 Matter 控制器的 App 里读 kWh'),
    confirmedMatterEnergy: pick('I checked that this app shows kWh for the exact model', 'Ich habe die kWh-Anzeige für das genaue Modell in dieser App geprüft', '已核实该 App 能显示此确切型号的 kWh'),
    load: pick('Load and device check (confirmed, motor or compressor, or unknown)',
      'Lastprüfung (bestätigt, Motor oder Kompressor, oder unbekannt)', '负载核对（已确认、马达或压缩机、或未知）'),
  },
  example: { market: 'DE', hasKwhMeter: false, wantsPhoneControl: true, needsMatter: true, needsMatterEnergy: false, confirmedMatterEnergy: false, load: 'confirmed' },
  evidence: { url: manufacturer.P110M, checked },
};

export function runDachMeterTool(args, locale = 'en') {
  if (!matchesInputSchema(args, DACH_METER_TOOL.inputSchema)) throw new TypeError('Invalid meter input');
  const lang = Object.hasOwn(marketCheck.DE, locale) ? locale : 'en';
  const matterRequired = args.needsMatter || args.needsMatterEnergy;
  const appRequired = args.wantsPhoneControl || matterRequired;
  let state;
  if (args.hasKwhMeter && !appRequired) state = 'keep_meter';
  else if (args.market === 'CH') state = 'local_plug_check';
  else if (args.load !== 'confirmed') state = 'check_device_load';
  else if (!appRequired) state = 'manual_meter';
  else if (args.needsMatterEnergy && !args.confirmedMatterEnergy) state = 'check_matter_energy';
  else state = matterRequired ? 'P110M' : 'P110';

  const result = { market: args.market, status: state, message: text[state][lang], marketCheck: marketCheck[args.market][lang] };
  if (state === 'local_plug_check') result.source = { url: swissAuthority, checked };
  if (state === 'check_matter_energy') result.source = { url: manufacturer.P110M, checked };
  if (Object.hasOwn(manufacturer, state)) {
    result.model = 'Tapo ' + state;
    result.source = { url: manufacturer[state], checked };
    result.setup = modelNotes[lang];
    result.buyerGuide = {
      label: pick('Compare the model and see buying options', 'Modell und Kaufoptionen ansehen', '查看该型号和购买选项')[lang],
      url: guide + '#tapo-' + state.toLowerCase(),
    };
  }
  return result;
}
