/* ===== the world: bright low-poly, saturated, tile-friendly =====
   Road ribbon + kerbs + barriers built from the track samples, checkpoint
   arches, a finish gate, instanced trees and rocks kept off the road, a chase
   camera with speed FOV, and three cars: yours, the clone's ghost and your own best lap. */
import * as THREE from "three";
import { frame, world } from "./track.js";

export const SKY = 0x7fd0ff, GROUND = 0x79c15a, ROAD = 0x3a3f4a;
export const CARS = [
  { id: "ion", name: "ION", col: 0xff3fa4, req: 0 }, { id: "volt", name: "VOLT", col: 0x39f2ff, req: 3 }, { id: "solar", name: "SOLAR", col: 0xffcc57, req: 8 },
  { id: "lime", name: "LIME", col: 0xa6ff3f, req: 14 }, { id: "ember", name: "EMBER", col: 0xff6a3d, req: 20 }, { id: "onyx", name: "ONYX", col: 0x1b1f2e, req: 28 }
];
function wedge(w, h, len, hFront) {
  /* a tapered body: full height at the back, hFront at the nose */
  const g = new THREE.BufferGeometry(), x = w / 2, zb = -len / 2, zf = len / 2;
  const v = [
    -x, 0, zb, x, 0, zb, x, h, zb, -x, h, zb,             /* back */
    -x, 0, zf, x, 0, zf, x, hFront, zf, -x, hFront, zf     /* front */
  ];
  const idx = [0, 2, 1, 0, 3, 2,  4, 5, 6, 4, 6, 7,  0, 1, 5, 0, 5, 4,  3, 7, 6, 3, 6, 2,  0, 4, 7, 0, 7, 3,  1, 2, 6, 1, 6, 5];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
let _blobTex = null;
function blobTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(0,0,0,.78)"); g.addColorStop(.5, "rgba(0,0,0,.46)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  _blobTex = new THREE.CanvasTexture(c); return _blobTex;
}
function blobMaterial() { return new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }); }
function carMesh(col, ghost) {
  const g = new THREE.Group(), op = ghost ? .42 : 1;
  const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: .35, metalness: .3, flatShading: true, transparent: ghost, opacity: op, depthWrite: !ghost });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: .8, flatShading: true, transparent: ghost, opacity: ghost ? .3 : 1, depthWrite: !ghost });
  const rim = new THREE.MeshStandardMaterial({ color: 0xd8dde8, roughness: .3, metalness: .8, flatShading: true, transparent: ghost, opacity: ghost ? .3 : 1, depthWrite: !ghost });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1c2b3d, roughness: .12, metalness: .55, transparent: ghost, opacity: ghost ? .3 : 1, depthWrite: !ghost });
  const body = new THREE.Mesh(wedge(1.9, 0.6, 3.9, 0.36), bodyMat); body.position.y = 0.32; g.add(body);
  const cabin = new THREE.Mesh(wedge(1.5, 0.5, 2.0, 0.3), glass); cabin.position.set(0, 0.86, -0.35); g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.08, 1.0), bodyMat); roof.position.set(0, 1.36, -0.6); g.add(roof);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 1.1), dark); hood.position.set(0, 0.65, 1.1); g.add(hood);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.5), dark); wing.position.set(0, 1.15, -1.95); g.add(wing);
  [-0.8, 0.8].forEach(sx => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.3), dark); post.position.set(sx, 0.98, -1.9); g.add(post); });
  [[-1, 1.25], [1, 1.25], [-1, -1.3], [1, -1.3]].forEach(([sx, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.38, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.98, 0.42, z); g.add(w);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.4, 6), rim); r.rotation.z = Math.PI / 2; r.position.set(sx * 0.98, 0.42, z); g.add(r);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: ghost ? 0x39f2ff : 0xff2a2a })); tail.position.set(0, 0.7, -1.96); g.add(tail);
  [-0.6, 0.6].forEach(sx => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), new THREE.MeshBasicMaterial({ color: ghost ? 0x39f2ff : 0xfff6c8 })); h.position.set(sx, 0.55, 1.96); g.add(h); });
  if (!ghost) {
    /* a painted contact shadow: identical on every GPU, and it costs no depth pass */
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 6.0), blobMaterial());
    sh.rotation.x = -Math.PI / 2; sh.position.set(0.35, 0.02, -0.25); sh.renderOrder = 2; g.add(sh);
  }
  g.userData.bodyMat = bodyMat;
  return g;
}
export function makeScene(canvas) {
  /* Is there a GPU behind this context at all? A headless reviewer box, a locked-down
     office machine and a cheap phone all fall back to a software rasterizer, where
     multisampling is priced per pixel per sample and costs whole frames. The only way
     to know is to ask a context, so ask a throwaway 1x1 one before building the real
     renderer — antialias cannot be turned off after creation. */
  const soft = (() => {
    try {
      const g = document.createElement("canvas").getContext("webgl");
      const ext = g && g.getExtension("WEBGL_debug_renderer_info");
      const name = ext ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "") : "";
      return /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(name);
    } catch (e) { return false; }
  })();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !soft, powerPreference: "high-performance" });
  renderer.setClearColor(SKY, 1); renderer.shadowMap.enabled = false;   /* contact-shadow decals instead: a depth pass blurs out under software WebGL and costs real frames on phones */
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xa9dcff, 140, 520);
  const cam = new THREE.PerspectiveCamera(62, 1, 0.5, 1200);
  scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x3f7a2a, 0.9));
  /* the sun only lights the scene; every shadow in the game is a painted decal */
  const sun = new THREE.DirectionalLight(0xfff1cf, 1.9); sun.position.set(60, 110, 30);
  scene.add(sun); scene.add(sun.target);
  /* sky dome with a vertical gradient (vertex colours on an inside-out sphere) */
  const skyGeo = new THREE.SphereGeometry(1000, 24, 12), skyCol = new Float32Array(skyGeo.attributes.position.count * 3), top = new THREE.Color(0x3f9fe8), mid = new THREE.Color(0x8fd6ff), bot = new THREE.Color(0xdff4ff);
  for (let i = 0; i < skyGeo.attributes.position.count; i++) { const y = skyGeo.attributes.position.getY(i) / 1000, c = y > 0 ? mid.clone().lerp(top, Math.min(1, y * 1.6)) : mid.clone().lerp(bot, Math.min(1, -y * 3)); skyCol.set([c.r, c.g, c.b], i * 3); }
  skyGeo.setAttribute("color", new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); scene.add(sky);
  /* low-poly terrain: rolling hills away from the road, flat where the road is */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 96, 96), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; scene.add(ground);
  /* clouds */
  const clouds = new THREE.Group(), cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: .75, roughness: 1, fog: false });
  for (let i = 0; i < 14; i++) { const c = new THREE.Group(); const n = 3 + (i % 3); for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(9 + (k * 7 % 9), 12, 8), cloudMat); b.position.set(k * 11 - n * 5, (k % 2) * 3, (k * 5) % 7); b.scale.y = .62; c.add(b); }
    const a = i / 14 * Math.PI * 2 + 0.3; c.position.set(Math.cos(a) * (300 + (i % 4) * 90), 110 + (i * 13 % 50), Math.sin(a) * (300 + (i % 4) * 90)); clouds.add(c); }
  scene.add(clouds);
  /* horizon: a ring of low mountains */
  const mts = new THREE.Group(); for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 700 + (i % 3) * 80, h = 90 + (i * 37 % 60); const m = new THREE.Mesh(new THREE.ConeGeometry(120 + (i * 53 % 80), h, 5), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x5aa0d8 : 0x4d8fc9, flatShading: true })); m.position.set(Math.cos(a) * r, h / 2 - 40, Math.sin(a) * r); mts.add(m); } scene.add(mts);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(46, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false })); sunDisc.position.set(420, 360, -620); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);
  const glare = new THREE.Mesh(new THREE.CircleGeometry(110, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: .18, fog: false })); glare.position.copy(sunDisc.position); glare.lookAt(0, 0, 0); scene.add(glare);

  const trackGroup = new THREE.Group(); scene.add(trackGroup);
  const car = carMesh(CARS[0].col, false); scene.add(car);
  const ghost = carMesh(0x39f2ff, true); scene.add(ghost);
  const pbGhost = carMesh(0xffd166, true); pbGhost.visible = false; scene.add(pbGhost);   /* your own best lap, running beside you */
  /* drift smoke */
  const PN = 80, pPos = new Float32Array(PN * 3), pLife = new Float32Array(PN), pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const smoke = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: .7 })); scene.add(smoke);
  let T = null, st = { W: 1, H: 1, fov: 62 };
  const camPos = new THREE.Vector3(0, 6, -10), camLook = new THREE.Vector3();

  function ribbon(T, offL, offR, yOff, colorFn, yOff2 = yOff) {
    const P = T.P, n = P.length, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3), idx = [];
    for (let i = 0; i < n; i++) {
      const F = frame(T, i), c = colorFn(i);
      pos.set([F.x + F.rx * offL, F.y + yOff, F.z + F.rz * offL, F.x + F.rx * offR, F.y + yOff2, F.z + F.rz * offR], i * 6);
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
      if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide })); return m;
  }
  function shapeTerrain(T) {
    /* heights from layered sine noise, pressed flat within ~14 m of the road */
    const g = ground.geometry, pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
    const c1 = new THREE.Color(0x6db54c), c2 = new THREE.Color(0x8ccb5e), c3 = new THREE.Color(0xb7c95a), c4 = new THREE.Color(0x9aa0a6);
    const samples = []; for (let i = 0; i < T.P.length; i += 4) samples.push(T.P[i]);
    /* keep the run-off flat beyond both ends too, so no hill or pit sits right behind the start line */
    const s0 = frame(T, 0), s1 = frame(T, T.P.length - 1);
    for (let m = 4; m <= 120; m += 4) { samples.push({ x: s0.x - s0.tx * m, z: s0.z - s0.tz * m }); samples.push({ x: s1.x + s1.tx * m, z: s1.z + s1.tz * m }); }
    /* centre the terrain on the track */
    let cx = 0, cz = 0; for (const p of samples) { cx += p.x; cz += p.z; } cx /= samples.length; cz /= samples.length; ground.position.x = cx; ground.position.z = cz;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i) + cx, z = -pos.getY(i) + cz;              /* plane is rotated: local y -> world -z */
      let d2 = 1e9; for (const p of samples) { const dx = p.x - x, dz = p.z - z, q = dx * dx + dz * dz; if (q < d2) d2 = q; }
      const d = Math.sqrt(d2), k = Math.max(0, Math.min(1, (d - 14) / 40));
      const h = (Math.sin(x * 0.045) * Math.cos(z * 0.038) * 6 + Math.sin(x * 0.11 + z * 0.07) * 2.5 + Math.sin(z * 0.19) * 1.2) * k + (k > 0 ? 0 : 0);
      pos.setZ(i, h);
      const t = Math.max(0, Math.min(1, (h + 4) / 12)), c = t < .5 ? c1.clone().lerp(c2, t * 2) : c2.clone().lerp(t > .85 ? c4 : c3, (t - .5) * 2);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); pos.needsUpdate = true; g.computeVertexNormals();
  }
  function setTrack(track, seed) {
    T = track; while (trackGroup.children.length) trackGroup.remove(trackGroup.children[0]);
    const w = T.width / 2, road = new THREE.Color(ROAD), roadL = new THREE.Color(0x454b58), red = new THREE.Color(0xe63946), white = new THREE.Color(0xf4f4f4), wall = new THREE.Color(0x1f2333);
    trackGroup.add(ribbon(T, -w, w, 0, i => (Math.floor(i / 6) % 2 ? road : roadL)));
    const dash = new THREE.Color(0xf2f2f2); trackGroup.add(ribbon(T, -0.12, 0.12, 0.03, i => (Math.floor(i / 6) % 2 ? dash : road)));   /* centre dashes */
    shapeTerrain(T);
    trackGroup.add(ribbon(T, -w - 0.7, -w, 0.12, i => (Math.floor(i / 3) % 2 ? red : white)));
    trackGroup.add(ribbon(T, w, w + 0.7, 0.12, i => (Math.floor(i / 3) % 2 ? red : white)));
    /* tarmac aprons before the start and after the finish: the road must not end at a cliff edge */
    [[frame(T, 0), -1], [frame(T, T.P.length - 1), 1]].forEach(([F, dir]) => {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(T.width, 34), new THREE.MeshStandardMaterial({ color: ROAD, roughness: .9 }));
      a.rotation.x = -Math.PI / 2; a.rotation.z = -F.h; a.rotation.order = "ZXY"; a.position.set(F.x + F.tx * dir * 17, F.y - 0.005, F.z + F.tz * dir * 17); trackGroup.add(a); });
    /* walls stand up as vertical strips: a flat dark ribbon seen edge-on aliased into a sawtooth */
    trackGroup.add(ribbon(T, -w - 0.6, -w - 0.6, 0, () => wall, 0.8)); trackGroup.add(ribbon(T, w + 0.6, w + 0.6, 0, () => wall, 0.8));
    /* start line, checkpoints, finish */
    const arch = (s, colr, banner) => {
      const F = frame(T, s), g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: colr, flatShading: true });
      /* the gantry rides high: at 5 m it filled a third of the frame every time you drove under it */
      const H = 7.4;
      [-1, 1].forEach(side => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, 0.5), m); p.position.set(side * (w + 1.2), H / 2, 0); g.add(p); });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(T.width + 3, 0.45, 0.5), banner ? new THREE.MeshStandardMaterial({ color: 0x111111 }) : m); bar.position.y = H; g.add(bar);
      if (banner) for (let i = 0; i < 8; i++) { const q = new THREE.Mesh(new THREE.BoxGeometry((T.width + 3) / 8, 0.45, 0.52), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0x111111 })); q.position.set(-(T.width + 3) / 2 + (i + 0.5) * (T.width + 3) / 8, H, 0); g.add(q); }
      g.position.set(F.x, F.y, F.z); g.rotation.y = F.h; trackGroup.add(g);
    };
    T.cps.forEach(s => arch(s, 0x39f2ff, false)); arch(T.length - 1, 0xffcc57, true); arch(6, 0xffcc57, true);
    /* rhythm posts every ~24 m on both shoulders: the cheapest and strongest speed cue in a racing game */
    const postGeo = new THREE.BoxGeometry(0.16, 1.05, 0.16), postMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: .85, flatShading: true }), postRed = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: .85, flatShading: true });
    const posts = new THREE.InstancedMesh(postGeo, postMat, 260), postCaps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), postRed, 260);
    { const M2 = new THREE.Matrix4(), Q2 = new THREE.Quaternion(), V2 = new THREE.Vector3(), S2 = new THREE.Vector3(1, 1, 1); let pi = 0;
      for (let i = 6; i < T.P.length - 6 && pi < 258; i += 12) { const F = frame(T, i);
        for (const side of [-1, 1]) { if (pi >= 258) break;
          Q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), F.h);
          M2.compose(V2.set(F.x + F.rx * side * (w + 1.5), F.y + 0.52, F.z + F.rz * side * (w + 1.5)), Q2, S2); posts.setMatrixAt(pi, M2);
          M2.compose(V2.set(F.x + F.rx * side * (w + 1.5), F.y + 0.98, F.z + F.rz * side * (w + 1.5)), Q2, S2); postCaps.setMatrixAt(pi, M2); pi++; } }
      posts.count = postCaps.count = pi; posts.instanceMatrix.needsUpdate = postCaps.instanceMatrix.needsUpdate = true; }
    trackGroup.add(posts); trackGroup.add(postCaps);
    /* trackside props where the bends are: tyre stacks and sponsor banners */
    const tyreGeo = new THREE.TorusGeometry(0.55, 0.22, 6, 10), tyreMat = new THREE.MeshStandardMaterial({ color: 0x1d2027, roughness: .9, flatShading: true }), tyreTop = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: .9, flatShading: true });
    const bannerMats = [["#39f2ff", "#0b2a44", "GHOSTLINE"], ["#ff3fa4", "#2a0b1e", "DRIFT"], ["#ffcc57", "#3a2a00", "TIME TRIAL"], ["#a6ff3f", "#123300", "PIT"]].map(([bg, fg, txt]) => {
      const c = document.createElement("canvas"); c.width = 768; c.height = 192; const x = c.getContext("2d");
      x.fillStyle = bg; x.fillRect(0, 0, 768, 192); x.fillStyle = fg;
      for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(i * 160, 0); x.lineTo(i * 160 + 40, 0); x.lineTo(i * 160 + 40 + 60, 192); x.lineTo(i * 160 + 60, 192); x.closePath(); x.globalAlpha = .18; x.fill(); }
      x.globalAlpha = 1; x.fillStyle = fg; x.fillRect(0, 0, 768, 14); x.fillRect(0, 178, 768, 14);
      x.font = "bold 118px 'Racing Sans One', Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, 384, 100);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: .8 }); });
    let lastProp = -100;
    for (let i = 20; i < T.P.length - 20; i += 4) {
      const k = Math.abs(T.P[i].k); if (k < 1 / 40 || i - lastProp < 26) continue; lastProp = i;
      const F = frame(T, i), side = -Math.sign(T.P[i].k) || 1;   /* on the outside of the bend, where you would hit them */
      for (let n = 0; n < 3; n++) { const t = new THREE.Mesh(tyreGeo, n === 2 ? tyreTop : tyreMat); t.rotation.x = Math.PI / 2; t.position.set(F.x + F.rx * side * (w + 2.2), F.y + 0.22 + n * 0.44, F.z + F.rz * side * (w + 2.2)); t.castShadow = false; trackGroup.add(t); }
      if ((i / 4) % 2 === 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 0.12), bannerMats[(i / 4) % bannerMats.length]); b.position.set(F.x + F.rx * side * (w + 7.5), F.y + 1.4, F.z + F.rz * side * (w + 7.5)); b.rotation.y = F.h; trackGroup.add(b);
        [-2.8, 2.8].forEach(o => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), tyreMat); p.position.set(b.position.x + Math.cos(F.h) * o, F.y + 1.1, b.position.z - Math.sin(F.h) * o); trackGroup.add(p); }); }
    }
    /* scenery: trees and rocks, never on the road */
    const r = seedRng(seed), treeGeo = new THREE.ConeGeometry(2.4, 6.5, 6), tier2Geo = new THREE.ConeGeometry(1.7, 4.2, 6), trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2, 5), rockGeo = new THREE.DodecahedronGeometry(1.4, 0);
    const tree = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x2f8f52, flatShading: true }), 220), tier2 = new THREE.InstancedMesh(tier2Geo, new THREE.MeshStandardMaterial({ color: 0x45b56a, flatShading: true }), 220), trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true }), 220), rock = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x8a97a8, flatShading: true }), 80);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3();
    /* one instanced decal per tree and rock: what actually sells the ground plane is contact, not a depth pass */
    const blobGeo = new THREE.PlaneGeometry(1, 1), blob = new THREE.InstancedMesh(blobGeo, blobMaterial(), 300);
    blob.renderOrder = 1; trackGroup.add(blob); let bi = 0;
    const putBlob = (x, y, z, r) => { if (bi >= 300) return; M.compose(V.set(x + r * .45, y + 0.03, z + r * .22), Q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), S3.set(r * 2.6, r * 2.6, 1)); blob.setMatrixAt(bi++, M); };
    const offRoad = (x, z) => { for (let i = 0; i < T.P.length; i += 3) { const p = T.P[i]; if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < (w + 5) * (w + 5)) return false; } return true; };
    let ti = 0, ri = 0;
    for (let k = 0; k < 600 && (ti < 220 || ri < 80); k++) {
      const s = Math.floor(r() * T.length), F = frame(T, s), side = r() < .5 ? -1 : 1, dist = w + 6 + (s < 40 ? 16 : 0) + r() * 34, x = F.x + F.rx * side * dist   /* keep the opening view clear: nothing tall casts across the start straight */, z = F.z + F.rz * side * dist;
      if (!offRoad(x, z)) continue;
      if (ti < 220 && r() < .75) { const sc = 0.8 + r() * 0.9; M.compose(V.set(x, F.y - 0.6 + 3.25 * sc + 1, z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), S3.set(sc, sc, sc)); tree.setMatrixAt(ti, M);
        M.compose(V.set(x, F.y - 0.6 + 3.25 * sc + 1 + 2.6 * sc, z), Q, S3.set(sc, sc, sc)); tier2.setMatrixAt(ti, M);
        M.compose(V.set(x, F.y - 0.6 + 1, z), Q, S3.set(1, sc, 1)); trunk.setMatrixAt(ti, M); putBlob(x, F.y - 0.6, z, 1.5 * sc); ti++; }
      else if (ri < 80) { const sc = 0.6 + r() * 1.4; M.compose(V.set(x, F.y - 0.6 + 0.6 * sc, z), Q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), r() * 6), S3.set(sc, sc * 0.7, sc)); rock.setMatrixAt(ri, M); putBlob(x, F.y - 0.6, z, 0.9 * sc); ri++; }
    }
    blob.count = bi; blob.instanceMatrix.needsUpdate = true; tree.count = ti; tier2.count = ti; trunk.count = ti; rock.count = ri; trackGroup.add(tree); trackGroup.add(tier2); trackGroup.add(trunk); trackGroup.add(rock);
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
    const W = canvas.clientWidth || 300, H = canvas.clientHeight || 300;
    /* honour low mode here too: resize used to recompute the ratio from scratch, so any
       orientation change handed a struggling device its full pixel count back.
       Low mode caps the BACKING STORE, not just the ratio: without a GPU this game is
       fill-rate bound, so halving the width is worth four times more than any change to
       the scene. CSS still stretches it to the full canvas, so the layout is unchanged. */
    const dpr = low ? Math.min(1, 640 / Math.max(1, W)) : Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); st.W = W; st.H = H;
  }
  /* start low when there is no GPU rather than discovering it three seconds in */
  window.__dbg = { scene, car, sun, trackGroup }; let smokeAcc = 0, slowT = 0, aliveT = 0, low = soft;
  function tick(dt, me, gh, pb, opts) {
    if (!T) return;
    /* a device that cannot hold the frame gets a lower pixel ratio, not a slideshow */
    /* 0.6s, not 3s: three seconds of slideshow is most of a first impression, and all of
       the window a portal's archive analysis watches before it records a loading time.
       The first 1.5s are exempt, because three compiles a shader the first time each
       material is drawn — those frames are slow on hardware that is in fact fine, and
       latching a good GPU into 640px over its warmup would be a worse bug than the one
       this fixes. A machine with no GPU never waits for this: `soft` starts it low. */
    aliveT += dt;
    if (aliveT > 1.5 && dt > 0.045) { slowT += dt; if (slowT > 0.6 && !low) { low = true; resize(); } } else slowT = Math.max(0, slowT - dt * 0.5);
    placeCar(car, me, T); ghost.visible = !!gh && !gh.done; if (gh) placeCar(ghost, gh, T);
    pbGhost.visible = !!pb && !pb.done; if (pb) placeCar(pbGhost, pb, T);
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
