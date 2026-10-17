import {readFileSync} from 'node:fs';

const DATA_URL = new URL('../data/ai-video.json', import.meta.url);
const SOURCE_HOSTS = new Set(['aif.runwayml.com', 'runway.com', 'www.reply.com', 'higgsfield.ai']);
const POSTER_HOSTS = new Set(['d3phaj0sisr2ct.cloudfront.net', 'runway-static-assets.s3.us-east-1.amazonaws.com']);
const WATCH_KINDS = new Set(['film', 'episode', 'trailer', 'source']);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const fail = message => { throw new Error(`AI video catalogue: ${message}`); };

function plain(value, field, max = 600) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`invalid ${field}`);
}

function date(value, field, nullable = true) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`invalid ${field}`);
  const day = value.slice(0, 10);
  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) fail(`invalid calendar date in ${field}`);
}

function officialUrl(value, field, hosts = SOURCE_HOSTS) {
  let u;
  try { u = new URL(value); } catch { fail(`invalid ${field}`); }
  if (u.protocol !== 'https:' || !hosts.has(u.hostname) || u.username || u.password || u.port || u.search || u.hash) fail(`non-official or tracked ${field}`);
  return u;
}

function recognition(value, field, sourceIds) {
  if (!value || !sourceIds.has(value.sourceId)) fail(`unknown source for ${field}`);
  if (value.award !== null) plain(value.award, `${field}.award`, 160);
  if (value.rank !== null && (!Number.isInteger(value.rank) || value.rank < 1 || !value.award)) fail(`unsupported rank for ${field}`);
  officialUrl(value.sourceUrl, `${field}.sourceUrl`);
  date(value.sourcePublishedAt, `${field}.sourcePublishedAt`);
}

/** Validate provenance and media boundaries before any page or public data export. No network. */
export function validateAiVideoCatalog(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.sources) || !data.sources.length || !Array.isArray(data.works) || !data.works.length) fail('invalid top-level contract');
  date(data.updatedAt, 'updatedAt', false);
  if (!data.methodology || typeof data.methodology !== 'object') fail('missing methodology');
  for (const key of ['scope', 'ranking', 'metrics', 'dates', 'genres', 'ai', 'media', 'access', 'business']) plain(data.methodology[key], `methodology.${key}`, 1000);
  const sources = new Map();
  for (const source of data.sources) {
    if (!source || !ID.test(source.id) || sources.has(source.id)) fail('missing or duplicate source id');
    if (!Number.isInteger(source.year) || source.year < 2020 || source.year > 2100 || !['festival', 'series'].includes(source.kind)) fail(`invalid source edition ${source.id}`);
    for (const key of ['label', 'publisher', 'rankMeaning', 'coverage', 'aiEvidence']) plain(source[key], `source.${key}`);
    officialUrl(source.url, 'source.url');
    officialUrl(source.publisherUrl, 'source.publisherUrl');
    date(source.sourcePublishedAt, 'source.sourcePublishedAt');
    date(source.checkedAt, 'source.checkedAt', false);
    date(source.observedAt, 'source.observedAt', false);
    if (source.sourcePublishedAt && Date.parse(source.sourcePublishedAt) > Date.parse(source.checkedAt)) fail('source published after observation');
    sources.set(source.id, source);
  }
  const ids = new Set();
  const titles = new Set();
  for (const work of data.works) {
    if (!work || !ID.test(work.id) || ids.has(work.id)) fail('missing or duplicate work id');
    ids.add(work.id);
    for (const key of ['title', 'creator', 'summary', 'selectionLabel', 'playbackNote', 'aiEvidence']) plain(work[key], `work.${key}`, key === 'summary' ? 300 : 600);
    const title = work.title.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, '');
    if (titles.has(title)) fail(`duplicate work title ${work.title}; nest additional recognition instead`);
    titles.add(title);
    const source = sources.get(work.sourceId);
    if (!source || work.year !== source.year) fail(`missing or mismatched source edition for ${work.id}`);
    recognition(work, work.id, sources);
    date(work.checkedAt, 'work.checkedAt', false);
    date(work.observedAt, 'work.observedAt', false);
    if (work.sourcePublishedAt && Date.parse(work.sourcePublishedAt) > Date.parse(work.checkedAt)) fail('work source published after observation');
    if (!['short-film', 'series', 'episode'].includes(work.format) || !WATCH_KINDS.has(work.watchKind)) fail(`unknown format or watch kind for ${work.id}`);
    if (work.durationSeconds !== null && (!Number.isInteger(work.durationSeconds) || work.durationSeconds <= 0)) fail(`invented or invalid runtime for ${work.id}`);
    if (!Array.isArray(work.genres) || new Set(work.genres).size !== work.genres.length || work.genreBasis !== 'editorial') fail(`invalid genre provenance for ${work.id}`);
    for (const genre of work.genres) plain(genre, 'work.genre', 60);
    if (source.kind === 'series' && (work.rank !== null || work.award !== null)) fail('publisher showcase cannot acquire festival rank or award');
    if (work.youtubeId !== null) {
      if (!VIDEO_ID.test(work.youtubeId)) fail(`invalid YouTube ID for ${work.id}`);
      if (work.watchUrl !== `https://www.youtube.com/watch?v=${work.youtubeId}` || work.thumbnailUrl !== `https://i.ytimg.com/vi/${work.youtubeId}/hqdefault.jpg`) fail(`YouTube watch/thumbnail mismatch for ${work.id}`);
    } else {
      officialUrl(work.watchUrl, 'work.watchUrl');
      if (work.thumbnailUrl !== null) fail('non-YouTube poster reuse has no verified permission');
    }
    if (work.officialPosterUrl != null) {
      officialUrl(work.officialPosterUrl, 'work.officialPosterUrl', POSTER_HOSTS);
      if (source.publisher !== 'Runway') fail('poster provenance must match the official festival');
      plain(work.imageRightsNote, 'work.imageRightsNote');
    }
    // No sourced regional-audience or cross-platform popularity data exists in this edition.
    for (const key of ['language', 'creatorCountry', 'audienceGeography', 'plays', 'views', 'likes', 'audienceRank', 'popularityScore']) {
      if (work[key] !== undefined && work[key] !== null) fail(`unsupported ${key} for ${work.id}`);
    }
    if (!Array.isArray(work.additionalRecognitions)) fail('missing additionalRecognitions array');
    for (const value of work.additionalRecognitions) recognition(value, `${work.id}.additionalRecognition`, sources);
  }
  return data;
}

export const validateAiVideo = validateAiVideoCatalog;

/** Read the committed source snapshot. Builds must never relabel it with today's date. */
export function loadAiVideoCatalog(path = DATA_URL) {
  return validateAiVideoCatalog(JSON.parse(readFileSync(path, 'utf8')));
}
