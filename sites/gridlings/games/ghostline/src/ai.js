/* ===== the clone =====
   A policy is a lateral target and a brake flag per 2-metre bucket along the
   track. It starts from the racing line (hug the inside of every bend, brake
   before the sharp ones), learns from the player's best run (the player's
   lateral position and braking become the targets), and improves by hill
   climbing: mutate a stretch, re-simulate, keep it if the lap got faster.
   Nothing here reads anything the player cannot see. */
import { fresh, step, run, CAR, holdSpeed } from "./physics.js";
export const BUCKET = 2;
export function baseline(T) {
  const n = Math.ceil(T.length / BUCKET) + 1, target = new Float32Array(n), brake = new Uint8Array(n);
  const lim = T.width / 2 - 1.2;
  for (let i = 0; i < n; i++) {
    const s = i * BUCKET, P = T.P[Math.min(T.P.length - 1, Math.round(s))];
    /* look ahead 30 m for curvature: aim for the inside, brake when the bend is tight */
    let k = 0; for (let j = 0; j < 30; j++) { const q = T.P[Math.min(T.P.length - 1, Math.round(s) + j)]; if (Math.abs(q.k) > Math.abs(k)) k = q.k; }
    /* inside of the bend: the road rotates the car toward -sign(k)·d, so the
       inside is +sign(k)·d (the diagnostic run had this inverted: 14 walls) */
    target[i] = Math.sign(k) * Math.min(lim * 0.5, Math.abs(k) * 50) * (Math.abs(k) > 0.008 ? 1 : 0);
    /* brake on the approach to a tight bend; the floor speed carries the car through */
    brake[i] = Math.abs(k) > 1 / 60 ? 1 : 0;
  }
  return { target, brake };
}
export function driverFor(pol) {
  return (T, c) => {
    const i = Math.min(pol.target.length - 1, Math.floor(c.s / BUCKET)), tgt = pol.target[i];
    const P = T.P[Math.min(T.P.length - 1, Math.floor(c.s) + 6)], ff = P.k * c.v / (CAR.steer / (1 + Math.pow(c.v / CAR.vmax, 2) * 2.2));   /* feed-forward: hold the bend */
    const steer = Math.max(-1, Math.min(1, ff + (tgt - c.d) * 0.22 - c.h * 1.6));
    /* a brake flag means "manage speed here": brake only while faster than the
       bend ahead can be held -- braking to the floor was slower than the wall */
    let brake = false;
    if (pol.brake[i] === 1) { let k = 0; const s0 = Math.floor(c.s); for (let j = 0; j < 28; j++) { const q = T.P[Math.min(T.P.length - 1, s0 + j)]; if (Math.abs(q.k) > k) k = Math.abs(q.k); } brake = c.v > holdSpeed(k) + 1.5; }
    return { steer, brake };
  };
}
export function simulate(T, pol) { return run(T, driverFor(pol)); }
/* the player's run becomes a policy */
export function learn(T, samples) {
  const pol = baseline(T);
  for (const smp of samples) { const i = Math.min(pol.target.length - 1, Math.floor(smp.s / BUCKET)); pol.target[i] = smp.d; pol.brake[i] = smp.brake ? 1 : 0; }
  return pol;
}
export function optimize(T, pol, iters, seedRng) {
  const r = seedRng || Math.random;
  let best = { target: Float32Array.from(pol.target), brake: Uint8Array.from(pol.brake) };
  let bestRun = simulate(T, best), bestT = bestRun.done ? bestRun.t : 1e9;
  const lim = T.width / 2 - 1.2;
  for (let it = 0; it < iters; it++) {
    const cand = { target: Float32Array.from(best.target), brake: Uint8Array.from(best.brake) };
    const a = Math.floor(r() * cand.target.length), w = 3 + Math.floor(r() * 12), kind = r();
    for (let i = a; i < Math.min(cand.target.length, a + w); i++) {
      if (kind < 0.6) cand.target[i] = Math.max(-lim, Math.min(lim, cand.target[i] + (r() - 0.5) * 3));
      else cand.brake[i] = r() < 0.5 ? 0 : 1;
    }
    const res = simulate(T, cand);
    if (res.done && res.t < bestT) { best = cand; bestT = res.t; bestRun = res; }
  }
  return { pol: best, t: bestT, run: bestRun };
}
/* medal lines come from the optimiser, never from a hand-typed number */
export function medals(refT) { return { gold: refT * 1.02, silver: refT * 1.10, bronze: refT * 1.25 }; }
