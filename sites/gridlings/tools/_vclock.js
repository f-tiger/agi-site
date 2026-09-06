/* Virtual clock for deterministic headless runs. Injected with addInitScript:
 * requestAnimationFrame, setTimeout/setInterval, performance.now and Date.now
 * advance ONLY when window.__tick(ms) is called, so a frame is a frame no matter
 * how loaded the machine is. Used by capture-store-assets.js (trailers) and
 * verify-minima.js (level verdicts must not depend on frame rate). */
module.exports = `(() => {
    let now = 0, timers = [], rafQ = [], tid = 1;
    const T0 = 1725580800000;
    performance.now = () => now; Date.now = () => T0 + now;
    window.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
    window.cancelAnimationFrame = () => {};
    window.setTimeout = (fn, ms, ...a) => { const id = tid++; timers.push({ id, at: now + Math.max(0, +ms || 0), fn, a, iv: 0 }); return id; };
    window.setInterval = (fn, ms, ...a) => { const id = tid++; const iv = Math.max(1, +ms || 1); timers.push({ id, at: now + iv, fn, a, iv }); return id; };
    window.clearTimeout = window.clearInterval = id => { timers = timers.filter(t => t.id !== id); };
    window.__tick = ms => {
      const target = now + ms;
      for (;;) {
        let due = null; for (const t of timers) if (t.at <= target && (!due || t.at < due.at)) due = t;
        if (!due) break;
        now = due.at;
        if (due.iv) due.at += due.iv; else timers = timers.filter(t => t !== due);
        try { typeof due.fn === "function" ? due.fn(...due.a) : (0, eval)(String(due.fn)); } catch (e) { console.error("timer", e); }
      }
      now = target;
      const q = rafQ.splice(0); for (const cb of q) { try { cb(now); } catch (e) { console.error("raf", e); } }
    };
  })();`;
