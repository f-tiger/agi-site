/* ===== procedural tracks =====
   A track is a centreline sampled every metre with position, tangent and right
   vector, plus width, checkpoints and length. Everything downstream (physics,
   AI, rendering, the verifier) reads the same samples, so a track that the
   verifier proves drivable is exactly the track the player gets. Seeds are
   integers: campaign tracks are fixed seeds, the daily is the date. */
export const WIDTH = 9;
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function dailySeed(d) { d = d || new Date(); return 100000 + d.getUTCFullYear() * 366 + d.getUTCMonth() * 31 + d.getUTCDate(); }
/* segments: straight | turn | hill. `level` scales count and sharpness. */
function plan(seed, level) {
  const r = rng(seed), segs = [], n = 10 + Math.min(10, level * 2);
  let heading = 0;
  segs.push({ t: "s", len: 40 });
  for (let i = 0; i < n; i++) {
    const roll = r();
    if (roll < 0.42) {
      const dir = r() < 0.5 ? -1 : 1, radius = 16 + r() * (40 - Math.min(20, level * 2)), ang = (30 + r() * (60 + Math.min(60, level * 8))) * Math.PI / 180;
      segs.push({ t: "t", radius, ang: ang * dir }); heading += ang * dir;
    } else if (roll < 0.62 && level >= 2) segs.push({ t: "h", len: 40 + r() * 40, amp: 2 + r() * 4 });   /* rises only: a dip would sink under the flat ground plane */
    else segs.push({ t: "s", len: 30 + r() * 60 });
  }
  segs.push({ t: "s", len: 50 });
  return segs;
}
function build(segs) {
  const P = []; let x = 0, z = 0, y = 0, h = 0;
  const push = () => P.push({ x, y, z, h, s: P.length ? P[P.length - 1].s + 1 : 0, k: 0 });
  push();
  for (const g of segs) {
    if (g.t === "s" || g.t === "h") {
      const L = Math.round(g.len), y0 = y;
      for (let i = 1; i <= L; i++) {
        x += Math.sin(h); z += Math.cos(h);
        if (g.t === "h") y = y0 + g.amp * Math.sin(Math.PI * i / L);   /* a smooth bump (or dip) that returns to the entry height */
        push(); P[P.length - 1].k = 0;
      }
      y = y0;
    } else {
      const L = Math.round(Math.abs(g.ang) * g.radius), dh = g.ang / L, k = 1 / g.radius * Math.sign(g.ang);
      for (let i = 0; i < L; i++) { h += dh; x += Math.sin(h); z += Math.cos(h); push(); P[P.length - 1].k = k; }
    }
  }
  /* smooth heights and curvature a little so frames do not jitter */
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < P.length - 1; i++) { P[i].y = (P[i - 1].y + P[i].y * 2 + P[i + 1].y) / 4; P[i].k = (P[i - 1].k + P[i].k * 2 + P[i + 1].k) / 4; }
  for (let i = 0; i < P.length; i++) P[i].slope = i < P.length - 1 ? P[i + 1].y - P[i].y : 0;
  return P;
}
function selfIntersects(P) {
  const cell = new Map(), C = 14;
  for (const p of P) { const key = Math.floor(p.x / C) + "," + Math.floor(p.z / C); (cell.get(key) || cell.set(key, []).get(key)).push(p); }
  for (const p of P) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const q = cell.get((Math.floor(p.x / C) + dx) + "," + (Math.floor(p.z / C) + dz)); if (!q) continue;
    for (const o of q) if (Math.abs(o.s - p.s) > 40 && Math.hypot(o.x - p.x, o.z - p.z) < WIDTH + 6) return true;
  }
  return false;
}
export function makeTrack(seed, level) {
  let P = null, tries = 0, s = seed;
  while (tries++ < 40) { P = build(plan(s, level)); if (!selfIntersects(P)) break; s += 7919; }
  const length = P.length - 1, cps = [];
  const ncp = Math.max(2, Math.round(length / 180));
  for (let i = 1; i <= ncp; i++) cps.push(Math.round(length * i / (ncp + 1)));
  return { seed, level, P, length, width: WIDTH, cps, name: trackName(seed) };
}
export function trackName(seed) {
  const A = ["Delta", "Vega", "Orion", "Lyra", "Nova", "Argo", "Cygnus", "Rigel", "Atlas", "Sirius", "Halo", "Ion"], B = ["Ridge", "Loop", "Canyon", "Spiral", "Run", "Coast", "Pass", "Circuit", "Rise", "Bend", "Strip", "Drop"];
  const r = rng(seed * 31 + 7); return A[Math.floor(r() * A.length)] + " " + B[Math.floor(r() * B.length)];
}
/* frame at arc length s: position, tangent (unit), right (unit), curvature */
export function frame(T, s) {
  const P = T.P, i = Math.max(0, Math.min(P.length - 2, Math.floor(s))), f = Math.max(0, Math.min(1, s - i)), a = P[i], b = P[i + 1];
  const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, z = a.z + (b.z - a.z) * f;
  const h = a.h + (b.h - a.h) * f, tx = Math.sin(h), tz = Math.cos(h);
  return { x, y, z, h, tx, tz, rx: tz, rz: -tx, k: a.k + (b.k - a.k) * f, slope: b.y - a.y };
}
export function world(T, s, d) { const F = frame(T, s); return { x: F.x + F.rx * d, y: F.y, z: F.z + F.rz * d, h: F.h }; }
export const CAMPAIGN = [11, 23, 37, 52, 68, 81, 97, 113, 131, 149, 167, 191].map((seed, i) => ({ seed, level: 1 + Math.floor(i * 0.9) }));
