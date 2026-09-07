/* Store-asset config for OVERSEER — consumed by tools/capture-store-assets.js.
 *
 * The autopilot must DEMONSTRATE the mechanic, not merely survive, and it plays
 * honestly: no extra lives, no invulnerability, no faked state. A trailer of
 * cheated gameplay misrepresents the product.
 */
module.exports = {
  readyExpr: "window.OS_READY === true",
  startSelector: null,
  probeExpr: `(() => ({ score: typeof score === 'undefined' ? null : score,
                        over: typeof over === 'undefined' ? null : over }))()`,
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
    ground: (W, H) => `radial-gradient(${W*.9}px ${H*.9}px at 60% 30%, #b3ffd9 0%, #61e8b0 38%, #2fb98a 72%, #135b45 100%)`,
    ink: "#03261c", ink2: "#ffcc57", outline: "#ffffff", shadow: "#0d4a3a", tagInk: "#03261c",
    fontFace: require("./_fonts.js").bungee, family: "'Bungee'", titleScale: 0.82,
    word: "OVER<em>SEER</em>", tagline: "YOU APPROVE BY DOING NOTHING",
    /* the wall of monitors from the game, eye-free: rovers with headlamps, pads,
       one rover veering off, the HALT stamp slammed over it */
    hero: `<svg viewBox="0 0 200 200"><defs>
<linearGradient id="bz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3859"/><stop offset="1" stop-color="#121a2c"/></linearGradient>
<radialGradient id="sc" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#16294a"/><stop offset="1" stop-color="#080d18"/></radialGradient>
<linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8d0ff"/><stop offset="1" stop-color="#4d70d8"/></linearGradient></defs>
<g><rect x="4" y="34" width="58" height="132" rx="10" fill="#04070e"/><rect x="4" y="28" width="58" height="132" rx="10" fill="url(#bz)" stroke="#03261c" stroke-width="3"/><rect x="10" y="34" width="46" height="106" rx="6" fill="url(#sc)"/>
<rect x="71" y="24" width="58" height="142" rx="10" fill="#04070e"/><rect x="71" y="18" width="58" height="142" rx="10" fill="url(#bz)" stroke="#ffcc57" stroke-width="4"/><rect x="77" y="24" width="46" height="116" rx="6" fill="url(#sc)"/>
<rect x="138" y="34" width="58" height="132" rx="10" fill="#04070e"/><rect x="138" y="28" width="58" height="132" rx="10" fill="url(#bz)" stroke="#03261c" stroke-width="3"/><rect x="144" y="34" width="46" height="106" rx="6" fill="url(#sc)"/></g>
<g fill="none" stroke="#61e8b0" stroke-width="3"><circle cx="33" cy="50" r="8"/><circle cx="100" cy="42" r="8"/><circle cx="167" cy="50" r="8"/></g>
<g fill="#61e8b0"><circle cx="33" cy="50" r="2.5"/><circle cx="100" cy="42" r="2.5"/><circle cx="167" cy="50" r="2.5"/></g>
<g fill="none" stroke-linecap="round" stroke-width="4"><path d="M33 130 C31 105 36 80 33 66" stroke="#9db4ff"/><path d="M167 130 C169 105 164 80 167 66" stroke="#9db4ff"/><path d="M100 132 C100 108 108 92 116 78" stroke="#ff5470"/></g>
<g fill="#fff4d6" opacity=".2"><path d="M29 58 L22 38 L44 38 L37 58Z"/><path d="M163 58 L156 38 L178 38 L171 58Z"/><path transform="rotate(-55 118 74)" d="M112 66 L104 48 L128 48 L124 66Z"/></g>
<g stroke="#06101c" stroke-width="2"><rect x="25" y="58" width="16" height="12" rx="3.5" fill="url(#rv)"/><rect x="159" y="58" width="16" height="12" rx="3.5" fill="url(#rv)"/><g transform="rotate(-55 118 74)"><rect x="110" y="68" width="16" height="12" rx="3.5" fill="url(#rv)"/></g></g>
<g fill="#61e8b0"><rect x="30" y="61" width="6" height="6" rx="1.5"/><rect x="164" y="61" width="6" height="6" rx="1.5"/></g>
<g transform="translate(100 118) rotate(-12)"><polygon points="-27,-11 -11,-27 11,-27 27,-11 27,11 11,27 -11,27 -27,11" fill="#ff5470" fill-opacity=".25" stroke="#ff5470" stroke-width="6" stroke-linejoin="round"/><text x="0" y="7" text-anchor="middle" font-family="Bungee,Arial Black,Arial,sans-serif" font-size="16" fill="#fff">HALT</text></g>
<g fill="#61e8b0"><rect x="12" y="146" width="10" height="10" rx="2"/><rect x="79" y="146" width="10" height="10" rx="2"/><rect x="146" y="146" width="10" height="10" rx="2"/></g>
<g fill="rgba(255,255,255,.35)"><rect x="26" y="149" width="26" height="4" rx="2"/><rect x="93" y="149" width="26" height="4" rx="2"/><rect x="160" y="149" width="26" height="4" rx="2"/></g></svg>`
  }),
  stage: (c) => `
    armed = true; document.getElementById('hint').style.display='none';
    document.querySelector('header').style.display='none';
    document.querySelector('footer').style.display='none';
    /* The title band sits over the top row of cards and ate their task names.
       Push the canvas below it and re-run the game's own layout() so the grid
       is recomputed for the smaller arena -- cheaper than shrinking the title
       until it fits, and nothing ends up hidden. */
    (function(){ var band = ${c.title} * 1.95 + ${c.tag} + 16;
      var st = document.getElementById('stage'), h = st.getBoundingClientRect().height;
      /* height must be pinned too: the canvas is flex:1 but carries an intrinsic
         height, so a margin alone pushed the bottom row off the frame */
      st.style.flex = 'none'; st.style.marginTop = band + 'px';
      st.style.height = (h - band) + 'px';
      layout(); })();
    quota=0; score=1480; agents=[];
    /* How many agents fill the grid depends on the frame: cardRects() picks its
       column count from the arena's aspect, so a fixed 6 or 8 leaves a dead
       quadrant on one cover shape and a ragged last row on another. Ask the
       game's own layout which counts tile exactly, and take the largest. */
    function osFills(n) {
      var r = cardRects(n); if (!r.length) return false;
      var cols = r.filter(function (q) { return q.y === r[0].y; }).length;
      return n % cols === 0;
    }
    var osN = 8; for (var osT = 9; osT >= 4; osT--) { if (osFills(osT)) { osN = osT; break; } }
    for (var i=0;i<osN;i++){ var a=mkAgent(i); a.bad=(i%2===1);
      if(!a.bad){a.ax=a.tx;a.ay=a.ty;} else {var ang=(i%2?1:-1)*(0.8+i*0.3),gp=0.40;
        a.ax=Math.max(.08,Math.min(.92,a.tx+Math.sin(ang)*gp));
        a.ay=Math.max(.10,Math.min(.62,a.ty+Math.cos(ang)*gp*.45)); }
      a.trail=[]; a.prog=.04+i*0.015; a.speed=.30; agents.push(a); }
    for (var k=0;k<130;k++) update(0.016);
    /* Then exactly ONE popup, on one misaligned card: the whole game is "spot
       the one that isn't going where you sent it", and a still frame has to say
       that. Clearing the rest keeps it from reading as UI noise. Placed low in
       the card so it does not sit on the task name. */
    pops=[];
    (function(){ var R=cardRects(agents.length)[Math.min(5, agents.length-1)];
      popText("+25 CAUGHT", R.x+R.w*0.5, R.y+R.h*0.86, 17, "#61e8b0"); })();
    var t = document.createElement('div');
    t.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;z-index:60;pointer-events:none;padding:${c.title*0.35}px 0 ${c.title*0.6}px;background:linear-gradient(180deg,#080b12 0%,#080b12 88%,#080b1200 100%);font-family:Bungee,Impact,sans-serif;';
    t.innerHTML = "<div style='font-weight:400;font-size:${c.title}px;letter-spacing:2px;color:#fff;line-height:1'>OVER<span style=color:#61e8b0>SEER</span></div>"
      + "<div style='font-weight:400;font-size:${c.tag}px;color:#61e8b0;margin-top:8px'>you approve by doing nothing</div>";
    document.body.appendChild(t);
  `,
  autopilot: `
     armed = true; document.getElementById('hint').classList.add('gone');
     /* Open on SHIFT 5 rather than SHIFT 1. Not a cheat -- it is the ordinary
        state of the game about a minute in, with the same rules, lives and
        scoring; shift 1 spawns three agents total and films as an empty screen
        with one card on it. */
     wave = 4; startWave();
     /* An honest overseer: it never reads a.bad (the ground truth). It watches
        each agent's distance to its OWN stated objective and halts the ones
        where that distance has STOPPED SHRINKING while the agent is still far
        from the objective -- a misaligned agent converges on its own attractor
        and plateaus a gap short, an aligned one keeps closing until it arrives.
        (Two earlier rules failed: "fraction of the gap closed" halts aligned
        agents that are merely early, and plain "is it closing" cannot tell an
        arrival from a drift.) */
     var osSeen = new WeakMap();
     var osIv = setInterval(function () {
       if (typeof over !== 'undefined' && over) { clearInterval(osIv); return; }
       agents.forEach(function (a) {
         if (a.done) return;
         var d = Math.hypot(a.x - a.tx, a.y - a.ty);
         var prev = osSeen.get(a);
         osSeen.set(a, d);
         if (prev === undefined || a.prog < 0.22) return;
         if (d > 0.12 && prev - d < 0.010) halt(a);   /* plateaued, and not there */
       });
     }, 200);`
};
