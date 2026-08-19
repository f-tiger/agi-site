// Shared handler for the compact "Hitze-Radar" opt-in boxes injected into guide
// pages (build_structure.py, <!--EB_RADAR-->). Wires every form.eb-radar to the
// /api/subscribe endpoint. Same GDPR consent + double-opt-in-later model as the
// dedicated /hitze-radar.html page.
(function () {
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var T = {
    de: {
      invalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
      needConsent: "Bitte bestätige kurz die Einwilligung.",
      wait: "Einen Moment …",
      dup: "Du bist schon dabei — alles gut.",
      ok: "Geschafft! Wir melden uns vor der nächsten Hitzewelle.",
      fail: "Hat gerade nicht geklappt — bitte später nochmal.",
      net: "Netzwerkfehler — bitte später nochmal.",
      consentFallback: "Hitze-Radar Einwilligung",
    },
    en: {
      invalid: "Please enter a valid email address.",
      needConsent: "Please tick the consent box first.",
      wait: "One moment …",
      dup: "You're already on the list — all good.",
      ok: "Done! We'll email you before the next heatwave.",
      fail: "That didn't work just now — please try again later.",
      net: "Network error — please try again later.",
      consentFallback: "Heat Radar consent",
    },
  };
  function wire(form) {
    if (form.dataset.wired) return;
    form.dataset.wired = "1";
    var locale = form.getAttribute("data-locale") === "en" ? "en" : "de";
    var t = T[locale];
    var msg = form.querySelector(".eb-radar-msg");
    var btn = form.querySelector("button");
    var emailEl = form.querySelector('input[type="email"]');
    var consentEl = form.querySelector('input[type="checkbox"]');
    var consentTextEl = form.querySelector(".eb-radar-consent-text");
    function show(kind, text) {
      if (!msg) return;
      msg.textContent = text;
      msg.style.display = "block";
      msg.style.color = kind === "err" ? "#a12626" : "#1c6b34";
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (emailEl && emailEl.value || "").trim();
      var consent = consentEl && consentEl.checked;
      if (!EMAIL_RE.test(email)) { show("err", t.invalid); return; }
      if (!consent) { show("err", t.needConsent); return; }
      if (btn) btn.disabled = true;
      show("ok", t.wait);
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email, consent: true, locale: locale,
          topics: ["hitzewelle", "preis"],
          source: form.getAttribute("data-source") || ("guide:" + location.pathname),
          consent_text: consentTextEl ? consentTextEl.textContent.trim() : t.consentFallback
        })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok && res.d.ok) {
            show("ok", res.d.duplicate ? t.dup : t.ok);
            if (typeof gtag === "function") gtag("event", "subscribe", { method: "guide-inline", locale: locale });
            if (emailEl) emailEl.value = "";
          } else {
            show("err", t.fail);
            if (btn) btn.disabled = false;
          }
        })
        .catch(function () { show("err", t.net); if (btn) btn.disabled = false; });
    });
  }
  function init() {
    var forms = document.querySelectorAll("form.eb-radar");
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
