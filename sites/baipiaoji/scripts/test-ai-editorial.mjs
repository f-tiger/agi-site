import assert from 'node:assert/strict';
import { tools } from '../lib/ai-suite/editorial.mjs';
import { executeSuiteTool } from '../lib/ai-suite/runtime.mjs';

const registry = new Map(tools.map((t) => [t.id, t]));
assert.equal(registry.size, 180);
const call = (id, args) => executeSuiteTool(registry.get(id), args);
for (const tool of tools) {
  const result = call(tool.id, tool.example);
  assert(result && typeof result === 'object' && !Array.isArray(result), tool.id);
  assert.throws(() => call(tool.id, {}), undefined, tool.id);
  assert.match(tool.title.zh, /\p{Script=Han}/u, tool.id);
  assert.doesNotMatch(
    JSON.stringify([tool.example, result, tool.title.en, tool.description.en]),
    /[一-鿿]{2}|\*\*|\b(?:TBD|TODO|undefined)\b/,
  );
}

assert.equal(call('truncate-grapheme-budget', { text: 'A👩‍🔬B', limit: 2 }).text, 'A…');
assert.equal(call('truncate-utf8-budget', { text: 'A💡Z', bytes: 5 }).text, 'A💡');
assert.equal(call('decode-codepoint-list', { text: '0041 1F33F' }).text, 'A🌿');
assert.throws(() => call('decode-codepoint-list', { text: 'U+D800' }), /scalar/i);
assert.deepEqual(call('newline-inventory', { text: 'A\rB\r\nC\n' }), {
  cr: 1,
  crlf: 1,
  lf: 1,
  finalNewline: true,
});
assert.equal(call('strip-common-indent', { text: '  a\n    b\n  c' }).text, 'a\n  b\nc');
assert.equal(call('paragraph-initials', { text: '👩‍🔬 Work\n\nNext' }).initials, '👩‍🔬N');

assert.deepEqual(call('adjacent-word-echo', { text: 'We we edit papers.' }).matches, [
  { text: 'We we', offset: 0 },
]);
assert.equal(call('bracket-balance', { text: '{(a)[b]}' }).balanced, true);
assert.equal(call('bracket-balance', { text: '{(a]' }).balanced, false);
assert.equal(call('lix-readability-index', { text: 'Another sentence.' }).index, 102);
assert.deepEqual(
  call('keyword-distribution-quartiles', { text: 'Tea milk tea milk.', word: 'TEA' }).counts,
  [1, 0, 1, 0],
);
assert.equal(
  call('unexpanded-initialisms', { text: 'Use a central processing unit (CPU) and USB.' }).candidates[0]
    .value,
  'USB',
);

const fence = String.fromCharCode(96).repeat(3);
assert.deepEqual(
  call('markdown-section-index', {
    text: ['# A', '# A-1', '# A', fence, '# Hidden', fence, '# A'].join('\n'),
  }).sections.map((h) => h.id),
  ['a', 'a-1', 'a-2', 'a-3'],
);
assert.equal(
  call('markdown-reference-coverage', { text: '[tea]: /tea\n[Tea][tea] and [Jam][jam].' }).missing[0],
  'jam',
);
assert.equal(call('markdown-fence-coverage', { text: fence + 'js\ncode' }).fences[0].closed, false);
assert.equal(call('markdown-setext-to-atx', { text: 'Guide\n===\n---' }).markdown, '# Guide\n---');
assert.equal(
  call('markdown-simple-table-width', { text: '| a | b |\n| a\\|b | ok |' }).mismatches.length,
  0,
);
assert.deepEqual(
  call('html-id-uniqueness', { text: '<!-- <i id="a"> --><script>"<b id=a>"</script><p id=a></p>' }),
  { count: 0, items: [] },
);
assert.equal(
  call('html-aria-reference-targets', {
    text: '<input aria-describedby="hint tip"><p id="tip">Note</p>',
  }).items[0].id,
  'hint',
);
assert.equal(
  call('html-table-header-links', {
    text: '<table><tr><th id="a">A</th><td headers="a b">B</td></tr></table>',
  }).items[0].id,
  'b',
);
assert.equal(
  call('html-fieldset-legends', { text: '<fieldset><legend>Address</legend></fieldset>' }).groups[0]
    .firstChildIsLegend,
  true,
);
assert.equal(
  call('html-hidden-focusable', {
    text: '<div aria-hidden="true"><button>Edit</button><input disabled></div>',
  }).count,
  1,
);
assert.equal(
  call('html-fragment-targets', { text: '<a href="#a%20b">Go</a><p id="a b"></p>' }).links[0].found,
  true,
);

assert.equal(
  call('book-isbn-metadata', {
    ...registry.get('book-isbn-metadata').example,
    isbn: '978-0-306-40615-7',
  }).jsonld.isbn,
  '9780306406157',
);
assert.throws(
  () =>
    call('book-isbn-metadata', { ...registry.get('book-isbn-metadata').example, isbn: '9780306406158' }),
  /check digit/i,
);
assert.throws(
  () =>
    call('in-person-event-metadata', {
      ...registry.get('in-person-event-metadata').example,
      start: '2025-02-29',
    }),
  /valid/i,
);
assert.match(
  call('rss-channel-export', {
    name: 'C & D',
    url: 'https://example.org',
    description: 'A < B',
    entries: 'First|https://example.org/a',
  }).xml,
  /<title>C &amp; D<\/title>/,
);
assert.match(
  call('opensearch-description-xml', {
    shortName: 'Notes',
    description: 'Field notes',
    endpoint: 'https://example.org/search?lang=en',
    parameter: 'q',
  }).xml,
  /lang=en&amp;q=\{searchTerms\}/,
);
assert.throws(
  () =>
    call('creative-commons-attribution', {
      ...registry.get('creative-commons-attribution').example,
      license: 'https://example.org/license',
    }),
  /Creative Commons/,
);
assert.throws(
  () => call('tmx-memory-export', { from: 'en', to: 'fr', rows: 'Hello\u0001|Bonjour' }),
  /XML/,
);
assert.deepEqual(call('translation-conflict-review', { rows: 'Hello|Salut\nHello|Bonjour' }).conflicts, [
  { source: 'Hello', translations: ['Salut', 'Bonjour'] },
]);
assert.deepEqual(
  call('localization-token-parity', { original: '{x} {x} {y}', translation: '{x} {y}' }).differences,
  [{ key: 'x', source: 2, target: 1 }],
);
assert.deepEqual(
  call('numbered-reference-coverage', { text: 'Items [1, 3-5].', references: '1. A\n2. B\n3. C\n4. D' }),
  { missing: [5], uncited: [2], duplicateNumbers: [] },
);
assert.deepEqual(call('isbn10-upgrade', { isbn: '0-306-40615-2' }), { isbn13: '9780306406157' });
const original = registry.get('srt-to-webvtt').example.text;
assert.equal(
  call('webvtt-to-srt-cues', { text: call('srt-to-webvtt', { text: original }).vtt }).srt,
  original,
);
const vttWithMetadata = [
  'WEBVTT - Field Notes',
  'STYLE\r\n::cue { color: lime }',
  'REGION\r\nid:opening\r\nwidth:40%',
  'NOTE Caption credits\r\nField Notes',
  'intro\r\n00:01.000 --> 00:02.000 region:opening align:start\r\nHello there\r\nWelcome back',
].join('\r\n\r\n\r\n');
assert.equal(
  call('webvtt-to-srt-cues', { text: vttWithMetadata }).srt,
  '1\n00:00:01,000 --> 00:00:02,000\nHello there\nWelcome back',
);
assert.deepEqual(call('subtitle-silence-intervals', { text: original }).gaps, [
  { fromMs: 3500, toMs: 4000, durationMs: 500 },
]);
assert.throws(() => call('subtitle-shift-timeline', { text: original, offset: -2000 }), /outside/);
console.log(
  '180 editorial tools passed example, validation and bilingual checks, plus independent editorial regression fixtures.',
);
