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
  assert.ok(catalog.works.filter(work => work.watchKind === 'trailer').every(work => work.format === 'series'));
});

test('duplicate cross-festival records must become additional recognitions', () => {
  assert.throws(() => validateAiVideoCatalog(altered(data => data.works.push({...data.works[0], id: 'duplicate-entry'}))), /duplicate work title/);
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
