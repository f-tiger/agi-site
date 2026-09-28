/* DollScout shared behavior: nav, footer year, first-party beacons.
   The 18+ age gate that lived here died with the adult site (2026-08-30
   pivot) — nothing on this site needs gating. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(nav.classList.contains("open")));
      });
    }
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    /* analytics.js listens for this; the age gate that used to fire it is gone,
       so fire it unconditionally. */
    try { document.dispatchEvent(new Event("ds:consented")); } catch (e) {}
  });
})();

/* First-party beacons (2026-08-19, unchanged across the pivot). D1
   `dollscout-events`, endpoint /api/ev. Two things and only two: a pageview
   (the real-reader line — crawlers never run JS) and affiliate_click (the
   revenue event). No cookies, no IDs; referrers/targets are reduced to a
   hostname at the edge. Fail-silent: analytics must never break a page or a
   click. */
(function () {
  function send(ev, ref) {
    try {
      var payload = JSON.stringify({ p: location.pathname, r: ref || "", e: ev || "" });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", payload);
      else fetch("/api/ev", { method: "POST", body: payload, keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  send("", document.referrer);
  document.addEventListener("click", function (evt) {
    var a = evt.target && evt.target.closest && evt.target.closest("a[rel~='sponsored']");
    if (a && a.href) send("affiliate_click", a.href);
  }, true);
})();

