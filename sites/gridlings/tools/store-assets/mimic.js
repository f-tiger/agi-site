/* Store-asset config for MIMIC — consumed by tools/capture-store-assets.js.
 *
 * The autopilot must DEMONSTRATE the mechanic, not merely survive, and it plays
 * honestly: no extra lives, no invulnerability, no faked state. A trailer of
 * cheated gameplay misrepresents the product.
 */
module.exports = {
  readyExpr: "window.MC_READY === true",
  startSelector: null,
  probeExpr: `(() => ({ score: typeof score === 'undefined' ? null : score,
                        over: typeof over === 'undefined' ? null : over }))()`,
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
    document.querySelector('.pad').style.display='none';
    document.querySelector('footer').style.display='none';
    ruleTrait='spiky'; ruleKeepWhen=true; score=1240;
    labels=[]; [[1,1,1],[0,0,0],[1,0,1],[0,1,0],[1,1,1],[0,0,0]].forEach(function(a){
      labels.push({s:{spiky:!!a[0],warm:!!a[1],wob:Math.random()*7,n:4},keep:!!a[2]}); });
    cur={spiky:true,warm:false,wob:1.2,n:5}; phase='train';
    burst(L.cx,L.cy,'#38d9c4',26); popText('KEEP',L.cx,L.cy-58,19,'#38d9c4');
    var t = document.createElement('div');
    t.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;z-index:60;pointer-events:none;padding:${c.title*0.35}px 0 ${c.title*0.6}px;background:linear-gradient(180deg,#0a0d14 0%,#0a0d14 88%,#0a0d1400 100%);font-family:-apple-system,Segoe UI,sans-serif;';
    t.innerHTML = "<div style='font-weight:900;font-size:${c.title}px;letter-spacing:4px;color:#fff;line-height:1'>MI<span style=color:#ff6b9d>MIC</span></div>"
      + "<div style='font-weight:700;font-size:${c.tag}px;color:#38d9c4;margin-top:8px'>you are the training data</div>";
    document.body.appendChild(t);
  `,
  autopilot: `
     armed = true; document.getElementById('hint').classList.add('gone');
     /* Fixed rule so the reel is reproducible; the specimens themselves are the
        game's own mkSpec() output, unmodified. */
     ruleTrait='spiky'; ruleKeepWhen=true;

     /* Draw a real 6-specimen training run, redrawing the SEQUENCE until it
        contains at least one counterexample (spiky and warm disagree). Without
        one, six labels are explained equally well by either trait and train()
        tie-breaks on a coin flip -- so half the trailers would film a correctly
        taught model failing its own exam. This picks a seed, it does not alter
        a specimen or the model. */
     /* every name here is ap-prefixed: page.evaluate runs in GLOBAL scope, and a
        plain \`var draw\` silently replaced the game's own draw() -- the render
        loop died and the exam scored nothing while looking almost fine */
     var apSeed = null;
     for (var apA = 0; apA < 400 && !apSeed; apA++) {
       var apDraw = []; for (var apI = 0; apI < 6; apI++) apDraw.push(mkSpec(true));
       /* only the specimens the plan below actually LABELS can teach anything --
          index 2 is the one it skips, and a run whose sole counterexample landed
          there taught a coin flip and filmed the model failing its own exam */
       if ([0,1,3,4,5].some(function (n) { return apDraw[n].spiky !== apDraw[n].warm; })) apSeed = apDraw;
     }
     var apRest = []; for (var apK = 0; apK < 40; apK++) apRest.push(mkSpec(true));
     trainQ = apSeed.slice(1).concat(apRest);
     testQ = []; for (var apJ = 0; apJ < 26; apJ++) testQ.push(mkSpec(false));
     cur = apSeed[0];
     labels = [];

     /* Label truthfully, skipping once mid-run so the reel shows that skipping
        exists and is free -- then sit the exam early and bank the unused-label
        bonus, which is the strategy the game is actually about. */
     var apPlan = ['label','label','skip','label','label','label','skip','label'], apP = 0;
     var apIv = setInterval(function () {
       if (typeof phase === 'undefined' || phase !== 'train') { clearInterval(apIv); return; }
       var apStep = apPlan[apP++] || 'label';
       if (apStep === 'skip') { decide('skip'); return; }
       decide(cur.truth ? 'keep' : 'reject');
       if (labels.length >= 6) { clearInterval(apIv); setTimeout(function () { startExam(); }, 700); }
     }, 480);`
};
