import {kits, providerGuide, upsModels} from '../collector-assets/ua-backup/backup-data.mjs';
import {evaluateFit} from '../collector-assets/ua-backup/backup-fit.mjs';

const origin = 'https://thedollscout.com';
const root = '/ua/internet-bez-svitla';
const updated = '2026-11-27';
const format = new Intl.NumberFormat('uk-UA', {maximumFractionDigits: 2});
const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const kitPath = kit => '/ua/dbzh/' + kit.id;
const kitName = kit => kit.router.name + ' + ' + kit.onu.name;
const rating = device => format.format(device.volts) + ' В / ' + format.format(device.amps) + ' А';

function deviceFields(key, label, device) {
  return `<fieldset>
    <legend>${label}</legend>
    <div class="device-inputs">
      <label>Вихід адаптера, В DC
        <input name="${key}_volts" type="number" min="0.1" max="48" step="0.1" inputmode="decimal" required${device ? ` value="${device.volts}"` : ''}>
      </label>
      <label>Вихід адаптера, А
        <input name="${key}_amps" type="number" min="0.01" max="10" step="0.01" inputmode="decimal" required${device ? ` value="${device.amps}"` : ''}>
      </label>
    </div>
  </fieldset>`;
}

function form(kit) {
  return `<form id="perevirka" class="fit-form">
    <label for="provider">Чи працює лінія провайдера під час відключення?
      <select id="provider" name="provider">
        <option value="unknown">Ще не знаю</option>
        <option value="yes">Провайдер підтвердив</option>
        <option value="no">Ні</option>
      </select>
    </label>
    <label for="kit">Моделі вашого обладнання
      <select id="kit" name="kit">
        <option value="">Введу дані з адаптерів</option>
        ${kits.map(k => `<option value="${k.id}"${k === kit ? ' selected' : ''}>${esc(kitName(k))}</option>`).join('')}
      </select>
    </label>
    <div class="device-grid">
      ${deviceFields('router', 'Роутер', kit?.router)}
      ${deviceFields('onu', 'Оптичний термінал (ONU)', kit?.onu)}
    </div>
    <label for="ups">Який ДБЖ перевірити?
      <select id="ups" name="ups">
        ${upsModels.map(model => `<option value="${model.id}">${esc(model.name)}</option>`).join('')}
      </select>
    </label>
    <p class="form-hint" id="cable-notes"></p>
    <label class="check-line"><input type="checkbox" name="own" required> Я звірив(-ла) напругу й струм обох пристроїв зі своїми адаптерами.</label>
    <label class="check-line"><input type="checkbox" name="connections"> Для обраного ДБЖ я перевірив(-ла) розміри штекерів і полярність на обох кінцях двох окремих кабелів, за маркуванням або інструкціями.</label>
    <label for="draw">Виміряне споживання на виходах DC, Вт <span class="optional">(необов’язково)</span>
      <input id="draw" name="draw" type="number" min="0.1" max="100" step="any" inputmode="decimal" aria-describedby="draw-help">
    </label>
    <p class="form-hint" id="draw-help">Для оцінки часу потрібне виміряне споживання обох пристроїв під час роботи. Значення з етикеток адаптерів використовуються для перевірки потужності.</p>
    <button type="submit" disabled>Перевірити сумісність</button>
    <noscript><p>Для розрахунку увімкніть JavaScript. Нижче є характеристики та посилання на виробників.</p></noscript>
  </form>`;
}

function exampleFacts(kit) {
  if (!kit) return '';
  const devices = [kit.router, kit.onu];
  const watts = devices.reduce((sum, device) => sum + device.volts * device.amps, 0);
  const allowance = upsModels[0].maxWatts;
  const result = evaluateFit(devices, upsModels[0]);
  const ampsOrWatts = result.status === 'incompatible'
    ? `За номіналами адаптерів ${esc(upsModels[0].name)} не підходить. Комплект потребує до ${format.format(watts)} Вт, а загальний ліміт ДБЖ — ${format.format(allowance)} Вт.`
    : `За номіналами адаптерів потрібно до ${format.format(watts)} Вт із ${format.format(allowance)} Вт. Остаточна сумісність залежить від двох окремих виходів, штекерів і полярності кабелів.`;
  return `<section class="example" aria-labelledby="example-heading">
    <h2 id="example-heading">Номінали для цих версій</h2>
    <ul class="spec-list">${devices.map(device => `<li><strong>${esc(device.name)}</strong><span>${rating(device)}</span> <a href="${esc(device.source)}">Специфікація виробника</a></li>`).join('')}</ul>
    <p>${ampsOrWatts}</p>
    <p class="form-hint">Перевірте апаратну версію та маркування власного адаптера. Перелік моделей не підтверджує підключення конкретного ONU до мережі провайдера.</p>
  </section>`;
}

function technicalSources() {
  return `<section class="evidence" aria-labelledby="ups-specs">
    <h2 id="ups-specs">Перевірені характеристики ДБЖ</h2>
    ${upsModels.map(model => `<article class="ups-item">
      <h3>${esc(model.name)}</h3>
      <p>${format.format(model.wattHours)} Вт·год номінально. До ${format.format(model.maxWatts)} Вт сумарно. Виходи DC: ${model.ports.map(port => rating(port)).join(', ')}.</p>
      <p>${esc(model.cableNotes)}</p>
      <a href="${esc(model.source)}">Характеристики виробника</a>${model.cableSource ? ` · <a href="${esc(model.cableSource)}">Інструкція про кабелі (PDF)</a>` : ''}
    </article>`).join('')}
    <small>Джерела перевірено <time datetime="${updated}">27.11.2026</time>.</small>
  </section>`;
}

function page(title, description, pathname, mirror, kit) {
  const canonical = origin + pathname;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage', name: title, description, url: canonical, inLanguage: 'uk-UA', dateModified: updated,
  };
  const related = kit ? kits.filter(other => other !== kit) : kits;
  return `<!doctype html>
<html lang="uk-UA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)} | The Doll Scout</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#092a35">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" type="text/plain" href="${mirror}" title="Текстова версія">
  <link rel="icon" href="/collector-assets/icon.svg">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="uk_UA">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <link rel="stylesheet" href="/collector-assets/ua-backup/backup.css">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <a class="skip-link" href="#main">Перейти до вмісту</a>
  <header class="backup-header"><div class="layout"><a href="/" lang="de">The Doll Scout</a>${kit ? `<a href="${root}">Інтернет без світла</a>` : ''}</div></header>
  <main id="main" class="layout">
    <section class="intro">
      <h1>${esc(title)}</h1>
      <p>${esc(description)}</p>
      <p class="provider-note">Спочатку перевірте, чи має мережа провайдера резервне живлення. Якщо лінія працює, живлення вдома зазвичай потрібне і роутеру, і оптичному терміналу. <a href="${esc(providerGuide)}">Державний гід з xPON</a></p>
    </section>
    ${exampleFacts(kit)}
    <div class="workbench">
      <section aria-labelledby="fit-heading">
        <h2 id="fit-heading">Перевірте свій комплект</h2>
        ${form(kit)}
      </section>
      <aside class="result-panel" aria-labelledby="result-heading">
        <h2 id="result-heading">Результат перевірки</h2>
        <div id="backup-result" role="status" aria-live="polite" aria-atomic="true">
          <p>Виберіть моделі або введіть дані з адаптерів.</p>
        </div>
      </aside>
    </div>
    <section class="evidence" aria-labelledby="examples">
      <h2 id="examples">${kit ? 'Інші комплекти' : 'Роутери й термінали за моделями'}</h2>
      <ul class="model-links">${related.map(k => `<li><a href="${kitPath(k)}">${esc(kitName(k))}</a></li>`).join('')}</ul>
    </section>
    ${technicalSources()}
    <section class="evidence" aria-labelledby="limitations">
      <h2 id="limitations">Як читати оцінку часу</h2>
      <p>Для планування ми використовуємо 65–85% номінальної енергії акумулятора й ділимо її на введене виміряне споживання. Цей діапазон — припущення, а не тест конкретного ДБЖ. Фактичний час залежить від втрат, стану батареї й навантаження. Доступність інтернету також залежить від резерву провайдера.</p>
      <p>Посилання на магазини звичайні. Для цього підбору вони не нараховують нам комісію.</p>
    </section>
  </main>
  <footer class="layout bottom"><a href="/legal/privacy" lang="en">Privacy</a> <a href="${mirror}">Текстова версія</a></footer>
  <script type="module" src="/collector-assets/ua-backup/backup-ui.mjs"></script>
</body>
</html>
`;
}

export function buildUkraineBackupPages({write}) {
  return [null, ...kits].map(kit => {
    const pathname = kit ? kitPath(kit) : root;
    const title = kit ? 'ДБЖ для ' + kitName(kit) : 'Інтернет без світла: ДБЖ для роутера й ONU';
    const description = kit
      ? 'Перевірте напругу, струм і обидва виходи ДБЖ для ' + kitName(kit) + '. Оцініть час роботи за виміряним споживанням.'
      : 'Перевірте, чи може один міні-ДБЖ живити ваш роутер та оптичний термінал. Оцініть час роботи й знайдіть модель в Україні.';
    const mirror = '/collector-assets/text' + pathname + '.txt';
    const url = origin + pathname;
    const textUrl = origin + mirror;
    const parts = [
      '# ' + title, url, description, 'Джерела перевірено ' + updated + '.',
      'Підтвердьте резервне живлення в оператора. Живлення вдома зазвичай потрібне роутеру та ONU. Державний гід: ' + providerGuide,
      ...(kit ? [kit.router, kit.onu].map(device => device.name + ' — ' + rating(device) + '. Джерело: ' + device.source) : []),
      ...upsModels.map(model => model.name + ' — ' + format.format(model.wattHours) + ' Вт·год, ' + format.format(model.maxWatts) + ' Вт сумарно. ' + model.cableNotes + ' Джерело: ' + model.source + (model.cableSource ? ' Інструкція: ' + model.cableSource : '')),
      'Діапазон часу є плановою оцінкою: 65–85% номінальної енергії / виміряне сумарне споживання. Це не гарантія живлення або доступності інтернету.',
      ...kits.map(other => kitName(other) + ' — ' + origin + kitPath(other)),
    ];
    write(pathname.slice(1) + '.html', page(title, description, pathname, mirror, kit));
    write(mirror.slice(1), parts.join('\n\n') + '\n');
    return {title, description, lang: 'uk-UA', url, textUrl, modified: updated};
  });
}
