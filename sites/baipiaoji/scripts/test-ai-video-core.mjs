import assert from 'node:assert/strict';
import test from 'node:test';
import {loadAiVideoCatalog, validateAiVideoCatalog} from '../lib/ai-video-catalog.mjs';

const catalog = loadAiVideoCatalog();
const altered = change => { const copy = structuredClone(catalog); change(copy); return copy; };

test('official-source snapshot keeps missing metrics and dates unknown', () => {
  assert.equal(validateAiVideoCatalog(catalog), catalog);
  assert.ok(catalog.sources.some(source => source.kind === 'series'));
  assert.ok(catalog.works.some(work => work.sourcePublishedAt === null));
  assert.ok(catalog.works.some(work => work.durationSeconds === null));
  assert.ok(catalog.works.some(work => work.additionalRecognitions.length));
  assert.ok(catalog.works.filter(work => work.watchKind === 'trailer').every(work => ['series', 'video'].includes(work.format)));
});

test('duplicate cross-festival records must become additional recognitions', () => {
  assert.throws(() => validateAiVideoCatalog(altered(data => data.works.push({...data.works[0], id: 'duplicate-entry'}))), /duplicate work title/);
  assert.throws(() => validateAiVideoCatalog(altered(data => data.works.push({...data.works[0], id: 'alternate-upload-title', title: 'Alternate name for the same video'}))), /duplicate video identity/);
});

test('editorial collections preserve source notes, historical years and unknown popularity', () => {
  const history = catalog.works.filter(work => work.sourceId.startsWith('runway-watch-'));
  assert.ok(history.length > 0);
  assert.ok(history.every(work => work.summaryKind === 'source-note' && work.sourcePublishedAt === null && work.year < 2026));
  assert.ok(history.every(work => work.format === 'video' && work.durationSeconds === null && work.award === null && work.rank === null));
  const recent = catalog.works.filter(work => work.sourceId === 'curious-refuge-2026');
  assert.ok(recent.length > 0);
  assert.ok(recent.every(work => work.summaryKind === 'synopsis' && work.sourcePublishedAt.startsWith('2026-10-')));
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works.find(work => work.summaryKind === 'source-note').award = 'Most popular'; })), /editorial collection cannot/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].summaryKind = 'source-note'; })), /requires editorial collection/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].summaryKind = 'generated plot'; })), /unknown summary kind/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works.find(work => work.summaryKind === 'source-note').sourceUrl = 'https://watch.runwayml.com.attacker.example/movie'; })), /non-official/);
  assert.ok(catalog.works.find(work => work.id === 'runway-watch-eclipsed-horizons').aliases.includes('日食の地平線'));
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].aliases = ['same', 'same']; })), /invalid aliases/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].aliases = ['<script>alert(1)</script>']; })), /invalid work.alias/);
});

test('unverified popularity and regional claims cannot leak into the catalogue', () => {
  for (const key of ['views', 'plays', 'likes', 'audienceRank', 'popularityScore', 'audienceGeography', 'language', 'creatorCountry']) {
    assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0][key] = key.includes('Country') ? 'US' : 1; })), new RegExp(`unsupported ${key}`));
  }
  assert.throws(() => validateAiVideoCatalog(altered(data => { const w = data.works.find(work => work.sourceId === 'higgsfield-originals-2026'); w.award = 'Most popular'; w.rank = 1; })), /showcase cannot/);
});

test('official player identity and permission boundaries reject arbitrary media', () => {
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].watchUrl = 'https://www.youtube.com/watch?v=unrelated00'; })), /mismatch/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works.find(work => !work.youtubeId).thumbnailUrl = 'https://example.org/poster.jpg'; })), /poster reuse/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].sourceUrl = 'https://aif.runwayml.com.attacker.example/'; })), /non-official/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].sourceUrl = 'https://aif.runwayml.com/?affiliate=test'; })), /tracked/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].officialPosterUrl = 'https://example.org/poster.webp'; })), /non-official/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].imageRightsNote = null; })), /imageRightsNote/);
});

test('invalid provenance, injected HTML and fake runtime fail closed', () => {
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].sourcePublishedAt = '2026-02-30'; })), /calendar date/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].sourcePublishedAt = '2099-01-01'; })), /published after/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].sourceId = 'unknown'; })), /source edition/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].summary = '<script>alert(1)</script>'; })), /invalid work.summary/);
  assert.throws(() => validateAiVideoCatalog(altered(data => { data.works[0].durationSeconds = 0; })), /runtime/);
});
