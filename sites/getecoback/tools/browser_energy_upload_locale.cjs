const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

(async () => {
  const {example} = await import('../site/assets/energy-tariff-model.mjs');
  const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
  const dir = process.env.QA_DIR || '/tmp/eco-energy-qa';
  await fs.mkdir(dir, {recursive: true});
  let checks = 0;
  const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
  const locales = [
    ['de', 'stromtarif-werkstatt.html', 'Datei auswählen', 'Keine Datei ausgewählt', 'Importiert: '],
    ['en', 'en/energy-tariff-workbench.html', 'Choose file', 'No file selected', 'Imported: '],
    ['fr', 'fr/comparateur-electricite.html', 'Choisir un fichier', 'Aucun fichier sélectionné', 'Importé : '],
    ['es', 'es/comparar-tarifas-luz.html', 'Elegir archivo', 'Ningún archivo seleccionado', 'Importado: '],
    ['it', 'it/confronto-tariffe-luce.html', 'Scegli file', 'Nessun file selezionato', 'Importato: '],
  ];
  const scenario = {...example('de'), own: true, kwh: [4321]};
  const json = {name: 'tariff-<tag>-$&.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(scenario))};
  const csv = {name: 'verbrauch-' + '2026-'.repeat(18) + '.csv', mimeType: 'text/csv', buffer: Buffer.from('kwh1\n100\n250\n')};

  for (const [engine, browserType] of Object.entries({chromium, webkit})) {
    const browser = await browserType.launch({headless: true});
    try {
      const context = await browser.newContext({locale: 'zh-CN', viewport: {width: 390, height: 844}, hasTouch: true});
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const statusIs = (id, value) => page.waitForFunction(
        ([id, value]) => document.getElementById(id + '-status').textContent === value,
        [id, value]
      );
      const choose = async (id, file, keyboard = false) => {
        const selected = page.waitForEvent('filechooser');
        if (keyboard) {
          await page.locator('#' + id).focus();
          await page.keyboard.press('Enter');
        } else {
          await page.locator('label[for="' + id + '"]').tap();
        }
        await (await selected).setFiles(file);
      };

      for (const [lang, slug, chooseLabel, emptyLabel, imported] of locales) {
        console.log(`Checking ${engine}: ${lang} page with zh-CN browser language`);
        await page.goto(base + '/' + slug + '?__probe=1');
        await page.waitForFunction(() => typeof document.querySelector('#csv-file').onchange === 'function');
        equal(await page.evaluate(() => [navigator.language, document.documentElement.lang]), ['zh-CN', lang]);
        for (const id of ['import-file', 'csv-file']) {
          equal(await page.locator('#' + id + '-choose').innerText(), chooseLabel);
          equal(await page.locator('#' + id + '-status').innerText(), emptyLabel);
          const label = await page.locator('#' + id + '-title').innerText();
          equal(await page.getByLabel(label, {exact: true}).getAttribute('id'), id);
          equal(await page.locator('#' + id).evaluate(e => {
            const rect = e.getBoundingClientRect(), style = getComputedStyle(e);
            return style.opacity === '0' && style.display !== 'none' && style.visibility === 'visible' && rect.width >= 44 && rect.height >= 44;
          }), true);
        }
        equal(/[\u3400-\u9fff]/u.test(await page.locator('.data-panel').innerText()), false);
        await page.locator('.data-panel').screenshot({path: `${dir}/${engine}-${lang}-uploads-zh-CN.png`});

        await choose('import-file', json);
        await statusIs('import-file', imported + json.name);
        equal(await page.inputValue('[name=kwh0]'), '4321');
        equal(await page.isChecked('[name=confirm]'), false);
        equal(await page.locator('#import-file-status tag').count(), 0);
        equal(await page.inputValue('#import-file'), '');

        // Keyboard access must retain a visible focus ring and open the native picker.
        await page.locator('#import-file').focus();
        await page.keyboard.press('Tab');
        equal(await page.evaluate(() => document.activeElement.id), 'csv-file');
        equal(await page.locator('label[for="csv-file"]').evaluate(e => getComputedStyle(e).outlineStyle), 'solid');
        await choose('csv-file', csv, true);
        await statusIs('csv-file', imported + csv.name);
        equal(await page.inputValue('[name=kwh0]'), '350');
        equal(await page.inputValue('#csv-file'), '');
        equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

        const error = await page.evaluate(() => JSON.parse(document.getElementById('energy-copy').textContent).error);
        await choose('import-file', {name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":999}')});
        await statusIs('import-file', error);
        equal(await page.inputValue('[name=kwh0]'), '350');
        equal(await page.locator('#status').innerText(), error);

        // Reusing the exact same file must still trigger import after editing values.
        await page.fill('[name=kwh0]', '1');
        await choose('csv-file', csv);
        await page.waitForFunction(() => document.querySelector('[name=kwh0]').value === '350');
        equal(await page.locator('#csv-file-status').innerText(), imported + csv.name);
        if (lang === 'de') await page.locator('.data-panel').screenshot({path: `${dir}/${engine}-de-imported-zh-CN.png`});
        equal(errors, []);
      }
    } finally {
      await browser.close();
    }
  }
  console.log(`PASS: ${checks} upload assertions, five page languages in zh-CN, Chromium + WebKit, touch + keyboard, errors and repeat imports.`);
})().catch(e => { console.error(e); process.exit(1); });
