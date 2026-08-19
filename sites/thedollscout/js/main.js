/* DollScout shared behavior: age gate, nav, affiliate link wiring, newsletter, quiz. */
(function () {
  "use strict";

  /* ---------- 18+ age gate ---------- */
  var AGE_KEY = "ds_age_ok";
  function buildGate() {
    if (localStorage.getItem(AGE_KEY) === "1") return;
    var gate = document.createElement("div");
    gate.className = "age-gate";
    gate.innerHTML =
      '<div class="panel" role="dialog" aria-modal="true" aria-label="Age verification">' +
      "<h2>Adults Only (18+)</h2>" +
      "<p>This site reviews and links to adult products intended for adults aged 18 or older. " +
      "By entering, you confirm you are at least 18 years old and that viewing adult content is legal in your location.</p>" +
      '<div class="row">' +
      '<button class="btn" id="age-yes">I am 18 or older — Enter</button>' +
      '<a class="btn ghost" href="https://www.google.com" rel="noopener">Leave</a>' +
      "</div></div>";
    document.body.appendChild(gate);
    document.body.classList.add("gated");
    document.getElementById("age-yes").addEventListener("click", function () {
      localStorage.setItem(AGE_KEY, "1");
      gate.remove();
      document.body.classList.remove("gated");
      // Analytics stays dormant until the visitor is through the gate.
      window.dispatchEvent(new CustomEvent("ds:age-verified"));
    });
  }

  /* ---------- mobile nav ---------- */
  function wireNav() {
    var btn = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (btn && nav) {
      btn.addEventListener("click", function () { nav.classList.toggle("open"); });
    }
  }

  /* ---------- affiliate links ----------
     <a data-yd> is ours to rewrite. A plain href is only rewritten when the
     link's HOST is actually the vendor.

     This used to match `href*="yourdoll.com"` as a substring and fall back to
     the vendor home page for anything that did not resolve. A review-site URL
     containing the vendor's name in its path — trustpilot.com/review/yourdoll.com
     — therefore got silently rewritten into a commission-bearing link to the
     shop. We publish criticism of that vendor next to "check it yourself"
     links; turning those into affiliate links is the single worst thing this
     code could do, so hosts are now compared exactly. */
  var vendorHost = (function () {
    try { return new URL(window.DS_CONFIG.yourdollBase).hostname.replace(/^www\./, ""); }
    catch (e) { return "yourdoll.com"; }
  })();
  function isVendorHost(h) {
    h = h.replace(/^www\./, "");
    return h === vendorHost || h.endsWith("." + vendorHost);
  }

  /* Since scripts/bake-affiliate-links.mjs, the static pages ship with the
     final affiliate URL already in the href (so no-JS visitors and crawlers
     see the real link and its sponsored rel). An anchor that already carries
     a valid vendor href with the ref param is left alone — we only top up any
     missing attributes. Anchors built at runtime (quiz result, hot picks) and
     any page the baker has not touched still get fully wired here. */
  function isBaked(a, host, param) {
    var href = a.getAttribute("href") || "";
    if (href.indexOf("http") !== 0) return false; // "#" placeholder or relative
    try {
      var u = new URL(href);
      return host(u.hostname) && u.searchParams.has(param);
    } catch (e) { return false; }
  }
  function topUpAttrs(a) {
    if (!a.getAttribute("rel")) a.setAttribute("rel", "sponsored nofollow noopener");
    if (!a.getAttribute("target")) a.setAttribute("target", "_blank");
  }

  function wireAffiliateLinks() {
    var links = document.querySelectorAll('a[data-yd], a[href*="yourdoll.com"]');
    links.forEach(function (a) {
      var isOurs = a.getAttribute("data-yd") !== null;
      if (isOurs && isBaked(a, isVendorHost, window.DS_CONFIG.yourdollRefParam)) {
        topUpAttrs(a);
        return;
      }
      var href = isOurs ? a.dataset.yd : a.getAttribute("href") || "";
      var url;
      try {
        url = href && href.indexOf("http") === 0
          ? new URL(href)
          : new URL(href || "", window.DS_CONFIG.yourdollBase);
      } catch (e) { return; }
      if (!isVendorHost(url.hostname)) {
        // Someone else's page that merely mentions the vendor. Leave it alone.
        if (!isOurs) return;
        url = new URL(window.DS_CONFIG.yourdollBase);
      }
      url.searchParams.set(window.DS_CONFIG.yourdollRefParam, window.DS_CONFIG.yourdollRef);
      a.setAttribute("href", url.toString());
      a.setAttribute("rel", "sponsored nofollow noopener");
      a.setAttribute("target", "_blank");
    });
    /* Amazon links: hidden until tag configured */
    document.querySelectorAll("a[data-amzn]").forEach(function (a) {
      if (!window.DS_CONFIG.amazonTag) {
        var card = a.closest(".pcard");
        if (card) card.style.display = "none"; else a.style.display = "none";
        return;
      }
      if (isBaked(a, function () { return true; }, "tag")) {
        topUpAttrs(a);
        return;
      }
      try {
        var u = new URL(a.dataset.amzn);
        u.searchParams.set("tag", window.DS_CONFIG.amazonTag);
        a.setAttribute("href", u.toString());
        a.setAttribute("rel", "sponsored nofollow noopener");
        a.setAttribute("target", "_blank");
      } catch (e) { /* leave as-is */ }
    });
  }

  /* ---------- vendor product photos ----------
     Hotlink real product images configured in DS_CONFIG.productPhotos.
     Loads with no-referrer (privacy + hotlink-block tolerance); on any
     failure the card keeps its built-in artwork. */
  function wireProductPhotos() {
    var photos = window.DS_CONFIG.productPhotos || {};
    document.querySelectorAll("[data-photo-key]").forEach(function (t) {
      var url = photos[t.dataset.photoKey];
      if (!url) return;
      var img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = function () {
        img.className = "photo";
        img.alt = "";
        t.classList.add("has-photo");
        t.insertBefore(img, t.firstChild);
      };
      img.src = url;
    });
  }

  /* ---------- bestsellers strip ----------
     Rendered from DS_CONFIG.hotPicks, which the weekly scraper refreshes from
     the vendor's own "Most Loved" grid. Hidden entirely when there's no data. */
  function wireHotPicks() {
    var box = document.getElementById("hot-picks");
    if (!box) return;
    var picks = (window.DS_CONFIG.hotPicks || []).slice(0, 8);
    if (!picks.length) {
      var section = box.closest("section");
      if (section) section.style.display = "none";
      return;
    }
    var frag = document.createDocumentFragment();
    picks.forEach(function (p) {
      var url;
      try { url = new URL(p.url); } catch (e) { return; }
      url.searchParams.set(window.DS_CONFIG.yourdollRefParam, window.DS_CONFIG.yourdollRef);
      var a = document.createElement("a");
      a.className = "hot-card";
      a.href = url.toString();
      a.rel = "sponsored nofollow noopener";
      a.target = "_blank";
      a.innerHTML =
        '<div class="shot"></div><div class="body">' +
        '<span class="name"></span>' +
        (p.price ? '<span class="cost"></span>' : "") +
        '<span class="go">View at YourDoll →</span></div>';
      a.querySelector(".name").textContent = p.title;
      if (p.price) a.querySelector(".cost").textContent = p.price;
      var img = new Image();
      img.referrerPolicy = "no-referrer";
      img.alt = "";
      img.onload = function () { a.querySelector(".shot").appendChild(img); };
      img.src = p.img;
      frag.appendChild(a);
    });
    box.appendChild(frag);
  }

  /* ---------- newsletter capture ---------- */
  function wireCapture() {
    document.querySelectorAll("form[data-capture]").forEach(function (form) {
      // The address itself is never sent to analytics — only that a signup happened.
      var track = function () {
        if (window.dsTrack) window.dsTrack("email_submitted", { page_path: location.pathname });
      };
      if (window.DS_CONFIG.newsletterAction) {
        form.setAttribute("action", window.DS_CONFIG.newsletterAction);
        form.setAttribute("method", "post");
        form.addEventListener("submit", track);
        return;
      }
      /* No provider configured yet. A static site cannot store the address, so
         the previous behaviour — swallow it and answer "you're on the list" —
         was a lie told by the one site in this category whose entire argument
         is that it doesn't lie to buyers.

         We also don't leave a form standing that cannot do what its button
         says. Asking someone to type an address before telling them it goes
         nowhere wastes their action to no purpose. Replace it up front, and
         hand over the thing the signup was offering — which needs no email. */
      // The "never shared / unsubscribe anytime" reassurance describes a
      // subscription that no longer happens here, so it goes with the form.
      var fine = form.parentNode && form.parentNode.querySelector(".fine");
      if (fine) fine.remove();
      form.replaceWith(Object.assign(document.createElement("div"), {
        className: "capture-closed",
        innerHTML:
          "<p><strong>The alert list isn't open yet.</strong> Rather than take " +
          "your address and quietly drop it, we'd rather say so.</p>" +
          '<p>The <a href="/checklist">First-Time Buyer Checklist</a> — what ' +
          "this signup was offering — is already free and ungated. Alerts open " +
          "once a discreet, unbranded sender is in place.</p>"
      }));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildGate();
    wireNav();
    wireAffiliateLinks();
    wireProductPhotos();
    wireHotPicks();
    wireCapture();
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });
})();
