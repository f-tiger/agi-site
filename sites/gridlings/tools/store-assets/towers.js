/* Store-asset config for TOWERS — consumed by tools/capture-store-assets.js.
 *
 * First puzzle in this directory; the seven before it are all action games. Two
 * differences worth knowing before copying it for trail, starbattle and the rest:
 *
 *  - Covers come from `poster`, so no game instance is needed and `ONLY=covers`
 *    runs without a browser autopilot at all.
 *  - `videos` / `autopilot` are deliberately NOT implemented here. A trailer for a
 *    deduction puzzle needs something that solves a board on camera at a watchable
 *    pace, which is a different job from the action games' "drive the input state"
 *    autopilots. Playgama's MCP has no video or screenshot upload anyway, so the
 *    covers are what can actually be delivered today.
 *
 * The hero is the rule itself, drawn honestly: heights 2,4,1,5,3 seen from the
 * left. You see the 2, then the 4 clears it, the 1 hides behind, the 5 clears
 * everything, and the 3 hides. Three towers visible, so the clue reads 3 — the
 * same count the game would compute for that line.
 */
const KLEIN = "#002FA7";      /* the game's own theme-color, straight from towers.html */
const AMBER = "#FFB020";      /* what you can see */
const SHADE = "#0B1F63";      /* what is hidden behind something taller */

const tower = (x, h, visible) => {
  const W = 26, U = 26, GROUND = 172, top = GROUND - h * U;
  const face = visible ? AMBER : SHADE;
  const roof = visible ? "#FFD36B" : "#14307F";
  let windows = "";
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < 2; c++) {
      const wy = GROUND - (r + 1) * U + 7, wx = x + 5 + c * 11;
      windows += `<rect x="${wx}" y="${wy}" width="7" height="11" rx="1.5" fill="${visible ? "#7A4A00" : "#061243"}" opacity="${visible ? .55 : .75}"/>`;
    }
  }
  return `<g><rect x="${x}" y="${top}" width="${W}" height="${h * U}" fill="${face}" stroke="#08133F" stroke-width="3" stroke-linejoin="round"/>`
       + `<rect x="${x - 2}" y="${top - 6}" width="${W + 4}" height="8" rx="2" fill="${roof}" stroke="#08133F" stroke-width="3" stroke-linejoin="round"/>`
       + windows + `</g>`;
};

/* heights 2,4,1,5,3 — visible: the 2, the 4 and the 5 */
const SKYLINE = [[46, 2, true], [76, 4, true], [106, 1, false], [136, 5, true], [166, 3, false]]
  .map(([x, h, v]) => tower(x, h, v)).join("");

module.exports = {
  readyExpr: "document.getElementById('grid') && document.getElementById('grid').children.length > 0",
  covers: [
    { name: "landscape", w: 1920, h: 1080, title: 110, tag: 34 },
    { name: "portrait", w: 1080, h: 1920, title: 64, tag: 22 },
    { name: "square", w: 800, h: 800, title: 66, tag: 19 }
  ],

  poster: (c) => require("./_poster.js")(c, {
    fontFace: require("./_fonts.js").bungee, family: "'Bungee'", titleScale: .82, tagScale: 1.05,
    /* Klein blue full bleed, because that is the colour the game already is and it
       is the loudest thing on a portal page full of dark thumbnails. */
    ground: () => `radial-gradient(120% 90% at 50% 18%, #1A47C7 0%, ${KLEIN} 55%, #001B63 100%)`,
    rays: "rgba(255,255,255,.07)",
    ink: "#FFFFFF", ink2: AMBER, outline: "#08133F", shadow: "#08133F", tagInk: "#CFE0FF",
    word: "TOW<em>ERS</em>", tagline: "EDGE CLUES COUNT WHAT YOU CAN SEE",
    heroScale: .96,
    hero: `<svg viewBox="0 0 200 200">
<line x1="14" y1="172" x2="196" y2="172" stroke="#08133F" stroke-width="4" stroke-linecap="round"/>
${SKYLINE}
<g>
  <rect x="6" y="96" width="30" height="30" rx="7" fill="#FFFFFF" stroke="#08133F" stroke-width="3.5"/>
  <text x="21" y="118" font-family="Bungee,Impact,sans-serif" font-size="20" text-anchor="middle" fill="${KLEIN}">3</text>
</g>
<path d="M38 111 H188" stroke="#FFFFFF" stroke-width="2.6" stroke-dasharray="5 6" stroke-linecap="round" opacity=".85"/>
<path d="M188 111 l-11 -6 v12 z" fill="#FFFFFF"/>
</svg>`
  })
};
