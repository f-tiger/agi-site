import assert from 'node:assert/strict';

// A new coverage manifest can reach an edge before its static modules. Retry
// only the same versioned asset URL; never accept a different final body or
// bypass caches with a changing query. HTTP retries remain owned by read().
export async function verifyPublishedAsset({host, name, version, expected, read, wait = ms => new Promise(resolve => setTimeout(resolve, ms))}) {
 const path = '/analytics-assets/' + name + '?v=' + version;
 for (let attempt = 0; attempt < 7; attempt++) {
  const live = await read(host, path);
  try {
   assert.equal(live.text, expected, host + '/' + name);
   if (name === 'frame.html') {
    const directives = (live.headers.get('cache-control') || '').split(',').map(value => value.trim().toLowerCase());
    assert(directives.includes('no-transform'), 'Analytics frame must exclude injected third-party beacons');
   }
   return live;
  } catch (error) {
   if (attempt === 6) throw error;
   await wait(5000);
  }
 }
}
