import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(new URL('../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'https://baipiaoji.com';
const route = origin + '/manju/video-fit';
// One second of blue, 64 x 96, H.264/MP4. Generated locally; no ffmpeg dependency in CI.
const fixture = Buffer.from('AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAANhbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAox0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABgAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAgAAABAAAAAAIEbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAQABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABr21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAW9zdGJsAAAAv3N0c2QAAAAAAAAAAQAAAK9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAYABIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAK/+EAGGdkAAqs2UQ2wEQAAAMABAAAAwAgPEiWWAEABmjr48siwP34+AAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAYUAAAAAAAAAAYc3R0cwAAAAAAAAABAAAABAAAEAAAAAAUc3RzcwAAAAAAAAABAAAAAQAAAChjdHRzAAAAAAAAAAMAAAABAAAgAAAAAAEAAEAAAAAAAgAAEAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAQAAAABAAAAJHN0c3oAAAAAAAAAAAAAAAQAAALhAAAADwAAAA0AAAANAAAAFHN0Y28AAAAAAAAAAQAAA5EAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYxLjcuMTAzAAAACGZyZWUAAAMSbWRhdAAAAq0GBf//qdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0zIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj00IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAALGWIhAAS//7oyfzLLXnmdRqJlloPlaccwj0dI/65B2ZLyCHBWQeLWsUELiG1AAAAC0GaI2xBD/6qVR5QAAAACUGeQXiCPwCIgQAAAAkBnmJqQQ8A5IA=', 'base64');
const secrets = ['VF_PRIVATE_FILE_2026.mp4', 'VF_PRIVATE_AUDIENCE_2026', 'VF_PRIVATE_HOOK_2026', 'VF_PRIVATE_TITLE_2026', 'VF_PRIVATE_SUMMARY_2026'];
const checkNames = ['opening', 'proof', 'captions', 'audio', 'rights', 'ai', 'commercial', 'claim', 'destination'];
const matchNames = ['accountMatch', 'platformMatch', 'windowMatch', 'trafficMatch', 'contentMatch'];
const measuredActions = ['view', 'start', 'report_needs_info', 'report_revise', 'report_test'];
const intercept = (requests, hits) => async request => {
  const req = request.request(), url = new URL(req.url());
  requests.push({ url: req.url(), method: req.method(), body: req.postData() });
  if (url.hostname === 'www.googletagmanager.com') return request.fulfill({ contentType: 'application/javascript', body: '' });
  if (url.origin !== origin) return request.abort();
  if (url.pathname === '/api/hit') {
    hits.push(req.postDataJSON());
    return request.fulfill({ status: 204 });
  }
  if (url.pathname.startsWith('/api/')) return request.fulfill({ status: 204 });
  const relative = url.pathname.endsWith('/') ? url.pathname + 'index.html' : path.extname(url.pathname) ? url.pathname : url.pathname + '.html';
  const file = path.join(dist, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return request.fulfill({ status: 404, body: 'Missing test asset' });
  const types = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
  return request.fulfill({ body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'application/octet-stream' });
};
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
  const requests = [], hits = [], errors = [];
  await context.addInitScript(() => {
    // Measurement is enabled only in this completely intercepted test context.
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.__vfTest = { created: [], revoked: [], storageWrites: [], actionEvents: [], xss: false };
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); window.__vfTest.created.push(url); return url; };
    URL.revokeObjectURL = url => { window.__vfTest.revoked.push(url); return revoke(url); };
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { window.__vfTest.storageWrites.push([key, value]); return setItem.call(this, key, value); };
    document.addEventListener('manju:action', event => window.__vfTest.actionEvents.push(event.detail));
  });
  await context.route('**/*', intercept(requests, hits));
  const catalog = await context.newPage();
  await catalog.goto(origin + '/manju/');
  assert.equal(await catalog.evaluate(() => window.__vfTest.actionEvents.filter(action => action === 'video_view').length), 0, 'The catalogue is not a tool exposure');
  await catalog.close();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(route);
  await page.locator('#vf-form').waitFor();
  await page.waitForFunction(() => document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length > 0);
  const field = (name, form = '#vf-form') => page.locator(`${form} [name="${name}"]`);
  const select = async (name, value) => {
    const control = field(name);
    const index = await control.evaluate((element, value) => [...element.options].findIndex(option => option.value === value), value);
    assert.ok(index >= 0, 'Missing select option: ' + name + '=' + value);
    // Playwright selectOption dispatches synthetic events; use real keyboard input for trusted-edit cases.
    await control.focus();
    await control.press('Home');
    for (let i = 0; i < index; i++) await control.press('ArrowDown');
    await control.press('Enter');
    assert.equal(await control.inputValue(), value);
  };
  const actions = async action => page.evaluate(action => window.__vfTest.actionEvents.filter(event => event === 'video_' + action).length, action);
  const evaluate = async () => {
    await page.locator('#vf-evaluate').click();
    await page.locator('#vf-result').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#vf-result [data-platform]').count(), 6, 'Every report must retain all six platforms');
    assert.ok(await page.locator('#vf-result [data-vf-priority]').count() <= 2, 'At most two priority platforms');
    assert.ok(!/爆款概率\s*[:：]?\s*\d|成功率\s*[:：]?\s*\d/.test(await page.locator('#vf-result').textContent()), 'No fabricated probability');
  };
  const reset = async () => {
    await page.locator('#vf-reset').click();
    assert.ok(await page.locator('#vf-result').isHidden());
    assert.ok(await page.locator('#vf-export').isDisabled());
  };
  const ready = async ({ mode = 'draft', duration = '45', aspect = 'vertical' } = {}) => {
    if (mode) await page.locator(`#vf-form [name="mode"][value="${mode}"]`).check();
    await page.locator('#vf-checks').evaluate(element => { element.open = true; });
    await field('audience').fill(secrets[1]);
    await field('hook').fill(secrets[2]);
    await field('durationSeconds').fill(duration);
    await select('aspect', aspect);
    for (const [name, value] of Object.entries({ opening: 'result', proof: 'demo', captions: 'yes', audio: 'not_applicable', rights: 'confirmed', ai: 'not_applicable', commercial: 'not_applicable', claim: 'not_applicable', destination: 'not_applicable' })) await select(name, value);
  };
  const setVideo = async (name = secrets[0]) => page.locator('#vf-file').setInputFiles({ name, mimeType: 'video/mp4', buffer: fixture });
  const readyVideo = async () => page.waitForFunction(() => document.querySelector('#vf-media-status')?.textContent.includes('本机已读取'));
  const reportCounts = async () => Promise.all(measuredActions.slice(2).map(actions));

  // Exposure belongs to this visible tool page; interaction alone is not meaningful editing.
  await page.waitForFunction(() => window.__vfTest.actionEvents.includes('video_view'));
  assert.equal(await actions('view'), 1);
  await field('audience').focus();
  await field('audience').fill('   ');
  await page.locator('#vf-form [name="mode"][value="file"]').check();
  await page.locator('#vf-form [name="mode"][value="draft"]').check();
  await field('durationSeconds').fill('-1');
  await field('durationSeconds').fill('0');
  await field('durationSeconds').fill('');
  assert.equal(await actions('start'), 0, 'Focus, whitespace, invalid durations and mode selection do not start a real task');
  await page.evaluate(() => {
    const input = document.querySelector('#vf-form [name="audience"]');
    input.value = 'SCRIPT_ONLY_PRIVATE_AUDIENCE';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await evaluate();
  assert.equal(await actions('start'), 0, 'Programmatic events cannot qualify as substantive editing');
  assert.deepEqual(await reportCounts(), [0, 0, 0], 'Script-populated data cannot qualify a report');
  await reset();

  // Unknown is the initial state; blank input cannot become a recommendation.
  for (const name of checkNames) assert.equal(await field(name).inputValue(), 'unknown');
  assert.equal(await field('aspect').inputValue(), 'unknown');
  await evaluate();
  assert.equal(await page.locator('[data-vf-priority]').count(), 0);
  assert.match(await page.locator('#vf-result').textContent(), /补充|确认/);
  assert.equal(await actions('start'), 0);
  assert.deepEqual(await reportCounts(), [0, 0, 0], 'The legacy empty completion is not a substantive report');

  // Trying a fictional example never increments a real completion or enables export.
  const beforeExample = await actions('complete');
  await page.locator('#vf-example').click();
  assert.match(await page.locator('#vf-result').textContent(), /合成草稿示例/);
  assert.equal(await actions('complete'), beforeExample);
  assert.equal(await actions('example'), 1);
  assert.ok(await page.locator('#vf-export').isDisabled());
  assert.ok(await page.locator('#vf-copy').isDisabled());
  await field('audience').fill(secrets[1]);
  assert.ok(await page.locator('#vf-result').isHidden(), 'Any edited input invalidates the example report');
  await evaluate();
  assert.equal(await actions('start'), 0, 'Editing a synthetic example does not turn it into a real task');
  assert.deepEqual(await reportCounts(), [0, 0, 0]);
  await reset();

  // One trustworthy edit qualifies a needs-info report, while repeated reports remain once per status/page.
  await field('audience').fill(secrets[1]);
  assert.equal(await actions('start'), 1);
  await evaluate();
  assert.deepEqual(await reportCounts(), [1, 0, 0]);
  await evaluate();
  assert.deepEqual(await reportCounts(), [1, 0, 0], 'Repeated report clicks do not inflate a status');
  await reset();
  await evaluate();
  assert.deepEqual(await reportCounts(), [1, 0, 0], 'Reset clears report eligibility');
  assert.equal(await actions('view'), 1, 'Reset does not count another tool exposure');
  assert.equal(await actions('start'), 1, 'Reset does not count another first edit');
  await reset();

  // Explicit not-applicable is valid self-report; essential unknown still blocks priority.
  await ready();
  assert.match(await page.locator('#vf-unknown-count').textContent(), /0|已填写/);
  await evaluate();
  assert.ok(await page.locator('[data-vf-priority]').count() > 0, 'The fully specified short demo has a test direction');
  assert.match(await page.locator('#vf-result').textContent(), /自报|本人|填写/);
  assert.deepEqual(await reportCounts(), [1, 0, 1]);
  await evaluate();
  assert.deepEqual(await reportCounts(), [1, 0, 1], 'A repeated complete report is not another measured task');
  await select('rights', 'unknown');
  assert.ok(await page.locator('#vf-result').isHidden());
  assert.ok(await page.locator('#vf-export').isDisabled());
  await evaluate();
  assert.equal(await page.locator('[data-vf-priority]').count(), 0, 'Unknown rights cannot be approved');
  assert.deepEqual(await reportCounts(), [1, 0, 1], 'Different inputs with the same report status remain once per page');
  await select('rights', 'confirmed');
  await select('captions', 'no');
  await evaluate();
  assert.equal(await page.locator('[data-vf-priority]').count(), 0, 'Known unreadable or missing captions must be fixed before priority');
  assert.ok(!(await page.locator('#vf-result').textContent()).includes('字幕可读性：用户自报，未确认'), 'Known defect must not be described as unknown');
  assert.deepEqual(await reportCounts(), [1, 1, 1], 'Revision-needed is a separate fixed report state');
  await select('captions', 'yes');
  await select('audio', 'unclear');
  await evaluate();
  assert.equal(await page.locator('[data-vf-priority]').count(), 0, 'Known unclear audio must be fixed before priority');
  await reset();

  // Decode a real media file. A filename and file selection alone do not describe its content.
  await setVideo();
  await readyVideo();
  assert.equal(await page.locator('#vf-form [name="mode"]:checked').inputValue(), 'file');
  const decoded = await page.locator('#vf-preview').evaluate(video => ({ duration: video.duration, width: video.videoWidth, height: video.videoHeight, source: video.src }));
  assert.deepEqual({ width: decoded.width, height: decoded.height }, { width: 64, height: 96 });
  assert.ok(decoded.duration > 0.9 && decoded.duration < 1.1);
  await evaluate();
  assert.equal(await page.locator('[data-vf-priority]').count(), 0, 'Metadata alone must not infer the story');
  assert.match(await page.locator('#vf-result').textContent(), /64 × 96/);
  assert.match(await page.locator('#vf-result').textContent(), /不能说明|不代表|不是/);
  await ready({ mode: null, duration: '', aspect: 'unknown' });
  await evaluate();
  assert.ok(await page.locator('[data-vf-priority]').count() > 0);
  await select('aspect', 'horizontal');
  await evaluate();
  assert.equal(await page.locator('[data-vf-priority]').count(), 0, 'Measured/self-reported aspect conflict blocks priority');
  assert.match(await page.locator('#vf-result').textContent(), /不一致|冲突/);

  // Replacing a valid file with corrupt bytes must immediately clear its report and old metadata.
  await page.locator('#vf-file').setInputFiles({ name: 'VF_PRIVATE_BROKEN.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not a playable video') });
  await page.waitForFunction(() => document.querySelector('#vf-media-status')?.textContent.includes('无法读取'));
  assert.ok(await page.locator('#vf-result').isHidden());
  assert.ok(await page.locator('#vf-preview').isHidden());
  assert.ok(await page.locator('#vf-export').isDisabled());
  assert.equal(await page.locator('#vf-preview').getAttribute('src'), null);
  assert.ok(await page.evaluate(url => window.__vfTest.revoked.includes(url), decoded.source));
  await evaluate();
  assert.equal(await page.locator('[data-vf-priority]').count(), 0);
  assert.ok(!(await page.locator('#vf-result').textContent()).includes('本机实测：'), 'Failed replacement cannot reuse old measurements');
  await setVideo('VF_PRIVATE_REPLACEMENT.mp4');
  await readyVideo();
  await page.locator('#vf-form [name="mode"][value="draft"]').check();
  assert.equal(await page.locator('#vf-preview').getAttribute('src'), null);
  assert.ok(await page.locator('#vf-preview').isHidden());
  await reset();

  // User markup remains literal text. Export is an explicit local download, not persistence.
  await ready();
  const payload = '<img src=x onerror="window.__vfTest.xss=true">';
  await page.locator('#vf-form .vf-details').first().evaluate(element => { element.open = true; });
  await field('title').fill(secrets[3] + payload);
  await field('summary').fill(secrets[4] + payload);
  await field('audience').fill(secrets[1] + payload);
  await evaluate();
  assert.equal(await page.locator('#vf-result img').count(), 0);
  assert.equal(await page.evaluate(() => window.__vfTest.xss), false);
  assert.equal(await field('title').inputValue(), secrets[3] + payload);
  assert.ok(await page.locator('#vf-export').isEnabled());
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#vf-export').click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /视频发布评估\.md$/);
  const report = fs.readFileSync(await download.path(), 'utf8');
  assert.match(report, /发布|评估/);
  for (const secret of secrets) assert.ok(!report.includes(secret), 'Export deliberately omits raw titles, scripts and filenames');
  assert.match(report, /规则版本/);
  assert.match(report, /抖音/);
  assert.match(report, /快手/);
  await field('hook').fill(secrets[2] + ' amended');
  assert.ok(await page.locator('#vf-result').isHidden());
  assert.ok(await page.locator('#vf-export').isDisabled());

  // Published results only compare the same metric under explicitly matched conditions.
  await page.locator('.vf-performance').evaluate(element => { element.open = true; });
  const performance = name => field(name, '#vf-performance-form');
  const compare = async () => page.locator('#vf-performance-form button[type="submit"]').click();
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /修正|缺少|未填/);
  await performance('current').fill('150');
  await performance('baseline').fill('100');
  await performance('baselineCount').fill('8');
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /不能直接比较/);
  assert.ok(!(await page.locator('#vf-performance-result').textContent()).includes('%'));
  for (const name of matchNames) await performance(name).check();
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /\+50/);
  assert.match(await page.locator('#vf-performance-result').textContent(), /50\.0%/);
  assert.equal(await page.locator('[data-vf-current]').textContent(), '150');
  assert.equal(await page.locator('[data-vf-baseline]').textContent(), '100');
  assert.match(await page.locator('[data-vf-count]').textContent(), /^8\s*条$/);
  assert.match(await page.locator('#vf-performance-result').textContent(), /不是因果|不能证明|不代表/);
  for (const name of matchNames) {
    await performance(name).uncheck();
    assert.equal(await page.locator('#vf-performance-result').textContent(), '', 'Changing comparison input clears the previous result');
    await compare();
    assert.match(await page.locator('#vf-performance-result').textContent(), /不能直接比较/);
    assert.ok(!(await page.locator('#vf-performance-result').textContent()).includes('%'));
    await performance(name).check();
  }
  await performance('goal').selectOption('try');
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /不能直接比较/);
  await performance('goal').selectOption('views');
  await performance('baselineCount').fill('2');
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /仅作描述|样本/);
  await performance('baseline').fill('0');
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /\+150/);
  assert.ok(!(await page.locator('#vf-performance-result').textContent()).includes('%'), 'Zero baseline must not become infinite growth');
  await performance('current').fill('-1');
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /修正/);
  assert.ok(!(await page.locator('#vf-performance-result').textContent()).includes('%'));
  await performance('current').fill('');
  await compare();
  assert.match(await page.locator('#vf-performance-result').textContent(), /修正/);

  // The complete report and long user text fit narrow phones as well as desktop.
  await evaluate();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${width}px`);
    assert.equal(await page.locator('h1').count(), 1);
  }
  if (process.env.VF_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.VF_SCREENSHOT_DIR, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(process.env.VF_SCREENSHOT_DIR, 'vf-final-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(process.env.VF_SCREENSHOT_DIR, 'vf-final-mobile.png') });
  }

  // Real UI actions reach the isolated GA4 queue and first-party count, without input data.
  await page.waitForFunction(() => Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).some(event => event[1] === 'manju_video_compare'));
  const events = await page.evaluate(() => Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).map(event => Array.from(event)));
  const expected = [...measuredActions, 'file_ready', 'file_error', 'complete', 'example', 'export', 'compare'];
  for (const action of expected) {
    assert.ok(events.some(event => event[1] === 'manju_video_' + action), 'Missing GA4 video action: ' + action);
    assert.ok(hits.some(hit => hit.p === '/manju/video_' + action + '/catalog'), 'Missing first-party video action: ' + action);
  }
  const uiEvents = await page.evaluate(() => window.__vfTest.actionEvents);
  for (const action of measuredActions) {
    assert.equal(uiEvents.filter(event => event === 'video_' + action).length, 1, 'At most one fixed measurement action per page: ' + action);
    assert.equal(events.filter(event => event[1] === 'manju_video_' + action).length, 1, 'Exactly one GA4 queue event: ' + action);
    assert.equal(hits.filter(hit => hit.p === '/manju/video_' + action + '/catalog').length, 1, 'Exactly one first-party event: ' + action);
  }
  console.log('Intercepted test event counts: ' + JSON.stringify(expected.map(action => ({
    action,
    ui: uiEvents.filter(event => event === 'video_' + action).length,
    ga4Queue: events.filter(event => event[1] === 'manju_video_' + action).length,
    firstParty: hits.filter(hit => hit.p === '/manju/video_' + action + '/catalog').length
  }))));
  assert.ok(events.some(event => event[0] === 'config' && event[1] === 'G-H79D948F4Z'));
  assert.equal(events.filter(event => event[1] === 'page_view').length, 1, 'Exactly one isolated GA4 page view');
  const state = await page.evaluate(() => ({ storageWrites: window.__vfTest.storageWrites, local: { ...localStorage }, session: { ...sessionStorage }, url: location.href }));
  const telemetry = JSON.stringify({ events, hits, requests, state });
  for (const secret of [...secrets, 'VF_PRIVATE_BROKEN', 'VF_PRIVATE_REPLACEMENT', 'SCRIPT_ONLY_PRIVATE_AUDIENCE', payload]) assert.ok(!telemetry.includes(secret), 'Private input leaked or persisted: ' + secret);
  assert.equal(state.url, route, 'User input never enters the public URL');
  assert.ok(!requests.some(request => request.method !== 'GET' && !new URL(request.url).pathname.startsWith('/api/hit')), 'No video, draft or report upload');
  assert.deepEqual(errors, []);

  await page.reload();
  await page.locator('#vf-form').waitFor();
  assert.equal(await field('audience').inputValue(), '', 'No default draft persistence');
  assert.equal(await field('title').inputValue(), '');
  assert.equal(await field('summary').inputValue(), '');
  assert.equal(await performance('current').inputValue(), '');
  assert.ok(await page.locator('#vf-result').isHidden());
  assert.ok(await page.locator('#vf-export').isDisabled());
  assert.deepEqual(errors, []);

  // A later script mutation cannot borrow an earlier trusted edit to qualify a new report.
  const tamper = await context.newPage();
  await tamper.goto(route);
  await tamper.locator('#vf-form [name="audience"]').fill('TRUSTED_PRIVATE_AUDIENCE');
  await tamper.locator('h1').click(); // Finish the real input's blur/change before the later script mutation.
  await tamper.evaluate(() => {
    const input = document.querySelector('#vf-form [name="hook"]');
    input.value = 'SCRIPT_MUTATION_PRIVATE_HOOK';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await tamper.locator('#vf-evaluate').click();
  assert.deepEqual(await tamper.evaluate(() => window.__vfTest.actionEvents.filter(action => action.startsWith('video_report_'))), [], 'The evaluated input must still match the last trusted edit');
  await tamper.locator('#vf-form [name="hook"]').fill('TRUSTED_PRIVATE_HOOK');
  await tamper.locator('#vf-evaluate').click();
  assert.deepEqual(await tamper.evaluate(() => window.__vfTest.actionEvents.filter(action => action.startsWith('video_report_'))), ['video_report_needs_info']);
  await tamper.close();

  const scriptSubmit = await context.newPage();
  await scriptSubmit.goto(route);
  await scriptSubmit.locator('#vf-form [name="audience"]').fill('SUBMIT_PRIVATE_AUDIENCE');
  await scriptSubmit.locator('h1').click();
  for (const method of ['event', 'requestSubmit', 'click']) {
    await scriptSubmit.evaluate(method => {
      const form = document.querySelector('#vf-form');
      if (method === 'event') form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      if (method === 'requestSubmit') form.requestSubmit();
      if (method === 'click') document.querySelector('#vf-evaluate').click();
    }, method);
    assert.equal(await scriptSubmit.evaluate(() => window.__vfTest.actionEvents.filter(action => action.startsWith('video_report_')).length), 0, method + ' must not turn trusted edits into an automated report action');
  }
  await scriptSubmit.locator('#vf-form [name="audience"]').press('Enter');
  assert.deepEqual(await scriptSubmit.evaluate(() => window.__vfTest.actionEvents.filter(action => action.startsWith('video_report_'))), ['video_report_needs_info'], 'Native Enter submission remains a real report action');
  await scriptSubmit.close();

  const fileOnly = await context.newPage();
  await fileOnly.goto(route);
  await fileOnly.locator('#vf-file').setInputFiles({ name: 'FILE_ONLY_PRIVATE.mp4', mimeType: 'video/mp4', buffer: fixture });
  await fileOnly.waitForFunction(() => document.querySelector('#vf-media-status')?.textContent.includes('本机已读取'));
  await fileOnly.locator('#vf-evaluate').click();
  assert.equal(await fileOnly.evaluate(() => window.__vfTest.actionEvents.filter(action => action === 'video_start' || action.startsWith('video_report_')).length), 0, 'File metadata alone is not substantive self-report');
  await fileOnly.close();

  // Browser privacy choices and QA continue to protect both measurement channels.
  for (const exclusion of ['qa', 'dnt', 'gpc', 'denied', 'webdriver']) {
    const privateContext = await browser.newContext();
    const privateRequests = [], privateHits = [];
    await privateContext.addInitScript(exclusion => {
      Object.defineProperty(navigator, 'webdriver', { get: () => exclusion === 'webdriver' });
      if (exclusion === 'dnt') Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
      if (exclusion === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
      if (exclusion === 'denied') localStorage.setItem('fleet_ga4_choice_v1', 'denied');
      window.__vfActions = [];
      document.addEventListener('manju:action', event => window.__vfActions.push(event.detail));
    }, exclusion);
    await privateContext.route('**/*', intercept(privateRequests, privateHits));
    const privatePage = await privateContext.newPage();
    await privatePage.goto(route + (exclusion === 'qa' ? '?qa=1' : ''));
    await privatePage.locator('#vf-form [name="audience"]').fill('EXCLUDED_PRIVATE_AUDIENCE');
    await privatePage.locator('#vf-evaluate').click();
    assert.ok(await privatePage.evaluate(() => window.__vfActions.includes('video_complete')), exclusion + ' case must exercise the functioning tool');
    assert.equal(privateHits.filter(hit => hit.e === 'manju').length, 0, exclusion + ' must suppress first-party manju events');
    const privateEvents = await privatePage.evaluate(() => {
      const frame = document.querySelector('iframe[title="Optional analytics"]');
      return Array.from(frame?.contentWindow?.dataLayer || []).map(event => Array.from(event));
    });
    assert.equal(privateEvents.filter(event => String(event[1]).startsWith('manju_video_')).length, 0, exclusion + ' must suppress GA4 video events');
    assert.ok(!privateRequests.some(request => new URL(request.url).hostname === 'www.googletagmanager.com'), exclusion + ' must not start Google measurement');
    await privateContext.close();
  }

  // Background initialization counts exposure only when the tool first becomes visible.
  const hiddenContext = await browser.newContext();
  await hiddenContext.addInitScript(() => {
    window.__vfVisibility = 'hidden';
    window.__vfActions = [];
    Object.defineProperty(document, 'visibilityState', { get: () => window.__vfVisibility });
    document.addEventListener('manju:action', event => window.__vfActions.push(event.detail));
  });
  await hiddenContext.route('**/*', intercept([], []));
  const hidden = await hiddenContext.newPage();
  await hidden.goto(route);
  await hidden.locator('#vf-example').click();
  assert.equal(await hidden.evaluate(() => window.__vfActions.filter(action => action === 'video_view').length), 0);
  await hidden.evaluate(() => { window.__vfVisibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await hidden.evaluate(() => window.__vfActions.filter(action => action === 'video_view').length), 1);
  await hidden.evaluate(() => {
    window.__vfVisibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
    window.__vfVisibility = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await hidden.evaluate(() => window.__vfActions.filter(action => action === 'video_view').length), 1, 'Returning to the same page does not add another exposure');
  await hiddenContext.close();
  const allTelemetry = JSON.stringify({ requests, hits });
  for (const secret of ['TRUSTED_PRIVATE_AUDIENCE', 'SCRIPT_MUTATION_PRIVATE_HOOK', 'TRUSTED_PRIVATE_HOOK', 'SUBMIT_PRIVATE_AUDIENCE', 'FILE_ONLY_PRIVATE']) assert.ok(!allTelemetry.includes(secret), 'Additional measurement cases leaked input: ' + secret);
  console.log('PASS video-fit local media, unknown/NA, replacement cleanup, safe export, comparable metrics, once-per-page exposure/edit/report states, synthetic-input exclusion, privacy controls, isolated GA4 actions and responsive layouts.');
} finally {
  await browser.close();
}
