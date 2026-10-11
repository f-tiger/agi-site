import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, hit } from './fleet-trends-vocabulary.mjs';

const tds = MAPS['sites/thedollscout/content/trends-us.json'];
const matches = title => tds.some(kw => hit(title, kw));

test('TDS collector RSS matches all eight brands without the retired PDF theme', () => {
  for (const title of ['SMISKI Living Series', 'Sonny Angel Vegetable Series',
    'Jellycat Amuseables', 'Labubu Have a Seat', 'SKULLPANDA Image of Reality',
    'HIRONO figures', 'HIRONO toys', 'HIRONO blind box collection',
    'POP MART HIRONO collection', 'Popmart Hirono collection',
    'DIMOO animal kingdom', 'MEGA MOLLY figures']) {
    assert.equal(matches(title), true, title);
  }
  for (const title of ['PDF accessibility remediation', 'compare PDF to text',
    'Molly Mae interview', 'Senator Mazie Hirono', 'Mazie Hirono Senate hearing',
    'world series', 'real estate odds', 'UV stamp checker']) {
    assert.equal(matches(title), false, title);
  }
  assert.deepEqual(tds.slice(0, 4), ['smiski', 'sonny angel', 'jellycat', 'labubu']);
  assert.equal(new Set(tds).size, tds.length);
});

test('the other two sites retain their exact topic vocabulary', () => {
  assert.deepEqual(MAPS['sites/baipiaoji/data/trends-us.json'], [
    'chatgpt', 'openai', 'claude', 'anthropic', 'gemini', 'midjourney', 'suno',
    'sora', 'grok', 'deepseek', 'kimi', 'qwen', 'copilot', 'perplexity', 'runway',
    'notebooklm', 'stable diffusion', 'llama', 'mistral', 'artificial intelligence',
    'gpt', 'veo', 'nano banana',
  ]);
  assert.deepEqual(MAPS['sites/agiscorecard/trends-us.json'], [
    'agi', 'openai', 'anthropic', 'claude', 'gpt', 'gemini', 'superintelligence',
    'altman', 'aschenbrenner', 'deepmind', 'artificial general intelligence',
    'ai benchmark', 'gpt-6', 'sam altman',
  ]);
  assert.equal(hit('magic show', 'agi'), false);
  assert.equal(hit('AGI benchmark', 'agi'), true);
  assert.equal(hit('OpenAI launches', 'openai'), true);
});
