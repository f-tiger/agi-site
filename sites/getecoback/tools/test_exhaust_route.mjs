import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assessExhaustRoute } from '../site/assets/exhaust-route.mjs';

const accepted = { routeCm: 110, availableCm: 120, approval: 'ja', kinkFree: true };
const guide = '/guide/abluftschlauch-verlaengern.html';
const anchor = 'wie-viel-verlaengerung-ist-okay';
const canonical = 'https://getecoback.com' + guide;
const retailerExtension = /https?:\/\/(?:www\.)?amazon\.de\/s\?[^"'<>\s]*(?:schlauch|fensterabdichtung)/i;
const readable = value => value.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

test('route math separates candidate fit, missing approval and a shorter or kinked route', () => {
  for (const [conditions, state, marginCm] of [
    [{}, 'weiter_nach_anleitung', 10],
    [{ routeCm: 120 }, 'weiter_nach_anleitung', 0],
    [{ routeCm: 119.87654 }, 'weiter_nach_anleitung', 0.123],
    [{ routeCm: 150 }, 'weg_aendern', -30],
    [{ routeCm: 150, approval: 'unbekannt' }, 'weg_aendern', -30],
    [{ approval: 'nein', availableCm: null }, 'weg_aendern', null],
    [{ kinkFree: false, approval: 'unbekannt', availableCm: null }, 'weg_aendern', null],
    [{ approval: 'unbekannt' }, 'handbuch_pruefen', 10],
    [{ availableCm: null }, 'handbuch_pruefen', null],
    [{ routeCm: 1, availableCm: 1000 }, 'weiter_nach_anleitung', 999],
  ]) {
    assert.deepEqual(assessExhaustRoute({ ...accepted, ...conditions }), { state, marginCm });
  }
});

test('route rejects invalid lengths, explicit choices and non-boolean guide observations', () => {
  for (const invalid of [0, -1, 1000.001, Infinity, NaN, '120', undefined]) {
    assert.throws(() => assessExhaustRoute({ ...accepted, routeCm: invalid }), RangeError);
    assert.throws(() => assessExhaustRoute({ ...accepted, availableCm: invalid }), RangeError);
  }
  for (const invalid of [{ routeCm: null }, { approval: 'yes' }, { approval: null }, { kinkFree: 'ja' }, { kinkFree: 1 }]) {
    assert.throws(() => assessExhaustRoute({ ...accepted, ...invalid }), RangeError);
  }
});

function assertDocumentedAnswer(text) {
  assert.match(text, /PAC N90 ECO Silent/);
  assert.match(text, /8004399512351/);
  assert.match(text, /1[,.]50\s*m/);
  assert.match(text, /1[,.]20\s*m/);
  assert.match(text, /De[’']Longhi[^.]{0,90}rät[^.]{0,90}Verlängerung ab/);
  assert.match(text, /näheren Standort|andere Aufstellung/i);
  assert.match(text, /de-de\/Brosch%C3%BCre_GesundesWohnen_April2021\.pdf/);
  assert.match(text, /delonghi\.com\/de-de\/faqs\/[^\s)">]*\/a\/1726/);
}

test('German guide serves the exact sourced answer and form, with clean voluntary Reddit sharing', () => {
  const document = readFileSync(new URL('../site' + guide, import.meta.url), 'utf8');
  const article = document.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  assert.ok(article, 'Expected the actual German guide article');
  assert.match(article, new RegExp('<h2[^>]*\\bid="' + anchor + '"'));
  assertDocumentedAnswer(article);
  const section = article.match(/<section\b[^>]*\bdata-exhaust-route\b[^>]*>([\s\S]*?)<\/section>/i)?.[1];
  assert.ok(section, 'The route check belongs inside the actual guide');
  const form = section.match(/<form\b[^>]*\bhidden\b[^>]*>([\s\S]*?)<\/form>/i)?.[1];
  assert.ok(form, 'The controls remain hidden if JavaScript is disabled');
  for (const name of ['routeCm', 'availableCm', 'approval', 'kinkFree']) {
    assert.match(form, new RegExp('\\bname="' + name + '"'));
  }
  assert.match(form, /<p\b[^>]*\brole="status"[^>]*\bdata-exhaust-result\b[^>]*\bhidden\b/);
  assert.match(section, /<noscript>[\s\S]*näheren Standort[\s\S]*<\/noscript>/);
  assert.match(document, /<script\b[^>]*\btype="module"[^>]*\bsrc="\/assets\/exhaust-route\.mjs(?:\?|")/i);
  assert.doesNotMatch(article, /\beb-hf-(?:d|s|t|go|res)\b|Empfohlene Schlauchlänge|\b(?:130|150)\s*mm\b|Verlängerungen ansehen/i);
  assert.doesNotMatch(document, retailerExtension);

  const reddit = article.match(/<a\b([^>]*\bhref="https:\/\/www\.reddit\.com\/submit\?[^"]+"[^>]*)>/i)?.[1];
  assert.ok(reddit, 'Expected a native voluntary Reddit link');
  assert.match(reddit, /\brel="[^"]*\bnoreferrer\b/);
  const href = reddit.match(/\bhref="([^"]+)"/)[1].replace(/&amp;/g, '&');
  const share = new URL(href);
  assert.equal(share.origin + share.pathname, 'https://www.reddit.com/submit');
  assert.deepEqual([...share.searchParams.keys()].sort(), ['title', 'url']);
  assert.equal(share.searchParams.get('title'), 'PAC N90 ECO Silent: Reicht der 1,20-m-Abluftschlauch zum Fenster?');
  assert.equal(share.searchParams.get('url'), canonical + '#' + anchor);
  assert.equal(share.hash, '');
});

test('generated AI Markdown retains practical boundaries without the old accessory funnel', () => {
  const markdown = readFileSync(new URL('../site' + guide.replace(/\.html$/, '.md'), import.meta.url), 'utf8');
  assert.ok(markdown.includes(canonical));
  assertDocumentedAnswer(readable(markdown));
  assert.doesNotMatch(markdown, /getecoback-21|reddit\.com\/submit|eb-hf-/i);
  assert.doesNotMatch(markdown, retailerExtension);
});
