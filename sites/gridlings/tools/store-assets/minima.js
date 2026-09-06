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
    { name: "portrait", w: 800, h: 1200, title: 64, tag: 22 },
    { name: "square", w: 800, h: 800, title: 66, tag: 19 }
  ],
  videos: [
    { name: "landscape", rec: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 } },
    { name: "portrait", rec: { w: 540, h: 960 }, out: { w: 1080, h: 1920 } }
  ],

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
      + 'background:linear-gradient(180deg,#ffffff 0%,#ffffff 88%,#ffffff00 100%);'
      + 'font-family:-apple-system,Helvetica Neue,Arial,sans-serif;';
    t.innerHTML = "<div style='font-weight:800;font-size:${c.title}px;letter-spacing:6px;color:#111113;line-height:1'>MINI<span style=color:#FF4F00>MA</span></div>"
      + "<div style='font-weight:700;font-size:${c.tag}px;color:#FF4F00;margin-top:8px'>you can only feel the slope</div>";
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
