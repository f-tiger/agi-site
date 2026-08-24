/* Shared win-path drivers for all 11 games (2026-08-24, pre-portal deep QA).
   Used by browser-smoke.js (live source tree) AND package-smoke.js (extracted
   zip artifacts) so the thing we verify is the thing that ships. Each driver
   takes (page, puzzle) with the page already showing the board (intro
   dismissed) and drives to the win screen using the baked solution. */

async function cells(page) { return page.$$("#grid button.cell, #grid .cell"); }

async function clickTimes(page, idx, times) {
  for (let k = 0; k < times; k++) {
    const cs = await cells(page);           // re-query: clients re-render per tap
    await cs[idx].click();
  }
}

const drivers = {
  // tap cell to select, then tap palette button (animal a, color c) = index a*n+c
  async gridlings(page, p) {
    const n = +p.n;
    for (let i = 0; i < n * n; i++) {
      if (p.m[i] === "1") continue;
      const cs = await cells(page);
      // after a pair is placed the client auto-selects the next empty cell —
      // clicking an already-selected cell would DESELECT it (cellTap toggles)
      const isSel = await cs[i].evaluate(el => el.classList.contains("sel"));
      if (!isSel) await cs[i].click();
      const pal = await page.$$("#palette .pal");
      await pal[(+p.a[i]) * n + (+p.c[i])].click();
    }
  },
  // cycle empty→☀(0)→🌙(1)
  async balance(page, p) {
    for (let i = 0; i < p.s.length; i++) {
      if (p.m[i] === "1") continue;
      await clickTimes(page, i, (+p.s[i]) + 1);
    }
  },
  // one tap places a star; only sol cells need touching
  async starbattle(page, p) {
    for (let i = 0; i < p.sol.length; i++) {
      if (p.sol[i] === "1") await clickTimes(page, i, 1);
    }
  },
  // tap the path cell-by-cell in solution order (sol = 2-digit cell indices)
  async trail(page, p) {
    for (let k = 0; k < p.sol.length; k += 2) {
      await clickTimes(page, parseInt(p.sol.slice(k, k + 2), 10), 1);
    }
  },
  // latin-family: tap cell sol[i] times (cycle 1..n)
  async latin(page, p) {
    for (let i = 0; i < p.sol.length; i++) {
      if (p.g[i] !== "0") continue;
      await clickTimes(page, i, parseInt(p.sol[i], 10));
    }
  },
  // thermometers: click the cell at each thermometer's solution level
  async thermo(page, p) {
    const thermos = p.t.split(";").map(seg => {
      const t = []; for (let i = 0; i < seg.length; i += 2) t.push([+seg[i], +seg[i + 1]]); return t;
    });
    for (const t of thermos) {
      let lv = 0;
      while (lv < t.length && p.sol[t[lv][0] * p.n + t[lv][1]] === "1") lv++;
      if (lv === 0) continue;
      await clickTimes(page, t[lv - 1][0] * p.n + t[lv - 1][1], 1);
    }
  },
  // nonogram: click every solution-filled cell once
  async nonogram(page, p) {
    for (let i = 0; i < p.sol.length; i++) {
      if (p.sol[i] === "1") await clickTimes(page, i, 1);
    }
  },
};

// family per game slug + which json holds its boards
const GAME_DRIVERS = {
  gridlings:  { json: "puzzles-daily.json",    drive: drivers.gridlings },
  balance:    { json: "balance-daily.json",    drive: drivers.balance },
  starbattle: { json: "starbattle-daily.json", drive: drivers.starbattle },
  trail:      { json: "trail-daily.json",      drive: drivers.trail },
  futoshiki:  { json: "futoshiki-daily.json",  drive: drivers.latin },
  towers:     { json: "towers-daily.json",     drive: drivers.latin },
  minisudoku: { json: "minisudoku-daily.json", drive: drivers.latin },
  kropki:     { json: "kropki-daily.json",     drive: drivers.latin },
  sandwich:   { json: "sandwich-daily.json",   drive: drivers.latin },
  thermo:     { json: "thermo-daily.json",     drive: drivers.thermo },
  nonogram:   { json: "nonogram-daily.json",   drive: drivers.nonogram },
};

async function dismissIntro(page) {
  try {
    const ov = await page.$("#frov");
    if (ov) { await page.click("#frov button.btn.pri"); await page.waitForSelector("#frov", { state: "detached", timeout: 2000 }); }
  } catch (e) {}
}

module.exports = { GAME_DRIVERS, dismissIntro };
