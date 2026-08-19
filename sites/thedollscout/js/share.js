/* Sharing widgets + shareable result links.
   Any element with [data-share] becomes a share row. Optional attributes:
     data-share-text  headline used as the share message
     data-share-url   absolute or relative URL to share (defaults to this page)
     data-share-note  small line rendered under the buttons */
(function () {
  "use strict";

  var NETWORKS = [
    { id: "reddit", label: "Reddit", build: function (u, t) {
        return "https://www.reddit.com/submit?url=" + u + "&title=" + t; } },
    { id: "x", label: "X", build: function (u, t) {
        return "https://twitter.com/intent/tweet?url=" + u + "&text=" + t; } },
    { id: "telegram", label: "Telegram", build: function (u, t) {
        return "https://t.me/share/url?url=" + u + "&text=" + t; } },
    { id: "whatsapp", label: "WhatsApp", build: function (u, t) {
        return "https://wa.me/?text=" + t + "%20" + u; } },
    { id: "email", label: "Email", build: function (u, t) {
        return "mailto:?subject=" + t + "&body=" + u; } }
  ];

  function absolute(url) {
    try { return new URL(url || location.pathname + location.search, location.origin).toString(); }
    catch (e) { return location.href; }
  }

  function build(box) {
    var url = absolute(box.dataset.shareUrl);
    var text = box.dataset.shareText || document.title;
    var eu = encodeURIComponent(url);
    var et = encodeURIComponent(text);

    var html = '<span class="share-label">Share this:</span><span class="share-btns">';
    NETWORKS.forEach(function (n) {
      html += '<a class="share-btn" href="' + n.build(eu, et) +
        '" target="_blank" rel="noopener nofollow">' + n.label + "</a>";
    });
    html += '<button class="share-btn copy" type="button">Copy link</button>';
    if (navigator.share) html += '<button class="share-btn native" type="button">Share…</button>';
    html += "</span>";
    if (box.dataset.shareNote) html += '<p class="share-note">' + box.dataset.shareNote + "</p>";
    box.innerHTML = html;

    var copy = box.querySelector(".copy");
    copy.addEventListener("click", function () {
      navigator.clipboard.writeText(url).then(function () {
        copy.textContent = "Copied ✓";
        setTimeout(function () { copy.textContent = "Copy link"; }, 2000);
      });
    });
    var native = box.querySelector(".native");
    if (native) {
      native.addEventListener("click", function () {
        navigator.share({ title: text, url: url }).catch(function () {});
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-share]").forEach(build);
  });

  /* Expose so pages can drop a share row into dynamically-rendered results. */
  window.dsShare = function (box) { build(box); };
})();
