import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalHostRedirect} from '../../functions/canonical-host.mjs';

test('www GET keeps path and query while redirecting to the apex host', () => {
  const response = canonicalHostRedirect(new Request('https://www.thedollscout.com/series/smiski-museum?utm_source=google'));
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://thedollscout.com/series/smiski-museum?utm_source=google');
});

test('apex and non-idempotent requests are not redirected', () => {
  assert.equal(canonicalHostRedirect(new Request('https://thedollscout.com/series/smiski-museum')), null);
  assert.equal(canonicalHostRedirect(new Request('https://www.thedollscout.com/api/ev', {method:'POST'})), null);
});
