import assert from 'node:assert/strict';
import test from 'node:test';
import {buildUkraineBackupPages} from '../ua-backup-pages.mjs';

test('the Ukrainian UPS index and three model pages have canonical, crawlable evidence', () => {
  const files = new Map();
  const pages = buildUkraineBackupPages({write: (file, value) => files.set(file, value)});
  assert.equal(pages.length, 4);
  assert.equal(files.size, 8);
  for (const page of pages) {
    assert.equal(page.lang, 'uk-UA');
    const path = new URL(page.url).pathname;
    const mirror = new URL(page.textUrl).pathname;
    assert.match(path, /^\/ua\/(internet-bez-svitla|dbzh\/[a-z0-9-]+)$/);
    const html = files.get(path.slice(1) + '.html');
    assert.ok(html.includes('<html lang="uk-UA">'));
    assert.ok(html.includes('rel="canonical" href="' + page.url + '"'));
    assert.ok(html.includes('href="' + mirror + '"'));
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.match(html, /xpon\.thedigital\.gov\.ua/);
    assert.match(html, /marsriva\.com/);
    assert.match(html, /65–85%/);
    assert.doesNotMatch(html, /[?&]tag=|affiliate_click/);
    assert.ok(files.get(mirror.slice(1)).includes(page.url));
  }
  assert.match(files.get('ua/dbzh/archer-ax55-xz000-g3.html'), /29,4 Вт/);
  assert.match(files.get('ua/dbzh/archer-c6-xz000-g3.html'), /17,4 Вт/);
});
