import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {origin, locales, route} from './content.mjs';
import {homeCatalogFeatured, homeCatalogCopy, loadHomeCatalog} from './home-catalog.mjs';
import {shoppingHomeHTML, shoppingHomeText} from './shopping.mjs';
import {shoppingLinkPayload} from '../../collector-assets/shopping-contract.mjs';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
function anchors(html) {
 return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(match => {
  const attrs = {};
  for (const m of match[1].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[m[1]] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return {attrs, text: decode(match[2].replace(/<[^>]*>/g, ' ')).trim()};
 });
}
const homeFiles = {de: 'index.html', en: 'en/index.html', zh: 'zh/index.html'};

// The migration is intentionally limited to homepages; existing indexed guide
// addresses stay valid and are not recreated beneath a new English prefix.
test('German is the default home while explicit English, Chinese and deep URLs remain deterministic', async () => {
 const {HOME_PATHS, pageLanguage} = await import('../../collector-assets/site-locale.mjs');
 assert.deepEqual({...HOME_PATHS}, {de: '/', en: '/en/', zh: '/zh/'});
 for (const [lang, path] of Object.entries(HOME_PATHS)) {
  assert.equal(route(lang), path);
  assert.equal(pageLanguage(path), lang);
 }
 for (const slug of ['shop', 'shop/categories/storage', 'series', 'brands/smiski', 'for-agents']) {
  assert.equal(route('en', slug), '/' + slug);
  assert.equal(route('de', slug), '/de/' + slug);
  assert.equal(route('zh', slug), '/zh/' + slug);
 }
 assert.equal(pageLanguage('/shop'), 'en');
 assert.equal(pageLanguage('/de/shop/categories/storage'), 'de');
 assert.equal(pageLanguage('/zh/shop'), 'zh');
});

test('old German home aliases redirect once to the German root without language or country negotiation', async () => {
 const {homeLanguageRedirect} = await import('../../functions/home-language.mjs');
 for (const path of ['/de', '/de/', '/de/index.html']) for (const method of ['GET', 'HEAD']) {
  const request = new Request(origin + path + '?utm_source=example&next=https%3A%2F%2Fexample.org', {
   method, headers: {'accept-language': 'en-US,en;q=0.9', 'cf-ipcountry': 'US'}
  });
  const response = homeLanguageRedirect(request);
  assert.ok(response, path);
  assert.equal(response.status, 308, path);
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.origin, origin);
  assert.equal(target.pathname, '/');
  assert.equal(target.search, new URL(request.url).search, 'Preserve actual campaign attribution, never promote query input to the target host');
  assert.equal(homeLanguageRedirect(new Request(target, {headers: request.headers})), null, 'No redirect loop');
 }
 const english = homeLanguageRedirect(new Request(origin + '/en?ci=1'));
 assert.ok(english); assert.equal(english.status, 308);
 assert.equal(new URL(english.headers.get('location'), origin).pathname, '/en/');
 for (const path of ['/', '/en/', '/zh/', '/de/shop', '/de/shop/categories/storage', '/api/ev', '/auth/account']) {
  for (const language of ['de-DE', 'en-US', 'zh-CN']) assert.equal(homeLanguageRedirect(new Request(origin + path, {headers: {'accept-language': language, 'cf-ipcountry': 'CN'}})), null, path);
 }
});

test('German home gives German shopping and useful local task entry points before the catalogue', () => {
 const body = shoppingHomeHTML({lang: 'de', route, esc});
 assert.ok(body.includes('<h1>' + homeCatalogCopy('de').homeTitle + '</h1>'));
 const market = /<nav\b[^>]*class="[^"]*shop-market-shortcuts[^"]*"[^>]*>([\s\S]*?)<\/nav>/.exec(body);
 assert.ok(market, 'Market choice remains visible');
 const marketLinks = anchors(market[1]);
 assert.equal(marketLinks[0].attrs.href, '/de/shop#home-catalog', 'Germany is first, rather than the US destination');
 assert.ok(marketLinks.some(a => a.attrs.href === '/shop#home-catalog'), 'US context remains an explicit alternative');
 const catalogue = body.indexOf('id="home-catalog"');
 for (const id of ['storage', 'smart-home', 'home-care']) {
  const destination = route('de', 'shop/categories/' + id);
  const location = body.indexOf('href="' + destination + '"');
  assert.ok(location >= 0 && location < catalogue, id + ': task entry is discoverable before the model inventory');
  assert.ok(shoppingHomeText('de', route, origin).join('\n').includes(origin + destination), id + ': same destination in text mirror');
 }
 assert.equal((body.match(/data-home-product=/g) || []).length, homeCatalogFeatured(loadHomeCatalog()).length);
 const destinations = anchors(body).filter(a => (a.attrs.rel || '').split(/\s+/).includes('sponsored'));
 assert.ok(destinations.length > 0);
 for (const a of destinations) {
  const url = new URL(a.attrs.href);
  assert.equal(url.hostname, 'www.amazon.de');
  assert.equal(url.pathname, '/s', 'Do not manufacture exact German ASIN links');
  assert.deepEqual(url.searchParams.getAll('tag'), ['getecoback-21']);
  assert.equal(Object.hasOwn(a.attrs, 'data-shopping-item'), false);
  assert.ok(shoppingLinkPayload({p: '/', href: a.attrs.href, affiliate: true}), 'Root exits remain measurable without passing model searches to analytics');
 }
});

test('explicit English home keeps model exits and routes legacy comparison to its measured catalogue', () => {
 const body = shoppingHomeHTML({lang: 'en', route, esc});
 assert.ok(body.includes('href="/shop#collector-corner"'));
 assert.equal(/\bdata-shortlist-(?:select|compare|config)\b|\bdata-shopping-official\b/.test(body), false, 'Do not render controls whose fixed shared GA4 path contract excludes /en/');
 assert.ok(body.includes('data-home-product='));
 const exits = anchors(body).filter(a => (a.attrs.rel || '').split(/\s+/).includes('sponsored'));
 assert.ok(exits.length > 0);
 for (const a of exits) {
  const payload = shoppingLinkPayload({p: '/en/', href: a.attrs.href, affiliate: true, item: a.attrs['data-shopping-item'], placement: a.attrs['data-shopping-placement']});
  assert.ok(payload, a.attrs.href);
  assert.equal(payload.r, 'https://amazon.com');
 }
});

test('published homes have reciprocal language links, German x-default, readable content and one canonical', () => {
 for (const [lang, file] of Object.entries(homeFiles)) {
  const html = read(file), path = route(lang), url = origin + path;
  assert.ok(html.includes('<html lang="' + locales[lang].tag + '"'), file + ': language matches canonical homepage');
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes('rel="canonical" href="' + url + '"'), file);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(html.includes('content="index,follow,max-image-preview:large"'));
  for (const [other, locale] of Object.entries(locales)) assert.ok(html.includes('hreflang="' + locale.tag + '" href="' + origin + route(other) + '"'), file + ': reciprocal ' + other);
  assert.ok(html.includes('hreflang="x-default" href="' + origin + '/"'));
  const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1]);
  assert.ok(ld['@graph'].some(node => node.url === url && node.inLanguage === locales[lang].tag));
  const mirror = read('collector-assets/text/' + lang + '/home.txt');
  assert.ok(mirror.includes(url));
  assert.ok(mirror.includes(homeCatalogCopy(lang).homeIntro));
  assert.doesNotMatch(mirror, /https?:\/\/(?:www\.)?amazon\.[^\s]*[?&]tag=/);
 }
});

test('manifest and sitemap describe canonical homes and keep all localized guides on their existing URLs', () => {
 const manifest = JSON.parse(read('collector-assets/manifest.json')), sitemap = read('sitemap.xml');
 const homes = manifest.records.filter(record => record.slug === '');
 assert.equal(homes.length, 3);
 for (const record of homes) assert.equal(record.url, origin + route(record.lang));
 const urls = manifest.records.map(record => record.url);
 assert.equal(new Set(urls).size, urls.length, 'No English/German home collision');
 assert.equal(urls.includes(origin + '/de/'), false, 'Redirect alias is not a canonical content record');
 assert.equal(sitemap.includes('<loc>' + origin + '/de/</loc>'), false);
 for (const record of manifest.records) {
  assert.equal(sitemap.split('<loc>' + record.url + '</loc>').length - 1, 1, record.url);
  const pathname = new URL(record.url).pathname;
  const file = pathname === '/' ? 'index.html' : pathname.endsWith('/') ? pathname.slice(1) + 'index.html' : pathname.slice(1) + '.html';
  const html = read(file);
  assert.ok(html.includes('hreflang="x-default" href="' + origin + route('de', record.slug) + '"'), record.url);
 }
 for (const lang of Object.keys(locales)) for (const id of ['storage', 'workspace', 'lighting', 'smart-home', 'electronics', 'kitchen', 'home-care', 'daily-care', 'creative']) {
  assert.ok(urls.includes(origin + route(lang, 'shop/categories/' + id)), lang + '/' + id);
 }
 const notified = read('scripts/urls.txt').trim().split('\n');
 for (const path of ['/', '/en/', '/zh/']) assert.ok(notified.includes(origin + path));
 assert.equal(notified.includes(origin + '/de/'), false, 'Do not treat the old alias as another current content homepage');
});
