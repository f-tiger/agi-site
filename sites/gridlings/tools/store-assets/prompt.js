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
    { name: "portrait", w: 1080, h: 1920, title: 64, tag: 22 },
    { name: "square", w: 800, h: 800, title: 66, tag: 19 }
  ],
  videos: [
    { name: "landscape", rec: { w: 1280, h: 720 }, out: { w: 1920, h: 1080 } },
    { name: "portrait", rec: { w: 540, h: 960 }, out: { w: 1080, h: 1920 } }
  ],

  /* Poster tile. Ground = the game's own bot-yellow, turned up to full bleed; the
     wordmark is navy with a white stroke and a hard shadow; the hero is the
     machine on a tilted slab of its own grid with one gem and the exit. */
  poster: (c) => {
    const FACE = require('./_fonts.js').fredoka;
    const W = c.w, H = c.h, port = H > W * 1.1, sq = Math.abs(W - H) < W * .1;
    const vm = Math.min(W, H);
    const title = sq ? vm * .19 : port ? vm * .19 : vm * .27;
    const tag = title * .18;
    const slab = sq ? vm * .66 : port ? vm * .84 : vm * .63;   /* 16:9: leaves room under the tagline */
    /* outline built from eight text-shadows: -webkit-text-stroke with paint-order
       rendered nothing visible in the first pass */
    const o = Math.max(2, Math.round(title * .045));
    const ring = [[o,0],[-o,0],[0,o],[0,-o],[o,o],[-o,o],[o,-o],[-o,-o]].map(([x,y]) => `${x}px ${y}px 0 #fff`).join(",");
    const drop = `, 0 ${Math.round(title*.07)}px 0 #1b2a6b, 0 ${Math.round(title*.12)}px ${Math.round(title*.10)}px rgba(40,20,0,.35)`;
    const wordTopPx = Math.round((port ? .68 : sq ? .64 : .06) * H);
    /* tagline hangs off the wordmark's real box (this word is set at title*1.08)
       -- the old fixed 31% sat inside the letters' drop shadow on 16:9 */
    const tagTopPx = Math.round(wordTopPx + title * 1.08 * 1.04 + o + title * .07 + title * .04);
    const wordTop = wordTopPx + "px", tagTop = tagTopPx + "px";
    const slabTop = port ? "36%" : sq ? "36%" : "70%";
    return `<!doctype html><html><head><meta charset="utf-8"><style>${FACE}
      html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;
        font-family:'Fredoka One',-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;}
      body{background:
        radial-gradient(${W*.9}px ${H*.9}px at 70% 30%, #ffe08a 0%, #ffd166 38%, #ffb347 72%, #ff9a3c 100%);}
      .rays{position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg,
        rgba(255,255,255,.14) 0 9deg, rgba(255,255,255,0) 9deg 22deg);}
      .slab{position:absolute;left:50%;top:${slabTop};width:${slab}px;height:${slab*.6}px;
        transform:translate(-50%,-50%) rotate(-7deg);background:#0b0e15;border-radius:${slab*.05}px;
        box-shadow:0 ${slab*.06}px 0 #1b2a6b, 0 ${slab*.14}px ${slab*.16}px rgba(40,20,0,.35);
        display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(3,1fr);gap:${slab*.014}px;padding:${slab*.04}px;box-sizing:border-box;}
      .c{background:rgba(255,255,255,.05);border-radius:${slab*.014}px;position:relative;}
      .c.w{background:rgba(126,145,190,.38);}
      .bot{position:absolute;inset:4%;}
      .gem{position:absolute;inset:10%;}
      .x{position:absolute;inset:16%;}
      .word{position:absolute;left:0;right:0;top:${wordTop};text-align:center;
        font-weight:400;font-size:${title*1.08}px;line-height:1;letter-spacing:${title*.03}px;color:#0b0e15;
        text-shadow:${ring}${drop};}
      .word em{font-style:normal;color:#1b2a6b;}
      .tag{position:absolute;left:0;right:0;top:${tagTop};text-align:center;
        font-weight:800;font-size:${tag}px;color:#0b0e15;letter-spacing:${tag*.05}px;
        text-shadow:0 1px 0 rgba(255,255,255,.55);}
    </style></head><body>
    <div class="rays"></div>
    <div class="slab">
      ${(() => { let g = ""; const wall = new Set([0,1,2,3,4, 10,11,12,13,14]);
        for (let i = 0; i < 15; i++) {
          let inner = "";
          if (i === 5) inner = `<svg class="bot" viewBox="0 0 100 100"><polygon points="10,10 96,50 10,90" fill="#ffd166" stroke="#0b0e15" stroke-width="7" stroke-linejoin="round"/></svg>`;
          if (i === 8) inner = `<svg class="gem" viewBox="0 0 100 100"><polygon points="50,4 96,50 50,96 4,50" fill="#8affc1" stroke="#0b0e15" stroke-width="7" stroke-linejoin="round"/></svg>`;
          if (i === 9) inner = `<svg class="x" viewBox="0 0 100 100"><path d="M16 16 84 84M84 16 16 84" stroke="#66d9ff" stroke-width="16" stroke-linecap="round"/></svg>`;
          if (i === 7) inner = `<svg class="x" viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="14" fill="#7a1f2a" stroke="#ff6b7a" stroke-width="6"/><path d="M14 86 86 14M-6 60 40 14M60 86 106 40" stroke="#ff6b7a" stroke-width="7" opacity=".55"/></svg>`;
          g += `<div class="c${wall.has(i) ? " w" : ""}">${inner}</div>`; }
        return g; })()}
    </div>
    <svg style="position:absolute;left:50%;top:${slabTop};width:${slab}px;height:${slab*.6}px;transform:translate(-50%,-50%) rotate(-7deg);overflow:visible" viewBox="0 0 500 300" fill="none">
      <path d="M62 150 H240 V90 H392" stroke="#7c9bff" stroke-width="9" stroke-linecap="round" stroke-dasharray="14 14"/>
      <circle cx="392" cy="90" r="26" stroke="#7c9bff" stroke-width="7"/>
    </svg>
    <div class="word">PROM<em>PT</em></div>
    <div class="tag">IT DOES EXACTLY WHAT YOU SAID</div>
    </body></html>`;
  },
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
       { lvl: 3, ops: ['SEEK \\u25c6','SEEK \\u2715'] },
       { lvl: 4, ops: ['RIGHT','UNTIL WALL','LEFT','UNTIL WALL','SEEK \\u25c6','SEEK \\u2715'] },
       { lvl: 5, ops: ['SEEK \\u25c6','LEFT','UNTIL WALL','SEEK \\u25c6','SEEK \\u2715'] }
     ];
     /* programs that MUST fail on the red tile -- the verifier asserts the trap
        actually traps, otherwise the level teaches nothing */
     var TRAPS = [
       { lvl: 4, ops: ['SEEK \\u25c6','SEEK \\u2715'] },
       { lvl: 5, ops: ['SEEK \\u25c6','SEEK \\u25c6','SEEK \\u2715'] }
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
