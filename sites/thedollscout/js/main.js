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
   (a browser action, not a unique person) and affiliate_click (a merchant
   click, not revenue). No cookies, no IDs; referrers/targets are reduced to a
   hostname at the edge. Fail-silent: analytics must never break a page or a
   click. */
(function () {
  function send(ev, ref) {
    try {
      var params = new URLSearchParams(location.search);
      if (location.hostname !== 'thedollscout.com' || window.top !== window.self ||
          ['ci','__ci','__probe','qa','__qa'].some(function (key) { return params.has(key); }) ||
          params.get('utm_source') === 'verify' || location.pathname.startsWith('/__ci') ||
          navigator.webdriver || /bot|crawler|spider|headless/i.test(navigator.userAgent) ||
          navigator.globalPrivacyControl || navigator.doNotTrack === '1' ||
          localStorage.getItem('tds_analytics_choice_v1') === 'denied') return;
      var source = ''; try { source = ref ? new URL(ref).origin : ''; } catch (_) {}
      var payload = JSON.stringify({ p: location.pathname, r: source, e: ev || "" });
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

