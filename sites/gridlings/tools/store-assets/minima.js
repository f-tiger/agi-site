/* Store-asset config for MINIMA — consumed by tools/capture-store-assets.js.
 *
 * The autopilot must DEMONSTRATE the mechanic and it plays honestly: it reads
 * only what the player can see (the slope under the probe and the LOSS readout),
 * never the field's hidden global minimum, and gets no extra steps.
 *
 * This is the fleet's only light-themed game, so the cover band is white with
 * ink text rather than the dark band the other four use.
 */
module.exports = {
  readyExpr: "window.MN_READY === true",
  startSelector: null,
  probeExpr: `(() => ({ score: typeof score === 'undefined' ? null : score,
                        lvl: typeof lvl === 'undefined' ? null : lvl + 1,
                        steps: typeof steps === 'undefined' ? null : Math.round(steps),
                        over: !!window.__MN_REEL_DONE }))()`,
  covers: [
    { name: "landscape", w: 1920, h: 1080, title: 110, tag: 34 },
    { name: "portrait", w: 1080, h: 1920, title: 64, tag: 22 },
    { name: "square", w: 800, h: 800, title: 66, tag: 19 }
  ],
  videos: [
    { name: "landscape", rec: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 } },
    { name: "portrait", rec: { w: 540, h: 960 }, out: { w: 1080, h: 1920 } }
  ],

  poster: (c) => require("./_poster.js")(c, {
    /* Swiss: the tile stays white on a dark portal page, which is louder than any
       colour there. Ink wordmark, one orange hard drop, no rays. */
    fontFace: require("./_fonts.js").rubikmono, family: "'Rubik Mono One'", titleScale: .8,
    ground: (W, H) => `#f4f1ea`, rays: null,
    ink: "#111113", ink2: "#FF4F00", outline: "#ffffff", shadow: "#ffffff", tagInk: "#111113",   /* flat: the hard drop peeked out as orange slivers */
    word: "MINI<em>MA</em>", tagline: "YOU CAN ONLY FEEL THE SLOPE",
    heroScale: .82,
    /* contours live in 56..196 of the box so the top line no longer runs
       through the tagline (first pass started at y=10) */
    hero: `<svg viewBox="0 0 200 200"><defs>
<radialGradient id="basin" cx=".64" cy=".58" r=".6"><stop offset="0" stop-color="#cf8a52"/><stop offset=".42" stop-color="#e6c89c"/><stop offset="1" stop-color="#f1e6d2"/></radialGradient>
<linearGradient id="pin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a3d"/><stop offset="1" stop-color="#e03f00"/></linearGradient>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
<path d="M22 74 C42 36 112 30 152 52 C192 74 194 150 154 182 C112 204 40 194 22 154 C6 124 6 100 22 74Z" fill="url(#basin)" filter="url(#soft)"/>
<g fill="none" stroke="#14161c" stroke-linecap="round">
<path d="M28 96 C60 74 110 70 172 60" stroke-width="1.4" opacity=".45"/>
<path d="M26 120 C60 100 112 96 176 84" stroke-width="2.4"/>
<path d="M30 146 C62 128 116 124 178 112" stroke-width="1.4" opacity=".45"/>
<path d="M38 172 C66 156 118 150 172 138" stroke-width="2.4"/>
<ellipse cx="130" cy="120" rx="40" ry="22" stroke-width="1.4" opacity=".55"/><ellipse cx="130" cy="120" rx="25" ry="13" stroke-width="2.4"/><ellipse cx="130" cy="120" rx="11" ry="5.5" stroke-width="1.4"/></g>
<path d="M44 58 C50 88 58 108 78 118 S104 124 116 121" fill="none" stroke="#14161c" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/>
<path d="M78 118 L112 121" stroke="#FF4F00" stroke-width="3.4" stroke-linecap="round"/><path d="M119 121.5 l-10 -6 l1 11z" fill="#FF4F00" stroke="#14161c" stroke-width="1.2" stroke-linejoin="round"/>
<ellipse cx="78" cy="120" rx="9" ry="3.6" fill="rgba(20,22,28,.28)"/>
<path d="M65 88 A13 13 0 1 1 91 88 L78 118 Z" fill="url(#pin)" stroke="#14161c" stroke-width="2.2" stroke-linejoin="round"/><circle cx="78" cy="88" r="4.2" fill="#fff"/><circle cx="73" cy="82" r="2.2" fill="rgba(255,255,255,.55)"/></svg>`
  }),
  stage: (c) => `
    armed = true; document.getElementById('hint').style.display='none';
    document.querySelector('header').style.display='none';
    document.querySelector('.bar').style.display='none';
    document.querySelector('footer').style.display='none';
    loadLevel(2); score = 940;
    /* Walk a real search: the probe is moved and reveal() called exactly as
       update() does it, so the contours on the cover are the ones this level
       actually has -- not a drawing of a landscape. */
    (function () {
      /* Stop the walk SHORT of the deep well: the first version ended on it, the
         game correctly declared a win during the 180ms settle, and the cover came
         out as a screenshot of the results modal. */
      /* A search that actually wandered: down into the wide bowl, a dead-end
         probe along its floor, one HEAT-style jump out to the right, then the
         approach to the deep well. A single clean line would be a nicer picture
         and a dishonest one - nobody's first descent looks like that. */
      var path = [[.14,.20],[.20,.29],[.27,.39],[.32,.50],[.36,.58],[.42,.62],
                  [.48,.63],[.53,.60],[.47,.57],[.40,.55],[.34,.57],[.30,.63],
                  [.28,.72],[.33,.78],[.42,.80],[.52,.77],
                  [.70,.62],[.74,.54],[.72,.46],[.68,.42],[.64,.41]];
      for (var i = 0; i < path.length; i++) {
        for (var t = 0; t < 1; t += 0.12) {
          var a = path[Math.max(0, i - 1)], b = path[i];
          probe.x = a[0] + (b[0] - a[0]) * t;
          probe.y = a[1] + (b[1] - a[1]) * t;
          reveal(probe.x, probe.y, 1);
        }
      }
      steps = 690; hud();
    })();
    var t = document.createElement('div');
    t.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;z-index:60;pointer-events:none;'
      + 'padding:${c.title*0.35}px 0 ${c.title*0.6}px;'
      + 'background:linear-gradient(180deg,#f4f1ea 0%,#f4f1ea 88%,#f4f1ea00 100%);'
      + 'font-family:Rubik Mono One,Impact,sans-serif;';
    t.innerHTML = "<div style='font-weight:400;font-size:${c.title}px;letter-spacing:2px;color:#111113;line-height:1'>MINI<span style=color:#FF4F00>MA</span></div>"
      + "<div style='font-weight:400;font-size:${c.tag}px;color:#FF4F00;margin-top:8px'>you can only feel the slope</div>";
    document.body.appendChild(t);
  `,

  autopilot: `
     armed = true; document.getElementById('hint').classList.add('gone');
     /* The same two-mode search the level verifier uses: walk downhill, and when
        downhill stops paying, either spend HEAT or commit to a heading and climb.
        It never reads fmin or the basin positions. */
     window.__MN_REEL_DONE = false;
     var mnT0 = performance.now(), mnMode = 'descend', mnA = 0, mnLeft = 0, mnStall = 0, mnBest = 0;
     loadLevel(2);
     mnBest = fieldAt(probe.x, probe.y);
     var mnIv = setInterval(function () {
       if ((performance.now() - mnT0) / 1000 > 19) { window.__MN_REEL_DONE = true; clearInterval(mnIv); return; }
       if (over) {
         if (won) { setTimeout(function () { document.getElementById('bnext').click(); }, 700); }
         else { setTimeout(function () { document.getElementById('bnext').click(); }, 700); }
         mnMode = 'descend'; mnLeft = 0; mnStall = 0; mnBest = 0; ptr.on = false;
         return;
       }
       var lo = fieldAt(probe.x, probe.y);
       if (!mnBest || lo < mnBest - 1e-4) { mnBest = lo; mnStall = 0; } else mnStall++;
       var g = gradAt(probe.x, probe.y), m = Math.hypot(g[0], g[1]);
       if (mnMode === 'push') {
         ptr.on = true;
         ptr.x = Math.max(0, Math.min(1, probe.x + Math.cos(mnA) * 0.12));
         ptr.y = Math.max(0, Math.min(1, probe.y + Math.sin(mnA) * 0.12));
         mnLeft -= 0.05;
         if (mnLeft <= 0 || (m > 0.9 && lo < mnBest - 0.03)) mnMode = 'descend';
       } else if (m < 0.05 || mnStall > 34) {
         if (steps >= 75 && Math.random() < 0.55) { doHeat(); mnStall = 0; }
         else { mnA += 2.399; mnLeft = 0.9; mnMode = 'push'; mnStall = 0; }
       } else if (m > 1e-9) {
         ptr.on = true;
         ptr.x = Math.max(0, Math.min(1, probe.x - g[0] / m * 0.12));
         ptr.y = Math.max(0, Math.min(1, probe.y - g[1] / m * 0.12));
       }
     }, 50);`
};
