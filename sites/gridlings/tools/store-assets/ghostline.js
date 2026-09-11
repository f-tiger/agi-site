/* Store-asset config for GHOSTLINE — consumed by tools/capture-store-assets.js.
 * The trailer is a real race driven by the clone's own policy through the
 * game's input flags: same physics, same track, no teleporting. */
module.exports = {
  readyExpr: "window.GL_READY === true",
  startSelector: null,
  probeExpr: `(() => ({ state: GL.state, s: Math.round(GL.me ? GL.me.s : 0), v: Math.round(GL.me ? GL.me.v : 0), walls: GL.me ? GL.me.walls : 0, over: false }))()`,
  covers: [
    { name: "landscape", w: 1920, h: 1080, title: 110, tag: 34 },
    { name: "portrait", w: 1080, h: 1920, title: 64, tag: 22 },
    { name: "square", w: 800, h: 800, title: 66, tag: 19 }
  ],
  videos: [
    { name: "landscape", rec: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 }, dsf: 2 },
    { name: "portrait", rec: { w: 540, h: 960 }, out: { w: 1080, h: 1920 } }
  ],
  trailerCss: "footer{display:none!important}#zb{display:none!important}",
  poster: (c) => require("./_poster.js")(c, {
    fontFace: require("./_fonts.js").racing, family: "'Racing Sans One'", titleScale: 0.9, heroScale: .86,
    ground: (W, H) => `linear-gradient(180deg, #8fd9ff 0%, #5fc0ff 45%, #79c15a 45.2%, #5aa93f 100%)`,
    rays: "rgba(255,255,255,.09)",
    ink: "#ffffff", ink2: "#39f2ff", outline: "#14182a", shadow: "#ff3fa4", tagInk: "#14182a",
    word: "GHOST<em>LINE</em>", tagline: "RACE THE AI TRAINED ON YOU",
    /* the road curving away, your car, and the ghost of you ahead */
    hero: `<svg viewBox="0 0 200 200"><defs>
<linearGradient id="rd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3040"/><stop offset="1" stop-color="#3a3f4a"/></linearGradient>
<linearGradient id="car" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ac2"/><stop offset="1" stop-color="#e0248a"/></linearGradient></defs>
<path d="M62 196 C70 130 60 90 100 40 C120 20 150 24 170 30 L150 44 C130 40 118 44 108 60 C86 100 96 140 92 196 Z" fill="url(#rd)"/>
<path d="M62 196 C70 130 60 90 100 40" fill="none" stroke="#e63946" stroke-width="5" stroke-dasharray="9 9"/><path d="M62 196 C70 130 60 90 100 40" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="9 9" stroke-dashoffset="9"/>
<path d="M92 196 C96 140 86 100 108 60" fill="none" stroke="#e63946" stroke-width="5" stroke-dasharray="9 9"/><path d="M92 196 C96 140 86 100 108 60" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="9 9" stroke-dashoffset="9"/>
<g opacity=".45" transform="translate(112 74) rotate(-30) scale(.7)"><rect x="-12" y="-22" width="24" height="44" rx="7" fill="#39f2ff" stroke="#0a4a55" stroke-width="3"/><rect x="-8" y="-12" width="16" height="16" rx="3" fill="#bff8ff"/></g>
<g transform="translate(78 150) rotate(8)"><rect x="-16" y="-30" width="32" height="60" rx="9" fill="url(#car)" stroke="#14182a" stroke-width="4"/><rect x="-11" y="-16" width="22" height="20" rx="4" fill="#9fe8ff" stroke="#14182a" stroke-width="3"/><rect x="-18" y="-24" width="6" height="12" rx="2" fill="#14182a"/><rect x="12" y="-24" width="6" height="12" rx="2" fill="#14182a"/><rect x="-18" y="12" width="6" height="12" rx="2" fill="#14182a"/><rect x="12" y="12" width="6" height="12" rx="2" fill="#14182a"/><rect x="-13" y="24" width="26" height="4" rx="2" fill="#ff2a2a"/></g>
<g font-family="Racing Sans One,Arial Black,Arial,sans-serif" font-size="15" text-anchor="middle"><rect x="118" y="150" width="76" height="26" rx="13" fill="#ffcc57"/><text x="156" y="169" fill="#2a1e00">-0.42s</text></g></svg>`
  }),
  stage: (c) => `
    (function(){ GL.loadTrack(GL.TR.CAMPAIGN[3].seed, GL.TR.CAMPAIGN[3].level); GL.startRace();
      var drv = GL.AI.driverFor({ target: Float32Array.from(GL.S.clones[GL.T.seed].target), brake: Uint8Array.from(GL.S.clones[GL.T.seed].brake) });
      /* run the race forward off-camera to a mid-bend moment, then freeze the input */
      GL.me.t = 0; for (var i = 0; i < 60 * 9; i++) { var inp = drv(GL.T, GL.me); GL.PH.step(GL.T, GL.me, inp, 1/60); GL.PH.step(GL.T, GL.gh, drv(GL.T, GL.gh), 1/60); }
      GL.gh.s = GL.me.s + 14;
      document.getElementById('count').classList.remove('show'); document.getElementById('hud').classList.add('show'); })();
    document.querySelector('header').style.display='none'; document.querySelector('footer').style.display='none';
    var t = document.createElement('div');
    t.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;z-index:60;pointer-events:none;padding:${c.title*0.35}px 0 ${c.title*0.6}px;background:linear-gradient(180deg,#14182a 0%,#14182a 88%,#14182a00 100%);font-family:Racing Sans One,Impact,sans-serif;';
    t.innerHTML = "<div style='font-size:${c.title*.9}px;letter-spacing:1px;color:#fff;line-height:1'>GHOST<span style=color:#39f2ff>LINE</span></div>"
      + "<div style='font-size:${c.tag}px;color:#39f2ff;margin-top:8px'>race the AI trained on you</div>";
    document.body.appendChild(t);
  `,
  autopilot: `
    (function(){
      GL.loadTrack(GL.TR.CAMPAIGN[3].seed, GL.TR.CAMPAIGN[3].level); GL.startRace();
      var pol = { target: Float32Array.from(GL.S.clones[GL.T.seed].target), brake: Uint8Array.from(GL.S.clones[GL.T.seed].brake) };
      var drv = GL.AI.driverFor(pol), glT = 0;
      /* the human is the clone's policy with a little late braking and a wobble:
         a real-looking drive that stays close to the ghost */
      var glIv = setInterval(function () {
        glT += 0.05; if (GL.state !== 'race') return;
        var i = drv(GL.T, GL.me), wob = Math.sin(glT * 3.1) * 0.25;
        GL.inp.l = i.steer + wob < -0.25; GL.inp.r = i.steer + wob > 0.25; GL.inp.b = i.brake && Math.sin(glT * 7) > -0.3;
      }, 50);
    })();`
};
