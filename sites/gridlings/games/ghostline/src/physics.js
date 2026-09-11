/* ===== arcade car in track space =====
   State: s (metres along the centreline), d (lateral, + = right), h (heading
   relative to the track tangent, radians), v (speed along the heading).
   Track space makes the barriers a clamp on d and lets the verifier and the
   AI run the exact same simulation headlessly. */
export const CAR = { vmax: 46, accel: 14, brake: 22, vmin: 17, drag: 0.30, steer: 2.4, grip: 0.9, driftGrip: 0.3, wallLoss: 0.3 };
export function fresh() { return { s: 0, d: 0, h: 0, v: 0, t: 0, cp: 0, splits: [], done: false, walls: 0, drift: 0 }; }
export function step(T, c, inp, dt) {
  if (c.done) return null;
  const F = T.P[Math.min(T.P.length - 1, Math.floor(c.s))];
  const brake = !!inp.brake, steer = Math.max(-1, Math.min(1, inp.steer || 0));
  /* throttle is automatic: the game is about the line, not the pedal */
  const slopePush = -F.slope * 9;                                   /* hills cost and give speed */
  /* the brake scrubs speed down to a cornering floor, never to a stop: a
     stalled car is a dead game */
  const braking = brake && c.v > CAR.vmin;
  c.v += ((braking ? -CAR.brake : brake ? 0 : CAR.accel) - CAR.drag * c.v * (c.v / CAR.vmax) + slopePush) * dt;
  c.v = Math.max(brake ? 0 : 2, Math.min(CAR.vmax * 1.05, c.v));
  /* steering authority falls off a little with speed; braking loosens the grip
     so the car can be thrown into a corner (the drift) */
  /* authority collapses with speed squared: full speed holds only gentle
     bends, so a tight one has to be braked for -- that is the whole game */
  /* ...and a braked slide rotates the car faster than grip steering can:
     brake-tap into the bend is the skill move, and it beats the wall */
  const auth = (1 / (1 + Math.pow(c.v / CAR.vmax, 2) * 2.2)) * (c.drift > 0 ? 1.6 : 1);
  c.h += steer * CAR.steer * auth * dt;
  /* the road turns under the car: a bend of curvature k rotates the tangent by
     k per metre, so a car holding its world heading drifts to the outside.
     THIS is what makes a corner a corner -- at speed the steering authority
     cannot keep up with a tight bend, and the brake is the answer. */
  const inner0 = Math.max(0.55, 1 - c.d * F.k);
  c.h -= F.k * c.v * Math.cos(c.h) * dt / inner0;
  const grip = brake && Math.abs(c.h) > 0.12 ? CAR.driftGrip : CAR.grip;
  c.h -= c.h * grip * dt;                                            /* tyre self-alignment, mild */
  c.h = Math.max(-1.2, Math.min(1.2, c.h));
  c.drift = brake && Math.abs(c.h) > 0.18 && c.v > 12 ? 1 : Math.max(0, c.drift - dt * 4);
  /* advance: inner side of a bend is shorter than the centreline */
  const inner = Math.max(0.55, 1 - c.d * F.k);
  c.s += c.v * Math.cos(c.h) * dt / inner;
  c.d += c.v * Math.sin(c.h) * dt;
  const lim = T.width / 2 - 0.9;
  let hit = false;
  /* a wall is never a free brake: the impact takes most of the speed, and
     leaning on the barrier keeps scrubbing it */
  if (c.d > lim) { c.d = lim; if (c.h > 0.02) { c.h = -c.h * 0.25; c.v *= CAR.wallLoss; hit = true; } else if (c.h > 0) c.v *= 1 - 4 * dt; }
  else if (c.d < -lim) { c.d = -lim; if (c.h < -0.02) { c.h = -c.h * 0.25; c.v *= CAR.wallLoss; hit = true; } else if (c.h < 0) c.v *= 1 - 4 * dt; }
  if (hit) c.walls++;
  c.t += dt;
  let ev = hit ? { type: "wall" } : null;
  if (c.cp < T.cps.length && c.s >= T.cps[c.cp]) { c.splits.push(c.t); c.cp++; ev = { type: "cp", i: c.cp, t: c.t }; }
  if (c.s >= T.length) { c.done = true; c.s = T.length; ev = { type: "finish", t: c.t }; }
  return ev;
}
/* the fastest speed at which steering can still hold a bend of curvature k */
export function holdSpeed(k) {
  k = Math.abs(k); if (k < 1e-4) return CAR.vmax * 1.05;
  for (let v = CAR.vmax; v > CAR.vmin; v -= 1) if (v * k * (1 + 2.2 * Math.pow(v / CAR.vmax, 2)) <= CAR.steer * 0.9) return v;
  return CAR.vmin;
}
export function run(T, driver, dt, maxT) {
  const c = fresh(); dt = dt || 1 / 60; maxT = maxT || 240;
  while (!c.done && c.t < maxT) step(T, c, driver(T, c), dt);
  return c;
}
