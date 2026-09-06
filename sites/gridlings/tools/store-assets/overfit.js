/* Store-asset config for OVERFIT. Copy this file as the template for the next
 * game: the harness is generic, the autopilot and the staged cover frame are
 * necessarily game-specific.
 *
 * The autopilot rule that matters: it must DEMONSTRATE THE SIGNATURE MECHANIC,
 * not merely survive. Here it spends 7.5s feeding the enemy model a rightward
 * habit, then betrays it — which is the entire pitch of the game — and only
 * then goes hunting during the ×2 window. No extra hp, no invulnerability:
 * a trailer of cheated gameplay misrepresents the product.
 */
module.exports = {
  readyExpr: "window.OF_READY === true",
  startSelector: null,   // instant-play: no menu to click through
  probeExpr: `(() => ({ t: +(window.__AP && window.__AP.t || 0).toFixed(1), conf: +model.conf.toFixed(2),
    confusedAt: window.__AP && window.__AP.confusedAt, score, wave, hp, over }))()`,

  covers: [
    { name: "landscape", w: 1920, h: 1080, title: 110, tag: 34 },
    { name: "portrait", w: 800, h: 1200, title: 64, tag: 22 },
    { name: "square", w: 800, h: 800, title: 66, tag: 19 }
  ],
  videos: [
    { name: "landscape", rec: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 } },
    { name: "portrait", rec: { w: 540, h: 960 }, out: { w: 1080, h: 1920 } }
  ],

  poster: (c) => require("./_poster.js")(c, {
    fontFace: require("./_fonts.js").audiowide, family: "'Audiowide'", titleScale: 0.84,
    ground: (W, H) => `radial-gradient(${W*.9}px ${H*.9}px at 60% 30%, #ff9bb8 0%, #ff3d71 40%, #c2204f 72%, #5a0f26 100%)`,
    ink: "#ffffff", ink2: "#00e5a8", outline: "#2a0a14", shadow: "#5a0f26", tagInk: "#ffffff",
    word: "OVER<em>FIT</em>", tagline: "THE BOSS LEARNS YOUR MOVES",
    hero: `<svg viewBox="0 0 200 200"><defs><radialGradient id="e" cx=".4" cy=".4"><stop offset="0" stop-color="#ffd7e4"/><stop offset=".5" stop-color="#ff3d71"/><stop offset="1" stop-color="#6b0f2c"/></radialGradient><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8ffe9"/><stop offset="1" stop-color="#00b586"/></linearGradient></defs>
<g transform="translate(118 74)"><circle r="54" fill="url(#e)" stroke="#2a0a14" stroke-width="7"/><circle cx="-6" cy="-4" r="24" fill="#2a0a14"/><circle cx="2" cy="-10" r="9" fill="#fff"/><path d="M-52 -18 Q-18 -60 34 -46" fill="none" stroke="#2a0a14" stroke-width="8" stroke-linecap="round"/></g>
<g transform="translate(52 142) rotate(-28)"><polygon points="38,0 -22,26 -12,0 -22,-26" fill="url(#s)" stroke="#04140e" stroke-width="7" stroke-linejoin="round"/><circle cx="8" cy="-4" r="6" fill="#fff"/></g>
<g><rect x="20" y="168" width="160" height="12" rx="6" fill="#2a0a14"/><rect x="20" y="168" width="118" height="12" rx="6" fill="#00e5a8"/></g></svg>`
  }),
  stage: (c) => `
    var hn=document.getElementById('hint'); if(hn) hn.style.display='none';
    document.querySelector('header').style.display='none';
    document.querySelector('footer').style.display='none';
    running = true; nowT = 5; wave = 7; score = 1560; hp = 3;
    model.dirBins = [10,1,1,1,1,1,1,1]; model.samples = 17; learnFrame(0.01);
    P.x = W*0.5; P.y = H*0.66; P.vx = 150; P.vy = -60;
    foes = [
      { type:'chaser',    x:W*0.80, y:H*0.34, hp:1, sp:0, r:26, hue:340, wob:0 },
      { type:'chaser',    x:W*0.20, y:H*0.36, hp:1, sp:0, r:22, hue:340, wob:2 },
      { type:'chaser',    x:W*0.50, y:H*0.22, hp:1, sp:0, r:24, hue:340, wob:1 },
      { type:'predictor', x:W*0.70, y:H*0.72, hp:2, sp:0, r:28, hue:275, wob:1 },
      { type:'predictor', x:W*0.28, y:H*0.74, hp:2, sp:0, r:24, hue:275, wob:3 },
      { type:'sniper',    x:W*0.86, y:H*0.55, hp:2, sp:0, r:26, hue:45, lock:1.8, aim:{x:P.x+34,y:P.y-8,t:0.55}, wob:0 }
    ];
    shots = [ {x:W*0.56,y:H*0.58,vx:300,vy:-120,t:0}, {x:W*0.61,y:H*0.53,vx:300,vy:-120,t:0} ];
    confused = 1.6; confuseFlash = 0.5;
    burst(W*0.63, H*0.46, 275, 40, 240); burst(W*0.35, H*0.56, 340, 28, 210); burst(W*0.5, H*0.3, 160, 22, 190);
    waveMsg = null; pops = [];
    var t = document.createElement('div');
    t.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;z-index:60;pointer-events:none;padding:${c.title*0.35}px 0 ${c.title*0.6}px;background:linear-gradient(180deg,#07090f 0%,#07090f 88%,#07090f00 100%);font-family:-apple-system,Segoe UI,sans-serif;';
    t.innerHTML='<div style="font-weight:900;font-size:${c.title}px;letter-spacing:4px;color:#fff;line-height:1">OVER<span style="color:#ff3d71">FIT</span></div>'
      +'<div style="font-weight:700;font-size:${c.tag}px;color:#00e5a8;margin-top:8px">the boss learns your moves — betray it</div>';
    document.body.appendChild(t);
  `,

  autopilot: `
    window.__AP = { phase: 'feed', confusedAt: null, t0: performance.now() };
    /* start at wave 4: the model-as-boss arrives at wave 5, inside the 16s clip */
    wave = 3; foes = []; waveSpawned = 99; waveQuota = 0; startWave();
    (function () {
      var ap = window.__AP;
      ptr.on = true; ptr.x = W * 0.5; ptr.y = H * 0.6;
      armed = true;                       // skip the read-the-hint grace for capture
      var burstT = 0, mode = 'burst';
      function step() {
        if (typeof over === 'undefined' || over) { requestAnimationFrame(step); return; }
        var t = (performance.now() - ap.t0) / 1000; ap.t = t;
        var tx, ty;
        if (t < 7.5) {                       // 1) teach it a habit: bursts RIGHT
          ap.phase = 'feed';
          burstT += 1 / 60;
          if (mode === 'burst' && burstT > 0.85) { mode = 'creep'; burstT = 0; }
          else if (mode === 'creep' && burstT > 1.15) { mode = 'burst'; burstT = 0; }
          if (mode === 'burst') { tx = W * 0.86; ty = H * 0.55 + Math.sin(t * 1.4) * H * 0.10; }
          else { tx = ptr.x - 2.2; ty = ptr.y + Math.sin(t * 3) * 1.2; }
        } else if (t < 12.5) {               // 2) betray it: sustained LEFT
          ap.phase = 'betray';
          tx = W * 0.12 + Math.sin(t * 2.2) * W * 0.05;
          ty = H * 0.45 + Math.cos(t * 1.7) * H * 0.18;
        } else {                             // 3) cash the x2 window
          ap.phase = 'hunt';
          var cxm = 0, cym = 0, n = 0;
          foes.forEach(function (f) { cxm += f.x; cym += f.y; n++; });
          if (n) { tx = cxm / n + Math.cos(t * 2) * 130; ty = cym / n + Math.sin(t * 2) * 130; }
          else { tx = W * 0.5 + Math.cos(t * 1.6) * W * 0.3; ty = H * 0.5 + Math.sin(t * 1.6) * H * 0.25; }
        }
        var rx = 0, ry = 0;                  // repulsion so the run actually survives
        foes.forEach(function (f) {
          var dx = ptr.x - f.x, dy = ptr.y - f.y, d = Math.hypot(dx, dy);
          if (d < 165 && d > 0.1) { var w = (165 - d) / 165; rx += dx / d * w * 190; ry += dy / d * w * 190; }
        });
        ptr.x = Math.max(24, Math.min(W - 24, tx + rx));
        ptr.y = Math.max(24, Math.min(H - 24, ty + ry));
        if (confused > 0 && ap.confusedAt === null) ap.confusedAt = +t.toFixed(2);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    })();
  `
};
