/* Inline win-screen email capture. The outbound beehiiv form converted 0/246
   on the main site; the inline stored-first form is the pattern that produced
   every real subscriber. Storage is first-party (D1 via /sub); the beehiiv
   anchor stays as fallback so a script or endpoint failure degrades to the
   old behaviour. No-ops entirely in clean/embed (licensing) mode. */
(function () {
  "use strict";
  if (window.GL_CLEAN === true || /(^|[?&])(clean|embed)=1/.test(location.search)) return;
  document.addEventListener("DOMContentLoaded", function () {
    var a = document.getElementById("subcta");
    if (!a) return;
    var zh = (document.documentElement.lang || "").indexOf("zh") === 0;
    var wrap = a.parentNode;

    function ev(n) {
      try {
        var b = JSON.stringify({ n: n, l: "", v: 0, p: location.pathname });
        navigator.sendBeacon ? navigator.sendBeacon("/e", b)
          : fetch("/e", { method: "POST", body: b, keepalive: true });
      } catch (e) {}
      try { window.gtag && gtag("event", n, { event_category: "sub", event_label: location.pathname }); } catch (e) {}
    }

    var form = document.createElement("form");
    form.style.cssText = "display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px";
    var inp = document.createElement("input");
    inp.type = "email";
    inp.required = true;
    inp.placeholder = zh ? "邮箱" : "your@email";
    inp.setAttribute("aria-label", "email");
    inp.style.cssText = "flex:1 1 170px;max-width:230px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink);font-size:.9rem";
    var btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "btn pri";
    btn.textContent = zh ? "新玩法上线时通知我" : "Notify me of new modes";
    form.appendChild(inp);
    form.appendChild(btn);
    var note = document.createElement("p");
    note.style.cssText = "margin:6px 0 4px;font-size:.78rem;color:var(--mut)";
    note.textContent = zh ? "只在新玩法上线时发一封，可随时退订。" : "One email when a new puzzle mode ships. Nothing else.";

    form.onsubmit = function (e) {
      e.preventDefault();
      ev("sub_submit");
      btn.disabled = true;
      fetch("/sub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inp.value, topic: location.pathname, lang: zh ? "zh" : "en" })
      }).then(function (r) {
        if (!r.ok) throw 0;
        ev("sub_ok");
        var d = document.createElement("p");
        d.style.cssText = "font-weight:600;margin:6px 0";
        d.textContent = zh ? "✓ 已登记——新玩法上线时你会收到一封邮件。" : "✓ You're on the list — one email when the next mode ships.";
        wrap.innerHTML = "";
        wrap.appendChild(d);
      }).catch(function () {
        ev("sub_fail");
        btn.disabled = false;
        btn.textContent = zh ? "失败了——用订阅页 →" : "Failed — use the subscribe page →";
        btn.type = "button";
        btn.onclick = function () { location.href = a.href; };
      });
    };

    a.textContent = zh ? "或使用 beehiiv 订阅页 →" : "or use the beehiiv page →";
    a.style.cssText = "font-size:.78rem;color:var(--mut)";
    wrap.insertBefore(form, a);
    wrap.insertBefore(note, a);
  });
})();
