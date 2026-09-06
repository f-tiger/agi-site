/* ===== the world: bright low-poly, saturated, tile-friendly =====
   Road ribbon + kerbs + barriers built from the track samples, checkpoint
   arches, a finish gate, instanced trees and rocks kept off the road, a chase
   camera with speed FOV, and two cars: yours and the clone's ghost. */
import * as THREE from "three";
import { frame, world } from "./track.js";

export const SKY = 0x7fd0ff, GROUND = 0x79c15a, ROAD = 0x3a3f4a;
export const CARS = [
  { id: "ion", name: "ION", col: 0xff3fa4, req: 0 }, { id: "volt", name: "VOLT", col: 0x39f2ff, req: 3 }, { id: "solar", name: "SOLAR", col: 0xffcc57, req: 8 },
  { id: "lime", name: "LIME", col: 0xa6ff3f, req: 14 }, { id: "ember", name: "EMBER", col: 0xff6a3d, req: 20 }, { id: "onyx", name: "ONYX", col: 0x1b1f2e, req: 28 }
];
function carMesh(col, ghost) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: .45, metalness: .25, flatShading: true, transparent: ghost, opacity: ghost ? .4 : 1, depthWrite: !ghost });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d28, roughness: .7, flatShading: true, transparent: ghost, opacity: ghost ? .3 : 1, depthWrite: !ghost });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, roughness: .2, metalness: .6, transparent: true, opacity: ghost ? .3 : .85, depthWrite: !ghost });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 3.8), bodyMat); body.position.y = 0.55; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 1.0), bodyMat); nose.position.set(0, 0.42, 2.2); g.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.7), glass); cabin.position.set(0, 1.05, -0.2); g.add(cabin);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.5), dark); wing.position.set(0, 1.15, -1.9); g.add(wing);
  [[-1, 1.2], [1, 1.2], [-1, -1.3], [1, -1.3]].forEach(([sx, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.4, 10), dark); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.95, 0.42, z); g.add(w); });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: ghost ? 0x39f2ff : 0xff2a2a })); lamp.position.set(0, 0.6, -1.92); g.add(lamp);
  g.userData.bodyMat = bodyMat;
  return g;
}
export function makeScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(SKY, 1);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(SKY, 120, 420);
  const cam = new THREE.PerspectiveCamera(62, 1, 0.5, 900);
  scene.add(new THREE.HemisphereLight(0xdff4ff, 0x4a7a2a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.4); sun.position.set(60, 120, 40); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; scene.add(ground);
  /* horizon: a ring of low mountains */
  const mts = new THREE.Group(); for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 700 + (i % 3) * 80, h = 90 + (i * 37 % 60); const m = new THREE.Mesh(new THREE.ConeGeometry(120 + (i * 53 % 80), h, 5), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x5aa0d8 : 0x4d8fc9, flatShading: true })); m.position.set(Math.cos(a) * r, h / 2 - 40, Math.sin(a) * r); mts.add(m); } scene.add(mts);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false })); sunDisc.position.set(300, 260, -500); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);

  const trackGroup = new THREE.Group(); scene.add(trackGroup);
  const car = carMesh(CARS[0].col, false); scene.add(car);
  const ghost = carMesh(0x39f2ff, true); scene.add(ghost);
  /* drift smoke */
  const PN = 80, pPos = new Float32Array(PN * 3), pLife = new Float32Array(PN), pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const smoke = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: .7 })); scene.add(smoke);
  let T = null, st = { W: 1, H: 1, fov: 62 };
  const camPos = new THREE.Vector3(0, 6, -10), camLook = new THREE.Vector3();

  function ribbon(T, offL, offR, yOff, colorFn) {
    const P = T.P, n = P.length, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3), idx = [];
    for (let i = 0; i < n; i++) {
      const F = frame(T, i), c = colorFn(i);
      pos.set([F.x + F.rx * offL, F.y + yOff, F.z + F.rz * offL, F.x + F.rx * offR, F.y + yOff, F.z + F.rz * offR], i * 6);
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
      if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide }));
  }
  function setTrack(track, seed) {
    T = track; while (trackGroup.children.length) trackGroup.remove(trackGroup.children[0]);
    const w = T.width / 2, road = new THREE.Color(ROAD), roadL = new THREE.Color(0x454b58), red = new THREE.Color(0xe63946), white = new THREE.Color(0xf4f4f4), wall = new THREE.Color(0x1f2333);
    trackGroup.add(ribbon(T, -w, w, 0, i => (Math.floor(i / 6) % 2 ? road : roadL)));
    trackGroup.add(ribbon(T, -w - 0.7, -w, 0.12, i => (Math.floor(i / 3) % 2 ? red : white)));
    trackGroup.add(ribbon(T, w, w + 0.7, 0.12, i => (Math.floor(i / 3) % 2 ? red : white)));
    trackGroup.add(ribbon(T, -w - 0.7, -w - 0.5, 0.75, () => wall)); trackGroup.add(ribbon(T, w + 0.5, w + 0.7, 0.75, () => wall));
    /* start line, checkpoints, finish */
    const arch = (s, colr, banner) => {
      const F = frame(T, s), g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: colr, flatShading: true });
      [-1, 1].forEach(side => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), m); p.position.set(side * (w + 1.2), 2.5, 0); g.add(p); });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(T.width + 3, 0.6, 0.6), banner ? new THREE.MeshStandardMaterial({ color: 0x111111 }) : m); bar.position.y = 5.2; g.add(bar);
      if (banner) for (let i = 0; i < 8; i++) { const q = new THREE.Mesh(new THREE.BoxGeometry((T.width + 3) / 8, 0.6, 0.62), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0x111111 })); q.position.set(-(T.width + 3) / 2 + (i + 0.5) * (T.width + 3) / 8, 5.2, 0); g.add(q); }
      g.position.set(F.x, F.y, F.z); g.rotation.y = F.h; trackGroup.add(g);
    };
    T.cps.forEach(s => arch(s, 0x39f2ff, false)); arch(T.length - 1, 0xffcc57, true); arch(6, 0xffcc57, true);
    /* scenery: trees and rocks, never on the road */
    const r = seedRng(seed), treeGeo = new THREE.ConeGeometry(2.2, 6, 6), trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2, 5), rockGeo = new THREE.DodecahedronGeometry(1.4, 0);
    const tree = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x2f9e5b, flatShading: true }), 220), trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true }), 220), rock = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x8a97a8, flatShading: true }), 80);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3();
    const offRoad = (x, z) => { for (let i = 0; i < T.P.length; i += 3) { const p = T.P[i]; if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < (w + 5) * (w + 5)) return false; } return true; };
    let ti = 0, ri = 0;
    for (let k = 0; k < 600 && (ti < 220 || ri < 80); k++) {
      const s = Math.floor(r() * T.length), F = frame(T, s), side = r() < .5 ? -1 : 1, dist = w + 6 + r() * 34, x = F.x + F.rx * side * dist, z = F.z + F.rz * side * dist;
      if (!offRoad(x, z)) continue;
      if (ti < 220 && r() < .75) { const sc = 0.8 + r() * 0.9; M.compose(V.set(x, F.y - 0.6 + 3 * sc + 1, z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), S3.set(sc, sc, sc)); tree.setMatrixAt(ti, M); M.compose(V.set(x, F.y - 0.6 + 1, z), Q, S3.set(1, sc, 1)); trunk.setMatrixAt(ti, M); ti++; }
      else if (ri < 80) { const sc = 0.6 + r() * 1.4; M.compose(V.set(x, F.y - 0.6 + 0.6 * sc, z), Q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), r() * 6), S3.set(sc, sc * 0.7, sc)); rock.setMatrixAt(ri, M); ri++; }
    }
    tree.count = ti; trunk.count = ti; rock.count = ri; trackGroup.add(tree); trackGroup.add(trunk); trackGroup.add(rock);
    ground.position.y = -0.6;
  }
  function seedRng(seed) { let a = (seed * 9301 + 49297) >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
  function placeCar(mesh, c, T) {
    const W = world(T, c.s, c.d), F = frame(T, c.s);
    mesh.position.set(W.x, W.y, W.z); mesh.rotation.set(Math.atan2(-F.slope, 1) * 0.6, F.h + c.h, 0);
    mesh.rotation.z = -c.h * 0.35;
  }
  function setCar(colorHex) { car.userData.bodyMat.color.setHex(colorHex); }
  function resize() {
    const W = canvas.clientWidth || 300, H = canvas.clientHeight || 300, dpr = Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); st.W = W; st.H = H;
  }
  let smokeAcc = 0, slowT = 0, low = false;
  function tick(dt, me, gh, opts) {
    if (!T) return;
    /* a device that cannot hold the frame gets a lower pixel ratio, not a slideshow */
    if (dt > 0.045) { slowT += dt; if (slowT > 3 && !low) { low = true; renderer.setPixelRatio(1); renderer.setSize(st.W, st.H, false); } } else slowT = Math.max(0, slowT - dt * 0.5);
    placeCar(car, me, T); ghost.visible = !!gh && !gh.done; if (gh) placeCar(ghost, gh, T);
    /* chase camera: behind and above, lagging a little, FOV opens with speed */
    const F = frame(T, me.s), back = 7.5 + me.v * 0.05, fx = Math.sin(F.h + me.h * 0.3), fz = Math.cos(F.h + me.h * 0.3);
    const target = new THREE.Vector3(car.position.x - fx * back, car.position.y + 3.3 + Math.max(0, -F.slope) * 6, car.position.z - fz * back);
    camPos.lerp(target, Math.min(1, dt * 6)); cam.position.copy(camPos);
    camLook.lerp(new THREE.Vector3(car.position.x + fx * 6, car.position.y + 1.2, car.position.z + fz * 6), Math.min(1, dt * 8)); cam.lookAt(camLook);
    const fov = 60 + (me.v / 46) * 18 + (opts && opts.finishKick ? 6 : 0); st.fov += (fov - st.fov) * Math.min(1, dt * 4); cam.fov = st.fov; cam.updateProjectionMatrix();
    /* drift smoke from the rear wheels */
    if (me.drift > 0 && me.v > 10) { smokeAcc += dt * 40; while (smokeAcc >= 1) { smokeAcc -= 1; for (let i = 0; i < PN; i++) if (pLife[i] <= 0) { const side = Math.random() < .5 ? -1 : 1; pPos[i * 3] = car.position.x - fx * 1.4 + Math.cos(F.h) * side * 0.9; pPos[i * 3 + 1] = car.position.y + 0.3; pPos[i * 3 + 2] = car.position.z - fz * 1.4 - Math.sin(F.h) * side * 0.9; pLife[i] = 0.7; break; } } }
    for (let i = 0; i < PN; i++) { if (pLife[i] <= 0) { pPos[i * 3 + 1] = -50; continue; } pLife[i] -= dt; pPos[i * 3 + 1] += dt * 1.2; }
    pGeo.attributes.position.needsUpdate = true; smoke.material.opacity = 0.6;
    renderer.render(scene, cam);
  }
  function snapCamera(me) { if (!T) return; placeCar(car, me, T); const F = frame(T, me.s); camPos.set(car.position.x - Math.sin(F.h) * 8, car.position.y + 3.3, car.position.z - Math.cos(F.h) * 8); camLook.set(car.position.x, car.position.y + 1, car.position.z); }
  resize();
  return { resize, setTrack, setCar, tick, snapCamera, renderer, CARS };
}
