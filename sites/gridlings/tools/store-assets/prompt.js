/* Store-asset config for PROMPT — consumed by tools/capture-store-assets.js.
 *
 * The autopilot must DEMONSTRATE the mechanic, not merely survive, and it plays
 * honestly: no extra lives, no invulnerability, no faked state. A trailer of
 * cheated gameplay misrepresents the product.
 */
module.exports = {
  readyExpr: "window.PM_READY === true",
  startSelector: null,
  /* NOTE: `over` here does not mean "game over" -- it flips true at the end of
     every level run, and the harness stops recording on it. Report the reel's
     own completion flag instead, or the trailer ends after one level. */
  probeExpr: `(() => ({ score: typeof score === 'undefined' ? null : score,
                        lvl: typeof lvl === 'undefined' ? null : lvl + 1,
                        over: !!window.__PM_REEL_DONE }))()`,
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
    document.querySelector('.rack').style.display='none';
    document.querySelector('footer').style.display='none';
    /* the canvas HUD prints LEVEL / SPEC / par right where the cover title goes.
       Filter those three lines out for the still rather than grow the title band
       until it swallows the board. */
    (function(){ var f = cx.fillText.bind(cx);
      cx.fillText = function (t, x, y) {
        if (/^LEVEL |^par [0-9]|^“/.test(String(t))) return;   /* [0-9] not \\d: this is a template literal, \\d collapses to a bare d */
        return f(t, x, y);
      }; })();
    loadLevel(4); score=980;
    prog=['UNTIL WALL','LEFT','LEFT','UNTIL \u25c6','LEFT','UNTIL WALL'];
    resetBot(); execIdx=3; running=true;
    for(var i=0;i<3;i++) stepProgram();
    var t = document.createElement('div');
    t.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;z-index:60;pointer-events:none;padding:${c.title*0.35}px 0 ${c.title*0.6}px;background:linear-gradient(180deg,#0b0e15 0%,#0b0e15 88%,#0b0e1500 100%);font-family:-apple-system,Segoe UI,sans-serif;';
    t.innerHTML = "<div style='font-weight:900;font-size:${c.title}px;letter-spacing:4px;color:#fff;line-height:1'>PROM<span style=color:#ffd166>PT</span></div>"
      + "<div style='font-weight:700;font-size:${c.tag}px;color:#ffd166;margin-top:8px'>it does exactly what you said</div>";
    document.body.appendChild(t);
  `,
  autopilot: `
     armed = true; document.getElementById('hint').classList.add('gone');
     /* Levels 4-6 (the mazes), each with a program verified against the shipped
        interpreter by tools/verify-prompt-reel.js -- an autopilot that fails its
        own level would be advertising a broken game. Levels 1-3 are corridors:
        correct, but they film as three cells and a dot. */
     var REEL = [
       { lvl: 3, ops: ['RIGHT','UNTIL WALL','LEFT','UNTIL WALL'] },
       { lvl: 4, ops: ['RIGHT','UNTIL \u25c6','LEFT','UNTIL WALL','LEFT','UNTIL \u25c6','RIGHT','RIGHT','UNTIL WALL'] },
       { lvl: 5, ops: ['UNTIL \u25c6','UNTIL \u25c6','RIGHT','UNTIL WALL','RIGHT','UNTIL \u25c6','RIGHT','RIGHT','UNTIL WALL'] }
     ];
     window.__PM_REEL_DONE = false;
     var t0 = performance.now(), ri = 0;
     function playOne() {
       var r = REEL[ri % REEL.length];
       loadLevel(r.lvl); prog = [];
       var q = r.ops.slice();
       var typer = setInterval(function () {
         if (q.length) { addOp(q.shift()); return; }
         clearInterval(typer);
         startRun();
         var watch = setInterval(function () {
           if (!over) return;
           clearInterval(watch);
           ri++;
           if ((performance.now() - t0) / 1000 > 19) { window.__PM_REEL_DONE = true; return; }
           setTimeout(function () {
             document.getElementById('mdone').classList.remove('show');
             playOne();
           }, 900);
         }, 120);
       }, 280);
     }
     playOne();`
};
