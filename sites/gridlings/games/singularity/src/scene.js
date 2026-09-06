/* ===== the room: a low-poly isometric server hall =====
   Illustration vocabulary (new for this game, deliberately eye-free): a dark
   floor with a cyan grid, rack units that light up one per GPU bought, cube
   drones with an LED strip that hover in a ring (one per agent, capped for
   performance), and the model core in the middle: an icosahedron that grows
   with every trained tier, with a wireframe halo and a magenta ring. Neon reads
   as production value only with bloom, so bloom is on by default and dialled
   down on phones. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const CYAN = 0x39f2ff, MAGENTA = 0xff3fa4, GOLD = 0xffcc57, RACKS = 80, DRONES = 24;
const STAGE_BG = [0x070a14, 0x070a14, 0x08102a, 0x0b0f2e, 0x120a24];

export function makeScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x070a14, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070a14, 30, 52);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  cam.position.set(18, 16, 18); cam.lookAt(0, 0.6, 0);
  scene.add(new THREE.AmbientLight(0x3a4a6a, 0.9));
  const key = new THREE.DirectionalLight(0xdfe8ff, 1.1); key.position.set(-6, 12, 4); scene.add(key);
  const coreLight = new THREE.PointLight(CYAN, 6, 14, 1.6); coreLight.position.set(0, 2.2, 0); scene.add(coreLight);

  /* floor + grid */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x0c1226, roughness: .92, metalness: .1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(80, 80, 0x1b3a5a, 0x132a44); grid.position.y = 0.01; scene.add(grid);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), new THREE.MeshStandardMaterial({ color: 0x0f1a33, roughness: .8 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.02; scene.add(pad);
  const padRing = new THREE.Mesh(new THREE.RingGeometry(5.0, 5.2, 64), new THREE.MeshBasicMaterial({ color: MAGENTA, transparent: true, opacity: .55, side: THREE.DoubleSide }));
  padRing.rotation.x = -Math.PI / 2; padRing.position.y = 0.03; scene.add(padRing);

  /* racks: body + light strip, instanced */
  const rackGeo = new THREE.BoxGeometry(0.9, 1.7, 0.6), stripGeo = new THREE.BoxGeometry(1.0, 1.82, 0.7);
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x1a2340, roughness: .55, metalness: .5 });
  const stripMat = new THREE.MeshStandardMaterial({ color: 0x0b2b33, emissive: CYAN, emissiveIntensity: 1.6, transparent: true, opacity: 0.6, roughness: .2 });
  const racks = new THREE.InstancedMesh(rackGeo, rackMat, RACKS), strips = new THREE.InstancedMesh(stripGeo, stripMat, RACKS);
  const rackPos = [];
  for (let i = 0; i < RACKS; i++) {
    const k = i % 40, outer = i >= 40, row = k % 4, col = Math.floor(k / 4);   /* fill column by column so the room lights up front to back */
    const base = outer ? 10.6 : 6.6;
    const z = row < 2 ? -base - row * 1.7 : base + (row - 2) * 1.7, x = -9 + col * 2;
    rackPos.push([x, z, row < 2 ? 1 : -1, outer ? 2 : 1]);
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), SC = new THREE.Vector3();
  for (let i = 0; i < RACKS; i++) {
    const [x, z] = rackPos[i];
    M.compose(P.set(x, 0.85, z), Q.identity(), SC.set(0, 0, 0)); racks.setMatrixAt(i, M);
    M.compose(P.set(x, 0.85, z), Q.identity(), SC.set(0, 0, 0)); strips.setMatrixAt(i, M);
  }
  racks.instanceMatrix.needsUpdate = true; strips.instanceMatrix.needsUpdate = true;
  scene.add(racks); scene.add(strips);

  /* drones */
  const droneGeo = new THREE.BoxGeometry(0.5, 0.42, 0.5), ledGeo = new THREE.BoxGeometry(0.54, 0.08, 0.54);
  const droneMat = new THREE.MeshStandardMaterial({ color: 0x232c48, roughness: .4, metalness: .6 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1c, emissive: MAGENTA, emissiveIntensity: 2.6 });
  const drones = new THREE.InstancedMesh(droneGeo, droneMat, DRONES), leds = new THREE.InstancedMesh(ledGeo, ledMat, DRONES);
  scene.add(drones); scene.add(leds);

  /* core */
  /* the core must read as a faceted solid, not a blob: emissive stays under the
     bloom threshold on most facets, so the light does the shading and only the
     brightest facets and the halo bloom */
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x0e3a44, emissive: 0x18b8cc, emissiveIntensity: 0.55, roughness: .28, metalness: .35, flatShading: true });
  const coreEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 1)), new THREE.LineBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: .7 }));
  coreEdges.position.y = 2.2;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), coreMat); core.position.y = 2.2; scene.add(core); core.add(coreEdges); coreEdges.position.set(0, 0, 0);
  const halo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.45, 1)), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: .55 }));
  halo.position.y = 2.2; scene.add(halo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: MAGENTA }));
  ring.position.y = 2.2; ring.rotation.x = Math.PI / 2.4; scene.add(ring);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x1a2340, roughness: .6, metalness: .5 }));
  plinth.position.y = 0.25; scene.add(plinth);

  /* stage props: beams (datacenter), towers (campus), orbital ring (singularity) */
  const beams = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.6, 14, 12, 1, true), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false }));
    b.position.set(-10 + i * 4, 7, i % 2 ? -3 : 3); beams.add(b);
  }
  beams.visible = false; scene.add(beams);
  const towers = new THREE.Group();
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x141c38, roughness: .5, metalness: .6 }), winMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1c, emissive: MAGENTA, emissiveIntensity: 1.4 });
  [[-15, -14, 9], [15, -14, 7], [-15, 14, 6], [15, 14, 10]].forEach(([x, z, h]) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(3.2, h, 3.2), towerMat); t.position.set(x, h / 2, z); towers.add(t);
    for (let k = 0; k < Math.floor(h / 1.4); k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.18, 3.3), winMat); w.position.set(x, 0.9 + k * 1.4, z); towers.add(w); }
  });
  towers.visible = false; scene.add(towers);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.12, 8, 96), new THREE.MeshBasicMaterial({ color: GOLD }));
  orbit.position.y = 7.5; orbit.rotation.x = Math.PI / 2.15; orbit.visible = false; scene.add(orbit);
  const orbit2 = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.06, 8, 96), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: .6 }));
  orbit2.position.y = 8.2; orbit2.rotation.x = Math.PI / 1.9; orbit2.visible = false; scene.add(orbit2);

  /* click particles */
  const PN = 60, pPos = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN);
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: GOLD, size: 0.22, transparent: true, opacity: .95, sizeAttenuation: true }));
  scene.add(pts);

  /* flow: the lab visibly working. Coins rise from lit racks (rate follows
     revenue), data motes stream from the drones into the core (rate follows
     agents). Two pools, no allocation per frame. */
  const FN = 90;
  const fPos = new Float32Array(FN * 3), fVel = new Float32Array(FN * 3), fLife = new Float32Array(FN);
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));
  const coins = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: GOLD, size: 0.28, transparent: true, opacity: .9 })); scene.add(coins);
  const DN = 90;
  const dPos = new Float32Array(DN * 3), dVel = new Float32Array(DN * 3), dLife = new Float32Array(DN);
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  const motes = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0xff8ad0, size: 0.16, transparent: true, opacity: .85 })); scene.add(motes);
  let coinAcc = 0, moteAcc = 0;
  const dronePos = []; for (let i = 0; i < DRONES; i++) dronePos.push([0, -5, 0]);

  /* bloom */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.8);
  composer.addPass(bloom);

  /* core skins: the collectible. Each is a different solid and palette. */
  const SKIN = {
    core: { geo: () => new THREE.IcosahedronGeometry(1, 1), col: 0x0b2b33, em: CYAN, ring: MAGENTA },
    prism: { geo: () => new THREE.OctahedronGeometry(1.15, 0), col: 0x1a0b33, em: 0xb28cff, ring: CYAN },
    shard: { geo: () => new THREE.TetrahedronGeometry(1.3, 0), col: 0x33110b, em: 0xff7a3d, ring: GOLD },
    knot: { geo: () => new THREE.TorusKnotGeometry(0.7, 0.26, 96, 12), col: 0x0b3320, em: 0x5cff9d, ring: CYAN },
    sun: { geo: () => new THREE.SphereGeometry(1.05, 24, 24), col: 0x332a0b, em: GOLD, ring: 0xff7a3d },
    void: { geo: () => new THREE.IcosahedronGeometry(1, 2), col: 0x05060c, em: MAGENTA, ring: 0x5cff9d },
    halo: { geo: () => new THREE.IcosahedronGeometry(0.9, 1), col: 0x0b2b33, em: 0xffffff, ring: CYAN },
    apex: { geo: () => new THREE.DodecahedronGeometry(1.1, 0), col: 0x2b0b33, em: 0xff3fa4, ring: GOLD }
  };
  let skinId = "core", skinEm = CYAN;
  function setSkin(id) {
    const k = SKIN[id] || SKIN.core; if (id === skinId && core.geometry.userData.skin === id) return;
    skinId = id; core.geometry.dispose(); core.geometry = k.geo(); core.geometry.userData.skin = id;
    coreEdges.geometry.dispose(); coreEdges.geometry = new THREE.EdgesGeometry(k.geo());
    halo.geometry.dispose(); halo.geometry = new THREE.EdgesGeometry(k.geo().clone().scale(1.45, 1.45, 1.45));
    coreMat.color.setHex(k.col); skinEm = k.em; coreMat.emissive.setHex(k.em); halo.material.color.setHex(k.em); coreLight.color.setHex(k.em); ring.material.color.setHex(k.ring);
  }
  const st = { gpus: 0, agents: 0, tier: 0, boost: false, training: false, stage: 0, pulse: 0, zoom: 0, shake: 0, t: 0, W: 1, H: 1, span: 24, a: 1, sx: 0, sy: 0, coinRate: 0, moteRate: 0, low: false, market: null };
  const MARKET_TINT = { boom: 0xffcc57, shortage: 0x39f2ff, grant: 0xb28cff };
  function resize() {
    const W = canvas.clientWidth || 300, H = canvas.clientHeight || 300, phone = W < 640;
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); composer.setSize(W * dpr, H * dpr);
    bloom.resolution.set(W * dpr / 2, H * dpr / 2);
    /* frame the hall: 24 units across on desktop, tighter on a phone so the core stays big */
    const span = phone ? 15 : 24, a = W / H;
    /* desktop: the 344px panel sits on the left, so shift the view right by that
       much; phone: the panel is the bottom 46%, so lift the view */
    st.sx = phone ? 0 : (344 / W) * span / 2; st.sy = phone ? (span / a) * 0.24 : 0; st.span = span; st.a = a;
    frame(1);
    st.W = W; st.H = H;
  }
  function frame(k) {
    /* k < 1 zooms in (a training run just finished); shake nudges the frame */
    const span = st.span * k, a = st.a, jx = (Math.random() - .5) * st.shake, jy = (Math.random() - .5) * st.shake;
    cam.left = -span / 2 - st.sx + jx; cam.right = span / 2 - st.sx + jx; cam.top = span / 2 / a + 2 - st.sy + jy; cam.bottom = -span / 2 / a + 2 - st.sy + jy; cam.updateProjectionMatrix();
  }
  function setState(gpus, agents, tier, boost, training, stage) {
    st.gpus = gpus; st.agents = agents; st.tier = tier; st.boost = boost; st.training = !!training;
    if (stage !== st.stage) {
      st.stage = stage;
      renderer.setClearColor(STAGE_BG[Math.min(4, stage)], 1); scene.fog.color.setHex(STAGE_BG[Math.min(4, stage)]);
      beams.visible = stage >= 2; towers.visible = stage >= 3; orbit.visible = orbit2.visible = stage >= 4;
    }
    for (let i = 0; i < RACKS; i++) {
      const [x, z, dir, ring] = rackPos[i], built = ring === 1 ? stage >= 1 : stage >= 2, on = built && i < gpus;
      M.compose(P.set(x, 0.85, z), Q.identity(), built ? SC.set(1, 1, 1) : SC.set(0, 0, 0)); racks.setMatrixAt(i, M);
      M.compose(P.set(x, 0.85, z), Q.identity(), on ? SC.set(1, 1, 1) : SC.set(0, 0, 0)); strips.setMatrixAt(i, M);
    }
    racks.instanceMatrix.needsUpdate = true; strips.instanceMatrix.needsUpdate = true;
    const s = 0.7 + Math.min(TIERMAX, tier) * 0.13;
    core.scale.setScalar(s); halo.scale.setScalar(s); ring.scale.setScalar(0.8 + s * 0.35);
    coreMat.emissive.setHex(boost ? GOLD : skinEm); coreLight.color.setHex(boost ? GOLD : skinEm);
  }
  const TIERMAX = 19;
  function pulse(n) {
    st.pulse = 1;
    let spawned = 0;
    for (let i = 0; i < PN && spawned < (n || 14); i++) {
      if (pLife[i] > 0) continue;
      const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 0.8;
      pPos[i * 3] = Math.cos(a) * r; pPos[i * 3 + 1] = 2.2 + (Math.random() - .5); pPos[i * 3 + 2] = Math.sin(a) * r;
      pVel[i * 3] = Math.cos(a) * (1.5 + Math.random() * 2); pVel[i * 3 + 1] = 2.5 + Math.random() * 3; pVel[i * 3 + 2] = Math.sin(a) * (1.5 + Math.random() * 2);
      pLife[i] = 0.9; spawned++;
    }
  }
  function zoom() { st.zoom = 1; }
  function setFlow(coinRate, moteRate) { st.coinRate = coinRate; st.moteRate = moteRate; }
  function setMarket(id) {
    st.market = id;
    const base = STAGE_BG[Math.min(4, st.stage)];
    scene.fog.color.setHex(base); renderer.setClearColor(base, 1);
    key.color.setHex(id && MARKET_TINT[id] ? MARKET_TINT[id] : 0xdfe8ff); key.intensity = id ? 1.6 : 1.1;
    padRing.material.color.setHex(id && MARKET_TINT[id] ? MARKET_TINT[id] : MAGENTA);
  }
  /* performance guard: a phone that cannot hold the frame loses bloom and pixel ratio, not the game */
  let slowT = 0;
  function setQuality(low) {
    if (low === st.low) return; st.low = low;
    renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, st.W < 640 ? 1.5 : 2));
    const W = st.W, H = st.H; renderer.setSize(W, H, false); composer.setSize(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
  }
  function shake(a) { st.shake = Math.max(st.shake, a || 0.6); }
  function tick(dt) {
    st.t += dt;
    const t = st.t;
    if (st.zoom > 0 || st.shake > 0) { st.zoom = Math.max(0, st.zoom - dt * 1.6); st.shake = Math.max(0, st.shake - dt * 2.4); frame(1 - st.zoom * 0.14); }
    orbit.rotation.z += dt * 0.2; orbit2.rotation.z -= dt * 0.3;
    /* slow orbit */
    const ang = t * 0.06, R = 25.5;
    cam.position.set(Math.cos(ang) * R, 16, Math.sin(ang) * R); cam.lookAt(0, 0.6, 0);
    const spin = st.training ? 3.2 : 1;
    core.rotation.y += dt * 0.4 * spin; core.rotation.x = Math.sin(t * 0.5) * 0.2;
    halo.rotation.y -= dt * 0.25 * spin; halo.rotation.z += dt * 0.15 * spin;
    ring.rotation.z += dt * 0.5;
    st.pulse = Math.max(0, st.pulse - dt * 3);
    if (dt > 0.045) { slowT += dt; if (slowT > 3 && !st.low) setQuality(true); } else slowT = Math.max(0, slowT - dt * 0.5);
    const ps = 1 + st.pulse * 0.25 + (st.training ? Math.sin(t * 9) * 0.05 : 0), base = 0.7 + Math.min(TIERMAX, st.tier) * 0.13;
    core.scale.setScalar(base * ps); coreLight.intensity = 5 + st.pulse * 12 + Math.sin(t * 3) * 0.6 + (st.training ? 3 : 0);
    coreMat.emissiveIntensity = 0.55 + st.pulse * 1.4 + (st.training ? 0.4 : 0);
    /* drones ring */
    const n = Math.min(DRONES, st.agents), r0 = 3.6;
    for (let i = 0; i < DRONES; i++) {
      if (i >= n) { M.compose(P.set(0, -5, 0), Q.identity(), SC.set(0, 0, 0)); drones.setMatrixAt(i, M); leds.setMatrixAt(i, M); continue; }
      const a = t * 0.35 + i * (Math.PI * 2 / Math.max(6, n)), r = r0 + (i % 3) * 0.7;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 1.4 + Math.sin(t * 2.2 + i) * 0.25 + (i % 3) * 0.3;
      Q.setFromEuler(new THREE.Euler(0, -a, 0));
      M.compose(P.set(x, y, z), Q, SC.set(1, 1, 1)); drones.setMatrixAt(i, M);
      M.compose(P.set(x, y - 0.2, z), Q, SC.set(1, 1, 1)); leds.setMatrixAt(i, M);
      dronePos[i][0] = x; dronePos[i][1] = y; dronePos[i][2] = z;
    }
    drones.instanceMatrix.needsUpdate = true; leds.instanceMatrix.needsUpdate = true;
    /* particles */
    for (let i = 0; i < PN; i++) {
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -10; continue; }
      pLife[i] -= dt; pVel[i * 3 + 1] -= 6 * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    }
    pGeo.attributes.position.needsUpdate = true;
    /* coins */
    coinAcc += st.coinRate * dt;
    while (coinAcc >= 1) { coinAcc -= 1;
      for (let i = 0; i < FN; i++) if (fLife[i] <= 0) { const k = Math.floor(Math.random() * Math.max(1, Math.min(RACKS, st.gpus))), rp = rackPos[k];
        fPos[i * 3] = rp[0] + (Math.random() - .5) * .6; fPos[i * 3 + 1] = 1.9; fPos[i * 3 + 2] = rp[1]; fVel[i * 3] = (Math.random() - .5) * .4; fVel[i * 3 + 1] = 1.6 + Math.random(); fVel[i * 3 + 2] = (Math.random() - .5) * .4; fLife[i] = 1.4; break; } }
    for (let i = 0; i < FN; i++) { if (fLife[i] <= 0) { fPos[i * 3 + 1] = -10; continue; } fLife[i] -= dt; fPos[i * 3] += fVel[i * 3] * dt; fPos[i * 3 + 1] += fVel[i * 3 + 1] * dt; fPos[i * 3 + 2] += fVel[i * 3 + 2] * dt; }
    fGeo.attributes.position.needsUpdate = true; coins.material.opacity = st.gpus > 0 ? .9 : 0;
    /* data motes: drone -> core */
    moteAcc += st.moteRate * dt;
    const nd = Math.min(DRONES, st.agents);
    while (moteAcc >= 1 && nd > 0) { moteAcc -= 1;
      for (let i = 0; i < DN; i++) if (dLife[i] <= 0) { const d = dronePos[Math.floor(Math.random() * nd)];
        dPos[i * 3] = d[0]; dPos[i * 3 + 1] = d[1]; dPos[i * 3 + 2] = d[2];
        const L = 0.8; dVel[i * 3] = (0 - d[0]) / L; dVel[i * 3 + 1] = (2.2 - d[1]) / L; dVel[i * 3 + 2] = (0 - d[2]) / L; dLife[i] = L; break; } }
    for (let i = 0; i < DN; i++) { if (dLife[i] <= 0) { dPos[i * 3 + 1] = -10; continue; } dLife[i] -= dt; dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt; }
    dGeo.attributes.position.needsUpdate = true;
    if (st.low) renderer.render(scene, cam); else composer.render();
  }
  resize(); setState(0, 0, 0, false, false, 0);
  return { resize, setState, setSkin, setFlow, setMarket, setQuality, pulse, zoom, shake, tick, renderer };
}
