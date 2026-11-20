import assert from 'node:assert/strict';
import { tools } from '../lib/ai-suite/developer.mjs';

const registry = new Map(tools.map((t) => [t.id, t]));
assert.equal(registry.size, 180);
for (const t of tools) {
  const got = t.run(t.example);
  assert(got && typeof got === 'object' && !Array.isArray(got), t.id);
  assert.deepEqual(JSON.parse(JSON.stringify(got)), JSON.parse(JSON.stringify(t.run(t.example))), t.id);
  const invalid = { ...t.example, [t.inputs[0].key]: null };
  assert.throws(() => t.run(invalid), undefined, t.id);
}
// Independent reference values include edge cases and examples from published identifier formats.
const checked = new Set();
function expect(id, change, key, value) {
  const t = registry.get(id);
  assert(t, id);
  const result = t.run({ ...t.example, ...change });
  assert.deepEqual(JSON.parse(JSON.stringify(result[key])), value, id);
  checked.add(id);
}
const example = (id, key, value) => expect(id, {}, key, value);
function rejects(id, overrides) {
  const t = registry.get(id);
  assert.throws(() => t.run({ ...t.example, ...overrides }), undefined, id);
}
expect('json-node-census', { document: '[false,2]' }, 'counts', { array: 1, boolean: 1, number: 1 });
expect('json-null-locations', { document: '{"a/b":null}' }, 'paths', ['/a~1b']);
expect('json-empty-containers', { document: '[[],{},0]' }, 'paths', ['/0', '/1']);
expect('json-remove-null-members', { document: '{"x":null,"y":[null]}' }, 'document', { y: [null] });
expect('json-redact-field', { document: '[{"mode":"live"}]' }, 'document', [{ mode: '[redacted]' }]);
example('json-retain-root-keys', 'missing', ['enabled']);
example('json-rename-root-key', 'object', { 'api.port': 8080, stage: 'live' });
expect('json-object-defaults', { object: '{"mode":null}' }, 'object', { mode: null, region: 'east' });
expect('json-pointer-encode', { keys: '["","a/b","~"]' }, 'pointer', '//a~1b/~0');
expect('json-pointer-segments', { pointer: '//~01' }, 'segments', ['', '~1']);
expect('json-infer-schema', { document: '[2,"x",1]' }, 'schema', {
  type: 'array',
  items: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
});
expect('json-size-breakdown', { object: '{"a":"€"}' }, 'fields', [{ key: 'a', bytes: 5 }]);
expect('json-string-inventory', { document: '["one",null]' }, 'strings', [{ path: '/0', value: 'one' }]);
expect('json-text-sequence', { records: '[1,"ok"]' }, 'sequence', '\x1e1\n\x1e"ok"\n');
expect('json-array-unique-values', { array: '[{"a":1,"b":2},{"b":2,"a":1}]' }, 'array', [{ a: 1, b: 2 }]);
example('json-zip-keys-values', 'object', { mode: 'live', enabled: true });
example('json-invert-string-map', 'inverted', { team: ['a', 'b'], ops: ['c'] });
expect(
  'json-dot-keys-nest',
  { object: '{"__proto__.safe":1}' },
  'object',
  JSON.parse('{"__proto__":{"safe":1}}'),
);
assert.equal({}.safe, undefined);
example('json-schema-enum', 'schema', { enum: ['north', 'south'] });
expect('json-leaf-depths', { document: '[0,{"p":0,"q":null}]' }, 'depths', { 1: 1, 2: 2 });
rejects('json-dot-keys-nest', { object: '{"a":1,"a.b":2}' });
rejects('json-pointer-segments', { pointer: '/bad~3' });

const chain = { graph: '{"a":["b"],"b":["c"]}' };
expect('graph-edge-list', chain, 'edges', [
  ['a', 'b'],
  ['b', 'c'],
]);
expect('graph-reverse-links', chain, 'reversed', { a: [], b: ['a'], c: ['b'] });
expect('graph-degree-profile', { graph: '{"a":["a"]}' }, 'degrees', [
  { node: 'a', inbound: 1, outbound: 1, selfLoop: true },
]);
expect('graph-weak-components', { graph: '{"a":["b"],"c":[]}' }, 'groups', [['a', 'b'], ['c']]);
expect('graph-strong-components', { graph: '{"a":["b"],"b":["a","c"]}' }, 'groups', [['a', 'b'], ['c']]);
expect('graph-topological-waves', chain, 'waves', [['a'], ['b'], ['c']]);
expect('graph-cycle-witness', { graph: '{"a":["a"]}' }, 'cycle', ['a', 'a']);
expect('graph-minimum-hops', { ...chain, start: 'a', end: 'c' }, 'hops', 2);
expect('graph-reachability-index', chain, 'reachable', { a: ['b', 'c'], b: ['c'], c: [] });
example('graph-transitive-reduction', 'redundant', [['ui', 'db']]);
expect('graph-bipartition', chain, 'bipartite', true);
expect('graph-edge-density', { graph: '{"a":["a","b"]}' }, 'density', 0.5);
expect('graph-euler-trail', chain, 'form', 'open');
expect('graph-boundary-nodes', chain, 'sinks', ['c']);
example('graph-acyclic-route-count', 'paths', '2');
expect('graph-finite-diameter', chain, 'hops', 2);
expect('graph-bridge-links', chain, 'bridges', [
  ['a', 'b'],
  ['b', 'c'],
]);
expect('graph-cut-vertices', chain, 'cutVertices', ['b']);
example('graph-shared-targets', 'common', ['store']);
expect('graph-upstream-impact', { ...chain, end: 'c' }, 'upstream', [
  { node: 'b', hops: 1 },
  { node: 'a', hops: 2 },
]);
rejects('graph-topological-waves', { graph: '{"a":["a"]}' });

example('isbn10-to-isbn13', 'isbn13', '9780306406157');
expect('gtin-normalize', { value: '96385074' }, 'gtin14', '00000096385074');
example('issn-check-digit', 'issn', '0378-5955');
expect('orcid-validate', { value: '0000-0002-1825-0098' }, 'valid', false);
expect('isin-checksum', { value: 'US0378331004' }, 'valid', false);
example('iban-mod97', 'remainder', 1);
example('lei-checksum', 'checksumValid', true);
example('vin-north-america-check', 'expected', 'X');
expect('ulid-components', { value: '00000000010000000000000000' }, 'milliseconds', 1);
expect('objectid-components', { value: '000000010000000000000010' }, 'utc', '1970-01-01T00:00:01.000Z');
expect('discord-snowflake-parts', { value: '0' }, 'utc', '2015-01-01T00:00:00.000Z');
expect('bic-structure', { value: 'DEUTDEFF' }, 'branch', 'XXX');
example('container-code-check', 'container', 'CSQU3054383');
example('cas-registry-check', 'valid', true);
example('imei-check-digit', 'imei', '490154203237518');
expect('nmea-sentence-checksum', { value: 'GPGLL,4916.45,N,12311.12,W,225444,A' }, 'checksum', '31');
expect('midi-note-frequency', { value: '60' }, 'note', 'C4');
example('oid-ber-content', 'hex', '2a 86 48 86 f7 0d');
example('modified-eui64', 'interfaceId', '0225:96ff:fe12:3456');
example('cusip-check-digit', 'cusip', '037833100');
rejects('oid-ber-content', { value: '1.41.3' });

expect('color-hsl-coordinates', { color: '#00ff00' }, 'h', 120);
expect('color-hsv-picker', { color: '#000000' }, 'sPercent', 0);
expect('color-process-cmyk', { color: '#ff0000' }, 'magentaPct', 100);
expect('color-xyz-d65', { color: '#ff0000' }, 'X', 41.24564);
expect('color-lab-d65', { color: '#000000' }, 'L', 0);
expect('color-oklch', { color: '#ffffff' }, 'hueDeg', null);
expect('color-linear-gradient', { color: '#000000', other: '#ffffff', steps: 3 }, 'colors', [
  '#000000',
  '#bcbcbc',
  '#ffffff',
]);
expect('color-hue-harmonies', { color: '#ff0000' }, 'complement', '#00ffff');
expect('choose-monochrome-foreground', { color: '#ffffff' }, 'blackContrast', 21);
expect('oklab-srgb-gamut', { lightness: 0.5, a: 0.9, b: 0.7 }, 'inGamut', false);
expect('color-delta-e76', { color: '#123456', other: '#123456' }, 'deltaE76', 0);
expect('color-luminance-grayscale', { color: '#ff0000' }, 'grayscale', '#7f7f7f');
expect('palette-css-variables', { palette: '["#ff0000"]' }, 'css', ':root {\n  --swatch-1: #ff0000;\n}');
expect('alpha-over-background', { color: '#000000', other: '#ffffff', opacity: 0.5 }, 'composite', '#808080');
expect('rgb565-preview', { color: '#ff0000' }, 'packedHex', '0xf800');
expect('xterm-fixed-color', { color: '#ffffff' }, 'index', 231);
expect('palette-nearest-swatch', { color: '#abcdef', palette: '["#000000","#abcdef"]' }, 'best', {
  hex: '#abcdef',
  deltaE: 0,
});
expect('css-hex-shorthand', { color: '#aabbcc' }, 'css', '#abc');
expect(
  'palette-gradient-css',
  { palette: '["#000000","#ffffff"]', angle: 45 },
  'css',
  'linear-gradient(45deg, #000000 0%, #ffffff 100%)',
);
expect('palette-lightness-order', { palette: '["#ffffff","#000000"]' }, 'swatches', [
  { hex: '#000000', lightness: 0 },
  { hex: '#ffffff', lightness: 0.99999999 },
]);

expect('calendar-ordinal-date', { date: '2000-12-31' }, 'ordinal', 366);
expect('calendar-from-ordinal', { year: 1900, ordinal: 60 }, 'date', '1900-03-01');
expect(
  'calendar-month-layout',
  { year: 2021, month: 2 },
  'weeks',
  Array.from({ length: 4 }, (_, i) => Array.from({ length: 7 }, (_, j) => i * 7 + j + 1)),
);
example('calendar-month-end-offset', 'date', '2025-02-28');
expect('calendar-nth-weekday', { year: 2021, month: 2, weekday: 1, occurrence: 5 }, 'date', null);
expect('calendar-last-weekday', { year: 2021, month: 2, weekday: 1 }, 'date', '2021-02-22');
expect(
  'calendar-weekday-histogram',
  { date: '2024-01-01', end: '2024-01-08' },
  'mondayThroughSunday',
  [2, 1, 1, 1, 1, 1, 1],
);
example('calendar-western-easter', 'easter', '2024-03-31');
expect('calendar-julian-day-number', { date: '2000-01-01' }, 'julianDayNumber', 2451545);
expect('calendar-mjd-at-midnight', { mjd: 0 }, 'date', '1858-11-17');
example('calendar-quarter-bounds', 'end', '2024-03-31');
example('calendar-decade-bounds', 'last', '2029-12-31');
example('calendar-month-slices', 'slices', [
  { from: '2024-02-29', to: '2024-02-29', days: 1 },
  { from: '2024-03-01', to: '2024-03-05', days: 5 },
]);
expect('calendar-date-series', { date: '2024-02-28', stride: 1, count: 3 }, 'dates', [
  '2024-02-28',
  '2024-02-29',
  '2024-03-01',
]);
expect('calendar-iso-week-to-monday', { year: 2020, week: 53 }, 'monday', '2020-12-28');
expect('calendar-anniversary', { date: '2020-02-29', end: '2021-02-27' }, 'anniversary', '2021-02-28');
expect('calendar-date-midpoint', { date: '2024-01-01', end: '2024-01-02' }, 'utc', '2024-01-01T12:00:00.000Z');
expect('calendar-common-leap-list', { year: 1899, span: 7 }, 'years', [1904]);
expect('calendar-rfc3339-local-date', { date: '2000-01-01', offset: 60 }, 'utc', '1999-12-31T23:00:00.000Z');
example('calendar-recurring-weekday-mask', 'dates', ['2024-03-01', '2024-03-04']);
rejects('calendar-iso-week-to-monday', { year: 2021, week: 53 });

expect('rfc4648-base32', { bytes: '66 6f 6f' }, 'base32', 'MZXW6===');
expect('base58-byte-encoding', { bytes: '00 00 01' }, 'base58', '112');
expect('adobe-ascii85', { bytes: '00 00 00 00' }, 'ascii85', '<~z~>');
expect('utf16-code-units', { text: '😀' }, 'units', [
  { offset: 0, hex: 'D83D' },
  { offset: 1, hex: 'DE00' },
]);
expect('utf8-byte-offsets', { text: '€a' }, 'mapping', [
  { char: '€', byte: 0, unit: 0 },
  { char: 'a', byte: 3, unit: 1 },
]);
expect('decode-utf8-strict', { bytes: 'f0 9f 98 80' }, 'text', '😀');
example('unsigned-leb128', 'hex', 'ac 02');
expect('protobuf-zigzag', { integer: '-2' }, 'hex', '03');
expect('packed-bcd', { digits: '123' }, 'hex', '01 23');
expect('binary-gray-code', { integer: '7', bits: 4 }, 'gray', '0100');
expect('twos-complement-word', { integer: '-3', bits: 8 }, 'binary', '11111101');
expect('ieee754-binary32', { value: 1 }, 'hex', '3f 80 00 00');
expect('word-endian-swap', { bytes: '12 34 56 78', width: 2 }, 'hex', '34 12 78 56');
expect('byte-popcount', { bytes: 'ff 00 01' }, 'total', 9);
expect('bitfield-extract', { integer: '240', offset: 4, bits: 4 }, 'decimal', '15');
expect('rle-byte-runs', { bytes: 'ff ff 00' }, 'runs', [
  { value: 255, count: 2 },
  { value: 0, count: 1 },
]);
expect('fletcher16', { bytes: '61 62 63 64 65' }, 'checksum', 'c8f0');
expect('adler32', { bytes: '57 69 6b 69 70 65 64 69 61' }, 'checksum', '11e60398');
expect('cobs-frame', { bytes: '11 00 22' }, 'frame', '02 11 02 22 00');
expect('slip-frame', { bytes: 'c0 db' }, 'frame', 'c0 db dc db dd c0');
rejects('decode-utf8-strict', { bytes: 'ff' });

expect('discrete-bezout', { a: 35, b: 12 }, 'gcd', '1');
example('discrete-lcm-list', 'lcm', '120');
expect('discrete-modular-inverse', { a: 3, modulus: 11 }, 'inverse', '4');
expect('discrete-modular-power', { a: 3, exponent: 5, modulus: 7 }, 'residue', '5');
example('discrete-congruence-pair', 'residue', '8');
expect('discrete-continued-fraction', { a: 415, b: 93 }, 'terms', [4, 2, 6, 7]);
expect('discrete-farey-sequence', { order: 3 }, 'fractions', ['0/1', '1/3', '1/2', '2/3', '1/1']);
example('discrete-roman-numeral', 'roman', 'MCMLXXXIV');
expect('discrete-integer-square-root', { value: '26' }, 'remainder', '1');
example('discrete-align-offset', 'padding', 5);
expect('discrete-prime-factors', { a: 72 }, 'factors', [
  { prime: 2, exponent: 3 },
  { prime: 3, exponent: 2 },
]);
expect('discrete-prime-sieve', { first: 0, last: 10 }, 'primes', [2, 3, 5, 7]);
expect('discrete-euler-totient', { a: 12 }, 'totient', 4);
expect('discrete-binomial', { n: 5, k: 2 }, 'combinations', '10');
expect('discrete-catalan', { n: 4 }, 'balancedStrings', '14');
expect('discrete-derangements', { n: 4 }, 'derangements', '9');
expect('discrete-integer-partitions', { n: 5 }, 'partitions', '7');
example('discrete-fibonacci', 'value', '354224848179261915075');
example('discrete-permutation-rank', 'rank', '4');
example('discrete-josephus', 'survivor', 4);

example('system-slo-downtime', 'minutes', 43.2);
example('system-error-budget-burn', 'burnMultiple', 1.5);
expect('system-serial-availability', { availability: 0.8, dependencies: 2 }, 'availability', 0.64);
expect('system-replica-availability', { availability: 0.8, replicas: 2 }, 'availability', 0.96);
expect('system-quorum-availability', { availability: 0.5, replicas: 3, required: 2 }, 'probability', 0.5);
expect('system-single-queue-delay', { arrivals: 2, service: 4 }, 'meanWaitSeconds', 0.25);
example('system-little-law', 'meanInFlight', 1);
expect('system-queue-drain', { backlog: 60, incoming: 2, service: 5 }, 'seconds', 20);
example('system-bandwidth-delay-product', 'bytes', 5000000);
example('system-worker-count', 'workers', 3);
example('system-cache-latency', 'meanMs', 7.6);
example('system-bloom-size', 'bytes', 119814);
expect('system-birthday-collision', { draws: 2, space: 2 }, 'probability', 0.5);
example('system-backup-chain-storage', 'retainedGiB', 354);
expect('system-raid-capacity', { drives: 3, driveTiB: 2 }, 'usableTiB', { raid0: 6, raid1: 2, raid5: 4 });
example('system-shard-capacity', 'constraint', 'storage');
expect('system-retry-amplification', { failure: 0.5, attempts: 3 }, 'meanAttempts', 1.75);
expect('system-backoff-timeline', { initial: 5, factor: 2, cap: 9, attempts: 4 }, 'waitsMs', [5, 9, 9]);
example('system-origin-transfer', 'originGiB', 120);
example('system-compression-savings', 'ratio', 4);

example('delivery-semver-bump', 'next', '1.5.0');
expect('delivery-semver-range', { range: '^0.0.2', versions: '["0.0.2","0.0.3"]' }, 'matching', ['0.0.2']);
example('delivery-calendar-version', 'version', '2026.11.3');
expect('delivery-conventional-changelog', { commits: 'bad\nfeat!: change' }, 'unmatched', ['bad']);
expect('delivery-commit-bump-signal', { commits: 'fix!: rename' }, 'subjectBasedBump', 'major');
example('delivery-dependency-scope-conflicts', 'conflicts', [
  {
    name: 'alpha',
    entries: [
      { scope: 'dependencies', spec: '^1.2.0' },
      { scope: 'devDependencies', spec: '1.5.0' },
    ],
  },
]);
expect('delivery-package-exports', { manifest: '{"exports":{".":null}}' }, 'targets', [
  { path: ['.'], target: null },
]);
expect('delivery-package-name-shape', { name: 'Bad!' }, 'syntaxValid', false);
example('delivery-license-notices', 'undeclared', ['docs@2.0.0']);
example('delivery-test-shards', 'shards', [
  { tests: ['setup'], seconds: 1.1 },
  { tests: ['publish'], seconds: 0.5 },
]);
example('delivery-fail-fast-order', 'expectedSeconds', 29);
example('delivery-test-history', 'transitions', 3);
expect(
  'delivery-junit-xml',
  { tests: '[{"name":"x&y","status":"fail","seconds":1}]' },
  'xml',
  '<testsuite tests="1" failures="1" skipped="0">\n<testcase name="x&amp;y" time="1"><failure/></testcase>\n</testsuite>',
);
expect('delivery-tap-report', { tests: '[]' }, 'tap', 'TAP version 13\n1..0');
example('delivery-coverage-misses', 'ranges', [
  { start: 4, end: 5 },
  { start: 8, end: 8 },
]);
expect('delivery-weighted-coverage', { modules: '[{"hit":2,"total":4},{"hit":1,"total":2}]' }, 'fraction', 0.5);
example('delivery-artifact-matrix', 'expected', 4);
expect(
  'delivery-git-hash-prefix',
  { hashes: JSON.stringify(['a'.repeat(40), 'b'.repeat(40)]), minimum: 3 },
  'abbreviations',
  [
    { hash: 'a'.repeat(40), prefix: 'aaa' },
    { hash: 'b'.repeat(40), prefix: 'bbb' },
  ],
);
example('delivery-api-symbol-change', 'removed', ['load']);
example('delivery-release-gates', 'blockers', [{ gate: 'smoke', state: 'pending' }]);
assert.equal(checked.size, registry.size);
console.log(
  'PASS 180 developer tools, one independent known answer per tool, 180 deterministic examples and 180 invalid field cases.',
);
