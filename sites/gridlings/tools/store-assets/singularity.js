/* Store-asset config for SINGULARITY INC. — consumed by tools/capture-store-assets.js.
 * The trailer starts from a mid-game save (the ordinary state ~20 minutes in) and
 * then plays honestly through the game's own actions: clicks, buys, trains, and
 * one rogue-model decision. No money is minted mid-run. */
module.exports = {
  readyExpr: "window.SG_READY === true",
  startSelector: null,
  probeExpr: `(() => ({ money: Math.round(SG.S.money), models: SG.S.models, gpus: SG.S.gen.gpu, agents: SG.S.gen.agent, over: false }))()`,
  covers: [
    { name: "landscape", w: 1920, h: 1080, title: 110, tag: 34 },
    { name: "portrait", w: 1080, h: 1920, title: 64, tag: 22 },
    { name: "square", w: 800, h: 800, title: 66, tag: 19 }
  ],
  videos: [
    { name: "landscape", rec: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 }, dsf: 2 },   /* the side panel needs the width */
    { name: "portrait", rec: { w: 540, h: 960 }, out: { w: 1080, h: 1920 } }
  ],
  /* toasts: bottom-right on the wide frame (off the core), the game's own
     above-the-panel placement on the tall one (off the shop) */
  trailerCss: "#hint{display:none!important}#nudge{display:none!important}@media(min-width:761px){#toasts{top:auto;bottom:16px;max-width:260px}}.toast{font-size:11px;padding:6px 9px}",
  /* landscape: one line, small; portrait/square: two lines. A 16-character
     wordmark cannot be both big and unbroken at 800px wide. */
  poster: (c) => require("./_poster.js")(c, Object.assign(c.w > c.h * 1.1
    ? { titleScale: 0.46, tagScale: 1.7, nowrap: true, heroScale: .86, word: "SINGULARITY <em>INC.</em>" }
    : { titleScale: 0.62, lines: 1.85, heroScale: .8, word: "SINGULARITY<br><em style='font-size:.62em;line-height:1.1'>INC.</em>" }, {
    fontFace: require("./_fonts.js").russo, family: "'Russo One'",
    ground: (W, H) => `radial-gradient(${W*.9}px ${H*.9}px at 60% 35%, #1b3a6a 0%, #0f1f45 40%, #090f2a 72%, #04061a 100%)`,
    rays: "rgba(57,242,255,.07)",
    ink: "#ffffff", ink2: "#39f2ff", outline: "#0a1030", shadow: "#ff3fa4", tagInk: "#bfe9ff",
    tagline: "BUILD THE LAB THAT BUILDS THE MODEL",
    /* the server hall from the game: racks, drones, the core -- eye-free */
    hero: `<svg viewBox="0 0 200 200"><defs>
<radialGradient id="cg" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#d9fdff"/><stop offset=".45" stop-color="#39f2ff"/><stop offset="1" stop-color="#0a6a7a"/></radialGradient>
<linearGradient id="rk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3860"/><stop offset="1" stop-color="#121a34"/></linearGradient>
<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter></defs>
<ellipse cx="100" cy="150" rx="78" ry="26" fill="#0d1734" stroke="#ff3fa4" stroke-width="3"/>
<g fill="url(#rk)" stroke="#05081a" stroke-width="2"><rect x="8" y="88" width="20" height="52" rx="3"/><rect x="34" y="96" width="20" height="52" rx="3"/><rect x="146" y="96" width="20" height="52" rx="3"/><rect x="172" y="88" width="20" height="52" rx="3"/></g>
<g fill="#39f2ff" opacity=".9"><rect x="13" y="94" width="10" height="34" rx="2"/><rect x="39" y="102" width="10" height="34" rx="2"/><rect x="151" y="102" width="10" height="34" rx="2"/><rect x="177" y="94" width="10" height="34" rx="2"/></g>
<circle cx="100" cy="88" r="34" fill="#39f2ff" opacity=".35" filter="url(#glow)"/>
<g fill="#0d1630" fill-opacity=".55" stroke="#39f2ff" stroke-width="2.6" stroke-linejoin="round">
<polygon points="100,44 134,62 138,100 112,128 88,128 62,100 66,62"/>
<polygon points="100,44 118,74 106,104 88,128"/><polygon points="100,44 82,74 94,104 112,128"/>
<polyline points="66,62 82,74 118,74 134,62"/><polyline points="62,100 82,74"/><polyline points="138,100 118,74"/><polyline points="62,100 94,104 106,104 138,100"/>
</g>
<polygon points="100,62 122,88 100,114 78,88" fill="url(#cg)" stroke="#e9ffff" stroke-width="2"/><polygon points="100,62 122,88 100,88" fill="#fff" opacity=".35"/><polygon points="100,88 122,88 100,114" fill="#000" opacity=".2"/>
<ellipse cx="100" cy="90" rx="46" ry="14" fill="none" stroke="#39f2ff" stroke-width="2.5" transform="rotate(22 100 90)" opacity=".9"/>
<ellipse cx="100" cy="92" rx="52" ry="16" fill="none" stroke="#ff3fa4" stroke-width="4" transform="rotate(-14 100 92)"/>
<g fill="#1a2444" stroke="#05081a" stroke-width="1.5"><rect x="56" y="126" width="14" height="12" rx="2"/><rect x="130" y="130" width="14" height="12" rx="2"/><rect x="92" y="140" width="14" height="12" rx="2"/><rect x="40" y="60" width="14" height="12" rx="2"/><rect x="150" y="56" width="14" height="12" rx="2"/></g>
<g fill="#ff3fa4"><rect x="56" y="136" width="14" height="3"/><rect x="130" y="140" width="14" height="3"/><rect x="92" y="150" width="14" height="3"/><rect x="40" y="70" width="14" height="3"/><rect x="150" y="66" width="14" height="3"/></g>
<g font-family="Russo One,Arial Black,Arial,sans-serif" font-size="14" text-anchor="middle"><rect x="58" y="164" width="84" height="26" rx="13" fill="#ffcc57"/><text x="100" y="182" fill="#1a1200">$1.2M/s</text></g></svg>`
  })),
  stage: (c) => `
    (function(){ var S = SG.S; S.money = 184000; S.data = 9200; S.gen.agent = 22; S.gen.gpu = 14; S.gen.dataset = 3; S.gen.researcher = 4; S.clickLv = 6; S.models = 11; S.earned = 610000; S.align = 4; S.prestige = 1; S.clicks = 300; S.t = 1200;
      document.getElementById('hint').classList.add('gone'); document.getElementById('nudge').style.display = 'none'; SG.render(); })();
    document.querySelector('header').style.display='none'; document.querySelector('footer').style.display='none';
    var t = document.createElement('div');
    t.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;z-index:60;pointer-events:none;padding:${c.title*0.35}px 0 ${c.title*0.6}px;background:linear-gradient(180deg,#070a14 0%,#070a14 88%,#070a1400 100%);font-family:Russo One,Impact,sans-serif;';
    t.innerHTML = "<div style='font-weight:400;font-size:${c.title*.8}px;letter-spacing:2px;color:#fff;line-height:1'>SINGULARITY <span style=color:#39f2ff>INC.</span></div>"
      + "<div style='font-weight:400;font-size:${c.tag}px;color:#39f2ff;margin-top:8px'>build the lab that builds the model</div>";
    document.body.appendChild(t);
  `,
  autopilot: `
    (function(){
      var S = SG.S, E = SG.E;
      /* mid-game save, ~20 minutes in; everything after this is real play */
      S.money = 2600; S.data = 900; S.gen.agent = 9; S.gen.gpu = 5; S.gen.dataset = 1; S.gen.researcher = 1; S.clickLv = 3; S.models = 5; S.earned = 9000; S.clicks = 140; S.t = 1200; S.rp = 8;
      S.nextRogue = 7;           /* one decision in the trailer window */
      S.nextCache = S.clicks + 30;   /* a cache drops early in the window */
      document.getElementById('hint').classList.add('gone'); SG.render();
      var sgT = 0, sgCore = document.getElementById('stage');
      var sgIv = setInterval(function () {
        sgT += 0.1;
        /* tap the core 6x a second: the pulse is the game's heartbeat on camera */
        if (Math.floor(sgT * 10) % 2 === 0) sgCore.dispatchEvent(new PointerEvent('pointerdown', { clientX: innerWidth * (innerWidth < 700 ? .5 : .62), clientY: innerHeight * (innerWidth < 700 ? .3 : .45), bubbles: true }));
        var n = E.nextTrain(S); if (n && n.ok) document.getElementById('btrain').click();
        else if (n && !S.training && S.gen.gpu < n.gpus && S.money >= E.cost.gpu(S)) E.buy(S, 'gpu');
        else if (S.money >= E.cost.agent(S) * 1.5) E.buy(S, 'agent');
        else if (S.money >= E.cost.gpu(S) * 2) E.buy(S, 'gpu');
        var cache = document.querySelector('#cache.show'); if (cache && Math.random() < 0.15) cache.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        if (S.rogue && S.rogue.left < 17.5) { var b = document.querySelector('#modal.show .btn.alt'); if (b) b.click(); }
      }, 100);
    })();`
};
