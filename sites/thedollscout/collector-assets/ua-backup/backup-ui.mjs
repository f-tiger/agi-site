import {kits, upsModels} from './backup-data.mjs';
import {evaluateFit, estimateRuntime} from './backup-fit.mjs';

const form = document.querySelector('#perevirka');
const result = document.querySelector('#backup-result');
const notes = document.querySelector('#cable-notes');
const fields = form.elements;
const format = new Intl.NumberFormat('uk-UA', {maximumFractionDigits: 2});

const reasons = {
  'missing-device-rating': 'Звірте напругу та струм обох пристроїв зі своїми адаптерами.',
  'missing-ups-rating': 'У характеристиках ДБЖ бракує даних про вихідну потужність.',
  'total-power': 'Сумарна потужність за номіналами адаптерів перевищує ліміт ДБЖ.',
  'voltage': 'Для одного з пристроїв немає окремого виходу з потрібною напругою.',
  'port-current': 'Струм з етикетки одного з адаптерів перевищує ліміт його виходу ДБЖ.',
  'connector': 'Задокументований штекер не збігається.',
  'polarity': 'Задокументована полярність не збігається.',
  'distinct-ports': 'Два пристрої потребують окремих виходів. Не використовуйте спільний розгалужувач за результатом цього підбору.',
  'missing-connection-spec': 'Напруга, струм і потужність вкладаються у ліміти. Звірте розміри штекерів і полярність двох окремих кабелів.',
};

function paragraph(text, type) {
  const element = document.createElement('p');
  if (type) element.className = type;
  element.textContent = text;
  result.append(element);
}

function chosenUps() {
  return upsModels.find(model => model.id === fields.ups.value);
}

function dispatch(name) {
  window.dispatchEvent(new CustomEvent('fleet:business', {detail: {name}}));
}

function resetResult() {
  result.replaceChildren();
  paragraph('Натисніть «Перевірити сумісність», щоб отримати результат для цих даних.');
}

function inputRatings(key) {
  return {volts: fields[key + '_volts'].valueAsNumber, amps: fields[key + '_amps'].valueAsNumber};
}

function fillPreset() {
  const kit = kits.find(candidate => candidate.id === fields.kit.value);
  for (const name of ['router', 'onu']) {
    fields[name + '_volts'].value = kit?.[name].volts ?? '';
    fields[name + '_amps'].value = kit?.[name].amps ?? '';
  }
  fields.own.checked = false;
  fields.connections.checked = false;
  fields.draw.value = '';
}

notes.textContent = chosenUps().cableNotes;
form.addEventListener('input', event => {
  const key = event.target.name;
  if (key === 'kit') fillPreset();
  if (key === 'ups') {
    notes.textContent = chosenUps().cableNotes;
    fields.connections.checked = false;
  }
  if (/^(router|onu)_(volts|amps)$/.test(key)) {
    fields.kit.value = '';
    fields.own.checked = false;
    fields.connections.checked = false;
    fields.draw.value = '';
  }
  resetResult();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const ups = chosenUps();
  if (!ups || !form.reportValidity()) return;

  const provider = fields.provider.value;
  const devices = ['router', 'onu'].map(inputRatings);
  const watts = devices.reduce((sum, device) => sum + device.volts * device.amps, 0);
  const fit = evaluateFit(devices, ups, {connectionsVerified: fields.connections.checked});
  result.replaceChildren();

  const title = {
    match: 'ДБЖ підходить за введеними даними',
    incompatible: 'Цей ДБЖ не підходить за введеними даними',
    unconfirmed: 'Сумісність ще не підтверджено',
  };
  paragraph(title[fit.status], 'result-lead');
  paragraph('Номінали адаптерів разом: до ' + format.format(watts) + ' Вт. Ліміт ДБЖ: ' + format.format(ups.maxWatts) + ' Вт.');
  for (const reason of fit.reasons) paragraph(reasons[reason]);

  if (provider === 'no') {
    paragraph('ДБЖ може живити обладнання вдома, але не відновить підключення, коли мережа провайдера без живлення.');
  } else if (provider === 'unknown') {
    paragraph('Перед покупкою підтвердьте резервне живлення лінії у свого провайдера.');
  }

  if (fit.status === 'match') {
    const draw = fields.draw.valueAsNumber;
    const runtime = draw <= watts ? estimateRuntime(ups, draw) : null;
    if (runtime) {
      const hours = runtime.minHours === runtime.maxHours ? format.format(runtime.maxHours)
        : format.format(runtime.minHours) + '–' + format.format(runtime.maxHours);
      paragraph('Орієнтовний час живлення обладнання: ' + hours + ' год. Розрахунок не гарантує такий самий час роботи інтернету.');
    } else if (Number.isFinite(draw)) {
      paragraph('Перевірте, що вимірювали сумарне споживання обох пристроїв на виході DC. Введене значення перевищує ліміт або суму номіналів.');
    } else {
      paragraph('Введіть виміряне сумарне споживання обох пристроїв, щоб оцінити час роботи.');
    }

    if (provider !== 'no') {
      const link = document.createElement('a');
      link.href = ups.store;
      link.textContent = 'Ціна й наявність · ' + ups.storeName.split(' · ')[0];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'shop-button';
      link.addEventListener('click', action => {
        if (action.isTrusted) dispatch('tds_ua_backup_shop');
      });
      link.addEventListener('auxclick', action => {
        if (action.isTrusted && action.button === 1) dispatch('tds_ua_backup_shop');
      });
      result.append(link);
    }
  }

  if (event.isTrusted && fit.status !== 'unconfirmed') dispatch('tds_ua_backup_result');
  result.tabIndex = -1;
  result.focus();
});

form.querySelector('button[type="submit"]').disabled = false;
