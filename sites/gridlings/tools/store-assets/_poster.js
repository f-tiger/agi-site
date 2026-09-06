/* Shared poster-tile recipe. Every tile that ranks on the portal home page is the
 * same construction: a saturated full-bleed ground, an outlined wordmark across
 * roughly half the width with a hard drop shadow, one hero object blown up, and
 * no HUD or small text. This builds the frame; each game supplies its own
 * ground colours, wordmark and hero SVG. The eight-shadow outline is used
 * because -webkit-text-stroke + paint-order rendered nothing visible. */
module.exports = function poster(c, o) {
  const W = c.w, H = c.h, port = H > W * 1.1, sq = Math.abs(W - H) < W * .1;
  const vm = Math.min(W, H);
  const title = (sq ? .19 : port ? .19 : .27) * vm * (o.titleScale || 1);
  const tag = title * .18 * (o.tagScale || 1);   /* o.tagScale: keep the tagline readable when the wordmark is set small */
  const hero = (sq ? .66 : port ? .84 : .70) * vm * (o.heroScale || 1);
  const ol = Math.max(2, Math.round(title * .045));
  const ring = [[ol,0],[-ol,0],[0,ol],[0,-ol],[ol,ol],[-ol,ol],[ol,-ol],[-ol,-ol]].map(([x,y]) => `${x}px ${y}px 0 ${o.outline}`).join(",");
  const drop = `, 0 ${Math.round(title*.07)}px 0 ${o.shadow}, 0 ${Math.round(title*.12)}px ${Math.round(title*.10)}px rgba(0,0,0,.35)`;
  const wordTopPx = Math.round((port ? .68 : sq ? .64 : .06) * H);
  /* the tagline hangs off the wordmark's real box (font size + outline ring +
     hard drop) instead of a fixed percentage -- at the landscape title size the
     percentage put it inside the letters' drop shadow */
  const tagTopPx = Math.round(wordTopPx + title * 1.04 * (o.lines || 1) + ol + title * .07 + title * .04);   /* o.lines: wordmark height in line-heights when it wraps on purpose */
  const wordTop = wordTopPx + "px", tagTop = tagTopPx + "px";
  const heroTop = port ? "36%" : sq ? "36%" : "66%";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${o.fontFace || ""}
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;font-family:${o.family ? o.family + "," : ""}-apple-system,BlinkMacSystemFont,"Segoe UI","Arial Black",Arial,sans-serif;}
    body{background:${o.ground(W, H)};}
    .rays{position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg,${o.rays || "rgba(255,255,255,.12)"} 0 9deg,rgba(255,255,255,0) 9deg 22deg);}
    .hero{position:absolute;left:50%;top:${heroTop};width:${hero}px;height:${hero}px;transform:translate(-50%,-50%);}
    .hero svg{width:100%;height:100%;overflow:visible;}
    .word{position:absolute;left:0;right:0;top:${wordTop};text-align:center;white-space:${o.nowrap ? "nowrap" : "normal"};font-weight:${o.fontFace ? 400 : 900};font-size:${title}px;line-height:1;letter-spacing:${title*.02}px;color:${o.ink};text-shadow:${ring}${drop};}
    .word em{font-style:normal;color:${o.ink2};}
    .tag{position:absolute;left:0;right:0;top:${tagTop};text-align:center;font-weight:800;font-size:${tag}px;color:${o.tagInk};letter-spacing:${tag*.05}px;text-shadow:0 1px 0 rgba(255,255,255,.35);}
  </style></head><body>
  ${o.rays === null ? "" : '<div class="rays"></div>'}
  <div class="hero">${o.hero}</div>
  <div class="word">${o.word}</div>
  <div class="tag">${o.tagline}</div>
  </body></html>`;
};
