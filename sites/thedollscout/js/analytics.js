/* GA4, configured to stay consistent with what our privacy policy promises.
   Deliberate choices:
     - client_storage: 'none'  → no cookies at all, so the "we set no tracking
       cookies" claim stays true and no consent banner is required. The cost is
       that returning visitors look like new ones; page and event analysis still
       work, cohort and retention analysis does not.
     - Google signals and ad personalisation are off. This is measurement, not
       advertising.
     - Nothing fires until the visitor passes the 18+ gate.
   With no measurement ID configured, every call here is a no-op. */
(function () {
  "use strict";

  var queued = [];
  var ready = false;

  function boot() {
    var id = (window.DS_CONFIG && window.DS_CONFIG.ga4Id) || "";
    if (!id || ready) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    /* analytics_storage is GRANTED on purpose — do not "tighten" this back to
       denied. It reads like the private choice and it is not: denying it puts
       GA4 into consent mode, where hits become cookieless modelling pings
       that never reach the standard reports. Modelling only produces numbers
       above substantial traffic thresholds, so on a site this size denying it
       means the property reports nothing at all, permanently.

       The no-cookie promise is kept by client_storage: 'none' below, which is
       the setting that actually governs storage. Granting analytics_storage
       while client_storage is none means: full events sent, nothing written to
       the device. Ad storage stays denied because we run no advertising. */
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted"
    });
    window.gtag("config", id, {
      client_storage: "none",
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(s);

    ready = true;
    queued.splice(0).forEach(function (a) { window.gtag("event", a[0], a[1]); });
  }

  /* Public helper. Safe to call from anywhere, before or after boot. */
  window.dsTrack = function (name, params) {
    if (!(window.DS_CONFIG && window.DS_CONFIG.ga4Id)) return;
    if (!ready) { queued.push([name, params || {}]); return; }
    window.gtag("event", name, params || {});
  };

  /* main.js dispatches this once the age gate is satisfied. */
  window.addEventListener("ds:age-verified", boot);

  document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("ds_age_ok") === "1") boot();

    /* Outbound affiliate clicks — the event that actually maps to revenue. */
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[rel~='sponsored']");
      if (!a) return;
      var host = "";
      try { host = new URL(a.href).hostname.replace(/^www\./, ""); } catch (err) { return; }
      window.dsTrack("affiliate_click", {
        vendor: host,
        location: a.closest(".hot-card") ? "bestsellers"
          : a.closest(".promo-banner") ? "banner"
          : a.closest(".pcard") ? "product_card"
          : a.closest(".quiz-result") ? "quiz_result"
          : a.closest(".prose") ? "article" : "other",
        page_path: location.pathname
      });
    }, true);

    /* Share buttons — rendered by share.js, so bind by delegation rather than
       per-button, and label by the button text we already render. */
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".share-btn");
      if (!b) return;
      window.dsTrack("share_clicked", {
        network: (b.textContent || "").replace(/[^a-z]/gi, "").toLowerCase() || "unknown",
        page_path: location.pathname
      });
    }, true);

    /* Print is the completion signal for the checklist. */
    if (location.pathname.indexOf("/checklist") === 0) {
      window.addEventListener("beforeprint", function () {
        window.dsTrack("checklist_printed", { page_path: location.pathname });
      });
    }
  });
})();
